# Upstream v1.17.0 reconciliation

Audit record for merging `jo-inc/camofox-browser` **v1.17.0** into this fork.
Produced as a true merge commit (`git merge --no-ff`), never a rebase, with every
conflict resolved by intent rather than by `ours`/`theirs`. The follow-up test and
doc commits on top of it are separate so the merge stays reviewable on its own.

## Sources

| Role | SHA / ref | Description |
| --- | --- | --- |
| First parent (`ours`) | `2760d2d350f715dda4d1331c4b675174d837badc` | fork `master` — "Merge pull request #8 from jimconstable/chore/reconcile-upstream-v1.14.0" |
| Second parent (`theirs`) | `389c996ae3c7d42e539295a336ee6f975847f066` | `upstream/master` = tag **`v1.17.0`** (annotated tag object `78b040f88958024a0057c402005af13812857dcd`) — "Merge pull request #10795 from jo-inc/release/1.17" |
| Merge base | `e5a36f5cd0332fde6597de474329a308a53a0716` | upstream tag `v1.14.0` |
| Intermediate upstream tags crossed | `v1.15.0` → `771b610a`, `v1.16.0` → `79d425be` | |
| Branch | `chore/reconcile-upstream-v1.17.0` | |
| **Merge commit** | `cdb59f1c8c072920f31cac174667be8afe36442e` | "chore: reconcile upstream v1.17.0" — parents `2760d2d` + `389c996` |

Upstream contributed **70 commits (68 non-merge) across 94 files** since the merge base.

## What upstream v1.15–v1.17 brings (adopted)

Adopted as-is, no fork objection:

- **Inline PDF / `fetch-current-resource` (v1.17).** `lib/downloads.js`
  `attachNavigationResponseTracker()` records each tab's latest main-frame response
  and `readInlinePdfResponse()` serves the bytes the browser already holds;
  `POST /tabs/:tabId/fetch-current-resource` prefers them and only falls back to a
  Node-side refetch (which bot-challenged hosts such as PMC answer with 403 HTML).
  Size guard (413) on both paths. Covered by `tests/unit/inline-pdf-response.test.js`
  and the `/inline-document.pdf` fixture in `tests/helpers/testSite.js`.
- Tab-creation recovery deadline (`tabCreateRequestTimeoutMs`), browser-restart retry in
  the test client, Windows process-tree cleanup (`lib/windows-processes.js`), live Firefox
  profile preservation during tmp cleanup, `SESSION_TIMEOUT_MS=0` / `BROWSER_IDLE_TIMEOUT_MS=0`
  meaning "never", proxy/GeoIP fallbacks, navigation-timeout classification,
  Google/Amazon search fallbacks, native `<select>`, combobox/menu roles, visible-selector
  preference, keyboard-chord normalisation, typed text no longer broadcast to plugins,
  scoped virtual display providers for plugins, reporter dispatcher leak fix.
- **Pinned + verified yt-dlp** (v1.15 `799ba53`): `plugins/youtube/post-install.sh` installs
  a named release and `sha256sum -c`s it before `chmod`; unit-tested by
  `plugins/youtube/post-install.test.js`. `Dockerfile.ci` selects the per-arch standalone
  asset from `TARGETARCH`.
- **Camoufox 152.0.4 / beta.28** in both Dockerfiles (`396c968`).
- **Postinstall split**: root `postinstall.js` (lifecycle hook, uses
  `lib/camoufox-download.js`, no shell/`npx`); `scripts/postinstall.js` is now a re-export.
- **OpenClaw plugin API 2026.9.4**: `plugin.js`/`plugin.ts` on the current SDK,
  `openclaw.extensions → plugin.js`, narrowed npm `files`, optional `openclaw` peer.
- Dependency overrides `qs`, `fast-uri`, `hono`; `AGENTS.md` plugin-manager commands.

## Conflicts and resolutions

`git merge-tree` predicted 8 conflicted paths; all 8 conflicted for real. Everything else
auto-merged and was then re-inspected (notably `server.js`, `lib/downloads.js`,
`launchCompat.test.js`, all workflows).

