#!/usr/bin/env zx

try {
  await $`git diff-files --quiet`;
  await $`git diff-index --quiet --cached HEAD`;
} catch (err) {
  throw new Error(`Cannot continue with unstaged or uncommitted changes\nExit code: ${err.exitCode}`);
}

await $`npx check-node-version --node='>=14.13.1' --npm='>=6.14'`;

const UPSTREAM = 'origin';
let LOCAL_BRANCH = await $`git rev-parse --abbrev-ref HEAD`;
let LOCAL_COMMIT = await $`git rev-parse HEAD`;
let REMOTE_COMMIT = await $`git rev-parse ${UPSTREAM}/${LOCAL_BRANCH}`;
let BASE_COMMIT = await $`git merge-base HEAD ${UPSTREAM}/${LOCAL_BRANCH}`;

LOCAL_BRANCH = LOCAL_BRANCH.stdout;
LOCAL_COMMIT = LOCAL_COMMIT.stdout;
REMOTE_COMMIT = REMOTE_COMMIT.stdout;
BASE_COMMIT = BASE_COMMIT.stdout;

if (LOCAL_COMMIT !== REMOTE_COMMIT) {
  if (LOCAL_COMMIT === BASE_COMMIT) {
    throw new Error('Local repo behind upstream repo');
  } else if (REMOTE_COMMIT === BASE_COMMIT) {
    throw new Error('Local repo ahead of upstream repo');
  } else {
    throw new Error('Local repo diverged from upstream repo');
  }
}
