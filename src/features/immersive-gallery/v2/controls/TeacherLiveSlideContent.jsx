import React,{useState} from 'react';
import {EVIDENCE_WRITING, LESSON_PLAN_NOTES, VISITOR_TASKS} from '../../v3/lessonPlanAlignment.js';
import {NEXT_DELIVERY_STAGES, TEACHER_LIVE_SLIDES} from './teacherLiveSlides.js';

const t=(language,vi,en)=>language==='en'?en:vi;

function ListeningQuestion({questions,language,revealed}) {
  const [index,setIndex]=useState(0);
  const question=questions[index];
  return <>
    <nav className="adv-slide-view-tabs" aria-label={t(language,'Câu hỏi nghe hiểu','Listening questions')}>
      {questions.map((item,i)=><button type="button" key={item.q} aria-pressed={index===i} onClick={()=>setIndex(i)}>
        {t(language,'Câu','Question')} {i+1}
      </button>)}
    </nav>
    <p className="adv-stage-question">{question.q}</p>
    <ol className="adv-slide-answers" type="A">
      {question.choices.map((choice,i)=><li key={choice} data-correct={revealed&&i===question.answer||undefined}>{choice}</li>)}
    </ol>
    {revealed?<p className="adv-slide-explanation">{question.explanation}</p>:null}
  </>;
}

function FrozenSurvey({survey,language}){
  const options=survey?.options;
  if(!options?.length)return null;
  const date=Date.parse(survey.created_at);
  const dateLabel=Number.isFinite(date)?new Intl.DateTimeFormat(language==='en'?'en':'vi',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'medium'}).format(date):'';
  const number=new Intl.NumberFormat(language==='en'?'en':'vi',{maximumFractionDigits:2});
  return <div className="adv-slide-survey">
    <strong>{t(language,'Biểu đồ đã chốt','Frozen survey')} · N = {survey.n} {t(language,'nhóm','groups')}{dateLabel?' · '+dateLabel:''}</strong>
    <ul>{options.map(option=><li key={option.label}>
      <span>{option.label}</span><b>{option.count}/{survey.n} · {number.format(option.percent)}%</b>
    </li>)}</ul>
  </div>;
}

export default function TeacherLiveSlideContent({stage,language,view='task',questions,revealed,survey,curriculumNode}) {
  const [taskView,setTaskView]=useState('task');
  const slide=TEACHER_LIVE_SLIDES[stage.id];
  const note=LESSON_PLAN_NOTES[stage.id];
  const showVote=stage.kind==='vote'&&stage.id==='climate-detective';
  const hasExtension=NEXT_DELIVERY_STAGES.includes(stage.id);
  if(view==='video')return curriculumNode;
  return <>
    {curriculumNode}
    {view==='check'&&questions?.length
      ?<ListeningQuestion questions={questions} language={language} revealed={revealed}/>
      :<>
        {showVote||hasExtension?<nav className="adv-slide-view-tabs" aria-label={t(language,'Nội dung trình chiếu','Slide content')}>
          <button type="button" aria-pressed={taskView==='task'} onClick={()=>setTaskView('task')}>{t(language,'Nhiệm vụ','Task')}</button>
          {showVote?<button type="button" aria-pressed={taskView==='vote'} onClick={()=>setTaskView('vote')}>{t(language,'Lựa chọn bình chọn','Vote options')}</button>:null}
          {hasExtension?<button type="button" aria-pressed={taskView==='next'} onClick={()=>setTaskView('next')}>{t(language,'Lần dạy tiếp theo','Next delivery')}</button>:null}
        </nav>:null}
        {taskView==='vote'
          ?<><p className="adv-stage-question">{stage.question}</p><ol className="adv-slide-answers" type="A">
            {stage.options.map(option=><li key={option}>{option}</li>)}
          </ol></>
          :taskView==='next'&&note
            ?<div className="adv-slide-extension" lang="en">
              <strong>{stage.id==='climate-detective'?'Individual writing · A':stage.id==='exit-ticket'?'Individual writing · B':'Visitor test · '+(stage.id==='revise'?'V2':'V1')}</strong>
              <p>{note.extension}</p>
              {stage.id==='climate-detective'||stage.id==='exit-ticket'
                ?<p>{stage.id==='climate-detective'?EVIDENCE_WRITING.before:EVIDENCE_WRITING.after}</p>
                :<ol>{VISITOR_TASKS.map(task=><li key={task}>{task}</li>)}</ol>}
            </div>
            :<>
              <p className="adv-stage-question">{slide.question}</p>
              <div className="adv-slide-task-cards" lang="en">
                {slide.cards.map(([title,text])=><div key={title}><strong>{title}</strong><p>{text}</p></div>)}
              </div>
              {stage.id==='classroom-survey'&&survey?<FrozenSurvey survey={survey} language={language}/>:null}
              {stage.id==='classroom-survey'&&!survey&&stage.options?.length
                ?<ol className="adv-slide-answers is-compact" type="A">{stage.options.map(option=><li key={option}>{option}</li>)}</ol>
                :null}
              <p className="adv-slide-output"><b>{t(language,'Sản phẩm','Deliverable')}</b> {slide.output}</p>
            </>}
        {taskView!=='next'&&stage.sentence?<p className="adv-stage-sentence">“{stage.sentence}”</p>:null}
      </>}
  </>;
}
