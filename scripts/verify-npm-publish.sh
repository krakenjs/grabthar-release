package_name=$(node --eval "
    const PACKAGE = './package.json';
    let pkg = require(PACKAGE);
    console.log(pkg.name);
")

local_version=$(node --eval "
    const PACKAGE = './package.json';
    let pkg = require(PACKAGE);
    console.log(pkg.version);
")

verify_npm_publish () {
    npm_public_registry_version_latest_tag=$(npm view $1 version latest);
    echo "package name: $1"
    echo "local version: $2"
    echo "npm version: $npm_public_registry_version_latest_tag\n"
    while [ "$2" != "$npm_public_registry_version_latest_tag" ]
    do
        echo "Version mismatch. Trying again in 5 seconds...\n"
        sleep 5;
        npm_public_registry_version_latest_tag=$(npm view $1 version latest);
    done
    echo "Successful version match."
}

verify_npm_publish "$module" "$local_version"