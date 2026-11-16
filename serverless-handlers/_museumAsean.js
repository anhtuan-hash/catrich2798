import {checkpointGallery} from './_museumEvidence.js';
import {fail,guardBody,guardOrigin,query,requireMethod,send} from './_galleryCreator.js';
import {ASEAN_FRAMES,aseanExhibitMissing,aseanPeerGroup,aseanWritingRepeats,validAseanResponse} from '../src/features/immersive-gallery/v3/aseanLesson.js';

export async function aseanGroupRecords(admin, sessionId, groupId) {
 return query(admin.from('museum_live_responses').select('stage_index,value')
  .eq('session_id',sessionId).eq('group_id',groupId).order('stage_index'));
}

export function aseanStaffRetests(admin,sessionId){
 return query(admin.from('museum_learning_events').select('group_id,details,created_at')
  .eq('session_id',sessionId).eq('stage_index',4).eq('action','asean_staff_exhibit_check'));
}

export function aseanArchivedTransferResponses(admin,sessionId){
 return admin.from('museum_learning_events').select('group_id,details,created_at')
  .eq('session_id',sessionId).eq('stage_index',5).eq('actor_role','teacher').eq('action','asean_transfer_response_archived');
}

export function aseanStaffRetest(reviews,groupId,checkpoint){
 const review=reviews.find(row=>row.group_id===groupId&&row.details?.checkpointId===checkpoint?.id&&row.details?.version===checkpoint?.version);
 const value=review?.details?.response;
 return value&&value.question===checkpoint.doc?.retestQuestion&&validAseanResponse(4,value)?value:null;
}

async function aseanVisitTarget(admin,assignmentId,groupId,stage,reverse=false){
 const groups=await query(admin.from('gcp_groups').select('id,label').eq('assignment_id',assignmentId));
 const peer=aseanPeerGroup(groups,groupId,stage,{reverse});
 if(!peer)throw fail(409,'The assigned visitor group could not be found.');
 return peer;
}

