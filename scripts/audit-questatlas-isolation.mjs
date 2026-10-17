import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('src/features/questatlas');
for (const file of fs.readdirSync(root)) {
  if (!/\.(jsx|js|mjs)$/.test(file)) continue;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(source, /\b(openrouter|kira-chat|gemini|anthropic|openai|ai-sdk)\b/i, 'No AI SDK/provider allowed in QuestAtlas: ' + file);
  if (/\bfetch\s*\(/.test(source)) {
    assert.equal(file,'guestGateway.mjs','Only the allowlisted guest API client may call fetch.');
    assert.match(source,/fetch\('\/api\/questatlas-live'/);
    assert.doesNotMatch(source,/https?:\/\//,'Guest browser client must not call external URLs.');
  }
}
assert.match(fs.readFileSync('src/data/apps.js', 'utf8'), /slug:\s*'questatlas'/);
assert.match(fs.readFileSync('src/pages/ToolPage.jsx', 'utf8'), /tool\?\.slug === 'questatlas'/);
assert.match(fs.readFileSync('src/features/questatlas/QuestAtlas.jsx', 'utf8'), /supabase\.from\(table\)/);
assert.match(fs.readFileSync('src/main.jsx','utf8'), /selectedTool\?\.slug !== 'questatlas'/);
console.log('QuestAtlas isolation PASS: no AI APIs; only approved same-origin gateway requests allowed.');
