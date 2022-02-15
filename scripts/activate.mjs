#!/usr/bin/env zx

import { cwd } from 'process';
import 'zx/globals';

let { LOCAL_VERSION, CDNIFY, ENVS, NPM_TOKEN } = argv;
const DIR = __dirname;
const TAG = 'active';
const DEFENVS = ['test', 'local', 'stage', 'sandbox', 'production'];
const CWD = cwd();
const { name: MODULE } = require(`${CWD}/package.json`);

await $`${DIR}/grabthar-validate-git`;
await $`${DIR}/grabthar-validate-npm`;

if (!LOCAL_VERSION) {
  LOCAL_VERSION = await $`npm view ${MODULE} version`;
}

if (!CDNIFY) {
  CDNIFY = true;
}

if (!ENVS) {
  ENVS = DEFENVS;
} else {
  ENVS = ENVS.split(',');
  for (let env of ENVS) {
    if (!DEFENVS.includes(env)) {
      throw new Error(`Invalid env: ${env}`);
    }
  }
}

let IS_NPM_OTP = false;

if (!NPM_TOKEN) {
  IS_NPM_OTP = true;
}

if (IS_NPM_OTP) {
  let { stdout: twoFactorCode } = await $`read -p "NPM 2FA Code: " twofactorcode; echo $twofactorcode;`;
  twoFactorCode = twoFactorCode.replace(/(\r\n|\n|\r)/gm, '');
}
