import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=load('src/pages/GradebookStudio.jsx');
const engine=load('src/components/gradebook/GradebookEngine.jsx');
const spectrum=load('src/styles/GradebookSpectrumV4.css');
const original=load('src/styles/GradebookAcademicWorkspace.css');

assert.match(page,/import '..\/styles\/GradebookAcademicWorkspace.css';\s*import '..\/styles\/GradebookSpectrumV4.css';/);
assert.match(page,/className=\\{\\x60page hr-page gradebook-studio gb4-spectrum gb5-focus gb4-palette-\\$\\{visualPalette\\}\\x60\\}/);
assert.match(page,/bes-gradebook-spectrum-v4:/);
assert.match(page,/localStorage\.setItem/);
assert.match(page,/\['electric','coral','orbit'\]/);
for (const name of ['electric','coral','orbit']) assert.ok(page.includes("id:'"+name+"'"),'missing palette '+name);
assert.match(page,/role="group" aria-label="Chọn bảng màu Sổ điểm"/);
assert.match(page,/aria-pressed=\{visualPalette === palette\.id\}/);
assert.match(page,/onClick=\{\(\) => setVisualPalette\(palette\.id\)\}/);
assert.match(page,/gradebookDirty \? 'Có thay đổi chưa lưu' : 'Đồng bộ an toàn'/);
assert.match(page,/\{studentCount\} học sinh/);
assert.match(page,/switchGradebookClass\(item\.id\)/);
assert.match(page,/onClick=\{openStudentRoster\}/);
assert.match(page,/requestGradebookAction\('entry'\)/);
assert.match(page,/requestGradebookAction\('summary'\)/);
assert.match(page,/requestGradebookAction\('pdf'\)/);
assert.match(engine,/VIEWS\.map\(/);
assert.match(engine,/onClick=\{\(\) => onViewChange\(item\.id\)\}/);
assert.match(engine,/className="gb4-view-icon"/);
assert.match(engine,/gradeRoundBonus\(activeRound/);
assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
assert.match(engine,/mockExams: normalizeMockExams\(source\.mockExams\)/);
assert.match(engine,/onBulkPaste=\{bulkPasteMockExam\} onSetLock=\{setMockExamLock\}/);
assert.match(engine,/dirty \? 'Có thay đổi chưa lưu' : 'Dữ liệu đã lưu'/);
for (const token of [
  '.gb4-spectrum', '.gb4-palette-coral','.gb4-palette-orbit','.gb4-palette-selector',
  '.gb4-hero-signals','.gb-academic-class-list button.is-active',
  '.gb4-view-icon','.hr-grade-views button.active','.hr-grade-table tbody tr:focus-within',
  '.hr-grade-input:focus','.gb-mock-hero','.gb-mock-score:focus',
  '@media(max-width:850px)','@media(max-width:540px)',
  '@media(prefers-reduced-motion:reduce)',
]) assert.ok(spectrum.includes(token), 'design missing '+token);
assert.match(spectrum,/#root \.gradebook-studio\.gb4-spectrum/);
assert.doesNotMatch(spectrum,/\.brian-nav|\.bes-top-chrome|\.signature-footer|html body footer|#root\s*\{/);
assert.equal((spectrum.match(/\{/g)||[]).length,(spectrum.match(/\}/g)||[]).length,'CSS balance');
assert.ok(spectrum.length >= 12000, 'design layer should be comprehensive and substantial');
assert.ok(original.includes('overflow:auto') && original.includes('position:sticky'),'frozen table and overflow must remain');
assert.doesNotMatch(spectrum,/animation:\s*(?:infinite|.+infinite)/);
console.log('PASS gradebook Spectrum V4: scoped high-contrast palettes, navigable score tabs, save status, responsive, accessibility, legacy grade math');
