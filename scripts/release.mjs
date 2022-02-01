#!/usr/bin/env zx

await $`set -e`

const DIR = __dirname
await $`zx ${DIR}/grabthar-validate-git`
await $`zx ${DIR}/grabthar-validate-npm`

let DIST_TAG = process.argv.find(element => element.includes('DIST_TAG='))?.replace('DIST_TAG=', '')

DIST_TAG ?? (DIST_TAG = 'latest')
