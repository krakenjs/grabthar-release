#!/usr/bin/env zx

try {
  await $`git diff-files --quiet`;
} catch (p) {
  console.log('ERROR: Cannot continue with unstaged changes');
  console.log(`Exit code: ${p.exitCode}`);
}
