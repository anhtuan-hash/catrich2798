import React,{useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Lock} from 'lucide-react';
import {LIVE_STAGES} from './liveLesson.js';
import {MUSEUM_CURRICULUM_VIDEOS} from './museumLiveExtensions.js';
import {MuseumVideoFrame} from './MuseumVideoLab.jsx';
import {StudentActivityQuiz,StudentActivityTask} from './MuseumStudentActivityContent.jsx';

const tr=(language,vi,en)=>language==='en'?en:vi;

function ReviewActivity({stage,index,language,onOpenProject}){
 const [view,setView]=useState('task');
 const video=MUSEUM_CURRICULUM_VIDEOS[index];
 const questions=stage.questions??stage.videoQuestions;
 return <>
  {video?<div className="bml-student-p2-actions" role="group" aria-label={tr(language,'Nội dung hoạt động','Activity content')}>
   <button type="button" className="bml-outline" aria-pressed={view==='task'} onClick={()=>setView('task')}>{tr(language,'Nhiệm vụ','Task')}</button>
   <button type="button" className="bml-outline" aria-pressed={view==='video'} onClick={()=>setView('video')}>{tr(language,'Xem clip NASA','Watch NASA clip')}</button>
   <button type="button" className="bml-outline" aria-pressed={view==='quiz'} onClick={()=>setView('quiz')}>{tr(language,'3 câu hỏi video','3 video questions')}</button>
  </div>:null}
  {view==='task'?<StudentActivityTask stage={stage} language={language} onOpenProject={onOpenProject}/>:null}
  {view==='video'&&video?<div className="bml-student-p2-video">
   <MuseumVideoFrame id={video.id} title={video.title} language={language} onClose={()=>setView('task')}/>
   <p><a href={video.officialSource} target="_blank" rel="noreferrer">{tr(language,'Nguồn NASA','NASA original')}</a>
    {' · '}<a href={video.transcript} target="_blank" rel="noreferrer">{tr(language,'Lời thoại','Transcript')}</a></p>
  </div>:null}
  {view==='quiz'&&questions?<StudentActivityQuiz questions={questions} language={language}/>:null}
 </>;
}

export default function MuseumStudentLessonReview({language='vi',onOpenProject}){
 const [index,setIndex]=useState(0);
 const stage=LIVE_STAGES[index];
 return <section className="bml-live-student bml-student-p2-review" data-testid="student-lesson-review">
  <div className="bml-live-student-header">
   <strong><BookOpen size={17} aria-hidden="true"/> {tr(language,'Xem lại bài học','Review lesson')}</strong>
   <span><Lock size={14} aria-hidden="true"/> {tr(language,'Chỉ xem','View only')}</span>
  </div>
  <nav className="bml-student-p2-nav" aria-label={tr(language,'Chọn hoạt động xem lại','Choose activity to review')}>
   <button type="button" className="bml-outline" disabled={index===0} onClick={()=>setIndex(value=>value-1)}
    aria-label={tr(language,'Hoạt động trước','Previous activity')}><ArrowLeft size={17} aria-hidden="true"/></button>
   <select value={index} onChange={event=>setIndex(Number(event.target.value))} aria-label={tr(language,'Hoạt động xem lại','Review activity')}>
    {LIVE_STAGES.map((item,i)=><option key={item.id} value={i}>{i+1}/11 · {item.title}</option>)}
   </select>
   <button type="button" className="bml-outline" disabled={index===LIVE_STAGES.length-1} onClick={()=>setIndex(value=>value+1)}
    aria-label={tr(language,'Hoạt động tiếp theo','Next activity')}><ArrowRight size={17} aria-hidden="true"/></button>
  </nav>
  <div className="bml-live-student-question">
   <span className="bml-question-eyebrow">{tr(language,'Tiết','Period')} {stage.period}/2 · {stage.minutes} {tr(language,'phút','min')}</span>
   <h2>{stage.title}</h2>
  </div>
  <ReviewActivity key={stage.id} stage={stage} index={index} language={language} onOpenProject={onOpenProject}/>
 </section>;
}
