#!/usr/bin/env node

/* @flow */
/* eslint import/no-commonjs: off, no-console: off */

import { join, extname } from 'path';
import { userInfo } from 'os';

import nodeFetch from 'node-fetch';
import fetchRetry from '@vercel/fetch-retry';
import { ensureDir, outputFile, exists, remove, existsSync, readFileSync } from 'fs-extra';
import commandLineArgs from 'command-line-args';
import { prompt } from 'inquirer';

import { info, booleanEnv, npmDownload, getDistVersions, unique, exec } from './grabthar-utils';

// use fetch() with retry logic to prevent failing from ECONNRESET errors
// https://github.com/vercel/fetch-retry#rationale
const fetch = fetchRetry(nodeFetch);

type Package = {|
    name : string,
    version : string
|};

type NodeOps = {|
    web : {|
        staticNamespace : string
    |}
|};

const options = commandLineArgs([
    { name: 'module', type: String, defaultOption: true },

    { name: 'cdn',           type: String,  defaultValue: process.env.CDN            || '' },
    { name: 'namespace',     type: String,  defaultValue: process.env.NAMESPACE      || '' },
    { name: 'infofile',      type: String,  defaultValue: process.env.INFO_FILE      || 'info.json' },
    { name: 'tarballfolder', type: String,  defaultValue: process.env.TARBALL_FOLDER || 'tarballs' },
    { name: 'cdnpath',       type: String,  defaultValue: process.env.CDN_PATH       || join(process.cwd(), 'cdn') },
    { name: 'recursive',     type: Boolean, defaultValue: booleanEnv(process.env.RECURSIVE) },
    { name: 'package',       type: String,  defaultValue: process.env.PACKAGE        || join(process.cwd(), 'package.json') },
    { name: 'nodeops',       type: String,  defaultValue: process.env.NODE_OPS       || join(process.cwd(), '.nodeops') },
    { name: 'cdnapi',        type: String,  defaultValue: process.env.CDNAPI         || 'https://cdnx-api.qa.paypal.com' },
    { name: 'requester',     type: String,  defaultValue: process.env.REQUESTER      || 'svc-xo' },
    { name: 'password',      type: String,  defaultValue: process.env.SVC_PASSWORD },
    { name: 'approver',      type: String,  defaultValue: process.env.APPROVER       || userInfo().username },
    { name: 'disttag',       type: String,  defaultValue: process.env.DIST_TAG       || 'latest' },
    { name: 'deployonly',    type: Boolean, defaultValue: booleanEnv(process.env.DEPOY_ONLY) },
    { name: 'commitonly',    type: Boolean, defaultValue: booleanEnv(process.env.COMMIT_ONLY) }
]);

const getPackage = () : Package => {
    if (!options.package || !existsSync(options.package)) {
        throw new Error(`Package file not found`);
    }
    return JSON.parse(readFileSync(options.package));
};

const getNodeOps = () : NodeOps => {
    if (!options.nodeops || !existsSync(options.nodeops)) {
        throw new Error(`Node Ops file not found`);
    }
    return JSON.parse(readFileSync(options.nodeops));
};

options.module = options.module || getPackage().name;
options.namespace = options.namespace || getNodeOps().web.staticNamespace;

if (!options.module) {
    throw new Error(`Module name required`);
}

if (!options.namespace) {
    throw new Error(`Namespace required`);
}

if (!options.cdn) {
    throw new Error(`CDN required`);
}

type CdnifyGenerateModuleOptions = {|
    cdnNamespace : string,
    name : string,
    version : string,
    prune? : boolean,
    parentName? : string
|};

