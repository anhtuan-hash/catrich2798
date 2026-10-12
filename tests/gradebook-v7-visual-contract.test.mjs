import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const page=read('src/pages/GradebookStudio.jsx');
const css=read('src/styles/GradebookRebirthV7.css');
const focus=read('src/styles/GradebookFocusV5.css');
const engine=read('src/components/gradebook/GradebookEngine.jsx');
const root=postcss.parse(css);
assert.match(page,/gradebook-studio gb4-spectrum gb5-focus gb7-rebirth/);
assert.match(page,/import '..\/styles\/GradebookRebirthV7\.css'/);
assert.ok(page.indexOf("import '../styles/GradebookRebirthV7.css'")>page.indexOf("import '../styles/GradebookFocusV5.css'"));
assert.match(page,/gb7-heading-lockup/);
assert.match(page,/gb7-heading-icon/);
assert.match(page,/gb4-palette-selector/);
assert.match(page,/requestGradebookAction\('entry'\)/);
assert.match(page,/requestGradebookAction\('pdf'\)/);
assert.match(engine,/gradeRoundBonus\(activeRound/);
assert.match(engine,/roundScore\(activeRound, student\.id, studentIds\)/);
assert.match(engine,/onBulkPaste=\{bulkPasteMockExam\}/);
assert.match(engine,/brian-gradebook-density-v6/);
const ruleSelectors=[];
root.walkRules(rule=>{
  const selector=rule.selector.trim();
  // The design layer must not change app-wide navigation, user/footer chrome or score formulas.
  assert.ok(selector.split(',').every(part=>part.trim().startsWith('#root .gradebook-studio.gb7-rebirth') ||
    part.trim().startsWith('html[data-theme="dark"] #root .gradebook-studio.gb7-rebirth') ||
    part.trim().startsWith('.gb-academic-hero') || part.trim().startsWith('.gb-academic-heading') ||
    part.trim().startsWith('.gb-academic-class-row') || part.trim().startsWith('.gb-academic-actions') ||
    part.trim().startsWith('.gb5-focusbar') || part.trim().startsWith('.gb5-focusbar-main') ||
    part.trim().startsWith('.hr-grade-navigation') || part.trim().startsWith('.hr-grade-panel')),
    'Selector escapes scoped Gradebook V7: '+selector);
  ruleSelectors.push(selector);
});
for(const required of ['--gb7-primary','#root .gradebook-studio.gb7-rebirth .gb-academic-heading','#root .gradebook-studio.gb7-rebirth .hr-gradebook .hr-grade-table tbody td','#root .gradebook-studio.gb7-rebirth .gb5-focusbar']){
  assert.ok(css.includes(required),'Missing V7 visual contract: '+required);
}
assert.match(focus, /container-name:gb-navigation/);
for(const width of [1050,720,460])assert.ok(focus.includes('@container gb-navigation (max-width:'+width+'px)'), 'V6 geometry guard missing');
assert.ok(ruleSelectors.length>65,'V7 theme appears incomplete');
console.log('Gradebook V7 scoped visual contract PASS: '+ruleSelectors.length+' rules');
