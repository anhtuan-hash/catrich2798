import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../src/pages/LessonCheckStudio.css',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/pages/LessonCheckStudio.jsx',import.meta.url),'utf8');
const atmosphere=readFileSync(new URL('../src/components/VietnamAtmosphereOverlay.css',import.meta.url),'utf8');

test('the Arcade card thumbnail uses a large logical browser viewport at uniform 1:3 scale',()=>{
  const section=css.slice(css.indexOf('/* V12 · Stable Arcade game thumbnails.'));
  assert.match(section,/\.lcs-page--library \.lcs-arcade-card \.lcs-card-preview-frame\s*\{/);
  assert.match(section,/width:300%/);
  assert.match(section,/height:300%/);
  assert.match(section,/transform:scale\(\.3333333333\)/);
  assert.match(section,/transform-origin:top left/);
  assert.match(section,/pointer-events:none/);
  assert.match(section,/\.lcs-page--library \.lcs-arcade-card \.lcs-card-live-preview/);
  assert.match(section,/overflow:hidden/);
});
test('global decorations do not cover the Arcade but remain enabled on other routes',()=>{
  const section=css.slice(css.indexOf('/* V12 · Stable Arcade game thumbnails.'));
  assert.match(section,/html:has\(\.lcs-page--library\) \.bes-vn-atmosphere\s*\{\s*visibility:hidden!important/);
  assert.match(atmosphere,/\.bes-vn-atmosphere\s*\{[\s\S]*?position:\s*fixed/);
  assert.doesNotMatch(section,/display:none!important.*\.lcs-page/);
});
test('game content, fullscreen rendering, permission checks and gallery are unmodified',()=>{
  assert.match(studio,/function ActivityFrame\(\{ embed, title, className = '' \}\)/);
  assert.match(studio,/<ActivityFrame embed=\{embed\} title=\{activity\.title\} className="lcs-card-preview-frame"\s*\/>/);
  assert.match(studio,/<ActivityFrame embed=\{parsedDraft\} title=\{draft\.title\} className="lcs-frame"/);
  assert.match(studio,/canLoad && activated && embed/);
  assert.match(studio,/role="button"/);
  assert.match(studio,/openTeachingMode\(item\)/);
  assert.match(studio,/getLessonCheckActivityContent\(activity\.id\)/);
  assert.match(css,/\.lcs-frame\{width:100%;height:100%;border:0;background:#fff\}/);
});
