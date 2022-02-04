#!/usr/bin/env zx
import { cwd } from 'process';
import 'zx/globals';

await $`set -e`;

const DIR = __dirname;
let { DIST_TAG, BUMP, NPM_TOKEN } = argv;

DIST_TAG ?? (DIST_TAG = 'latest');
BUMP ?? (BUMP = 'patch');
NPM_TOKEN ?? (NPM_TOKEN = '');

await $`${DIR}/grabthar-validate-git`;
await $`${DIR}/grabthar-validate-npm`;
await $`npm version ${BUMP}`;
await $`git push`;
await $`git push --tags`;
await $`${DIR}/grabthar-flatten`;
await $`NPM_TOKEN=${NPM_TOKEN} npm publish --tag ${DIST_TAG}`;
await $`git checkout package.json`;
await $`git checkout package-lock.json || echo 'Package lock not found'`;

const current_working_directory = cwd();
const local_version = require(`${current_working_directory}/package.json`).version;

await $`${DIR}/grabthar-verify-npm-publish ${local_version} ${DIST_TAG}`;

// update non-prod dist tags whenever the latest dist tag changes
if (DIST_TAG === 'latest') {
  await $`${DIR}/grabthar-activate LOCAL_VERSION=${local_version} CDNIFY=false TAGS='[test, local, stage]'`;
}
