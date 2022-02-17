#!/usr/bin/env zx
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off, no-console: off */

import { cwd, env } from 'process';

import { $, argv } from 'zx';

const { NPM_TOKEN } = env;
let { LOCAL_VERSION, CDNIFY, ENVS } = argv;
const DIR = __dirname;
const TAG = 'active';
const DEFENVS = [ 'test', 'local', 'stage', 'sandbox', 'production' ];
const CWD = cwd();
const { name: MODULE } = require(`${ CWD }/package.json`);

await $`${ DIR }/grabthar-validate-git`;
await $`${ DIR }/grabthar-validate-npm`;

if (!LOCAL_VERSION) {
    LOCAL_VERSION = await $`npm view ${ MODULE } version`;
}

if (!CDNIFY) {
    CDNIFY = 'true';
}

if (!ENVS) {
    ENVS = DEFENVS;
} else {
    ENVS = ENVS.split(',');
    for (const environment of ENVS) {
        if (!DEFENVS.includes(environment)) {
            throw new Error(`Invalid env: ${ environment }`);
        }
    }
}

let twoFactorCode;

if (!NPM_TOKEN) {
    twoFactorCode = await $`read -p "NPM 2FA Code: " twofactorcode; echo $twofactorcode`;
    twoFactorCode = twoFactorCode.stdout.replace(/(\r\n|\n|\r)/gm, '');
}

for (const environment of ENVS) {
    if (!NPM_TOKEN) {
        console.log(`npm dist-tag add ${ MODULE }@${ LOCAL_VERSION } "${ TAG }-${ environment }" --otp="${ twoFactorCode }"`);
        await $`npm dist-tag add ${ MODULE }@${ LOCAL_VERSION } "${ TAG }-${ environment }" --otp="${ twoFactorCode }"`;
    } else {
        console.log(`npm dist-tag add ${ MODULE }@${ LOCAL_VERSION } "${ TAG }-${ environment }"`);
        await $`NPM_TOKEN=${ NPM_TOKEN } npm dist-tag add ${ MODULE }@${ LOCAL_VERSION } "${ TAG }-${ environment }"`;
    }
}

for (const environment of ENVS) {
    await $`${ DIR }/grabthar-verify-npm-publish --LOCAL_VERSION=${ LOCAL_VERSION } --DIST_TAG=${ TAG }-${ environment }`;
}

if (CDNIFY === 'true') {
    await $`${ DIR }/grabthar-cdnify`;
}
