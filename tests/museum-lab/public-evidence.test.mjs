import test from 'node:test';
import assert from 'node:assert/strict';
import galleryStaff from '../../serverless-handlers/gallery-staff.js';
import {ASEAN_TEMPLATE} from '../../src/features/immersive-gallery/v3/aseanLesson.js';

test('anonymous dashboard exposes only saved evidence from visible, finalized ASEAN groups',async t=>{
 const school='Museum QA', assignment=(id,frozen)=>({
  id,school_scope:school,lesson_template:ASEAN_TEMPLATE,content_frozen_at:frozen?'2026-11-17T00:00:00Z':null,
  created_by:'staff-id',reviewer_id:'reviewer-id',title:id,archived_at:null,
 });
 const group=(id,assignment_id)=>({id,assignment_id,label:id,state:'published'});
 const visibleGroup=group('Visible','frozen');
 const archivedGroup=group('Hidden room','frozen');
 const pendingGroup=group('Unpublished','frozen');
 const activeGroup=group('Still teaching','active');
 const groups=[visibleGroup,archivedGroup,pendingGroup,activeGroup];
 const writing={experience:'Visitors can follow the marked path.',advice:'They should bring water.'};
 const rows={
  gcp_assignments:[assignment('frozen',true),assignment('active',false)],
  gcp_groups:groups,
  gcp_reviews:groups.map(({id})=>({id:id+' review',group_id:id,state:id===pendingGroup.id?'submitted':'published',ttcm_note:'Internal note',archived_at:null,snapshot:{title:id}})),
  gcp_rubric_scores:[],
  museum_live_responses:[
   ...groups.map(({id})=>({group_id:id,stage_index:5,value:writing,created_at:'2026-11-17T00:00:00Z'})),
   {group_id:visibleGroup.id,stage_index:3,value:{unexpected:'Invalid record'}},
  ],
  museum_learning_events:[
   ...groups.map(({id})=>({group_id:id,stage_index:5,action:'asean_writing_grade',details:{experience:1,advice:0,teacherId:'staff-id'}})),
   {group_id:visibleGroup.id,stage_index:0,action:'asean_writing_grade',details:{experience:2,advice:0}},
  ],
  gallery_settings:[{id:true,enabled:true}],
  gcp_settings:[{id:true,enabled:true,upload_enabled:true}],
  gallery_exhibitions:[
   {id:'visible-room',school_scope:school,status:'published',visibility:'school'},
   {id:'hidden-room',school_scope:school,status:'archived',visibility:'school'},
   {id:'active-room',school_scope:school,status:'published',visibility:'school'},
  ],
  gcp_publication_links:[
   {exhibition_id:'visible-room',group_id:visibleGroup.id},
   {exhibition_id:'hidden-room',group_id:archivedGroup.id},
   {exhibition_id:'active-room',group_id:activeGroup.id},
  ],
 };
 t.mock.method(globalThis,'fetch',async request=>{
  const url=new URL(typeof request==='string'?request:request.url);
  const table=url.pathname.split('/').pop();
  assert.ok(Object.hasOwn(rows,table),'Unexpected database read: '+table);
  let result=rows[table];
  for(const [field,filter] of url.searchParams){
   if(filter.startsWith('eq.'))result=result.filter(row=>String(row[field])===filter.slice(3));
   if(filter==='is.null')result=result.filter(row=>row[field]==null);
   if(filter.startsWith('in.('))result=result.filter(row=>filter.slice(4,-1).split(',').includes(String(row[field])));
  }
  const fields=url.searchParams.get('select');
  if(fields!=='*')result=result.map(row=>Object.fromEntries(fields.split(',').map(key=>[key,row[key]])));
  return Response.json(result);
 });
 const previous={url:process.env.VITE_SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY};
 process.env.VITE_SUPABASE_URL='https://museum-qa.invalid';
 process.env.SUPABASE_SERVICE_ROLE_KEY='local-qa-fixture';
 t.after(()=>{
  for(const [key,value] of [['VITE_SUPABASE_URL',previous.url],['SUPABASE_SERVICE_ROLE_KEY',previous.key]]){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 });
 const call=async(operation,method='GET')=>{
  const reply={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await galleryStaff({query:{operation},headers:{},method},reply);
  return reply;
 };
 const {code,data}=await call('dashboard');
 assert.equal(code,200);
 assert.equal(data.profile.role,'viewer');
 assert.deepEqual(data.aseanResponses,[{group_id:visibleGroup.id,stage_index:5,value:writing}]);
 assert.deepEqual(data.aseanWritingScores,[{group_id:visibleGroup.id,stage_index:5,details:{experience:1,advice:0}}]);
 assert.ok(data.assignments.every(row=>!('created_by' in row)&&!('reviewer_id' in row)));
 assert.ok(data.reviews.every(row=>row.state==='published'&&!('ttcm_note' in row)));
 assert.ok(data.groups.every(row=>row.invite_handle===null));
 for(const operation of ['grade-rubric','publish','archive-assignment','feature-settings','rotate-invite']){
  assert.equal((await call(operation,'POST')).code,403,operation);
 }
});
