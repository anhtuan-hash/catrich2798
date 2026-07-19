#!/usr/bin/env node
import fs from 'node:fs';

const jsx = fs.readFileSync('src/pages/THPTPracticeHub.jsx', 'utf8');
const css = fs.readFileSync('src/pages/THPTPracticeHubLayoutV2.css', 'utf8');

const checks = [
  ['Giữ Resource Library bridge', jsx.includes('thptResourceBridge') && jsx.includes('THPT_RESOURCE_SOURCE')],
  ['Giữ vùng card hiện hành', jsx.includes('className="thpt-card-grid"')],
  ['Nạp layout V2 riêng', jsx.includes("import './THPTPracticeHubLayoutV2.css';")],
  ['Danh sách có cuộn riêng', css.includes('overflow-y: auto') && css.includes('max-height: min(66vh, 780px)')],
  ['Không thay đổi logic Supabase', !css.includes('supabase') && !css.includes('fetch(')],
  ['Có responsive tablet', css.includes('@media (max-width: 820px)')],
  ['Có responsive mobile', css.includes('@media (max-width: 560px)')],
  ['Có dark mode', css.includes('html[data-theme="dark"]')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n❌ Audit FAILED (${checks.length - failed}/${checks.length})`);
  process.exit(1);
}

console.log(`\n✅ Audit PASS (${checks.length}/${checks.length})`);
