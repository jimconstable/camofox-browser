# Upstream v1.14.0 reconciliation

Audit record for merging `jo-inc/camofox-browser` **v1.14.0** into this fork.
Produced as true merge commits (`git merge --no-ff`), never a rebase, so both
histories stay independently reviewable.

The branch carries **two** merge commits, in order:

## Merge 1 — upstream v1.14.0

| Role | SHA | Description |
| --- | --- | --- |
| First parent (`ours`) | `751d7649e4c61d3528b63db2af2e8d07d122184e` | fork base at the time — "Merge pull request #3 from jimconstable/sync/upstream-v1.13.0" |
| Second parent (`theirs`) | `e5a36f5cd0332fde6597de474329a308a53a0716` | `upstream/master` — "Merge pull request #9428 from jo-inc/release/1.14.0" |
| Merge base | `8b5b0959adfadadae38ecce9d7eed706ab102bf1` | upstream tag `v1.13.0` |
| Result | `4a99fb62ccb83554d3ce0c0ed3b74f624fe9fc6d` | "chore: reconcile upstream v1.14.0" |

Upstream contributed **63 commits** across 68 files since the merge base.

## Merge 2 — actual fork `origin/master`

Merge 1 was cut against a **stale** local reference for `origin/master`. The
real `jimconstable/camofox-browser` master had moved four commits ahead of
`751d764`, so a second merge is required for the PR to be mergeable. This is an
additional merge commit, not a rewrite of merge 1.

| Role | SHA | Description |
| --- | --- | --- |
| First parent (`ours`) | `4a99fb62ccb83554d3ce0c0ed3b74f624fe9fc6d` | result of merge 1 |
| Second parent (`theirs`) | `26993fc29b39859ce78ac849f15574aad42e8bae` | **actual `origin/master`** — "chore: record upstream v1.13.1 merge ancestry (#7)" |
| Merge base | `751d7649e4c61d3528b63db2af2e8d07d122184e` | the fork base both sides share |

The four commits `origin/master` added on top of `751d764`:

