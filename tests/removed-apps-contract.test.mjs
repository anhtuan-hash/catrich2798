import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { APPS } from '../src/data/apps.js';
import { APP_ORDER } from '../src/pages/appsDirectoryData.js';
import { isRetiredApp, isRetiredPath } from '../src/data/retiredApps.js';
const read = path => readFileSync(new URL(path, import.meta.url),'utf8');
const slugs = [
  "assessment-preview",
  "shared-game-games4esl",
  "shared-game-wordwall",
  "shared-game-educaplay",
  "shared-game-learningapps",
  "shared-game-h5p",
  "shared-game-genially",
  "shared-game-bookwidgets",
  "shared-game-classtools",
  "shared-game-kahoot",
  "shared-game-scattergories",
  "shared-game-baamboozle",
  "shared-game-c36c61c3-2b71-475d-bf3a-65e27756e483",
  "shared-game-f8bcfe95-67ef-49e9-b3e9-5f5ac2a12381",
  "shared-game-17ec8366-0af1-4503-8176-656749a610b7",
  "shared-game-4f5cb56c-9c4e-4476-a810-2bb60cb1fa7c",
  "shared-game-e2bf22d2-b958-451b-8c12-e628cc6424af",
  "shared-game-e1baa91e-4c2a-4006-9c40-0cd531b6302d"
];
test('18 retired entries cannot appear in the Launcher registry, sorting or stale shortcuts', () => {
  for (const slug of slugs) {
    assert.ok(!APPS.some(x=>x.slug===slug),slug+' in APPS');
    assert.ok(!APP_ORDER.includes(slug),slug+' in APP_ORDER');
    assert.ok(isRetiredApp({slug}),slug+' must be blocked');
  }
  assert.ok(isRetiredPath('assessment-preview'));
  assert.ok(isRetiredPath('#/assessment-preview'));
});
test('legacy external apps and assessment binaries are removed', () => {
 const paths=["src/data/sharedGameApps.js","src/pages/AssessmentPreview.jsx","public/assessment-studio-preview.html","src/features/assessmentStudio/DiagnosticScan.jsx","src/features/assessmentStudio/DiagnosticScan.css","src/features/assessmentStudio/ExitTicket.jsx","src/features/assessmentStudio/ExitTicket.css","src/features/assessmentStudio/SpeakScaleStudio.jsx","src/features/assessmentStudio/SpeakScaleStudio.css","src/features/assessmentStudio/diagnosticCore.js","src/features/assessmentStudio/exitTicketCore.js","src/features/assessmentStudio/speakingCore.js",".github/workflows/assessment-diagnosticscan.yml",".github/workflows/assessment-exitticket.yml",".github/workflows/assessment-preview-launcher.yml",".github/workflows/assessment-speaksale.yml","tests/assessment-diagnosticscan.test.mjs","tests/assessment-exitticket.test.mjs","tests/assessment-preview-card.test.mjs","tests/assessment-speaksale.test.mjs"];
 for (const path of paths) assert.equal(existsSync(new URL('../'+path,import.meta.url)), false, path);
 const main=read('../src/main.jsx');
 assert.doesNotMatch(main,/AssessmentPreview|route === 'assessment-preview'/);
 assert.doesNotMatch(main,/\.\/pages\/AssessmentPreview/);
 assert.match(main,/currentRoute === 'assessment-core'/);
 assert.match(main,/currentRoute === 'qb-practice'/);
});
test('only requested six cloud links are blocked, not the remaining custom game system', () => {
 const custom=read('../src/utils/customGames.js');
 for (const id of ["c36c61c3-2b71-475d-bf3a-65e27756e483","f8bcfe95-67ef-49e9-b3e9-5f5ac2a12381","17ec8366-0af1-4503-8176-656749a610b7","4f5cb56c-9c4e-4476-a810-2bb60cb1fa7c","e2bf22d2-b958-451b-8c12-e628cc6424af","e1baa91e-4c2a-4006-9c40-0cd531b6302d"]) assert.ok(custom.includes(id),'missing legacy cache filter '+id);
 assert.match(custom,/export async function listCustomGames/);
 assert.match(custom,/export async function createCustomGame/);
 assert.match(custom,/export async function deleteCustomGame/);
 const drawer=read('../src/pages/WebAppsAndroidDrawer.jsx');
 assert.doesNotMatch(drawer,/SHARED_GAME_APPS/);
 assert.match(drawer,/\.\.\.customGameApps/);
 assert.match(read('../src/data/apps.js'),/slug: 'assessment-core'/);
 assert.match(read('../src/data/apps.js'),/slug: 'lesson-check-studio'/);
});
test('account-specific launcher positions are sanitized, unrelated items preserved', () => {
 const c=read('../src/utils/launcherPreferences.js');
 for(const slug of slugs) assert.ok(c.includes("'"+slug+"'"),slug);
 assert.doesNotMatch(c,/Place this newly published preview/);
 assert.match(c,/safeItemIds\.forEach/);
});
