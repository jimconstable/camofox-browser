# Upstream v1.18.1 reconciliation

Audit record for merging `jo-inc/camofox-browser` **v1.18.1** into this fork. It is a true
merge commit (`git merge --no-ff`), not a rebase, and every conflict was resolved by intent.
The follow-up commits sit separately on top of the merge.
Earlier records: `docs/upstream-v1.14.0-reconciliation.md`, `docs/upstream-v1.17.0-reconciliation.md`.

## Sources

| Role | SHA | Description |
| --- | --- | --- |
| First parent (`ours`) | `fdc6bc33c6240884632ba1de85592f437fb76d64` | fork `master` (PR #9 merge, v1.17.0; the deployed revision) |
| Second parent (`theirs`) | `39c82094013480b373df6600d44c7f036f58356e` | `upstream/master`: "Merge pull request #12634: release v1.18.1 patch" |
| Merge base | `389c996ae3c7d42e539295a336ee6f975847f066` | upstream v1.17.0 |
| Merge commit | `c3c875487ecfebcebebeee4ae52f29259409bf9c` | "chore: reconcile upstream v1.18.1" |
| Branch | `chore/reconcile-upstream-v1.18.1` | |

Upstream contributed 27 commits across 30 files. Before the merge, the fork carried 20 commits relative to the merge base.

## What upstream v1.18.0–v1.18.1 brings (adopted as-is)

- **Tab-create cleanup** (`server.js`): a tab registered before a failed or timed-out `POST /tabs` is discarded. `dropEmptyTabGroup()` stops a cleanup that resumes late from deleting a replacement group registered under the same key. A proxy-rotation retry keeps its page (`tests/e2e/tabCreateCleanup.test.js`).
- **Click recovery**: a DOM `element.click()` fallback runs before the native mouse sequence, and a timeout now retries with `force`.
- Additional key aliases (`lib/browser-key.js`). macOS external `.app` bundles (`lib/camoufox-executable.js`). Reporter ignores invalid native memory samples.
- **Docker**: `TARGETARCH` maps to the Camoufox asset name (`Dockerfile`). `postinstall.js` and `lib/camoufox-download.js` are copied before `npm ci` (both Dockerfiles).
- **Compatible Camoufox downloader**: `lib/camoufox-download.js` `BUNDLED_CAMOUFOX_RELEASE = '152.0.4-beta.30'`. `CompatibleCamoufoxFetcher` refuses other releases, and `npm run fetch-bin` uses it.
- **VNC protected native bind (#12468)**: `VNC_BIND` still controls noVNC only. The new `VNC_RFB_BIND` (default `127.0.0.1`) controls raw x11vnc, and a non-loopback value requires `VNC_PASSWORD`. Upstream's change is additive to the fork's socket discovery and `kill -0` recovery, which remain in `vnc-watcher-lib.sh`.
- MCP manifest shipped in the root package; `hono`/`fast-uri` override bumps; `agenthook-notify.yml` skips when secrets are absent.

## Conflicts and resolutions

`git merge-tree` predicted 3 conflicted paths, and all 3 conflicted.

| # | File | Resolution |
| --- | --- | --- |
| 1 | `Dockerfile` | Took upstream's `ARG TARGETARCH` in place of the fork's `ARG ARCH=x86_64`. The auto-merged `RUN case "${TARGETARCH}"` block needs it. Kept the fork's yt-dlp pin comment, digest-pinned trixie `FROM`, `npm ci --omit=dev --ignore-scripts`, `COPY mcp/`, cookies import guard and OCI labels. Upstream's new `COPY postinstall.js` / `lib/camoufox-download.js` auto-merged. |
| 2 | `mcp/package.json` | Took upstream's `hono` 4.13.7. A later follow-up raises it further. |
| 3 | `package-lock.json` | Reset to upstream's lock and regenerated with `npm install --package-lock-only --ignore-scripts`. The package set differs from upstream **only** in `playwright-core 1.62.1 → 1.58.1`, plus `jest-junit`, `mkdirp`, `uuid@11.1.1`, `xml`, and a lock-only nested `openclaw/node_modules/playwright-core` (optional peer, never installed). This is the same delta as at v1.17.0. |

Auto-merged files were re-inspected. `server.js` keeps the fork's three retained behaviours (rows 3–5 below) alongside upstream's tab-cleanup and click changes, which do not overlap them. `Makefile` and `build.ps1` still pass `--build-arg ARCH=…`. The `Dockerfile` no longer declares `ARG ARCH`, so that unused arg has no effect and `TARGETARCH` selects the asset. Upstream's `Makefile` has the same behaviour, so it is left unchanged.

## Follow-ups

| Commit | Change | Why |
| --- | --- | --- |
| `3b1337d` fix(ci) | `browser-tests` provisions Camoufox with `npm run fetch-bin`, not bare `npx camoufox-js fetch`. | Upstream CI switched to the compatible-release downloader. Bare `camoufox-js fetch` resolves the newest release, which upstream rejects (beta.34 breaks `navigator.product`), so fork CI would have drifted onto an untested browser. |
| `1c4e71f` fix(deps) | `mcp/` overrides `fast-uri 3.1.9` and `hono 4.13.13`. Lockfile-only, in-range updates: `@modelcontextprotocol/sdk 1.32.2`, `express 5.3.0`, `body-parser 2.4.0`, `proxy-addr 2.0.8`, `ip-address 10.7.5`, `zod 4.6.7` (plus `content-type`/`content-disposition` as their dependencies). | The gated CI step `npm audit --prefix mcp --omit=dev` failed with 9 advisories (1 critical, `proxy-addr`). **Pristine upstream v1.18.1 fails the same step.** After the update: `found 0 vulnerabilities`. `npm run test:mcp` passes (11 tool contracts, packed smoke, root manifest check). |

## Classification of fork-only behaviour (unchanged since v1.17.0)

| # | Behaviour | Verdict |
| --- | --- | --- |
| 1 | Awaited virtual display; VNC socket-based display discovery and `kill -0` re-attach | Upstream since v1.14; zero fork delta. Upstream's `VNC_RFB_BIND` composes with it. |
| 2 | Health probe `setDefaultViewport`/`isMobile` workaround | Obsolete since v1.14 (Playwright pin); still absent. |
| 3 | `POST /tabs/:tabId/download` same-origin authenticated resource stream (no cookie export, per-hop origin check) | **Still required.** Upstream has only `fetch-current-resource` for the current document. |
| 4 | Bootstrap page lease across `session:created` | **Still required.** |
| 5 | Health probe pins `probeBrowser` and aborts if the browser was replaced | **Still required.** |
| 6 | Exact `playwright-core 1.58.1` | **Still required.** Upstream's `^1.58.0` resolves to 1.62.1. |
| 7–9 | Digest-pinned base, `--ignore-scripts` install, `COPY mcp/` + import guard, immutable GHCR publishing, PR-only/no-secrets CI | Deployment-only, still required. |
| F1–F3 | Pin-consistency test, local OpenClaw type shim (Node 22), agenthook owner gate | Still required. |

## Camoufox binary: beta.28 baked, beta.30 for the npm path

Upstream v1.18.1 leaves both Dockerfiles baking **`152.0.4-beta.28`**. The npm/CI downloader selects **`beta.30`**, with the comment "beta.28 fails viewport E2E on Playwright 1.58". The fork keeps upstream's split and does not change the image pin. Evidence:

- Full E2E on the host against **beta.28** (Dockerfile's release, fetched from the same URL): 16/16 suites, 85/85 tests.
- Full unit, E2E and plugin suites against **beta.30**: all pass (below).
- The published-image canary (beta.28) passed every probe below.

Moving the image to beta.30 is a deliberate follow-up for whenever upstream does it. A reconciliation should not do it.

## Verification results

All run in an isolated clone on Node v22.23.0 / npm 10.9.8. No production container, live profile, credentials or registry push.

| Layer | Command | Result |
| --- | --- | --- |
| Install | `npm ci` (clean) | OK |
| Types | `npm run build` (`tsc -p .`) | no TS errors |
| OpenAPI | `npm run generate-openapi && git diff --exit-code openapi.json` | 39 paths, v1.18.1, fresh |
| Unit | `npm run test:unit` (incl. browser-backed), beta.30 | 81/81 suites; 901 passed, 2 skipped (Windows-only) |
| E2E | `npm run test:e2e`, beta.30 / beta.28 | 16/16 suites, 85/85 / 16/16, 85/85 |
| Plugins | `npm run test:plugins` | 7/7 suites, 48/48 |
| MCP | `npm run test:mcp`; `npm audit --prefix mcp --omit=dev` | pass; 0 vulnerabilities |
| Publisher image | `docker buildx build --no-cache -f Dockerfile.ci --platform linux/amd64 … --load` | exit 0; Camoufox beta.28 installed; yt-dlp sha256 OK; cookies import guard OK |
| Default image | `docker build --no-cache .` | exit 0 (TARGETARCH conflict resolution proven) |
| Image closure | in-image `import()` of `lib/cookies.js`, `lib/camoufox-download.js`, `lib/downloads.js`, vnc/persistence/youtube plugins | OK in both images. `playwright-core 1.58.1`; `openclaw`/`undici` absent. |

**Disposable canary**: publisher image, empty named volume, `ENABLE_VNC=1` with a random throwaway password, loopback Docker-assigned ports, navigating only to the server's own loopback URLs.

| Check | Result |
| --- | --- |
| `/health` | ok; 0 profile files before |
| `POST /tabs` with only `userId` | 400 `userId and sessionKey required` |
| `POST /tabs` with `userId`+`sessionKey` → snapshot | 200 / 200 (non-empty) |
| `POST /tabs/:id/download` same-origin | 200, 38 177 B, `attachment; filename="openapi.json"`, 0 `Set-Cookie` |
| `POST /tabs/:id/download` cross-origin | 400 same-origin error |
| noVNC `/vnc.html`; `/websockify` RFB handshake | 200; `RFB 003.008` |
| x11vnc attach | `[vnc-watcher] x11vnc running … on DISPLAY=:0` (socket discovery) |
| Persistence | marker set → `DELETE /sessions` → `profiles/<hash>/{storage-state.json,meta.json}` → **container restart** → same user → marker restored |
| VNC after restart | x11vnc re-attached; RFB `003.008` |
| Health-probe window (~75 s) | 0 `restarting browser`, 0 error-level lines, 0 plugin load failures; vnc, persistence, youtube loaded |
| Cleanup | tabs, sessions, container and volume removed |

## Publication behaviour

`publish-image.yml` triggers on push to `master` and on `workflow_dispatch`. **Merging this PR publishes automatically.** The workflow builds **`Dockerfile.ci`** for `linux/amd64,linux/arm64` and pushes immutable `sha-<commit>` and version tags to GHCR. It does not deploy. `ci.yml` is PR-only. Production promotion stays a separate digest-pinned canary/cutover step (`immutable-container-refresh`).

## Risks and limitations

1. **Root `npm audit`** (informational, not gated): 11 findings (5 moderate, 5 high, 1 critical). Pristine upstream v1.18.1's lock reports 9 (5 moderate, 3 high, 1 critical) with the same advisories. The only additional advisory package is `undici` (counted with its dependents), from the lock-only optional `openclaw` peer tree. Neither is installed in either image (verified). Not changed here.
2. **Raw VNC port**: x11vnc stays loopback inside the container unless `VNC_RFB_BIND` is set, which matches the fork's previous `-localhost`. A host publish of container port 5900 therefore remains unreachable, as before. noVNC (6080) is unaffected.
3. linux/arm64 is not built locally. GitHub-hosted CI results are reported separately on the PR.
4. The Playwright 1.58.1 vs upstream 1.62.1 skew persists. Node 22 vs upstream's Node 24 toolchain still applies (F2 shim).