| Commit | Subject | Nature |
| --- | --- | --- |
| `1670af4` | chore: sync upstream v1.13.1 (#4) | upstream v1.13.1 content **plus** three fork-authored behaviors (see D1–D3 below) |
| `d1a36f3` | fix(docker): package MCP cookie runtime (#5) | fork-authored — `Dockerfile` |
| `a791e7e` | fix(ci): package MCP runtime in published image (#6) | fork-authored — `Dockerfile.ci` |
| `26993fc` | chore: record upstream v1.13.1 merge ancestry (#7) | `mcp/package-lock.json` version bookkeeping only |

Because upstream v1.14.0 ⊇ upstream v1.13.1, **every upstream-derived file on
`origin/master` is superseded by the newer copy already on this branch**; the
substance of merge 2 is preserving `origin/master`'s fork-authored deltas.

## What upstream v1.14.0 brings

Adopted wholesale (no fork objection):

- **Standalone MCP adapter** — new `mcp/` package (`@askjo/camofox-browser-mcp`),
  `lib/mcp-tool-contracts.mjs`, `scripts/test-mcp*.mjs`, `scripts/mcp-{call,run}.mjs`,
  `tests/unit/mcp-contracts.test.js`, `camofox-browser-mcp` bin, and MCP version
  syncing in `scripts/sync-version.js`.
- **`POST /tabs/:tabId/upload`** file-attachment endpoint with `lib/upload-paths.js`
  containment (rejects symlink escapes from `CAMOFOX_UPLOADS_DIR`).
- **Express 5** (`^5.2.1`), **camoufox-js 0.11.5**, **better-sqlite3 13.0.1**,
  **Jest 30**, `@modelcontextprotocol/sdk` as an optional dependency, and the
  `overrides` block for host `glob`/`test-exclude` dependency pinning.
- **Per-user navigation health** (`userNavHealth`), session-scoped recovery, and the
  `ensureBrowser()` single-flight fix (no more manual `browserLaunchPromise` clearing).
- **Page leases** (`lib/page-lease.js`) so a page created for `POST /tabs` cannot be
  reaped mid-creation.
- **Cookie path containment** (`lib/cookies.js` realpath hardening, now re-exporting
  `mcp/lib/cookies.mjs`), evaluate body-size isolation (`CAMOFOX_EVALUATE_MAX_BODY_SIZE`),
  `handleRouteError` routing for `/evaluate`, explicit/scoped consent dismissal.
- **Xvfb display-file cleanup** on `kill()` in both the core and VNC virtual displays.
- **Opt-in interactive desktop mode** (`CAMOFOX_INTERACTIVE=desktop`).
- **Docker**: `node:22-trixie-slim` base (the better-sqlite3 arm64 prebuild needs
  GLIBC_2.38), native build toolchain for `npm ci`, `curl -f` on the Camoufox
  download, `--build-arg ARCH=$(CAMOUFOX_ARCH)` in the Makefile, and `COPY mcp/ ./mcp/`
  in both Dockerfiles.
- `.github/workflows/mirror-camoufox.yml`, `publish.yml` updates, `release.sh` and
  `tests/**` updates.

## Classification of fork behavior

### A. The five current fork commits (`8b5b095..751d764`)

| # | Commit | Behavior | Verdict |
| --- | --- | --- | --- |
| 1 | `f626264` | feat: stabilise Camofox runtime and stream tab resources (#1) | **Partly superseded, partly still required** — see categories 1–5 below |
| 2 | `5f25a50` | ci: publish reproducible Camofox images (#2) | **Deployment-only, still required** — categories 6–8 |
| 3 | `b874a41` | chore: sync upstream v1.13.0 | **Obsolete as a commit** (history-only); its one surviving behavior is category 9 |
| 4 | `8462fee` | ci: run operational browser tests with Camoufox | **Deployment-only, still required** — folded into category 7 |
| 5 | `751d764` | Merge pull request #3 (v1.13.0 sync) | **Obsolete as a commit** (merge bookkeeping; no behavior of its own) |

### B. The nine historical behavior categories

| # | Behavior | Origin | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| 1 | `await localVirtualDisplay.get()` before launch (Xvfb display string is a promise) | `f626264` | **Superseded by upstream** | Upstream carries the identical `await` and pins it with a source contract in `tests/unit/launchCompat.test.js` ("awaits virtual display display string before launch"). Fork delta is now zero. |
| 2 | VNC watcher finds Xvfb via `/tmp/.X11-unix/X<N>` (not by grepping `:N`, which `-displayfd 3` never prints) + x11vnc death detection and re-attach | `f626264` | **Superseded by upstream** | Upstream v1.13.0 landed its own watcher rewrite (`plugins/vnc/vnc-watcher-lib.sh` + `vnc-watcher.test.js`) covering socket-based discovery and re-attachment; adopted during the v1.13.0 sync. Fork delta is now zero. `:6080`/noVNC recovery remains intact and is additionally hardened by upstream's Xvfb display-file cleanup. |
| 3 | Health probe swallows the `Browser.setDefaultViewport` / `viewport.isMobile` juggler schema mismatch instead of restarting the browser | `f626264` | **Superseded by upstream — removed in this merge** | Upstream `192fa20` fixes the *cause*: the probe now calls `browser.newContext({ viewport: null })`, matching the other three context call sites, and `tests/unit/launchCompat.test.js` asserts it ("health probe context also uses a null viewport"). Keeping the fork's `catch` branch on top of the fix would be worse than dead code: any future hang whose message happened to contain both tokens would reset `lastSuccessfulNav` and permanently suppress `restartBrowser()`. Removed; upstream's catch body adopted verbatim. |
| 4 | `POST /tabs/:tabId/download` — stream an authenticated **same-origin** resource through the tab's own request context | `f626264` | **Still required** | Upstream has no equivalent. `/tabs/:tabId/downloads` only lists browser-initiated downloads; upstream's new `/upload` is the opposite direction. Retained verbatim (108 added lines in `server.js`, zero removed). |
| 5 | Exact `playwright-core` pin (`1.58.1`, not `^1.58.0`) | `f626264` | **Still required (deployment risk — see below)** | Upstream floats `^1.58.0`, which resolves to `1.59.1` today and will keep drifting against a Camoufox binary that is pinned to `135.0.1-beta.24`. `1.58.1` satisfies upstream's own range, so this is a narrowing, not a divergence. |
| 6 | Deterministic build inputs: yt-dlp pinned to release `2026.07.04` with per-arch SHA-256 verification in `Dockerfile`, `Dockerfile.ci`, `Makefile`, `build.ps1`, `plugins/youtube/post-install.sh` and CI; immutable Node base-image digest | `5f25a50` | **Deployment-only, still required** | Upstream still fetches `yt-dlp/releases/latest` unverified and uses a floating base tag. Preserved and re-based onto upstream's `node:22-trixie-slim`. |
| 7 | Reproducible CI: PR-only/no-secrets workflow with `verify` / `browser-tests` / `ytdlp-download` / `docker-build` jobs, Camoufox provisioning + cache, `jest-junit` as a declared devDependency rather than an ad-hoc `npm install --no-save` | `5f25a50`, `8462fee` | **Deployment-only, still required** | Upstream's CI installs `jest-junit` at run time, has no reproducible-build job, no clean-image job, and no Camoufox provisioning. Upstream's two new MCP steps were merged into the fork's `verify` job; the Jest 30 `--testPathPatterns` rename was applied. |
| 8 | Immutable-image publishing: GHCR `sha-<commit>` + `v<version>` tags, **no mutable `latest`**, OCI `source`/`revision`/`version` labels via `IMAGE_*` build args; upstream `docker.yml` deleted in favour of `publish-image.yml` | `5f25a50` | **Deployment-only, still required** | Upstream's `docker.yml` publishes a mutable `:latest` to `ghcr.io/jo-inc/...`, which is the promotion model this fork deliberately replaced. |
| 9 | Cross-origin **redirect** containment on `/tabs/:tabId/download` (manual per-hop loop, origin check on every hop, redirect cap, `Location`-missing → 502) | `b874a41` | **Still required** | Belongs to category 4; upstream has no equivalent endpoint. Prevents a same-origin URL from bouncing an authenticated request context to a third-party host. |

### C. Docker / MCP packaging commits from `origin/master`

| # | Behavior | Origin | Verdict | Rationale |
| --- | --- | --- | --- | --- |
| C1 | `COPY mcp/ ./mcp/` in `Dockerfile` **plus** a build-time guard `RUN node -e "import('./lib/cookies.js')"`, pinned by `tests/unit/dockerPackaging.test.js` | `d1a36f3` | **Still required** | Upstream `d1e31fe` independently adds the `COPY`, so that half is now duplicated by upstream — but the *guard* and its test are fork-only. `lib/cookies.js` re-exports `mcp/lib/cookies.mjs`; without the guard a packaging regression is silent (the persistence plugin fails to load, `/health` still reports ok, and no profile is ever written). Retained. |
| C2 | Same `COPY` + guard in `Dockerfile.ci`, pinned by `tests/unit/publishedImageDockerfile.test.js` — which resolves the Dockerfile path **out of `publish-image.yml`** rather than hard-coding it | `a791e7e` | **Still required (deployment-only)** | Guards the image the publisher actually builds. Upstream has no equivalent, and the indirection means the test follows the workflow if the file ever changes. Retained. |
| C3 | `npm ci --omit=dev --ignore-scripts` in both Dockerfiles | `1670af4` | **Still required — supersedes upstream's fix for the same defect** | Both sides fix the same failure: better-sqlite3 ships `binding.gyp`, so npm's *implicit* `node-gyp rebuild` runs and dies on a slim base with "not found: make". Upstream v1.14.0 installs and purges `build-essential`; the fork skips the compile instead. Verified locally that better-sqlite3 13.0.1 declares **no** `install` script and ships prebuildify binaries (`prebuilds/linux-{x64,arm64}.node`) in its tarball, so the prebuild is what loads either way. The fork's is equivalent and cheaper, and it is what master ships. |
| D1 | Bootstrap page lease held across the `session:created` emit in `getSession()` | `1670af4` | **Still required** | Upstream's `acquirePageLease()` is taken by the *caller*, after `getSession()` publishes the session. During the awaited `session:created` listeners (persistence does real I/O) the session has zero tab groups and no leases — the exact shape all three reapers close. Upstream v1.14.0 has no equivalent guard. |
| D2 | Health probe pins the instance it is testing (`const probeBrowser = browser`) and aborts instead of restarting when the browser was closed or replaced mid-probe | `1670af4` | **Still required** | The probe fires after ~120 s without a successful operation, inside the 300 s idle-shutdown window. Without the pin, an intentional idle shutdown makes the probe restart the browser it just shut down — and on this runtime that cycles Xvfb/x11vnc and drops a live VNC session. Orthogonal to upstream's `viewport: null` fix. |
| D3 | `overrides: { "jest-junit": { "uuid": "^11.1.1" } }` | `1670af4` | **Still required (deployment-only)** | The fork's `jest-junit` devDependency pulls the deprecated `uuid@8` line. The override moves it to `uuid@11`. Post-merge audit drops from 4 findings to 2 with it applied. |

Behaviors D1–D3 are covered by `tests/unit/sessionLifecycleRaces.test.js`
(fork-authored, 8 tests) and the two Docker packaging tests above.

### Summary

- **Superseded by upstream:** categories 1, 2, 3 (3 removed as duplicate/harmful-on-top).
- **Still required (product behavior):** categories 4, 9, C1, D1, D2 (and 5 as a dependency constraint).
- **Deployment-only:** categories 6, 7, 8, C2, C3, D3.
- **Obsolete:** the sync/merge commits (`b874a41`, `751d764`, `26993fc`) as commits — their content is now upstream's, or is captured in categories 9 and C/D.

> **Correction (merge 2).** Merge 1 recorded the fork requirement *"Docker packages
> MCP runtime files"* as fully **superseded** by upstream `d1e31fe`. That was written
> against the stale `origin/master` and is only half right. Upstream does supply the
> `COPY mcp/ ./mcp/` line in both Dockerfiles, so that part is genuinely duplicated —
> but the fork's real master landed the requirement as commits `d1a36f3` and `a791e7e`,
> which add a **build-time guard** (`RUN node -e "import('./lib/cookies.js')"`) and two
> tests that upstream has no equivalent for. The requirement is therefore
> **still required**, tracked as categories C1 and C2 above. `lib/cookies.js` re-exports
> `mcp/lib/cookies.mjs`; without the guard a packaging regression is silent — the
> persistence plugin dies at load with `ERR_MODULE_NOT_FOUND`, the server starts anyway,
> `/health` keeps reporting ok, and no profile is ever written.

## Conflicts and resolutions

`git merge-tree` predicted six conflicted files; all six conflicted for real.

### 1. `package.json`

| Hunk | Resolution |
| --- | --- |
| `dependencies` | Took upstream's `better-sqlite3 13.0.1`, `camoufox-js 0.11.5`, `express ^5.2.1`. **Kept the fork's exact `playwright-core: "1.58.1"`** (category 5). |
| `devDependencies` | Took upstream's `jest ^30.4.2`; **kept the fork's `jest-junit ^16.0.0`** (category 7 — both `jest.config.cjs` and `jest.config.e2e.cjs` load the reporter when `CI=1`). |

Everything else in the file (version `1.14.0`, `mcp/` in `files`, `mcp`/`test:mcp`/`test:unit`
scripts, `optionalDependencies`, `overrides`, the `camofox-browser-mcp` bin) auto-merged
from upstream and was kept.

### 2. `package-lock.json`

Reset to upstream's lock (`git checkout --theirs`), then regenerated with
`npm install --package-lock-only --ignore-scripts` against the resolved `package.json`.
Resulting delta vs. upstream's lock is exactly 56 lines and only the two intended
changes — `playwright-core` `1.59.1 → 1.58.1`, and `jest-junit` plus its dev-only
transitives (`mkdirp`, `uuid`, `xml`). No other transitive drift.

### 3. `Dockerfile`

| Hunk | Resolution |
| --- | --- |
| `FROM` line | Combined: `FROM node:22-trixie-slim@sha256:7b8a0c89…`. Upstream's trixie requirement is load-bearing (better-sqlite3 arm64 prebuild needs GLIBC_2.38); the fork's immutable-digest pin is load-bearing for reproducibility. Digest is the multi-arch **index** digest (resolves for linux/amd64 and linux/arm64), obtained from `docker buildx imagetools inspect node:22-trixie-slim`. Both rationales kept as comments. |

**Latent break found and fixed (semantic, not a textual conflict).** Upstream's Makefile
change `--build-arg ARCH=$(ARCH)` → `--build-arg ARCH=$(CAMOUFOX_ARCH)` re-purposes `ARCH`
to mean *the Camoufox release asset arch* (`x86_64`/`arm64`), while the fork's yt-dlp
bind-mount step reads `/dist/yt-dlp-${ARCH}` and the `dist/` files are named by *host*
arch (`x86_64`/`aarch64`). The two names differ on 64-bit ARM, so on aarch64 the merged
build would have failed at the checksum/install step. Introduced a dedicated build arg
(default `x86_64`) and wired it through `Makefile` and `build.ps1`. While there,
`build.ps1` was corrected to pass `ARCH=$CamoufoxArch` (it previously passed the host
arch, which with upstream's new `curl -f` would now 404 on the Camoufox asset for
aarch64 instead of failing obscurely at `unzip`).

> **Correction (merge 2).** The real `origin/master` had already found and fixed this
> same latent break, under the name **`YTDLP_DIST_ARCH`**; merge 1 independently
> invented `YTDLP_BIN_ARCH` for it. Merge 2 adopts master's `YTDLP_DIST_ARCH`
> throughout (`Dockerfile`, `Makefile`, `build.ps1`) so the PR introduces no rename,
> and confirms master had independently made the identical `ARCH=$CamoufoxArch` fix in
> `build.ps1`. Every remaining reference to `YTDLP_BIN_ARCH` in this document is
> historical.

### 4. `Dockerfile.ci`

| Hunk | Resolution |
| --- | --- |
| `FROM` line | Same combination as above: `node:22-trixie-slim@sha256:7b8a0c89…`. |
| `npm ci` step | Took upstream's version (`npm ci --omit=dev && apt-get purge -y --auto-remove build-essential`). The fork's only delta had been `--production` → `--omit=dev`, which upstream made independently. Dropped `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` with upstream: `playwright-core` never downloads browsers, and `scripts/postinstall.js` explicitly *defends against* that variable rather than honouring it (`CAMOFOX_SKIP_DOWNLOAD` is the real switch). |

Upstream's `COPY mcp/ ./mcp/`, `libegl1`, and `build-essential`/`python3` changes were
taken as-is in both Dockerfiles.

### 5. `.github/workflows/ci.yml`

The fork rewrote this workflow entirely; upstream made two changes to the old one.

| Hunk | Resolution |
| --- | --- |
| First | Kept the fork's `Syntax check` step and **added upstream's two new MCP steps** (`Verify standalone MCP package` → `npm run test:mcp`; `Audit standalone MCP package` → `npm ci --prefix mcp --ignore-scripts && npm audit --prefix mcp --omit=dev`) to the `verify` job. Dropped upstream's `Run unit + plugin tests (Jest)` step — the fork's `Browser-independent unit + plugin tests` step in the same job is a strict superset (it also covers `scripts/`) and declares `jest-junit` instead of installing it ad hoc. |
| Second | Kept the fork's `Install dependencies (locked)` step. Dropped upstream's `Run browser-dependent unit tests` step — the fork's `browser-tests` job already runs a superset (`security\|cookies\|tabRecycling\|tabLifecycleContract\|operationalFailures`) against a real provisioned Camoufox rather than `xvfb-run` + `playwright install firefox`. |
| Jest 30 | Applied upstream's flag rename in both fork jobs: `--testPathPattern=` → `--testPathPatterns=` (2 occurrences). Without this the merged CI would fail under Jest 30. |

Node version kept at 22 (upstream CI moved to 24): 22 satisfies `engines: ">=22"` and
matches the `node:22-trixie-slim` base actually shipped, so CI tests the runtime that is
deployed. Post-merge YAML was re-parsed to confirm all four jobs and their step lists.

### 6. `tests/helpers/testSite.js`

Purely additive on both sides — kept the fork's `/download-redirect` and
`/download-cross-origin-redirect` routes (category 9 fixtures, now with a clarifying
comment) *and* upstream's `/upload` fixture page. Followed upstream in dropping the
stale `// Large page for snapshot truncation tests` comment.

### 7. `server.js` — auto-merged, then hand-corrected

Git auto-merged this file, producing a silently wrong result: it took upstream's
`newContext({ viewport: null })` **and** kept the fork's now-dead `catch` branch (see
category 3). The branch was removed and upstream's catch body restored verbatim. The
remaining fork delta vs. pristine upstream is `+108 / -0` — purely the
`POST /tabs/:tabId/download` handler and its `@openapi` block.

### 8. `openapi.json` — auto-merged, verified

Auto-merge produced a spec containing both the fork's `/tabs/{tabId}/download` and
upstream's `/tabs/{tabId}/upload` (37 paths). `npm run generate-openapi` reproduced it
byte-for-byte — no regeneration diff — and `tests/unit/openapi.test.js` passes,
including its "no stale routes" and "openapi.json is up to date" assertions.

## Merge 2 conflicts and resolutions

Eight files conflicted (13 files touched in total; `.github/workflows/ci.yml`,
`README.md`, `lib/config.js` and `tests/unit/config.test.js` auto-merged and were
re-inspected). Three files arrived as clean additions from `origin/master`:
`tests/unit/dockerPackaging.test.js`, `tests/unit/publishedImageDockerfile.test.js`,
`tests/unit/sessionLifecycleRaces.test.js`.

The governing rule: **upstream v1.14.0 ⊇ upstream v1.13.1**, so wherever a conflict was
"newer upstream vs. older upstream" the branch side (v1.14.0) wins; wherever
`origin/master` contributed fork-authored behavior, it is preserved.

| # | File | Hunks | Resolution |
| --- | --- | --- | --- |
| 1 | `Dockerfile` | 4 | (a) adopt master's `YTDLP_DIST_ARCH` arg name over merge 1's `YTDLP_BIN_ARCH`; (b) same at the bind-mount/`sha256sum` use site; (c) take master's `npm ci --omit=dev --ignore-scripts` over upstream's install-and-purge `build-essential` layer (category C3), with the comment extended to record *why* it supersedes upstream's fix for the same defect; (d) keep upstream's explanatory comment above `COPY mcp/ ./mcp/`. |
| 2 | `Dockerfile.ci` | 2 | Take master's `--ignore-scripts` install line (adding a note that trixie is still required for the arm64 prebuild), and keep upstream's `COPY mcp/` comment. **Semantic follow-up in an auto-merged region:** the purge of `build-essential` lived inside the RUN line being replaced, so upstream's `build-essential` in the apt layer would have shipped in the final image. Removed it there and kept `python3` (yt-dlp runtime dep). |
| 3 | `Makefile` | 1 | `--build-arg YTDLP_DIST_ARCH=$(ARCH)` (master's name). |
| 4 | `build.ps1` | 1 | `--build-arg "YTDLP_DIST_ARCH=$Arch"` (master's name). Master already passed `ARCH=$CamoufoxArch`, so no further change. |
| 5 | `mcp/README.md`, `mcp/package.json`, `mcp/package-lock.json` | 1 / 1 / 3 (add/add) | Take the branch (v1.14.0). Verified the only differences from master's copies are the `1.13.1 → 1.14.0` version bump, a newer transitive `hono`, and an upstream doc edit — no fork-authored content on master's side. |
| 6 | `openclaw.plugin.json` | 1 | Take the branch: version `1.14.0` plus upstream's new `CAMOFOX_INTERACTIVE` env-var entry. |
| 7 | `openapi.json` | 1 | Version only → `1.14.0`. Regenerated afterwards with zero drift. |
| 8 | `package.json` | 4 | version → `1.14.0`; scripts → v1.14.0's `test:mcp` / `test:unit` / composite `test`; dependencies → v1.14.0's `better-sqlite3 13.0.1` + `express ^5.2.1` (master was still Express 4); **overrides → keep master's fork-authored `"jest-junit": { "uuid": "^11.1.1" }`** (category D3). `playwright-core: "1.58.1"` and `jest-junit: ^16.0.0` were identical on both sides and did not conflict. |
| 9 | `package-lock.json` | 17 | Reset to the branch lock, then regenerated with `npm install --package-lock-only --ignore-scripts`. Sole delta: `uuid` `8.3.2 → 11.1.1` under the new override. `npm ci` then reinstalled cleanly. |
| 10 | `server.js` | 3 | See below — the only conflict with real semantic weight. |
| 11 | `tests/helpers/testSite.js` | 2 | Take the branch: keep upstream v1.14.0's `/connection-reset` fixture (absent from v1.13.1) and its removal of the stale "Large page…" comment. The fork's `/download-redirect` + `/download-cross-origin-redirect` fixtures were unconflicted and are intact. |

### `server.js` — three hunks, and a source-contract collision

1. **Bootstrap page lease (category D1).** Took master's
   `const bootstrapLease = acquirePageLease(created);`. This was not optional: the
   `finally { releasePageLease(created, bootstrapLease); }` had already auto-merged in,
   so dropping the declaration would have left a `ReferenceError` in `getSession()`.

2. **Health-probe context.** The two sides were:
   - branch (upstream v1.14.0): `testContext = await browser.newContext({ viewport: null });`
   - `origin/master` (fork): `testContext = await probeBrowser.newContext();`

   These fix *different* problems — upstream's `viewport: null` stops the probe from
   tripping the juggler `viewport.isMobile` rejection and restarting a healthy browser;
   the fork's pinned instance stops the probe from restarting a browser that idle
   shutdown intentionally closed. Both are wanted, and both compose:
   **`testContext = await probeBrowser.newContext({ viewport: null });`**

   That composition broke *both* source-contract tests, which had been written against
   their own side's exact literal and are mutually exclusive as written:

   | Test | Owner | Asserted literal | Change |
   | --- | --- | --- | --- |
   | `tests/unit/launchCompat.test.js` | upstream | locator `'testContext = await browser.newContext('`, then `toContain('viewport: null')` | locator → `'testContext = await probeBrowser.newContext('` |
   | `tests/unit/sessionLifecycleRaces.test.js` | fork | `toContain('testContext = await probeBrowser.newContext();')` | → `toContain('testContext = await probeBrowser.newContext(')` |

   Both edits are locator-only; neither weakens what its test actually checks. Upstream's
   still asserts `viewport: null` at the probe's context call, and the fork's still
   asserts the probe creates its context on the pinned instance. Both pass together.

3. **Health-probe catch block (category D2).** Took master's early
   `if (testContext) await testContext.close()` plus the
   `if (browser !== probeBrowser || healthState.isRecovering) → abort` branch, and
   removed the now-duplicated trailing `testContext.close()` that upstream's tail
   contributed. **Dropped master's `setDefaultViewport`/`isMobile` workaround** for the
   same reason merge 1 dropped it: `viewport: null` makes that branch unreachable, and
   leaving it in would let any future hang whose message happened to contain both tokens
   reset `lastSuccessfulNav` and permanently suppress `restartBrowser()`.

Net result: `server.js` diverges from pristine upstream v1.14.0 by **+140 / −3** lines —
the authenticated same-origin download endpoint, the bootstrap lease, and the probe pin.

## Preserved fork requirements — evidence

| Requirement | Status | Evidence |
| --- | --- | --- |
| Persistent profile state, no credential exposure | Intact | `plugins/persistence/*` unmodified by the fork; `persistence.test.js` + `plugin.test.js` pass; E2E logs show `storage state persisted` per session. No profile contents were read during this work. |
| Optional noVNC/Xvfb recovery, `:6080` | Intact | `plugins/vnc/*` carries upstream's watcher and the new Xvfb display-file cleanup; `vnc.test.js`, `vnc-launcher.test.js`, `vnc-watcher.test.js` pass. Fork delta zero (categories 1–2 superseded). |
| API auth and `:9377` | Intact | `CAMOFOX_PORT=9377` in both Dockerfiles; `auth.test.js`, `accessKey.test.js`, `security.test.js` pass. |
| Authenticated resource download security | Intact | `POST /tabs/:tabId/download` retained with same-origin + per-hop redirect containment; 3 dedicated E2E tests pass. |
| Exact Playwright/runtime compatibility | Intact | `playwright-core` pinned `1.58.1` in `package.json` **and** the lock; full browser-backed unit + E2E suites pass on camoufox-js 0.11.5 + Express 5. |
| Docker packages MCP runtime files | Intact (fork guard retained) | `COPY mcp/ ./mcp/` **and** `RUN node -e "import('./lib/cookies.js')"` in both `Dockerfile` and `Dockerfile.ci`; `dockerPackaging.test.js` + `publishedImageDockerfile.test.js` pass. |
| Plugin loading | Intact | `camofox.config.json` merged from upstream; `plugins.test.js` and all 6 plugin suites pass. |
| Telemetry policy | Intact | `tests/unit/noSecrets.test.js` passes (no key material in shipped files, `lib/reporter.js` still has no `fs` import). No telemetry config changed by this merge. |
| Immutable-image metadata / promotion | Intact | `publish-image.yml` retained (no mutable `latest`); `IMAGE_SOURCE`/`IMAGE_REVISION`/`IMAGE_VERSION` args + OCI labels present in both Dockerfiles; upstream's `docker.yml` stays deleted. |
| Reliable unauthenticated tab create/snapshot/close | Verified | Full E2E suite (15 files / 77 tests) plus the isolated container smoke below. |

## Test evidence

All commands run locally in the isolated working repo. No production container, no
secrets, no private profile inspection.

| Command | Result |
| --- | --- |
| `npm ci` | OK; postinstall reported "Camoufox binary already cached" (no download) |
| `node --check` on `server.js`, `plugin.js`, `scripts/*.js`, `mcp/server.mjs` | OK |
| `npm run build` | OK |
| `npm run generate-openapi` | OK — 37 paths; **zero diff** against the merged `openapi.json` |
| Focused retained-behavior units — merge 2 set (`launchCompat`, `sessionLifecycleRaces`, `dockerPackaging`, `publishedImageDockerfile`, `openapi`, `pageLease`, `nativeBinding`, `expressCompatibility`, `config`, `noSecrets`, `openclawManifest`, `syncVersion`) | **12 suites / 62 tests passed** — including the two re-pinned source contracts passing simultaneously |
| `npm run test:unit` (full `tests/unit`, incl. browser-backed) | **63 suites / 815 tests passed** (~86 s) — merge 1 was 60/805; the three test files from `origin/master` add 3 suites / 10 tests |
| `npm run test:plugins` | **6 suites / 43 tests passed** (baseline before merge: 42) |
| `npx jest --testPathPatterns='scripts'` | **2 suites / 9 tests passed** |
| `npm run test:mcp` | OK — contract checks for all 11 tools + packed-tarball smoke test |
| `npm run test:e2e` | **15 suites / 77 tests passed** (~94 s) |
| Focused E2E `tests/e2e/downloadsImages.test.js` | **5/5 passed**, incl. all three `/tabs/:tabId/download` cases (body, same-origin redirect, cross-origin redirect → 400) |
| `docker buildx build -f Dockerfile.ci --platform linux/amd64` | see "Container verification" |
| Isolated container smoke (unauthenticated `example.com`) | see "Container verification" |

`npm audit` was **not** run as a gate and `npm audit fix` was **not** run, per instruction.
For the record, the tree after merge 2 reports **2 vulnerabilities (1 moderate, 1 high)**,
versus 4 after merge 1 and 12 on the pre-merge baseline — upstream's `overrides` block and
dependency bumps account for most of the reduction, and master's `jest-junit → uuid ^11.1.1`
override (category D3) for the rest. Upstream's new CI step audits only the `mcp/` package.

Not run in merge 2, by instruction: the clean Docker build and the isolated container
smoke test. Both were run and passed during merge 1, but **neither covers the merge-2
Dockerfile changes** (`--ignore-scripts`, the `build-essential` removal from
`Dockerfile.ci`'s apt layer, or the `RUN node -e "import('./lib/cookies.js')"` guard).
That guard is a build-time assertion, so a clean `docker buildx build -f Dockerfile.ci`
is the outstanding verification before merge; the two Dockerfile packaging tests cover
only the *source* of those lines, not their execution.

## Deployment risks and fork retireability

**Retireability.** Six of the nine historical behavior categories can be retired or are
already gone: 1, 2 and 3 are superseded by upstream code in this merge, and the two sync
commits are history-only. What is left is one genuine product feature (4 + 9, the
authenticated same-origin resource download), one dependency constraint (5), and three
deployment/supply-chain categories (6, 7, 8). If category 4 were contributed upstream and
accepted, the fork would reduce to a pure *deployment* fork: CI, image provenance and
build determinism, with no `server.js` delta at all. That is the shortest path to
retirement and is worth pursuing — the endpoint is 108 self-contained lines with tests.

**Risks to watch.**

1. **`playwright-core` pin vs. upstream float (category 5).** Upstream tests `1.59.1`;
   we ship `1.58.1`. Every future upstream merge must re-check that no new upstream code
   requires a `>=1.59` API. The full unit + E2E suites are the guard, and they pass today.
   The opposite risk — dropping the pin — is a floating Playwright against a Camoufox
   binary pinned to `135.0.1-beta.24`, which is exactly what produced the juggler
   `viewport.isMobile` failures this fork previously worked around.
2. **Node base-image digest pin (category 6).** `sha256:7b8a0c89…` must be refreshed
   deliberately (`docker buildx imagetools inspect node:22-trixie-slim`) or the image
   will silently stop receiving Debian security updates. This is the accepted cost of
   reproducibility; the refresh procedure is documented in the README.
3. **arm64 is unverified here.** The `YTDLP_DIST_ARCH` fix and the trixie/GLIBC_2.38
   rationale both matter most on arm64, and only linux/amd64 was built and smoke-tested
   on this machine. The multi-arch publish path (`publish-image.yml`, QEMU, both
   platforms) has **not** been exercised by this merge.
4. **CI Node version skew.** Upstream CI now runs Node 24; this fork runs Node 22 to
   match the shipped image. Upstream code that assumes Node 24 would not be caught here.
5. **New upstream CI network dependencies.** `npm run test:mcp` and the MCP audit step
   both reach the npm registry, and the audit step can fail the fork's `verify` job on a
   newly published advisory in `mcp/`'s dependency tree — an availability coupling the
   fork's otherwise hermetic CI did not previously have.
6. **Express 5 upgrade surface.** This is the largest behavioral change in v1.14.0.
   `tests/unit/expressCompatibility.test.js` covers routing shape only; anything relying
   on Express 4 error/`req.query` semantics outside the test suite is untested.
