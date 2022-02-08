#!/usr/bin/env zx

import { cwd, env } from 'process';

const NPM_TOKEN = env.NPM_TOKEN;
let whoAmI;

if (NPM_TOKEN) {
  whoAmI = await $`NPM_TOKEN=${NPM_TOKEN} npm whoami`;
} else {
  whoAmI = await $`npm whoami`;
}

if (whoAmI) {
  console.log(`npm username: ${whoAmI}`);
} else {
  console.log("You must be logged in to publish a release. Running 'npm login'.");
  await $`npm login`;
}

const CWD = cwd();
const PACKAGE = require(`${CWD}/package.json`);
let org;

if (PACKAGE.name.indexOf('@') === 0) {
  org = PACKAGE.name.split('/')[0].slice(1);
}
