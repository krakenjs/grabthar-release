#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
$DIR/grabthar-validate-git;

attempt=1
max_attempts=5
failure_message="npm-check-updates failed after $max_attempts attempts. Please try running npm run upgrade again.\n"

until [ $attempt -eq $((max_attempts+1)) ]
do
    if [ -z "$1" ]; then
        printf "npm-check-updates attempt $attempt of $max_attempts\n"
        npx npm-check-updates --registry='http://registry.npmjs.org' --dep=prod --upgrade && break
        if [ $attempt -eq $max_attempts ]; then
            printf "$failure_message"
        fi;
        attempt=$((attempt+1))
    else
        printf "npm-check-updates attempt $attempt of $max_attempts\n"
        npx npm-check-updates --registry='http://registry.npmjs.org' --dep=prod --upgrade --filter="$1" && break
        if [ $attempt -eq $max_attempts ]; then
            printf "$failure_message"
        fi;
        attempt=$((attempt+1))
    fi;
done

rm -rf ./node_modules;
rm -f ./package-lock.json;

npm install;
npm test;

if [ ! -f ./package-lock.json ]; then
    echo "ERROR: Expected package-lock.json to be generated - are you using npm5+?"
    exit 1;
fi

node $DIR/grabthar-prune;

git add package.json;
git add package-lock.json;

if [ -z "$1" ]; then
    git commit -m "Update version of all modules"
else
    git commit -m "Update version of $1"
fi;

git push;
