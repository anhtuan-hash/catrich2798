import fs from 'node:fs';

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

const gateway = read('api/gateway.js');
const vercel = JSON.parse(read('vercel.json'));
has(gateway, "'client-error-report': clientErrorReport", 'client error gateway preservation');
const route = vercel.rewrites.find((entry) => entry.source === '/api/client-error-report');
if (route?.destination !== '/api/gateway?handler=client-error-report') throw new Error('Client error endpoint rewrite missing');
if (fs.existsSync('api/client-error-report.js')) throw new Error('Client error reporter must not count twice toward Hobby function budget');
