/* @flow */
/* eslint import/no-commonjs: off, no-console: off, no-process-exit: off */

import { lookup } from "dns";
import { tmpdir } from "os";
import { join } from "path";

import download from "download";
import HttpsProxyAgent from "https-proxy-agent";
import shell from "shelljs";
import commandLineArgs from "command-line-args";
import config from "libnpmconfig";
import { ensureDir, readFile, writeFile } from "fs-extra";
import nodeFetch from "node-fetch";

const PACKAGE_JSON_NAME = "package.json";

export const booleanEnv = (val: ?string, def: boolean = false): boolean => {
  if (val === "0" || val === "false" || val === "off") {
    return false;
  }

  if (val) {
    return true;
  }

  return def;
};

const getOptions = () => {
  const conf = config.read();

  return commandLineArgs(
    [
      {
        name: "verbose",
        type: Boolean,
        defaultValue: booleanEnv(process.env.VERBOSE),
      },
      {
        name: "registry",
        type: String,
        defaultValue: process.env.REGISTRY || "https://registry.npmjs.org",
      },
      {
        name: "npmproxy",
        type: String,
        defaultValue:
          process.env.NPM_PROXY ||
          conf.get("https_proxy") ||
          conf.get("proxy") ||
          "",
      },
      {
        name: "ipv6",
        type: Boolean,
        defaultValue: booleanEnv(process.env.IPV6),
      },
    ],
    {
      partial: true,
    }
  );
};

export const unique = <T>(arr: $ReadOnlyArray<T>): $ReadOnlyArray<T> => {
  return [...new Set(arr)];
};

export const getHost = (url: string): string => {
  return new URL(url).host;
};

export const dns = async (
  host: string,
  family?: number = 6
): Promise<string> => {
  return await new Promise((resolve, reject) => {
    lookup(host, { family }, (err, address) => {
      return err ? reject(err) : resolve(address);
    });
  });
};

export async function exec<T>(
  cmd: string,
  envVars?: {| [string]: string |}
): Promise<T> {
  const env = envVars || {};
  const options = getOptions();

  const cmdString = `> ${Object.keys(env)
    .map((key) => `${key}=${env[key]}`)
    .join(" ")} ${cmd}\n`;

  if (options.verbose) {
    console.log(cmdString);
  }

  for (const key of Object.keys(env)) {
    shell.env[key] = env[key];
  }

  const result = await new Promise((resolve, reject) => {
    shell.exec(
      cmd,
      { silent: !options.verbose, async: true },
      (code, stdout, stderr) => {
        if (code !== 0) {
          let message;

          if (stderr && stdout) {
            message = `${stderr}\n\n${stdout}`;
          } else if (stderr) {
            message = stderr;
          } else if (stdout) {
            message = stdout;
          } else {
            message = `Unknown error`;
          }

          reject(
            new Error(
              `Command failed with code ${code}:\n\n${cmdString}\n\n${message}`
            )
          );
        } else {
          resolve(stdout);
        }
      }
    );
  });

  try {
    return JSON.parse(result);
  } catch (err) {
    return result;
  }
}

export const npmFetch = async (url: string): Promise<Object> => {
  const opts = {};
  const options = getOptions();

  const host = getHost(url);

  if (opts.ipv6) {
    const ip = await dns(host);
    url = url.replace(host, `[${ip}]`);
  }

  opts.headers = opts.headers || {};
  opts.headers.host = host;

  if (options.npmproxy) {
    opts.agent = new HttpsProxyAgent(options.npmproxy);
  }

  if (options.verbose) {
    console.info("GET", url);
  }

  return await nodeFetch(url, opts);
};

export const npmDownload = async (
  url: string,
  dir: string,
  filename: string
): Promise<void> => {
  const opts = {};
  const options = getOptions();

  const host = getHost(url);

  if (opts.ipv6) {
    const ip = await dns(host);
    url = url.replace(host, `[${ip}]`);
  }

  opts.headers = opts.headers || {};
  opts.headers.host = host;
  opts.filename = filename;

  if (options.npmproxy) {
    opts.agent = new HttpsProxyAgent(options.npmproxy);
  }

  console.info("SYNC", url);
  await download(url, dir, opts);
};

export type PackageInfo = {|
  name: string,
  versions: {
    [string]: {|
      dependencies: {
        [string]: string,
      },
      dist: {|
        tarball: string,
      |},
      repository?: {|
        url?: string,
      |},
      gitHead?: string,
    |},
  },
  "dist-tags": {
    [string]: string,
  },
|};

let infoCache = {};

export const clearInfoCache = () => {
  infoCache = {};
};

