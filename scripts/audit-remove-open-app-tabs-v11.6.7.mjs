#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];

function add(name, pass) {
  checks.push({ name, pass: Boolean(pass) });
}

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const main = read('src/main.jsx');
const health = read('src/pages/SystemHealthCenter.jsx');
const migrations = read('src/utils/configMigration.js');
const css = read('src/styles/legacy/06-current-features.css');
const smoke = read('scripts/smoke-test.mjs');

add('Đã xoá component WorkspaceTabs', !fs.existsSync('src/components/WorkspaceTabs.jsx'));
add('Đã xoá runtime lưu tab', !fs.existsSync('src/utils/workspace.js'));
add('Đã xoá lazy import toàn cục', !main.includes('WorkspaceTabs'));
add('Đã xoá render thanh tab', !main.includes('scope="workspace-tabs"'));
add('Đã xoá chỉ số tab khỏi System Health', !health.includes('workspaceStats') && !health.includes('Tab đang mở') && !health.includes('Open tabs'));
add('Đã xoá schema lưu Workspace Tabs', !migrations.includes("id: 'workspace-tabs'") && !migrations.includes('pattern: /^bes-workspace-tabs:/'));
add('Có cơ chế dọn dữ liệu tab cũ', migrations.includes("startsWith('bes-workspace-tabs:')") && migrations.includes("id: 'workspace-tabs-retired'"));
add('Đã xoá CSS thanh tab', !css.includes('.bes-workspace-tabs') && !css.includes('.bes-workspace-tab'));
add('Smoke test không đọc file đã xoá', !smoke.includes('workspaceTabsSource') && !smoke.includes("src/utils/workspace.js"));

const failed = checks.filter((item) => !item.pass);

checks.forEach((item) => {
  console.log(`${item.pass ? '✓' : '✗'} ${item.name}`);
});

if (failed.length) {
  console.error(`\n❌ Audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}

console.log(`\n✅ Audit PASS (${checks.length}/${checks.length})`);
