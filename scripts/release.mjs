#!/usr/bin/env node
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off, no-console: off */

import { cwd, env } from 'process';
import { createRequire } from 'module';
import crypto from 'crypto';

import { $, question, fetch, argv } from 'zx';

const moduleMetaUrl = import.meta.url;
const require = createRequire(moduleMetaUrl);

let { NPM_TOKEN } = env;
NPM_TOKEN = NPM_TOKEN || '';

let { DRY_RUN } = argv;
DRY_RUN = DRY_RUN === 'true';

const noGitTag = DRY_RUN ? '--no-git-tag-version' : '';
const dryRun = DRY_RUN ? '--dry-run' : '';

let BUMP = 'patch';
let DIST_TAG = 'latest';
let twoFactorCode;

let { stdout: REMOTE_URL } = await $`git config --get remote.origin.url`;
REMOTE_URL = REMOTE_URL.trim();

if (REMOTE_URL.includes('.git')) {
    REMOTE_URL = REMOTE_URL.replace('.git', '');
}

const isForked = async () => {
    const { pathname } = new URL(`${ REMOTE_URL }`);
    const data = await fetch(`https://api.github.com/repos${ pathname }`);
    const jsonData = await data.json();
    if (jsonData.message === 'Not Found') {
        throw new Error('Repo not found via the GitHub Repos API.');
    }
    const { fork } = jsonData;
    return fork;
};

const forked = await isForked();

if (forked) {
    throw new Error('Publishing from a fork is not allowed.');
}

await $`grabthar-validate-git`;
await $`grabthar-validate-npm`;

// This will determine the type of release based on the git branch. When the default branch is used, it will be a `patch` that's published to npm under the `latest` dist-tag. Any other branch will be a `prelease` that's published to npm under the `alpha` dist-tag.

let { stdout: CURRENT_BRANCH } = await $`git rev-parse --abbrev-ref HEAD`;
CURRENT_BRANCH = CURRENT_BRANCH.trim();
let { stdout: DEFAULT_BRANCH } = await $`git remote show origin | sed -n '/HEAD branch/s/.*: //p'`;
DEFAULT_BRANCH = DEFAULT_BRANCH.trim();

const UID = crypto.randomBytes(4).toString('hex');

if (CURRENT_BRANCH !== DEFAULT_BRANCH) {
    BUMP = 'prerelease';
    DIST_TAG = 'alpha';
    await $`npm ${ noGitTag } version ${ BUMP } --preid=${ DIST_TAG }-${ UID }`;
} else {
    await $`npm ${ noGitTag } version ${ BUMP }`;
}

if (DRY_RUN) {
    console.log(`git push`);
    console.log(`git push --tags`);
} else {
    await $`git push`;
    await $`git push --tags`;
}

await $`grabthar-flatten`;

if (NPM_TOKEN) {
    await $`NPM_TOKEN=${ NPM_TOKEN } npm publish ${ dryRun } --tag ${ DIST_TAG }`;
} else {
    twoFactorCode = await question('NPM 2FA Code: ');
    await $`npm publish ${ dryRun } --tag ${ DIST_TAG } --otp ${ twoFactorCode }`;
}

if (DRY_RUN) {
    const CWD = cwd();
    const { version: LOCAL_VERSION } = require(`${ CWD }/package.json`);

    console.log(`grabthar-verify-npm-publish --LOCAL_VERSION=${ LOCAL_VERSION } --DIST_TAG=${ DIST_TAG }`);

    if (DIST_TAG === 'latest') {
        console.log(`grabthar-activate --LOCAL_VERSION=${ LOCAL_VERSION } --CDNIFY=false --ENVS=test,local,stage`);
    }

    await $`git checkout package.json`;
    await $`git checkout package-lock.json || echo 'Package lock not found'`;
} else {
    await $`git checkout package.json`;
    await $`git checkout package-lock.json || echo 'Package lock not found'`;
    
    const CWD = cwd();
    const { version: LOCAL_VERSION } = require(`${ CWD }/package.json`);
    
    await $`grabthar-verify-npm-publish --LOCAL_VERSION=${ LOCAL_VERSION } --DIST_TAG=${ DIST_TAG }`;
    
    // update non-prod dist tags whenever the latest dist tag changes
    if (DIST_TAG === 'latest') {
        await $`grabthar-activate --LOCAL_VERSION=${ LOCAL_VERSION } --CDNIFY=false --ENVS=test,local,stage`;
    }
}
