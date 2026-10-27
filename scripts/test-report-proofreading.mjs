import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from '../api/report-proofread.js';
import { sameReportNumbers, chunkProofreadBlocks } from '../src/utils/reportProofreading.js';

const USER = '11111111-1111-4111-8111-111111111111';
const BASE = 'https://example.supabase.co';
const originalFetch = globalThis.fetch;
const originalEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_AI_API_TOKEN: process.env.CLOUDFLARE_AI_API_TOKEN,
};
const blocks = [{ id: 'b0', text: 'Tổ có 6 giáo viên, dự giờ 12 tiết.' }];
const mkReq = (body = { departmentId: 'english', mode: 'formal', blocks }, headers = {}) => ({
  method: 'POST', body,
  headers: { host: 'esl-brian.vercel.app', origin: 'https://esl-brian.vercel.app', authorization: 'Bearer testjwt', ...headers },
});
const mkRes = () => ({
  statusCode: 200, headers: {},
  setHeader(k, v) { this.headers[k] = v; return this; },
  status(value) { this.statusCode = value; return this; },
  json(body) { this.body = body; return this; },
});
const response = (obj, ok = true, status = 200) => ({ ok, status, json: async () => obj });
let cfCalls = 0;
let changedText = 'Tổ có 6 giáo viên; thực hiện dự giờ 12 tiết.';
let workspace = 'english';
let responseKind = 'jsonText';
let lastCloudflareBody = null;
function mockFetch() {
  globalThis.fetch = async (url, options) => {
    if (url === BASE + '/auth/v1/user') return response({ id: USER });
    if (url.includes('/rest/v1/profiles?')) return response([{ role: 'department_head', approved: true }]);
    if (url.includes('/rest/v1/department_team_workspaces?')) return response([{ payload: { departments: [{ id: workspace }] } }]);
    if (url.includes('api.cloudflare.com')) {
      cfCalls++;
      lastCloudflareBody = JSON.parse(options.body);
      if (responseKind === 'badJson') return response({ success: true, result: { response: 'Sorry, I cannot format this as JSON.' } });
      if (responseKind === 'jsonNotMet') return response({ success: false, errors: [{ message: "JSON Mode couldn't be met" }] }, false, 400);
      if (responseKind === 'quota') return response({ success: false, errors: [{ message: 'quota exceeded' }] }, false, 429);
      if (responseKind === 'plain') return response({ success: true, result: { response: changedText } });
      const revisions = [{ id: 'b0', text: changedText }];
      return response({ success: true, result: { response: responseKind === 'object' ? { revisions } : JSON.stringify({ revisions }) } });
    }
    throw new Error('Unexpected URL in test: ' + url);
  };
}
process.env.SUPABASE_URL = BASE;
process.env.SUPABASE_ANON_KEY = 'public-test-anon-key';
process.env.CLOUDFLARE_ACCOUNT_ID = '11111111111111111111111111111111';
process.env.CLOUDFLARE_AI_API_TOKEN = 'server-only-test-token';

test('Numeric invariants preserve counts, dates and class numbers', () => {
  assert.equal(sameReportNumbers('6 GV, ngày 27/10/2026', '6 giáo viên - ngày 27/10/2026'), true);
  assert.equal(sameReportNumbers('6 GV', '7 GV'), false);
  assert.equal(chunkProofreadBlocks(Array.from({ length: 14 }, (_, i) => ({ id: 'b' + i, text: 'Nội dung' }))).length, 2);
});
test('POST rejects invalid input before provider call', async () => {
  mockFetch(); cfCalls = 0;
  const res = mkRes();
  await handler(mkReq({ departmentId: 'english', mode: 'formal', blocks: [{ id: 'invalid', text: 'Hi' }] }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(cfCalls, 0);
});
test('Signed-out user is denied before provider', async () => {
  mockFetch(); cfCalls = 0;
  const res = mkRes();
  await handler(mkReq(undefined, { authorization: '' }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(cfCalls, 0);
});
test('Foreign department ID is denied before provider', async () => {
  mockFetch(); cfCalls = 0;
  const res = mkRes();
  await handler(mkReq({ departmentId: 'not-my-department', mode: 'formal', blocks }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(cfCalls, 0);
});
test('Unconfigured Cloudflare is safe and fails closed', async () => {
  mockFetch(); cfCalls = 0;
  const key = process.env.CLOUDFLARE_AI_API_TOKEN;
  delete process.env.CLOUDFLARE_AI_API_TOKEN;
  const res = mkRes(); await handler(mkReq(), res);
  process.env.CLOUDFLARE_AI_API_TOKEN = key;
  assert.equal(res.statusCode, 503);
  assert.equal(cfCalls, 0);
});
test('AI changing numeric facts is blocked', async () => {
  mockFetch(); changedText = 'Tổ có 7 giáo viên, dự giờ 12 tiết.';
  const res = mkRes(); await handler(mkReq(), res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, 'FACT_GUARD');
});
test('Valid same-fact response returns revisions for human approval', async () => {
  mockFetch(); changedText = 'Tổ có 6 giáo viên; thực hiện dự giờ 12 tiết.';
  const res = mkRes(); await handler(mkReq(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.revisions[0].id, 'b0');
  assert.equal(res.body.revisions[0].text, changedText);
});
test('No paid-model fallback configured', async () => {
  assert.equal(String(handler).includes('api.cloudflare.com'), true);
  assert.equal(String(handler).includes('openrouter'), false);
});
test.after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('Cloudflare structured object response is accepted without JSON.parse on an object', async () => {
  mockFetch(); responseKind = 'object'; changedText = 'Tổ có 6 giáo viên; thực hiện dự giờ 12 tiết.';
  const res = mkRes(); await handler(mkReq(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.revisions[0].text, changedText);
  assert.equal(lastCloudflareBody.response_format.type, 'json_schema');
});
test('Malformed response triggers bounded recovery signal without rewriting original', async () => {
  mockFetch(); responseKind = 'badJson';
  const res = mkRes(); await handler(mkReq(), res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, 'AI_FORMAT');
});
test('JSON mode failure is explicitly recoverable', async () => {
  mockFetch(); responseKind = 'jsonNotMet';
  const res = mkRes(); await handler(mkReq(), res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.code, 'AI_FORMAT');
});
test('Single-paragraph plain text fallback never requires JSON', async () => {
  mockFetch(); responseKind = 'plain'; changedText = 'Tổ có 6 giáo viên; thực hiện dự giờ 12 tiết.';
  const res = mkRes(); await handler(mkReq({departmentId:'english',mode:'formal',blocks,plain:true}),res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.revisions[0].text, changedText);
  assert.equal(lastCloudflareBody.response_format, undefined);
});
test('Quota errors fail closed, no model swap', async () => {
  mockFetch(); responseKind = 'quota';
  const res = mkRes(); await handler(mkReq(),res);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.code, 'FREE_QUOTA');
});
