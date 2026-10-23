import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL('../' + file, import.meta.url),'utf8');
const page = read('src/pages/GradebookStudio.jsx');
const css = read('src/styles/GradebookHeroRefined.css');
const canvas = read('src/styles/GradebookHeroCanvas.css');
const check = (name, ok) => { assert.ok(ok,name); console.log('✓ ' + name); };
const from = page.indexOf('<section className={\'gbmac-shell gbmac-hero-canvas gbmac-hero-refined\'');
const to = page.indexOf('</section>',from);
const hero = page.slice(from,to);
check('native standalone Gradebook Hero is refined without changing its media owner', from>=0 && hero.includes('gbmac-hero-content') && hero.includes('gbmac-hero-media'));
check('removed Brian English/Gradebook eyebrow', !hero.includes('BRIAN ENGLISH / GRADEBOOK') && !hero.includes('gbmac-shell-eyebrow'));
check('single clear title remains',hero.includes("<h1>{vi ? 'Sổ điểm' : 'Gradebook'}</h1>"));
check('two real selector controls only, with original change handlers', (hero.match(/<select/g)||[]).length===2 &&
 hero.includes('value={workspaceId}') && hero.includes('onChange={(event)=>switchGradebookClass(event.target.value)}') &&
 hero.includes('value={selectedSemester}') && hero.includes("setSelectedSemester(event.target.value)"));
check('dirty-score guard still blocks semester change', hero.includes("if(gradebookDirty){window.alert("));
check('class list still comes from active classes',hero.includes('activeClasses.map(item=>') && hero.includes("item.className || classLabel(item)"));
check('subject, year and student count are concise passive metadata',hero.includes('gbmac-hero-meta') &&
 hero.includes('activeSubject') && hero.includes('activeMeta?.schoolYear') && hero.includes('studentCount') &&
 !hero.includes('gbmac-shell-field'));
check('both student roster and add-class actions remain working',hero.includes('onClick={openStudentRoster}') && hero.includes('onClick={()=>setCreateOpen(value=>!value)}'));
check('hero edit remains gated to privileged users and unchanged',hero.includes('canEditGradebookHero ?') &&
 hero.includes('setGradebookHeroEditorOpen(true)'));
check('status tracks unsaved changes',hero.includes('gbmac-hero-save-state') && hero.includes('gradebookDirty'));
check('media supports existing image/video and edit preview',hero.includes("gradebookHero.backgroundType === 'video'") &&
 hero.includes('gradebookHero.backgroundUrl') &&
 page.includes('onPreview={setGradebookHeroPreview}'));
check('scoped Gradebook CSS is imported last',page.indexOf("import '../styles/GradebookHeroRefined.css';") >
 page.indexOf("import '../styles/GradebookHeroCanvas.css';") );
check('compact hero and controls are sized significantly below old default',css.includes('min-height: 285px;') &&
 css.includes('min-height: 61px;') && css.includes('min-height: 35px;') &&
 canvas.includes('min-height: 366px;'));
check('left-side cluster preserves artwork and adapts for tablet/mobile',css.includes('width: min(57%, 780px);') &&
 css.includes('@media (max-width: 820px)') &&
 css.includes('@media (max-width: 680px)') &&
 css.includes('@media (max-width: 390px)'));
check('no global typography/season/theme mutations in new file',!css.includes('html body') &&
 !css.includes('dashboard-hero') && !css.includes('!important'));
console.log('PASS: Gradebook editorial hero retains all controls, data and media.');