export async function handleAseanActivity({op,req,res,admin,ctx,session}){
 const stage=session?.stage_index,id=ctx.group.id;
 if(op==='asean-records'){
  requireMethod(req,'GET');
  // The group one place before the author supplied V1 feedback.
  const source=session?await query(admin.from('museum_peer_pairs').select('from_group')
   .eq('session_id',session.id).eq('to_group',id).maybeSingle()):null;
  const groups=session&&session.stage_index>=4?await query(admin.from('gcp_groups').select('id,label').eq('assignment_id',ctx.assignment.id)):[];
  const authorRetest=aseanPeerGroup(groups,id,4,{reverse:true});
  const assigned=aseanPeerGroup(groups,id,4);
  const [rows,feedback,ownCheckpoints,retest,assignedCheckpoint,staffChecks]=await Promise.all([
   session?aseanGroupRecords(admin,session.id,id):[],
   source?query(admin.from('museum_live_responses').select('value').eq('session_id',session.id)
    .eq('group_id',source.from_group).eq('stage_index',3).maybeSingle()):null,
   session?query(admin.from('museum_checkpoints').select('id,kind,version,doc').eq('session_id',session.id).eq('group_id',id)):[],
   authorRetest?query(admin.from('museum_live_responses').select('value').eq('session_id',session.id)
    .eq('group_id',authorRetest.id).eq('stage_index',4).maybeSingle()):null,
   assigned?query(admin.from('museum_checkpoints').select('id,version,doc').eq('session_id',session.id)
    .eq('group_id',assigned.id).eq('kind','after').maybeSingle()):null,
   assigned?aseanStaffRetests(admin,session.id):[],
  ]);
  const checkpoints=ownCheckpoints.map(({kind,version,doc})=>({kind,version,complete:aseanExhibitMissing(doc).length===0,
   ...(kind==='before'&&doc?.checkpointOrigin==='reconstructed_reference'?{reconstructed:true}:{}),
   ...(kind==='after'?{reason:doc?.revisionReason||''}:{})}));
  const retestTask=assigned?{
   target:assigned.label,
   ready:Boolean(assignedCheckpoint&&aseanExhibitMissing(assignedCheckpoint.doc).length===0),
   question:assignedCheckpoint?.doc?.retestQuestion??null,
   staffChecked:Boolean(aseanStaffRetest(staffChecks,id,assignedCheckpoint)),
  }:null;
  const before=ownCheckpoints.find(checkpoint=>checkpoint.kind==='before')?.doc;
  const afterCheckpoint=ownCheckpoints.find(checkpoint=>checkpoint.kind==='after');
  const after=afterCheckpoint?.doc;
  const revisionDetails=before&&after?ASEAN_FRAMES.flatMap(({key,label})=>{
   const v1=before.learning?.[key]||'',v2=after.learning?.[key]||'';
   const photoChanged=(before.artworks?.[key]||null)!==(after.artworks?.[key]||null);
   return v1!==v2||photoChanged?[{frame:label,v1,v2,photoChanged}]:[];
  }):[];
  const staffRetest=authorRetest?aseanStaffRetest(staffChecks,authorRetest.id,afterCheckpoint):null;
  const transferNeedsResubmission=Boolean(session&&!rows.some(row=>row.stage_index===5)&&
   (await query(aseanArchivedTransferResponses(admin,session.id).eq('group_id',id).limit(1))).length);
  return send(res,200,{rows,feedback:feedback?.value||null,retest:retest?.value||null,staffRetest,checkpoints,retestTask,revisionDetails,transferNeedsResubmission});
 }
 if(op==='asean-reference-v1'){
  requireMethod(req,'GET');
  if(!session)throw fail(404,'No exhibit checkpoint has been saved.');
  const checkpoint=await query(admin.from('museum_checkpoints').select('*').eq('session_id',session.id)
   .eq('group_id',id).eq('kind','before').maybeSingle());
  if(checkpoint?.doc?.checkpointOrigin!=='reconstructed_reference'||aseanExhibitMissing(checkpoint.doc).length)
   throw fail(404,'A reconstructed V1 reference is unavailable.');
  return send(res,200,{gallery:await checkpointGallery(admin,checkpoint,ctx.group.label)});
 }
 if(session?.status!=='active'||!session.stage_open)throw fail(423,'Wait for the teacher to open this activity.');
 if(op==='asean-capture'){
  requireMethod(req,'POST');guardOrigin(req);
  const {version,question,reason}=guardBody(req,1500);
  if(stage!==4||!Number.isInteger(version)||![1,2,3].includes(question)||typeof reason!=='string'||!reason.trim()||reason.length>300)
   throw fail(400,'Select the question and explain the revision.');
  const draft=await query(admin.from('gcp_drafts').select('doc,version').eq('group_id',id).single());
  const missing=aseanExhibitMissing(draft.doc);
  if(draft.version!==version)throw fail(409,'Save the latest draft first.');
  if(missing.length)throw fail(400,'Complete: '+missing.join(' · '));
  const saved=await query(admin.rpc('museum_asean_capture_revision',{
   p_session:session.id,p_group:id,p_version:version,p_question:question,p_reason:reason.trim()
  }));
  return send(res,200,{version:saved.version});
 }
 if(op==='asean-visit'){
  requireMethod(req,'GET');
  if(stage!==3&&stage!==4)throw fail(423,'Gallery visits are available during Activities 4 and 5.');
  const target=await aseanVisitTarget(admin,ctx.assignment.id,id,stage);
  const checkpoint=await query(admin.from('museum_checkpoints').select('*').eq('session_id',session.id)
   .eq('group_id',target.id).eq('kind',stage===3?'before':'after').maybeSingle());
  if(!checkpoint||aseanExhibitMissing(checkpoint.doc).length)
   return send(res,200,{gallery:null,target:target.label});
  return send(res,200,{gallery:await checkpointGallery(admin,checkpoint,target.label),target:target.label,
   question:stage===4?checkpoint.doc.retestQuestion:null});
 }
 requireMethod(req,'POST');guardOrigin(req);
 const body=guardBody(req,2200);
 if(body.sessionId!==session.id||body.stageIndex!==stage)throw fail(409,'The activity changed. Open the current activity.');
 if(!validAseanResponse(stage,body.value))throw fail(400,'Complete the group response before submitting.');
 if(stage===3||stage===4){
  const target=await aseanVisitTarget(admin,ctx.assignment.id,id,stage);
  const checkpoint=await query(admin.from('museum_checkpoints').select('id,doc').eq('session_id',session.id)
   .eq('group_id',target.id).eq('kind',stage===3?'before':'after').maybeSingle());
  if(!checkpoint||checkpoint.id!==body.checkpointId||aseanExhibitMissing(checkpoint.doc).length||
     (stage===4&&checkpoint.doc.retestQuestion!==body.value.question))
   throw fail(409,'Open the assigned version and answer its question.');
 }
 if(stage===5){
  const baseline=await query(admin.from('museum_live_responses').select('value')
   .eq('session_id',session.id).eq('group_id',id).eq('stage_index',0).maybeSingle());
  if(aseanWritingRepeats(baseline?.value,body.value))
   throw fail(400,'This repeats your baseline writing. Write two new sentences using the destination and prompts on your transfer card.');
 }
 const result=await admin.from('museum_live_responses').insert({
  session_id:session.id,stage_index:stage,group_id:id,value:body.value,
 });
 if(result.error&&result.error.code!=='23505')await query(result);
 return send(res,result.error?200:201,{ok:true,alreadySubmitted:result.error?.code==='23505'});
}
