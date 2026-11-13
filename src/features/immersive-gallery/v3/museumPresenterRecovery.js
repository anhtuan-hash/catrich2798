// Browser-tab UI preference only. Lesson stage is authoritative on the server.
// Never persist group secrets, signed media URLs, survey answers or audio in storage.
export const RECOVERY_KEY='brian.museum.presenter.ui.v54';
const allowedTools=new Set(['voice','video','resources','notes','groups','explain','survey','tools']);
const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,90}$/.test(value)?value:'';
const withinStage=value=>Number.isInteger(value)&&value>=0&&value<=10?value:null;
export function loadPresenterRecovery(storage,allowedAssignments=[]){
 let raw=null;try{raw=storage?.getItem(RECOVERY_KEY);}catch{return null;}
 if(!raw||raw.length>1000)return null;
 try{
  const value=JSON.parse(raw);
  if(value?.version!==1||!allowedAssignments.includes(value.assignmentId))return null;
  const stageIndex=withinStage(value.stageIndex);
  return {assignmentId:value.assignmentId,stageIndex,
   sessionId:safeId(value.sessionId),
   motionOn:value.motionOn!==false,
   panel:allowedTools.has(value.panel)?value.panel:null,
   showVoiceover:value.showVoiceover===true,
   showVideoLab:value.showVideoLab===true};
 }catch{return null;}
}
export function savePresenterRecovery(storage,data,allowedAssignments=[]){
 const assignmentId=safeId(data?.assignmentId);
 if(!assignmentId||!allowedAssignments.includes(assignmentId))return false;
 const payload={version:1,assignmentId,sessionId:safeId(data.sessionId),
  stageIndex:withinStage(data.stageIndex),
  motionOn:data.motionOn!==false,panel:allowedTools.has(data.panel)?data.panel:null,
  showVoiceover:data.showVoiceover===true,showVideoLab:data.showVideoLab===true};
 try{storage?.setItem(RECOVERY_KEY,JSON.stringify(payload));return true;}catch{return false;}
}
export function shouldRestorePanel(stored,session){
 return Boolean(stored&&session&&stored.sessionId===session.id&&
  stored.stageIndex===session.stageIndex&&session.status!=='ended');
}
