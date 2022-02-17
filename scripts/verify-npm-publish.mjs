#!/usr/bin/env zx
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off, no-console: off */

import { cwd } from 'process';

import { $, argv } from 'zx';

const { DIST_TAG, LOCAL_VERSION } = argv;

if (!DIST_TAG || !LOCAL_VERSION) {
    throw new Error('Invalid arguments. Expected <LOCAL_VERSION> and <DIST_TAG>.');
}

const CWD = cwd();
const { name: PACKAGE_NAME } = require(`${ CWD }/package.json`);

console.table([ {
    'package name':  PACKAGE_NAME,
    'dist-tag':      DIST_TAG,
    'local version': LOCAL_VERSION
} ]);

const interval = 5;
const max_time = 300;
let counter = 0;

await $`sleep ${ interval }`;

let { stdout: npm_public_registry_version } = await $`npm view "${ PACKAGE_NAME }" "dist-tags.${ DIST_TAG }"`;
npm_public_registry_version = npm_public_registry_version.replace(/(\r\n|\n|\r)/gm, '');
console.log(`npm version: ${ npm_public_registry_version }`);

while (LOCAL_VERSION !== npm_public_registry_version) {
    if (counter === max_time) {
        throw new Error(`Failed to verify version in ${ max_time } seconds.`);
    }
    console.log(`Version mismatch between local version ${ LOCAL_VERSION } and npm version ${ npm_public_registry_version }. Trying again in ${ interval } seconds...`);
    await $`sleep ${ interval }`;
    npm_public_registry_version = await $`npm view "${ PACKAGE_NAME }" "dist-tags.${ DIST_TAG }"`;
    counter += interval;
}

console.log('Successful version match.');
