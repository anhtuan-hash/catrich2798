import {LIVE_STAGES,sessionStage,summarizeResponses} from '../liveLesson.js';
import {BLOCKED_WRITE,clone,deepFreeze,SNAPSHOT_FORMAT} from './snapshot.js';
export function createOfflineRuntime(input){
 if(input?.format!==SNAPSHOT_FORMAT)throw new Error('Unsupported Museum archive format.');
 const snapshot=deepFreeze(clone(input)),presentation=new Map();
 const deny=()=>{throw new Error(BLOCKED_WRITE);};
 const findGallery=id=>snapshot.galleries.find(g=>g.id===id||g.slug===id);
 const presentationState=id=>{
  const saved=snapshot.live[id]||{session:null};
  const evidence=snapshot.evidence[id];
  const state=presentation.get(id)||{index:Math.max(0,saved.session?.stageIndex||0),revealed:!!saved.session?.revealed,status:'paused'};
  const historicalSession={media_board:{lessonQuestionVersion:saved.session?.questionVersion??2}};
  const currentStage=saved.session?.stageIndex===state.index?saved.session?.stage:null;
  let stage=currentStage||sessionStage(historicalSession,state.index);
  // Preserve the old survey meaning as well as the old language quiz key.
  if(!currentStage&&state.index===2&&saved.session?.evidenceVersion===0)stage={...stage,
   question:'Which action do you currently take at least three days a week?',
   options:['Walk or cycle when possible','Switch off unused lights','Avoid food waste','None of these'],
   sentence:'Legacy group-device responses; do not interpret as individual habits or as the new priority survey.',
   teaching:'This session predates the group-priority protocol.'};
  const responses=(evidence?.responses||[]).filter(r=>r.stage_index===state.index);
  const media=evidence?.teacherMediaBoard?.[state.index]||
   (saved.session?.stageIndex===state.index?saved.session?.media:null)||{query:'',instruction:'',videos:[],voiceEnabled:false};
  return {...clone(saved),groups:clone(saved.groups||snapshot.staff.groups.filter(g=>g.assignment_id===id)),
   session:{...clone(saved.session||{}),id:saved.session?.id||'offline-presentation-'+id,
    assignmentId:id,stageIndex:state.index,stage:clone(stage),status:state.status,
    revealed:state.revealed,stageOpen:false,stageStartedAt:null,elapsedSeconds:0,version:0,media:clone(media)},
   survey:clone(evidence?.survey||saved.survey||null),
   result:saved.session?.stageIndex===state.index&&saved.result?saved.result:summarizeResponses(state.index,responses,stage),
   responses,feedback:clone(evidence?.feedback||saved.feedback||[]),
   microResults:clone((evidence?.microResponses||[]).filter(r=>r.stage_index===state.index))};
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
  liveStaff:async(action,body,params={})=>{
   const id=body?.assignmentId||params.assignmentId;
   if(!snapshot.staff.assignments.some(a=>a.id===id))throw new Error('Lesson not included in the archive.');
   if(action==='state')return presentationState(id);
   // These controls change the viewing position only; frozen records never change.
   if(action==='start'||action==='control'){
    const prior=presentationState(id).session;
    const next={index:prior.stageIndex,revealed:prior.revealed,status:prior.status};
    const command=action==='start'?'restart':body.action;
    if(command==='next'||command==='previous'){next.index=Math.max(0,Math.min(LIVE_STAGES.length-1,next.index+(command==='next'?1:-1)));next.revealed=false;}
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
  guest:deny,liveGuest:deny,artGuest:deny,
 };
}
