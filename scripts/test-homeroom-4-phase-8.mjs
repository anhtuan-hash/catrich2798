import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/HomeroomWorkspace.jsx');
const style=read('src/styles/homeroom-4-loading.css');
const nav=read('src/components/homeroom/HomeroomNavigationPalette.jsx');
const overview=read('src/components/homeroom/HomeroomOverviewCompactTab.jsx');
const report=read('src/components/homeroom/HomeroomOperationsCenter.jsx');
assert.match(page,/import React, \{ lazy, Suspense, useEffect, useRef, useState \} from 'react'/);
const heavy=[
  ['HomeroomConductTab',"../components/HomeroomConductTab.jsx"],
  ['StudentRecordsTab',"../components/homeroom/StudentRecordsTab.jsx"],
  ['HomeroomStudentHub',"../components/homeroom/HomeroomStudentHub.jsx"],
  ['SubjectStudentsTab',"../components/homeroom/SubjectStudentsTab.jsx"],
  ['HomeroomEngagement',"../components/homeroom/HomeroomEngagement.jsx"],
  ['HomeroomClassProfileEditor',"../components/homeroom/HomeroomClassProfileEditor.jsx"],
];
for(const [name,path] of heavy){
  assert.ok(page.includes(`const ${name} = lazy(() => import('${path}')`),'Must lazy-load '+name);
  assert.ok(!page.includes(`import ${name} from '${path}'`),'No eager '+name+' boot import');
  assert.match(page,new RegExp('<'+name+'\\b'),'Keep mounted behavior for '+name);
}
for(const [name,field] of [['AttendanceTab','AttendanceTab'],['ClassLifecycleTab','ClassLifecycleTab'],['DataSafetyTab','DataSafetyTab']]){
  assert.match(page,new RegExp('const '+name+' = lazy\\(\\(\\) => import\\('),'Named exports are lazy');
  assert.match(page,new RegExp('default: mod\\.'+field),'Named export resolution');
}
assert.match(page,/<Suspense fallback=\{<section className="hr-v4-tab-loading"/);
assert.match(page,/<main id="hr-workspace-body"/,'Accessible main region retained');
assert.match(page,/__besAwaitingCloudClass === true/,'Never expose empty synthetic workspace');
assert.match(page,/fastPreferredHomeroom\(user\)/,'Keep cached instant assigned class');
assert.match(page,/homeroomSessionCache/,'Keep account scoped cached workspace');
assert.match(page,/snapshotKey\(currentUser, workspace\.id\)/);
assert.match(page,/subjectMode \? <SubjectStudentsTab/,'Teacher subject view remains isolated');
assert.match(page,/<HomeroomOverviewCompactTab workspace=\{workspace\}/,'Overview remains immediate');
assert.match(nav,/aria-current=\{active === tab\.key \? 'page' : undefined\}/,'Navigation still accessible');
assert.match(overview,/!subjectMode \? <HomeroomOperationsCenter/,'Task center must not leak into subject view');
assert.match(report,/onCommit\(next,/,'Uses authorized commit path');
assert.match(report,/if\(saved\?\.ok===false\)/,'Do not report success on cloud failure');
assert.match(style,/\.page\.hr-page\.hr-v4/);
assert.match(style,/prefers-reduced-motion/);
assert.doesNotMatch(style,/(^|\n)\s*:root\s*\{/,'No global CSS');
console.log('Homeroom 4.0 Phase 8: split heavy tabs, keep accurate class hydration, subject isolation, accessible fallback and stage 1–7 UX.');
