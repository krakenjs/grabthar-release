#!/usr/bin/env node

import { $, argv } from 'zx';
import { cwd } from 'process';
import { createRequire } from 'module';

const { MODULE } = argv;
const CWD = cwd();
const moduleMetaUrl = import.meta.url;
const require = createRequire(moduleMetaUrl);
const fs = require('fs');

await $`grabthar-validate-git`;

if (!MODULE) {
  throw new Error('Please provide a module name to remove');
} else {
  try {
    await $`npm ls ${ MODULE }`
  } catch (error) {
    throw new Error(`${ MODULE } is not currently a dependency`);
  }
  await $`npm uninstall ${ MODULE }`;
}

await $`rm -rf ./node_modules`;
await $`$(which npm) install`;
await $`npm test`;

const PACKAGE_LOCK = `${ CWD }/package-lock.json`;

if (!fs.existsSync(PACKAGE_LOCK)) {
  throw new Error('Expected package-lock.json to be generated - are you using npm5+?');
}

await $`git add package.json`;
await $`git add package-lock.json`;

await $`git commit -m "Remove ${ MODULE }"`;

await $`git push`;
