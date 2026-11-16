import React from 'react';
import {EVIDENCE_WRITING, LESSON_PLAN_NOTES, VISITOR_TASKS} from '../../v3/lessonPlanAlignment.js';
import {NEXT_DELIVERY_STAGES, MUSEUM_ACTIVITY_SLIDES} from '../../v3/museumActivitySlides.js';
import MuseumSurveyChart from '../../v3/MuseumSurveyChart.jsx';

const t=(language,vi,en)=>language==='en'?en:vi;

function cardParts(title, index) {
  const match = String(title).match(/^([A-Z])\s·\s(.+)$/);
  if (match) return {letter: match[1], title: match[2]};
  return {letter: String.fromCharCode(65 + index), title};
}

function ListeningQuestion({questions,language,revealed,index,onSelect,busy}) {
  const question=questions[index];
  return <>
    <nav className="adv-slide-view-tabs" aria-label={t(language,'Câu hỏi nghe hiểu','Listening questions')}>
      {questions.map((item,i)=><button type="button" key={item.q} aria-pressed={index===i} disabled={busy} onClick={()=>onSelect(i)}>
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

export default function TeacherLiveSlideContent({stage,language,view='task',questions,revealed,survey,curriculumNode,questionIndex=0,onPresent,busy=false,readOnly=false}) {
  const taskView=view;
  const slide=MUSEUM_ACTIVITY_SLIDES[stage.id];
  const note=LESSON_PLAN_NOTES[stage.id];
  const showVote=stage.kind==='vote'&&stage.id==='climate-detective';
  const hasExtension=NEXT_DELIVERY_STAGES.includes(stage.id);
  if(view==='video')return curriculumNode;
  return <>
    {curriculumNode}
    {view==='check'&&questions?.length
      ?<ListeningQuestion questions={questions} language={language} revealed={revealed} index={Math.min(questionIndex,questions.length-1)}
        onSelect={i=>onPresent?.(view,i)} busy={busy}/>
      :<>
        {showVote||hasExtension?<nav className="adv-slide-view-tabs" aria-label={t(language,'Nội dung trình chiếu','Slide content')}>
          <button type="button" aria-pressed={taskView==='task'} disabled={busy} onClick={()=>onPresent?.('task')}>{t(language,'Nhiệm vụ','Task')}</button>
          {showVote?<button type="button" aria-pressed={taskView==='vote'} disabled={busy} onClick={()=>onPresent?.('vote')}>{t(language,'Lựa chọn bình chọn','Vote options')}</button>:null}
          {hasExtension?<button type="button" aria-pressed={taskView==='next'} disabled={busy} onClick={()=>onPresent?.('next')}>{t(language,'Phiếu hoạt động','Worksheet')}</button>:null}
        </nav>:null}
        {taskView==='vote'
          ?<><p className="adv-stage-question">{stage.question}</p>
            <div className="adv-slide-task-cards" data-cols={stage.options.length} lang="en">
              {stage.options.map((option,index)=><div className="adv-slide-col" key={option}>
                <b className="adv-slide-letter">{String.fromCharCode(65+index)}</b>
                <div><strong>{option}</strong></div>
              </div>)}
            </div></>
          :taskView==='next'&&note
            ?<div className="adv-slide-extension" lang="en">
              <strong>{stage.id==='climate-detective'?'Individual writing · A':stage.id==='exit-ticket'?'Individual writing · B':'Visitor test · '+(stage.id==='revise'?'V2':'V1')}</strong>
              <p>{note.extension}</p>
              {stage.id==='climate-detective'||stage.id==='exit-ticket'
                ?<p>{stage.id==='climate-detective'?EVIDENCE_WRITING.before:EVIDENCE_WRITING.after}</p>
                :stage.id==='peer-gallery-walk'?<ol>{VISITOR_TASKS.map(task=><li key={task}>{task}</li>)}</ol>:null}
            </div>
            :<>
              <p className="adv-stage-question">{slide.question}</p>
              {stage.id==='classroom-survey'?<MuseumSurveyChart survey={survey} language={language} pending={!readOnly}/>:null}
              <div className="adv-slide-task-cards" data-cols={slide.cards.length} lang="en">
                {slide.cards.map(([title, text], index) => {
                  const card = cardParts(title, index);
                  return <div className="adv-slide-col" key={title}>
                    <b className="adv-slide-letter">{card.letter}</b>
                    <div><strong>{card.title}</strong><p>{text}</p></div>
                  </div>;
                })}
              </div>
              {stage.id==='classroom-survey'&&!survey&&stage.options?.length
                ?<ol className="adv-slide-answers is-compact" type="A">{stage.options.map(option=><li key={option}>{option}</li>)}</ol>
                :null}
              <p className="adv-slide-output">{slide.output}</p>
            </>}
        {taskView!=='next'&&stage.sentence?<p className="adv-stage-sentence">{stage.sentence.replace(/^["“]|["”]$/g,'')}</p>:null}
        {revealed&&taskView!=='next'&&stage.expected?<p className="adv-slide-explanation">{stage.expected}</p>:null}
      </>}
  </>;
}
