#!/usr/bin/env node
/* eslint flowtype/require-valid-file-annotation: off, security/detect-non-literal-require: off, no-sync: off, import/no-commonjs: off */

import { cwd } from 'process';
import { createRequire } from 'module';

import { $ } from 'zx';

const moduleMetaUrl = import.meta.url;
const require = createRequire(moduleMetaUrl);

await $`grabthar-validate-git`;
await $`grabthar-validate-flat`;

const fs = require('fs');

const CWD = cwd();
const PACKAGE = `${ CWD }/package.json`;
const PACKAGE_LOCK = `${ CWD }/package-lock.json`;

if (!fs.existsSync(PACKAGE)) {
    throw new Error('Expected package.json to be present.');
}

if (!fs.existsSync(PACKAGE_LOCK)) {
    throw new Error('Expected package-lock.json to be present.');
}

const pkg = require(PACKAGE);
const pkgLock = require(PACKAGE_LOCK);

const flattenedDependencies = {};

for (const depName of Object.keys(pkgLock.dependencies)) {
    const dep = pkgLock.dependencies[depName];

    if (dep.dev) {
        continue;
    }

    flattenedDependencies[depName] = dep.version;
}

for (const depName of Object.keys(pkg.dependencies)) {
    if (!pkg.dependencies[depName].match(/^\d+\.\d+\.\d+$/)) {
        throw new Error(`Invalid dependency: ${  depName  }@${  pkg.dependencies[depName] }`);
    }
}

pkg.dependencies = flattenedDependencies;
fs.writeFileSync(PACKAGE, JSON.stringify(pkg, null, 2));
