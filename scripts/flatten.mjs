#!/usr/bin/env zx

import { cwd } from 'process';

const DIR = __dirname;

await $`${DIR}/grabthar-validate-git`;
await $`${DIR}/grabthar-validate-flat`;

const fs = require('fs');
const CWD = cwd();
const PACKAGE = `${CWD}/package.json`;
const PACKAGE_LOCK = `${CWD}/package-lock.json`;

if (!fs.existsSync(PACKAGE)) {
  throw new Error('Expected package.json to be present.');
}

if (!fs.existsSync(PACKAGE_LOCK)) {
  console.log('Error: Expected package-lock.json to be present.');
  process.exit(0);
}

let pkg = require(PACKAGE);
let pkgLock = require(PACKAGE_LOCK);

let flattenedDependencies = {};

for (let depName of Object.keys(pkgLock.dependencies)) {
  let dep = pkgLock.dependencies[depName];

  if (dep.dev) {
    continue;
  }

  flattenedDependencies[depName] = dep.version;
}

for (let depName of Object.keys(pkg.dependencies)) {
  if (!pkg.dependencies[depName].match(/^\d+\.\d+\.\d+$/)) {
    throw new Error('Invalid dependency: ' + depName + '@' + pkg.dependencies[depName]);
  }
}

pkg.dependencies = flattenedDependencies;
fs.writeFileSync(PACKAGE, JSON.stringify(pkg, null, 2));
