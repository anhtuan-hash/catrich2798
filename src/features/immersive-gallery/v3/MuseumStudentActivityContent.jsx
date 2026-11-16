import React,{useState} from 'react';
import {EVIDENCE_WRITING,LESSON_PLAN_NOTES,OFFLINE_LESSON_WORKSHEET,VISITOR_TASKS} from './lessonPlanAlignment.js';
import {MUSEUM_ACTIVITY_SLIDES,NEXT_DELIVERY_STAGES} from './museumActivitySlides.js';

const tr=(language,vi,en)=>language==='en'?en:vi;

export function StudentActivityTask({stage,language='vi',onOpenProject,projectLabel,extensionOnly=false}){
 const slide=MUSEUM_ACTIVITY_SLIDES[stage.id];
 const note=LESSON_PLAN_NOTES[stage.id];
 const worksheet=({'climate-detective':'individualA','classroom-survey':'survey','problem-evidence-solution':'design',storyboard:'design','artwork-studio':'studio','peer-gallery-walk':'test',revise:'retest',present:'pitch','exit-ticket':'finish'})[stage.id];
 if(!slide)return null;
 const writing=stage.id==='climate-detective'?EVIDENCE_WRITING.before:stage.id==='exit-ticket'?EVIDENCE_WRITING.after:null;
 if(extensionOnly&&note?.extension)return <section className="bml-student-p2-task" lang="en">
  <h3>{writing?(stage.id==='climate-detective'?'Individual writing · A':'Individual writing · B'):(stage.id==='revise'?'Visitor test · V2':'Visitor test · V1')}</h3>
  <p>{note.extension}</p>
  {writing?<p>{writing}</p>:stage.id==='peer-gallery-walk'?<ol>{VISITOR_TASKS.map(task=><li key={task}>{task}</li>)}</ol>:null}
  {onOpenProject?<button type="button" className="bml-outline" onClick={onOpenProject}>{projectLabel}</button>:null}
 </section>;
 return <section className="bml-student-p2-task" data-testid="student-p2-task" aria-label={tr(language,'Nhiệm vụ theo kế hoạch bài dạy','Teaching-plan task')}>
  <p className="bml-student-p2-question" lang="en">{slide.question}</p>
  <div className="bml-student-p2-cards" lang="en">
   {slide.cards.map(([title,body])=><article key={title}><strong>{title}</strong><p>{body}</p></article>)}
  </div>
  <p className="bml-student-p2-output"><strong>{tr(language,'Sản phẩm','Deliverable')}</strong> <span lang="en">{slide.output}</span></p>
  {stage.sentence?<p className="bml-student-p2-frame" lang="en">“{stage.sentence}”</p>:null}
  {NEXT_DELIVERY_STAGES.includes(stage.id)&&note?.extension?<details>
   <summary>{note.reference}</summary>
   <p lang="en">{note.extension}</p>
   {writing?<p lang="en">{writing}</p>:stage.id==='peer-gallery-walk'?<ol lang="en">{VISITOR_TASKS.map(task=><li key={task}>{task}</li>)}</ol>:null}
  </details>:null}
  {stage.id==='exit-ticket'?<p><a href={OFFLINE_LESSON_WORKSHEET+'#follow-up'} target="_blank" rel="noreferrer">{tr(language,'Mở phiếu D2 · Nhật ký sau giờ học','Open Worksheet D2 · After-class log')}</a></p>:null}
  {worksheet?<p><a href={OFFLINE_LESSON_WORKSHEET+'#'+worksheet} target="_blank" rel="noreferrer">{tr(language,'Mở phiếu','Open worksheet')} · {note.reference}</a></p>:null}
  {onOpenProject?<div className="bml-student-p2-actions">
   <button type="button" className="bml-outline" onClick={onOpenProject}>{projectLabel||tr(language,'Mở sản phẩm của nhóm','Open group project')}</button>
  </div>:null}
 </section>;
}

export function StudentActivityQuiz({questions,language='vi',revealed=false,selected={},saved,onSelect,disabled=false}){
 const [page,setPage]=useState(0);
 const question=questions[page];
 return <section className="bml-live-response-form bml-student-p2-quiz" data-testid="student-video-questions">
  <nav className="bml-student-p2-actions" aria-label={tr(language,'Câu hỏi nghe hiểu','Listening questions')}>
   {questions.map((item,i)=><button key={item.q} type="button" className="bml-outline" aria-pressed={i===page} onClick={()=>setPage(i)}>{tr(language,'Câu','Question')} {i+1}</button>)}
  </nav>
  <div lang="en">
   <strong>Q{page+1}. {question.q}</strong>
   {onSelect?<div className="bml-live-response-options">
    {question.choices.map((choice,i)=><button type="button" key={choice} disabled={disabled}
     aria-pressed={selected[page]===i} aria-label={String.fromCharCode(65+i)+'. '+choice}
     className={selected[page]===i?'is-chosen':''} onClick={()=>onSelect(page,i)}>
     <span className="bml-option-letter" aria-hidden="true">{String.fromCharCode(65+i)}.</span>
     <span className="bml-option-copy">{choice}{saved?.[page]===i?<small className="bml-student-saved-choice">{tr(language,'Nhóm đã chọn','Group choice')}</small>:null}</span>
    </button>)}
   </div>:<ol type="A">{question.choices.map((choice,i)=><li key={choice}>{selected[page]===i?<strong>{choice} · {tr(language,'Nhóm đã chọn','Group choice')}</strong>:choice}</li>)}</ol>}
   {revealed&&Number.isInteger(question.answer)?<p className="bml-quiz-revealed">Answer: {String.fromCharCode(65+question.answer)} · {question.explanation}</p>:null}
  </div>
 </section>;
}
