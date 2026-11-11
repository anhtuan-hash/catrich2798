import fs from 'node:fs';
import assert from 'node:assert/strict';
import gateway from '../api/gateway.js';

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing required file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function has(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`${label}: missing ${needle}`);
}

const client = read('src/utils/clientErrorTelemetry.js');
const endpoint = read('serverless-handlers/_client-error-report.js');
const runtimeCore = read('src/services/runtime/core.js');

has(client, "addEventListener('error'", 'window.error capture');
has(client, "addEventListener('unhandledrejection'", 'unhandled rejection capture');
has(client, "'/api/client-error-report'", 'same-origin telemetry endpoint');
has(client, 'keepalive: true', 'unload-safe reporting');
has(client, 'MAX_REPORTS_PER_SESSION', 'session report cap');
has(client, 'REDACT', 'client redaction');
has(endpoint, "req.method !== 'POST'", 'POST-only endpoint');
has(endpoint, 'browserOrigin', 'origin validation');
has(endpoint, 'MAX_MESSAGE_LENGTH', 'message cap');
has(endpoint, '[client-error]', 'structured Vercel log marker');
has(runtimeCore, 'installClientErrorTelemetry', 'runtime bootstrap telemetry install');

console.log('Client error telemetry contract OK');

const config = JSON.parse(read('vercel.json'));
assert.deepEqual(config.rewrites.find(rule => rule.source === '/api/client-error-report'), {
  source: '/api/client-error-report', destination: '/api/gateway?handler=client-error-report',
});
async function request(overrides = {}) {
  const req = { method: 'POST', query: { handler: 'client-error-report' },
    headers: { origin: 'https://brian.example.test', host: 'brian.example.test', 'x-forwarded-for': '192.0.2.1' },
    body: { message: 'Example error' }, ...overrides };
  const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; },
    end(value) { this.body = JSON.parse(value); } };
  await gateway(req, response);
  return response;
}
assert.equal((await request({method: 'GET'})).statusCode, 405);
assert.equal((await request({headers: {origin:'https://other.example.test',host:'brian.example.test'}})).statusCode, 403);
assert.equal((await request({body: {}})).statusCode, 400);
const logs = [];
const originalError = console.error;
try {
  console.error = (...args) => logs.push(args.join(' '));
  const accepted = await request({body: {message: 'teacher@example.test Bearer dummy-token', stack: 'x'.repeat(2200)}});
  assert.equal(accepted.statusCode, 202);
  assert.equal(accepted.headers['Cache-Control'], 'no-store');
  assert.ok(logs[0].includes('[email-redacted]'));
  assert.ok(!logs[0].includes('teacher@example.test') && !logs[0].includes('dummy-token'));
  const payload = JSON.parse(logs[0].slice('[client-error] '.length));
  assert.equal(payload.stack.length, 1800);
  for (let i = 0; i < 18; i++) assert.equal((await request()).statusCode, 202);
  assert.equal((await request()).statusCode, 429);
} finally { console.error = originalError; }
console.log('PASS: gateway preserves telemetry URL, method/origin checks, redaction, limits and responses.');
