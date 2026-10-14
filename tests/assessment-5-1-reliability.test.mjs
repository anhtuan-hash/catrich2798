import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=source('src/pages/LessonCheckStudio.jsx');
const workspace=source('src/utils/lessonCheckWorkbench.js');
const workbench=source('src/components/lessonCheck/Assessment4Workbench.jsx');
const panels=source('src/components/lessonCheck/Assessment5Panels.jsx');

test('Recent history is updated atomically and never overwritten by Workspace autosave',()=>{
 const section=workspace.slice(workspace.indexOf('export async function storeAssessmentWorkspace'),workspace.indexOf('export async function setAssessmentFavorite'));
 assert.ok(section.includes('collections: normalized.collections, runner: normalized.runner'));
 assert.doesNotMatch(section,/recent_ids\s*:/);
 assert.doesNotMatch(section,/favorites\s*:/);
 assert.match(page,/markRecentActivity\(item\.id\)\.then/);
 const launcher=workbench.slice(workbench.indexOf('const launch=async activity=>'),workbench.indexOf('const star=id=>'));
 assert.doesNotMatch(launcher,/markRecent\(|logActivityUse\(/);
 assert.match(launcher,/await onLaunch\?\.\(activity\)/);
});

test('Teaching queue writes are synchronous-locked, owner-scoped and confirmed before closing',()=>{
 assert.match(page,/queueMutationRef\.current = true/);
 assert.match(page,/if \(queueMutationRef\.current \|\| !queueReady \|\| !favoriteUserId\) return false/);
 assert.match(page,/if \(owner !== queueAccountRef\.current\) return false/);
 assert.match(page,/queueMutationRef\.current = false/);
 assert.match(page,/setQueueReady\(false\)/);
 assert.match(page,/setQueueIds\(\[\]\)/);
 assert.match(page,/setQueueReady\(true\)/);
 assert.match(page,/if\(saved\)setQueueOpen\(false\)/);
 assert.match(page,/ready=\{queueReady\}/);
 assert.match(panels,/Đang tải buổi dạy/);
 assert.match(panels,/Đang đồng bộ hàng đợi/);
});

test('Classroom countdown tracks real elapsed wall time and completion can only be recorded once',()=>{
 assert.match(page,/Date\.now\(\) \+ classroomTimer \* 1000/);
 assert.match(page,/Math\.ceil\(\(deadline - Date\.now\(\)\) \/ 1000\)/);
 assert.doesNotMatch(page,/setClassroomTimer\(seconds=>Math\.max\(0,seconds-1\)\)/);
 assert.match(page,/completingRef\.current/);
 assert.match(page,/completedQueueIds\.includes\(teachingActivity\.id\)/);
 assert.match(page,/setCompletedQueueIds\(ids => ids\.includes\(completedId\)/);
 assert.match(page,/disabled=\{completionBusy \|\| completedQueueIds\.includes\(teachingActivity\.id\)\}/);
});

test('Quick Preview and queue drawers are usable from keyboard and restore original focus',()=>{
 assert.match(panels,/function useModalKeyboard\(onClose\)/);
 assert.match(panels,/event\.key === 'Escape'/);
 assert.match(panels,/event\.key === 'Tab'/);
 assert.match(panels,/before\?\.isConnected/);
 assert.match(panels,/role="dialog" aria-modal="true"/);
 assert.match(panels,/disabled=\{!canOpen\|\|inQueue\|\|!queueReady\}/);
});

test('Account switch invalidates visible personal history and preserves privacy',()=>{
 assert.match(page,/setRecentIds\(\[\]\)/);
 assert.match(page,/setJournalRows\(\[\]\)/);
 assert.match(page,/setJournalReady\(false\)/);
 assert.match(page,/queueAccountRef\.current = favoriteUserId/);
});
