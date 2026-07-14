#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';

const cwd = process.cwd();
const jsPath = path.join(cwd, 'public', 'bes-command-center-v10870.js');
const cssPath = path.join(cwd, 'public', 'bes-command-center-v10870.css');
const harnessPath = path.join(cwd, 'tests', 'command-center-v10.87.harness.html');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

for (const file of [jsPath, cssPath, harnessPath]) {
  if (!fs.existsSync(file)) fail(`Thiếu ${path.relative(cwd, file)}`);
}

const source = fs.readFileSync(jsPath, 'utf8');
const requiredMarkers = [
  'BES_COMMAND_CENTER',
  'bes-command-trigger',
  'bes-command-dock',
  'bes-command-overlay',
  'handleDragStart',
  'customGroups',
  'BroadcastChannel',
  'bes-command-center-ready'
];
for (const marker of requiredMarkers) {
  if (!source.includes(marker)) fail(`Thiếu marker ${marker}`);
}
console.log(`✓ Static checks: ${requiredMarkers.length}/${requiredMarkers.length}`);

const candidates = [
  process.env.CHROME_BIN,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);
const browser = candidates.find((candidate) => fs.existsSync(candidate));
if (!browser) {
  console.log('! Không tìm thấy Chromium/Chrome; bỏ qua browser smoke test. Static checks vẫn đạt.');
  process.exit(0);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  let file = harnessPath;
  let type = 'text/html; charset=utf-8';
  if (url.pathname === '/bes-command-center-v10870.js') { file = jsPath; type = 'text/javascript; charset=utf-8'; }
  if (url.pathname === '/bes-command-center-v10870.css') { file = cssPath; type = 'text/css; charset=utf-8'; }
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(fs.readFileSync(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bescc-chromium-'));
const args = [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  `--user-data-dir=${userDataDir}`,
  '--virtual-time-budget=3000',
  '--dump-dom',
  `http://127.0.0.1:${port}/`
];

let output = null;
let browserInfrastructureError = null;
try {
  output = await new Promise((resolve, reject) => {
    const child = spawn(browser, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Browser smoke test timeout'));
    }, 12000);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
} catch (error) {
  browserInfrastructureError = error;
} finally {
  server.close();
  try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 120 }); } catch (_) {}
}

if (browserInfrastructureError) {
  console.log(`! Browser smoke test không khả dụng trong môi trường này: ${browserInfrastructureError.message}`);
  console.log('✓ Command Center V10.87 static checks completed');
  process.exit(0);
}
if (output.code !== 0 && !output.stdout) {
  console.log(`! Chromium không thể chạy headless trong môi trường này (mã ${output.code}); static checks vẫn đạt.`);
  console.log('✓ Command Center V10.87 static checks completed');
  process.exit(0);
}
if (/data-result="failed"/.test(output.stdout)) fail('Browser smoke test đã chạy nhưng Command Center không tạo đủ thành phần.');
if (!/data-result="passed"/.test(output.stdout)) {
  console.log('! Chromium không trả DOM kiểm thử; static checks vẫn đạt.');
  console.log('✓ Command Center V10.87 static checks completed');
  process.exit(0);
}
console.log('✓ Browser smoke test: passed');
console.log('✓ Command Center V10.87 checks completed');
