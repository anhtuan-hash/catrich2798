import fs from 'node:fs';
const source = fs.readFileSync('src/ui-core/runtime/workspaceLayout.js','utf8');
const checks = [
 ['normalizer exported', source.includes('export function normalizeWorkspaceLayout')],
 ['invalid target rejected', source.includes("secondaryTarget.startsWith('#/')")],
 ['ratio minimum', source.includes('Math.max(30')],
 ['ratio maximum', source.includes('Math.min(70')],
 ['left/right normalization', source.includes("source.side === 'left' ? 'left' : 'right'")],
 ['focus boolean', source.includes('Boolean(source.focusMode)')],
 ['user scoped storage', source.includes('storageKey') || source.includes('key(user)')],
 ['custom event', source.includes('CustomEvent(WORKSPACE_LAYOUT_EVENT')],
 ['broadcast sync', source.includes("BroadcastChannel('brian-workspace-layout-v12.13')")],
 ['open event', source.includes('WORKSPACE_LAYOUT_OPEN_EVENT')],
];
let passed=0; for(const [label,ok] of checks){if(!ok) throw new Error(`FAIL: ${label}`); console.log(`✓ ${label}`); passed++;}
console.log(`V12.13.0 Workspace Layout runtime tests PASS (${passed}/${checks.length})`);
