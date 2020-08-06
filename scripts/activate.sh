#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
$DIR/grabthar-validate;

if npm whoami &> /dev/null; then
    echo "npm username: $(npm whoami)"
else
    echo "You must be logged in to activate a release. Running 'npm login'"
    npm login
fi

org=$(node --eval "
    const PACKAGE = './package.json';
    let pkg = require(PACKAGE);
    if (pkg.name.indexOf('@') === 0) {
        console.log(pkg.name.split('/')[0].slice(1));
    }
")

if [ "$org" ]; then
    USER_ROLE=$(npm org ls $org "$(npm whoami)" --json)

    PERMISSION=$(node --eval "
        let userRole = $USER_ROLE;
        console.log(userRole['$(npm whoami)']);
    " "$USER_ROLE")

    if [ ! "$PERMISSION" = "developer" ]; then
        if [ ! "$PERMISSION" = "owner" ]; then
            echo "ERROR: You must be assigned the developer or owner role in the npm $org org to activate";
            exit 1;
        fi
    fi
fi;

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

read -p "NPM 2FA Code: " twofactorcode

for env in $envs; do
    echo npm dist-tag add $module@$version "$tag-$env" --otp="$twofactorcode";
    npm dist-tag add $module@$version "$tag-$env" --otp="$twofactorcode";
done;

sleep 5;

$DIR/grabthar-cdnify --cdn="$CDN";
