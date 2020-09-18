#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
# $DIR/grabthar-validate-git;
# $DIR/grabthar-validate-npm;

version="$1";
tag="active";
defenvs="test local stage sandbox production";

module=$(node --eval "
    const PACKAGE = './package.json';
    let pkg = require(PACKAGE);
    console.log(pkg.name);
")

local_version=$(node --eval "
    const PACKAGE = './package.json';
    let pkg = require(PACKAGE);
    console.log(pkg.version);
")

npm_public_registry_version_latest_tag=$(npm view $module version latest);

while [ "$npm_public_registry_version_latest_tag" != "$local_version" ]
do
  echo "npm version: $npm_public_registry_version_latest_tag"
  echo "local version: $local_version"
  echo "Version mismatch. Trying again in 5 seconds...\n"
  sleep 5;
  npm_public_registry_version_latest_tag=$(npm view $module version latest);
  # the following local_version is just for testing purposes and should be removed from production code
  local_version=$(node --eval "
    const PACKAGE = './package.json';
    let pkg = require(PACKAGE);
    console.log(pkg.version);
")
done

echo "npm version: $npm_public_registry_version_latest_tag"
echo "local version: $local_version"
echo "Successful version match."

if [ -z "$version" ]; then
    version=$(npm view $module version);
fi;

if [ -z "$2" ]; then
    envs="$defenvs"
else
    envs="$2"

    for env in $envs; do
        if [[ $env != "local" && $env != "stage" && $env != "sandbox" && $env != "production" && $env != "test" ]]; then
            echo "Invalid env: $envs"
            exit 1;
        fi;
    done;
fi;

# read -p "NPM 2FA Code: " twofactorcode

# for env in $envs; do
#     echo npm dist-tag add $module@$version "$tag-$env" --otp="$twofactorcode";
#     npm dist-tag add $module@$version "$tag-$env" --otp="$twofactorcode";
# done;

# sleep 5;

# $DIR/grabthar-cdnify
