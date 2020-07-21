#!/bin/bash

set -e;

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";
$DIR/validate.sh;

if npm whoami &> /dev/null; then
    echo "npm username: $(npm whoami)"
else
    echo "You must be logged in to publish a release. Running 'npm login'"
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
            echo "ERROR: You must be assigned the developer or owner role in the npm $org org to publish";
            exit 1;
        fi
    fi
fi;

npm version patch;

git push;
git push --tags;
npm run flatten;
npm publish;
git checkout package.json;
git checkout package-lock.json;

sleep 5;

npm run cdnify;
git add cdn;
git commit -m "Bundle CDN packages";
git push;

# TODO:
# - Validate CDNX command available
# - Trigger CDN release
# - Automate CDN approval (as much as possible)
