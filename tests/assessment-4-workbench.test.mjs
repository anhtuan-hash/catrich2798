import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const page = read('src/pages/LessonCheckStudio.jsx');
const workbench = read('src/components/lessonCheck/Assessment4Workbench.jsx');
const service = read('src/utils/lessonCheckWorkbench.js');
const recovery = read('src/components/lessonCheck/AssessmentWorkspace.jsx');
const sql = read('supabase/migrations/20261014020000_assessment_4_workbench.sql');
const css = read('src/components/lessonCheck/Assessment4Workbench.css');

test('Assessment 4.0 stays inside Lesson Check without replacing existing library', () => {
 assert.match(page,/React\.lazy\(\(\) => import\('\.\.\/components\/lessonCheck\/Assessment4Workbench\.jsx'\)\)/);
 assert.match(page,/workbenchOpen \? <div id="assessment4-workbench"/);
 assert.match(page,/<section className="lcs-arcade-library" id="lcs5-activity-library">/);
 assert.match(page,/<AssessmentWorkspace/);
 assert.doesNotMatch(css,/(?:\.brian-nav|\.app-shell|#root|body\s*\{)/);
});
test('All ten functional workspace tabs have concrete actions and real data', () => {
 for(const title of ['Của tôi','Bộ sưu tập','Lesson Runner','Nhật ký lớp','Phân tích','Can thiệp',
 'Phân quyền','Lịch sử phiên bản','Chất lượng','Minh chứng'])
 assert.ok(workbench.includes(title), title);
 for (const fn of ['storeAssessmentWorkspace','logActivityUse','saveIntervention','bulkGrantActivities','readActivityVersion',
 'assessActivityQuality','csvDownload','listActivityJournal','listInterventions'])
 assert.ok(workbench.includes(fn),fn);
 assert.match(workbench,/isLeader && tab==='permissions'/);
 assert.match(workbench,/isLeader && tab==='versions'/);
 assert.match(workbench,/isLeader && tab==='evidence'/);
});
test('Workspace persistence uses Supabase and contains no student localStorage', () => {
 assert.match(service, /supabase.from\('lesson_check_workspace_state'\)/);
 assert.match(service, /supabase.from\('lesson_check_session_recovery'\)/);
 assert.doesNotMatch(service,/localStorage|sessionStorage/);
 assert.doesNotMatch(recovery,/localStorage/);
 assert.match(recovery,/loadSessionRecovery\(userId\)/);
 assert.match(recovery,/saveSessionRecovery\(userId, snapshot\)/);
 assert.match(recovery,/clearSessionRecovery\(userId\)/);
 assert.match(recovery,/Khôi phục phiên/);
});
test('Backend enforces RLS, leader bulk grants, expiry, and audit', () => {
 for(const tbl of ['lesson_check_workspace_state','lesson_check_activity_journal','lesson_check_interventions',
 'lesson_check_session_recovery','lesson_check_activity_versions','lesson_check_grant_audit'])
 assert.match(sql,new RegExp('alter table public\\.'+tbl+' enable row level security'),tbl);
 assert.match(sql,/user_id=auth.uid\(\)/);
 assert.match(sql,/teacher_id=auth.uid\(\)/);
 assert.match(sql,/if not public.lesson_check_is_leader\(\) then raise exception/);
 assert.match(sql,/p_expires_at<=now\(\)/);
 assert.match(sql,/g.expires_at > now\(\)/);
 assert.match(sql,/lesson_check_grant_audit/);
 assert.match(sql,/lesson_check_preserve_activity_version_trigger/);
 assert.doesNotMatch(sql,/using\s*\(\s*true\s*\)/i);
});
test('Protected activity source remains gated through the existing service', () => {
 assert.match(page,/getLessonCheckActivityContent\(item.id\)/);
 assert.match(service,/supabase.rpc\('lesson_check_bulk_teacher_access'/);
 assert.match(service,/readActivityVersion/);
 assert.match(workbench,/window.confirm\('Khôi phục nội dung phiên bản cũ/);
});

test('Extended catalog facets and authentic score analytics are available without AI', () => {
 const attrs=read('src/utils/lessonCheckAttributes.js');
 const migration=read('supabase/migrations/20261014030000_assessment_4_activity_facets.sql');
 assert.match(attrs,/listActivityAttributes/);
 assert.match(attrs,/saveActivityAttributes/);
 assert.match(migration,/lesson_check_activity_attributes/);
 assert.match(migration,/enable row level security/);
 assert.match(workbench,/attributeById/);
 assert.match(workbench,/studentProgress/);
 assert.match(workbench,/unitResults/);
 assert.match(workbench,/listAssessmentResults\(''\)/);
 assert.doesNotMatch(workbench,/openai|gpt-|gemini|anthropic/i);
});
