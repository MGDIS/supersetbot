import { jest } from '@jest/globals';
import * as dockerUtils from './docker.js';

const SHA = '22e7c602b9aa321ec7e0df4bb0033048664dcdf0';
const PR_ID = '666';
const OLD_REL = '2.1.0';
const NEW_REL = '2.1.1';
const REPO = 'apache/superset';

jest.mock('./github.js', () => jest.fn().mockImplementation(() => NEW_REL));

beforeEach(() => {
  process.env.TEST_ENV = 'true';
  process.env.DOCKERHUB_TOKEN = 'dummy';
  process.env.GITHUB_RUN_ID = '123';
});

afterEach(() => {
  delete process.env.TEST_ENV;
});

describe('getDockerTags', () => {
  test.each([
    // PRs
    [
      'superset',
      ['linux/arm64'],
      SHA,
      'pull_request',
      PR_ID,
      false,
      [`${REPO}:pr-${PR_ID}-superset-arm`],
    ],
    [
      'ci',
      ['linux/amd64'],
      SHA,
      'pull_request',
      PR_ID,
      false,
      [`${REPO}:pr-${PR_ID}-ci`],
    ],
    [
      'superset',
      ['linux/amd64'],
      SHA,
      'pull_request',
      PR_ID,
      false,
      [`${REPO}:pr-${PR_ID}-superset`],
    ],
    [
      'dev',
      ['linux/arm64'],
      SHA,
      'pull_request',
      PR_ID,
      false,
      [
        `${REPO}:pr-${PR_ID}-dev-arm`,
      ],
    ],
    [
      'dev',
      ['linux/amd64'],
      SHA,
      'pull_request',
      PR_ID,
      false,
      [`${REPO}:pr-${PR_ID}-dev`],
    ],
    // old releases
    [
      'superset',
      ['linux/arm64'],
      SHA,
      'release',
      OLD_REL,
      false,
      [`${REPO}:${OLD_REL}-superset-arm`],
    ],
    [
      'superset',
      ['linux/amd64'],
      SHA,
      'release',
      OLD_REL,
      false,
      [`${REPO}:${OLD_REL}-superset`],
    ],
    [
      'dev',
      ['linux/arm64'],
      SHA,
      'release',
      OLD_REL,
      false,
      [
        `${REPO}:${OLD_REL}-dev-arm`,
      ],
    ],
    [
      'dev',
      ['linux/amd64'],
      SHA,
      'release',
      OLD_REL,
      false,
      [`${REPO}:${OLD_REL}-dev`],
    ],
    // new releases
    [
      'superset',
      ['linux/arm64'],
      SHA,
      'release',
      NEW_REL,
      false,
      [
        `${REPO}:${NEW_REL}-superset-arm`,
        `${REPO}:latest-superset-arm`,
      ],
    ],
    [
      'superset',
      ['linux/amd64'],
      SHA,
      'release',
      NEW_REL,
      false,
      [`${REPO}:${NEW_REL}-superset`, `${REPO}:latest-superset`],
    ],
    [
      'dev',
      ['linux/arm64'],
      SHA,
      'release',
      NEW_REL,
      false,
      [
        `${REPO}:${NEW_REL}-dev-arm`,
        `${REPO}:latest-dev-arm`,
      ],
    ],
    [
      'dev',
      ['linux/amd64'],
      SHA,
      'release',
      NEW_REL,
      false,
      [
        `${REPO}:${NEW_REL}-dev`,
        `${REPO}:latest-dev`,
      ],
    ],
    // merge on master
    [
      'superset',
      ['linux/arm64'],
      SHA,
      'push',
      'master',
      false,
      [`${REPO}:master-superset-arm`],
    ],
    [
      'superset',
      ['linux/amd64'],
      SHA,
      'push',
      'master',
      false,
      [`${REPO}:master-superset`],
    ],
    [
      'dev',
      ['linux/arm64'],
      SHA,
      'push',
      'master',
      false,
      [
        `${REPO}:master-dev-arm`,
      ],
    ],
    [
      'dev',
      ['linux/amd64'],
      SHA,
      'push',
      'master',
      false,
      [`${REPO}:master-dev`],
    ],

    [
      'superset',
      ['linux/amd64'],
      SHA,
      'release',
      '4.0.0',
      true,
      [`${REPO}:latest-superset`, `${REPO}:4.0.0-superset`],
    ],

    // MGDIS: lean has no suffix, every other preset gets one
    [
      'lean',
      ['linux/amd64'],
      SHA,
      'push',
      'master',
      false,
      [`${REPO}:master`],
    ],
    [
      'lean',
      ['linux/arm64'],
      SHA,
      'push',
      'master',
      false,
      [`${REPO}:master-arm`],
    ],
    [
      'lean',
      ['linux/amd64'],
      SHA,
      'release',
      NEW_REL,
      false,
      [`${REPO}:${NEW_REL}`, `${REPO}:latest`],
    ],

    // real release/master builds are multi-platform, published as a single
    // multi-arch manifest under the plain tag (no per-arch suffix at all)
    [
      'superset',
      ['linux/arm64', 'linux/amd64'],
      SHA,
      'push',
      'master',
      false,
      [`${REPO}:master-superset`],
    ],

  ])('returns expected tags', (preset, platforms, sha, buildContext, buildContextRef, forceLatest, expectedTags) => {
    const tags = dockerUtils.getDockerTags({
      preset, platforms, sha, buildContext, buildContextRef, latestRelease: NEW_REL, forceLatest,
    });
    expect(tags).toEqual(expect.arrayContaining(expectedTags));
  });
});

describe('getDockerCommand', () => {
  test.each([
    [
      'superset',
      ['linux/amd64'],
      SHA,
      'push',
      'master',
      '',
      ['--target superset', `-t ${REPO}:master-superset `],
    ],
    [
      'lean',
      ['linux/amd64'],
      SHA,
      'push',
      'master',
      '',
      ['--target lean', `-t ${REPO}:master `],
    ],
    [
      'dev',
      ['linux/amd64'],
      SHA,
      'push',
      'master',
      '',
      [`-t ${REPO}:master-dev `],
    ],
    [
      'dev',
      ['linux/amd64'],
      SHA,
      'push',
      'master',
      '--cpus 1',
      ['--cpus 1'],
    ],
    // multi-platform
    [
      'lean',
      ['linux/arm64', 'linux/amd64'],
      SHA,
      'push',
      'master',
      '',
      ['--platform linux/arm64,linux/amd64'],
    ],
  ])('returns expected docker command', async (preset, platform, sha, buildContext, buildContextRef, extraFlags, contains) => {
    const cmd = await dockerUtils.getDockerCommand({
      preset, platform, sha, buildContext, buildContextRef, extraFlags, latestRelease: NEW_REL,
    });
    contains.forEach((expectedSubstring) => {
      expect(cmd).toContain(expectedSubstring);
    });
  });
});
