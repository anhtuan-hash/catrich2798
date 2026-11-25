import {LIVE_STAGES,sessionStage,summarizeResponses} from '../liveLesson.js';
import {ASEAN_STAGES,isAsean} from '../aseanLesson.js';
import {videoTaskFor} from '../museumLiveExtensions.js';
import {BLOCKED_WRITE,clone,deepFreeze,SNAPSHOT_FORMAT} from './snapshot.js';
import {aseanPresentationRecords,aseanStudentRecords} from './aseanRecords.js';
export function createOfflineRuntime(input){
 if(input?.format!==SNAPSHOT_FORMAT)throw new Error('Unsupported Museum archive format.');
 const snapshot=deepFreeze(clone(input)),presentation=new Map();
 const deny=()=>{throw new Error(BLOCKED_WRITE);};
 let studentGroupId='';
 const studentGroup=()=>{
  const group=snapshot.staff.groups.find(item=>item.id===studentGroupId);
  if(!group)throw new Error('This student package does not include a group.');
  return group;
 };
 const findGallery=id=>snapshot.galleries.find(g=>g.id===id||g.slug===id);
 const lesson=id=>snapshot.staff.assignments.find(item=>item.id===id);
 const stageCount=id=>isAsean(lesson(id))?ASEAN_STAGES.length:LIVE_STAGES.length;
 const presentationState=(id,viewStage)=>{
  const saved=snapshot.live[id]||{session:null};
  const evidence=snapshot.evidence[id];
  const assignment=lesson(id),asean=isAsean(assignment),count=stageCount(id);
  const state=presentation.get(id)||{index:Math.max(0,saved.session?.stageIndex||0),revealed:!!saved.session?.revealed,status:'paused'};
  if(viewStage!==undefined){
   const index=Number(viewStage);
   if(!Number.isInteger(index)||index<0||index>=count)throw new Error('Invalid presentation activity.');
   state.index=index;
  }
  const historicalSession={media_board:{lessonQuestionVersion:saved.session?.questionVersion??2}};
  const currentStage=saved.session?.stageIndex===state.index?saved.session?.stage:null;
  let stage=asean?ASEAN_STAGES[state.index]:currentStage||sessionStage(historicalSession,state.index);
  // Preserve the old survey meaning as well as the old language quiz key.
  if(!asean&&!currentStage&&state.index===2&&saved.session?.evidenceVersion===0)stage={...stage,
   question:'Which action do you currently take at least three days a week?',
   options:['Walk or cycle when possible','Switch off unused lights','Avoid food waste','None of these'],
   sentence:'Legacy group-device responses; do not interpret as individual habits or as the new priority survey.',
   teaching:'This session predates the group-priority protocol.'};
  const responses=(evidence?.responses||[]).filter(r=>r.stage_index===state.index);
  const media=saved.session?.stageIndex===state.index&&saved.session?.media
   ?saved.session.media:videoTaskFor(evidence?.teacherMediaBoard,state.index);
  const groups=clone(saved.groups||snapshot.staff.groups.filter(g=>g.assignment_id===id));
  const records=asean?aseanPresentationRecords(snapshot,id,state.index,groups,evidence||{},responses):null;
  return {...clone(saved),groups,stageCount:count,
   session:{...clone(saved.session||{}),id:saved.session?.id||'offline-presentation-'+id,
    assignmentId:id,stageIndex:state.index,stage:clone(stage),status:state.status,
    revealed:state.revealed,stageOpen:false,stageStartedAt:null,elapsedSeconds:0,version:0,media:clone(media),
    readOnly:true,lessonTemplate:assignment?.lesson_template,stageCount:count},
   survey:clone(evidence?.survey||saved.survey||null),
   result:asean?null:saved.session?.stageIndex===state.index&&saved.result?saved.result:summarizeResponses(state.index,responses,stage),
   responses,feedback:clone(evidence?.feedback||saved.feedback||[]),
   microResults:clone((evidence?.microResponses||[]).filter(r=>r.stage_index===state.index)),
   ...(records?clone(records):{})};
 };
 return {
  snapshot,
  staff:async(action,body)=>{
   if(action==='dashboard')return {...clone(snapshot.staff),offlineReadOnly:true};
   if(action==='showcase-state')return {...clone(snapshot.showcase),galleryEnabled:true,publishedGalleries:clone(snapshot.galleries)};
   if(action==='showcase-exhibition'){
    const gallery=findGallery(body?.id);if(!gallery)throw new Error('This exhibition was not included in the archive.');
    return {gallery:clone(gallery)};
   }
   return deny();
  },
  gallery:async(action,id)=>{
   if(action==='enabled')return true;
   if(action==='list')return clone(snapshot.galleries);
   if(action==='get'){
    const g=findGallery(id);if(!g)throw new Error('Exhibition unavailable in this archive.');return clone(g);
   }
   if(action==='asset')return Object.values(snapshot.artworks).flat().find(a=>a.id===id)?.image_url||'';
   return deny();
  },
  artStaff:async id=>clone(snapshot.artworks[id]||[]),
  publicWorkshop:async(id,section)=>{
   if(section&&section!=='first')return deny();
   const workshop=snapshot.publicWorkshops?.[id];
   const value=section==='first'?workshop?.first:workshop?.main;
   if(!value)throw new Error('Published mobile workshop unavailable in this archive.');
   return clone(value);
  },
  useStudent(id){studentGroupId=id;},
  guest:async(action,method)=>{
   if(!studentGroupId)return deny();
   if(method&&method!=='GET')return deny();
   const group=studentGroup();
   if(action==='me'){
    const assignment=snapshot.staff.assignments.find(item=>item.id===group.assignment_id)||{};
    const review=(snapshot.staff.reviews||[]).find(item=>item.group_id===group.id);
    const feedback=review&&['changes_requested','rejected'].includes(review.state)
     ?{state:review.state,teacher:review.teacher_note||'',ttcm:review.ttcm_note||''}:null;
    return {groupLabel:group.label,groupState:group.state,csrf:'offline-frozen',feedback,readOnly:true,uploadEnabled:false,
     assignment:{title:assignment.title||'',brief:assignment.brief||'',class_scope:assignment.class_scope||'',
      lesson_template:assignment.lesson_template,
      content_frozen_at:assignment.content_frozen_at||snapshot.completedAt,deadline_at:assignment.deadline_at||null,
      max_rooms:assignment.max_rooms||1,max_exhibits:assignment.max_exhibits||3}};
   }
   if(action==='draft'){
    const pack=snapshot.groupDrafts[group.id];
    return {draft:clone(pack?.draft||{}),version:pack?.version||0,updated_at:pack?.updated_at||null};
   }
   return deny();
  },
  liveGuest:async(action,method,body,params={})=>{
   if(!studentGroupId||(method&&method!=='GET'))return deny();
   const group=studentGroup();
   const evidence=snapshot.evidence[group.assignment_id]||{};
   const asean=isAsean(lesson(group.assignment_id));
   if(action==='state'){
    const live=presentationState(group.assignment_id);
    const stageIndex=live.session?.stageIndex;
    return {session:live.session,groupLabel:group.label,assignmentTitle:snapshot.staff.assignments.find(item=>item.id===group.assignment_id)?.title||'',
     readOnly:true,survey:live.survey||null,feedback:clone((evidence.feedback||[]).filter(item=>item.from_group===group.id||item.to_group===group.id)),
     micro:clone((evidence.microResponses||[]).find(item=>item.group_id===group.id&&item.stage_index===stageIndex)||null),
     submitted:(evidence.responses||[]).some(item=>item.group_id===group.id&&item.stage_index===stageIndex)};
   }
   if(asean&&action==='asean-records')return clone(snapshot.aseanWorkshops?.[group.id]||aseanStudentRecords(snapshot,group));
   if(asean&&action==='asean-reference-v1'){
    const gallery=snapshot.comparisons[group.id]?.before;
    if(gallery?.draft?.checkpointOrigin!=='reconstructed_reference')throw new Error('The reconstructed first exhibit was not included in the archive.');
    return {gallery:clone(gallery)};
   }
   if(action==='review-activity'){
    const index=Number(params.stageIndex);
    if(!Number.isInteger(index)||index<0||index>=stageCount(group.assignment_id))throw new Error('Invalid presentation activity.');
    const response=(evidence.responses||[]).find(item=>item.group_id===group.id&&item.stage_index===index);
    const micro=(evidence.microResponses||[]).find(item=>item.group_id===group.id&&item.stage_index===index);
    const peer=index===7?(evidence.feedback||[]).filter(item=>item.from_group===group.id):[];
    return clone({response:response?.value??null,micro:micro||null,peer,videos:evidence.teacherMediaBoard?.[index]?.videos||[]});
   }
   if(action==='history'){
    const compare=snapshot.comparisons[group.id]||{};
    return {checkpoints:[compare.before,compare.after].filter(Boolean).map(clone)};
   }
   if(action==='peer-gallery')return {gallery:null};
   if(action==='peer-rooms')return {rooms:[]};
   return deny();
  },
  artGuest:async(action,method)=>{
   if(!studentGroupId||(method&&method!=='GET')||action!=='list')return deny();
   return {assets:clone(snapshot.artworks[studentGroupId]||[])};
  },
  liveStaff:async(action,body,params={})=>{
   const id=body?.assignmentId||params.assignmentId;
   if(!snapshot.staff.assignments.some(a=>a.id===id))throw new Error('Lesson not included in the archive.');
   if(action==='state')return presentationState(id,params.viewStage);
   // These controls change the viewing position only; frozen records never change.
   if(action==='start'||action==='control'){
    const prior=presentationState(id).session;
    const next={index:prior.stageIndex,revealed:prior.revealed,status:prior.status};
    const command=action==='start'?'restart':body.action;
    if(command==='next'||command==='previous'){next.index=Math.max(0,Math.min(stageCount(id)-1,next.index+(command==='next'?1:-1)));next.revealed=false;}
    else if(command==='reveal')next.revealed=true;
    else if(command==='restart'){next.index=0;next.revealed=false;next.status='paused';}
    else if(command==='pause'||command==='resume')next.status=command==='pause'?'paused':'active';
    else if(command==='end')next.status='paused';
    else return deny();
    presentation.set(id,next);return presentationState(id);
   }
   if(action==='evidence'){if(!snapshot.evidence[id])throw new Error('No recorded live session existed at export.');return clone(snapshot.evidence[id]);}
   if(action==='group-gallery'){
    const g=snapshot.groupDrafts[params.groupId];if(!g)throw new Error('No saved draft existed for this group.');return clone(g);
   }
   if(action==='checkpoint-compare')return clone(snapshot.comparisons[params.groupId]||{before:null,after:null,groupLabel:''});
   return deny();
  },
 };
}
