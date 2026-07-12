#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const cssPath = path.join(cwd, 'public', 'bes-ai-chat-v10872.css');
const jsPath = path.join(cwd, 'public', 'bes-ai-chat-v10872.js');
const results = [];
const add = (name, ok, detail = '') => results.push({ name, ok, detail });

add('CSS asset tồn tại', fs.existsSync(cssPath));
add('JavaScript asset tồn tại', fs.existsSync(jsPath));

let css = '';
let js = '';
if (fs.existsSync(cssPath)) css = fs.readFileSync(cssPath, 'utf8');
if (fs.existsSync(jsPath)) js = fs.readFileSync(jsPath, 'utf8');

if (js) {
  const syntax = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
  add('JavaScript không lỗi cú pháp', syntax.status === 0, (syntax.stderr || '').trim());
  add('Runtime version đúng', js.includes("var VERSION = '10.87.2'"));
  add('Có phát hiện panel theo ngữ cảnh', js.includes('scoreCandidate') && js.includes("text.indexOf('brian ai')"));
  add('Có lưu trạng thái rộng/hẹp', js.includes("bes-ai-chat-layout-v10872") && js.includes('safeSetState'));
  add('Có nút mở rộng', js.includes('bes-ai-chat-expand-v10872'));
  add('Không ghi đè lịch sử AI', !/localStorage\.setItem\([^\n]*(history|conversation|message)/i.test(js));
  add('Không chứa khóa bí mật', !/VITE_(OPENAI|ANTHROPIC|GEMINI|SUPABASE_SERVICE_ROLE)|service_role\s*[:=]/i.test(js));
}

if (css) {
  add('Desktop rộng tối thiểu 480px', css.includes('clamp(480px, 38vw, 590px)'));
  add('Có chế độ mở rộng 760px', css.includes('min(760px, calc(100vw - 40px))'));
  add('Chiều cao chat 86vh', css.includes('min(86vh, 920px)'));
  add('Message area dùng flex 1', /data-bes-ai-chat-role="messages"[\s\S]*?flex:\s*1 1 auto/.test(css));
  add('Ô nhập tối thiểu 72px', /data-bes-ai-chat-role="input"[\s\S]*?min-height:\s*72px/.test(css));
  add('Mobile full-screen', css.includes('@media (max-width: 680px)') && css.includes('width: 100vw !important') && css.includes('height: 100dvh !important'));
  add('Có reduced motion', css.includes('prefers-reduced-motion'));
  add('CSS chỉ tác động vùng được gắn tag', css.includes('[data-bes-ai-chat-v10872="panel"]'));
}

const failed = results.filter((item) => !item.ok);
console.log('\nBrian English Studio V10.87.2 · AI Chat Test\n');
for (const item of results) console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nKết quả: ${results.length - failed.length}/${results.length} đạt · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
