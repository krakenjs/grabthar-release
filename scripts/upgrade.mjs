#!/usr/bin/env node
/* eslint import/no-commonjs: off, flowtype/require-valid-file-annotation: off, no-sync: off */

import { cwd, env } from 'process';
import { createRequire } from 'module';

import { $, argv } from 'zx';

const { MODULE } = argv;
const CWD = cwd();
const moduleMetaUrl = import.meta.url;
const require = createRequire(moduleMetaUrl);
const fs = require('fs');

const { EXPERIMENTAL_DEPENDENCY_TEST } = env;

await $`grabthar-validate-git`;

if (!MODULE) {
    await $`npx npm-check-updates --registry='http://registry.npmjs.org' --dep=prod --upgrade`;
} else {
    await $`npx npm-check-updates --registry='http://registry.npmjs.org' --dep=prod --upgrade --filter=${ MODULE }`;
}

await $`rm -rf ./node_modules`;
await $`rm -f ./package-lock.json`;

await $`npm install`;
await $`npm test`;

const PACKAGE_LOCK = `${ CWD }/package-lock.json`;

if (!fs.existsSync(PACKAGE_LOCK)) {
    throw new Error('Expected package-lock.json to be generated - are you using npm5+?');
}

if (EXPERIMENTAL_DEPENDENCY_TEST === '1') {
    await $`grabthar-dependency-test`;
}

await $`grabthar-prune`;

await $`git add package.json`;
await $`git add package-lock.json`;

if (!MODULE) {
    await $`git commit -m "Update version of all modules"`;
} else {
    await $`git commit -m "Update version of ${ MODULE }"`;
}

await $`git push`;
