import React from 'react';
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
  ['Make an original poster','Export or photograph work created by your group.','draw'],
  ['Write the exhibit label','Use 25–40 English words and cite the source.','text'],
  ['Place it in your 3D room','Check the visitor view and the 2D fallback.','idea']],
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
 return <div className="bml-paper-activity-grid" data-testid="museum-live-activity-cards">
  {cards.map(([title,description,icon],i)=>{
   const Icon=iconFor[icon]||CheckCircle2;
   return <article className="bml-paper-task" key={stage.id+'-'+i}>
    <div className="bml-paper-task-head"><span className="bml-paper-task-index">{String(i+1).padStart(2,'0')}</span><Icon size={23} aria-hidden="true"/></div>
    <h3>{title}</h3><p>{description}</p><ArrowRight size={16} className="bml-paper-task-arrow" aria-hidden="true"/>
   </article>;
  })}
 </div>;
}