const cdnifyGenerateModule = async ({ cdnNamespace, name, version, parentName, prune = true } : CdnifyGenerateModuleOptions) => {
    const pkgInfo = await info(name, options.disttag);

    if (!version) {
        throw new Error(`Package ${ name } has no version`);
    }

    const versionInfo = pkgInfo.versions[version];

    if (!versionInfo) {
        throw new Error(`NPM info for ${ name } has no version ${ version }`);
    }

    const tarball = versionInfo.dist && versionInfo.dist.tarball;

    if (!versionInfo) {
        throw new Error(`NPM info for ${ name }@${ version } has no tarball`);
    }

    const sanitizedName = name.replace('@', '');

    const cdnModuleDir = join(options.cdnpath, sanitizedName);
    const cdnModuleTarballDir = join(cdnModuleDir, options.tarballfolder);

    const cdnModuleInfoFile = join(cdnModuleDir, options.infofile);
    const cdnModuleTarballFileName = `${ version }${ extname(tarball) }`;

    await ensureDir(cdnModuleDir);
    await ensureDir(cdnModuleTarballDir);

    await npmDownload(tarball, cdnModuleTarballDir, cdnModuleTarballFileName);

    if (prune) {
        let activeVersions;

        if (parentName) {
            const parentPackage = await info(parentName, options.disttag);
            const parentActiveVersions = await getDistVersions(parentName);
            activeVersions = unique(parentActiveVersions.map(parentActiveVersion => parentPackage.versions[parentActiveVersion].dependencies[name]));
        } else {
            activeVersions = await getDistVersions(name);
        }

        for (const existingVersion of Object.keys(pkgInfo.versions)) {
            if (activeVersions.indexOf(existingVersion) === -1) {
                const versionConfig = pkgInfo.versions[existingVersion];
                const existingVersionTarballPath = join(cdnModuleTarballDir, `${ existingVersion }${ extname(versionConfig.dist.tarball) }`);

                if (await exists(existingVersionTarballPath)) {
                    console.info('Cleaning up', existingVersionTarballPath);
                    await remove(existingVersionTarballPath);
                }

                delete pkgInfo.versions[existingVersion];
            }
        }
    }

    for (const [ moduleVersion, moduleVersionInfo ] of Object.entries(pkgInfo.versions)) {
        const moduleVersionTarballFileName = `${ moduleVersion }${ extname(tarball) }`;
        const moduleVersionTarballFile = join(cdnModuleTarballDir, moduleVersionTarballFileName);

        if (await exists(moduleVersionTarballFile)) {
            const relativeTarballDir = join(sanitizedName, options.tarballfolder, moduleVersionTarballFileName);
            const cdnTarballUrl = `${ options.cdn }/${ cdnNamespace }/${ relativeTarballDir }`;

            // $FlowFixMe
            moduleVersionInfo.dist = moduleVersionInfo.dist || {};
            moduleVersionInfo.dist.tarball = cdnTarballUrl;
        }
    }

    await outputFile(cdnModuleInfoFile, JSON.stringify(pkgInfo, null, 4));
};

const cdnifyGenerate = async (name : string) => {
    const cdnNamespace = options.namespace;

    for (const version of await getDistVersions(name)) {
        await cdnifyGenerateModule({
            cdnNamespace,
            name,
            version,
            prune: true
        });

        if (options.recursive) {
            const packageInfo = await info(name, options.disttag);
            const versionInfo = packageInfo.versions[version];

            await Promise.all(Object.entries(versionInfo.dependencies).map(async ([ dependencyName, dependencyVersion ]) => {
                // $FlowFixMe
                dependencyVersion = dependencyVersion.toString();

                await cdnifyGenerateModule({
                    cdnNamespace,
                    name:          dependencyName,
                    version:       dependencyVersion,
                    prune:         true,
                    parentName:    name
                });
            }));
        }
    }
};

const passwords = {};

const getPassword = async (user) => {
    if (passwords[user]) {
        return passwords[user];
    }

    const { value } = await prompt([
        {
            type:    'password',
            message: `Enter password for ${ user }:`,
            name:    'value',
            mask:    '*'
        }
    ]);

    // eslint-disable-next-line require-atomic-updates
    passwords[user] = value;

    return value;
};

const getYesNo = async (message) => {
    const { value } = await prompt([
        {
            type: 'confirm',
            message,
            name: 'value'
        }
    ]);
    return value;
};

const web = async (cmd) => {
    return await exec(`npx @paypalcorp/web ${ cmd }`, {
        JENKINS_HOME:     '1',
        SVC_ACC_USERNAME: options.requester,
        SVC_ACC_PASSWORD: options.password || await getPassword(options.requester)
    });
};

const sleep = (time : number) => {
    return new Promise(resolve => setTimeout(resolve, time));
};

const cdnifyCommit = async () => {
    const status = await exec('git status');

    if (status.indexOf('nothing to commit, working tree clean') !== -1) {
        return;
    }

    await exec(`git add '${ options.cdnpath }'`);
    await exec(`git commit -m 'Generate CDN packages'`);
    await exec('git push');
};

const cdnifyDeploy = async () => {
    const { id } = await web(`stage --json`);

    try {
        await await web(`notify ${ id }`);
    } catch (err) {
        // pass
    }

    const approveRes = await fetch(`${ options.cdnapi }/assets/approve/${ id }?requestor=${ options.requester }&approver=${ options.approver }`);
    await approveRes.text();

    await sleep(3 * 1000);

    if (!approveRes.ok) {
        console.warn(`Approval failed with status ${ approveRes.status }`);
        if (!await getYesNo(`Approval failed with status ${ approveRes.status }. Please try to approve manually.\n\nhttps://cdnx-ui.qa.paypal.com/approve/${ id }\n\nContinue with release?`)) {
            throw new Error(`Aborted deploy`);
        }
    }

    await await web(`deploy ${ id }`);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        await sleep(10 * 1000);
        try {
            await await web(`status ${ id } --all`);
        } catch (err) {
            continue;
        }

        break;
    }
};

const run = async () => {
    if (options.deployonly) {
        return await cdnifyDeploy();
    }

    await cdnifyGenerate(options.module);

    if (options.commitonly) {
        return await cdnifyCommit();
    }

    if (!await getYesNo('Commit and deploy?')) {
        return;
    }

    await cdnifyCommit();
    await cdnifyDeploy();
};

run().catch((err) => {
    console.error(err);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
});
