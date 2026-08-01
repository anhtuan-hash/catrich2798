import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync(new URL('../src/components/homeroom/HomeroomLearningGradebook.jsx', import.meta.url), 'utf8');
const gradeCss = fs.readFileSync(new URL('../src/components/homeroom/HomeroomLearningGradebook.css', import.meta.url), 'utf8');
const workspaceCss = fs.readFileSync(new URL('../src/components/GlobalHomeroomGoogleColorPolish.css', import.meta.url), 'utf8');

const toneContracts = [
  ['regular-0', 'blue', '#174ea6', '#e8f0fe'],
  ['regular-1', 'red', '#b3261e', '#fce8e6'],
  ['regular-2', 'yellow', '#7a4f01', '#fef7e0'],
  ['regular-3', 'green', '#137333', '#e6f4ea'],
  ['midterm', 'purple', '#681da8', '#f3e8fd'],
  ['final', 'orange', '#8a4f00', '#feefe3'],
  ['summary', 'cyan', '#00677d', '#e4f7fb'],
];

function rgb(hex) {
  return hex.match(/[a-f\d]{2}/gi).map((part) => Number.parseInt(part, 16) / 255);
}

function luminance(hex) {
  const [red, green, blue] = rgb(hex).map((value) => (
    value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  ));
  return .2126 * red + .7152 * green + .0722 * blue;
}

function contrast(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + .05) / (dark + .05);
}

toneContracts.forEach(([view, tone, ink, soft]) => {
  assert.match(component, new RegExp(`id: '${view}'.+tone: '${tone}'`));
  assert.match(gradeCss, new RegExp(`data-grade-tone=\\"${tone}\\"`));
  assert.ok(contrast(ink, soft) >= 4.5, `${tone} must keep readable text contrast`);
});

assert.match(component, /data-grade-view=\{view\}/);
assert.match(component, /data-grade-tone=\{activeView\.tone\}/);
assert.match(component, /className="tone-blue"/);
assert.match(component, /hr-grade-export-pdf/);
assert.match(gradeCss, /#4285f4 0 25%, #ea4335 25% 50%, #fbbc04 50% 75%, #34a853 75%/);
assert.match(gradeCss, /\.hr-grade-views button\[data-grade-tone\]::before/);
assert.match(gradeCss, /border-top: 4px solid var\(--grade-active\)/);
assert.match(gradeCss, /html\[data-theme="dark"\] \.hr-gradebook\[data-grade-tone="cyan"\]/);
assert.match(workspaceCss, /\.hr-page\.is-subject-class \.hr-hero/);
assert.match(workspaceCss, /border-top:4px solid var\(--hrg-google-blue\)/);

console.log('✓ Màu Google Material phân biệt đủ 7 nhóm điểm, thẻ thống kê, loại file và hai chế độ lớp.');
