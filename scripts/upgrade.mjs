#!/usr/bin/env node

import { $, argv } from 'zx';

const { MODULE } = argv;

await $`grabthar-validate-git`;

if (!MODULE) {
  $`npx npm-check-updates --registry='http://registry.npmjs.org' --dep=prod --upgrade`;
} else {
  $`npx npm-check-updates --registry='http://registry.npmjs.org' --dep=prod --upgrade --filter=${ MODULE }`;
}

await $`rm -rf ./node_modules`;
await $`rm -f ./package-lock.json;`;

await $`npm install`;
await $`npm test`;
