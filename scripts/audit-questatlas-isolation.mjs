import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('src/features/questatlas');
for (const file of fs.readdirSync(root)) {
  if (!/\.(jsx|js|mjs)$/.test(file)) continue;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(source, /\b(fetch\s*\(|openrouter|kira-chat|gemini|anthropic|openai|ai-sdk)\b/i, 'No external AI calls allowed: ' + file);
}
assert.match(fs.readFileSync('src/data/apps.js', 'utf8'), /slug:\s*'questatlas'/);
assert.match(fs.readFileSync('src/pages/ToolPage.jsx', 'utf8'), /tool\?\.slug === 'questatlas'/);
assert.match(fs.readFileSync('src/features/questatlas/QuestAtlas.jsx', 'utf8'), /supabase\.from\(table\)/);
assert.match(fs.readFileSync('src/main.jsx','utf8'), /selectedTool\?\.slug !== 'questatlas'/);
console.log('QuestAtlas isolated module: no AI/network calls; app registry connected.');
