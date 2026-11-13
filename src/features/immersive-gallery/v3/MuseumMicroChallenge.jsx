import React,{useEffect,useState} from 'react';
import {CheckCircle2,ClipboardCheck,Lightbulb,Send,ShieldCheck} from 'lucide-react';
import {MICRO_CHALLENGES,validMicroAnswer} from './museumLiveExtensions.js';
import {liveGuest} from './museumLiveApi.js';
export default function MuseumMicroChallenge({stageIndex,existing,csrf,language='vi'}){
 const task=MICRO_CHALLENGES[stageIndex];
 const [choice,setChoice]=useState(null),[reason,setReason]=useState(''),[submitted,setSubmitted]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setChoice(null);setReason('');setSubmitted(false);setError('');},[stageIndex]);
 useEffect(()=>{if(existing&&task){setChoice(existing.choice);setReason(existing.reason||'');setSubmitted(true);}},[existing,task]);
 if(!task)return null;
 const send=async()=>{
  const input={choice,reason:reason.trim()};
  if(!validMicroAnswer(stageIndex,input)||busy||submitted)return;
  setBusy(true);setError('');
  try{await liveGuest('micro-submit','POST',input,csrf);setSubmitted(true);}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 return <section className="bml-micro-lab" data-testid="museum-micro-challenge" aria-label="Group learning challenge">
  <header><ClipboardCheck size={21}/><div><small>ENGLISH THINKING LAB · GROUP TASK</small><h3>{task.title}</h3></div></header>
  <p className="bml-micro-question">{task.prompt}</p>
  <div className="bml-micro-options" role="group" aria-label={task.prompt}>
   {task.options.map((answer,i)=><button key={answer} type="button"
    className={choice===i?'is-selected':''} aria-pressed={choice===i}
    disabled={submitted||busy} onClick={()=>setChoice(i)}>
    <b>{String.fromCharCode(65+i)}</b><span>{answer}</span></button>)}
  </div>
  <label className="bml-full-field"><span><Lightbulb size={16}/>{task.explain}</span>
   <textarea rows={3} maxLength={450} placeholder="We chose this because …" lang="en" value={reason}
    disabled={submitted||busy} onChange={e=>setReason(e.target.value)}/>
  </label>
  {!submitted?<button className="bml-primary" type="button" disabled={busy||!validMicroAnswer(stageIndex,{choice,reason})}
   onClick={send}><Send size={16}/>{language==='en'?'Submit group reasoning':'Gửi lập luận của nhóm'}</button>:<>
   <p className="bml-micro-success" role="status"><CheckCircle2 size={18}/>Đã ghi nhận lựa chọn và lập luận bằng tiếng Anh của nhóm.</p>
   <p className="bml-micro-feedback"><ShieldCheck size={17}/>{choice===task.answer?
    'Good reasoning checkpoint. Your explanation is saved; the teacher will review it.':
    'Compare your choice with the source and discuss why another option may be more reliable. Your original response is preserved.'}</p>
  </>}
  <small className="bml-micro-scope">Formative practice · one response per group · not a research result or an automatic grade.</small>
  {error?<p role="alert" className="bml-live-media-error">{error}</p>:null}
 </section>;
}
