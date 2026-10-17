// Disposable PostgREST integration: eight genuine HTTP clients, shared school NAT,
// host JWT authorisation, token isolation and exactly-once scoring. Never remote.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec=promisify(execFile);
const BASE='http://127.0.0.1:3000';
const SECRET='questatlas-ci-postgrest-test-secret-not-for-production';
const HOST='11111111-1111-4111-8111-111111111111';
const STRANGER='33333333-3333-4333-8333-333333333333';
const jwt=(role,sub)=>{
  const enc=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now=Math.floor(Date.now()/1000);
  const data=enc({alg:'HS256',typ:'JWT'})+'.'+enc({role,sub,iat:now,exp:now+600});
  return data+'.'+createHmac('sha256',SECRET).update(data).digest('base64url');
};
const service=jwt('service_role','00000000-0000-4000-8000-000000000000');
const teacher=jwt('authenticated',HOST);
const stranger=jwt('authenticated',STRANGER);
async function rpc(name,payload,access=service){
  const result=await fetch(BASE+'/rpc/'+name,{
    method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+access},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(10000)
  });
  let body;try{body=await result.json()}catch{body=null}
  return {status:result.status,ok:result.ok,body};
}
async function query(sql){
  const {stdout}=await exec('psql',[
    '-X','-A','-t','-q','-v','ON_ERROR_STOP=1',
    '-h','127.0.0.1','-U','postgres','-d','questatlas_test','-c',sql
  ],{env:{...process.env,PGPASSWORD:'postgres'},timeout:12000});
  return stdout.trim().split('\n').filter(Boolean).at(-1);
}
// Separate from the room consumed by questatlas-postgrest-http.mjs. The
// smoke fixture creates spare waiting rooms using an approved test host.
const room=JSON.parse(await query(
  "SELECT jsonb_build_object('id',id,'code',join_code)::text "+
  "FROM public.qatl_live_sessions WHERE status='waiting' "+
  "ORDER BY created_at DESC, id DESC LIMIT 1"
));
assert.match(room.code,/^[A-F0-9]{12}$/);
const payload=(team,name)=>({p_code:room.code,p_team_no:team,p_name:name});
const joined=await Promise.all(Array.from({length:8},(_,i)=>
  rpc('qatl_live_join',payload(i+1,'Team '+(i+1)))
));
joined.forEach((answer,i)=>{
  assert.equal(answer.status,200,'concurrent join '+(i+1)+': '+JSON.stringify(answer.body));
  assert.equal(answer.body.team_no,i+1);
  assert.match(answer.body.token,/^[a-f0-9]{64}$/);
});
const denied=await Promise.all([
  rpc('qatl_live_control',{p_session_id:room.id,p_action:'start'},stranger),
  rpc('qatl_live_join',payload(1,'Illicit participant'),jwt('anon','00000000-0000-4000-8000-000000000000'))
]);
assert.equal(denied[0].ok,false,'nonhost must not start room');
assert.equal(denied[1].ok,false,'anonymous PostgREST must not bypass Vercel');
const started=await rpc('qatl_live_control',{p_session_id:room.id,p_action:'start'},teacher);
assert.equal(started.status,200,JSON.stringify(started.body));
assert.equal(started.body.status,'active');

const views=await Promise.all(joined.map(team=>
  rpc('qatl_live_view',{p_code:room.code,p_token:team.body.token})
));
views.forEach((view,i)=>{
  assert.equal(view.status,200,'HTTP view '+(i+1));
  assert.equal(view.body.team_no,i+1);
  assert.equal(view.body.scoreboard.length,8);
  assert.equal(view.body.puzzle?.stem?.length>0,true);
  for(const name of ['correct_answer','puzzle_snapshot','token_hash'])
    assert.equal(JSON.stringify(view.body).includes('"'+name+'"'),false,'guest leak: '+name);
});
// One shared IP with eight devices polling every 3 seconds makes 160
// gateway view checks per minute. The 480/min IP allowance must accommodate it.
const schoolIpHash='f'.repeat(64);
for(let tick=0;tick<20;tick++){
  const budgets=await Promise.all(Array.from({length:8},()=>
    rpc('qatl_live_gateway_budget',{p_ip_hash:schoolIpHash,p_action:'view'})
  ));
  budgets.forEach(b=>{assert.equal(b.status,200);assert.equal(b.body,true)});
}
const attempts=await Promise.all(joined.map(team=>
  rpc('qatl_live_submit',{p_code:room.code,p_token:team.body.token,p_answer:'WHO'})
));
attempts.forEach(a=>{
  assert.equal(a.status,200,JSON.stringify(a.body));
  assert.equal(a.body.accepted,true);
  assert.equal(a.body.awarded,10);
});
const retry=await Promise.all(joined.map(team=>
  rpc('qatl_live_submit',{p_code:room.code,p_token:team.body.token,p_answer:'WHO'})
));
retry.forEach(x=>{
  assert.equal(x.status,200);
  assert.equal(x.body.accepted,false);
  assert.equal(x.body.reason,'already_submitted');
});
const last=await rpc('qatl_live_view',{p_code:room.code,p_token:joined[0].body.token});
assert.equal(last.status,200);
assert.equal(last.body.scoreboard.length,8);
assert.equal(last.body.scoreboard.reduce((n,t)=>n+t.score,0),80);

const otherCode=await query("SELECT join_code FROM public.qatl_live_sessions "+
  "WHERE id<>'"+room.id+"' AND status='waiting' LIMIT 1");
if(otherCode){
  const stolen=await rpc('qatl_live_view',{p_code:otherCode,p_token:joined[0].body.token});
  assert.equal(stolen.ok,false,'bearer token must not cross room boundaries');
}
const finished=await rpc('qatl_live_control',{p_session_id:room.id,p_action:'next'},teacher);
assert.equal(finished.status,200);
assert.equal(finished.body.status,'finished');
const tooLate=await rpc('qatl_live_submit',{
  p_code:room.code,p_token:joined[0].body.token,p_answer:'WHO'
});
assert.equal(tooLate.ok,false,'finished session must not accept submissions');
console.log('QuestAtlas network simulation PASS: 8 HTTP/JWT teams, 160 shared-NAT checks, isolated access, 80 points, no replay.');
