import React,{useState} from 'react';
import {ASEAN_HUE_QUESTIONS} from './aseanHueQuestions.js';
import {liveGuest} from './museumLiveApi.js';

const t=(language,vi,en)=>language==='en'?en:vi;

export default function AseanHueQuiz({language,sessionId,csrf,open,readOnly,record}){
 const [choices,setChoices]=useState(()=>ASEAN_HUE_QUESTIONS.map(()=>null));
 const [saved,setSaved]=useState(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const result=record||saved;
 const ready=choices.every(choice=>choice!==null);

 async function submit(event){
  event.preventDefault();
  if(!open||!ready||busy||result)return;
  setBusy(true);
  setError('');
  try{
   const response=await liveGuest('asean-hue-quiz','POST',{sessionId,answers:choices},csrf);
   setSaved(response.result);
  }catch(cause){
   setError(cause.message);
  }finally{
   setBusy(false);
  }
 }

 return <section className="asean-hue-quiz bml-surface" aria-labelledby="asean-hue-quiz-title" lang={language}>
  <h3 id="asean-hue-quiz-title" tabIndex={-1}>{t(language,'Trắc nghiệm thảo luận','Discussion quiz')}</h3>
  {result?<p className="asean-hue-quiz-result" role="status">
   {t(language,'Đã lưu bài trắc nghiệm của nhóm','Group quiz submitted')} <strong>{result.score}/{ASEAN_HUE_QUESTIONS.length}</strong>
  </p>:<p role="status">{open
   ?t(language,'Thảo luận rồi chọn một đáp án cho mỗi câu.','Discuss and choose one answer for each question.')
   :readOnly?t(language,'Có thể xem lại câu hỏi.','You can review the questions.')
    :t(language,'Nộp hai câu ở Bước 1 khi Hoạt động 1 đang mở để làm trắc nghiệm.','Submit the two sentences in Step 1 while Activity 1 is open to take the quiz.')}</p>}
  <form onSubmit={submit}>
   {ASEAN_HUE_QUESTIONS.map(({prompt,options},i)=><fieldset key={prompt} disabled={!open||busy||Boolean(result)} lang="en">
    <legend>{i+1}. {prompt}</legend>
    {options.map((option,j)=><label key={option}>
     <input type="radio" name={'asean-hue-'+i} required checked={(result?.answers??choices)[i]===j}
      onChange={()=>setChoices(previous=>previous.map((value,index)=>index===i?j:value))}/>
     <span>{option}</span>
    </label>)}
    {result&&<p className="asean-hue-quiz-feedback">
     <strong>{result.answers[i]===result.expected[i]?'Correct.':'Review this answer.'}</strong> {result.feedback[i]}
    </p>}
   </fieldset>)}
   {!result&&<div className="asean-hue-quiz-submit">
    <span>{choices.filter(choice=>choice!==null).length}/{ASEAN_HUE_QUESTIONS.length} {t(language,'câu đã chọn','answered')}</span>
    <button type="submit" className="bml-primary" disabled={!open||!ready||busy}>
     {busy?t(language,'Đang gửi…','Submitting…'):t(language,'Nộp trắc nghiệm','Submit quiz')}
    </button>
   </div>}
   {error&&<p className="bml-banner bml-danger-banner" role="alert">{error}</p>}
  </form>
 </section>;
}
