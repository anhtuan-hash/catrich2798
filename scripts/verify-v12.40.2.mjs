import fs from 'node:fs';

const must = (condition, message) => { if (!condition) throw new Error(message); };
const read = (path) => fs.readFileSync(path, 'utf8');
const server = read('server/unifiedAiProviderAdapter.js');
const runtime = read('src/utils/aiRuntimeManager.js');
const governance = read('src/utils/aiGovernance.js');
const providers = read('src/utils/aiProviders.js');
const main = read('src/main.jsx');
const health = read('src/pages/SystemHealthCenter.jsx');
const diagnostics = read('src/utils/openRouterDiagnostics.js');
const catalog = read('src/data/aiProviderCatalog.js');

must(read('src/config/version.js').includes("APP_VERSION = '12.40.2'"), 'V12.40.2 version is missing.');
must(server.includes("OPENROUTER_BILLING_MODE', 'free'"), 'Free-first billing default is missing.');
must(server.includes('OPENROUTER_ALLOW_PAID_MODE'), 'Explicit paid-mode opt-in guard is missing.');
must(server.includes("const FREE_MODEL = 'openrouter/free'"), 'OpenRouter free route is missing.');
must(catalog.includes("defaultModel: 'openrouter/free'"), 'Browser model display does not match the free route.');
must(server.includes("...(!freeRoute ? { data_collection"), 'Free route privacy compatibility is missing.');
must(providers.includes('hasKey: false'), 'Browser provider summary still reports a false-positive key.');
must(main.includes('hasApiKey: aiGatewayReady'), 'Global AI readiness is not gateway-driven.');
must(health.includes('aiGatewayCheck'), 'System Health does not call the real AI gateway health endpoint.');
must(governance.includes("AI_GOVERNANCE_USAGE_KEY = 'bes-ai-governance-usage:v2'"), 'Governance recovery storage is missing.');
must(governance.includes('day.requests += success ? 1 : 0'), 'Failed calls still consume the successful request quota.');
must(runtime.includes("AI_RUNTIME_CIRCUIT_KEY = 'bes-ai-runtime-circuits:v2'"), 'Circuit recovery storage is missing.');
must(runtime.includes('if (isTransientKind(kind)) recordAiProviderRuntimeFailure'), 'Non-transient errors can still open the circuit.');
must(diagnostics.includes('One small real generation'), 'Quota-efficient live diagnostic is missing.');
must(!diagnostics.includes("taskId: 'diagnostic.json'"), 'Live diagnostic still spends a second free request.');

console.log('V12.40.2 verification passed: free-first routing, honest readiness, quota recovery, and transient-only circuits are installed.');
