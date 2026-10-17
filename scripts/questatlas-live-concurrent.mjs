import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const CONNECTION=['-X','-A','-t','-q','-v','ON_ERROR_STOP=1',
  '-h',process.env.PGHOST || '127.0.0.1','-p',process.env.PGPORT || '5432',
  '-U',process.env.PGUSER || 'postgres','-d',process.env.PGDATABASE || 'questatlas_test'];
const HOST_ID='11111111-1111-4111-8111-111111111111';
async function sql(query){
  const {stdout}=await exec('psql',[...CONNECTION,'-c',query],{env:process.env,timeout:25000,maxBuffer:1024*100});
  return stdout.trim().split('\n').filter(Boolean).at(-1);
}
const room=JSON.parse(await sql(`SELECT jsonb_build_object('id',id,'code',join_code)::text
FROM public.qatl_live_sessions WHERE status='waiting' AND host_id='${HOST_ID}'
ORDER BY created_at LIMIT 1`));
assert.match(room.code,/^[A-F0-9]{12}$/);
assert.match(room.id,/^[0-9a-f-]{36}$/);
const join=async(n)=>{
  const reply=await sql(`SET ROLE anon; SELECT public.qatl_live_join('${room.code}',${n},'Load Test Team ${n}')::text`);
  const obj=JSON.parse(reply);
  assert.match(obj.token,/^[0-9a-f]{64}$/);
  assert.equal(obj.team_no,n);
  return obj;
};
// Independent psql processes race to join all 8 numbered slots; the backend serializes
// writes via room-level row locking. No token values are logged or sent to production.
const teams=await Promise.all(Array.from({length:8},(_,i)=>join(i+1)));
const joined=Number(await sql(`SELECT count(*) FROM public.qatl_live_teams WHERE session_id='${room.id}'`));
assert.equal(joined,8,'exactly eight teams must join');
const control=async(action)=>JSON.parse(await sql(`SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','${HOST_ID}',false);
SELECT public.qatl_live_control('${room.id}'::uuid,'${action}')::text`));
assert.equal((await control('start')).status,'active');
const view=async(team)=>JSON.parse(await sql(`SET ROLE anon;
SELECT public.qatl_live_view('${room.code}','${team.token}')::text`));
const views=await Promise.all(teams.map(view));
views.forEach((v,i)=>{
  assert.equal(v.team_no,i+1);
  assert.equal(v.puzzle.stem.length>8,true);
  assert.equal('correct_answer' in v.puzzle,false);
  assert.equal('puzzle_snapshot' in v,false);
  assert.equal(v.scoreboard.length,8);
});
const answer=async(team)=>JSON.parse(await sql(`SET ROLE anon;
SELECT public.qatl_live_submit('${room.code}','${team.token}','who')::text`));
const scored=await Promise.all(teams.map(answer));
scored.forEach(v=>{assert.equal(v.accepted,true);assert.equal(v.awarded,10)});
const duplicate=await Promise.all(teams.map(answer));
duplicate.forEach(v=>{assert.equal(v.accepted,false);assert.equal(v.reason,'already_submitted')});
const total=JSON.parse(await sql(`SELECT jsonb_build_object('teams',(SELECT count(*) FROM public.qatl_live_teams WHERE session_id='${room.id}'),
'answers',(SELECT count(*) FROM public.qatl_live_attempts WHERE session_id='${room.id}'),
'points',(SELECT sum(points) FROM public.qatl_live_attempts WHERE session_id='${room.id}'))::text`));
assert.deepEqual(total,{teams:8,answers:8,points:80});
assert.equal((await control('next')).status,'finished');
console.log('Concurrent live test PASS: eight real PostgreSQL connections joined, viewed and submitted together; no answer leak or duplicated score.');
