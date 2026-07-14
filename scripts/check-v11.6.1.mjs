import fs from 'node:fs';
import { PROVIDERS, defaultConfigs } from '../src/utils/aiProviders.js';
const requiredProviders = ['groq','cerebras','mistral','sambanova','cohere','openrouter','nvidia','cloudflare'];
const files = [
  ['src/utils/aiProviders.js', ['helpUrl','keyUrl','Cerebras Inference','SambaNova Cloud','Cloudflare Workers AI','openrouter/free']],
  ['src/pages/Settings.jsx', ['settings-v47-provider-links','Hướng dẫn lấy key','Lấy API key','settings-v47-detail-links','provider-plan']],
  ['src/styles/legacy/03-operations.css', ['V11.6.1 — Free Provider Hub','grid-column:1/-1','settings-v47-provider-select','settings-v47-provider-links','@media (max-width:700px)']],
  ['src/utils/gemini.js', ['callCohereProvider','info.kind === \'cohere\'']],
];
let passed = 0;
for (const [file,tokens] of files) {
  const source = fs.readFileSync(file,'utf8');
  for (const token of tokens) { if (!source.includes(token)) throw new Error(`${file} missing ${token}`); passed += 1; }
}
const ids = new Set(PROVIDERS.map((p)=>p.id));
for (const id of requiredProviders) { if (!ids.has(id)) throw new Error(`Missing provider ${id}`); passed += 1; }
for (const provider of PROVIDERS) {
  if (!provider.label || !provider.defaultModel || !provider.baseUrl) throw new Error(`Incomplete provider ${provider.id}`);
  if (provider.id !== 'custom' && (!provider.helpUrl || !provider.keyUrl)) throw new Error(`Missing official links for ${provider.id}`);
}
passed += PROVIDERS.length;
const configs = defaultConfigs();
if (Object.keys(configs).length !== PROVIDERS.length) throw new Error('defaultConfigs provider count mismatch');
passed += 1;
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(pkg.version!=='11.6.1') throw new Error(`Expected 11.6.1, got ${pkg.version}`);
passed += 1;
console.log(`V11.6.1 Free Provider Hub checks: ${passed}/${passed} PASS`);
