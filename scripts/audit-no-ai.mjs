import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const add = (name, pass) => {
  checks.push({ name, pass: Boolean(pass) });
  if (!pass) failures.push(name);
};

add('Secure OpenRouter API route exists', exists('api/ai.js'));
add('Legacy Kira API route is removed', !exists('api/kira-chat.js'));
add('Global chatbot exists', exists('src/components/SharedChatbotDrawer.jsx'));
add('TextCare AI assistant exists', exists('src/components/TextCareAiAssistant.jsx'));
add('Game AI creator exists', exists('src/components/GameAiCreator.jsx'));

if (exists('api/ai.js')) {
  const api = read('api/ai.js');
  add('Server calls OpenRouter chat completions', api.includes('https://openrouter.ai/api/v1/chat/completions'));
  add('Server reads OPENROUTER_API_KEY', api.includes('process.env.OPENROUTER_API_KEY'));
  add('Default model uses free router', api.includes("'openrouter/free'"));
  add('Server includes OpenRouter attribution headers', api.includes("'HTTP-Referer'") && api.includes("'X-OpenRouter-Title'"));
  add('Server verifies user session', api.includes('verifyUser(req)'));
  add('Server enforces minute and daily limits', api.includes('checkMinuteLimit') && api.includes('checkDailyLimit'));
}

if (exists('src/utils/gemini.js')) {
  const client = read('src/utils/gemini.js');
  add('Browser client calls relative shared gateway', client.includes("fetch('/api/ai'"));
  add('Browser client obtains Supabase session token', client.includes('supabase.auth.getSession()'));
  add('Browser client contains no OpenRouter key', !client.includes('OPENROUTER_API_KEY'));
  add('Browser client does not call OpenRouter directly', !client.includes('https://openrouter.ai'));
}

if (exists('src/components/SharedChatbotDrawer.jsx')) {
  const chatbot = read('src/components/SharedChatbotDrawer.jsx');
  add('Chatbot uses shared callAI client', chatbot.includes("import { callAI }") && chatbot.includes("task: 'chat'"));
  add('Chatbot identifies OpenRouter runtime', chatbot.includes('OpenRouter'));
  add('Chatbot no longer calls Kira endpoint', !chatbot.includes('/api/kira-chat'));
}

if (exists('src/pages/TextCareGoogleWorkspace.jsx')) {
  const textcare = read('src/pages/TextCareGoogleWorkspace.jsx');
  add('TextCare mounts the AI assistant', textcare.includes('TextCareAiAssistant'));
  add('TextCare can apply AI output to editor', textcare.includes('applyAiText'));
}

if (exists('src/pages/ToolPage.jsx')) {
  const tools = read('src/pages/ToolPage.jsx');
  add('Game routes mount GameAiCreator', tools.includes('GameAiCreator') && tools.includes('renderGame'));
}

if (exists('src/utils/aiRemovalGuard.js')) {
  const guard = read('src/utils/aiRemovalGuard.js');
  add('Runtime guard enables OpenRouter instead of deleting AI', guard.includes("dataset.aiChatbot = 'openrouter'") && !guard.includes('MutationObserver'));
}

const runtimeRoots = ['src', 'server', 'api'];
const forbidden = [
  /https:\/\/kiraai\.vn/i,
  /\bKIRAAI_API_KEY\b/,
  /\bNEXT_PUBLIC_OPENROUTER_API_KEY\b/,
  /\bVITE_OPENROUTER_API_KEY\b/,
];
const violations = [];

function scan(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(full)) {
      if (['node_modules', 'dist', 'archive', 'vendor'].includes(name)) continue;
      scan(path.join(target, name));
    }
    return;
  }
  if (!/\.(?:js|jsx|mjs|cjs|ts|tsx|json|html)$/.test(full)) return;
  const text = fs.readFileSync(full, 'utf8');
  if (forbidden.some((pattern) => pattern.test(text))) violations.push(target);
}

runtimeRoots.forEach(scan);
add('No Kira endpoint or public OpenRouter key remains in runtime', violations.length === 0);

for (const item of checks) console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
if (violations.length) console.error('Forbidden runtime references:', violations.join(', '));
if (failures.length) {
  console.error(`\n❌ OpenRouter Phase 1 audit FAILED (${checks.length - failures.length}/${checks.length})`);
  process.exit(1);
}
console.log(`\n✅ OpenRouter Phase 1 audit PASS (${checks.length}/${checks.length})`);
