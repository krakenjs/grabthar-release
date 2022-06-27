#!/usr/bin/env node
/* eslint no-process-exit: off, security/detect-non-literal-require: off, no-console: off */
/* @flow */

import { readFile } from "fs-extra";

import {
  getCommittedFile,
  flattenDependencies,
  findAllDependentModules,
  generateTempDirectory,
  info,
  gitClone,
  gitCheckout,
  rmrf,
  npmInstall,
  npmTest,
  updatePackageWithLockedDependencies,
  getPackageForDir,
  packageHasScript,
  npmReleaseTest,
  NPM_SCRIPT,
  type PackageLock,
  type PackageInfo,
} from "./grabthar-utils";

const PACKAGE_LOCK_FILE_NAME = "package-lock.json";

async function getExistingPackageLock(): Promise<PackageLock> {
  return await getCommittedFile(PACKAGE_LOCK_FILE_NAME);
}

async function getCandidatePackageLock(): Promise<PackageLock> {
  return await JSON.parse(await readFile(PACKAGE_LOCK_FILE_NAME));
}

type DependenciesDiff = {
  [string]: {|
    existingVersion: string,
    candidateVersion: string,
  |},
};

function dependencyDiff(
  existingPackageLock: PackageLock,
  candidatePackageLock: PackageLock
): DependenciesDiff {
  const existingPackageLockDependencies =
    flattenDependencies(existingPackageLock);
  const candidatePackageLockDependencies =
    flattenDependencies(candidatePackageLock);

  const result: DependenciesDiff = {};

  for (const [name, candidateVersion] of Object.entries(
    candidatePackageLockDependencies
  )) {
    if (typeof candidateVersion !== "string") {
      continue;
    }

    const existingVersion = existingPackageLockDependencies[name];

    if (existingVersion && existingVersion !== candidateVersion) {
      result[name] = { existingVersion, candidateVersion };
    }
  }

  return result;
}

async function runTests(
  moduleName: string,
  packageLock: PackageLock
): Promise<void> {
  const version = packageLock.dependencies[moduleName].version;

  console.info(`Running tests for ${moduleName}@${version}`);
  const dir = await generateTempDirectory(moduleName);

  try {
    const packageInfo: PackageInfo = await info(moduleName);
    const packageVersionInfo = packageInfo.versions[version];

    const repoUrl =
      packageVersionInfo.repository && packageVersionInfo.repository.url;
    const gitHead = packageVersionInfo.gitHead;

    if (!repoUrl) {
      throw new Error(`No repository found for ${moduleName}@${version}`);
    }

    if (!gitHead) {
      throw new Error(`No git head commit found for ${moduleName}@${version}`);
    }

    const repo = repoUrl.replace(/^.+:\/\//, "https://");

    if (!repo.includes("github.com")) {
      throw new Error(
        `Can not run tests for ${moduleName}@${version} - non-public github repo: ${repo}`
      );
    }

    await gitClone(repo, dir);
    await gitCheckout(dir, gitHead);
    await updatePackageWithLockedDependencies(dir, packageLock);
    await npmInstall(dir);

    const pkg = await getPackageForDir(dir);

    if (packageHasScript(pkg, NPM_SCRIPT.RELEASE_TEST)) {
      await npmReleaseTest(dir);
    } else if (packageHasScript(pkg, NPM_SCRIPT.TEST)) {
      await npmTest(dir);
    } else {
      throw new Error(`No test script found for ${moduleName}`);
    }

    await rmrf(dir);
  } catch (err) {
    console.info(``);
    console.info(`Tests failed for ${moduleName}@${version}`);
    console.info(`Test directory: ${dir}`);
    console.info(`Test error: ${err.stack}`);
    console.info(``);
    throw err;
  }

  console.info(`Completed tests for ${moduleName}@${version}`);
}

async function run() {
  const existingPackageLock = await getExistingPackageLock();
  const candidatePackageLock = await getCandidatePackageLock();

  if (
    !JSON.stringify(candidatePackageLock) ===
    JSON.stringify(existingPackageLock)
  ) {
    console.info("No package-lock changes, skipping dependency tests");
    return;
  }

  const diff = dependencyDiff(existingPackageLock, candidatePackageLock);

  if (!Object.keys(diff).length) {
    console.info("No different dependency versions, skipping dependency tests");
    return;
  }

  console.info("Found the following new versions:");
  // $FlowFixMe
  for (const [name, { existingVersion, candidateVersion }] of Object.entries(
    diff
  )) {
    console.info(`- ${name}: ${existingVersion} -> ${candidateVersion}`);
  }
  console.info("");

  const dependentModules = findAllDependentModules(
    existingPackageLock,
    Object.keys(diff)
  );

  console.info(
    `Found the following dependent modules for ${Object.keys(diff).join(", ")}:`
  );
  // $FlowFixMe
  for (const name of Object.keys(dependentModules)) {
    console.info(
      `- ${name}: ${Object.keys(dependentModules[name]).join(", ")}`
    );
  }
  console.info("");

  const failed = [];
  const passed = [];

  await Promise.all(
    Object.keys(dependentModules).map(async (moduleName) => {
      try {
        await runTests(moduleName, candidatePackageLock);
        passed.push(moduleName);
      } catch (err) {
        failed.push(moduleName);
      }
    })
  );

  if (passed.length) {
    console.info(`Tests passed for ${passed.join(", ")}`);
  }

  if (failed.length) {
    throw new Error(`Tests failed for ${failed.join(", ")}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
