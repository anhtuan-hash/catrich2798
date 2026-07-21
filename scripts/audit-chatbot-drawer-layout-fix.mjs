#!/usr/bin/env node
import fs from 'node:fs';

const component = fs.readFileSync('src/components/SharedChatbotDrawer.jsx', 'utf8');
const css = fs.readFileSync('src/styles/shared-chatbot-drawer-v1167.css', 'utf8');

const checks = [
  ['Không còn backdrop che ứng dụng', !component.includes('shared-chatbot-backdrop')],
  ['Drawer là complementary workspace', component.includes('role="complementary"')],
  ['Đã bỏ footer Thu drawer', !component.includes('shared-chatbot-footer')],
  ['Drawer rộng mặc định 780px', css.includes('--chatbot-drawer-width: 780px')],
  ['Iframe lấp đầy vùng còn lại', css.includes('flex: 1 1 auto !important') && css.includes('.shared-chatbot-frame-wrap iframe')],
  ['Ứng dụng nền vẫn tương tác được', css.includes('pointer-events: none !important') && css.includes('.shared-chatbot-drawer') && css.includes('pointer-events: auto !important')],
  ['Có responsive mobile', css.includes('@media (max-width: 760px)')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n❌ Layout audit FAILED (${checks.length - failed}/${checks.length})`);
  process.exit(1);
}

console.log(`\n✅ Drawer layout audit PASS (${checks.length}/${checks.length})`);
