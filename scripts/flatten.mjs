#!/usr/bin/env zx

const DIR = __dirname;

await $`${DIR}/grabthar-validate-git`;
await $`${DIR}/grabthar-validate-flat`;

const fs = require('fs');

const PACKAGE = './package.json';
const PACKAGE_LOCK = './package-lock.json';

if (!fs.existsSync(PACKAGE)) {
  throw new Error('Expected package.json to be present.');
}

if (!fs.existsSync(PACKAGE_LOCK)) {
  console.log('Error: Expected package-lock.json to be present.');
  process.exit(0);
}
