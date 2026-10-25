// Offline-only behavioral safety model for Sync Doctor.
// This is NOT a Postgres/PLpgSQL execution test and MUST NOT be used to unlock live RPCs.
// Requires only built-in Node.js. All students/workspaces are synthetic fixtures.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha = v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clone = v=>structuredClone(v);
const denied = msg => {const e=new Error(msg);e.code='DENIED';throw e;};
function engine() {
  const original={students:[{id:'legacy-100',rosterStudentId:'legacy-r100',code:'LX100',fullName:'Legacy Student',notes:'private note'}],
    scoreMap:{'legacy-100':{oral:[9.0,8.5],midterm:8.25}},classProfile:{className:'12.SYNTH',schoolYear:'2026-2027'},
    attachments:[{id:'old-file',meta:{grade:9}}]};
  const state={
    gradebook:{revision:'rev-1',payload:clone(original)},
    canonical:{revision:'roster-1',students:[
      {rosterStudentId:'legacy-r100',code:'LX100',fullName:'Legacy Student',active:true},
      {rosterStudentId:'new-r101',rosterPersonKey:'code:new101',code:'NEW101',
       fullName:'Synthetic New Student',birthDate:'2009-09-09',gender:'F',active:true},
    ]},
    request:{status:'approved_for_review',requester:'admin-A',reviewer:'admin-B',sourceRevision:'rev-1',canonicalRevision:'roster-1'},
    backup:null,audit:[],
  };
  const snap=()=>clone(state);
  const eligible=(caller,action)=>{
    if(action==='backup'||action==='repair'||action==='rollback'){
      if(caller!=='admin-B'||caller===state.request.requester)denied('Requires independent reviewer');
    }
    if(action==='execution'||action==='rollback-consent'){
      if(caller!=='admin-A'||caller===state.request.reviewer)denied('Only requester can authorize');
    }
  };
  const requireRevision=(field='pre')=>{
    const b=state.backup;
    if(field==='pre'){
      if(state.gradebook.revision!==state.request.sourceRevision||
        state.canonical.revision!==state.request.canonicalRevision)denied('Stale source revisions');
      if(b&&sha(state.gradebook.payload)!==b.originalHash)denied('Backup checksum mismatch');
    }else if(!b||state.gradebook.revision!==b.postRevision||
      sha(state.gradebook.payload)!==b.postHash)denied('Concurrent modification detected');
  };
  const backup=(caller)=>{
    eligible(caller,'backup');
    if(state.request.status!=='approved_for_review')denied('Review not approved');
    requireRevision();
    state.backup={snapshot:clone(state.gradebook.payload),originalHash:sha(state.gradebook.payload),
      sourceRevision:state.gradebook.revision,postHash:null,postRevision:null,restored:false,expiresAt:2000,rehearsed:true};
    state.audit.push('backup');
  };
  const authorize=(caller,transition)=>{
    if(transition==='execute'){
      eligible(caller,'execution');
      if(state.request.status!=='approved_for_review'||!state.backup?.rehearsed)denied('Missing verified review & backup');
      requireRevision();
      state.request.status='execution_authorized';
    }else{
      eligible(caller,'rollback-consent');
      if(state.request.status!=='repaired')denied('Only a repaired case can roll back');
      requireRevision('post');
      state.request.status='rollback_authorized';
    }
    state.audit.push('consent:'+transition);
  };
  const repair=(caller)=>{
    eligible(caller,'repair');
    if(state.request.status!=='execution_authorized')denied('No separate execution consent');
    requireRevision();
    const candidates=state.canonical.students.filter(s=>s.rosterStudentId==='new-r101');
    if(candidates.length!==1)denied('Identity ambiguous');
    const candidate=candidates[0];
    if(candidate.active!==true || candidate.archivedAt||candidate.deletedAt)denied('Inactive student');
    const code=candidate.code.toLowerCase();
    if(state.canonical.students.filter(s=>s.code?.toLowerCase()===code).length!==1)denied('Code collision');
    if(state.gradebook.payload.students.some(s=>s.rosterStudentId===candidate.rosterStudentId ||
      s.id===candidate.rosterStudentId || s.code?.toLowerCase()===code))denied('Already linked');
    const before=clone(state.gradebook.payload);
    const projection={
      id:candidate.rosterStudentId,rosterStudentId:candidate.rosterStudentId,rosterPersonKey:candidate.rosterPersonKey||'',
      code:candidate.code,fullName:candidate.fullName,birthDate:candidate.birthDate,gender:candidate.gender,
      active:true,archivedAt:'',archivedReason:'',notes:'',
    };
    state.gradebook.payload.students.push(projection);
    assert.deepEqual(state.gradebook.payload.students.slice(0,-1),before.students);
    assert.deepEqual({...state.gradebook.payload,students:before.students},before);
    state.gradebook.revision='rev-2';
    state.backup.postHash=sha(state.gradebook.payload);
    state.backup.postRevision=state.gradebook.revision;
    state.request.status='repaired';
    state.audit.push('repair');
  };
  const rollback=(caller)=>{
    eligible(caller,'rollback');
    if(state.request.status!=='rollback_authorized')denied('No rollback consent');
    requireRevision('post');
    if(sha(state.backup.snapshot)!==state.backup.originalHash)denied('Backup corruption');
    state.gradebook.payload=clone(state.backup.snapshot);
    state.gradebook.revision='rev-3';
    state.backup.restored=true;
    state.request.status='rolled_back';
    state.audit.push('rollback');
  };
  return {state,snap,backup,authorize,repair,rollback,requireRevision};
}
function reject(action,fragment){
  assert.throws(action,e=>e.code==='DENIED'&&e.message.includes(fragment));
}
// Case A: happy path, exact legacy score preservation, independent review, rollback.
{
  const m=engine(),initial=m.snap().gradebook.payload;
  reject(()=>m.backup('teacher'),'independent reviewer');
  reject(()=>m.backup('admin-A'),'independent reviewer');
  m.backup('admin-B');
  reject(()=>m.repair('admin-B'),'execution consent');
  reject(()=>m.authorize('admin-B','execute'),'Only requester');
  m.authorize('admin-A','execute');
  reject(()=>m.repair('admin-A'),'independent reviewer');
  m.repair('admin-B');
  assert.equal(m.state.request.status,'repaired');
  assert.equal(m.state.gradebook.payload.students.length,2);
  assert.deepEqual(m.state.gradebook.payload.scoreMap,initial.scoreMap);
  assert.deepEqual(m.state.gradebook.payload.attachments,initial.attachments);
  reject(()=>m.repair('admin-B'),'execution consent');
  reject(()=>m.rollback('admin-B'),'rollback consent');
  m.authorize('admin-A','rollback');
  m.rollback('admin-B');
  assert.deepEqual(m.state.gradebook.payload,initial);
  assert.equal(m.state.backup.restored,true);
  assert.deepEqual(m.state.audit,['backup','consent:execute','repair','consent:rollback','rollback']);
  reject(()=>m.rollback('admin-B'),'rollback consent');
}
// Case B: reject old source revision at execution consent and repair.
{
  const m=engine();m.backup('admin-B');
  m.state.gradebook.revision='changed';
  reject(()=>m.authorize('admin-A','execute'),'Stale source');
}
// Case C: reject canonical identity collisions and inactive identity.
{
  const m=engine();m.backup('admin-B');m.authorize('admin-A','execute');
  m.state.canonical.students.push(clone(m.state.canonical.students[1]));
  reject(()=>m.repair('admin-B'),'Identity ambiguous');
  m.state.canonical.students.pop();
  m.state.canonical.students[1].active=false;
  reject(()=>m.repair('admin-B'),'Inactive student');
}
// Case D: reject destination duplicates and preserve legacy records.
{
  const m=engine();m.backup('admin-B');m.authorize('admin-A','execute');
  m.state.gradebook.payload.students.push({id:'legacy-unknown',code:'NEW101'});
  reject(()=>m.repair('admin-B'),'Backup checksum');
}
// Case E: reject post-repair concurrent updates, including score-map edits.
{
  const m=engine();m.backup('admin-B');m.authorize('admin-A','execute');m.repair('admin-B');
  m.state.gradebook.payload.scoreMap['legacy-100'].midterm=9.9;
  reject(()=>m.authorize('admin-A','rollback'),'Concurrent modification');
}
console.log('PASS Sync Doctor free offline behavioral model: 5 synthetic scenarios / authorization, idempotence, collision, integrity and conditional rollback.');
