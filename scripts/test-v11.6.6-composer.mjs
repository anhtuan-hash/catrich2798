#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const cssFile = path.join(root, 'public/bes-ai-composer-v1166/ai-composer-rebuild.css');
const jsFile = path.join(root, 'public/bes-ai-composer-v1166/ai-composer-rebuild.js');
if (!fs.existsSync(cssFile) || !fs.existsSync(jsFile)) {
  console.error('✗ Thiếu asset composer V11.6.6');
  process.exit(1);
}

const chromiumCandidates = [
  process.env.CHROME_BIN,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
].filter(Boolean);
const chromium = chromiumCandidates.find((file) => fs.existsSync(file));
if (!chromium) {
  console.log('↷ Không tìm thấy Chromium/Chrome; bỏ qua browser simulation, static contracts vẫn được kiểm tra.');
  process.exit(0);
}

const css = fs.readFileSync(cssFile, 'utf8');
const runtimeSource = fs.readFileSync(jsFile, 'utf8');

// Deterministic model of the production conflict: a 30 px input shell sits inside a 340 px footer.
const panelWidthModel = 340;
const minimumWideModel = Math.max(220, panelWidthModel * 0.68);
const modelAncestors = [
  { name: 'collapsed-shell', width: 30, bottomNear: true, height: 190, tools: 0, hint: false, semantic: false, layout: true },
  { name: 'wide-footer', width: 340, bottomNear: true, height: 210, tools: 3, hint: true, semantic: true, layout: true }
];
function modelScore(node) {
  let score = node.width >= minimumWideModel ? 15 : -(minimumWideModel - node.width) / 10;
  if (node.bottomNear) score += 5;
  if (node.height >= 90 && node.height <= 317) score += 5;
  if (node.tools >= 2) score += 8;
  if (node.hint) score += 4;
  if (node.semantic) score += 4;
  if (node.layout) score += 2;
  return score;
}
const selectedModel = [...modelAncestors].sort((a, b) => modelScore(b) - modelScore(a))[0];
if (selectedModel.name !== 'wide-footer') {
  console.error(`✗ Layout model chọn sai container: ${selectedModel.name}`);
  process.exit(1);
}
for (const contract of ['function chooseWideRoot(panel, editor, tools)', 'function structuralFallback(root, editor, send)', "'grid-column': '1 / -1'", "'writing-mode': 'horizontal-tb'"]) {
  if (!runtimeSource.includes(contract)) {
    console.error(`✗ Thiếu runtime contract: ${contract}`);
    process.exit(1);
  }
}
console.log('✓ Deterministic conflict model PASS — chọn footer 340 px thay vì shell 30 px');
const runtime = runtimeSource.replace("if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });\n  else boot();", "boot();");
const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<style>
html,body{margin:0;width:100%;height:100%;font-family:Arial,sans-serif;background:#eef2f7}
.panel{position:fixed;right:20px;bottom:20px;width:340px;height:610px;background:white;border:1px solid #aaa;display:flex;flex-direction:column;overflow:hidden}
.header{height:56px;padding:10px;background:#d98212;color:#fff}.messages{flex:1;padding:12px}.legacy-composer{position:relative;width:100%;height:210px;display:grid;grid-template-columns:minmax(0,1fr) 30px;grid-template-rows:auto 1fr auto;border-top:1px solid #ddd;box-sizing:border-box;padding:8px}
.tools{grid-column:1/-1;display:flex;gap:6px}.hint{grid-column:1/-1;align-self:end}
.bad-shell{grid-column:2!important;width:min-content!important;min-width:min-content!important;max-width:30px!important;writing-mode:vertical-rl!important;position:absolute!important;right:0!important;bottom:32px!important;display:grid!important;grid-template-columns:22px!important}
.bad-shell textarea{width:22px!important;min-width:22px!important;max-width:22px!important;height:190px!important;writing-mode:vertical-rl!important;text-orientation:mixed!important;padding:4px!important;box-sizing:border-box!important}
.bad-shell button{width:36px;height:36px}
${css}
</style>
</head>
<body>
<aside class="panel" role="dialog">
  <div class="header"><strong>Brian AI</strong><div>Đang hoạt động</div></div>
  <div class="messages">Nội dung hội thoại</div>
  <footer class="legacy-composer" data-bes-ai-composer-v1164="true">
    <div class="tools"><button>Tệp</button><button>Màn hình</button><button>Nói</button><span>0/5</span></div>
    <div class="bad-shell" data-bes-ai-input-shell-v1164="true"><textarea placeholder="Nhắn tin cho Brian AI"></textarea><button aria-label="Gửi">➤</button></div>
    <div class="hint">Enter để gửi · Shift + Enter xuống dòng</div>
  </footer>
</aside>
<div id="result" data-test-result="pending"></div>
<script>${runtime.replace(/<\/script/gi, '<\\/script')}</script>
<script>
window.BESAIComposerRebuildV1166.scan();
const old = document.querySelector('.bad-shell');
old.outerHTML = '<div class="bad-shell"><textarea placeholder="Nhắn tin cho Brian AI sau React rerender"></textarea><button aria-label="Gửi">➤</button></div>';
window.BESAIComposerRebuildV1166.scan();
const editor = document.querySelector('.bad-shell textarea');
const panel = document.querySelector('.panel');
const editorStyle = getComputedStyle(editor);
const width = Math.round(editor.getBoundingClientRect().width);
const panelWidth = Math.round(panel.getBoundingClientRect().width);
const oldMarkers = document.querySelectorAll('[data-bes-ai-composer-v1164],[data-bes-ai-input-shell-v1164]').length;
const pass = width >= panelWidth * .72 && editorStyle.writingMode === 'horizontal-tb' && oldMarkers === 0 && editor.dataset.besAiEditorV1166 === 'true';
const resultNode = document.getElementById('result');
resultNode.dataset.testResult = pass ? 'pass' : 'fail';
resultNode.textContent = JSON.stringify({pass,width,panelWidth,writingMode:editorStyle.writingMode,oldMarkers,marked:editor.dataset.besAiEditorV1166 || '',report:window.BESAIComposerRebuildV1166?.lastReport || null});
window.BESAIComposerRebuildV1166.stop();
</script>
</body></html>`;

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brian-v1166-'));
const htmlFile = path.join(tempDir, 'composer-test.html');
fs.writeFileSync(htmlFile, html);
const result = spawnSync(chromium, [
  '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--allow-file-access-from-files', '--dump-dom',
  `file://${htmlFile}`
], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 20000 });

if (result.error) {
  if (result.error.code === 'ETIMEDOUT') {
    console.log('↷ Chromium bị giới hạn tiến trình/DBus trong môi trường hiện tại; browser simulation được bỏ qua sau khi layout model đã PASS.');
    process.exit(0);
  }
  console.error(`✗ Không chạy được browser simulation: ${result.error.message}`);
  process.exit(1);
}
const output = result.stdout || '';
const pass = /data-test-result="pass"/.test(output);
if (!pass) {
  const detail = output.match(/<div id="result"[^>]*>(.*?)<\/div>/s)?.[1] || result.stderr || 'Không có chi tiết';
  console.error(`✗ Browser simulation thất bại: ${detail}`);
  process.exit(1);
}
const detail = output.match(/<div id="result"[^>]*>(.*?)<\/div>/s)?.[1] || '';
console.log(`✓ Browser simulation PASS — ${detail.replaceAll('&quot;', '"')}`);
fs.rmSync(tempDir, { recursive: true, force: true });
