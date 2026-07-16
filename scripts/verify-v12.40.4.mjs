import fs from 'node:fs';

const must = (condition, message) => { if (!condition) throw new Error(message); };
const read = (path) => fs.readFileSync(path, 'utf8');
const server = read('server/unifiedAiProviderAdapter.js');
const registry = read('src/utils/aiPromptRegistry.js');
const textLab = read('src/pages/TextLabActivities.jsx');
const browserRuntime = read('src/utils/openRouter.js');

must(read('src/config/version.js').includes("APP_VERSION = '12.40.4'"), 'V12.40.4 version is missing.');
must(server.includes("sort: 'latency-low-to-high'"), 'Latency-ranked free model discovery is missing.');
must(server.includes("supported_parameters: 'response_format'"), 'Fast Free discovery does not require JSON support.');
must(server.includes('FAST_FREE_CACHE_TTL_MS = 15 * 60 * 1000'), 'Fast Free catalog cache is missing.');
must(server.includes("env('OPENROUTER_FAST_FREE_TIMEOUT_MS')"), 'Fast Free primary timeout control is missing.');
must(server.includes("40_000"), 'Fast Free primary timeout is not 40 seconds.');
must(server.includes("45_000"), 'Fast Free fallback timeout is not 45 seconds.');
must(server.includes("reason: 'fast-free-router-fallback'"), 'Fast Free timeout fallback is missing.');
must(server.includes("reason: emptyFastFreePrimary ? 'empty-fast-free-fallback'"), 'Fast Free empty-response fallback is missing.');
must(server.includes("modelOverride: FREE_MODEL"), 'OpenRouter free router fallback is missing.');
must(server.includes("parseBool(process.env.OPENROUTER_FAST_FREE_MODE, true)"), 'Fast Free mode is not enabled by default.');
must(server.includes("if (!/:free$/i.test(id)) return false"), 'Fast Free selector can admit a paid model.');
must(server.includes("sort: profile === 'quality' ? 'throughput' : 'latency'"), 'JSON provider routing is not latency-first.');
must(registry.includes("'textlab.generateActivity'"), 'TextLab task is missing.');
must(registry.includes("routingHint: 'fast'"), 'TextLab is not using the fast routing hint.');
must(registry.includes('maxOutputTokens: 1800'), 'TextLab compact token budget is missing.');
must(registry.includes("version: '1.5.0'"), 'TextLab Fast Free prompt version is missing.');
must(textLab.includes('temperature: 0.2'), 'TextLab compact JSON temperature is missing.');
must(browserRuntime.includes('fastFreeSelectedModel'), 'Fast Free model provenance is not exposed to the browser.');
must(browserRuntime.includes('fastFreeFallback'), 'Fast Free fallback provenance is not exposed to the browser.');

console.log('V12.40.4 verification passed: latency-ranked free JSON selection, 40-second switching, and compact TextLab output are installed.');
