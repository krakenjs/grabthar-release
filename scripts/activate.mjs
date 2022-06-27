#!/usr/bin/env node
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off, no-console: off */

import { cwd, env } from "process";
import { createRequire } from "module";

import { $, argv, question } from "zx";

const moduleMetaUrl = import.meta.url;
const require = createRequire(moduleMetaUrl);
const { NPM_TOKEN } = env;
let { LOCAL_VERSION: VERSION, CDNIFY, ENVS } = argv;
const TAG = "active";
const DEFENVS = ["test", "local", "stage", "sandbox", "production"];
const CWD = cwd();
const { name: MODULE } = require(`${CWD}/package.json`);

await $`grabthar-validate-git`;
await $`grabthar-validate-npm`;

if (!VERSION) {
  VERSION = await $`npm view ${MODULE} version`;
  VERSION = VERSION.stdout.trim();
}

if (!CDNIFY) {
  CDNIFY = "true";
}

if (!ENVS) {
  ENVS = DEFENVS;
} else {
  ENVS = ENVS.split(",");
  for (const environment of ENVS) {
    if (!DEFENVS.includes(environment)) {
      throw new Error(`Invalid env: ${environment}`);
    }
  }
}

let twoFactorCode;

if (!NPM_TOKEN) {
  twoFactorCode = await question("NPM 2FA Code: ");
}

for (const environment of ENVS) {
  if (!NPM_TOKEN) {
    console.log(
      `npm dist-tag add ${MODULE}@${VERSION} ${TAG}-${environment} --otp=${twoFactorCode}`
    );
    await $`npm dist-tag add ${MODULE}@${VERSION} ${TAG}-${environment} --otp=${twoFactorCode}`;
  } else {
    console.log(`npm dist-tag add ${MODULE}@${VERSION} ${TAG}-${environment}`);
    await $`NPM_TOKEN=${NPM_TOKEN} npm dist-tag add ${MODULE}@${VERSION} ${TAG}-${environment}`;
  }
}

for (const environment of ENVS) {
  await $`grabthar-verify-npm-publish --LOCAL_VERSION=${VERSION} --DIST_TAG=${TAG}-${environment}`;
}

if (CDNIFY === "true") {
  await $`grabthar-cdnify`;
}
