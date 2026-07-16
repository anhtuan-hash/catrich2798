import fs from 'node:fs';

const must = (condition, message) => { if (!condition) throw new Error(message); };
const read = (path) => fs.readFileSync(path, 'utf8');
const server = read('server/unifiedAiProviderAdapter.js');
const registry = read('src/utils/aiPromptRegistry.js');
const textLab = read('src/pages/TextLabActivities.jsx');
const browserRuntime = read('src/utils/openRouter.js');

must(read('src/config/version.js').includes("APP_VERSION = '12.40.3'"), 'V12.40.3 version is missing.');
must(server.includes("value == null || String(value).trim() === ''"), 'Unset environment values still collapse defaults to minimums.');
must(server.includes('require_parameters: Boolean(isJson)'), 'Free JSON routing does not require response_format support.');
must(!server.includes('require_parameters: Boolean(isJson) && !freeRoute'), 'Free JSON routing still allows incompatible endpoints.');
must(server.includes("reason: 'empty-free-response'"), 'Bounded empty-response retry is missing.');
must(server.includes("reason: 'network-or-timeout'"), 'Bounded network/timeout retry is missing.');
must(server.includes('json: 2400'), 'Free JSON token cap was not raised for complete TextLab output.');
must(server.includes("if (isJson) body.response_format = { type: 'json_object' }"), 'JSON response format is missing.');
must(server.includes("...(!freeRoute ? { data_collection"), 'Free route no longer respects account-level privacy routing.');
must(registry.includes("'textlab.generateActivity'"), 'TextLab registry task is missing.');
must(registry.includes('maxOutputTokens: 2200'), 'TextLab output budget is not resilient to complete activities.');
must(registry.includes("validation: jsonContract(['templateId', 'content'])"), 'TextLab JSON contract is missing.');
must(registry.includes("version: '1.4.0'"), 'TextLab prompt contract version was not updated.');
must(textLab.includes('Encode every line break'), 'TextLab prompt does not guard JSON string escaping.');
must(textLab.includes('temperature: 0.25'), 'TextLab JSON generation temperature is too loose.');
must(browserRuntime.includes('freeRouteRetry: Boolean(payload?.freeRouteRetry)'), 'Free route retry provenance is not exposed to the browser runtime.');

console.log('V12.40.3 verification passed: JSON-capable free routing, bounded retries, and the TextLab JSON contract are installed.');
