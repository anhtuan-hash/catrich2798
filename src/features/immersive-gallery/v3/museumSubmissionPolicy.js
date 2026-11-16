// Teacher Live controls synchronous responses; the group museum is an independent
// assignment. The assignment freeze marker controls the completed lesson lock.
// Guest capability, deadline, CSRF, document validation and optimistic versions
// remain enforced separately by the backend.
export function canSaveMuseumDraft(live){
 return !live||['not_started','active','ended'].includes(live.status);
}
export function canSubmitMuseumProject(live){
 if(!live||live.status==='not_started'||live.status==='ended')return true;
 const stageIndex=live.stage_index??live.stageIndex;
 const stageOpen=live.stage_open??live.stageOpen;
 return live.status==='active'&&stageIndex===10&&stageOpen===true;
}
