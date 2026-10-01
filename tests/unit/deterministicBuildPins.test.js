import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fork requirement: every build input is pinned to a named release and, where the
// upstream project publishes checksums, integrity-verified. Upstream v1.17 moved
// the yt-dlp install into plugins/youtube/post-install.sh and bumped the Camoufox
// pin, which spread the same constants across five files. Nothing in the build
// cross-checks them, and a stale copy fails silently rather than loudly:
//
//   * Makefile / build.ps1 pass CAMOUFOX_VERSION and CAMOUFOX_RELEASE as
//     --build-arg, so they *override* the Dockerfile defaults. A stale value
//     there bakes a browser build that camoufox-js was never pinned to, and the
//     image still builds and starts.
//   * ci.yml's ytdlp-download job asserts the pinned yt-dlp release really is
//     fetchable and reports that version. If its pin drifts from the Dockerfiles,
//     the job keeps passing while proving nothing about the shipped image.
//
// These assertions are the cross-check.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const dockerfile = read('Dockerfile');
const dockerfileCi = read('Dockerfile.ci');
const postInstall = read('plugins/youtube/post-install.sh');
const makefile = read('Makefile');
const buildPs1 = read('build.ps1');
const ci = read('.github/workflows/ci.yml');

function dockerArg(source, name) {
  const match = source.match(new RegExp(`^ARG ${name}=(\\S+)\\s*$`, 'm'));
  expect(match).not.toBeNull();
  return match[1];
}

function shellDefault(source, name) {
  const match = source.match(new RegExp(`^: "\\$\\{${name}:=(\\S+?)\\}"\\s*$`, 'm'));
  expect(match).not.toBeNull();
  return match[1];
}

function yamlEnv(source, name) {
  const match = source.match(new RegExp(`^\\s+${name}: '(\\S+)'\\s*$`, 'm'));
  expect(match).not.toBeNull();
  return match[1];
}

describe('deterministic build inputs are pinned consistently', () => {
  test('the yt-dlp release is the same pin in every file that names one', () => {
    const version = shellDefault(postInstall, 'YT_DLP_VERSION');

    expect(version).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    expect(dockerArg(dockerfile, 'YT_DLP_VERSION')).toBe(version);
    expect(dockerArg(dockerfileCi, 'YT_DLP_VERSION')).toBe(version);
    expect(yamlEnv(ci, 'YT_DLP_VERSION')).toBe(version);
  });

  test('every pinned yt-dlp checksum is a full sha256 digest', () => {
    for (const digest of [
      shellDefault(postInstall, 'YT_DLP_SHA256'),
      dockerArg(dockerfile, 'YT_DLP_SHA256'),
      dockerArg(dockerfileCi, 'YT_DLP_SHA256_AMD64'),
      dockerArg(dockerfileCi, 'YT_DLP_SHA256_ARM64'),
      yamlEnv(ci, 'YT_DLP_SHA256'),
    ]) {
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test('the default Dockerfile pin matches the hook default it relies on', () => {
    // The default Dockerfile passes no YT_DLP_ASSET, so the hook installs its
    // default asset -- the checksums must therefore be the same line.
    expect(dockerArg(dockerfile, 'YT_DLP_SHA256')).toBe(shellDefault(postInstall, 'YT_DLP_SHA256'));
  });

  test('the ytdlp-download CI job pins the same amd64 asset the publisher installs', () => {
    expect(yamlEnv(ci, 'YT_DLP_ASSET')).toBe('yt-dlp_linux');
    expect(dockerfileCi).toContain('export YT_DLP_ASSET=yt-dlp_linux YT_DLP_SHA256="${YT_DLP_SHA256_AMD64}"');
    expect(yamlEnv(ci, 'YT_DLP_SHA256')).toBe(dockerArg(dockerfileCi, 'YT_DLP_SHA256_AMD64'));
  });

  test('the local build wrappers pass the same Camoufox pin the Dockerfiles default to', () => {
    const version = dockerArg(dockerfile, 'CAMOUFOX_VERSION');
    const release = dockerArg(dockerfile, 'CAMOUFOX_RELEASE');

    expect(dockerArg(dockerfileCi, 'CAMOUFOX_VERSION')).toBe(version);
    expect(dockerArg(dockerfileCi, 'CAMOUFOX_RELEASE')).toBe(release);

    // Makefile: `VERSION ?= …` / `RELEASE ?= …`, forwarded as --build-arg.
    expect(makefile).toMatch(new RegExp(`^VERSION\\s+\\?= ${version}$`, 'm'));
    expect(makefile).toMatch(new RegExp(`^RELEASE\\s+\\?= ${release}$`, 'm'));
    expect(makefile).toContain('--build-arg CAMOUFOX_VERSION=$(VERSION)');
    expect(makefile).toContain('--build-arg CAMOUFOX_RELEASE=$(RELEASE)');

    // build.ps1: the same two values as parameter defaults.
    expect(buildPs1).toContain(`[string]$CamoufoxVersion = '${version}',`);
    expect(buildPs1).toContain(`[string]$CamoufoxRelease = '${release}',`);
  });

  test('nothing bind-mounts a pre-fetched binary into the build any more', () => {
    // The yt-dlp hook is the single install point. A reintroduced bind mount
    // would make `docker build .` fail without a prior `make fetch`.
    expect(dockerfile).not.toContain('--mount=type=bind');
    expect(dockerfile).not.toContain('YTDLP_DIST_ARCH');
    expect(makefile).not.toContain('YTDLP');
    expect(buildPs1).not.toContain('YtDlp');
  });
});
