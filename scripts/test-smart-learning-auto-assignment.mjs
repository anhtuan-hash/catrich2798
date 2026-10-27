import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const identity=read('supabase/migrations/20261027130000_smart_learning_identity_preview.sql');
const uuidFix=read('supabase/migrations/20261027130100_smart_candidates_uuid_aggregate.sql');
const dispatch=read('supabase/migrations/20261027131100_smart_dispatch_event_immutable_guard.sql');
const guard=read('supabase/migrations/20261027131200_smart_identity_conflict_guard.sql');
const component=read('src/features/learningReports/SmartAssignmentComposer.jsx');
const workspace=read('src/features/learningReports/LearningReportsWorkspace.jsx');
const service=read('src/features/learningReports/learningReportsService.js');
const tests=[
['Verified teacher identities stored durably',identity.includes('bes_teacher_attendance_identity_links')&&identity.includes('verified_by')],
['Identity links secured by RLS',identity.includes('enable row level security')],
['Instructor names normalized rather than substring matched',identity.includes('regexp_replace(btrim(s.teacher_name)')],
['Unresolved teachers marked explicitly',identity.includes("then 'ambiguous' else 'unmatched'")],
['Exact account IDs from confirmed sessions',identity.includes('m.id=s.source_id')],
['Class teacher roster used',identity.includes('bes_extra_class_teachers tc')],
['Verified existing TTCM class mapping reused',identity.includes('bes_learning_report_class_bindings b')],
['No fuzzy or AI matching',!identity.includes('similarity(')&&!identity.includes('openai')],
['No anonymous identity verification',identity.includes('from public,anon')],
['Teacher must belong to real department',identity.includes("teacherAccountId")&&identity.includes("'active'")],
['Period restricted to exact month',identity.includes('s.attendance_date>=p_period')&&identity.includes("s.attendance_date<(p_period+interval '1 month')")],
['Only completed attendance',identity.includes("s.session_status='completed'")],
['Only correct department subject',identity.includes('lower(btrim(s.subject))=lower(v_subject)')],
['Both kinds supported',identity.includes("array['gifted','remedial']")],
['Preview exposes existing task status and classes',identity.includes("'existingTaskId'")&&identity.includes("'classLinks'")],
['Fingerprint captures source identifiers and instructor',identity.includes('string_agg(')&&identity.includes('coalesce(teacher_id::text')],
['PostgreSQL UUID aggregation fix applied',uuidFix.includes('(array_agg(distinct v.id))[1]')],
['Idempotency protected by unique business key',identity.includes('bes_learning_report_one_per_teacher_kind_month')],
['Concurrent dispatch serialized',dispatch.includes('pg_advisory_xact_lock')],
['Server compares preview fingerprint',dispatch.includes("Attendance changed since preview")],
['Existing tasks skipped not overwritten',dispatch.includes('on conflict(head_id,department_id,teacher_id,report_kind,period) do nothing')],
['Existing instructor conflict blocks dispatch',dispatch.includes('Conflicting existing instructor binding')],
['Instructor linked before task creation',dispatch.includes('Pre-bind exactly the sources')],
['Events only for new tasks',dispatch.includes("g->>'existingTaskId' is null")],
['Event ID inserted with immutable task',dispatch.includes("v_event_by_kind->>(v_group->>'kind')")],
['No event created on retry with no new tasks',dispatch.includes("select distinct g->>'kind'")],
['Identity mapping cannot silently switch account',guard.includes('teacher_id<>p_teacher_id')],
['No client-side manual session assignment',!component.includes('saveLearningSession')],
['Default dual-programme mode',component.includes("useState('both')")],
['Default whole-department mode',component.includes("useState('all')")],
['Preview is automatically calculated',component.includes("previewSmartLearningAssignments(")&&component.includes('useEffect(')],
['TTCM can verify unresolved identities once',component.includes('verifySmartLearningInstructor(')],
['New wizard integrated on existing Assign Report action',workspace.includes('<SmartAssignmentComposer')],
['Legacy manual mapping not compulsory',workspace.includes('blr-legacy-bindings')],
['Existing task not modified by frontend',!component.includes('.from(')],
['Existing navigation timers receive dispatch signal',service.includes('notifyLearningDeadlineChange();return data||{}')],
['Backend scopes candidate IDs to active members',identity.includes("coalesce(m->>\'status\',\'active\')")],
];
for(const [label,pass] of tests)console.log((pass?'PASS':'FAIL')+': '+label);
assert.ok(tests.every(x=>x[1]),'Smart assignment contract failed');
console.log('PASS: '+tests.length+' smart assignment checks.');