| # | File | Resolution |
| --- | --- | --- |
| 1 | `.github/workflows/docker.yml` (modify/delete) | **Kept deleted.** It publishes a mutable `:latest` to `ghcr.io/jo-inc`; the fork publishes only through `publish-image.yml` (immutable tags). |
| 2 | `plugins/youtube/post-install.sh` | **Took upstream.** Both sides now pin + checksum-verify yt-dlp; upstream's is parameterised (`YT_DLP_VERSION/ASSET/SHA256/INSTALL_PATH`), unit-tested, and is the single install point both Dockerfiles call. The fork's version (older 2026.07.04 pin, `YTDLP_*` names) is superseded. |
| 3 | `Dockerfile` | Removed the fork's `dist/` bind-mount install step and its `YTDLP_VERSION/YTDLP_SHA256/YTDLP_DIST_ARCH` args; adopted upstream's hook-driven install with `YT_DLP_VERSION`/`YT_DLP_SHA256`. **Kept** the fork's digest-pinned trixie `FROM`, `npm ci --omit=dev --ignore-scripts`, `COPY mcp/`, the `import('./lib/cookies.js')` guard, OCI labels, `CAMOFOX_PORT=9377`. Verified (in a throwaway `node:22-trixie-slim` container) that `python3-minimal` provides `ssl` and the pinned `yt-dlp` zipapp runs and reports `2026.08.19`, so upstream's default asset is sound on this base. |
| 4 | `Dockerfile.ci` (publisher) | Took upstream's arch `case` (Camoufox only) and dropped the fork's inline yt-dlp curl; yt-dlp now comes from the hook with upstream's `YT_DLP_SHA256_AMD64/ARM64`. All fork guards kept as in `Dockerfile`. |
| 5 | `.github/workflows/ci.yml` | Kept the fork's PR-only / no-secrets structure (`verify`, `browser-tests`, `ytdlp-download`, `docker-build`) and its superset test pattern (`tests/unit|plugins|scripts`). Removed a **duplicate top-level `permissions:`** block the textual merge introduced. Did **not** add upstream's `windows-process-cleanup` / `windows-e2e` jobs (see risks). Added upstream's `notify-agenthook` job with the fork's job names, gated `github.repository_owner == 'jo-inc'`. `ytdlp-download` now runs the real hook with the publisher's amd64 pin. Syntax check covers root `postinstall.js`. |
| 6 | `package.json` | Kept fork `jest-junit` (CI reporter) **and** dropped upstream's new `openclaw@2026.9.4` devDependency — its preinstall hard-fails on Node < 24.16 (`npm ci` aborted here on Node 22.23.0), and the fork pins Node 22 to match its image. Replaced by a local type declaration (see F2). Auto-merged and kept: version `1.17.0`, upstream `files`/`openclaw`/scripts/overrides/peer deps, fork's exact `playwright-core: "1.58.1"` and `jest-junit → uuid ^11.1.1` override. |
| 7 | `package-lock.json` | Reset to upstream's lock and regenerated with `npm install --package-lock-only --ignore-scripts`. Package-set diff vs upstream: **only** `playwright-core 1.62.1 → 1.58.1`, added `jest-junit`, `mkdirp`, `uuid@11.1.1`, `xml`, and a lock-only nested `openclaw/node_modules/playwright-core` (optional peer, never installed). No other version changed. |
| 8 | `tests/helpers/testSite.js` | Additive both sides: kept the fork's `/download-redirect` + `/download-cross-origin-redirect` fixtures and upstream's `/inline-document.pdf`. |

### Semantic follow-ups in auto-merged / non-conflicted files

- **Camoufox pin drift (merge-induced break).** `Makefile` (`VERSION ?= 135.0.1`,
  `RELEASE ?= beta.24`) and `build.ps1` pass these as `--build-arg`, overriding the
  Dockerfile's new `152.0.4/beta.28`: `make build` would have silently baked the old
  browser. Bumped both; the new pin test (F1) reproduces the failure against the old value.
- `Makefile` / `build.ps1`: removed yt-dlp prefetch + `YTDLP_DIST_ARCH`; `build` no longer
  depends on `fetch` (nothing reads `dist/` any more). `docker build .` now works standalone,
  retiring the README "do not run docker build directly" warning.
- Other upstream workflows gained `notify-agenthook` calls requiring `AGENTHOOK_*` secrets
  the fork does not hold; `mirror-camoufox.yml` runs on a schedule and would fail nightly.
  All four callers gated on `github.repository_owner == 'jo-inc'` (upstream behaviour
  unchanged; inert in the fork).
- `README.md`: deterministic-input table and refresh procedure corrected (it still named
  `node:22-slim@sha256:6c74791e…`, Camoufox 135.0.1 and yt-dlp 2026.07.04).
