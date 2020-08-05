#!/usr/bin/env node

/* @flow */
/* eslint import/no-commonjs: off */

import { join, extname } from 'path';
import { userInfo } from 'os';

import fetch from 'node-fetch';
import { ensureDir, outputFile, exists, existsSync, readFileSync } from 'fs-extra';
import download from 'download';
import commandLineArgs from 'command-line-args';
import shell from 'shelljs';
import { prompt } from 'inquirer';
import HttpsProxyAgent from 'https-proxy-agent';

type Package = {|
    name : string,
    version : string
|};

type PackageLock = {|
    dependencies : {|
        [string] : {|
            version : string
        |}
    |}
|};

type NodeOps = {|
    web : {|
        staticNamespace : string
    |}
|};

type PackageInfo = {|
    version : string,
    versions : {|
        [string] : {|
            dist : {|
                tarball : string
            |}
        |}
    |},
    'dist-tags' : {|
        [string] : string
    |}
|};

const options = commandLineArgs([
    { name: 'module', type: String, defaultOption: true },
    { name: 'registry', type: String, defaultValue: 'https://registry.npmjs.org' },
    { name: 'cdn', type: String, defaultValue: 'https://www.mycdn.com' },
    { name: 'namespace', type: String },
    { name: 'infofile', type: String, defaultValue: 'info.json' },
    { name: 'tarballfolder', type: String, defaultValue: 'tarballs' },
    { name: 'cdnpath', type: String, defaultValue: join(process.cwd(), 'cdn') },
    { name: 'recursive', type: Boolean, defaultValue: false },
    { name: 'package', type: String, defaultValue: join(process.cwd(), 'package.json') },
    { name: 'packagelock', type: String, defaultValue: join(process.cwd(), 'package-lock.json') },
    { name: 'nodeops', type: String, defaultValue: join(process.cwd(), '.nodeops') },
    { name: 'cdnapi', type: String, defaultValue: 'https://cdnx-api.qa.paypal.com' },
    { name: 'requester', type: String, defaultValue: 'svc-xo' },
    { name: 'approver', type: String, defaultValue: userInfo().username },
    { name: 'disttag', type: String, defaultValue: 'latest' },
    { name: 'npmproxy', type: String, defaultValue: 'http://proxy.prd.plb.paypalcorp.com:8080' }
]);

const getPackage = () : Package => {
    if (!options.package || !existsSync(options.package)) {
        throw new Error(`Package file not found`);
    }
    return JSON.parse(readFileSync(options.package));
};

const getPackageLock = () : PackageLock => {
    if (!options.packagelock || !existsSync(options.packagelock)) {
        throw new Error(`Package Lock file not found`);
    }
    return JSON.parse(readFileSync(options.packagelock));
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

const npmFetch = (url) => {
    const opts = {};

    if (options.npmproxy) {
        opts.agent = new HttpsProxyAgent(options.npmproxy);
    }
    
    return fetch(url, opts);
};

const infoCache = {};

const info = async (name : string) : Promise<PackageInfo> => {
    if (infoCache[name]) {
        return await infoCache[name];
    }

    const infoResPromise = infoCache[name] = npmFetch(`${ options.registry }/${ name }`);
    const infoRes = await infoResPromise;
    const json = await infoRes.json();

    if (!json) {
        throw new Error(`No info returned for ${ name }`);
    }

    if (!json.versions) {
        throw new Error(`NPM info for ${ name } has no versions`);
    }

    if (!json['dist-tags'] || !json['dist-tags'][options.disttag]) {
        throw new Error(`${ options.disttag } dist tag not defined`);
    }
    
    return json;
};

const getDistVersion = async (name : string) : Promise<string> => {
    return (await info(name))['dist-tags'][options.disttag];
};

const cdnifyGenerateModule = async ({ cdnNamespace, name, version }) => {
    const infoRes = await npmFetch(`${ options.registry }/${ name }`);
    const pkgInfo = await infoRes.json();

    if (!version) {
        throw new Error(`Package lock for ${ name } has no version`);
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

    await download(tarball, cdnModuleTarballDir, { filename: cdnModuleTarballFileName });

    const cdnInfo = JSON.parse(JSON.stringify(pkgInfo));

    for (const [ moduleVersion, moduleVersionInfo ] of Object.entries(cdnInfo.versions)) {
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

    await outputFile(cdnModuleInfoFile, JSON.stringify(cdnInfo, null, 4));
};

const cdnifyGenerate = async (name : string) => {
    const cdnNamespace = options.namespace;

    const version = await getDistVersion(name);

    await cdnifyGenerateModule({
        cdnNamespace,
        name,
        version
    });

    if (options.recursive) {
        await Promise.all(Object.entries(getPackageLock().dependencies).map(async ([ dependencyName, dependency ]) => {
            await cdnifyGenerateModule({
                cdnNamespace,
                name:    dependencyName,
                // $FlowFixMe
                version: dependency.version
            });
        }));
    }
};

const exec = async (cmd) => {
    // eslint-disable-next-line no-console
    console.log(`> ${ cmd }\n`);
    const result = await shell.exec(cmd);
    if (result.code !== 0) {
        throw new Error(result.stderr || result.stdout || `Command failed with code ${ result.code }`);
    }
    try {
        return JSON.parse(result.stdout);
    } catch (err) {
        return result.stdout;
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
    return await exec(`JENKINS_HOME=1 SVC_ACC_USERNAME=${ options.requester } SVC_ACC_PASSWORD=${ await getPassword(options.requester) } npx @paypalcorp/web ${ cmd }`);
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
        throw new Error(`Approval failed with status ${ approveRes.status }`);
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
    await cdnifyGenerate(options.module);

    if (!await getYesNo('Commit and deploy?')) {
        return;
    }

    await cdnifyCommit();
    await cdnifyDeploy();
};

run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
});
