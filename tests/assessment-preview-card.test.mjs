import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APPS } from '../src/data/apps.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
test('Assessment Studio preview exists as exactly one BRIAN launcher tile',()=>{
  const items = APPS.filter(x => x.slug === 'assessment-preview');
  assert.equal(items.length,1);
  const app=items[0];
  assert.equal(app.route,'assessment-preview');
  assert.equal(app.titleVi,'BRIAN Assessment Studio');
  assert.equal(app.hideable,false);
  assert.match(app.descVi,/Bản xem thử/);
  assert.match(app.statusVi,/Không AI/);
  assert.match(read('../src/pages/appsDirectoryData.js'),/assessment-core', 'assessment-preview'/);
  assert.match(read('../src/data/designProfiles.js'),/'assessment-preview':/);
});

test('launcher route opens the static production preview inside BRIAN',()=>{
  const main=read('../src/main.jsx');
  const frame=read('../src/pages/AssessmentPreview.jsx');
  assert.match(main,/const AssessmentPreview = lazy/);
  assert.match(main,/'assessment-core', 'assessment-preview', 'platform-readiness'/);
  assert.match(main,/currentRoute === 'assessment-preview' && currentUser/);
  assert.match(frame,/src="\/assessment-studio-preview\.html"/);
  assert.match(frame,/sandbox="allow-scripts allow-modals"/);
  assert.match(frame,/href="#\/apps"/);
  assert.match(frame,/Bản xem thử/);
});

test('app route is teacher accessible but not a public route',()=>{
  const permissions=read('../src/utils/permissions.js');
  const main=read('../src/main.jsx');
  assert.match(permissions,/route === 'apps' \|\| route === 'tools' \|\| route === 'assessment-preview'/);
  const publicRoutes=main.match(/const PUBLIC_ROUTES = new Set\(\[([^\]]+)\]\)/)?.[1]||'';
  assert.doesNotMatch(publicRoutes,/assessment-preview/);
});

test('existing custom launcher preferences place preview after Question Bank once',()=>{
  const preferences=read('../src/utils/launcherPreferences.js');
  assert.match(preferences,/safeItemIds\.includes\('assessment-preview'\) && !order\.includes\('assessment-preview'\)/);
  assert.match(preferences,/order\.splice\(questionBankIndex >= 0 \? questionBankIndex \+ 1 : 0, 0, 'assessment-preview'\)/);
});

test('standalone static preview uses no AI or student data API',()=>{
  const html=read('../public/assessment-studio-preview.html');
  assert.match(html,/PRODUCTION PREVIEW · NO AI/);
  assert.match(html,/không lưu dữ liệu/);
  assert.doesNotMatch(html,/\bfetch\s*\(|supabase\.from\s*\(|localStorage\.setItem\s*\(/);
});
