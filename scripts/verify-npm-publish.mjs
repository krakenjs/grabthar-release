#!/usr/bin/env zx

import 'zx/globals';

let { DIST_TAG, LOCAL_VERSION } = argv;

if (!DIST_TAG || !LOCAL_VERSION) {
  throw new Error('Invalid arguments. Expected <version> and <dist-tag>.');
}
