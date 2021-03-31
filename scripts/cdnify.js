#!/usr/bin/env node

/* @flow */
/* eslint import/no-commonjs: off */

import { join, extname } from 'path';
import { userInfo } from 'os';
import { lookup } from 'dns';

import config from 'libnpmconfig';
import fetch from 'node-fetch';
import { ensureDir, outputFile, exists, existsSync, readFileSync } from 'fs-extra';
import download from 'download';
import commandLineArgs from 'command-line-args';
import { prompt } from 'inquirer';
import HttpsProxyAgent from 'https-proxy-agent';
import shell from 'shelljs';

type Package = {|
    name : string,
    version : string
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
            |},
            dependencies : {|
                [string] : string
            |}
        |}
    |},
    'dist-tags' : {|
        [string] : string
    |}
|};

const booleanEnv = (val, def = false) => {
    if (val === '0' || val === 'false' || val === 'off') {
        return false;
    }

    if (val) {
        return true;
    }

    return def;
};

const conf = config.read();

const options = commandLineArgs([
    { name: 'module', type: String, defaultOption: true },

    { name: 'cdn',           type: String,  defaultValue: process.env.CDN            || '' },
    { name: 'registry',      type: String,  defaultValue: process.env.REGISTRY       || 'https://registry.npmjs.org' },
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
    { name: 'npmproxy',      type: String,  defaultValue: process.env.NPM_PROXY      || conf.get('https_proxy') || conf.get('proxy') || '' },
    { name: 'ipv6',          type: Boolean, defaultValue: booleanEnv(process.env.IPV6) },
    { name: 'deployonly',    type: Boolean, defaultValue: booleanEnv(process.env.DEPOY_ONLY) }
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

const getHost = (url) => {
    return new URL(url).host;
};

const dns = async (host, family = 6) => {
    return await new Promise((resolve, reject) => {
        lookup(host, { family }, (err, address) => {
            return err ? reject(err) : resolve(address);
        });
    });
};

const npmFetch = async (url) => {
    const opts = {};

    const host = getHost(url);

    if (opts.ipv6) {
        const ip = await dns(host);
        url = url.replace(host, `[${ ip }]`);
    }

    opts.headers = opts.headers || {};
    opts.headers.host = host;

    if (options.npmproxy) {
        opts.agent = new HttpsProxyAgent(options.npmproxy);
    }

    // eslint-disable-next-line no-console
    console.info('GET', url);
    return await fetch(url, opts);
};

const npmDownload = async (url, dir, filename) => {
    const opts = {};

    const host = getHost(url);

    if (opts.ipv6) {
        const ip = await dns(host);
        url = url.replace(host, `[${ ip }]`);
    }

    opts.headers = opts.headers || {};
    opts.headers.host = host;
    opts.filename = filename;

    if (options.npmproxy) {
        opts.agent = new HttpsProxyAgent(options.npmproxy);
    }

    // eslint-disable-next-line no-console
    console.info('SYNC', url);
    await download(url, dir, opts);
};


const infoCache = {};

const info = async (name : string) : Promise<PackageInfo> => {
    let infoResPromise;

    if (infoCache[name]) {
        infoResPromise = await infoCache[name];
    } else {
        infoResPromise = infoCache[name] = npmFetch(`${ options.registry }/${ name }`).then(res => res.json());
    }
    
    const json = await infoResPromise;

    if (!json) {
        throw new Error(`No info returned for ${ name }`);
    }

    if (!json.versions) {
        throw new Error(`NPM info for ${ name } has no versions`);
    }

    if (!json['dist-tags'] || !json['dist-tags'][options.disttag]) {
        throw new Error(`${ options.disttag } dist tag not defined`);
    }

    const localPackage = await getPackage();
    const publicRegistryVersion = json['dist-tags'][options.disttag];

    if (options.disttag === 'latest' && localPackage.version !== publicRegistryVersion) {
        throw new Error(`Version mismatch between local package.json (${ localPackage.version }) and public npm registry (${ publicRegistryVersion }).`);
    }

    return json;
};

const getDistVersions = async (name : string) : Promise<$ReadOnlyArray<string>> => {
    const distTags = (await info(name))['dist-tags'];
    // $FlowFixMe
    const versions : $ReadOnlyArray<string>  = Object.values(distTags);
    return [ ...new Set(versions) ];
};

const cdnifyGenerateModule = async ({ cdnNamespace, name, version } : {| cdnNamespace : string, name : string, version : string |}) => {
    const infoRes = await npmFetch(`${ options.registry }/${ name }`);
    const pkgInfo = await infoRes.json();

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

    for (const version of await getDistVersions(name)) {
        await cdnifyGenerateModule({
            cdnNamespace,
            name,
            version
        });

        if (options.recursive) {
            const packageInfo = await info(name);
            const versionInfo = packageInfo.versions[version];

            await Promise.all(Object.entries(versionInfo.dependencies).map(async ([ dependencyName, dependencyVersion ]) => {
                await cdnifyGenerateModule({
                    cdnNamespace,
                    name:    dependencyName,
                    // $FlowFixMe
                    version: dependencyVersion
                });
            }));
        }
    }
};

const exec = async <T>(cmd : string, envVars? : {| [string] : string |}) : Promise<T> => {
    const env = envVars || {};

    const cmdString = `> ${ Object.keys(env).map(key => `${ key }=${ env[key] }`).join(' ') } ${ cmd }\n`;

    // eslint-disable-next-line no-console
    console.log(cmdString);

    for (const key of Object.keys(env)) {
        shell.env[key] = env[key];
    }

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
        // eslint-disable-next-line no-console
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
