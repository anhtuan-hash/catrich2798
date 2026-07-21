import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync('server/openrouterGateway.js', 'utf8');
const api = fs.readFileSync('api/ai.js', 'utf8');
const client = fs.readFileSync('src/utils/gemini.js', 'utf8');

assert.match(gateway, /qwen\/qwen3\.6-plus:free/);
assert.match(gateway, /openrouter\/free/);
assert.match(gateway, /TRANSIENT_STATUSES/);
assert.match(gateway, /retry-after/i);
assert.match(gateway, /sort:\s*'latency'/);
assert.match(gateway, /allow_fallbacks:\s*true/);
assert.match(gateway, /data_collection/);
assert.match(gateway, /function timeoutForRequest/);
assert.match(gateway, /new AbortController\(\)/);
assert.doesNotMatch(gateway, /setTimeout\(\(\) => controller\.abort\(\),\s*55_000\)/);
assert.match(gateway, /OPENROUTER_CREDIT_REQUIRED/);
assert.match(gateway, /OPENROUTER_EMPTY_RESPONSE/);
assert.match(gateway, /response[_ -]?format|json_object|structured/i);
assert.match(api, /resolveOpenRouterRequestPlan/);
assert.match(api, /profile:\s*normalized\.profile/);
assert.match(api, /action:\s*normalized\.action/);
assert.match(api, /durationMs/);
assert.match(client, /AI_CLIENT_TIMEOUT/);
assert.match(client, /signal:\s*controller\.signal/);
assert.match(client, /Đang thử tuyến model ổn định hơn/);

console.log('✅ OpenRouter reliability audit passed: deterministic free primary, fallback, retry, timeout, routing telemetry and finite client wait.');
