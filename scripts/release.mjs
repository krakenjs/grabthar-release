#!/usr/bin/env zx

await $`set -e`

const DIR = __dirname

await $`zx ${DIR}/grabthar-validate-git`
await $`zx ${DIR}/grabthar-validate-npm`

let DIST_TAG = process.argv.find(element => element.includes('DIST_TAG='))?.replace('DIST_TAG=', '')
DIST_TAG ?? (DIST_TAG = 'latest')

let BUMP = process.argv.find(element => element.includes('BUMP='))?.replace('BUMP=', '')
BUMP ?? (BUMP = 'patch')

await $`npm version ${BUMP}`
await $`git push`
await $`git push --tags`
await $`zx ${DIR}/grabthar-flatten`

let NPM_TOKEN = process.argv.find(element => element.includes('NPM_TOKEN='))?.replace('NPM_TOKEN=', '')
NPM_TOKEN ?? (NPM_TOKEN = '')
