#!/usr/bin/env zx

const DIR = __dirname;

await $`${DIR}/grabthar-validate-git`;
await $`${DIR}/grabthar-validate-npm`;
