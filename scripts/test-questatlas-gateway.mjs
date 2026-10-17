import assert from 'node:assert/strict';
import handler from '../serverless-handlers/_questatlas-live.js';

const original={...process.env};
const fetchOriginal=globalThis.fetch;
process.env.VERCEL='1';
process.env.QUESTATLAS_SUPABASE_URL='https://example.supabase.co';
process.env.QUESTATLAS_SUPABASE_SERVICE_KEY='development-test-server-secret-key-not-real';
process.env.QUESTATLAS_IP_SALT='test-only-minimum-32-character-ip-salt-value';
const code='ABCDEF123456', token='a'.repeat(64), calls=[];
function mockResponse({method='POST',ip='203.0.113.7',origin='https://preview.test',body}) {
  const output={statusCode:200,headers:{},data:null};
  const req={method,headers:{host:'preview.test',origin,'x-vercel-forwarded-for':ip,'content-length':'100'},body,socket:{remoteAddress:'127.0.0.1'}};
  const res={
    setHeader(k,v){output.headers[k.toLowerCase()]=v;return this;},
    status(n){output.statusCode=n;return this;},
    json(v){output.data=v;return this;},
  };
  return {req,res,output};
}
let quota=true;
globalThis.fetch=async (url,init)=>{
  const endpoint=String(url).split('/').at(-1);
  calls.push({endpoint,headers:init.headers,body:JSON.parse(init.body)});
  const data=endpoint==='qatl_live_gateway_budget'?quota:
    endpoint==='qatl_live_view'?{
      position:1,status:'active',title:'Test',
      puzzle:{position:1,kind:'choice',stem:'Choose the correct word',options:['who','which','when','where'],points:10,correct_answer:'SECRET'},
      puzzle_snapshot:['VERY_SECRET'],correct_answer:'SECRET',token_hash:'PRIVATE'
    }:
    endpoint==='qatl_live_join'?{token,team_no:1,display_name:'Galaxy'}:
    {accepted:true,correct:true,awarded:10};
  return {ok:true,async text(){return JSON.stringify(data)}};
};
try {
  let mock=mockResponse({body:{action:'view',code,token}});
  await handler(mock.req,mock.res);
  assert.equal(mock.output.statusCode,200);
  assert.equal(mock.output.data.puzzle.correct_answer,undefined);
  assert.equal(mock.output.data.puzzle_snapshot,undefined);
  assert.equal(mock.output.data.token_hash,undefined);
  assert.deepEqual(calls.map(x=>x.endpoint),['qatl_live_gateway_budget','qatl_live_view']);
  assert.match(calls[0].body.p_ip_hash,/^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(calls).includes('203.0.113.7'),false,'never send raw IP to DB');
  assert.equal(calls[0].headers.authorization,'Bearer '+process.env.QUESTATLAS_SUPABASE_SERVICE_KEY);

  calls.length=0;quota=false;
  mock=mockResponse({body:{action:'join',code,teamNo:1,name:'Galaxy'}});
  await handler(mock.req,mock.res);
  assert.equal(mock.output.statusCode,429);
  assert.deepEqual(calls.map(x=>x.endpoint),['qatl_live_gateway_budget']);
  assert.equal(mock.output.headers['retry-after'],'60');

  quota=true;calls.length=0;
  mock=mockResponse({body:{action:'view',code:'INVALID',token}});
  await handler(mock.req,mock.res);
  assert.equal(mock.output.statusCode,400);
  assert.equal(calls.length,0,'invalid shape rejected without backend work');

  mock=mockResponse({body:{action:'join',code,teamNo:1,name:'A'},origin:'https://evil.test'});
  await handler(mock.req,mock.res);
  assert.equal(mock.output.statusCode,403);
  assert.equal(calls.length,0);

  mock=mockResponse({body:{action:'view',code,token},ip:'invalid-ip'});
  await handler(mock.req,mock.res);
  assert.equal(mock.output.statusCode,403);
  assert.equal(calls.length,0);

  delete process.env.QUESTATLAS_IP_SALT;
  mock=mockResponse({body:{action:'view',code,token}});
  await handler(mock.req,mock.res);
  assert.equal(mock.output.statusCode,503);
  assert.equal(calls.length,0);
  assert.equal(JSON.stringify(mock.output.data).includes(process.env.QUESTATLAS_SUPABASE_SERVICE_KEY),false);
  console.log('QuestAtlas gateway PASS: strict validation, no guest key leakage, IP budget, origin and fail-closed config.');
} finally {
  globalThis.fetch=fetchOriginal;
  for(const name of ['VERCEL','QUESTATLAS_SUPABASE_URL','QUESTATLAS_SUPABASE_SERVICE_KEY','QUESTATLAS_IP_SALT']){
    if(Object.hasOwn(original,name))process.env[name]=original[name];else delete process.env[name];
  }
}
