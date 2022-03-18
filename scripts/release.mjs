#!/usr/bin/env node
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off */

import { cwd, env } from 'process';
import { createRequire } from 'module';

import { $, question } from 'zx';

const moduleMetaUrl = import.meta.url;
const require = createRequire(moduleMetaUrl);

let { NPM_TOKEN } = env;
NPM_TOKEN = NPM_TOKEN || '';

let BUMP = 'patch';
let DIST_TAG = 'latest';
let twoFactorCode;

let { stdout: REMOTE_URL } = await $`git config --get remote.origin.url`;
REMOTE_URL = REMOTE_URL.trim();

const CWD = cwd();
const { version: LOCAL_VERSION, repository: { url: REPO_URL } } = require(`${ CWD }/package.json`);

if (REMOTE_URL !== REPO_URL) {
    throw new Error('The remote url does not match the repo url. Publishing from a fork is not allowed.');
}

// This will determine the type of release based on the git branch. When the default branch is used, it will be a `patch` that's published to npm under the `latest` dist-tag. Any other branch will be a `prelease` that's published to npm under the `alpha` dist-tag.

let { stdout: CURRENT_BRANCH } = await $`git rev-parse --abbrev-ref HEAD`;
CURRENT_BRANCH = CURRENT_BRANCH.trim();
let { stdout: DEFAULT_BRANCH } = await $`git remote show origin | sed -n '/HEAD branch/s/.*: //p'`;
DEFAULT_BRANCH = DEFAULT_BRANCH.trim();

await $`grabthar-validate-git`;
await $`grabthar-validate-npm`;

if (CURRENT_BRANCH !== DEFAULT_BRANCH) {
    BUMP = 'prerelease';
    DIST_TAG = 'alpha';
}

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
await $`grabthar-verify-npm-publish --LOCAL_VERSION=${ LOCAL_VERSION } --DIST_TAG=${ DIST_TAG }`;

// update non-prod dist tags whenever the latest dist tag changes
if (DIST_TAG === 'latest') {
    await $`grabthar-activate --LOCAL_VERSION=${ LOCAL_VERSION } --CDNIFY=false --ENVS=test,local,stage`;
}
