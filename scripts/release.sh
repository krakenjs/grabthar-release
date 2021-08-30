#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
$DIR/grabthar-validate-git;
$DIR/grabthar-validate-npm;

if [ -z "$DIST_TAG" ]; then
    DIST_TAG="latest";
fi;

npm version ${1-patch};

git push;
git push --tags;
$DIR/grabthar-flatten;
NPM_TOKEN=$NPM_TOKEN npm publish --tag $DIST_TAG;
git checkout package.json;
git checkout package-lock.json || echo 'Package lock not found';

local_version=$(node --eval "
    const PACKAGE = './package.json';
    let pkg = require(PACKAGE);
    console.log(pkg.version);
")

$DIR/grabthar-verify-npm-publish $local_version $DIST_TAG

# update non-prod dist tags whenever the latest dist tag changes
if [ "$DIST_TAG" = "latest" ]; then
    CDNIFY=false $DIR/grabthar-activate $local_version "test local stage"
fi;
