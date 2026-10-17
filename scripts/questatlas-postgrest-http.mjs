import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute=promisify(execFile);
const BASE='http://127.0.0.1:3000';
const SECRET='questatlas-ci-postgrest-test-secret-not-for-production';
const HOST='11111111-1111-4111-8111-111111111111';
const token=(role,sub)=>{
  const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const encoded=encode({alg:'HS256',typ:'JWT'})+'.'+encode({
    role,sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600
  });
  return encoded+'.'+createHmac('sha256',SECRET).update(encoded).digest('base64url');
};
const SERVICE=token('service_role','00000000-0000-4000-8000-000000000000');
const TEACHER=token('authenticated',HOST);
async function rpc(method,path,data,jwt) {
  const response=await fetch(BASE+path,{
    method,headers:{
      'Content-Type':'application/json',
      ...(jwt?{Authorization:'Bearer '+jwt}:{}),
    },...((method==='POST')?{body:JSON.stringify(data)}:{}),
  });
  let body;try{body=await response.json()}catch{body={}};
  return {status:response.status,body,ok:response.ok};
}
const sql=async query=>{
  const {stdout}=await execute('psql',[
    '-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-U','postgres','-d','questatlas_test','-c',query
  ],{env:{...process.env,PGPASSWORD:'postgres'},timeout:12000});
  return stdout.trim().split('\n').at(-1);
};
let lastError;
for(let n=0;n<30;n++){
  try {
    const ping=await fetch(BASE+'/',{signal:AbortSignal.timeout(1400)});
    if(ping.ok) {lastError=null;break;}
    lastError=Error('PostgREST status '+ping.status);
  }catch(e){lastError=e}
  await new Promise(resolve=>setTimeout(resolve,400));
}
if(lastError)throw new Error('PostgREST not ready: '+lastError.message);
const code=await sql("SELECT join_code FROM public.qatl_live_sessions WHERE status='waiting' ORDER BY created_at DESC LIMIT 1");
assert.match(code,/^[A-F0-9]{12}$/);
const serviceCall=(name,payload)=>rpc('POST','/rpc/'+name,payload,SERVICE);
const hostCall=(name,payload)=>rpc('POST','/rpc/'+name,payload,TEACHER);
const anonJoin=await rpc('POST','/rpc/qatl_live_join',{p_code:code,p_team_no:1,p_name:'Illicit Guest'});
assert.equal(anonJoin.ok,false,'anon must not bypass Vercel gateway');
const anonBudget=await rpc('POST','/rpc/qatl_live_gateway_budget',{p_ip_hash:'e'.repeat(64),p_action:'join'});
assert.equal(anonBudget.ok,false,'anon must not bypass IP budget gateway');
const denied=await hostCall('qatl_live_join',{p_code:code,p_team_no:1,p_name:'Illicit Teacher'});
assert.equal(denied.ok,false,'authenticated client must not bypass Vercel guest gateway');
const budget=await serviceCall('qatl_live_gateway_budget',{p_ip_hash:'e'.repeat(64),p_action:'join'});
assert.equal(budget.status,200,JSON.stringify(budget.body));
assert.equal(budget.body,true);
const first=await serviceCall('qatl_live_join',{p_code:code,p_team_no:1,p_name:'Team Orion'});
assert.equal(first.status,200,JSON.stringify(first.body));
assert.match(first.body.token,/^[0-9a-f]{64}$/);
const roomId=await sql("SELECT id FROM public.qatl_live_sessions WHERE join_code='"+code+"'");
const premature=await hostCall('qatl_live_control',{p_session_id:roomId,p_action:'start'});
assert.equal(premature.ok,false,'host cannot start with one team');
const second=await serviceCall('qatl_live_join',{p_code:code,p_team_no:2,p_name:'Team Vega'});
assert.equal(second.status,200,JSON.stringify(second.body));
const started=await hostCall('qatl_live_control',{p_session_id:roomId,p_action:'start'});
assert.equal(started.status,200,JSON.stringify(started.body));
assert.equal(started.body.status,'active');
const view=await serviceCall('qatl_live_view',{p_code:code,p_token:first.body.token});
assert.equal(view.status,200,JSON.stringify(view.body));
assert.ok(view.body.puzzle?.stem);
assert.equal('correct_answer' in view.body.puzzle,false);
assert.equal('puzzle_snapshot' in view.body,false);
const answer=await serviceCall('qatl_live_submit',{p_code:code,p_token:first.body.token,p_answer:'WHO'});
assert.equal(answer.status,200,JSON.stringify(answer.body));
assert.equal(answer.body.accepted,true);
assert.equal(answer.body.awarded,10);
const repeated=await serviceCall('qatl_live_submit',{p_code:code,p_token:first.body.token,p_answer:'WHO'});
assert.equal(repeated.body.accepted,false);
assert.equal(repeated.body.reason,'already_submitted');
const score=await serviceCall('qatl_live_view',{p_code:code,p_token:first.body.token});
assert.equal(score.body.scoreboard.find(t=>t.team_no===1).score,10);
const unauthorizedReset=await rpc('POST','/rpc/qatl_live_reset_team',
  {p_session_id:roomId,p_team_no:1});
assert.equal(unauthorizedReset.ok,false);
const reset=await hostCall('qatl_live_reset_team',{p_session_id:roomId,p_team_no:1});
assert.equal(reset.status,200,JSON.stringify(reset.body));
assert.equal(reset.body.reset,true);
const invalidated=await serviceCall('qatl_live_view',{p_code:code,p_token:first.body.token});
assert.equal(invalidated.ok,false,'old device token must be invalid after host reset');
const joinedAgain=await serviceCall('qatl_live_join',{p_code:code,p_team_no:1,p_name:'Team Orion Restored'});
assert.equal(joinedAgain.status,200,JSON.stringify(joinedAgain.body));
assert.notEqual(joinedAgain.body.token,first.body.token);
const refreshed=await serviceCall('qatl_live_view',{p_code:code,p_token:joinedAgain.body.token});
assert.equal(refreshed.body.scoreboard.find(t=>t.team_no===1).score,0);
console.log('QuestAtlas HTTP/RLS PASS: real PostgREST JWT roles, guest RPC blocked, two-team gate, no answer leak, scoring and token reset.');
