#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const cssPath = path.join(cwd, 'public', 'bes-ai-launcher-slot-v10882.css');
const jsPath = path.join(cwd, 'public', 'bes-ai-launcher-slot-v10882.js');
const results = [];
const add = (name, ok, detail = '') => results.push({ name, ok, detail });

add('CSS hotfix tồn tại', fs.existsSync(cssPath));
add('JavaScript hotfix tồn tại', fs.existsSync(jsPath));
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : '';

if (js) {
  const syntax = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
  add('JavaScript không lỗi cú pháp', syntax.status === 0, (syntax.stderr || '').trim());
  add('Runtime đúng phiên bản HF2', js.includes("var VERSION = '10.88.0-hf2'"));
  add('Chỉ nhận diện slot nổi góc phải dưới', js.includes('isLowerRightFloatingSlot') && js.includes('rightGap > 110') && js.includes('bottomGap > 240'));
  add('Không ẩn điều khiển trong top navigation', js.includes('isInsideTopNavigation'));
  add('Nhận diện biểu tượng nốt nhạc', js.includes('♩♪♫♬'));
  add('Không nhầm launcher Brian AI là nút nhạc', js.includes('/brian ai|chat|tro ly|assistant/'));
  add('Tìm launcher gốc bằng điểm số', js.includes('launcherScore') && js.includes('findNativeLauncher'));
  add('Có bong bóng chat dự phòng', js.includes('createFallbackLauncher') && js.includes('makeChatIcon'));
  add('Launcher dự phòng dùng SVG chat bubble', js.includes('<svg viewBox="0 0 24 24"'));
  add('Nút chat gọi sự kiện mở AI', js.includes("new CustomEvent('bes-ai-open'") && js.includes("new CustomEvent('bes-open-ai-assist'"));
  add('Có fallback click AI sẵn sàng', js.includes('findOpenAIControl') && js.includes('/ai san sang/'));
  add('Theo dõi đóng chat để hiện lại launcher', js.includes("addEventListener('bes-ai-chat-closed'"));
  add('Hỗ trợ route thay đổi', js.includes("addEventListener('hashchange'"));
  add('Có API rescan/open/hideMusic', js.includes('BESAILauncherSlotV10882') && js.includes('hideMusic:'));
  add('Không chứa khóa bí mật', !/VITE_(OPENAI|ANTHROPIC|GEMINI|SUPABASE_SERVICE_ROLE)|service_role\s*[:=]/i.test(js));
}

if (css) {
  add('Nút âm nhạc nổi bị display none', /data-bes-floating-music-v10882="hidden"[\s\S]*?display:\s*none\s*!important/.test(css));
  add('Launcher cố định góc phải dưới', css.includes('position: fixed !important') && css.includes('right: var(--bes-ai-launcher-edge-x) !important') && css.includes('bottom: max(var(--bes-ai-launcher-edge-y), env(safe-area-inset-bottom)) !important'));
  add('Launcher dùng biểu tượng chat trắng', css.includes('[data-bes-ai-launcher-v10882] svg') && css.includes('fill: currentColor !important'));
  add('Ẩn launcher khi panel mở', css.includes('html[data-bes-ai-chat-open="true"]'));
  add('Hiện launcher khi panel đóng', css.includes('html[data-bes-ai-chat-open="false"]'));
  add('Kích thước desktop 58px', css.includes('--bes-ai-launcher-size: 58px'));
  add('Kích thước mobile 54px', css.includes('--bes-ai-launcher-size: 54px'));
  add('Hỗ trợ reduced motion', css.includes('@media (prefers-reduced-motion: reduce)'));
}

const failed = results.filter((item) => !item.ok);
console.log('\nBrian English Studio V10.88.0-HF2 · AI Launcher Slot Test\n');
for (const item of results) console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nKết quả: ${results.length - failed.length}/${results.length} đạt · ${failed.length} lỗi\n`);
process.exit(failed.length ? 1 : 0);
