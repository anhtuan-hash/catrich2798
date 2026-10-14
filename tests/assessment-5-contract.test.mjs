import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=get('src/pages/LessonCheckStudio.jsx');
const header=get('src/components/lessonCheck/Assessment5Header.jsx');
const panels=get('src/components/lessonCheck/Assessment5Panels.jsx');
const styles=get('src/components/lessonCheck/Assessment5.css');
const service=get('src/utils/lessonCheckTeaching.js');
const sql=get('supabase/migrations/20261014060000_assessment_5_teaching_queue.sql');
const wb=get('src/components/lessonCheck/Assessment4Workbench.jsx');

test('Phase 1: Colorful Bento launcher is an isolated accessible live-data dashboard',()=>{
 assert.match(page,/import Assessment5Header from/);
 assert.match(page,/<Assessment5Header activities=\{activities\}/);
 assert.match(header,/aria-label="BRIAN Assessment 5.0"/);
 for(const name of ['is-favorites','is-recent','is-queue','is-workspace'])assert.ok(styles.includes(name));
 assert.match(styles,/@media\(max-width:940px\)/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(styles,/(?:^|\n)body\s*\{|\.brian-nav\s*\{/);
});
test('Phase 2: title search, advanced filters, grid/list and permission-safe preview',()=>{
 assert.match(page,/lcs-search-always-visible/);
 assert.match(page,/matchesActivityTitle\(item\.title, q\)/);
 assert.match(page,/cefrFilter !== 'all'/);
 assert.match(page,/deliveryFilter !== 'all'/);
 assert.match(page,/durationFilter !== 'all'/);
 assert.match(page,/lcs5-list-view/);
 assert.match(page,/sortMode === 'favorites'/);
 assert.match(page,/statusFilter === 'recent'/);
 assert.match(panels,/<img className="lcs5-preview-image" src=\{activity\.thumbnailUrl\}/);
 assert.doesNotMatch(panels,/<iframe|srcDoc|getLessonCheckActivityContent/);
 assert.match(page,/const opened=await openTeachingMode\(availableQueueItems\[0\]\)/);
});
test('Phase 3: queue persists privately and classroom navigator never bypasses activity permission',()=>{
 assert.match(sql,/create table if not exists public\.lesson_check_teaching_queue/);
 assert.match(sql,/alter table public\.lesson_check_teaching_queue enable row level security/);
 assert.match(sql,/user_id=auth\.uid\(\)/);
 assert.match(sql,/lesson_check_is_approved_user\(\)/);
 assert.match(sql,/lesson_check_has_activity_access\(u\)/);
 assert.match(sql,/cardinality\(new\.activity_ids\)>20/);
 assert.match(service,/supabase\.from\('lesson_check_teaching_queue'\)/);
 assert.match(page,/const opened=await openTeachingMode\(availableQueueItems\[next\]\)/);
 assert.match(page,/classroomQueueIndex!==null/);
 assert.match(page,/completeQueueStep/);
 assert.match(page,/getLessonCheckActivityContent\(item\.id\)/);
 assert.match(panels,/onDragStart/);
});
test('Phase 4: bulk governance and insights use genuine scoped data',()=>{
 assert.match(page,/saveActivityAttributes\(id,/);
 assert.match(page,/if\(!isLeader\|\|!bulkIds\.length\|\|bulkBusy\)return/);
 assert.match(page,/openWorkspaceTab\('permissions'\)/);
 assert.match(wb,/initialSelectedActivities/);
 assert.match(page,/listActivityJournal\(\{leader:isLeader,userId:favoriteUserId,limit:500\}\)/);
 assert.match(page,/logActivityUse\(favoriteUserId,teachingActivity/);
 assert.match(page,/sessionStorage\.setItem\('lcs5-prefs-'/);
 assert.doesNotMatch(page,/sessionStorage\.setItem\([^\n]*student|sessionStorage\.setItem\([^\n]*grade10/i);
});
test('Phase 5: no AI or destructive database work in Assessment 5',()=>{
 assert.doesNotMatch(sql,/\b(drop table|truncate|delete from public\.lesson_check_assessment_sessions)\b/i);
 assert.doesNotMatch([page,header,panels,service].join('\n'),/openai\.com|generativelanguage|api\.anthropic|\baiCompletion\b/i);
 assert.match(sql,/revoke all on function public\.lesson_check_mark_recent\(uuid\) from public,anon/);
 assert.match(sql,/grant execute on function public\.lesson_check_mark_recent\(uuid\) to authenticated/);
});
