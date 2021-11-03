#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
$DIR/grabthar-validate-git;

if [ -z "$1" ]; then
    npx npm-check-updates --registry='http://registry.npmjs.org' --dep=prod --upgrade
else
    npx npm-check-updates --registry='http://registry.npmjs.org' --dep=prod --upgrade --filter="$1"
fi;

rm -rf ./node_modules;
rm -f ./package-lock.json;

npm install;
npm test;

if [ ! -f ./package-lock.json ]; then
    echo "ERROR: Expected package-lock.json to be generated - are you using npm5+?"
    exit 1;
fi

if [ "$EXPERIMENTAL_DEPENDENCY_TEST" = "1" ]; then
    $DIR/grabthar-dependency-test;
fi;

node $DIR/grabthar-prune;

git add package.json;
git add package-lock.json;

if [ -z "$1" ]; then
    git commit -m "Update version of all modules"
else
    git commit -m "Update version of $1"
fi;

git push;
