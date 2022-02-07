#!/usr/bin/env zx

try {
  await $`git diff-files --quiet`;
  await $`git diff-index --quiet --cached HEAD`;
} catch (p) {
  console.log('ERROR: Cannot continue with unstaged or uncommitted changes');
  console.log(`Exit code: ${p.exitCode}`);
}
