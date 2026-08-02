/**
 * Regression tests for two lifecycle races that upstream v1.13.1's page-lease
 * work does NOT cover.
 *
 * 1. Session-creation reap window.
 *    Upstream's `acquirePageLease()` guards `context.newPage()`, but the lease
 *    is taken by the *caller*, after `getSession()` has already published the
 *    new session into `sessions`. `getSession()` then awaits the
 *    `session:created` plugin listeners, which do real I/O (the persistence
 *    plugin reads persisted storage state and imports bootstrap cookies).
 *    During that await the session has zero tab groups and no leases -- the
 *    exact shape every reaper closes -- so a reaper tick lands on it and
 *    `POST /tabs` continues onto a dead context.
 *
 * 2. Health probe vs. intentional browser shutdown.
 *    The probe only fires once ~120s have elapsed with no successful
 *    operation, which sits inside the 300s idle-shutdown window. If idle
 *    shutdown (or admin stop) closes the browser while a probe is in flight,
 *    the probe's failure is a consequence of that teardown -- restarting on it
 *    relaunches the browser immediately after an intentional shutdown.
 *
 * The behavioural cases below drive the real `lib/page-lease.js` primitives and
 * a faithful transcription of the interleaving. The source-contract cases pin
 * the wiring in server.js so the guards cannot be dropped while these pass.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  acquirePageLease,
  hasActivePageLeases,
  releasePageLease,
} from '../../lib/page-lease.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = readFileSync(resolve(__dirname, '../../server.js'), 'utf8');

// Mirrors the empty-session close performed by the tab reaper, pressure
// cleanup, and Fly memory eviction -- all three gate on hasActivePageLeases().
function runEmptySessionReaper(sessions, closed) {
  for (const [userId, session] of sessions) {
    if (session._closing) continue;
    if (session.tabGroups.size === 0 && !hasActivePageLeases(session)) {
      session._closing = true;
      closed.push(userId);
    }
  }
}

// Transcription of getSession()'s creation tail: build the session, publish it,
// await the session:created listeners, then hand it back to the caller.
async function publishSession(sessions, userId, emitCreated, { bootstrapLease }) {
  const created = { context: {}, tabGroups: new Map(), pageLeases: new Set(), lastAccess: Date.now() };
  const lease = bootstrapLease ? acquirePageLease(created) : null;
  sessions.set(userId, created);
  try {
    await emitCreated();
  } finally {
    if (lease) releasePageLease(created, lease);
  }
  return created;
}

describe('session creation reap window', () => {
  // A slow session:created listener, standing in for the persistence plugin's
  // storage-state read + bootstrap cookie import.
  const slowListener = () => new Promise((r) => setTimeout(r, 5));

  test('a reaper tick during session:created closes an unleased new session', async () => {
    const sessions = new Map();
    const closed = [];

    const pending = publishSession(sessions, 'user-1', slowListener, { bootstrapLease: false });
    await new Promise((r) => setTimeout(r, 1));
    runEmptySessionReaper(sessions, closed);
    const session = await pending;

    // Demonstrates the unguarded behaviour this test protects against.
    expect(closed).toEqual(['user-1']);
    expect(session._closing).toBe(true);
  });

  test('a bootstrap lease keeps the same reaper tick off the new session', async () => {
    const sessions = new Map();
    const closed = [];

    const pending = publishSession(sessions, 'user-1', slowListener, { bootstrapLease: true });
    await new Promise((r) => setTimeout(r, 1));
    runEmptySessionReaper(sessions, closed);
    const session = await pending;

    expect(closed).toEqual([]);
    expect(session._closing).toBeUndefined();
    // Released once listeners settle, so the caller's own lease takes over and
    // the session is reapable again once it is genuinely empty.
    expect(hasActivePageLeases(session)).toBe(false);
  });

  test('the lease is released even when a session:created listener throws', async () => {
    const sessions = new Map();
    const failing = () => Promise.reject(new Error('listener blew up'));

    await expect(publishSession(sessions, 'user-1', failing, { bootstrapLease: true }))
      .rejects.toThrow('listener blew up');

    expect(hasActivePageLeases(sessions.get('user-1'))).toBe(false);
  });

  test('server.js holds a bootstrap lease across the session:created emit', () => {
    const tail = SERVER_SRC.slice(
      SERVER_SRC.indexOf('const bootstrapLease = acquirePageLease(created)'),
      SERVER_SRC.indexOf("await pluginEvents.emitAsync('session:created'"),
    );
    expect(tail).toContain('sessions.set(key, created)');
    expect(SERVER_SRC).toMatch(/finally\s*\{\s*releasePageLease\(created, bootstrapLease\);\s*\}/);
  });
});

describe('health probe vs intentional browser shutdown', () => {
  // Transcription of the probe's failure branch: it restarts only when the
  // instance it probed is still the live one.
  function probeFailureAction({ probeBrowser, currentBrowser, isRecovering }) {
    if (currentBrowser !== probeBrowser || isRecovering) return 'abort';
    return 'restart';
  }

  test('does not restart when idle shutdown nulled the browser mid-probe', () => {
    const probed = { id: 'b1' };
    expect(probeFailureAction({ probeBrowser: probed, currentBrowser: null, isRecovering: false }))
      .toBe('abort');
  });

  test('does not restart when another restart already replaced the browser', () => {
    const probed = { id: 'b1' };
    expect(probeFailureAction({ probeBrowser: probed, currentBrowser: { id: 'b2' }, isRecovering: false }))
      .toBe('abort');
    expect(probeFailureAction({ probeBrowser: probed, currentBrowser: probed, isRecovering: true }))
      .toBe('abort');
  });

  test('still restarts on a genuine hang of the live browser', () => {
    const probed = { id: 'b1' };
    expect(probeFailureAction({ probeBrowser: probed, currentBrowser: probed, isRecovering: false }))
      .toBe('restart');
  });

  test('server.js pins the probed instance and aborts when it is gone', () => {
    expect(SERVER_SRC).toContain('const probeBrowser = browser;');
    expect(SERVER_SRC).toContain('testContext = await probeBrowser.newContext();');
    expect(SERVER_SRC).toMatch(/if \(browser !== probeBrowser \|\| healthState\.isRecovering\) \{[\s\S]{0,200}?return;/);
    // The abort must precede the restart call in the same catch block.
    const catchBlock = SERVER_SRC.slice(
      SERVER_SRC.indexOf('const probeBrowser = browser;'),
      SERVER_SRC.indexOf("restartBrowser('health probe failed')"),
    );
    expect(catchBlock).toContain('browser !== probeBrowser');
  });
});
