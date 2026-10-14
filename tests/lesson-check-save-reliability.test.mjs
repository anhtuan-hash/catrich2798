import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=file('src/pages/LessonCheckStudio.jsx');
const service=file('src/utils/lessonCheckActivities.js');
const sql=file('supabase/migrations/20261014103000_lesson_check_atomic_activity_save.sql');
const css=file('src/pages/LessonCheckStudio.css');

test('Single-save validation shows an on-screen alert and focuses missing learning focus',()=>{
 assert.match(page,/reportSaveProblem\(isVi\s*\? 'Chưa chọn Chuyên đề \/ kỹ năng/);
 assert.match(page,/before saving\.', 'focus'\);/);
 assert.match(page,/ref=\{saveFocusRef\}/);
 assert.match(page,/aria-invalid=\{saveFeedback\?\.type==='error' && draft\.focusArea==='unclassified'\}/);
 assert.match(page,/lcs-save-feedback is-\$\{saveFeedback\.type\}/);
 assert.match(page,/role=\{saveFeedback\.type==='error'\?'alert':'status'\}/);
 assert.match(css,/\.lcs-page--library \.lcs-save-feedback\.is-error/);
 assert.match(page,/saveFocusRef\.current\?\.focus|target\.current\?\.focus/);
});

test('Synchronous lock prevents double-click saves and finally always releases the button',()=>{
 assert.match(page,/if \(!isLeader \|\| saveInFlightRef\.current \|\| saving\) return/);
 assert.match(page,/saveInFlightRef\.current = true/);
 assert.match(page,/finally \{\s*saveInFlightRef\.current = false;\s*setSaving\(false\);/);
 assert.match(page,/catch \(error\) \{[\s\S]*?reportSaveProblem/);
 assert.match(page,/setSingleDraft\(current => \(\{ \.\.\.current, id:savedId \}\)\)/);
 assert.match(page,/disabled=\{saving \|\| thumbnailBusy\}/);
});

test('Atomic Supabase RPC never leaves a half-saved focus tag and respects leader rights',()=>{
 assert.match(service,/supabase\.rpc\('lesson_check_save_activity_v2', payload\)\.abortSignal\(controller\.signal\)/);
 assert.match(service,/p_focus_area: String\(draft\.focusArea \|\| 'unclassified'\)/);
 assert.doesNotMatch(service,/\.update\(\{ focus_area: focusArea \}\)/);
 assert.match(sql,/if not public\.lesson_check_is_leader\(\)/);
 assert.match(sql,/v_saved_id := public\.lesson_check_save_activity\(/);
 assert.match(sql,/update public\.lesson_check_activities\s*set focus_area=p_focus_area/);
 assert.match(sql,/revoke all on function public\.lesson_check_save_activity_v2/);
 assert.match(sql,/grant execute on function public\.lesson_check_save_activity_v2/);
 assert.doesNotMatch(sql,/drop table|truncate|delete from public\.lesson_check_activities/i);
});

test('Timeout and network interruption are explicit and do not claim success',()=>{
 assert.match(service,/new AbortController\(\)/);
 assert.match(service,/setTimeout\(\(\) => controller\.abort\(\), 40000\)/);
 assert.match(service,/clearTimeout\(timeout\)/);
 assert.match(service,/uncertain: true/);
 assert.match(service,/kiểm tra thư viện trước khi thử lại để tránh tạo trùng/);
});
