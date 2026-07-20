import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const providers = read('src/utils/aiProviders.js');
const catalog = read('src/data/aiProviderCatalog.js');
const browserClient = read('src/utils/gemini.js');
const api = read('api/ai.js');
const governanceApi = read('api/ai-governance.js');
const gateway = read('server/openrouterGateway.js');
const governancePage = read('src/pages/AIGovernanceCenter.jsx');
const settings = read('src/pages/Settings.jsx');
const main = read('src/main.jsx');
const migration = read('supabase/brian_v11_6_7_openrouter_gateway.sql');
const lessonHandler = read('server/lessonAiHandler.js');
const smartId = read('src/pages/SmartIdStudio.jsx');
const selector = read('src/components/AISmartModelSelector.jsx');

add('Provider registry contains OpenRouter only', providers.includes("id: 'openrouter'") && !/id:\s*'(gemini|openai|groq|mistral|cohere|claude|custom)'/.test(providers));
add('Provider catalog contains OpenRouter only', catalog.includes("id: 'openrouter'") && !/id:\s*'(gemini|openai|groq|mistral|cohere|claude|custom)'/.test(catalog));
add('No browser persistence of a real AI key', providers.includes('Deliberately do not persist provider keys') && providers.includes('__BRIAN_SERVER_GATEWAY__') && !providers.includes('localStorage.setItem(AI_CONFIGS_KEY'));
add('Browser AI client calls one relative gateway', browserClient.includes("fetch('/api/ai'") && browserClient.includes('Authorization: `Bearer ${token}`') && !browserClient.includes('https://openrouter.ai'));
add('Browser AI client obtains Supabase session token', browserClient.includes('supabase.auth.getSession()') && browserClient.includes('AI_AUTH_REQUIRED'));
add('Browser payload does not send provider, model, base URL or key', !/body:\s*JSON\.stringify\([\s\S]{0,1200}\b(apiKey|baseUrl|provider)\s*:/.test(browserClient));
add('Server gateway uses OpenRouter chat completions only', gateway.includes("https://openrouter.ai/api/v1/chat/completions") && gateway.includes('OPENROUTER_API_KEY'));
add('OpenRouter key is read only on server', gateway.includes('process.env.OPENROUTER_API_KEY') && !browserClient.includes('OPENROUTER_API_KEY'));
add('OpenRouter attribution headers are server-side', gateway.includes("'HTTP-Referer'") && gateway.includes("'X-OpenRouter-Title'"));
add('AI endpoint requires approved authenticated roles', api.includes("requireApprovedUser(req, { roles: ['admin', 'department_head', 'teacher'] })"));
add('AI endpoint enforces central rate and token quotas', api.includes('enforceRateLimit') && api.includes('reserveServerAiQuota') && api.includes('settleServerAiQuota'));
add('AI endpoint writes server audit events', api.includes('appendApiAudit') && api.includes("endpoint: '/api/ai'"));
add('Client cannot choose provider or model', api.includes("provider: 'openrouter'") && !api.includes('body.provider') && !api.includes('body.model'));
add('Admin-only governance endpoint controls shared settings', governanceApi.includes("roles: ['admin']") && governanceApi.includes('writeServerAiSettings'));
add('Admin governance page uses authenticated server endpoint', governancePage.includes("fetch('/api/ai-governance'") && governancePage.includes("currentUser?.role !== 'admin'"));
add('Settings exposes no AI key input or provider chooser', !settings.includes('Thêm API key mới') && !settings.includes('AI Provider Hub') && !settings.includes('Fallback thông minh') && settings.includes('OPENROUTER_API_KEY'));
add('Teacher settings state says server managed', settings.includes('Giáo viên không cần và không thể nhập API key'));
add('Model selector is admin-managed and read-only', selector.includes('OpenRouter') && selector.includes('Server') && !selector.includes('<select'));
add('Main no longer installs legacy provider input guard', !main.includes('installProviderHubInputGuard'));
add('Legacy lesson provider handler is disabled', lessonHandler.includes('LEGACY_AI_ENDPOINT_REMOVED') && !lessonHandler.includes('api.openai.com') && !lessonHandler.includes('generativelanguage'));
add('SmartID uses shared gateway and no direct provider endpoint', smartId.includes('callAI') && !smartId.includes('generativelanguage.googleapis.com') && !smartId.includes('x-goog-api-key'));
add('Migration creates shared settings and per-user daily usage', migration.includes('create table if not exists public.ai_runtime_settings') && migration.includes('create table if not exists public.ai_usage_daily'));
add('Migration creates atomic quota reserve and settle RPCs', migration.includes('bes_ai_reserve_quota_v1167') && migration.includes('bes_ai_settle_quota_v1167'));

const runtimeRoots = ['src', 'server', 'api'];
const forbidden = [
  /https:\/\/api\.openai\.com/i,
  /https:\/\/generativelanguage\.googleapis\.com/i,
  /https:\/\/api\.groq\.com/i,
  /https:\/\/api\.mistral\.ai/i,
  /https:\/\/api\.cohere\.ai/i,
  /https:\/\/api\.anthropic\.com/i,
  /\bOPENAI_API_KEY\b/,
  /\bGEMINI_API_KEY\b/,
  /\bGROQ_API_KEY\b/,
  /\bANTHROPIC_API_KEY\b/,
];
const violations = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['vendor', 'archive', 'node_modules', 'dist'].includes(entry.name)) continue;
      scan(full);
    } else if (/\.(js|jsx|mjs|ts|tsx)$/.test(entry.name)) {
      const text = read(full);
      if (forbidden.some((pattern) => pattern.test(text))) violations.push(full);
    }
  }
}
runtimeRoots.forEach((root) => scan(root));
add('No active runtime file calls or configures another AI provider', violations.length === 0);

for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
const failed = checks.filter((item) => !item.pass);
if (violations.length) console.error('Forbidden runtime provider references:', violations.join(', '));
if (failed.length) {
  console.error(`\n❌ OpenRouter-only audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ OpenRouter-only server gateway audit PASS (${checks.length}/${checks.length})`);
