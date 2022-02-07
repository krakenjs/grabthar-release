#!/usr/bin/env zx

try {
  await $`git diff-files --quiet`;
  await $`git diff-index --quiet --cached HEAD`;
} catch (p) {
  console.log('ERROR: Cannot continue with unstaged or uncommitted changes');
  console.log(`Exit code: ${p.exitCode}`);
}

await $`npx check-node-version --node='>=14.13.1' --npm='>=6.14'`;

const UPSTREAM = 'origin';
const LOCAL_BRANCH = await $`git rev-parse --abbrev-ref HEAD`;
const LOCAL_COMMIT = await $`git rev-parse HEAD`;
const REMOTE_COMMIT = await $`git rev-parse "${UPSTREAM}"/"${LOCAL_BRANCH}"`;
const BASE_COMMIT = await $`git merge-base HEAD "${UPSTREAM}"/"${LOCAL_BRANCH}"`;
