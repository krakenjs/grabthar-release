#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
$DIR/grabthar-validate-git;
$DIR/grabthar-validate-npm;

version="$1";
tag="active";
defenvs="test local stage sandbox production";

module=$(node --eval "
    const PACKAGE = './package.json';
    let pkg = require(PACKAGE);
    console.log(pkg.name);
")

if [ -z "$version" ]; then
    version=$(npm view $module version);
fi;

if [ -z "$CDNIFY" ]; then
    CDNIFY=true
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

IS_NPM_OTP=false

if [ -z "$NPM_TOKEN" ]; then
    IS_NPM_OTP=true
fi;

if [ "$IS_NPM_OTP" = true ]; then
    read -p "NPM 2FA Code: " twofactorcode
fi;

for env in $envs; do
    if [ "$IS_NPM_OTP" = true ]; then
        echo npm dist-tag add $module@$version "$tag-$env" --otp="$twofactorcode";
        npm dist-tag add $module@$version "$tag-$env" --otp="$twofactorcode";
    else
        echo npm dist-tag add $module@$version "$tag-$env"
        NPM_TOKEN=$NPM_TOKEN npm dist-tag add $module@$version "$tag-$env"
    fi;
done;

for env in $envs; do
    $DIR/grabthar-verify-npm-publish "$version" "$tag-$env";
done;

if [ "$CDNIFY" = true ]; then
    $DIR/grabthar-cdnify
fi;
