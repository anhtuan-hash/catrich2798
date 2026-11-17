import {ASEAN_FRAMES,aseanExhibitMissing,aseanPeerGroup,validAseanResponse} from '../aseanLesson.js';

function savedStaffCheck(evidence,visitorId,checkpoint){
 if(!checkpoint||!visitorId)return null;
 const record=(evidence.aseanStaffChecks||[]).find(row=>row.group_id===visitorId&&
  row.details?.checkpointId===checkpoint.id&&row.details?.version===checkpoint.version);
 const value=record?.details?.response;
 return value?.question===checkpoint.doc?.retestQuestion&&validAseanResponse(4,value)?value:null;
}

const complete=checkpoint=>Boolean(checkpoint&&aseanExhibitMissing(checkpoint.doc).length===0);

export function aseanStudentRecords(snapshot,group){
 const evidence=snapshot.evidence[group.assignment_id]||{};
 const groups=snapshot.staff.groups.filter(item=>item.assignment_id===group.assignment_id);
 const responses=evidence.responses||[];
 const response=(id,stage)=>responses.find(row=>row.group_id===id&&row.stage_index===stage)?.value??null;
 const checkpoints=evidence.checkpoints||[];
 const find=(id,kind)=>checkpoints.find(row=>row.group_id===id&&row.kind===kind);
 const before=find(group.id,'before'),after=find(group.id,'after');
 const feedbackGroup=aseanPeerGroup(groups,group.id,3,{reverse:true});
 const retestVisitor=aseanPeerGroup(groups,group.id,4,{reverse:true});
 const assigned=aseanPeerGroup(groups,group.id,4);
 const assignedCheckpoint=find(assigned?.id,'after');
 const rows=responses.filter(row=>row.group_id===group.id);
 const revisionDetails=before&&after?ASEAN_FRAMES.flatMap(({key,label})=>{
  const v1=before.doc?.learning?.[key]||'',v2=after.doc?.learning?.[key]||'';
  const photoChanged=(before.doc?.artworks?.[key]||null)!==(after.doc?.artworks?.[key]||null);
  return v1!==v2||photoChanged?[{frame:label,v1,v2,photoChanged}]:[];
 }):[];
 return {rows,feedback:response(feedbackGroup?.id,3),retest:response(retestVisitor?.id,4),
  retestVisitor:retestVisitor?.label??null,staffRetest:savedStaffCheck(evidence,retestVisitor?.id,after),
  checkpoints:[before,after].filter(Boolean).map(({kind,version,doc})=>({kind,version,
   complete:aseanExhibitMissing(doc).length===0,
   ...(kind==='before'&&doc?.checkpointOrigin==='reconstructed_reference'?{reconstructed:true}:{}),
   ...(kind==='after'?{reason:doc?.revisionReason||''}:{})})),
  retestTask:assigned?{target:assigned.label,ready:complete(assignedCheckpoint),
   question:assignedCheckpoint?.doc?.retestQuestion??null,
   staffChecked:Boolean(savedStaffCheck(evidence,group.id,assignedCheckpoint))}:null,
  revisionDetails,transferNeedsResubmission:!rows.some(row=>row.stage_index===5)&&
   (evidence.aseanArchivedTransferResponses||[]).some(row=>row.group_id===group.id),
  hueQuiz:(evidence.hueQuizResults||[]).find(row=>row.group_id===group.id)?.details??null};
}

export function aseanPresentationRecords(snapshot,assignmentId,index,groups,evidence,responses){
 const groupsById=new Set(groups.map(group=>group.id));
 const receivedFeedback=index>=3?groups.flatMap(group=>{
  const target=aseanPeerGroup(groups,group.id,3);
  const response=evidence.responses?.find(row=>row.group_id===group.id&&row.stage_index===3)?.value;
  return target&&validAseanResponse(3,response)?[{from_group:group.id,to_group:target.id,
   clarify:response.comment,rating:response.answers.reduce((sum,answer)=>sum+answer.score,0)}]:[];
 }):[];
 return {activityDataStageIndex:index,
  responses,feedback:receivedFeedback,
  hueQuizResults:index===0?evidence.hueQuizResults||[]:[],
  writingScores:(snapshot.staff.aseanWritingScores||[]).filter(row=>groupsById.has(row.group_id)&&row.stage_index===index),
  studioProgress:index===2?groups.flatMap(group=>{
   const draft=snapshot.groupDrafts[group.id];
   if(!draft?.version)return [];
   const missing=aseanExhibitMissing(draft.draft);
   return [{groupId:group.id,complete:missing.length===0,missing}];
  }):[],
  retestProgress:index===4?groups.map(group=>{
   const target=aseanPeerGroup(groups,group.id,4);
   const before=evidence.checkpoints?.find(row=>row.group_id===target?.id&&row.kind==='before');
   const after=evidence.checkpoints?.find(row=>row.group_id===target?.id&&row.kind==='after');
   const question=after?.doc?.retestQuestion,frame=ASEAN_FRAMES[question-1];
   const answer=responses.find(row=>row.group_id===group.id)?.value;
   return {group:group.label,target:target?.label,ready:complete(after),baselineReady:complete(before),question,
    baselineReconstructed:before?.doc?.checkpointOrigin==='reconstructed_reference',
    score:answer?.score??null,staffReview:savedStaffCheck(evidence,group.id,after),
    reference:frame?after.doc.learning?.[frame.key]:null};
  }):[],
  staffTransferGroupIds:index===5?(evidence.aseanStaffTransferGroupIds??snapshot.live[assignmentId]?.staffTransferGroupIds??[]):[]};
}
