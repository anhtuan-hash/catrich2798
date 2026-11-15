import React from 'react';
import {EVIDENCE_PROMPT_EXAMPLE} from './posterPrompts.js';
import {ArrowRight,BookOpen,CheckCircle2,ClipboardCheck,FileText,Image as ImageIcon,Lightbulb,MessageCircle,PenTool,RefreshCcw,Search,Users} from 'lucide-react';

// Presenter-only guidance; not a replacement for LIVE_STAGES nor a student response.
// Cards deliberately describe what to DO, never imply uncollected survey evidence.
const PER_STAGE={
 'problem-evidence-solution':[
  ['Find the problem','Choose one relevant climate issue at school.','search'],
  ['Verify the evidence','Name a credible source or actual observation.','source'],
  ['Propose a solution','Explain one feasible action in clear English.','idea']],
 'storyboard':[
  ['01 · The Problem','Sketch the issue and draft an English caption.','draw'],
  ['02 · The Evidence','Plan a cited observation or survey chart.','source'],
  ['03 · Our Solution','Show a realistic response and why it helps.','idea']],
 'recap':[
  ['Clear language','Can a visitor understand each exhibit?','text'],
  ['Reliable evidence','Is the source real, with N and limitations?','source'],
  ['Useful action','Is the recommendation feasible at school?','check']],
 'artwork-studio':[
  ['Write three prompts','Use the group’s text for The Problem, The Evidence and Our Solution. Assign one poster per writer.','draw'],
  ['Check the images','Match each image to its English label. Check the source, any numbers and the proposed action.','check'],
  ['Upload and save V1','Save the prompt and one check note for each AI-assisted poster. Credit the creator, add alt text and preview in 2D or 3D.','idea']],
 'peer-gallery-walk':[
  ['Visit another group','Explore their exhibition as a real visitor.','search'],
  ['Give evidence-based feedback','Say what you learned and what is unclear.','message'],
  ['Record the feedback','Save one actionable improvement suggestion.','check']],
 'revise':[
  ['Review visitor comments','Identify one specific issue to improve.','message'],
  ['Make the revision','Edit a caption, source or original artwork.','draw'],
  ['Explain the change','Document what changed and why it is clearer.','check']],
 'present':[
  ['Problem','Introduce the school issue in your own words.','text'],
  ['Evidence','Explain one authentic figure, its N and limitation.','source'],
  ['Action','Present a feasible solution in 45–60 seconds.','idea']],
 'exit-ticket':[
  ['Choose one action','Name an environmental action you can take.','idea'],
  ['Give your reason','Use because to connect cause and action.','text'],
  ['Submit your reflection','Write a meaningful English response.','check']]
};
const iconFor={search:Search,source:BookOpen,idea:Lightbulb,draw:PenTool,message:MessageCircle,text:FileText,check:ClipboardCheck};
export function presenterSteps(stage){
 return PER_STAGE[stage?.id]||[];
}
export default function MuseumLivePaperCards({stage}){
 const cards=presenterSteps(stage);
 if(!cards.length)return null;
 return <>
 <div className="bml-paper-activity-grid" data-testid="museum-live-activity-cards">
  {cards.map(([title,description,icon],i)=>{
   const Icon=iconFor[icon]||CheckCircle2;
   return <article className="bml-paper-task" key={stage.id+'-'+i}>
    <div className="bml-paper-task-head"><span className="bml-paper-task-index">{String(i+1).padStart(2,'0')}</span><Icon size={23} aria-hidden="true"/></div>
    <h3>{title}</h3><p>{description}</p><ArrowRight size={16} className="bml-paper-task-arrow" aria-hidden="true"/>
   </article>;
  })}
 </div>
 {stage.id==='artwork-studio'?<details className="bml-paper-task">
  <summary>Model an Evidence prompt</summary>
  <p>{EVIDENCE_PROMPT_EXAMPLE}</p>
  <p>Ask the class to flag a bottle count, invented source or emissions claim. Use the verified caption and chart when adding text and numbers.</p>
 </details>:null}
 </>;
}
