#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jsPath = path.join(root, 'public', 'bes-ai-dock-v2', 'ai-dock-v2.js');
const cssPath = path.join(root, 'public', 'bes-fonts', 'brian-font.css');
const js = fs.readFileSync(jsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const failures = [];
const expect = (name, condition) => { if (!condition) failures.push(name); };

expect('shadow root used', /attachShadow\(\{ mode: 'open' \}\)/.test(js));
expect('new composer belongs to template', /<textarea id="bes-ai-dock-editor" class="editor"/.test(js));
expect('composer width fixed inside shadow only', /\.editor\{[^}]*width:100%!important[^}]*writing-mode:horizontal-tb!important/s.test(js));
expect('legacy UI deleted repeatedly', /setInterval\(removeLegacyAI, 1800\)/.test(js));
expect('legacy mutation sweep', /MutationObserver/.test(js) && /scheduleLegacySweep/.test(js));
expect('legacy composer markers absent from injected index code path', !/BES_AI_COMPOSER_V1164_START|BES_AI_COMPOSER_V1166_START/.test(js));
expect('font is server asset', /src: url\("\/bes-fonts\/brian-personal-font\./.test(css));
expect('font is not localStorage based', !/localStorage|blob:/.test(css));
expect('font protects icons', /material-icons/.test(css) && /material-symbols/.test(css));
expect('openrouter compact retry', /compactMessages\(userText, ultra/.test(js));

if (failures.length) {
  console.error(`V11.6.7 AI Dock runtime contracts FAILED (${10 - failures.length}/10)`);
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log('V11.6.7 AI Dock runtime contracts PASS (10/10)');
