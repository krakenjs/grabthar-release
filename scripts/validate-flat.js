#!/usr/bin/env node

/* @flow */

import { join } from "path";

import { readFileSync, existsSync } from "fs-extra";

const PACKAGE_LOCK = join(process.cwd(), "package-lock.json");

if (existsSync(PACKAGE_LOCK)) {
  const pkgLock = JSON.parse(readFileSync(PACKAGE_LOCK));

  for (const depName of Object.keys(pkgLock.dependencies)) {
    const dep = pkgLock.dependencies[depName];

    if (dep.dev) {
      continue;
    }

    if (dep.dependencies) {
      throw new Error(
        `Expected ${depName} to not have any unflattened sub-dependencies - found ${Object.keys(
          dep.dependencies
        ).join(", ")}`
      );
    }
  }
}
