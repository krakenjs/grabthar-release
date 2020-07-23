#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
$DIR/grabthar-validate;

if [ -z "$1" ]; then
    npx npm-check-updates --dep=prod --upgrade
else
    if ! npm ls "$1"; then
        npm install --only=production --production --save --save-exact "$1"
        node $DIR/grabthar-prune;
    else
        npx npm-check-updates --dep=prod --upgrade --filter="$1"
    fi;
fi;

rm -rf ./node_modules;
rm -f ./package-lock.json;

npm install;
npm test;

if [ ! -f ./package-lock.json ]; then
    echo "ERROR: Expected package-lock.json to be generated - are you using npm5+?"
    exit 1;
fi

rm -rf ./node_modules;
rm -f ./package-lock.json;

npm install --production;
node $DIR/grabthar-prune;

git add package.json;
git add package-lock.json;

if [ -z "$1" ]; then
    git commit -m "Update version of all modules"
else
    git commit -m "Update version of $1"
fi;

git push;

rm -rf ./node_modules;
rm -f ./package-lock.json;

npm install;

git checkout package-lock.json;
