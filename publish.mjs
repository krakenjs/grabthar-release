#!/usr/bin/env node

import { $ } from 'zx';

try {
    await $`git diff-files --quiet`;
    await $`git diff-index --quiet --cached HEAD`;
} catch (err) {
    throw new Error(`Cannot continue with unstaged or uncommitted changes\nExit code: ${ err.exitCode }`);
}
