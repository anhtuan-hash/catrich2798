import {LIVE_STAGES} from './liveLesson.js';
const list=v=>Array.isArray(v)?v:[];
const byGroup=(bundle)=>new Map(list(bundle?.groups).map(g=>[g.id,String(g.label||'Class group')]));
const display=(v)=>typeof v==='string'?v:JSON.stringify(v??'');
export function portfolioProvenance(bundle={}){
 const p=bundle.presentationProvenance;
 return p?.data_origin==='scripted_presentation'?
  {classification:'Prepared classroom presentation content — NOT independently observed classroom evidence',
   source:'Teacher-only provenance record',note:String(p.teacher_visible_note||'').slice(0,1500),
   requiresVerification:true}:
  {classification:p?.data_origin||'Classroom records (verify authorship and consent before competition submission)',
   source:p?'Teacher-only provenance record':'No explicit presentation provenance record',
   note:String(p?.teacher_visible_note||'No independent authenticity certification is supplied by the software.').slice(0,1500),
   requiresVerification:true};
}
export function portfolioStageRows(bundle={}){
 const responses=list(bundle.responses),micro=list(bundle.microResponses),checkpoints=list(bundle.checkpoints);
 return LIVE_STAGES.map((stage,index)=>{
  const responseCount=new Set(responses.filter(r=>r.stage_index===index).map(r=>r.group_id)).size;
  const thinkingCount=new Set(micro.filter(r=>r.stage_index===index).map(r=>r.group_id)).size;
  const versionCount=index===4?checkpoints.filter(c=>c.kind==='storyboard').length:
    index===7?list(bundle.feedback).length:
    index===8?checkpoints.filter(c=>c.kind==='after').length:0;
  return [index+1,'Period '+stage.period,stage.title,stage.minutes+' minutes',
    stage.kind,responseCount,thinkingCount,versionCount,
    'Planned task; totals are recorded class/group counts, not learning-effectiveness scores'];
 });
}
export function portfolioExitRows(bundle={}){
 const names=byGroup(bundle);
 return list(bundle.responses).filter(r=>r.stage_index===10).map(r=>[
  names.get(r.group_id)||'Class group',display(r.value),String(r.created_at||'')
 ]);
}
export function portfolioThinkingRows(bundle={}){
 const names=byGroup(bundle);
 return list(bundle.microResponses).map(r=>[
  names.get(r.group_id)||'Class group',Number(r.stage_index)+1,
  LIVE_STAGES[r.stage_index]?.title||'Unrecognised activity',
  display(r.choice),String(r.reason||''),String(r.submitted_at||'')
 ]);
}
export function portfolioPeerFocusRows(bundle={}){
 const names=byGroup(bundle),rooms=new Map(list(bundle.livePeerFeedback?.rooms).map(r=>[r.id,r]));
 return list(bundle.livePeerFeedback?.reviews).map(review=>{
  const room=rooms.get(review.room_id);
  return [names.get(review.from_group_id)||'Class group',names.get(room?.owner_group_id)||'Class group',
   review.target_exhibit||'Whole exhibition',String(review.learned||''),String(review.clarify||''),
   review.rating??'',String(review.created_at||'')];
 });
}
export function portfolioReflectionRows(bundle={}){
 const names=byGroup(bundle);
 return list(bundle.checkpoints).filter(c=>c.kind==='after').map(c=>[
  names.get(c.group_id)||'Class group',c.version??'',String(c.doc?.learning?.source||''),
  String(c.doc?.learning?.roles||''),String(c.doc?.learning?.reflection||''),
  String(c.doc?.learning?.improvement||''),String(c.created_at||'')
 ]);
}
