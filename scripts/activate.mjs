#!/usr/bin/env node
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off, no-console: off */

import { cwd, env } from 'process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

import { $, argv, question } from 'zx';

const moduleMetaUrl = import.meta.url;
const filename = fileURLToPath(moduleMetaUrl);
const DIR = dirname(filename);
const require = createRequire(moduleMetaUrl);
const { NPM_TOKEN } = env;
let { LOCAL_VERSION, CDNIFY, ENVS } = argv;
const TAG = 'active';
const DEFENVS = [ 'test', 'local', 'stage', 'sandbox', 'production' ];
const CWD = cwd();
const { name: MODULE } = require(`${ CWD }/package.json`);

await $`${ DIR }/grabthar-validate-git`;
await $`${ DIR }/grabthar-validate-npm`;

if (!LOCAL_VERSION) {
    LOCAL_VERSION = await $`npm view ${ MODULE } version`;
    LOCAL_VERSION = LOCAL_VERSION?.stdout.trim();
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
    twoFactorCode = await question('NPM 2FA Code: ');
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
