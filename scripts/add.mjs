#!/usr/bin/env node

import { $, argv } from 'zx';

const { MODULE } = argv;

await $`grabthar-validate-git`;

if (!MODULE) {
  throw new Error('Must specify module to add');
}
