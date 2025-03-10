# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.9.1](https://github.com/krakenjs/grabthar-release/compare/v3.9.0...v3.9.1) (2025-02-28)


* update npm config registry ([#52](https://github.com/krakenjs/grabthar-release/issues/52)) ([b24611e](https://github.com/krakenjs/grabthar-release/commit/b24611ead6e1671ccf49979cf46a17622dd88e3c))

## [3.9.0](https://github.com/krakenjs/grabthar-release/compare/v3.0.0...v3.9.0) (2025-02-06)


### Features

* upgrade node-cli to remove ip module dependency ([#51](https://github.com/krakenjs/grabthar-release/issues/51)) ([eba9132](https://github.com/krakenjs/grabthar-release/commit/eba9132801ca5f296888404fec89127fbd46a183))
* upgrade to grumbler scripts 8 ([#46](https://github.com/krakenjs/grabthar-release/issues/46)) ([6d70084](https://github.com/krakenjs/grabthar-release/commit/6d7008472a34420ffb997c6dbdc03ba5b6ad5028))


### Bug Fixes

* fix tarball guard case ([6cc66c3](https://github.com/krakenjs/grabthar-release/commit/6cc66c3195696cd5ba4701edb4ccdd5d3f1b7fbb))


* remove token from publish action ([3ecf328](https://github.com/krakenjs/grabthar-release/commit/3ecf328be661dd930f34fcb65a8f656649efe31d))
* use prettier ([#41](https://github.com/krakenjs/grabthar-release/issues/41)) ([6c2cabb](https://github.com/krakenjs/grabthar-release/commit/6c2cabb70876d574a0a6044b5831404b85bd8b1a))

## [3.0.0](https://github.com/krakenjs/grabthar-release/compare/v2.4.0...v3.0.0) (2022-06-10)


### ⚠ BREAKING CHANGES

* always version folders under cdn path (#44)

### Features

* always version folders under cdn path ([#44](https://github.com/krakenjs/grabthar-release/issues/44)) ([3da291c](https://github.com/krakenjs/grabthar-release/commit/3da291c1e8525c394bc7e727d3a9aeca2687c03a))

## [2.4.0](https://github.com/krakenjs/grabthar-release/compare/v2.3.0...v2.4.0) (2022-06-08)


### Features

* cleanup previous verisoned folders ([#43](https://github.com/krakenjs/grabthar-release/issues/43)) ([4d3bf25](https://github.com/krakenjs/grabthar-release/commit/4d3bf25acfeeef73424bde74abb7b74e7d50c596))

## [2.3.0](https://github.com/krakenjs/grabthar-release/compare/v2.2.3...v2.3.0) (2022-05-10)


### Features

* add option to create versioned folder ([#42](https://github.com/krakenjs/grabthar-release/issues/42)) ([801468e](https://github.com/krakenjs/grabthar-release/commit/801468e4c7ca022fc73f2ea8514e0fe061152d13))

### [2.2.3](https://github.com/krakenjs/grabthar-release/compare/v2.2.2...v2.2.3) (2022-04-11)


### Bug Fixes

* access `stdout` property before `trim()` ([#40](https://github.com/krakenjs/grabthar-release/issues/40)) ([a131c98](https://github.com/krakenjs/grabthar-release/commit/a131c98da4e7cb58bc3cb98329ceabff23122a9d))

### [2.2.2](https://github.com/krakenjs/grabthar-release/compare/v2.2.1...v2.2.2) (2022-04-11)


* move devDependencies to [@krakenjs](https://github.com/krakenjs) scope ([#39](https://github.com/krakenjs/grabthar-release/issues/39)) ([6863a02](https://github.com/krakenjs/grabthar-release/commit/6863a02b5ffb750d2a429c23a413b3bfa4ccf7b0))

### [2.2.1](https://github.com/krakenjs/grabthar-release/compare/v2.2.0...v2.2.1) (2022-04-07)


### Bug Fixes

* get `DRY_RUN` from `env` and do final cleanup ([#38](https://github.com/krakenjs/grabthar-release/issues/38)) ([7295349](https://github.com/krakenjs/grabthar-release/commit/72953497093677e40a39ab7bd6195914ad1be64d))

## [2.2.0](https://github.com/krakenjs/grabthar-release/compare/v2.1.6...v2.2.0) (2022-04-07)


### Features

* add dry run option ([#37](https://github.com/krakenjs/grabthar-release/issues/37)) ([a35c81d](https://github.com/krakenjs/grabthar-release/commit/a35c81dbf59ac78335d8648345650287dcd8a468))

### [2.1.6](https://github.com/krakenjs/grabthar-release/compare/v2.1.5...v2.1.6) (2022-04-05)


* remove flatten version check ([95827c8](https://github.com/krakenjs/grabthar-release/commit/95827c89269a6988a613144cc92adf2536b220c3))

### [2.1.5](https://github.com/krakenjs/grabthar-release/compare/v2.1.4...v2.1.5) (2022-04-05)


* use semver for valid dep check in flatten step ([d26fa83](https://github.com/krakenjs/grabthar-release/commit/d26fa83a9af259a4abfc430fdd009594c0950a1b))

### [2.1.4](https://github.com/krakenjs/grabthar-release/compare/v2.1.3...v2.1.4) (2022-03-31)


### Bug Fixes

* run git checkout ./scripts after pushing and publishing ([0d60a06](https://github.com/krakenjs/grabthar-release/commit/0d60a06c0ba231fdbeb52b0b8186bbd18bf3c81f))
* use prepublishOnly for babel ([78b92df](https://github.com/krakenjs/grabthar-release/commit/78b92dfdd01a65b3f748ccfc17667db3fcd664fc))

### [2.1.2](https://github.com/krakenjs/grabthar-release/compare/v2.1.1...v2.1.2) (2022-03-30)

### [2.1.1](https://github.com/krakenjs/grabthar-release/compare/v2.1.0...v2.1.1) (2022-03-30)

## [2.1.0](https://github.com/krakenjs/grabthar-release/compare/v2.0.0...v2.1.0) (2022-03-29)


### Features

* remove git validation from grabthar-flatten ([#32](https://github.com/krakenjs/grabthar-release/issues/32)) ([7ecb66b](https://github.com/krakenjs/grabthar-release/commit/7ecb66b53b16a54a85a6f038e7fa6c88859f62d7))

## [2.0.0](https://github.com/krakenjs/grabthar-release/compare/v1.0.73...v2.0.0) (2022-03-24)


### ⚠ BREAKING CHANGES

* move to standard-version and @krakenjs scope

### Features

* use zx instead of bash ([#17](https://github.com/krakenjs/grabthar-release/issues/17)) ([c38f768](https://github.com/krakenjs/grabthar-release/commit/c38f7683e248589b249607e8133c6027a609317b))


* move to standard-version and [@krakenjs](https://github.com/krakenjs) scope ([8597cdd](https://github.com/krakenjs/grabthar-release/commit/8597cdd76d8abe8008f392d87d64d6c0141e9a9a))
