import React,{useMemo,useState} from 'react';
import {X,RotateCcw,CheckCircle2,ArrowLeft,Eye,EyeOff} from 'lucide-react';
import {gradeBoardActivity,shuffleBoardItems} from './boardActivities.js';
import {LAB_TYPES} from './boardActivityLab.js';
import BoardActivityLabStage from './BoardActivityLabStage.jsx';

function Stage({activity,vi,onClose}){
 const [seed,setSeed]=useState(0),[selected,setSelected]=useState(null),
  [marked,setMarked]=useState({}),[picked,setPicked]=useState([]),
  [feedback,setFeedback]=useState(''),[reveal,setReveal]=useState(false);
 const options=useMemo(()=>shuffleBoardItems(activity.items),[activity,seed]);
 const reset=()=>{setSeed(n=>n+1);setSelected(null);setMarked({});setPicked([]);setFeedback('');setReveal(false);};
 const n=activity.items.length;
 const assign=(value)=>{
  if(!selected)return;
  const chosen=activity.items.find(x=>x.id===selected);
  if(!chosen)return;
  if(chosen.answer===value){
   setMarked(prev=>({...prev,[selected]:value}));
   setSelected(null);setFeedback(vi?'Chính xác!':'Correct!');
  }else setFeedback(vi?'Chưa đúng, thử lại nhé.':'Not quite. Try again.');
 };
 const complete=activity.type==='ordering'?picked.length===n:Object.keys(marked).length===n;
 const result=complete?gradeBoardActivity(activity,activity.type==='ordering'?picked:
  activity.items.map(x=>marked[x.id])):null;
 return <section className="bbd-activity-stage" aria-label={vi?'Hoạt động tương tác':'Interactive activity'}>
   <div className="bbd-activity-stage__head">
    <div><small>BRIAN BOARD · ACTIVITY</small><h2>{activity.title}</h2>
     {activity.prompt&&<p>{activity.prompt}</p>}</div>
    <button type="button" onClick={onClose} aria-label={vi?'Quay lại bảng':'Back to board'}><ArrowLeft size={18}/>{vi?'Quay lại bảng':'Back to board'}</button>
   </div>
   {activity.type==='matching'&&<div className="bbd-activity-stage__columns">
    <section><h3>{vi?'Chọn nội dung':'Choose a prompt'}</h3>
     {activity.items.map((x,i)=><button key={x.id} disabled={marked[x.id]!=null}
      className={'bbd-activity-card'+(selected===x.id?' is-selected':'')+(marked[x.id]!=null?' is-correct':'')}
      onClick={()=>{setSelected(x.id);setFeedback('');}}>
       <span>{i+1}.</span>{x.label}{marked[x.id]!=null&&<CheckCircle2 size={18}/>}
      </button>)}</section>
    <section><h3>{vi?'Chọn phương án tương ứng':'Choose the matching answer'}</h3>
     {options.map((x,i)=><button key={x.id} disabled={Object.values(marked).includes(x.answer)}
      className={'bbd-activity-card'+(Object.values(marked).includes(x.answer)?' is-correct':'')}
      onClick={()=>assign(x.answer)}><span>{String.fromCharCode(65+i)}.</span>{x.answer}</button>)}</section>
   </div>}
   {activity.type==='ordering'&&<div className="bbd-activity-stage__ordering">
    <h3>{vi?'Chạm lần lượt các mảnh để tạo câu đúng':'Tap the pieces in the correct order'}</h3>
    <div className="bbd-activity-stage__tray">
     {picked.map((id,i)=>{const item=activity.items.find(x=>x.id===id);return <button
      key={id} className="bbd-activity-card is-picked"
      onClick={()=>{setPicked(p=>p.filter(x=>x!==id));setFeedback('');}}>
      <span>{i+1}</span>{item?.label}</button>;})}
     {!picked.length&&<span className="bbd-activity-placeholder">{vi?'Câu trả lời sẽ hiện ở đây':'Your sentence appears here'}</span>}
    </div>
    <div className="bbd-activity-stage__tray is-pool">
     {options.filter(x=>!picked.includes(x.id)).map(x=><button key={x.id}
       className="bbd-activity-card" onClick={()=>{setPicked(p=>[...p,x.id]);setFeedback('');}}>{x.label}</button>)}
    </div>
   </div>}
   {activity.type==='sorting'&&<div className="bbd-activity-stage__sorting">
    <section><h3>{vi?'Chọn một mục':'Select an item'}</h3>
     <div className="bbd-activity-stage__tray">{options.map(x=><button key={x.id}
      disabled={marked[x.id]!=null} className={'bbd-activity-card'+(selected===x.id?' is-selected':'')+(marked[x.id]!=null?' is-correct':'')}
      onClick={()=>{setSelected(x.id);setFeedback('');}}>
      {x.label}{marked[x.id]!=null&&<CheckCircle2 size={17}/>}</button>)}</div>
    </section>
    <section><h3>{vi?'Chọn nhóm phù hợp':'Choose its category'}</h3>
     <div className="bbd-activity-stage__tray">{[...new Set(activity.items.map(x=>x.answer))].map(category=>
      <button className="bbd-activity-card is-category" key={category} onClick={()=>assign(category)}>{category}</button>)}</div>
    </section>
   </div>}
   <div className="bbd-activity-stage__status">
    <span>{vi?'Hoàn thành':'Completed'}: <strong>{activity.type==='ordering'?picked.length:Object.keys(marked).length}/{n}</strong></span>
    <span aria-live="polite">{feedback}</span>
    {complete&&result&&<strong role="status">{vi?'Kết quả':'Result'}: {result.correct}/{result.total}
     {result.correct===result.total?' ✓':''}</strong>}
   </div>
   {reveal&&<div className="bbd-activity-stage__answers">
    <strong>{vi?'Đáp án (giáo viên chủ động hiển thị)':'Answers (teacher-revealed)'}</strong>
    {activity.items.map((x,i)=><span key={x.id}>{activity.type==='ordering'?(i+1)+'. '+x.label:x.label+' → '+x.answer}</span>)}
   </div>}
   <footer><button onClick={reset}><RotateCcw size={17}/>{vi?'Làm lại':'Restart'}</button>
    <button onClick={()=>setReveal(v=>!v)}>{reveal?<EyeOff size={17}/>:<Eye size={17}/>}
      {reveal?(vi?'Ẩn đáp án':'Hide answers'):(vi?'Hiện đáp án':'Reveal answers')}</button></footer>
 </section>;
}
export default function BoardActivityStage(props){
 if(LAB_TYPES.includes(props.activity?.type))return <BoardActivityLabStage key={props.activity.id} {...props}/>;
 return <Stage key={props.activity.id} {...props}/>;
}
