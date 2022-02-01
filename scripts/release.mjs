#!/usr/bin/env zx

await $`set -e`

const DIR = __dirname
await $`zx ${DIR}/grabthar-validate-git`
await $`zx ${DIR}/grabthar-validate-npm`
