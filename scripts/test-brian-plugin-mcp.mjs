import assert from 'node:assert/strict';
import fs from 'node:fs';

const gateway = fs.readFileSync('api/gateway.js','utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json','utf8'));
const mcp = fs.readFileSync('serverless-handlers/_brian-mcp.js','utf8');
const bank = fs.readFileSync('serverless-handlers/_question-bank.js','utf8');
const page = fs.readFileSync('src/pages/QuestionBank.jsx','utf8');
const main = fs.readFileSync('src/main.jsx','utf8');
const consent = fs.readFileSync('src/pages/BrianOAuthConsent.jsx','utf8');
const plugin = JSON.parse(fs.readFileSync('plugins/brian-question-bank/plugin.json','utf8'));
const mcpManifest = JSON.parse(fs.readFileSync('plugins/brian-question-bank/mcp.json','utf8'));
const skill = fs.readFileSync('plugins/brian-question-bank/skills/brian-question-bank/SKILL.md','utf8');

assert.ok(gateway.includes("'brian-mcp': brianMcp"));
assert.ok(gateway.includes("'brian-oauth-resource': oauthProtectedResource"));
assert.ok(vercel.rewrites.some((r)=>r.source==='/mcp' && r.destination.includes('handler=brian-mcp')));
assert.ok(vercel.rewrites.some((r)=>r.source==='/.well-known/oauth-protected-resource' && r.destination.includes('handler=brian-oauth-resource')));

for (const token of [
  "'server/discover'",
  "'initialize'",
  "'tools/list'",
  "'tools/call'",
  "'mcp/www_authenticate'",
  "'io.modelcontextprotocol/serverInfo'",
  "securitySchemes",
  "save_brian_questions",
  "save_brian_exam",
  "search_brian_questions",
  "get_brian_exam",
  "auth.getUser(token)",
  "sourceKind: 'plugin'",
]) assert.ok(mcp.includes(token), 'MCP contract missing: '+token);

for (const token of ['saveQuestions','saveExam','searchQuestions','getExam','serverClient']) {
  assert.ok(bank.includes(token), 'Question Bank service export missing: '+token);
}
assert.ok(bank.includes("session.integration?.id || null"), 'Plugin import audit must tolerate OAuth sessions without legacy integration rows.');

assert.equal(plugin.$schema,'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
assert.equal(plugin.name,'brian-question-bank');
assert.equal(mcpManifest.$schema,'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
assert.equal(mcpManifest.mcpServers.brian.type,'streamable-http');
assert.equal(mcpManifest.mcpServers.brian.url,'https://esl-brian.vercel.app/mcp');

for (const token of ['search_brian_questions','save_brian_questions','save_brian_exam','get_brian_exam','functional_cloze_6','reading_8','reading_10']) {
  assert.ok(skill.includes(token), 'Plugin skill missing: '+token);
}

for (const token of [
  'getAuthorizationDetails(authorizationId)',
  'approveAuthorization(authorizationId)',
  'denyAuthorization(authorizationId)',
  'Cho phép & kết nối',
]) assert.ok(consent.includes(token), 'OAuth consent missing: '+token);

assert.ok(main.includes("'oauth-consent'"));
assert.ok(main.includes("pathname === '/oauth/consent'"));
assert.ok(main.includes('finishLoginNavigation'));
assert.ok(page.includes('Plugin / MCP'));
assert.ok(page.includes('MCP SERVER URL — DÙNG ĐỂ TẠO PLUGIN'));
assert.ok(page.includes('Legacy API / GPT Action'));
assert.ok(page.includes('fetchAllOwnedRows'), 'Question Bank must paginate beyond the old 500-row cap.');

// Legacy GPT Action remains available as a safe fallback.
assert.ok(vercel.rewrites.some((r)=>r.source==='/api/question-bank'));
assert.ok(page.includes('brian-question-bank-openapi.json'));

console.log('PASS: Brian Plugin/MCP + OAuth + legacy fallback contract is intact.');
