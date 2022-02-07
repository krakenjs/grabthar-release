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
let LOCAL_BRANCH = await $`git rev-parse --abbrev-ref HEAD`;
let LOCAL_COMMIT = await $`git rev-parse HEAD`;
let REMOTE_COMMIT = await $`git rev-parse "${UPSTREAM}"/"${LOCAL_BRANCH}"`;
let BASE_COMMIT = await $`git merge-base HEAD "${UPSTREAM}"/"${LOCAL_BRANCH}"`;

LOCAL_BRANCH = LOCAL_BRANCH.toString();
LOCAL_COMMIT = LOCAL_COMMIT.toString();
REMOTE_COMMIT = REMOTE_COMMIT.toString();
BASE_COMMIT = BASE_COMMIT.toString();

if (LOCAL_COMMIT !== REMOTE_COMMIT) {
  if (LOCAL_COMMIT === BASE_COMMIT) {
    throw new Error('ERROR: Local repo behind upstream repo');
  } else if (REMOTE_COMMIT === BASE_COMMIT) {
    throw new Error('ERROR: Local repo ahead of upstream repo');
  } else {
    throw new Error('ERROR: Local repo diverged from upstream repo');
  }
}
