import React from 'react';
import {LESSON_RESOURCES,OFFLINE_GUIDE,CONCLUSION} from './lessonResources.js';
import { LIVE_STAGES } from './liveLesson.js';
import { EVIDENCE_WRITING, LESSON_PLAN_NOTES, PUBLIC_LESSON_GUIDE, VISITOR_TASKS } from './lessonPlanAlignment.js';
export default function LessonResources({stageIndex,teacher=false,language='vi'}){
 const tr=(vi,en)=>language==='en'?en:vi;
 const stage=LIVE_STAGES[stageIndex];
 const activeNote=stage&&LESSON_PLAN_NOTES[stage.id];
 return <div className="bml-learning-resources">
  {activeNote?<p lang="en">{activeNote.task}</p>:null}
  {activeNote?.extension?<details><summary>{activeNote.reference}</summary>
   <p lang="en">{activeNote.extension}</p>
   {stageIndex===0||stageIndex===10?<p lang="en">{stageIndex===0?EVIDENCE_WRITING.before:EVIDENCE_WRITING.after}</p>:null}
   {stageIndex===7?<ol lang="en">{VISITOR_TASKS.map(task=><li key={task}>{task}</li>)}</ol>:null}
   <a href={PUBLIC_LESSON_GUIDE+'#assessment'} target="_blank" rel="noreferrer">{tr('Mở hướng dẫn và phiếu đánh giá','Open assessment guide and worksheets')}</a>
  </details>:null}
  {stageIndex===0?<div className="bml-scenario-pair"><div><span aria-hidden="true">💡</span><strong>Empty classroom · lights on</strong><p>What could we change? Give one reason.</p></div><div><span aria-hidden="true">♻</span><strong>Single-use cups at school</strong><p>Where could students refill a reusable bottle?</p></div></div>:null}
  {[1,3,4,6,8].includes(stageIndex)?<details open={stageIndex===1}><summary>{tr('Learning cards · Ngữ liệu có nguồn','Sourced learning cards')}</summary><div className="bml-resource-grid">{LESSON_RESOURCES.map(c=><article key={c.id}><h3>{c.title}</h3><p>{c.text}</p><strong>{c.task}</strong><small>{c.url?<a href={c.url} target="_blank" rel="noreferrer">{c.source}</a>:c.source}</small></article>)}</div></details>:null}
  {stageIndex===10?<div className="bml-step-hint"><p>{CONCLUSION}</p></div>:null}
  {teacher?<details><summary>{tr('Network fallback · Phương án dùng giấy','Paper fallback')}</summary><p>{OFFLINE_GUIDE}</p><a href={PUBLIC_LESSON_GUIDE} target="_blank" rel="noreferrer">{tr('Mở bản hướng dẫn in','Open printable guide')}</a></details>:null}
 </div>;
}
