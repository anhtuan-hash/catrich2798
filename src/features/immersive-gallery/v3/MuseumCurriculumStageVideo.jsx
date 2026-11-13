import React from 'react';
import {ArrowRight,BookOpen,Film,ShieldCheck} from 'lucide-react';
import {MuseumVideoFrame} from './MuseumVideoLab.jsx';

// The official NASA clips are part of the locked Unit 5 lesson, not YouTube search results.
// Keep the student response API and the teacher's 11-stage progression unchanged.
const VIDEO_GUIDANCE=Object.freeze({
 1:{
  phase:'OBSERVE · EXPLAIN · CITE',
  steps:[
   'Watch a short excerpt: identify a greenhouse gas.',
   'Explain the greenhouse effect using because or therefore.',
   'Introduce the scientific source: “According to NASA, …”'
  ],
  bridge:'After watching, open the three language questions. Groups submit their answers in the existing activity.'
 },
 3:{
  phase:'COMPARE · VERIFY · DESIGN',
  steps:[
   'Listen for the difference between global warming and climate change.',
   'Separate NASA’s scientific explanation from our group-priority survey.',
   'Choose one feasible school action for the Problem–Evidence–Solution canvas.'
  ],
  bridge:'The class survey shows group choices, not measured emissions or the habits of every student.'
 }
});
export default function MuseumCurriculumStageVideo({video,stageIndex,language='en',onContinue}){
 if(!video)return null;
 const guidance=VIDEO_GUIDANCE[stageIndex];
 return <section className="bml-curriculum-video" data-testid="museum-curriculum-video" data-video-id={video.id} aria-label={'NASA lesson video: '+video.title}>
  <div className="bml-curriculum-video-player">
   <MuseumVideoFrame id={video.id} title={video.title} language={language} onClose={onContinue}/>
  </div>
  <aside className="bml-curriculum-video-guide">
   <span className="bml-curriculum-video-tag"><Film size={16} aria-hidden="true"/> NASA · LESSON SOURCE</span>
   <h3>{guidance?.phase||'WATCH · DISCUSS · CITE'}</h3>
   <ol>{guidance?.steps?.map(step=><li key={step}>{step}</li>)}</ol>
   <div className="bml-curriculum-video-reminder"><ShieldCheck size={17} aria-hidden="true"/><p>{guidance?.bridge||video.prompt}</p></div>
   <button type="button" className="bml-curriculum-video-continue" onClick={onContinue}>
    <BookOpen size={17} aria-hidden="true"/> {stageIndex===1?'Practise the 3 questions':'Open design tasks'} <ArrowRight size={17} aria-hidden="true"/>
   </button>
   <small>{video.timing}</small>
  </aside>
 </section>;
}
