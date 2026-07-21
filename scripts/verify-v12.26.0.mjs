#!/usr/bin/env node
import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const gemini = read('src/utils/gemini.js');
const governance = read('src/utils/aiGovernance.js');
const providers = read('src/utils/aiProviders.js');
const overrides = read('src/utils/aiProviderOverrides.js');
const settings = read('src/pages/Settings.jsx');
const hub = read('src/utils/aiProviderHubRuntime.js');
const assertions = [
  ['diagnostic governance profile', governance.includes("diagnostic: { label: 'Provider connection test', maxOutputTokens: 64 }") && governance.includes("profileKey === 'diagnostic' ? 16 : 256")],
  ['connection tests request low output', settings.includes("governanceProfile: 'diagnostic'") && settings.includes('maxOutputTokens: 48') && hub.includes("governanceProfile: 'diagnostic'")],
  ['OpenRouter paid model recovers to free router', gemini.includes("body.model = 'openrouter/free'") && gemini.includes("reason: 'free-model-fallback'")],
  ['legacy provider config migration', providers.includes('OPENROUTER_FREE_MODEL_MIGRATION_KEY') && providers.includes("model: 'openrouter/free'")],
  ['provider override migration', overrides.includes('OPENROUTER_MIGRATION_FLAG') && overrides.includes("model: 'openrouter/free'" )],
];
for (const [name, ok] of assertions) {
  if (!ok) throw new Error(`V12.26.0 verification failed: ${name}`);
  console.log(`✓ ${name}`);
}
console.log(`V12.26.0 source verification passed (${assertions.length}/${assertions.length}).`);
