import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const uploadApi = await readFile(new URL('../api/work-hub-file-upload.js', import.meta.url), 'utf8');

assert.ok(
  uploadApi.includes("req.headers.origin"),
  'Resumable upload initialization must capture the browser Origin from the same-origin API request.',
);
assert.ok(
  uploadApi.includes("'Origin': browserOrigin") || uploadApi.includes('Origin: browserOrigin'),
  'The browser Origin must be forwarded when Google Drive creates the resumable upload session so the later browser PUT receives matching CORS headers.',
);
assert.ok(
  uploadApi.includes('browserOrigin,') && uploadApi.includes('initializeResumableUpload(accessToken'),
  'The captured browser Origin must be passed into the resumable-session initializer.',
);

console.log('PASS: Drive resumable sessions preserve the browser Origin for TTCM direct uploads.');
