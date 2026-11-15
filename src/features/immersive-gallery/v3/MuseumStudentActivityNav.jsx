import React from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {LIVE_STAGES} from './liveLesson.js';

const tr=(language,vi,en)=>language==='en'?en:vi;

export default function MuseumStudentActivityNav({index,onChange,language='vi',showLabels=false}){
 const last=LIVE_STAGES.length-1;
 return <nav className="bml-student-p2-nav" aria-label={tr(language,'Điều hướng 11 hoạt động','Navigate 11 activities')}>
  <button type="button" className="bml-outline" disabled={index===0} onClick={()=>onChange(index-1)}
   aria-label={tr(language,'Hoạt động trước','Previous activity')}><ArrowLeft size={17} aria-hidden="true"/>
   {showLabels?<span>{tr(language,'Trước','Previous')}</span>:null}</button>
  <select value={index} onChange={event=>onChange(Number(event.target.value))} aria-label={tr(language,'Hoạt động xem lại','Review activity')}>
   {LIVE_STAGES.map((item,i)=><option key={item.id} value={i}>{i+1}/{LIVE_STAGES.length} · {item.title}</option>)}
  </select>
  <button type="button" className="bml-outline" disabled={index===last} onClick={()=>onChange(index+1)}
   aria-label={tr(language,'Hoạt động tiếp theo','Next activity')}>
   {showLabels?<span>{tr(language,'Sau','Next')}</span>:null}<ArrowRight size={17} aria-hidden="true"/></button>
 </nav>;
}
