import React,{useState} from 'react';
import {BookOpen,ExternalLink,FileText,Filter,Globe2,Leaf,Lightbulb,Search,ShieldCheck} from 'lucide-react';
import {LESSON_RESOURCES} from './lessonResources.js';
const tr=(lang,vi,en)=>lang==='en'?en:vi;
const categories={
 'climate-detective':[0,1],
 'language-mini-lesson':[0,2,3],
 'classroom-survey':[2],
 'problem-evidence-solution':[0,1,2,3],
 'storyboard':[2,3],
 'recap':[0,2,3],
 'artwork-studio':[1,3],
 'peer-gallery-walk':[3],
 'revise':[2,3],
 'present':[0,2,3],
 'exit-ticket':[1,3]
};
const SOURCE_TIPS=Object.freeze([
 'Who published this? Is the evidence attributable and up to date?',
 'Does the source describe scientific findings, actions or opinions?',
 'Do not report class-group votes as individual habits or measured emissions.',
 'Can a visitor identify a claim, source, limitation and recommendation?'
]);
export default function MuseumResourceHub({stage,language='vi'}){
 const [filter,setFilter]=useState('');
 const selected=(categories[stage?.id]||[0,1,2,3]).map(i=>LESSON_RESOURCES[i]);
 const visible=selected.filter(x=>[x.title,x.text,x.source,x.task].join(' ').toLowerCase().includes(filter.toLowerCase()));
 return <section className="bml-resource-hub" data-testid="museum-research-library">
  <div className="bml-resource-hub-head">
   <div><div className="bml-video-kicker"><BookOpen size={17}/> RESEARCH LIBRARY</div>
    <h3>Kho tư liệu · {stage?.title||'English climate action'}</h3>
    <p>{tr(language,'Tư liệu khoa học, đọc hiểu và câu mẫu có nguồn; phù hợp hoạt động hiện tại.','Sourced climate science, reading and English language supports for this activity.')}</p></div>
   <label className="bml-resource-search"><Search size={16}/>
    <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={tr(language,"Search sources / tìm trong kho…","Search the learning library…")} aria-label="Search learning library"/></label>
  </div>
  <div className="bml-resource-hub-list">{visible.map((item,i)=><article key={item.id} className="bml-resource-hub-card">
   <div className="bml-resource-number">{String(i+1).padStart(2,'0')}</div>
   <div><h4>{item.title}</h4><p>{item.text}</p><blockquote>{item.task}</blockquote>
    {item.url?<a href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>{item.source}</a>:<small><ShieldCheck size={14}/>{item.source}</small>}
   </div></article>)}</div>
  {!visible.length?<p>{tr(language,'Không tìm thấy tư liệu khớp từ khóa.','No learning resources match this search.')}</p>:null}
  <div className="bml-source-check"><Globe2 size={21}/><div><strong>{tr(language,'SOURCE CHECK · trước khi đưa thông tin vào triển lãm','SOURCE CHECK · before including a claim in your museum')}</strong>
   <div>{SOURCE_TIPS.map(tip=><span key={tip}><Leaf size={14}/>{tip}</span>)}</div></div></div>
 </section>;
}
