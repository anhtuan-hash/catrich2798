import React from 'react';
import {LESSON_RESOURCES,OFFLINE_GUIDE,CONCLUSION} from './lessonResources.js';
export default function LessonResources({stageIndex,teacher=false,language='vi'}){
 const tr=(vi,en)=>language==='en'?en:vi;
 return <div className="bml-learning-resources">
  {stageIndex===0?<div className="bml-scenario-pair"><div><span aria-hidden="true">💡</span><strong>Empty classroom · lights on</strong><p>What could we change? Give one reason.</p></div><div><span aria-hidden="true">🚲</span><strong>A safe journey to school</strong><p>When is cycling feasible? Consider distance and safety.</p></div></div>:null}
  {[1,3,4,6,8].includes(stageIndex)?<details open={stageIndex===1}><summary>{tr('Learning cards · Ngữ liệu có nguồn','Sourced learning cards')}</summary><div className="bml-resource-grid">{LESSON_RESOURCES.map(c=><article key={c.id}><h3>{c.title}</h3><p>{c.text}</p><strong>{c.task}</strong><small>{c.url?<a href={c.url} target="_blank" rel="noreferrer">{c.source}</a>:c.source}</small></article>)}</div></details>:null}
  {stageIndex===10?<div className="bml-step-hint"><p>{CONCLUSION}</p></div>:null}
  {teacher?<details><summary>{tr('Network fallback · Phương án dùng giấy','Paper fallback')}</summary><p>{OFFLINE_GUIDE}</p><button className="bml-outline" onClick={()=>window.print()}>{tr('In hướng dẫn / Print','Print guide')}</button></details>:null}
 </div>;
}
