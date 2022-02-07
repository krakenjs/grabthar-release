#!/usr/bin/env zx

try {
  await $`git diff-files --quiet`;
  await $`git diff-index --quiet --cached HEAD`;
} catch (p) {
  console.log('ERROR: Cannot continue with unstaged or uncommitted changes');
  console.log(`Exit code: ${p.exitCode}`);
}

await $`npx check-node-version --node='>=14.13.1' --npm='>=6.14'`;
