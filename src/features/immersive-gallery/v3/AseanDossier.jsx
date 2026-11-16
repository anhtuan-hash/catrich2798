import React from 'react';
import {saveTextFile,englishSystemGroupLabel} from './museumApi.js';
import {ASEAN_TITLE} from './aseanLesson.js';

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
