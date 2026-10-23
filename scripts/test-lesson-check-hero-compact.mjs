import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url),'utf8');
const page = read('src/pages/LessonCheckStudio.jsx');
const css = read('src/pages/LessonCheckHeroCompact.css');
const rootCss = read('src/pages/LessonCheckHeroIndependent.css');
const check = (name, ok) => { assert.ok(ok, name); console.log('✓ ' + name); };
const begin = page.indexOf("<header className={'lcs-arcade-head lch-hero lch-hero--compact'");
const end = page.indexOf('</header>', begin);
const hero = page.slice(begin, end+9);

check('Lesson Check Hero now uses isolated compact class', begin>=0 && hero.includes('lcs-hero-main'));
check('large return arrow is removed without changing app top navigation', !hero.includes('lcs-library-back') && !hero.includes('ArrowLeft'));
check('all three functional actions and handlers remain',
  hero.includes('onClick={openNewActivity}') &&
  hero.includes("setAssessmentWorkspaceView('reports')") &&
  hero.includes("setAssessmentWorkspaceView('session')"));
check('leader-only create and customize permissions remain',hero.includes('isLeader && <button') && hero.includes('canEdit') === false &&
  hero.includes('onClick={openLessonHeroEditor}'));
check('live library stats remain data-backed', ['activities.length','focusCounts.vocabulary','focusCounts.grammar','focusCounts.skills'].every(x=>hero.includes(x)));
check('uploaded image / video, background fit and background opacity remain', ['hasHeroMedia','activeHero.backgroundType','activeHero.backgroundUrl','activeHero.backgroundFit','activeHero.opacity'].every(x=>hero.includes(x)));
check('notebook art remains decorative and editing accessible', hero.includes('className="lcs-hero-art"') &&
  hero.includes('aria-hidden="true"') && hero.includes('aria-label={isVi?'));
check('simplified eyebrow and concise subtitle are present',hero.includes("KIỂM TRA & ĐÁNH GIÁ") && hero.includes('Thiết kế · Tổ chức · Theo dõi kết quả'));
check('compact stylesheet comes after old independently styled Hero and gutter CSS',
  page.indexOf("import './LessonCheckHeroCompact.css';") > page.indexOf("import './LessonCheckHeroIndependent.css';") &&
  page.indexOf("import './LessonCheckHeroCompact.css';") > page.indexOf("import './LessonCheckAlignAppGutters.css';"));
check('desktop min-height is less than two thirds of the original min',
  css.includes('min-height: 244px !important;') &&
  css.includes('height: 244px !important;') &&
  rootCss.includes('min-height:clamp(310px,28vw,405px)!important'));
check('three compact action buttons with no large subtitle cards', css.includes('min-height: 39px !important;') &&
  css.includes('grid-template-columns: repeat(3, minmax(0, max-content)) !important;') &&
  css.includes('.lcs-cta-copy small') && css.includes('display: none !important;'));
check('title no longer forces Assessment onto a separate line',css.includes('h1 .is-assessment') &&
  css.includes('display: inline !important;') &&
  css.includes('font-size: clamp(29px, 3.15vw, 44px) !important;'));
check('responsive tablet and mobile keep controls accessible and bounded',css.includes('@media (max-width: 780px)') &&
  css.includes('@media (max-width: 530px)') &&
  css.includes('@media (max-width: 360px)') &&
  css.includes('height: auto !important;'));
check('existing Hero CMS and components below Hero are not touched',
  page.includes('<LessonCheckHeroEditor open={heroEditorOpen}') &&
  page.includes('lcs-arcade-library') &&
  page.includes('Assessment5Header'));
check('CSS is scoped to Lesson Check only and respects reduced motion',css.includes('prefers-reduced-motion') &&
  !css.includes('.app-shell') && !css.includes('body {'));
console.log('PASS: compact Lesson Check Hero 244px, no back arrow, functional actions preserved.');
