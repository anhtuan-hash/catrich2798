import React from 'react';
import {saveTextFile,englishSystemGroupLabel} from './museumApi.js';
import {ASEAN_TITLE,ASEAN_SUBTITLE,ASEAN_CHALLENGE,ASEAN_STAGES,ASEAN_RUBRIC,ASEAN_FRAMES,ASEAN_TEMPLATE} from './aseanLesson.js';

export default function AseanTeachingPlan({onCreate}){
 return <section className="bml-screen swiss-teaching-plan" data-testid="asean-teaching-plan">
  <header className="plan-masthead">
   <p className="bml-overline">{ASEAN_SUBTITLE}</p>
   <h1>{ASEAN_TITLE}</h1>
   <p>{ASEAN_CHALLENGE}</p>
   <p><a href="/museum/asean/asean-group-lesson.docx" download="ASEAN_Group_Lesson.docx">Download the English lesson plan and group worksheets</a></p>
   {onCreate&&<button type="button" className="bml-primary" onClick={()=>onCreate(ASEAN_TEMPLATE)}>Create ASEAN lesson</button>}
  </header>
  <section className="bml-surface">
   <h2>Group learning outcomes</h2>
   <p>Ten groups produce one exhibition with three frames per destination.</p>
   <ol>{ASEAN_FRAMES.map(frame=><li key={frame.key}><strong>{frame.label}</strong> · {frame.question}</li>)}</ol>
   <p>Each group submits a writing card at the start and end. Groups choose and credit photographs, test a first version and document one revision with a fresh visitor group.</p>
  </section>
  <div className="bml-single-period-grid">{[1,2].map(period=><section key={period} className="bml-surface">
   <h2>Period {period} · 45 minutes</h2>
   <ol start={period===1?1:4}>{ASEAN_STAGES.filter(stage=>stage.period===period).map(stage=><li key={stage.id}>
    <h3>{stage.title} · {stage.minutes} min</h3><p>{stage.question}</p>
    <p>{stage.teaching}</p><p><strong>Group output</strong> {stage.expected}</p>
   </li>)}</ol>
  </section>)}</div>
  <section className="bml-surface"><h2>Group assessment</h2>
   <ul>{ASEAN_RUBRIC.map(item=><li key={item.key}>{item.en} · {item.max} points</li>)}</ul>
   <p>Exhibition /10. Visitor test /3. Each group writing round /2.</p>
  </section>
 </section>;
}

export function AseanDossier({data,onOpenGallery}){
 const groups=data?.groups||[],assignments=data?.assignments||[],galleries=data?.publishedGalleries||[];
 const groupScore=(groupId,stage)=> {
  const grade=data?.aseanWritingScores?.find(row=>row.group_id===groupId&&row.stage_index===stage)?.details;
  return grade?grade.experience+grade.advice:null;
 };
 return <section className="bml-screen bml-surface">
  <h1>{ASEAN_TITLE} · Teaching dossier</h1>
  <ul>
   <li><a href="/museum/asean/asean-project-overview.docx" download="ASEAN_Project_Overview.docx">Part 1 · Project overview</a></li>
   <li><a href="/museum/asean/asean-group-lesson.docx" download="ASEAN_Group_Lesson.docx">Part 2 · English lesson and group worksheets</a></li>
  </ul>
  {assignments.map(assignment=>{
   const classGroups=groups.filter(group=>group.assignment_id===assignment.id);
   const rows=classGroups.map(group=>({group:englishSystemGroupLabel(group.label),baseline:groupScore(group.id,0),transfer:groupScore(group.id,5)}));
   const paired=rows.filter(row=>row.baseline!==null&&row.transfer!==null);
   const gallery=galleries.find(item=>item.id==='asean-'+assignment.id);
   const summary={paired:paired.length,awaitingScores:rows.length-paired.length,
    higher:paired.filter(row=>row.transfer>row.baseline).length,
    unchanged:paired.filter(row=>row.transfer===row.baseline).length,
    lower:paired.filter(row=>row.transfer<row.baseline).length,
    fullMarksBaseline:paired.filter(row=>row.baseline===2).length,
    fullMarksTransfer:paired.filter(row=>row.transfer===2).length};
   return <section className="bml-surface" key={assignment.id}>
    <h2>{assignment.class_scope} · {assignment.title}</h2>
    {gallery&&<button type="button" className="bml-outline" onClick={()=>onOpenGallery(gallery.id)}>Open published 3D exhibition</button>}
    {!data.publicReadOnly&&<>
     <p>Paired group writing scores · {summary.paired}/{rows.length}. Higher {summary.higher} · unchanged {summary.unchanged} · lower {summary.lower}.</p>
     <button type="button" className="bml-outline" onClick={()=>saveTextFile('ASEAN_Group_Writing.json','application/json',JSON.stringify({class:assignment.class_scope,summary,groups:rows},null,2))}>Export group writing summary</button>
    </>}
   </section>;
  })}
 </section>;
}