- `server.js`: auto-merge verified; fork delta vs pristine v1.17.0 is exactly the three
  retained behaviours below (+139/−3 incl. comments and the `@openapi` block).
  `openapi.json` regenerated: **39 paths, v1.17.0, zero diff** vs merged file.

## Classification of remaining fork-only behaviour

| # | Behaviour | Where | Verdict |
| --- | --- | --- | --- |
| 1 | `await` virtual display, VNC socket watcher (v1.14 cat. 1–2) | — | **Superseded** (already zero delta). |
| 2 | Probe `setDefaultViewport` workaround (cat. 3) | — | **Obsolete/removed** in v1.14; still absent. |
| 3 | `POST /tabs/:tabId/download` authenticated **same-origin** resource stream via the tab's request context, per-hop redirect origin check, 10-hop cap, missing-`Location` → 502; no cookie export | `server.js`, `openapi.json`, `downloadsImages` e2e, `testSite` fixtures | **Still required.** Upstream v1.17's `fetch-current-resource` covers only the *current document* and only PDFs; it does not supersede an arbitrary same-origin resource fetch. Note: this endpoint still does a Node-side refetch, the exact path upstream found is refused by some bot-challenged hosts; reusing `readInlinePdfResponse()` when `url` equals the tab's current document is a candidate follow-up, deliberately **not** done in a reconciliation. |
| 4 | Bootstrap page lease across `session:created` (D1) | `server.js`, `sessionLifecycleRaces.test.js` | **Still required** — upstream still publishes the session before awaiting listeners. Protects persistent profile loading from reapers. |
| 5 | Health probe pins `probeBrowser`, aborts if browser closed/replaced mid-probe (D2) | `server.js`, `launchCompat` locator, `sessionLifecycleRaces` | **Still required** — prevents restarting an idle-shut browser and dropping a live VNC (:6080) session. |
| 6 | Exact `playwright-core 1.58.1` | `package.json`, lock | **Still required.** Upstream's `^1.58.0` now resolves to **1.62.1**; drift is growing. Full browser suites pass on 1.58.1 with v1.17 code. |
| 7 | Digest-pinned `node:22-trixie-slim`, `npm ci --ignore-scripts` (C3), `COPY mcp/` + cookies import guard (C1/C2) | both Dockerfiles, packaging tests | **Deployment-only, still required.** |
| 8 | Immutable GHCR publishing (`publish-image.yml`, `sha-*`/`v*` tags, no `latest`, OCI labels); `docker.yml` deleted | workflows, Dockerfiles | **Deployment-only, still required.** |
| 9 | PR-only / no-secrets CI with Camoufox provisioning, declared `jest-junit` + `uuid` override (cat. 7, D3) | `ci.yml`, `package.json` | **Deployment-only, still required.** |
| 10 | Deterministic yt-dlp (cat. 6) | — | **Superseded by upstream v1.15** (hook + checksums). Fork's `dist/` bind-mount, `YTDLP_*` args and `YTDLP_DIST_ARCH` hazard removed. Residual fork piece is only the `ytdlp-download` CI job (deployment-only). |
| F1 | Cross-file pin consistency test | `tests/unit/deterministicBuildPins.test.js` | **New, deployment-only, still required** (guards yt-dlp and Camoufox pins across Dockerfiles, hook, Makefile, build.ps1, ci.yml). |
| F2 | Local `openclaw/plugin-sdk/core` type declaration instead of the `openclaw` devDependency | `types/openclaw-plugin-sdk.d.ts`, `tsconfig.json`, `tests/unit/pluginTypecheck.test.js` | **New, build-only, still required while the fork is on Node 22.** Retire by restoring upstream's devDependency when moving to Node ≥ 24.16. |
| F3 | `notify-agenthook` owner gate | 5 workflows | **New, deployment-only.** Upstream integration kept, inert in the fork. |
| — | Sync/merge commits from prior reconciliations | history | **Obsolete** as commits. |

## TDD record (net-new fork behaviour)

The merge introduces no new fork *runtime* behaviour. The two new fork guards were
written test-first:

