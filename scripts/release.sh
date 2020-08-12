#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
$DIR/grabthar-validate-git;
$DIR/grabthar-validate-npm;

if [ -z "$DIST_TAG" ]; then
    DIST_TAG="latest";
fi;

npm version patch;

git push;
git push --tags;
npm run flatten;
npm publish --tag $DIST_TAG;
git checkout package.json;
git checkout package-lock.json;

sleep 5;

$DIR/grabthar-cdnify --recursive
