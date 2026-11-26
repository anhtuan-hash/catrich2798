import React from 'react';
import {ArrowRight, QrCode} from 'lucide-react';
import AseanPresenterVisual from './AseanPresenterVisual.jsx';
import {ASEAN_ACTIVITY_DESIGN, ASEAN_DISCUSSION_MODEL} from '../../v3/aseanActivityDesign.js';
import {ASEAN_HUE_CORRECT, ASEAN_HUE_QUESTIONS} from '../../v3/aseanHueQuestions.js';
import {ASEAN_FRAMES,aseanPhase} from '../../v3/aseanLesson.js';
import './aseanLiveSlide.css';

const studentActions = [
 [
  ['Write and submit two sentences from your card',
   'Use “Visitors can …” for one activity and “Visitors should …” for one piece of advice.'],
  ['Read the shared Hué example',
   'Find the frame that still needs more specific information for visitors.'],
  ['Submit the discussion quiz',
   'Discuss, then choose one answer for each of the three questions.'],
 ],
 [
  ['Enter three photo codes',
   'Give Place, Experience and Visitor Advice a different code each.'],
  ['Compare one alternative photo',
   'Select a frame, name the alternative photo code and explain why you chose the main photo.'],
  ['Record a sourced fact and submit the plan',
   'Write one fact in your own words and add its source link.'],
 ],
 [
  ['Open the 3D Studio and check all three frames',
   'Use the chosen photos. Upload any missing photo into the correct frame.'],
  ['Complete each frame',
   'Write 20–30 words in English, add the image description, credit and permission, and cite the factual source.'],
  ['Preview in 2D/3D and save the draft',
   'When Activity 4 opens, the latest saved draft becomes the first exhibit for the visitor test.'],
 ],
 [
  ['Open the assigned first exhibit',
   'Use 3D, 2D or printed frames. Inspect all three and record the viewing format and first frame.'],
  ['Record answers and evidence frames',
   'Score each answer: 1 if you found it with evidence, 0 if it was missing or unclear.'],
  ['Submit visitor feedback',
   'Write one specific suggestion in English before submitting.'],
 ],
 [
  ['Your exhibit: revise one frame',
   'Use the feedback, explain the change and save the revised exhibit. Compare the same frame before and after.'],
  ['Assigned exhibit: retest the revised exhibit',
   'The new visitor group answers the same assigned question, cites its evidence frame and submits the retest.'],
 ],
 [
  ['Present the revision',
   'Say what changed and what the visiting group found on the retest.'],
  ['Submit two sentences',
   'Use the new destination card in Lesson to write one activity and one piece of advice.'],
  ['Submit final 3D exhibit',
   'Preview the revised exhibit, then submit it in Group Exhibit.'],
 ],
];

function HueModel({en, revealed}) {
 const model = ASEAN_DISCUSSION_MODEL;
 return <div className="asean-slide-disclosures" lang="en">
  <details open={revealed||undefined}>
   <summary lang={en?'en':'vi'}>{en?'Shared Hué example':'Mẫu chung về Huế'}</summary>
   <h3>{model.title}</h3>
   <ul>{ASEAN_FRAMES.map(({label}, index)=><li key={label}><strong>{label}</strong> · {model.captions[index]}</li>)}</ul>
  </details>
  <details open={revealed||undefined}>
   <summary lang={en?'en':'vi'}>{en?'Discussion quiz · 3 questions':'Trắc nghiệm thảo luận · 3 câu'}</summary>
   <ol>{ASEAN_HUE_QUESTIONS.map(({prompt,options}, index)=><li key={prompt}>
    <strong>{prompt}</strong>
    <ol type="A">{options.map((option, choice)=><li key={option}>{option}
     {revealed&&choice===ASEAN_HUE_CORRECT[index]&&<strong> · Correct</strong>}</li>)}</ol>
   </li>)}</ol>
  </details>
 </div>;
}

export default function AseanLiveSlide({focusMode=false,currentIndex, language, revealed, onJoin, onStudioHelp, draftTools, highlights, contextCard}) {
 const slide = ASEAN_ACTIVITY_DESIGN[currentIndex];
 if (!slide) return null;
 const en = language === 'en';
 const build = slide.id === 'build';
 const phase = aseanPhase(currentIndex);
 const Plan = focusMode?'details':'div';
 return <article key={slide.id} className={'asean-live-slide asean-live-slide--'+slide.id} data-testid={'asean-slide-'+(currentIndex+1)} lang="en">
  <p className="asean-slide-section-title">{phase.en}</p>
  <h2 className="asean-slide-heading">{slide.title[1]}</h2>
  <div className="asean-slide-body">
   <div className="asean-slide-visual">
    <AseanPresenterVisual key={slide.id} activity={slide.id} language="en"/>
    {currentIndex===0&&<HueModel key={String(revealed)} en={en} revealed={revealed}/>}
    {contextCard}
   </div>
   <Plan className={'asean-slide-plan'+(focusMode?' asean-slide-plan-disclosure':'')}>
    {focusMode&&<summary lang={language}>{en?'Student instructions & teacher pacing':'Hướng dẫn học sinh & tiến trình dạy'}</summary>}
    <section aria-labelledby="asean-student-task-heading">
    <h3 id="asean-student-task-heading" className="asean-slide-section-title">On the student screen</h3>
    <ol className="asean-slide-student-actions">
     {studentActions[currentIndex].map(([title])=><li key={title}>
      <strong>{title}</strong>
     </li>)}
    </ol>
    <details className="asean-slide-disclosures asean-slide-instructions">
     <summary lang={language}>{en?'Student instructions':'Hướng dẫn chi tiết cho học sinh'}</summary>
     <ol>{studentActions[currentIndex].map(([title,detail])=><li key={title}>{detail}</li>)}</ol>
    </details>
    <details className="asean-slide-disclosures">
     <summary lang={language}>{en?'Teacher pacing':'Phân bổ thời gian cho giáo viên'}</summary>
     <ol className="asean-slide-timing" aria-label="Activity timing">
      {slide.steps.map(([minutes, , text])=><li key={text}><strong>{minutes} <span>min</span></strong><span>{text}</span></li>)}
     </ol>
    </details>
    </section>
   </Plan>
  </div>
  {highlights?.length>0&&<dl className="asean-slide-highlights" lang={language} aria-label={en?'Class progress':'Tiến độ của lớp'}>
   {highlights.map(({label,count,extra})=><div key={label}><dt>{label}</dt><dd>{count}{extra&&<small>{' '}{extra}</small>}</dd></div>)}
  </dl>}
  <div className="asean-slide-end">
   <div className="asean-slide-output"><strong>Group output</strong><p>{slide.output[1]}</p></div>
   {build&&(onJoin||onStudioHelp||draftTools)&&<div className="asean-slide-actions" lang={language}>
    {onJoin&&<button className="adv-toolbtn" type="button" onClick={onJoin}><QrCode size={16}/>{en?'Class join QR':'QR vào lớp'}</button>}
    {onStudioHelp&&<button className="adv-toolbtn" type="button" onClick={onStudioHelp}>{en?'How to open the 3D Studio':'Hướng dẫn mở Xưởng 3D'} <ArrowRight size={15}/></button>}
    {draftTools&&<div className="asean-slide-drafts">{draftTools}</div>}
   </div>}
  </div>
  {revealed&&currentIndex!==0&&<p className="asean-slide-note" lang="en">{slide.studentTask}</p>}
 </article>;
}