- **F2** `pluginTypecheck.test.js` — written first; **red**: `plugin.ts(9,67): error TS2307:
  Cannot find module 'openclaw/plugin-sdk/core'` after the devDependency was dropped. Shim
  added (declaring only the members `plugin.ts` touches: `logger`, `registerTool`,
  `registerCommand`, `registerGatewayMethod`, `registerCli`, ctx `agentId`/`sessionKey`);
  intermediate red on TS2349/TS2554 until those members were modelled; **green**: `tsc -p .
  --noEmit` clean (previously `npm run build`'s `|| true` would have hidden the failure).
- **F1** `deterministicBuildPins.test.js` — with `Makefile` reverted to `VERSION ?= 135.0.1`:
  **red** (1 failed / 5 passed, `Expected pattern: /^VERSION\s+\?= 152.0.4$/m`); restored:
  **green** 6/6.

## Verification results

All run locally in this isolated clone on Node v22.23.0 / npm 10.9.8. No production
container, no secrets, no private profile inspection, nothing pushed or published.

| Layer | Command | Result |
| --- | --- | --- |
| Install | `npm ci` with upstream's `openclaw` devDependency | **Failed**: `openclaw@2026.9.4` preinstall "requires Node >=24.16.0" (resolved by conflict 6 / F2) |
| Install | `npm ci` (resolved tree) | OK — 403 packages; `openclaw` optional peer not installed |
| Syntax | `node --check` on `server.js`, `plugin.js`, `postinstall.js`, `scripts/*.js`, `mcp/server.mjs`, `lib/*.js`; `sh -n` on both plugin shell hooks | OK |
| Types | `npm run build` / `tsc -p . --noEmit` | OK — no TS errors (was TS2307 before F2) |
| OpenAPI | `npm run generate-openapi` | 39 paths, v1.17.0, **zero diff** |
| Unit | `npm run test:unit` (full `tests/unit`, incl. browser-backed) | **80/80 suites; 896 passed, 2 skipped** (both Windows-only `testOnWindows`), 94 s |
| Plugins | `npm run test:plugins` | **7/7 suites, 45/45 tests** (adds upstream `post-install.test.js`) |
| Scripts | `jest --testPathPatterns=scripts` | **2/2 suites, 9/9 tests** |
| MCP | `npm run test:mcp` | OK — all 11 tool contracts; packed `@askjo/camofox-browser-mcp` smoke passed |
| E2E | `npm run test:e2e` | **15/15 suites, 83/83 tests**, 141 s — incl. fork `/download` body, same-origin redirect, cross-origin redirect → 400, and upstream `fetch-current-resource saves an inline PDF as a download` |
| Targeted regression | `inline-pdf-response`, `sessionLifecycleRaces`, `launchCompat`, `dockerPackaging`, `publishedImageDockerfile`, `deterministicBuildPins`, `pluginTypecheck`, `openapi`, `noSecrets`, `auth`, `accessKey`, `openclawManifest`, `openclawPlugin`, `timeoutContinuation`, `syncVersion`, `config`, `plugins/{youtube/post-install,persistence,vnc}` | **22/22 suites, 190/190 tests** |
| Checksums | upstream `yt-dlp` 2026.08.19 `SHA2-256SUMS` | `yt-dlp` `1fa6733c…`, `yt-dlp_linux` `58162f9b…`, `yt-dlp_linux_aarch64` `b16e4dab…` — all three match the pins |
| Base image | throwaway `node:22-trixie-slim` + `python3-minimal` | `import ssl` OK; pinned zipapp verifies and reports `2026.08.19` |
| Audit | `npm audit` (informational) | 5 (3 moderate, 2 high: `adm-zip`, `brace-expansion`, `fast-uri`, `ip-address`) — **identical to pristine upstream v1.17.0's lock**; the fork adds none |

## Publisher behaviour / post-merge evidence

The publisher builds `Dockerfile.ci` (resolved from `publish-image.yml` by
`publishedImageDockerfile.test.js`). Built exactly that file, clean, locally:

`docker buildx build --no-cache -f Dockerfile.ci --platform linux/amd64 --build-arg IMAGE_SOURCE=… --build-arg IMAGE_REVISION=… --build-arg IMAGE_VERSION=1.17.0 --load`
→ **exit 0**, image 1.17 GB. Nothing was pushed or tagged for a registry; the image was deleted afterwards.

- Camoufox `v152.0.4-beta.28` `lin.x86_64` downloaded and unpacked ("Camoufox installed successfully").
- `npm ci --omit=dev --ignore-scripts` succeeded with no toolchain.
- yt-dlp installed by the plugin hook: `/usr/local/bin/yt-dlp: OK` (sha256 verified before `chmod`).
- `RUN node -e "import('./lib/cookies.js')"` guard passed.
- Labels: `org.opencontainers.image.{source,revision,version}` populated from build args;
  env `NODE_ENV=production`, `CAMOFOX_PORT=9377`; exposes `9377/tcp`. Node 22.23.2.

**In-container smoke** (`--network none`): `yt-dlp --version` → `2026.08.19`;
`version.json` → `152.0.4 / beta.28`; `lib/cookies.js` imports; `lib/downloads.js` exports
`attachNavigationResponseTracker`, `readInlinePdfResponse`, `sanitizeFilename`; `youtube`,
`persistence`, `vnc` plugins import with `register()`; `playwright-core 1.58.1`;
`openclaw` absent; no `dist/`; `x11vnc` + `websockify` present (VNC/:6080 path available).

**Loopback empty-profile canary** — fresh named volume at `/root/.camofox`, telemetry
disabled, API driven from inside the container over `127.0.0.1:9377`, navigating only to
the server's own loopback URLs:

| Check | A: `--network none`, `CAMOFOX_DISABLE_DEFAULT_ADDONS=1` | B: default config, `-p 127.0.0.1:29377:9377` |
| --- | --- | --- |
| `/health` | ok | ok |
| Profile files before | 0 | 0 |
| `POST /tabs` → snapshot → `DELETE` tab | 200 / 200 / 200 | 200 / 200 / 200 |
| `POST /tabs/:id/download` same-origin | 200, 38 177 B, `Content-Disposition: attachment; filename="openapi.json"`, **no `Set-Cookie`** | same |
| `POST /tabs/:id/download` cross-origin | 400 "must have the same origin" | 400 |
| `POST /tabs/:id/fetch-current-resource` (non-PDF) | 415 | 415 |
| Cookie export route (`GET /sessions/:u/cookies`) | 404 (none exists) | 404 |
| `DELETE /sessions/:u` → persisted files | `profiles/<hash>/storage-state.json`, `meta.json` (names only; contents not read; userId hashed) | same |
| Error-level log lines | 0 | 0 |
| From host via published port (non-loopback peer) | — | `/health` 200; cookie import without `CAMOFOX_API_KEY` **403** |

**Finding (not introduced by the fork, surfaced by canary A without the addon flag):**
the image does not bake camoufox-js's default uBlock Origin addon; it is fetched on first
browser launch. Since upstream v1.15 wraps `launchOptions()` in a 10 s bound labelled
"GeoIP setup", a blocked or slow egress makes the first `POST /tabs` return 500 ("GeoIP setup
timed out after 10000ms" even with `geoip: false`), and the aborted download leaves an empty
addon directory so every later launch fails with "manifest.json is missing" until the
container is recreated. With egress (canary B) this does not occur. Egress-restricted
deployments should set `CAMOFOX_DISABLE_DEFAULT_ADDONS=1` or the image should pre-bake
the addon — a deliberate follow-up, not changed here.

**Operational note.** The first attempt at canary B used host port 19377, which was already
held by a pre-existing container (`camofox-reconcile-smoke`, image
`camofox-reconcile:v1.14.0-test`, up three weeks), so that `docker run` failed. Three
host-side `curl`s from that attempt reached the pre-existing server instead: a read-only
`/health`, a `POST /tabs` rejected with 400 (missing `sessionKey`), and an empty cookie
import rejected with 403. None changed state. Neither that container nor the long-running
`camofox-browser` container was modified, stopped or inspected beyond `docker ps`. Canary B
was re-run on free port 29377, and all canary containers, volumes and the verification
image were removed afterwards.

**Not exercised:** `publish-image.yml` itself (needs GHCR credentials and a push), the
linux/arm64 build, and GitHub-hosted CI (nothing was pushed).

## Remaining fork diff vs upstream v1.17.0

`git diff 389c996 HEAD` touches **30 files**: 25 from the merge commit `cdb59f1`, 2 guard tests, this doc, and the
2 MCP dependency files from the audit follow-up below. Product code: `server.js` only (three
behaviours, rows 3–5). Everything else is tests for those behaviours, deployment
(Dockerfiles, Makefile, build.ps1, workflows, README), the lock/`package.json` pins,
the type shim, and docs. `plugin.ts`, `plugin.js`, `lib/`, `plugins/`,
`scripts/`, `AGENTS.md` and `openclaw.plugin.json` are byte-identical to upstream v1.17.0;
`mcp/` differs only in `package.json` `overrides.fast-uri` and `package-lock.json` (see below).

## Follow-up: gated MCP audit (PR CI)

The PR's CI `verify` job failed at **Audit standalone MCP package**
(`npm ci --prefix mcp --ignore-scripts && npm audit --prefix mcp --omit=dev`). Unlike the
root `npm audit` above, this step **is** gated. Pristine upstream v1.17.0 fails it too. Two
moderate advisories were published after upstream's lock was cut:

| Package | Path | Locked | Advisories | Fix |
|---|---|---|---|---|
| `fast-uri` | `@modelcontextprotocol/sdk → ajv@8.20.0` | 3.1.7 (upstream `overrides` exact pin) | GHSA-hrr3-gc8f-f4qj | Override pin bumped to **3.1.8** (same 3.x line; ajv needs `^3.0.1`) |
| `ip-address` | `@modelcontextprotocol/sdk → express-rate-limit@8.6.0` | 10.5.0 | GHSA-rpw4-54j3-4h4q, -2vr4-cq9g-pvrc, -j6r3-76f7-8jcv, -h3mg-xc3c-68pw | **Lockfile-only** bump to **10.7.2**, within express-rate-limit's existing `^10.2.0` range (engines unchanged, `node >= 12`) |

Made with `npm update --prefix mcp --package-lock-only --ignore-scripts fast-uri ip-address`
after editing the override. The lock diff is exactly these two entries (version, resolved,
integrity). The audit was not disabled and CI was not changed. No code changed, so no TDD
cycle applied. Verified on Node 22.23.0 / npm 10.9.8:

| Check | Before | After |
|---|---|---|
| Exact CI audit command | exit 1: 3 moderate (`fast-uri`, `ajv` via fast-uri, `ip-address`) | exit 0: `found 0 vulnerabilities` |
| `npm run test:mcp` | all 11 tool contracts OK; packed smoke passed | same |
| `mcp-contracts`, `syncVersion`, `deterministicBuildPins` | — | 3/3 suites, 45/45 tests |

The root `package.json` still pins `fast-uri` to 3.1.7. That is upstream's value, and the
root audit is informational and outside this failure, so it is left for upstream to move.

## Retirement realism and risks

**Realism.** Unchanged in shape from v1.14, slightly better: the yt-dlp category is now
upstream's. The only product-code divergence is ~140 self-contained lines in `server.js`.
Upstreaming the `/tabs/:tabId/download` endpoint (with the inline-response reuse) and the
two lifecycle race fixes (bootstrap lease, probe pin — both small and test-backed) would
reduce the fork to a pure deployment fork (immutable GHCR publishing, digest pins, no-secrets
CI, Playwright pin). The Playwright pin and Node 22 choice are the parts least likely to
be retired, because upstream deliberately floats both.

**Risks.**

1. **Playwright skew widened**: upstream tests 1.62.1, fork ships 1.58.1. Re-check on
   every merge that no upstream code needs a newer API.
2. **Node 22 vs upstream's Node 24 toolchain** is now a hard incompatibility for
   `openclaw` (dev-only today). If upstream adds a runtime dependency with the same engine
   floor, the fork must move its image and CI to Node 24.
3. **Windows jobs declined**: `lib/windows-processes.js` browser-level tests are
   `test.skip` on Linux; the fork ships only a Linux image, so this is accepted.
4. **arm64 unverified**: only linux/amd64 built here; the arm64 yt-dlp standalone asset
   and checksum are verified against upstream's `SHA2-256SUMS`, not executed.
5. Local host test runs use a cached Camoufox `152.0.4-beta.26`
   (camoufox-js 0.11.5 resolves the newest release rather than an exact pin); the image
   bakes `beta.28`. Same major line; the container canary exercises `beta.28`.
6. **Root `npm audit`** (informational, not gated, not fixed): 5 findings (3 moderate, 2 high), identical to upstream v1.17.0; upstream's own `overrides` do not yet cover them. The **gated** MCP audit is fixed (see "Follow-up: gated MCP audit"); it will need the same kind of pin bump whenever new advisories land against upstream's exact `overrides`.
7. **First-launch addon egress** (see publisher section): a runtime network dependency plus the v1.15 10 s bound can wedge an egress-restricted container.
