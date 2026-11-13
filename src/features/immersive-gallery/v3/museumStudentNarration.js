import {teacherVoiceover} from './museumLiveExtensions.js';

// Project-step instructions mirror the existing five-step student workbook.
// Do not narrate invented measurements, survey results or student identities.
export const PROJECT_STEP_NARRATIONS=Object.freeze([
 'Welcome to Step One: Understand. Read your assignment carefully. Identify one real environmental problem, explain why it matters, and decide who will visit your museum. Write your ideas in clear English.',
 'Welcome to Step Two: Plan. Organize your exhibition as The Problem, The Evidence, and Our Solution. Assign group roles, find checkable sources, and describe a feasible solution. Remember that a classroom survey shows preferences, not scientific proof.',
 'Welcome to Step Three: Create. Build three exhibits with your group’s own work. Add readable English captions, accurate source credits, and descriptions of your images. Preview your museum to check how visitors will experience it.',
 'Welcome to Step Four: Test. Explore the museum as a visitor. Check the English, the evidence, the 3D layout, and accessibility. Use feedback to make a real improvement, then explain what you changed and why.',
 'Welcome to Step Five: Submit. Review your complete project and make sure all required evidence and captions are included. Save your work, check the submission checklist, and send your museum for admin review when it is ready.'
]);

/**
 * Only a newly opened live activity (not every 3.5-second state poll) should
 * trigger its lesson voiceover. Outside an active lesson, the current project
 * step provides its own narration. A closed lesson stage is silent.
 */
export function studentNarrationCue({liveInfo,step=0,ready=true}={}){
 if(!ready)return null;
 if(liveInfo?.status==='active'){
  if(liveInfo.stageOpen!==true||!liveInfo.stage||!Number.isInteger(liveInfo.stageIndex)||liveInfo.stageIndex<0||liveInfo.stageIndex>10)return null;
  const index=liveInfo.stageIndex,stage=liveInfo.stage;
  const text=teacherVoiceover(stage);
  if(!text)return null;
  return {
   key:'live:'+String(liveInfo.id||'lesson')+':'+index+':'+String(stage.id||'stage'),
   label:'Activity '+(index+1)+' of 11 · '+String(stage.title||'Class activity'),
   text
  };
 }
 if(liveInfo?.status&&!['not_started','ended'].includes(liveInfo.status))return null;
 if(!Number.isInteger(step)||step<0||step>=PROJECT_STEP_NARRATIONS.length)return null;
 return {key:'project:'+step,label:'Project step '+(step+1)+' of 5',text:PROJECT_STEP_NARRATIONS[step]};
}
