import React,{useId,useState} from 'react';
import {CircleHelp} from 'lucide-react';
import './museumPhotoQuiz.css';

export default function MuseumPhotoQuiz({quiz,language,disabled=false}){
 const [choice,setChoice]=useState(null);
 const promptId=useId();
 const vi=language!=='en';
 const correct=choice===quiz.answer;
 return <section className="bml-photo-quiz" aria-labelledby={promptId} data-testid="museum-photo-quiz">
  <div className="bml-photo-quiz-label"><CircleHelp size={15} aria-hidden="true"/>{vi?'Đố vui cùng ảnh':'Photo quiz'}</div>
  <p id={promptId} className="bml-photo-quiz-question" lang="en">{quiz.question}</p>
  <div className="bml-photo-quiz-choices" role="group" aria-labelledby={promptId} lang="en">
   {quiz.options.map((option,index)=><button key={option} type="button" disabled={disabled}
    aria-pressed={index===choice} data-result={index===choice?(correct?'correct':'incorrect'):undefined}
    onClick={()=>setChoice(index)}>
    <span aria-hidden="true">{String.fromCharCode(65+index)}</span>{option}
   </button>)}
  </div>
  <div role="status" className="bml-photo-quiz-feedback" data-result={choice!==null?(correct?'correct':'incorrect'):undefined}>
   {choice!==null&&<><strong>{correct?(vi?'Chính xác!':'Correct!'):(vi?'Thử lại nhé.':'Try again.')}</strong>
    {correct&&<span lang="en"> {quiz.explanation}</span>}</>}
  </div>
 </section>;
}
