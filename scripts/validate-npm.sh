#!/bin/bash

set -e;

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
