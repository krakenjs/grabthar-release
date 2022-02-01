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

await $`NPM_TOKEN=${NPM_TOKEN} npm publish --tag ${DIST_TAG}`
await $`git checkout package.json`
await $`git checkout package-lock.json || echo 'Package lock not found'`

const cwd = process.cwd()
const local_version = require(`${cwd}/package.json`).version

await $`zx ${DIR}/grabthar-verify-npm-publish ${local_version} ${DIST_TAG}`

// update non-prod dist tags whenever the latest dist tag changes
if (DIST_TAG === 'latest') await $`zx ${DIR}/grabthar-activate LOCAL_VERSION=${local_version} CDNIFY=false TAGS='[test, local, stage]'`
