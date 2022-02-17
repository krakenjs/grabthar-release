#!/usr/bin/env zx
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off */

import { cwd, env } from 'process';

import { $, argv } from 'zx';

let { NPM_TOKEN } = env;
const DIR = __dirname;
let { DIST_TAG, BUMP } = argv;

DIST_TAG = DIST_TAG || 'latest';
BUMP = BUMP || 'patch';
NPM_TOKEN = NPM_TOKEN || '';

await $`${ DIR }/grabthar-validate-git`;
await $`${ DIR }/grabthar-validate-npm`;
await $`npm version ${ BUMP }`;
await $`git push`;
await $`git push --tags`;
await $`${ DIR }/grabthar-flatten`;
await $`NPM_TOKEN=${ NPM_TOKEN } npm publish --tag ${ DIST_TAG }`;
await $`git checkout package.json`;
await $`git checkout package-lock.json || echo 'Package lock not found'`;

const CWD = cwd();
const { version: LOCAL_VERSION } = require(`${ CWD }/package.json`);

await $`${ DIR }/grabthar-verify-npm-publish --LOCAL_VERSION=${ LOCAL_VERSION } --DIST_TAG=${ DIST_TAG }`;

// update non-prod dist tags whenever the latest dist tag changes
if (DIST_TAG === 'latest') {
    await $`${ DIR }/grabthar-activate --LOCAL_VERSION=${ LOCAL_VERSION } --CDNIFY=false --ENVS=test,local,stage`;
}
