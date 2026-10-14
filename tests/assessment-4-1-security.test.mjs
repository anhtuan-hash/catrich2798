import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('src/utils/lessonCheckLinkAudit.js');
const workspace=read('src/components/lessonCheck/Assessment4Workbench.jsx');
const groups=read('src/utils/lessonCheckTeacherGroups.js');
const migration=read('supabase/migrations/20261014040000_assessment_teacher_groups.sql');
const quickCss=read('src/components/GlobalQuickAccessRail.css');

function auditRuntime(sourceCode='https://padlet.com/safe/123',status=200,networkFailure=false) {
 const calls=[];
 const context={
  URL, AbortController, setTimeout,clearTimeout,
  getLessonCheckActivityContent:async()=>({ok:true,content:{embedCode:sourceCode,embedKind:'url'}}),
  fetch:async(uri,options)=>{
   calls.push({uri,options});
   if(networkFailure)throw new TypeError('Failed to fetch');
   return {ok:status>=200&&status<300,status};
  }
 };
 const code=source.replace(/^import .*\n/,'').replace(/export /g,'')+'\n({extractActivityLink,checkActivityLink})';
 return {...vm.runInNewContext(code,context),calls};
}
test('Link validator rejects malformed/private URLs and handles iframe embeds',()=>{
 const a=auditRuntime();
 assert.equal(a.extractActivityLink('https://padlet.com/activity','url').status,'ready');
 assert.equal(a.extractActivityLink('<iframe src="https://padlet.com/embed/abc"></iframe>','html').status,'ready');
 assert.equal(a.extractActivityLink('not a url').status,'invalid');
 assert.equal(a.extractActivityLink('http://padlet.com/abc').status,'invalid');
 assert.equal(a.extractActivityLink('https://127.0.0.1/').status,'invalid');
 assert.equal(a.extractActivityLink('https://10.0.0.5/').status,'invalid');
 assert.equal(a.extractActivityLink('<h1>Hello</h1>','html').status,'manual');
});
test('Link audit only calls HEAD with credentials omitted and handles CORS without false broken alerts',async()=>{
 const healthy=auditRuntime();
 const good=await healthy.checkActivityLink({id:'safe'});
 assert.equal(good.status,'healthy');
 assert.equal(healthy.calls[0].options.method,'HEAD');
 assert.equal(healthy.calls[0].options.credentials,'omit');
 const gone=await auditRuntime('https://padlet.com/123',404).checkActivityLink({id:'safe'});
 assert.equal(gone.status,'broken');
 const unauthorized=await auditRuntime('https://padlet.com/123',403).checkActivityLink({id:'safe'});
 assert.equal(unauthorized.status,'restricted');
 const uncertain=await auditRuntime('https://padlet.com/123',200,true).checkActivityLink({id:'safe'});
 assert.equal(uncertain.status,'unknown');
});
test('Teacher groups are per-owner, leader-gated, and never directly rewrite grants',()=>{
 for(const text of [/enable row level security/,/owner_id = auth.uid\(\)/,/lesson_check_is_leader\(\)/,/lesson_check_guard_teacher_group_members/,/p\.approved=true/])
   assert.match(migration,text);
 for(const name of ['listLessonCheckTeacherGroups','saveLessonCheckTeacherGroup','deleteLessonCheckTeacherGroup'])
   assert.match(groups,new RegExp(name));
 assert.doesNotMatch(migration,/delete from public\.lesson_check_activity_grants/i);
 assert.match(workspace,/chọn giáo viên/i);
 assert.match(workspace,/Nhóm giáo viên dùng lại/);
 assert.match(workspace,/saveTeacherGroup/);
});
test('Presentation mode masks sensitive utilities regardless of navigation nesting',()=>{
 for(const cls of ['brian-nav__reports-tab','brian-nav__ttcm-tab','brian-nav__bell']){
  assert.ok(quickCss.includes("html[data-brian-classroom-mode='true'] .app-shell ."+cls));
 }
 assert.match(quickCss,/display:\s*none\s*!important/);
});
test('Browser link scan is bounded and never labels CORS rejection as broken',()=>{
 assert.match(workspace,/targets\.slice\(start,start\+3\)/);
 assert.match(workspace,/queue\.slice\(page\*20,\(page\+1\)\*20\)/);
 assert.match(workspace,/Chưa xác minh/);
});
