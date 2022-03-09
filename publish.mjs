#!/usr/bin/env node

import { $ } from 'zx';

try {
    await $`git diff-files --quiet`;
    await $`git diff-index --quiet --cached HEAD`;
} catch (err) {
    throw new Error(`Cannot continue with unstaged or uncommitted changes\nExit code: ${ err.exitCode }`);
}

await $`npm test`;

// This will determine the type of release based on the git branch. When the default branch is used, it will be a `patch` that's published to npm under the `latest` dist-tag. Any other branch will be a `prelease` that's published to npm under the `alpha` dist-tag.

let BUMP = 'patch';
let TAG = 'latest';
