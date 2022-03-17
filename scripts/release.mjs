#!/usr/bin/env node
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off */

import { cwd, env } from 'process';
import { createRequire } from 'module';

import { $, question } from 'zx';

const moduleMetaUrl = import.meta.url;
const require = createRequire(moduleMetaUrl);
let { NPM_TOKEN } = env;
let BUMP = 'patch';
let DIST_TAG = 'latest';
let twoFactorCode;

NPM_TOKEN = NPM_TOKEN || '';

await $`grabthar-validate-git`;
await $`grabthar-validate-npm`;
await $`npm version ${ BUMP }`;
await $`git push`;
await $`git push --tags`;
await $`grabthar-flatten`;

if (NPM_TOKEN) {
    await $`NPM_TOKEN=${ NPM_TOKEN } npm publish --tag ${ DIST_TAG }`;
} else {
    twoFactorCode = await question('NPM 2FA Code: ');
    await $`npm publish --tag ${ DIST_TAG } --otp ${ twoFactorCode }`;
}

await $`git checkout package.json`;
await $`git checkout package-lock.json || echo 'Package lock not found'`;

const CWD = cwd();
const { version: LOCAL_VERSION } = require(`${ CWD }/package.json`);

await $`grabthar-verify-npm-publish --LOCAL_VERSION=${ LOCAL_VERSION } --DIST_TAG=${ DIST_TAG }`;

// update non-prod dist tags whenever the latest dist tag changes
if (DIST_TAG === 'latest') {
    await $`grabthar-activate --LOCAL_VERSION=${ LOCAL_VERSION } --CDNIFY=false --ENVS=test,local,stage`;
}
