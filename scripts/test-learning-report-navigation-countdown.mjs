import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  selectReportNavigationDeadlines,formatNavigationDeadline,navigationDeadlineSummary,
} from '../src/features/learningReports/navigationDeadlines.js';
const files=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const now=Date.parse('2026-10-27T04:00:00.000Z');
const task=(override={})=>({
  id:'task1',teacher_id:'teacher1',head_id:'head1',report_kind:'gifted',
  period:'2026-10-01',status:'draft',due_at:new Date(now+86400000).toISOString(),
  ...override,
});
const picks=learningTasks=>selectReportNavigationDeadlines({
  monthlyDeadline:new Date(now+3600000).toISOString(),
  learningTasks,userId:'teacher1',now,
});
const a=picks([task()]);
assert.equal(a.primary.kind,'monthly','earliest active report must win');
assert.equal(a.otherCount,1);
assert.ok(navigationDeadlineSummary(a.items,'vi',now).includes('Bồi dưỡng HSG'));
assert.equal(picks([task({due_at:new Date(now+1800000).toISOString()})]).primary.kind,'gifted','gifted task can override monthly');
const early=task({id:'task2',report_kind:'remedial',due_at:new Date(now+500000).toISOString()});
const both=picks([task(),early]);
assert.equal(both.primary.kind,'remedial');
assert.equal(both.items.length,3,'monthly/HSG/remedial all remain accessible');
assert.ok(formatNavigationDeadline(both.primary,'vi',now).startsWith('PĐ '));
assert.ok(navigationDeadlineSummary(both.items,'vi',now).includes('Phụ đạo học sinh'));
assert.equal(picks([task({status:'submitted'})]).items.length,1,'teacher stops seeing submitted deadline');
assert.equal(picks([task({status:'approved'})]).items.length,1,'approved deadline hidden');
assert.equal(picks([task({effective_due_at:null})]).items.length,1,'cleared deadline hidden rather than 1970 expiry');
assert.equal(picks([task({teacher_id:'unrelated'})]).items.length,1,'another teacher must not leak');
const manager=selectReportNavigationDeadlines({
  monthlyDeadline:null,learningTasks:[
    task({teacher_id:'teacher1',status:'submitted',due_at:new Date(now+1200000).toISOString()}),
    task({id:'task3',teacher_id:'teacher2',status:'draft',due_at:new Date(now+1200000).toISOString()}),
    task({id:'task4',teacher_id:'teacher3',status:'approved'}),
    task({id:'task5',teacher_id:'teacher4',head_id:'someoneElse'}),
  ],userId:'head1',isLeader:true,now,
});
assert.equal(manager.items.length,1,'manager groups same kind and deadline');
assert.equal(manager.primary.count,2,'manager knows two pending reports');
assert.equal(manager.primary.role,'manager');
const managerNoAccess=selectReportNavigationDeadlines({
  learningTasks:[task({teacher_id:'teacher2'})],userId:'teacher1',isLeader:false,now,
});
assert.equal(managerNoAccess.items.length,0);
const future=selectReportNavigationDeadlines({
  learningTasks:[task({due_at:new Date(now-3600000).toISOString()}),task({
    id:'new',report_kind:'remedial',due_at:new Date(now+3600000).toISOString(),
  })],userId:'teacher1',now,
});
assert.equal(future.primary.kind,'remedial','future due dates outrank already expired tasks');
const expired=selectReportNavigationDeadlines({learningTasks:[
  task({due_at:new Date(now-3000).toISOString()}),
],userId:'teacher1',now});
assert.equal(expired.primary.kind,'gifted');
assert.equal(formatNavigationDeadline(expired.primary,'vi',now),'HSG · Hết');
const grouped=selectReportNavigationDeadlines({learningTasks:[
  task({id:'a'}),task({id:'b',teacher_id:'teacher1'}),
],userId:'teacher1',now});
assert.equal(grouped.primary.count,2,'group multiple same deadline assignments');

const nav=files('src/components/GlobalReportsNavigationTab.jsx');
const service=files('src/features/learningReports/learningReportsService.js');
const css=files('src/components/GlobalReportsNavigationTab.css');
const requirements=[
 ['existing nav reused',nav.includes("brian-nav__utility-reports")&&nav.includes('GlobalReportsNavigationTab')],
 ['monthly countdown unaffected',nav.includes('compactCountdown(countdown,language)')],
 ['learning and monthly combined',nav.includes('selectReportNavigationDeadlines(')],
 ['teacher/task roles checked',nav.includes('isDepartmentLeaderRole(currentUser?.role)')],
 ['click still opens reports',nav.includes("'#/tool/brian-team'")],
 ['poll and focus for cross-device assignments',nav.includes('window.setInterval(refresh,60000)')&&nav.includes("'focus'")],
 ['same-tab task refresh listener',nav.includes("bes-learning-report-deadline-change")],
 ['multiple deadlines indicated',nav.includes('picked.otherCount>0')],
 ['all deadline labels accessible',nav.includes('navigationDeadlineSummary(picked.items,language,now)')],
 ['no full report payload downloaded',service.includes("select('id,head_id,teacher_id,department_id,report_kind,period,due_at,status')")],
 ['Supabase row-level teacher filtering',service.includes(".eq('teacher_id',id)")],
 ['Supabase row-level manager filtering',service.includes(".or('teacher_id.eq.'+id+',head_id.eq.'+id)")],
 ['deadline overrides applied',service.includes('applyLearningDeadlineOverrides(tasks.data||[],deadlines.data||[])')],
 ['assignment and submit prompt refresh',service.includes('notifyLearningDeadlineChange();')],
 ['compact UI styling',css.includes('.brian-nav__reports-more')],
];
for(const [label,ok] of requirements)console.log((ok?'PASS':'FAIL')+': '+label);
assert.ok(requirements.every(x=>x[1]));
console.log('PASS: 17 dynamic scenarios and '+requirements.length+' integration checks.');
