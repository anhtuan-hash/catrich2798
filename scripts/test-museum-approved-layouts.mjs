import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = new URL('../src/features/immersive-gallery/', import.meta.url);
const screens = [
  ['Submissions', [
    ['v3/MuseumLabApp.jsx', '<SubmissionsScreen', "import './museumSubmissionsEditorial.css'"],
    ['v2/screens/SubmissionsScreen.jsx', 'swiss-editorial-submissions-hero', 'transport={transport} editorial'],
    ['v3/museumSubmissionsEditorial.css', '.swiss-editorial-submissions-hero'],
  ]],
  ['Exhibitions', [
    ['v3/MuseumLabApp.jsx', '<ExhibitionsScreen'],
    ['v2/screens/ExhibitionsScreen.jsx', 'swiss-editorial-exhibitions-grid', "import './ExhibitionsScreen.css'"],
    ['v2/screens/ExhibitionsScreen.css', '.swiss-editorial-exhibitions-hero'],
  ]],
  ['Teaching Plan', [
    ['v3/MuseumLabApp.jsx', '<TeachingPlanScreen'],
    ['v2/screens/TeachingPlanScreen.jsx', 'swiss-teaching-plan', 'plan-masthead', "import './TeachingPlanScreen.css'"],
    ['v2/screens/TeachingPlanScreen.css', '.swiss-teaching-plan .plan-masthead'],
  ]],
  ['Create a new lesson', [
    ['v3/MuseumLabApp.jsx', '<LessonWizard'],
    ['v3/MuseumLessonFlow.jsx', 'swiss-editorial-wizard', 'wizard-step-feature', "import './museumLessonWizardEditorial.css'"],
    ['v3/museumLessonWizardEditorial.css', '.wizard-step-feature'],
  ]],
  ['Student Workshop', [
    ['v3/MuseumLabStudent.jsx', 'bml-student-dual-workspace', 'aria-expanded={bannerExpanded}',
      'setBannerExpanded(false)', "import './museumStudentWorkspace.css'"],
    ['v3/museumStudentWorkspace.css', '.bml-workshop-ribbon', '[data-banner-expanded="false"]'],
  ]],
];

for (const [screen, files] of screens) {
  for (const [path, ...markers] of files) {
    const content = readFileSync(new URL(path, source), 'utf8');
    for (const marker of markers) {
      assert.ok(content.includes(marker), `${screen}: ${path} is missing ${marker}`);
    }
  }
}

console.log('All five approved Museum Lab layouts are wired into the build.');
