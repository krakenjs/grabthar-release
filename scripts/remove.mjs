#!/usr/bin/env node

import { $, argv } from 'zx';

const { MODULE } = argv;

await $`grabthar-validate-git`;

if (!MODULE) {
  throw new Error('Please provide a module name to remove');
} else {
  try {
    await $`npm ls ${ MODULE }`
  } catch (error) {
    throw new Error(`${ MODULE } is not currently a dependency`);
  }
  await $`npm uninstall ${ MODULE }`;
}
