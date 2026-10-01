import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Upstream v1.17 made plugin.ts import its two API types from
// `openclaw/plugin-sdk/core` and added `openclaw@2026.9.4` as a devDependency so
// tsc can resolve them. That package's preinstall hook hard-fails on Node < 24.16
// ("this OpenClaw release requires Node >=24.16.0"), and this fork pins Node 22
// everywhere to match the node:22-trixie-slim image it ships -- so carrying the
// devDependency makes `npm ci` impossible here.
//
// The devDependency is therefore dropped and the module is declared locally
// instead. `npm run build` is `tsc -p . || true`, so a broken type import would
// be invisible: this test is what keeps the type-check honest.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

describe('OpenClaw plugin type surface', () => {
  test('does not depend on a package that cannot install on the pinned Node major', () => {
    expect(pkg.devDependencies).not.toHaveProperty('openclaw');
    // The optional peer dependency stays: it documents the supported host
    // version for consumers and npm never installs it.
    expect(pkg.peerDependencies.openclaw).toBe('>=2026.9.4');
    expect(pkg.peerDependenciesMeta.openclaw.optional).toBe(true);
  });

  test('plugin.ts type-checks, so the OpenClaw SDK type import still resolves', () => {
    let output = '';
    let failed = false;
    try {
      output = execFileSync(
        process.execPath,
        [path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', '.', '--noEmit'],
        { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (err) {
      failed = true;
      output = `${err.stdout || ''}${err.stderr || ''}`;
    }

    // TS2307 is specifically "Cannot find module" -- the failure mode a missing
    // `openclaw` package produces.
    expect(output).not.toMatch(/TS2307/);
    expect(failed ? output : '').toBe('');
  });
}, 60_000);
