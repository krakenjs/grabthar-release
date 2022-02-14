#!/usr/bin/env zx

import { cwd } from 'process';
import 'zx/globals';

const { DIST_TAG, LOCAL_VERSION } = argv;

if (!DIST_TAG || !LOCAL_VERSION) {
  throw new Error('Invalid arguments. Expected <LOCAL_VERSION> and <DIST_TAG>.');
}

const CWD = cwd();
const { name: PACKAGE_NAME } = require(`${CWD}/package.json`);

console.table([{
  'package name': PACKAGE_NAME,
  'dist-tag': DIST_TAG,
  'local version': LOCAL_VERSION
}]);

const interval = 5;

await $`sleep ${interval}`;

const npm_public_registry_version = await $`npm view "${PACKAGE_NAME}" "dist-tags.${DIST_TAG}"`;
console.log(`npm version: ${npm_public_registry_version}`);
