import { createClient } from '../helpers/client.js';
import { getSharedEnv } from './sharedEnv.js';

describe('Downloads and Images', () => {
  let serverUrl;
  let testSiteUrl;

  beforeAll(() => {
    const env = getSharedEnv();
    serverUrl = env.serverUrl;
    testSiteUrl = env.testSiteUrl;
  });

  // Server lifecycle managed by globalSetup/globalTeardown

  test('GET /tabs/:tabId/images returns image sources', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/images-page`);
      const result = await client.getImages(tabId, { includeData: true, maxBytes: 1024 * 1024, limit: 10 });

      expect(result.images).toBeDefined();
      expect(Array.isArray(result.images)).toBe(true);
      expect(result.images.length).toBeGreaterThan(0);

      const first = result.images[0];
      expect(first.src).toMatch(/^data:image\/png;base64,/);
      expect(first.alt).toBe('Sample');
      expect(first.dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(first.bytes).toBeGreaterThan(0);
    } finally {
      await client.cleanup();
    }
  });

  test('POST /tabs/:tabId/download returns an authenticated resource body', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/download-page`);
      const response = await fetch(`${serverUrl}/tabs/${tabId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: client.userId, url: `${testSiteUrl}/download-file` }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-disposition')).toContain('hello.txt');
      expect(await response.text()).toBe('hello from camofox test download\n');
    } finally {
      await client.cleanup();
    }
  });

  test('POST /tabs/:tabId/download follows same-origin redirects', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/download-page`);
      const response = await fetch(`${serverUrl}/tabs/${tabId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: client.userId, url: `${testSiteUrl}/download-redirect` }),
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('hello from camofox test download\n');
    } finally {
      await client.cleanup();
    }
  });

  test('POST /tabs/:tabId/download rejects cross-origin redirects', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/download-page`);
      const response = await fetch(`${serverUrl}/tabs/${tabId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: client.userId, url: `${testSiteUrl}/download-cross-origin-redirect` }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Resource redirects must remain on the tab origin' });
    } finally {
      await client.cleanup();
    }
  });

  test('GET /tabs/:tabId/downloads captures browser downloads', async () => {
    const client = createClient(serverUrl);

    try {
      const { tabId } = await client.createTab(`${testSiteUrl}/download-page`);

      // Prefer selector click (stable for test site)
      await client.click(tabId, { selector: '#downloadLink' });

      // Poll downloads until captured
      let downloads = [];
      for (let i = 0; i < 40; i++) {
        const result = await client.getDownloads(tabId, { includeData: true, maxBytes: 1024 * 1024, consume: false });
        downloads = Array.isArray(result.downloads) ? result.downloads : [];
        if (downloads.length > 0) break;
        await new Promise((r) => setTimeout(r, 250));
      }

      expect(downloads.length).toBeGreaterThan(0);
      const first = downloads[0];
      expect(first.suggestedFilename).toBe('hello.txt');
      expect(first.bytes).toBeGreaterThan(0);
      expect(first.dataBase64).toBeDefined();
      expect(typeof first.dataBase64).toBe('string');

      // consume should clear
      const consumed = await client.getDownloads(tabId, { includeData: false, consume: true });
      expect(consumed.downloads).toBeDefined();

      const empty = await client.getDownloads(tabId, { includeData: false, consume: false });
      expect(Array.isArray(empty.downloads)).toBe(true);
      expect(empty.downloads.length).toBe(0);
    } finally {
      await client.cleanup();
    }
  });
});
