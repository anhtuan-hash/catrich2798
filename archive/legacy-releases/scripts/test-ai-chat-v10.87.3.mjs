#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const cssPath = path.join(cwd, 'public', 'bes-ai-chat-v10873.css');
const jsPath = path.join(cwd, 'public', 'bes-ai-chat-v10873.js');
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
  add('Runtime version đúng', js.includes("var VERSION = '10.87.3'"));
  add('Có phát hiện panel Brian AI', js.includes('scoreCandidate') && js.includes("text.indexOf('brian ai')"));
  add('Có tìm input wrapper', js.includes('findInputWrap'));
  add('Có textarea auto-grow', js.includes('bindAutoGrow') && js.includes('resizeInput'));
  add('Giới hạn desktop 104–220px', js.includes('return { min: 104, max: 220 }'));
  add('Có migration trạng thái V10.87.2', js.includes('bes-ai-chat-layout-v10872'));
  add('Không ghi đè lịch sử AI', !/localStorage\.setItem\([^\n]*(history|conversation|message)/i.test(js));
  add('Không chứa khóa bí mật', !/VITE_(OPENAI|ANTHROPIC|GEMINI|SUPABASE_SERVICE_ROLE)|service_role\s*[:=]/i.test(js));
}

if (css) {
  add('Panel desktop vẫn rộng 480–590px', css.includes('clamp(480px, 38vw, 590px)'));
  add('Ô nhập tối thiểu 104px', css.includes('--bes-ai-input-min: 104px'));
  add('Ô nhập tối đa 220px', css.includes('--bes-ai-input-max: 220px'));
  add('Composer tối thiểu 160px', css.includes('--bes-ai-composer-min: 160px'));
  add('Nút gửi nằm trong input wrapper', css.includes('[data-bes-ai-chat-input-wrap="true"] [data-bes-ai-chat-role="send"]') && /data-bes-ai-chat-role="send"[\s\S]*?position:\s*absolute/.test(css));
  add('Quick tools được thu gọn', /data-bes-ai-chat-role="quick-tools"[\s\S]*?min-height:\s*34px/.test(css));
  add('Toolbar kết quả được thu gọn', /data-bes-ai-chat-role="toolbar"[\s\S]*?max-height:\s*58px/.test(css));
  add('Mobile full-screen', css.includes('@media (max-width: 680px)') && css.includes('height: 100dvh !important'));
  add('Có reduced motion', css.includes('prefers-reduced-motion'));
  add('CSS chỉ tác động vùng được gắn tag', css.includes('[data-bes-ai-chat-v10873="panel"]'));
}

const failed = results.filter((item) => !item.ok);
console.log('\nBrian English Studio V10.87.3 · AI Chat Composer Test\n');
for (const item of results) console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nKết quả: ${results.length - failed.length}/${results.length} đạt · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
