import React,{useEffect,useState} from 'react';
import {BookOpen,Lock} from 'lucide-react';
import {LIVE_STAGES,LEGACY_LANGUAGE_MINI_LESSON} from './liveLesson.js';
import {liveGuest} from './museumLiveApi.js';
import MuseumStudentActivityNav from './MuseumStudentActivityNav.jsx';
import {MUSEUM_CURRICULUM_VIDEOS} from './museumLiveExtensions.js';
import {MuseumVideoFrame} from './MuseumVideoLab.jsx';
import {StudentActivityQuiz,StudentActivityTask} from './MuseumStudentActivityContent.jsx';

const tr=(language,vi,en)=>language==='en'?en:vi;

function ReviewActivity({stage,index,language,onOpenProject,survey,record}){
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
  {view==='task'&&stage.kind==='vote'?<section className="bml-student-p2-task" lang="en">
   <p className="bml-student-p2-question">{stage.question}</p>
   <ol type="A">{stage.options.map((option,i)=><li key={option}>
    {i===record?.response?<strong>{option} · {tr(language,'Nhóm đã chọn','Group choice')}</strong>:option}
   </li>)}</ol>
   {index===2&&survey?<div className="bml-live-survey">
    <strong>{tr(language,'Khảo sát đã chốt','Frozen survey')} · N = {survey.n}</strong>
    {survey.options?.map(option=><p key={option.label}>{option.label}: {option.count}/{survey.n} ({option.percent}%)</p>)}
   </div>:null}
  </section>:null}
  {view==='video'&&video?<div className="bml-student-p2-video">
   <MuseumVideoFrame id={video.id} title={video.title} language={language} onClose={()=>setView('task')}/>
   <p><a href={video.officialSource} target="_blank" rel="noreferrer">{tr(language,'Nguồn NASA','NASA original')}</a>
    {' · '}<a href={video.transcript} target="_blank" rel="noreferrer">{tr(language,'Lời thoại','Transcript')}</a></p>
  </div>:null}
  {view==='quiz'&&questions?<StudentActivityQuiz questions={questions} language={language} selected={Array.isArray(record?.response)?record.response:undefined}/>:null}
  {typeof record?.response==='string'?<section className="bml-student-p2-task">
   <strong>{tr(language,'Câu trả lời đã lưu của nhóm','Saved group response')}</strong><p lang="en">{record.response}</p>
  </section>:null}
  {record?.micro?.reason?<section className="bml-student-p2-task">
   <strong>{tr(language,'Lập luận đã lưu của nhóm','Saved group reasoning')}</strong><p lang="en">{record.micro.reason}</p>
  </section>:null}
  {record?.peer?.length?<section className="bml-student-p2-task">
   <strong>{tr(language,'Góp ý nhóm đã gửi','Feedback your group sent')}</strong>
   {record.peer.map((item,i)=><article key={i} lang="en"><p>{item.learned}</p><p>{item.clarify}</p><small>{item.rating}/4</small></article>)}
  </section>:null}
 </>;
}

export default function MuseumStudentLessonReview({language='vi',onOpenProject,activityIndex,questionVersion,survey,loadSaved=false}){
 const [localIndex,setLocalIndex]=useState(0);
 const index=activityIndex??localIndex;
 const [saved,setSaved]=useState(null);
 useEffect(()=>{
  if(!loadSaved)return;
  let active=true;
  liveGuest('review-activity','GET',null,null,{stageIndex:String(index)})
   .then(record=>{if(active)setSaved({index,record});})
   .catch(()=>{if(active)setSaved({index,error:true});});
  return()=>{active=false;};
 },[index,loadSaved]);
 const record=loadSaved&&saved?.index===index?saved.record:null;
 const stage=index===1&&questionVersion===1?LEGACY_LANGUAGE_MINI_LESSON:LIVE_STAGES[index];
 return <section className="bml-live-student bml-student-p2-review" data-testid="student-lesson-review">
  <div className="bml-live-student-header">
   <strong><BookOpen size={17} aria-hidden="true"/> {tr(language,'Xem lại bài học','Review lesson')}</strong>
   <span><Lock size={14} aria-hidden="true"/> {tr(language,'Chỉ xem','View only')}</span>
  </div>
  {activityIndex==null?<MuseumStudentActivityNav index={index} onChange={setLocalIndex} language={language}/>:null}
  <div className="bml-live-student-question">
   <span className="bml-question-eyebrow">{tr(language,'Tiết','Period')} {stage.period}/2 · {stage.minutes} {tr(language,'phút','min')}</span>
   <h2>{stage.title}</h2>
  </div>
  <ReviewActivity key={stage.id} stage={stage} index={index} language={language} onOpenProject={onOpenProject} survey={survey} record={record}/>
  {loadSaved&&saved?.index===index&&saved.error?<p className="bml-student-p2-task" role="status">{tr(language,'Chưa tải được câu trả lời đã lưu.','Saved responses could not be loaded.')}</p>:null}
 </section>;
}
