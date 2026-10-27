import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../'+path, import.meta.url),'utf8');
const service=read('src/features/learningReports/learningReportsService.js');
const ui=read('src/features/learningReports/LearningReportsWorkspace.jsx');
const css=read('src/features/learningReports/LearningReportsWorkspace.css');
const portal=read('src/pages/BrianTeamPortal.jsx');
const bridge=read('src/components/GlobalWorkHubNotificationBridge.jsx');
const sql=read('supabase/migrations/20261027100000_learning_reports_gifted_remedial.sql');
const t=read('src/utils/legacySiteTranslations.js');

const cases=[
 ['two distinct reporting forms',service.includes('gifted: [')&&service.includes('remedial: [')],
 ['five sections each', (service.match(/id:\s*'(team|curriculum|attendance|outcomes|reflection|students)'/g)||[]).length===10],
 ['required completion validation',service.includes('reportProgress')&&service.includes('complete.every(Boolean)')],
 ['journal aggregation follows counts not invented rates',service.includes('expected_count')&&service.includes('present_count')&&service.includes('participationPercent')],
 ['teacher journal validates present <= expected',service.includes('present>expected')],
 ['TTCM dispatch with exact selected teachers',ui.includes('<SmartAssignmentComposer')&&service.includes('bes_dispatch_auto_learning_reports')],
 ['teacher receives notifications',bridge.includes('listUnreadLearningReportNotifications')&&bridge.includes('learning-report:')],
 ['event recipient scoping',sql.includes('insert into public.bes_event_recipients(event_id,user_id)')&&sql.includes('unnest(v_teachers)')],
 ['five-section editor with save and submit',ui.includes('LEARNING_REPORT_SECTIONS[selected.report_kind].map')&&ui.includes('saveLearningReport(selected,payload,submit)')],
 ['TTCM review and CSV export',ui.includes('reviewLearningReport(')&&ui.includes('downloadCsv(')],
 ['teacher/leader navigation',portal.includes("view === 'learning'")&&portal.includes("view === 'learning-mine'")],
 ['RLS on both tables',sql.match(/enable row level security;/g)?.length===2],
 ['guard prevents identity changes',sql.includes('Immutable report identity')&&sql.includes('Immutable session identity')],
 ['RPC verifies head owns department',sql.includes('where w.owner_id=v_actor')&&sql.includes('Department is not owned by TTCM')],
 ['RPC validates all selected members',sql.includes('One or more teachers are not active department members')],
 ['notifications are optional per user request',sql.includes('notify_enabled boolean not null default true')],
 ['no unsupported AI dependency',!ui.includes('openai')&&!service.includes('openai')],
 ['responsive media rules',css.includes('@media(max-width:560px)')],
 ['bilingual translations present',t.includes('"Bồi dưỡng & Phụ đạo":')&&t.includes('"Nhật ký từng buổi dạy":')],
];
for(const [name,pass] of cases) console.log((pass?'PASS':'FAIL')+': '+name);
assert.ok(cases.every(([,pass])=>pass),'Brian learning-report contract must pass');
console.log(cases.length+' learning-report contract checks passed.');