export const info = async (
  name: string,
  expectedDistTag?: string
): Promise<PackageInfo> => {
  const options = getOptions();
  let infoResPromise;

  if (infoCache[name]) {
    infoResPromise = await infoCache[name];
  } else {
    infoResPromise = infoCache[name] = npmFetch(
      `${options.registry}/${name}`
    ).then((res) => res.json());
  }

  const json = await infoResPromise;

  if (!json) {
    throw new Error(`No info returned for ${name}`);
  }

  if (!json.versions) {
    throw new Error(`NPM info for ${name} has no versions`);
  }

  if (
    expectedDistTag &&
    (!json["dist-tags"] || !json["dist-tags"][expectedDistTag])
  ) {
    throw new Error(`${expectedDistTag} dist tag not defined`);
  }

  const result = JSON.parse(JSON.stringify(json));

  const resultVersions = {};
  for (const resultVersion of Object.keys(result.versions || {})) {
    const { repository = {}, gitHead } = result.versions[resultVersion];

    resultVersions[resultVersion] = {
      dependencies: result.versions[resultVersion].dependencies,
      dist: {
        tarball: result.versions[resultVersion].dist.tarball,
      },
      repository: {
        url: repository.url,
      },
      gitHead,
    };
  }

  return {
    name: result.name,
    "dist-tags": result["dist-tags"],
    versions: resultVersions,
  };
};

export const getDistVersions = async (
  name: string
): Promise<$ReadOnlyArray<string>> => {
  const distTags = (await info(name))["dist-tags"];
  // $FlowFixMe
  const versions: $ReadOnlyArray<string> = Object.values(distTags);
  return unique(versions);
};

export const NPM_SCRIPT = {
  TEST: "test",
  RELEASE_TEST: "test:release",
};

export async function gitCurrentBranch(): Promise<string> {
  return (await exec(`git rev-parse --abbrev-ref HEAD`)).trim();
}

export async function getCommittedFile<T>(file: string): Promise<T> {
  return await exec(`git show ${await gitCurrentBranch()}:${file}`);
}

export async function gitClone(repo: string, dir: string): Promise<void> {
  await exec(`git clone "${repo}" "${dir}" --depth=50`);
}

export async function gitCheckout(dir: string, commit: string): Promise<void> {
  await exec(`git -C "${dir}" checkout "${commit}"`);
}

export async function npmInstall(dir: string): Promise<void> {
  await exec(`npm --prefix "${dir}" install`);
}

export async function npmTest(dir: string): Promise<void> {
  await exec(`npm --prefix "${dir}" ${NPM_SCRIPT.TEST}`);
}

export async function npmReleaseTest(dir: string): Promise<void> {
  await exec(`npm --prefix "${dir}" ${NPM_SCRIPT.RELEASE_TEST}`);
}

export type PackageLock = {|
  dependencies: {|
    [string]: {|
      dev: boolean,
      version: string,
      requires: {|
        [string]: string,
      |},
    |},
  |},
|};

export type Dependencies = {| [string]: string |};

export function flattenDependencies(packageLock: PackageLock): Dependencies {
  const flattenedDependencies = {};

  for (const depName of Object.keys(packageLock.dependencies)) {
    const dep = packageLock.dependencies[depName];

    if (dep.dev) {
      continue;
    }

    flattenedDependencies[depName] = dep.version;
  }

  return flattenedDependencies;
}

export function findDependentModules(
  packageLock: PackageLock,
  dependendencyName: string
): {| [string]: {| [string]: string |} |} {
  const result = {};

  for (const moduleName of Object.keys(packageLock.dependencies)) {
    const requires = packageLock.dependencies[moduleName].requires;

    if (requires && Object.keys(requires).includes(dependendencyName)) {
      result[moduleName] = result[moduleName] || {};
      result[moduleName][dependendencyName] = moduleName;
    }
  }

  return result;
}

export function findAllDependentModules(
  packageLock: PackageLock,
  dependencyNames: $ReadOnlyArray<string>
): {| [string]: {| [string]: string |} |} {
  const result = {};

  for (const dependencyName of dependencyNames) {
    const dependentModules = findDependentModules(packageLock, dependencyName);

    for (const dependentModuleName of Object.keys(dependentModules)) {
      result[dependentModuleName] = result[dependentModuleName] || {};
      result[dependentModuleName] = {
        ...result[dependentModuleName],
        ...dependentModules[dependentModuleName],
      };
    }
  }

  return result;
}

export async function generateTempDirectory(name: string): Promise<string> {
  const dir = join(
    tmpdir(),
    `${name}-${Math.random().toString().split(".")[1]}`
  );
  await ensureDir(dir);
  return dir;
}

export async function rmrf(dir: string): Promise<void> {
  await exec(`rm -rf "${dir}"`);
}

type Package = {|
  scripts: {
    [string]: string,
  },
  dependencies: {
    [string]: string,
  },
|};

export async function getPackageForDir(dir: string): Promise<Package> {
  const pkgPath = join(dir, PACKAGE_JSON_NAME);
  const pkg = JSON.parse((await readFile(pkgPath)).toString());
  return pkg;
}

export async function writePackageForDir(
  dir: string,
  pkg: Package
): Promise<void> {
  const pkgPath = join(dir, PACKAGE_JSON_NAME);
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
}

export async function updatePackageWithLockedDependencies(
  dir: string,
  packageLock: PackageLock
): Promise<void> {
  const pkg = await getPackageForDir(dir);
  pkg.dependencies = flattenDependencies(packageLock);
  await writePackageForDir(dir, pkg);
}

export function packageHasScript(pkg: Package, scriptName: string): boolean {
  return Boolean(pkg.scripts && pkg.scripts[scriptName]);
}
