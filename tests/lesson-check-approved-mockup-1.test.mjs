import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=load('src/pages/LessonCheckStudio.jsx');
const skin=load('src/pages/LessonCheckApprovedMockupOne.css');
const mascot=load('public/lesson-check-approved-mascot.svg');

test('approved mockup is isolated from global top navigation and footer',()=>{
  assert.ok(page.includes("import './LessonCheckApprovedMockupOne.css'"));
  assert.match(skin,/\.lcs-page--library\s*\{/);
  assert.doesNotMatch(skin,/(?:\.brian-nav|\.bes-top-chrome|\.app-footer|\.bes-footer|\bbody\s*\{|#root\s*\{)/i);
  assert.match(skin,/\/\* BRIAN Activity Arcade · approved mockup #1/);
});
test('Hero is composed of accessible real text, live stats, and functioning buttons',()=>{
  assert.match(page,/className="lcs-arcade-title-row"/);
  assert.match(page,/Fun<\/span>/);
  assert.match(page,/is-assessment">Assessment/);
  assert.match(page,/\{activities\.length\}/);
  assert.match(page,/\{focusCounts\.grammar\}/);
  assert.match(page,/\{focusCounts\.vocabulary\}/);
  assert.match(page,/\{focusCounts\.skills\}/);
  assert.match(page,/className="lcs-start-assessment"[\s\S]*?setAssessmentWorkspaceView\('session'\)/);
  assert.match(page,/className="lcs-open-reports"[\s\S]*?setAssessmentWorkspaceView\('reports'\)/);
  assert.match(page,/isLeader \? <button className="lcs-arcade-create"[\s\S]*?onClick=\{openNewActivity\}/);
  assert.match(page,/className="lcs-cta-copy"/);
});
test('Old full-bleed raster is replaced with a scalable decorative SVG',()=>{
  assert.match(page,/src="\/lesson-check-approved-mascot\.svg"/);
  assert.ok(!page.includes('src="/lesson-check-hero-fullwidth-v22.webp"'));
  assert.match(mascot,/<svg[^>]+viewBox="0 0 560 400"/);
  assert.match(mascot,/<linearGradient/);
  assert.ok(!mascot.includes('data:image/'));
  assert.match(skin,/\.lcs-page--library \.lcs-hero-art\s*\{/);
  assert.match(skin,/object-fit:contain!important/);
});
test('Gallery keeps actual cards, filters, permissions and data-backed actions',()=>{
  for(const name of ['lcs-arcade-grid','lcs-arcade-tabs','lcs-arcade-filterbar','lcs-arcade-card','lcs-arcade-pagination-controls'])
    assert.ok(page.includes(name),name);
  assert.match(page,/onClick=\{\(\) => removeActivity\(item\)\}/);
  assert.match(page,/onClick=\{\(\) => openTeachingMode\(item\)\}/);
  assert.match(skin,/\.lcs-page--library \.lcs-arcade-grid\s*\{/);
  assert.match(skin,/@media \(max-width:500px\)/);
});
