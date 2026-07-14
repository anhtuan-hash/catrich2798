#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const cssPath = path.join(cwd, 'public', 'bes-ai-chat-v10881.css');
const jsPath = path.join(cwd, 'public', 'bes-ai-chat-v10881.js');
const results = [];
const add = (name, ok, detail = '') => results.push({ name, ok, detail });

add('CSS hotfix tồn tại', fs.existsSync(cssPath));
add('JavaScript hotfix tồn tại', fs.existsSync(jsPath));
let css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
let js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : '';

if (js) {
  const syntax = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
  add('JavaScript không lỗi cú pháp', syntax.status === 0, (syntax.stderr || '').trim());
  add('Runtime hotfix đúng', js.includes("var VERSION = '10.88.0-hf1'"));
  add('Phát hiện trạng thái hidden/closed', js.includes('isSemanticallyClosed') && js.includes("data-state"));
  add('Phát hiện nút đóng/thu gọn', js.includes('isCloseControl') && js.includes('thu gọn'));
  add('Hỗ trợ biểu tượng dấu trừ', js.includes("['−', '–', '—', '-', '×', '✕', '✖']"));
  add('Đóng panel ngay bằng lifecycle', js.includes("setAttribute(LIFECYCLE_ATTR, 'closing')"));
  add('Dọn tag sau khi đóng', js.includes('finishClose') && js.includes('clearPanelTags'));
  add('Không giữ currentPanel khi panel đã ẩn', js.includes("if (currentPanel) beginClose(currentPanel"));
  add('Theo dõi thay đổi class/style/aria-hidden', js.includes("attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'"));
  add('Khôi phục inline style của textarea', js.includes('snapshotInput') && js.includes('restoreInput'));
  add('Phát sự kiện resize để launcher tự căn lại', js.includes("window.dispatchEvent(new Event('resize'))"));
  add('Có API đóng thủ công', js.includes("close: function ()"));
  add('Không ghi đè lịch sử hội thoại', !/localStorage\.setItem\([^\n]*(history|conversation|message)/i.test(js));
  add('Không chứa khóa bí mật', !/VITE_(OPENAI|ANTHROPIC|GEMINI|SUPABASE_SERVICE_ROLE)|service_role\s*[:=]/i.test(js));
}

if (css) {
  add('CSS lifecycle đóng dùng display none', /data-bes-ai-chat-lifecycle="closing"[\s\S]*?display:\s*none\s*!important/.test(css));
  add('Tôn trọng aria-hidden=true', css.includes('[aria-hidden="true"]'));
  add('Tôn trọng data-state=closed', css.includes('[data-state="closed"]'));
  add('Tôn trọng data-open=false', css.includes('[data-open="false"]'));
  add('Loại bỏ backdrop-filter khi đóng', css.includes('backdrop-filter: none !important'));
  add('Loại bỏ box-shadow khi đóng', css.includes('box-shadow: none !important'));
  add('Chặn tương tác với ghost panel', css.includes('pointer-events: none !important'));
  add('Giữ composer 104–220px', css.includes('--bes-ai-input-min: 104px') && css.includes('--bes-ai-input-max: 220px'));
  add('Giữ mobile full-screen', css.includes('height: 100dvh !important'));
  add('CSS chỉ tác động panel được gắn tag v10881', css.includes('[data-bes-ai-chat-v10881="panel"]'));
}

const failed = results.filter((item) => !item.ok);
console.log('\nBrian English Studio V10.88.0-HF1 · AI Chat Close Cleanup Test\n');
for (const item of results) console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nKết quả: ${results.length - failed.length}/${results.length} đạt · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
