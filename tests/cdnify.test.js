/* @flow */
import { join } from 'path';

import { fs as memfs } from 'memfs';
import mockArgv from 'mock-argv';
import fetchMock from 'node-fetch';

import { run } from '../scripts/cdnify';
import { clearInfoCache } from '../scripts/grabthar-utils';


const { promises: fs } = memfs;

jest.mock('fs', () => require('memfs').fs);
jest.mock('download', () => (url, folderPath, { filename })  => {
    const filesystem = require('fs');
    const file = `${ folderPath }/${ filename }`;

    return filesystem.promises.writeFile(file, 'tarball info');

});
jest.mock('node-fetch', () => require('fetch-mock-jest').sandbox());
jest.mock('shelljs', () => ({
    exec: jest.fn((cmd, opts, cb) => {
        cb(0, []);
    })
}));

const exists = async (path) => {
    let pathExists = false;

    try {
        await fs.stat(path);
        pathExists = true;
    } catch (_) {
        // do nothing
    }

    return pathExists;
};

const mockNpmRequest = (packageName, infoJson) => {
    // $FlowFixMe node-fetch is mocked by fetch-mock-jest
    fetchMock.get(`https://registry.npmjs.org/${ packageName }`, infoJson, { overwriteRoutes: true });
};

const createVersion = ({ name, version = '1.0.0', registry = 'https://www.fake-registry.com', dependencies } : {|name : string, version? : string, cdn? : string, dependencies? : {|[string] : string|}|}) => {
    const urlPathName = name.includes('@') ? name.replace('@', '') : name;

    return {
        version,
        'dependencies': dependencies || {},
        'dist':         {
            'tarball': `${ registry }js-sdk-release/${ urlPathName }/tarballs/${ version }.tgz`
        },
        'repository': {
            'url': `git://github.com/${ urlPathName }.git`
        },
        'gitHead': '1bbe95f046537640950ed4fdadaccf1195f715f7'
    };
};

const createInfoPackage = ({ name, latest = '1.0.0', distTags, versions = [ createVersion({ name, version: latest }) ] } : {|name : string, latest? : string, distTags? : {[string] : string}, versions : $ReadOnlyArray<{|[string] : Object|}>|}) => {
    return {
        name,
        'dist-tags': {
            ...(distTags ? distTags : {}),
            latest
        },
        'versions': versions.reduce((acc, current) => {
            const { version, ...rest } = current;

            acc[version] = rest;

            return acc;
        }, {})
    };
};

