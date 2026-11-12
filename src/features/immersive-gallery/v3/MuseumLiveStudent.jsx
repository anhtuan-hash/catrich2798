import React,{useEffect,useState} from 'react';
import {CheckCircle2,Eye,HelpCircle,Info,Lock,MessageCircle,RefreshCcw,Send,Users} from 'lucide-react';
import {liveGuest} from './museumLiveApi.js';
import MuseumScene from './MuseumScene.jsx';
import './museumLive.css';
const t=(language,vi,en)=>language==='en'?en:vi;
export default function MuseumLiveStudent({csrf,language='vi',onState}){
 const [data,setData]=useState(null),[selected,setSelected]=useState(null);
 const [quiz,setQuiz]=useState({}),[written,setWritten]=useState('');
 const [sent,setSent]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [peer,setPeer]=useState(null),[survey,setSurvey]=useState(null);
 const refresh=async()=>{
  try{const d=await liveGuest('state');setData(d);onState?.(d.session);
   if(d.session?.stageIndex>=3)liveGuest('results').then(x=>setSurvey(x.results)).catch(()=>{});
  }catch(e){setError(e.message);}
 };
 useEffect(()=>{refresh();const id=window.setInterval(refresh,3500);return()=>window.clearInterval(id);},[]);
 const session=data?.session,stage=session?.stage,stageIndex=session?.stageIndex;
 const posted=sent[session?.id+'-'+stageIndex]===true;
 const canRespond=stage&&['vote','quiz','peer','exit'].includes(stage.kind);
 const submit=async()=>{
  if(busy||posted)return;
  const value=stage.kind==='vote'?selected:stage.kind==='quiz'?stage.questions.map((_,i)=>quiz[i]??null):written.trim();
  setBusy(true);setError('');
  try{await liveGuest('respond','POST',{value},csrf);setSent(v=>({...v,[session.id+'-'+stageIndex]:true}));}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const help=async()=>{setError('');try{await liveGuest('need-help','POST',{},csrf);}
  catch(e){setError(e.message);}
 };
 const visitPeer=async()=>{setError('');try{const r=await liveGuest('peer-gallery');if(!r.gallery){setError(t(language,'Chưa có nhóm khác để tham quan.','No other group gallery yet.'));return;}
   const draft=r.gallery.draft||{},signed=new Map((r.gallery.artworks||[]).map(x=>[x.id,x.image_url]));
   setPeer({...draft,summary:'Temporary private classroom preview',rooms:(draft.rooms||[]).map((room,i)=>({
    ...room,id:'peer-room-'+i,exhibits:(room.exhibits||[]).map((e,j)=>({
     ...e,id:'peer-exhibit-'+i+'-'+j,status:'published',image_url:signed.get(e.asset_id)||''
    }))
   }))});}
  catch(e){setError(e.message);}};
 if(!session||session.status==='not_started'||session.status==='ended')return <section className="bml-live-student" data-testid="student-live-waiting">
  <div className="bml-live-student-header"><strong>Teacher Live</strong><span>{t(language,'Đang chờ giáo viên bắt đầu bài dạy.','Waiting for your teacher to start the lesson.')}</span></div>
  <button type="button" className="bml-outline" onClick={refresh}><RefreshCcw size={16}/>{t(language,'Kiểm tra lại','Refresh')}</button>
 </section>;
 if(peer)return <section className="bml-live-student"><button className="bml-outline" type="button" onClick={()=>setPeer(null)}>{t(language,'← Trở về bài học','← Back to lesson')}</button>
  <strong>{t(language,'THAM QUAN CHÉO · CHỈ TRONG PHẠM VI LỚP','PEER REVIEW · CLASSROOM ONLY')}</strong>
  <MuseumScene gallery={peer} language={language} embedded/></section>;
 return <section className="bml-live-student" data-testid="student-live-activity">
  <header className="bml-live-student-header"><strong>Teacher Live · {t(language,'Tiết','Period')} {stage?.period}/2 · {t(language,'Hoạt động','Stage')} {stageIndex+1}/11</strong>
   <span>{session.stageOpen?t(language,'Giáo viên đã mở hoạt động','Activity is open'):t(language,'Chờ giáo viên mở hoạt động','Waiting for teacher')}</span></header>
  <h2>{stage?.title}</h2><p>{stage?.question}</p>
  <div className="bml-step-hint"><Info size={19}/><span>{stage?.sentence}</span></div>
  {!session.stageOpen||session.status!=='active'?<div className="bml-banner bml-info-banner"><Lock size={18}/>{t(language,'Chờ giáo viên mở hoạt động tiếp theo.','Wait for your teacher to open this task.')}</div>:<>
    {stage.kind==='vote'?<div className="bml-live-response-options">{stage.options.map((o,i)=><button type="button" key={i} disabled={posted||busy}
     className={selected===i?'is-chosen':''} onClick={()=>setSelected(i)}>{String.fromCharCode(65+i)}. {o}</button>)}</div>:null}
    {stage.kind==='quiz'?<div className="bml-live-response-form">{stage.questions.map((q,i)=><div key={i}>
     <strong>Q{i+1}. {q.q}</strong><div className="bml-live-response-options">{q.choices.map((v,j)=><button type="button" key={j} disabled={posted||busy}
      className={quiz[i]===j?'is-chosen':''} onClick={()=>setQuiz(prev=>({...prev,[i]:j}))}>{String.fromCharCode(65+j)}. {v}</button>)}</div>
    </div>)}</div>:null}
    {['peer','exit'].includes(stage.kind)?<div className="bml-live-response-form">
     {stage.kind==='peer'?<button type="button" className="bml-outline" onClick={visitPeer}><Eye size={17}/>{t(language,'Tham quan triển lãm nhóm khác (riêng tư)','Visit another group (private)')}</button>:null}
     <label className="bml-full-field">{t(language,'Trả lời bằng tiếng Anh','Write your response in English')}<textarea rows={3}
      maxLength={800} disabled={posted} placeholder={stage.sentence} value={written} onChange={e=>setWritten(e.target.value)}/></label>
    </div>:null}
    {canRespond?<div className="bml-live-actions">
     <button type="button" className="bml-primary" disabled={busy||posted||(stage.kind==='vote'&&selected===null)||
      (stage.kind==='quiz'&&stage.questions.some((_,i)=>!Number.isInteger(quiz[i])))||
      (['peer','exit'].includes(stage.kind)&&written.trim().length<10)} onClick={submit}>
      {posted?<CheckCircle2 size={18}/>:<Send size={17}/>}
      {posted?t(language,'Đã ghi nhận một lượt của nhóm','One group response recorded'):t(language,'Gửi câu trả lời của nhóm','Submit group response')}</button>
     <button type="button" className="bml-outline" onClick={help}><HelpCircle size={17}/>{t(language,'Nhờ giáo viên hỗ trợ','Need help')}</button>
    </div>:null}
    {['group','recap','artwork','present'].includes(stage.kind)?<p className="bml-live-student-status">
      {t(language,'Hãy thực hiện nhiệm vụ bên dưới theo hướng dẫn của giáo viên.','Continue with your group work below as instructed by your teacher.')}</p>:null}
    {survey&&stageIndex>=3?<div className="bml-live-survey"><strong>{t(language,'KẾT QUẢ KHẢO SÁT LỚP','REAL CLASS SURVEY')} · N={survey.n} {t(language,'thiết bị nhóm','group devices')}</strong>
      {survey.options?.map((o,i)=><p key={i}>{o.label}: {o.count}/{survey.n} ({o.percent}%)</p>)}</div>:null}
   </>}
   {error?<div role="alert" className="bml-banner bml-danger-banner">{error}</div>:null}
 </section>;
}
