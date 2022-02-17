#!/usr/bin/env zx
/* eslint flowtype/require-valid-file-annotation: off */

import { $ } from 'zx';

try {
    await $`git diff-files --quiet`;
    await $`git diff-index --quiet --cached HEAD`;
} catch (err) {
    throw new Error(`Cannot continue with unstaged or uncommitted changes\nExit code: ${ err.exitCode }`);
}

await $`npx check-node-version --node='>=14.13.1' --npm='>=6.14'`;

const UPSTREAM = 'origin';
const LOCAL_BRANCH = await $`git rev-parse --abbrev-ref HEAD`;
const { stdout: LOCAL_COMMIT } = await $`git rev-parse HEAD`;
const { stdout: REMOTE_COMMIT } = await $`git rev-parse ${ UPSTREAM }/${ LOCAL_BRANCH }`;
const { stdout: BASE_COMMIT } = await $`git merge-base HEAD ${ UPSTREAM }/${ LOCAL_BRANCH }`;

if (LOCAL_COMMIT !== REMOTE_COMMIT) {
    if (LOCAL_COMMIT === BASE_COMMIT) {
        throw new Error('Local repo behind upstream repo');
    } else if (REMOTE_COMMIT === BASE_COMMIT) {
        throw new Error('Local repo ahead of upstream repo');
    } else {
        throw new Error('Local repo diverged from upstream repo');
    }
}