describe('cdnify', () => {
    afterEach(async () => {
        clearInfoCache();

        // $FlowFixMe
        fetchMock.resetHistory();

        const cdnPath = join(process.cwd(), 'cdn');
        await fs.rm(cdnPath, { recursive: true, force: true });
    });

    describe('commitonly recursive', () => {
        test('should create correct cdn folder structure', async () => {
            const preHumanPackage = createInfoPackage({
                name:     'pre-human',
                latest:   '42.0.0',
                versions: [ createVersion({
                    name:    'pre-human',
                    version: '42.0.0'

                }) ]
            });
            const testOrgTestPackage = createInfoPackage({
                'name':      '@test-org/test-package',
                'latest':   '5.0.2',
                'versions': [ createVersion({
                    'name':         '@test-org/test-package',
                    'version':      '5.0.2',
                    'dependencies': {
                        'pre-human':                       '42.0.0'
                    }
                }) ]
            });
            const releasePackage = createInfoPackage({
                'name':      '@org/release-package',
                'versions': [ createVersion({
                    'name':         '@org/release-package',
                    'dependencies': {
                        '@test-org/test-package': '5.0.2',
                        'pre-human':              '42.0.0',
                        'pants':                       '1.0.0'
                    }
                }) ]
            });

            mockNpmRequest(releasePackage.name, releasePackage);
            mockNpmRequest(testOrgTestPackage.name, testOrgTestPackage);
            mockNpmRequest(preHumanPackage.name, preHumanPackage);
            mockNpmRequest('pants', releasePackage);

            await mockArgv([ '--module', releasePackage.name, '--cdn', 'https://www.fakecdn.com', '--commitonly', '--namespace', 'fake-namespace', '--recursive' ], async () => {
                await run();
            });

            expect((await fs.readdir(join(process.cwd(), 'cdn'))).length).toEqual(4);

            expect(await exists(join(process.cwd(), 'cdn', 'org', 'release-package', 'info.json'))).toEqual(true);
            expect(await exists(join(process.cwd(), 'cdn', 'org', 'release-package', 'tarballs', '1.0.0.tgz'))).toEqual(true);
            expect((await fs.readdir(join(process.cwd(), 'cdn', 'org', 'release-package', 'tarballs'))).length).toEqual(1);

            expect(await exists(join(process.cwd(), 'cdn', 'test-org', 'test-package', 'info.json'))).toEqual(true);
            expect(await exists(join(process.cwd(), 'cdn', 'test-org', 'test-package', 'tarballs', '5.0.2.tgz'))).toEqual(true);
            expect((await fs.readdir(join(process.cwd(), 'cdn', 'test-org', 'test-package', 'tarballs'))).length).toEqual(1);

            expect(await exists(join(process.cwd(), 'cdn', 'pre-human', 'info.json'))).toEqual(true);
            expect(await exists(join(process.cwd(), 'cdn', 'pre-human', 'tarballs', '42.0.0.tgz'))).toEqual(true);
            expect((await fs.readdir(join(process.cwd(), 'cdn', 'pre-human', 'tarballs'))).length).toEqual(1);

            expect(await exists(join(process.cwd(), 'cdn', 'pants', 'info.json'))).toEqual(true);
            expect(await exists(join(process.cwd(), 'cdn', 'pants', 'tarballs', '1.0.0.tgz'))).toEqual(true);
            expect((await fs.readdir(join(process.cwd(), 'cdn', 'pants', 'tarballs'))).length).toEqual(1);
        });

        test('should prune any version not in dist-tags', async () => {
            const releasePackage = createInfoPackage({
                'name':      '@org/release-package',
                'latest':   '1.0.0',
                'distTags':  {
                    'active-production': '2.0.0',
                    'test-version':      '3.0.0'
                },
                'versions': [ createVersion({
                    'version': '1.0.0',
                    'name':         '@org/release-package'
                }),
                createVersion({
                    'version': '2.0.0',
                    'name':         '@org/release-package'
                }),
                createVersion({
                    'version': '3.0.0',
                    'name':         '@org/release-package'
                }),
                createVersion({
                    'version': '4.0.0',
                    'name':         '@org/release-package'
                })
                ]
            });

            mockNpmRequest(releasePackage.name, releasePackage);

            await mockArgv([ '--module', releasePackage.name, '--cdn', 'https://www.fakecdn.com', '--commitonly', '--namespace', 'fake-namespace', '--recursive' ], async () => {
                await run();
            });

            expect((await fs.readdir(join(process.cwd(), 'cdn'))).length).toEqual(1);

            expect(await exists(join(process.cwd(), 'cdn', 'org', 'release-package', 'info.json'))).toEqual(true);
            expect((await fs.readdir(join(process.cwd(), 'cdn', 'org', 'release-package', 'tarballs'))).length).toEqual(3);
            expect(await exists(join(process.cwd(), 'cdn', 'org', 'release-package', 'tarballs', '1.0.0.tgz'))).toEqual(true);
            expect(await exists(join(process.cwd(), 'cdn', 'org', 'release-package', 'tarballs', '2.0.0.tgz'))).toEqual(true);
            expect(await exists(join(process.cwd(), 'cdn', 'org', 'release-package', 'tarballs', '3.0.0.tgz'))).toEqual(true);
            expect(await exists(join(process.cwd(), 'cdn', 'org', 'release-package', 'tarballs', '4.0.0.tgz'))).toEqual(false);
        });
    });
});


