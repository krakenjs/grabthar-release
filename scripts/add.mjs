#!/usr/bin/env node
/* eslint flowtype/require-valid-file-annotation: off */

import { $, argv } from 'zx';

const { MODULE } = argv;

await $`grabthar-validate-git`;

if (!MODULE) {
    throw new Error('Must specify module to add');
} else {
    await $`grabthar-upgrade --MODULE=${ MODULE }`;
}
