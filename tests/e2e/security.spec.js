import { test, expect } from '@playwright/test';

test.skip(!process.env.BES_E2E_BASE_URL, 'API security E2E requires a deployed Vercel URL.');

test('AI gateway rejects anonymous requests', async ({ request }) => {
  const response = await request.post('/api/ai', { data: { mode: 'health', payload: {} } });
  expect([401, 403]).toContain(response.status());
  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.requestId).toBeTruthy();
});

test('upload endpoint rejects anonymous requests', async ({ request }) => {
  const response = await request.post('/api/google-drive-upload', {
    headers: { 'content-type': 'text/plain', 'x-file-name': 'test.txt', 'x-resource-metadata': Buffer.from('{}').toString('base64') },
    data: 'hello',
  });
  expect(response.status()).toBeGreaterThanOrEqual(400);
});
