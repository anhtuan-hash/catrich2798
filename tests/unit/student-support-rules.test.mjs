import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRule, evaluateRules, makeAlertDedupeKey } from '../../src/studentSupport/studentSupportRules.js';

test('3 absences in 14 days triggers', () => {
  const rule={id:'r1',version:1,code:'absence_3_in_14d',ruleType:'attendance_count',config:{status:'absent',threshold:3,days:14}};
  const facts={attendance:[
    {date:'2026-09-03',status:'absent'},
    {date:'2026-09-08',status:'absent'},
    {date:'2026-09-14',status:'absent'},
  ]};
  assert.equal(evaluateRule(rule,facts,new Date('2026-09-15T00:00:00Z')).triggered,true);
});

test('absence rule normalizes real Homeroom attendance statuses without changing source data', () => {
  const rule={id:'r1',version:1,code:'absence_3_in_14d',ruleType:'attendance_count',config:{status:'absent',threshold:3,days:14}};
  const attendance=[
    {date:'2026-09-03',status:'unexcused'},
    {date:'2026-09-08',status:'excused'},
    {date:'2026-09-14',status:'absent_one_period'},
    {date:'2026-09-14',status:'late'},
  ];
  const result=evaluateRule(rule,{attendance},new Date('2026-09-15T00:00:00Z'));
  assert.equal(result.triggered,true);
  assert.equal(result.metric,3);
  assert.equal(attendance[0].status,'unexcused');
});

test('insufficient grade samples cannot trigger', () => {
  const rule={id:'r2',version:1,code:'grade_drop',ruleType:'grade_window_drop',config:{sampleSize:3,delta:1}};
  const result=evaluateRule(rule,{grades:[{score:5}]},new Date('2026-09-15T00:00:00Z'));
  assert.equal(result.triggered,false);
  assert.equal(result.evidence.reason,'insufficient_data');
});

test('dedupe key is stable', () => {
  const a=makeAlertDedupeKey({id:'r1',version:1},'HS-1','2026-09-01','2026-09-15');
  const b=makeAlertDedupeKey({id:'r1',version:1},'HS-1','2026-09-01','2026-09-15');
  assert.equal(a,b);
});

test('grade window drop compares previous and latest equal windows', () => {
  const rule={id:'r3',version:1,code:'grade_drop',ruleType:'grade_window_drop',config:{sampleSize:3,delta:1}};
  const facts={grades:[
    {date:'2026-08-01',score:8},{date:'2026-08-05',score:8},{date:'2026-08-10',score:8},
    {date:'2026-09-01',score:6},{date:'2026-09-05',score:6.5},{date:'2026-09-10',score:6.5},
  ]};
  const result=evaluateRule(rule,facts,new Date('2026-09-15T00:00:00Z'));
  assert.equal(result.triggered,true);
  assert.equal(result.evidence.previousAverage,8);
  assert.equal(result.evidence.latestAverage,6.33);
});

test('consecutive scores below threshold only inspects latest configured count', () => {
  const rule={id:'r4',version:1,code:'low_scores',ruleType:'consecutive_scores_below',config:{threshold:5,count:3}};
  const facts={grades:[{date:'2026-09-01',score:9},{date:'2026-09-02',score:4},{date:'2026-09-03',score:4.5},{date:'2026-09-04',score:3}]};
  const result=evaluateRule(rule,facts,new Date('2026-09-15T00:00:00Z'));
  assert.equal(result.triggered,true);
  assert.equal(result.metric,3);
});

test('observation count filters by type and rolling window', () => {
  const rule={id:'r5',version:1,code:'incomplete_3_in_14d',ruleType:'observation_count',config:{observationType:'TASK_INCOMPLETE',threshold:3,days:14}};
  const facts={observations:[
    {date:'2026-09-02',type:'TASK_INCOMPLETE'},
    {date:'2026-09-05',type:'TASK_INCOMPLETE'},
    {date:'2026-09-14',type:'TASK_INCOMPLETE'},
    {date:'2026-09-14',type:'GOOD_PARTICIPATION'},
  ]};
  assert.equal(evaluateRule(rule,facts,new Date('2026-09-15T00:00:00Z')).triggered,true);
});

test('combined_all triggers only when every embedded rule triggers', () => {
  const rule={id:'r6',version:1,code:'combined',ruleType:'combined_all',config:{rules:[
    {ruleType:'attendance_count',config:{status:'absent',threshold:2,days:14}},
    {ruleType:'grade_window_drop',config:{sampleSize:2,delta:1}},
  ]}};
  const facts={
    attendance:[{date:'2026-09-10',status:'absent'},{date:'2026-09-14',status:'absent'}],
    grades:[{date:'2026-08-01',score:8},{date:'2026-08-05',score:8},{date:'2026-09-01',score:6},{date:'2026-09-10',score:6}],
  };
  const result=evaluateRule(rule,facts,new Date('2026-09-15T00:00:00Z'));
  assert.equal(result.triggered,true);
  assert.equal(result.evidence.components.length,2);
});

test('evaluateRules evaluates enabled rules for each student and skips disabled rules', () => {
  const rules=[
    {id:'r1',version:1,code:'absence',enabled:true,ruleType:'attendance_count',config:{status:'absent',threshold:1,days:14}},
    {id:'r2',version:1,code:'disabled',enabled:false,ruleType:'attendance_count',config:{status:'absent',threshold:1,days:14}},
  ];
  const factsByStudent={
    'HS-1':{attendance:[{date:'2026-09-14',status:'absent'}]},
    'HS-2':{attendance:[]},
  };
  const results=evaluateRules(rules,factsByStudent,new Date('2026-09-15T00:00:00Z'));
  assert.equal(results.length,1);
  assert.equal(results[0].studentRef,'HS-1');
  assert.equal(results[0].ruleCode,'absence');
});