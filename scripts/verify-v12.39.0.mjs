import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const { PROVIDER_CATALOG } = await import('../src/data/aiProviderCatalog.js');
const catalog = read('src/data/aiProviderCatalog.js');
const providers = read('src/utils/aiProviders.js');
const overrides = read('src/utils/aiProviderOverrides.js');
const routing = read('src/utils/aiSmartRouting.js');
const openRouter = read('src/utils/openRouter.js');
const media = read('src/utils/aiMedia.js');
const server = read('server/unifiedAiProviderAdapter.js');
const hub = read('src/utils/aiProviderHubRuntime.js');
const smartId = read('src/pages/SmartIdStudio.jsx');
const manifest = JSON.parse(read('public/version.json'));
const version = read('src/config/version.js');

assert.equal(fs.existsSync('src/utils/gemini.js'), false, 'legacy provider runtime must be removed');
assert.equal(fs.existsSync('src/utils/openRouter.js'), true, 'OpenRouter runtime must exist');
assert.equal(PROVIDER_CATALOG.length, 1, 'provider catalog must contain exactly one provider');
assert.equal(PROVIDER_CATALOG[0]?.id, 'openrouter', 'the only provider must be OpenRouter');
assert.equal(PROVIDER_CATALOG[0]?.baseUrl, 'https://openrouter.ai/api/v1');
assert.ok(PROVIDER_CATALOG[0]?.defaultModel);
assert.ok(PROVIDER_CATALOG[0]?.defaultVisionModel);
assert.ok(PROVIDER_CATALOG[0]?.defaultImageModel);
assert.match(catalog, /PROVIDER_CATALOG\s*=\s*Object\.freeze\(\[/);
assert.match(providers, /DEFAULT_PROVIDER\s*=\s*['"]openrouter['"]/);
assert.match(providers, /getAiProvider\(\)\s*\{\s*return DEFAULT_PROVIDER;/s);
assert.match(providers, /getFallbackEnabled\(\)\s*\{\s*return false;/s);
assert.match(overrides, /OPENROUTER_ID\s*=\s*['"]openrouter['"]/);
assert.match(overrides, /fallbackEnabled:\s*false/);
assert.match(routing, /OPENROUTER_ID\s*=\s*['"]openrouter['"]/);
assert.match(routing, /shouldFallbackAiError[\s\S]*?return false/);
assert.match(openRouter, /\/chat\/completions/);
assert.match(openRouter, /Authorization:\s*`Bearer \$\{key\}`/);
assert.match(openRouter, /['"]HTTP-Referer['"]/);
assert.match(openRouter, /type:\s*['"]image_url['"]/);
assert.match(openRouter, /openrouter\/free/);
assert.match(media, /\/images/);
assert.match(media, /input_references/);
assert.match(media, /getAiConfigs\(\)\?\.openrouter/);
assert.match(server, /OPENROUTER_API_KEY/);
assert.match(server, /\/chat\/completions/);
assert.doesNotMatch(server, /OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY/);
assert.match(hub, /OpenRouter AI Gateway/);
assert.match(hub, /Lưu cho toàn website/);
assert.match(smartId, /OpenRouter/);
assert.match(version, /APP_VERSION = '12\.39\.0'/);

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return /\.(?:js|jsx|mjs|json)$/.test(entry.name) ? [full] : [];
});
const activeFiles = ['src', 'public', 'server', 'api'].flatMap(walk).filter((file) => !/public[\/]?(?:fonts|bes-fonts)/.test(file));
const legacyImportFiles = activeFiles.filter((file) => /(?:from\s+|import\s*\()['"][^'"]*gemini\.js['"]/.test(read(file)));
assert.deepEqual(legacyImportFiles, []);

const forbiddenBrands = /\b(?:Gemini|OpenAI|Groq|Cerebras|Mistral|SambaNova|Cohere|NVIDIA|Cloudflare|Claude|Ollama|LocalAI)\b|LM Studio|Hugging Face|GitHub Models/g;
const forbiddenReferences = activeFiles.flatMap((file) => {
  const hits = read(file).match(forbiddenBrands);
  return hits ? [{ file, hits: [...new Set(hits)] }] : [];
});
assert.deepEqual(forbiddenReferences, [], `retired provider references remain: ${JSON.stringify(forbiddenReferences)}`);
const retiredEndpoints = /generativelanguage|api\.openai|api\.groq|api\.mistral|api\.cohere|anthropic|localhost:11434|gemini-|gpt-|claude-/i;
const endpointReferences = activeFiles.filter((file) => retiredEndpoints.test(read(file)));
assert.deepEqual(endpointReferences, [], `retired provider endpoints or model names remain: ${JSON.stringify(endpointReferences)}`);

const appFiles = [
  ...fs.readdirSync('src/pages').filter((name) => name.endsWith('.jsx')).map((name) => `src/pages/${name}`),
  ...fs.readdirSync('src/components').filter((name) => name.endsWith('.jsx')).map((name) => `src/components/${name}`),
];
const directCallers = appFiles.filter((file) => /\bcallAI(?:WithMeta)?\s*\(/.test(read(file)));
assert.deepEqual(directCallers, []);

assert.equal(manifest.version, '12.39.0');
assert.equal(manifest.aiUnifiedCorePhase, 8);
assert.equal(manifest.aiProviderCount, 1);
assert.deepEqual(manifest.aiProviderIds, ['openrouter']);
assert.equal(manifest.openRouterOnly, true);
assert.equal(manifest.openRouterOneKeyRuntime, true);
assert.equal(manifest.openRouterVisionRuntime, true);
assert.equal(manifest.openRouterImageRuntime, true);
assert.equal(manifest.multiProviderRuntime, false);
assert.equal(manifest.providerFallback, false);
assert.equal(manifest.aiGatewayContract, 'bes-ai-core/1.5');

console.log('✓ Every retired AI provider has been removed from active source, server and API code.');
console.log('✓ One account-scoped OpenRouter key powers text, JSON, vision and image tasks.');
console.log('✓ SmartID and server compatibility routes use OpenRouter adapters only.');
console.log('✓ App-level AI continues through the central Task and Prompt Registry.');
console.log('✓ Version and release manifests are synchronized to V12.39.0.');
