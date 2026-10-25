import React from 'react';
import {LAB_TYPES} from './boardActivityLab.js';
import './BoardActivityLab.css';
const label=(v,vi)=>vi?v[1]:v[0];
export default function BoardActivityPublicPreview({activity,live,vi=true}){
 if(!activity)return null;
 const current=Math.max(0,Math.min((activity.items?.length||1)-1,Number(live?.index)||0));
 const item=activity.items?.[current];
 const legacy=!LAB_TYPES.includes(activity.type);
 const titles={
  hotspot:['Find this location','Chạm tìm vị trí'],
  drag_label:['Place the labels','Kéo nhãn vào vị trí'],
  cloze_snap:['Fill the missing word','Điền từ vào chỗ trống'],
  error_detective:['Find the mistake','Tìm lỗi sai'],
  evidence_hunter:['Find evidence','Tìm bằng chứng'],
  four_corners:['Choose A, B, C or D','Chọn A, B, C hoặc D'],
  flashcard_duel:['Word duel','Thi đấu từ vựng'],
  mystery_reveal:['Answer to uncover','Trả lời để mở ô'],
  stress_tap:['Mark primary stress','Chọn trọng âm chính'],
  concept_connection:['Connect the concepts','Nối các khái niệm']
 };
 const choices=(values)=><div className="bbd-lab-tray">{(values||[]).slice(0,24).map((x,i)=><span key={i} className="bbd-activity-card">{String(i+1)}. {x}</span>)}</div>;
 if(legacy)return <div className="bbd-activity-preview__groups">
  <section><h3>{vi?'Nội dung câu hỏi':'Prompts'}</h3>{choices(activity.labels)}</section>
  {!!activity.options?.length&&<section><h3>{vi?'Ngân hàng phương án':'Answer bank'}</h3>{choices(activity.options)}</section>}
  {!!activity.categories?.length&&<section><h3>{vi?'Nhóm':'Categories'}</h3>{choices(activity.categories)}</section>}
 </div>;
 return <div className="bbd-lab-public" aria-label={vi?'Nội dung công khai cho học sinh':'Student-safe activity'}>
  <div className="bbd-lab-progress">
   <strong>{label(titles[activity.type],vi)}</strong>
   <strong>{current+1}/{activity.items?.length||activity.labels?.length||1}</strong>
  </div>
  {live?.scores&&<div className="bbd-lab-teams">{live.scores.map((x,i)=>
   <div className="bbd-lab-public-team" key={i}>{x.name} <strong>{x.score}</strong></div>)}</div>}
  {['hotspot','drag_label','mystery_reveal'].includes(activity.type)&&
   <div className="bbd-lab-public-image">
    {activity.image?<img src={activity.image} alt={activity.prompt||'Learning image'}/>:
     <div className="bbd-lab-public-placeholder">{activity.prompt||'Learning picture'}</div>}
    {activity.type==='drag_label'&&(activity.items||[]).map((p,i)=>
     <span key={i} className="bbd-lab-public-dot" style={{left:p.x+'%',top:p.y+'%'}}>{i+1}</span>)}
    {activity.type==='mystery_reveal'&&Array.from({length:16},(_,i)=>
     <div key={i} className={'bbd-lab-cover'+(live?.opened?.includes(i)?' open':'')}
      style={{left:i%4*25+'%',top:Math.floor(i/4)*25+'%'}}>{i+1}</div>)}
   </div>}
  {(activity.type==='hotspot'||activity.type==='mystery_reveal')&&
   <p className="bbd-lab-callout">{item?.label||activity.labels?.[current]}</p>}
  {activity.type==='drag_label'&&choices(activity.labels)}
  {activity.type==='cloze_snap'&&<><p className="bbd-lab-sentence">{activity.labels?.[current]}</p>{choices(activity.options)}</>}
  {activity.type==='error_detective'&&<><p className="bbd-lab-sentence">{item?.label}</p>{choices(item?.options)}</>}
  {activity.type==='evidence_hunter'&&<><p className="bbd-lab-public-passage">{activity.passage}</p>
   <p className="bbd-lab-sentence">{item?.label}</p>{choices(item?.options)}</>}
  {activity.type==='four_corners'&&<><p className="bbd-lab-sentence">{item?.label}</p>
   <div className="bbd-lab-four">{(item?.options||[]).map((x,i)=>
    <div key={i} className={'bbd-lab-corner corner-'+i}><strong>{'ABCD'[i]}</strong>{x}</div>)}</div></>}
  {activity.type==='flashcard_duel'&&<div className="bbd-lab-flashcard"><strong>{item?.label}</strong></div>}
  {activity.type==='stress_tap'&&<div className="bbd-lab-stress">{(item?.syllables||[]).map((x,i)=>
   <div key={i} className="bbd-activity-card">{x}</div>)}</div>}
  {activity.type==='concept_connection'&&<><h3>{vi?'Khái niệm':'Concepts'}</h3>{choices(activity.labels)}
   <h3>{vi?'Quan hệ':'Relations'}</h3>{choices(activity.categories)}</>}
 </div>;
}
