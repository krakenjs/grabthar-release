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
  package_name=$1
  local_version=$2
  dist_tag=$3

  npm_public_registry_version=$(npm view $package_name version $dist_tag);

  echo "package name: $package_name"
  echo "local version: $local_version"
  echo "npm version: $npm_public_registry_version\n"
  while [ "$local_version" != "$npm_public_registry_version" ]
  do
      echo "Version mismatch. Trying again in 5 seconds...\n"
      sleep 5;
      npm_public_registry_version=$(npm view $package_name version $dist_tag);
  done
  echo "Successful version match."
}

verify_npm_publish "$package_name" "$local_version" "$dist_tag"