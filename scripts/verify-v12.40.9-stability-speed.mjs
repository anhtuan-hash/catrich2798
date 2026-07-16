import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const main = fs.readFileSync('src/main.jsx', 'utf8');
const gateway = fs.readFileSync('src/utils/aiServerGateway.js', 'utf8');
const server = fs.readFileSync('server/unifiedAiProviderAdapter.js', 'utf8');
const api = fs.readFileSync('api/ai.js', 'utf8');
const vite = fs.readFileSync('vite.config.js', 'utf8');
const speedCss = fs.readFileSync('src/ui-core/styles/stability-speed-v12409.css', 'utf8').toLowerCase();

assert.equal(pkg.version, '12.40.9');
assert.equal(pkg.scripts['version:sync'], 'node scripts/sync-version-v12.40.9.mjs');
assert.match(main, /stability-speed-v12409\.css/);
assert.match(main, /function useDeferredShell/);
assert.match(main, /requestIdleCallback/);
assert.match(main, /ROUTE_PREFETCHERS/);
assert.match(main, /deferredShell\.interactiveReady/);
assert.match(main, /deferredShell\.idleReady/);
assert.doesNotMatch(main, /styles\/apps-hero-v1216\.css/);
assert.doesNotMatch(main, /styles\/admin-center-v1224\.css/);
assert.doesNotMatch(main, /styles\/settings-experience-v1225\.css/);
assert.match(fs.readFileSync('src/pages/WebApps.jsx', 'utf8'), /apps-hero-v1216\.css/);
assert.match(fs.readFileSync('src/pages/AdminPage.jsx', 'utf8'), /admin-center-v1224\.css/);
assert.match(fs.readFileSync('src/pages/Settings.jsx', 'utf8'), /settings-experience-v1225\.css/);
assert.match(fs.readFileSync('src/pages/DepartmentWorkspace.jsx', 'utf8'), /department-command-v1219\.css/);
assert.match(gateway, /ACCESS_TOKEN_CACHE_MS = 20_000/);
assert.match(gateway, /HEALTH_CACHE_MS = 120_000/);
assert.match(gateway, /warmAiServerGateway/);
assert.match(server, /resolveFastFreeTextModel/);
assert.match(server, /OPENROUTER_FAST_FREE_TEXT_MODE/);
assert.match(server, /22_000/);
assert.match(server, /35_000/);
assert.match(server, /stream-fast-free-fallback/);
assert.match(server, /warmServerAiRuntime/);
assert.match(api, /operation === 'warmup'/);
assert.match(api, /phase: 'first-token'/);
assert.match(speedCss, /backdrop-filter: none/);
assert.match(speedCss, /contain: layout paint style/);
assert.match(speedCss, /prefers-reduced-motion/);
assert.match(vite, /codeSplitting:/);
assert.match(vite, /includeDependenciesRecursively: false/);
assert.match(vite, /strictExecutionOrder: true/);

for (const manifestPath of ['public/version.json', 'public/release-manifest.json']) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.version, '12.40.9');
  assert.equal(manifest.chromeTierCount, 3);
  assert.equal(manifest.homepagePrimaryColor, '#B2C248');
  assert.equal(manifest.routeCssCodeSplitting, true);
  assert.equal(manifest.isolatedLazyRouteChunks, true);
  assert.equal(manifest.initialJsBudgetBytes, 800000);
  assert.equal(manifest.deferredShellPhases, 2);
  assert.equal(manifest.aiFastFreeTextMode, true);
  assert.equal(manifest.aiStreamingFallback, true);
}

console.log('V12.40.9 Stability & Speed static checks passed.');
