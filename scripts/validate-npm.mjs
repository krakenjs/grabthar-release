#!/usr/bin/env zx

import { env } from 'process';

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
