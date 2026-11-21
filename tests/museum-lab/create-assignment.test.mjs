import test from 'node:test';
import assert from 'node:assert/strict';
import galleryStaff from '../../serverless-handlers/gallery-staff.js';
import {digest} from '../../serverless-handlers/_galleryCreator.js';
import {decryptGroupPasscode} from '../../serverless-handlers/_galleryPasscodes.js';
import {ASEAN_TEMPLATE} from '../../src/features/immersive-gallery/v3/aseanLesson.js';

test('issuing group codes reports missing server configuration before creating any records', async t => {
 const env={
  VITE_SUPABASE_URL:'https://museum-qa.invalid',
  SUPABASE_SERVICE_ROLE_KEY:'local-qa-fixture',
  GALLERY_SUPABASE_URL:undefined,
  GALLERY_SUPABASE_SERVICE_ROLE_KEY:undefined,
  GCP_HASH_PEPPER:undefined,
 };
 const previous=Object.fromEntries(Object.keys(env).map(name=>[name,process.env[name]]));
 function setEnv(values){
  for(const [name,value] of Object.entries(values)){
   if(value===undefined)delete process.env[name];
   else process.env[name]=value;
  }
 }
 setEnv(env);
 t.after(()=>setEnv(previous));
 const teacher={id:'00000000-0000-4000-8000-000000000123',role:'admin',
  school:'Museum QA',approved:true,full_name:'Test Administrator'};
 const calls=[];
 let issueBody;
 t.mock.method(globalThis,'fetch',async (input,init)=>{
  const {pathname}=new URL(typeof input==='string'?input:input.url);
  calls.push(pathname);
  if(pathname==='/auth/v1/user')return Response.json({id:teacher.id});
  if(pathname==='/rest/v1/profiles')return Response.json([teacher]);
  if(pathname==='/rest/v1/gcp_settings')return Response.json([{enabled:true,upload_enabled:true}]);
  assert.equal(pathname,'/rest/v1/rpc/museum_issue_templated_assignment');
  issueBody=JSON.parse(init?.body??await input.text());
  return Response.json({
   assignment:{id:'test-lesson'},
   groups:issueBody.p_tokens.map(({handle},index)=>({groupId:String(index),handle})),
  });
 });
 const request={
  query:{operation:'create-assignment'},method:'POST',
  headers:{authorization:'Bearer '+'x'.repeat(50),host:'museum.invalid',origin:'https://museum.invalid'},
  body:{title:'ASEAN in Three Frames',classScope:'11.4',groupCount:10,lessonTemplate:ASEAN_TEMPLATE,
   deadlineAt:new Date(Date.now()+7*86400000).toISOString()},
 };
 async function issue(){
  const reply={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await galleryStaff(request,reply);
  return reply;
 }
 const unavailable=await issue();
 assert.equal(unavailable.code,503);
 assert.equal(unavailable.data.code,'creator_pass_not_configured');
 assert.equal(issueBody,undefined);

 setEnv({GCP_HASH_PEPPER:'Museum QA fixture for group code validation only 0123456789'});
 const result=await issue();
 assert.equal(result.code,201);
 assert.equal(issueBody.p_teacher,teacher.id);
 assert.equal(issueBody.p_class,'11.4');
 assert.equal(issueBody.p_template,ASEAN_TEMPLATE);
 assert.equal(calls.filter(path=>path==='/rest/v1/rpc/museum_issue_templated_assignment').length,1);
 assert.equal(new Set(result.data.invitations.map(invite=>invite.handle)).size,10);
 for(const {handle,groupSecret} of result.data.invitations){
  const {secret_hash,secret_envelope}=issueBody.p_tokens.find(token=>token.handle===handle);
  assert.equal(secret_hash,digest('invite:'+groupSecret));
  assert.equal(decryptGroupPasscode(secret_envelope,handle),groupSecret);
 }
});
