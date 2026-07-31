import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbiddenFiles = [
  'api/ai.js', 'server/openrouterGateway.js', 'server/lessonAiHandler.js',
  'public/bes-ai-dock-v2', 'public/bes-ai-governance-v1165',
];
const failures = [];
for (const item of forbiddenFiles) {
  if (fs.existsSync(path.join(root, item))) failures.push(`Still exists: ${item}`);
}
const scanRoots = ['api', 'server', 'src', 'index.html'];
const forbidden = [/openrouter\.ai/i, /OPENROUTER_API_KEY/, /qwen\/qwen3\.6-plus/i, /\/api\/ai\b/];
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
  forbidden.forEach((pattern) => { if (pattern.test(text)) failures.push(`${target}: ${pattern}`); });
}
scanRoots.forEach(scan);
const main = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
if (main.includes("currentRoute === 'ai-workspace'") || main.includes("currentRoute === 'ai-governance'")) failures.push('AI routes still render in main.jsx');
const apps = fs.readFileSync(path.join(root, 'src/data/apps.js'), 'utf8');
if (/slug:\s*['"]ai-workspace['"]/.test(apps)) failures.push('AI Workspace card still registered');
if (failures.length) {
  console.error('NO-AI AUDIT FAILED');
  failures.forEach((item) => console.error(' -', item));
  process.exit(1);
}
console.log('✅ No OpenRouter endpoint, API route, global AI surface or AI-only route remains active.');
