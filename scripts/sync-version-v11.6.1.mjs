import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '11.6.1',
    releaseName: 'Free Provider Hub — Expanded Catalog & Responsive Layout',
    runtimeCore: '2.6.1',
    aiProviderHubV2: true,
    aiProviderCount: 12,
    aiFreeProviderIds: ['groq','cerebras','mistral','sambanova','cohere','openrouter','nvidia','cloudflare'],
    aiProviderOfficialLinks: true,
    aiProviderResponsiveLayout: true,
    aiProviderCohereNativeAdapter: true,
    aiProviderCloudflareAccountBaseUrl: true,
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 11.6.1');
