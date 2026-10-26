import React,{useState} from 'react';
import {Activity,BarChart3,Cloud,StickyNote,Play,Pause,Square,Check,X,
 RotateCcw,ShieldCheck,UserRoundX} from 'lucide-react';
import {LIVE_LIMITS,LIVE_MODES,advanceLiveSession,editLiveQuestion,recordTeacherVote,
 queueTeacherContribution,moderateContribution,clearLiveEntries,publicLiveSnapshot,
 aggregateCloud,isLiveActive} from './boardClassroomLive.js';
import './BoardClassroomLive.css';
const titles={poll:['Live Poll','Bình chọn trực tiếp'],cloud:['Word Cloud','Đám mây từ'],
 wall:['Sticky Wall','Bảng ghi chú']};
const icons={poll:BarChart3,cloud:Cloud,wall:StickyNote};
export function BoardClassroomLivePublic({snapshot,vi=true}){
 if(!snapshot)return null;
 const total=(snapshot.votes||[]).reduce((a,b)=>a+b,0);
 return <section className="bbd-live-public" aria-label={vi?'Hoạt động lớp học':'Classroom live activity'}>
  <div className="bbd-live-public__head"><span className="bbd-live-public__tag">BRIAN LIVE</span>
   <span>{snapshot.status==='live'?(vi?'ĐANG DIỄN RA':'LIVE'):snapshot.status==='paused'?(vi?'TẠM DỪNG':'PAUSED'):(vi?'ĐÃ KẾT THÚC':'ENDED')}</span></div>
  <h2>{snapshot.title}</h2>
  {snapshot.question&&<p className="bbd-live-public__question">{snapshot.question}</p>}
  {snapshot.kind==='poll'&&<div className="bbd-live-public__poll">
   {(snapshot.options||[]).map((option,i)=>{
    const votes=snapshot.votes?.[i]||0,percentage=total?Math.round(votes/total*100):0;
    return <div key={i} className="bbd-live-public__vote">
     <strong>{String.fromCharCode(65+i)}. {option}</strong>
     {snapshot.votes&&<><span>{percentage}% · {votes}</span>
      <div className="bbd-live-public__bar"><div style={{width:percentage+'%'}}/></div></>}
    </div>;
   })}
   <small>{snapshot.votes?(vi?'Tổng lượt bình chọn: ':'Total votes: ')+total:
    (vi?'Kết quả đang được ẩn':'Results are hidden')}</small>
  </div>}
  {snapshot.kind==='cloud'&&<div className="bbd-live-public__cloud">
   {aggregateCloud(snapshot.entries).map((item,i)=><span key={item.text}
    style={{fontSize:Math.min(45,18+item.count*5)+'px',fontWeight:700,
     opacity:.78+(i%4)*.07}}>{item.text}</span>)}
   {!snapshot.entries?.length&&<em>{vi?'Chưa có từ được duyệt':'No approved words yet'}</em>}
  </div>}
  {snapshot.kind==='wall'&&<div className="bbd-live-public__wall">
   {(snapshot.entries||[]).map((s,i)=><div key={i} className={'bbd-live-public__sticky tone-'+(i%4)}>{s}</div>)}
   {!snapshot.entries?.length&&<em>{vi?'Chưa có ghi chú được duyệt':'No approved notes yet'}</em>}
  </div>}
  <small className="bbd-live-public__foot">{vi?'Nội dung chỉ hiển thị sau khi giáo viên duyệt.':
   'Only teacher-approved content is visible.'}</small>
 </section>;
}
export default function BoardClassroomLive({session,onChange,vi=true,onCreate,onClose}){
 const [question,setQuestion]=useState(''),[choices,setChoices]=useState('A\nB\nC\nD');
 const [entry,setEntry]=useState(''),[showPublic,setShowPublic]=useState(false);
 const snap=publicLiveSnapshot(session);
 const editing=session?.status==='draft';
 const active=isLiveActive(session);
 const change=(fn)=>onChange?.(fn);
 return <div className="bbd-live-control">
  <div className="bbd-side-heading"><h3><Activity size={19}/> {vi?'Classroom Live Studio':'Classroom Live Studio'}</h3></div>
  <p>{vi?'Phiên tương tác được giáo viên điều khiển. Hiện chỉ nhận thao tác trên thiết bị giáo viên, chưa cho học sinh gửi từ điện thoại khác.':
   'Teacher-operated classroom interaction. Student submissions from other devices are not enabled.'}</p>
  <div className="bbd-live-modes" role="group" aria-label={vi?'Chọn hoạt động lớp học':'Choose live activity'}>
   {LIVE_MODES.map(mode=>{
    const Icon=icons[mode];return <button key={mode} type="button"
     className={session?.mode===mode?'active':''} onClick={()=>{onCreate(mode);setQuestion('');setEntry('');}}
     aria-pressed={session?.mode===mode}><Icon size={19}/><span>{titles[mode][vi?1:0]}</span></button>;
   })}
  </div>
  {session&&<>
   <div className="bbd-live-status">
    <div><strong>{titles[session.mode][vi?1:0]}</strong>
     <small>{session.status==='draft'?(vi?'Bản nháp':'Draft'):session.status==='live'?(vi?'Đang chạy':'Live'):session.status==='paused'?(vi?'Tạm dừng':'Paused'):(vi?'Đã đóng':'Closed')}</small></div>
    <small>{vi?'Giới hạn phiên: 45 phút':'Session limit: 45 minutes'}</small>
   </div>
   {editing&&<>
    <label>{vi?'Câu hỏi / Chủ đề':'Question / topic'}
     <input value={question} maxLength={220} onChange={e=>setQuestion(e.target.value)}
      placeholder={vi?'Nhập chủ đề hoạt động':'Enter an activity topic'}/></label>
    {session.mode==='poll'&&<label>{vi?'Các phương án (mỗi dòng một đáp án, 2–6 phương án)':'Options (one per line, 2–6)'}
     <textarea value={choices} rows={5} onChange={e=>setChoices(e.target.value)}/></label>}
    <button type="button" onClick={()=>change(editLiveQuestion(session,question,
     choices.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,6)))}>
     <Check size={16}/>{vi?'Lưu câu hỏi':'Save activity question'}</button>
   </>}
   {session.status==='live'||session.status==='paused'||session.status==='draft'?
    <div className="bbd-live-controls">
     {session.status==='draft'?<button onClick={()=>change(advanceLiveSession(session,'start'))}>
      <Play size={17}/>{vi?'Bắt đầu':'Start'}</button>:
      <button onClick={()=>change(advanceLiveSession(session,active?'pause':'resume'))}
       disabled={session.status==='paused'&&Date.now()>=session.expiresAt}>
       {active?<Pause size={16}/>:<Play size={16}/>}
       {active?(vi?'Tạm dừng':'Pause'):(vi?'Tiếp tục':'Resume')}</button>}
     <button onClick={()=>change(advanceLiveSession(session,'close'))}>
      <Square size={16}/>{vi?'Kết thúc':'End session'}</button>
    </div>:null}
   {session.mode==='poll'&&session.status!=='draft'&&<div className="bbd-live-poll-buttons">
    {(session.options||[]).map((o,i)=><div key={i}>
     <strong>{String.fromCharCode(65+i)}. {o}</strong><span>{session.votes?.[i]||0}</span>
     <button type="button" disabled={!active} onClick={()=>change(recordTeacherVote(session,i,1))}>+1</button>
     <button type="button" disabled={!active} onClick={()=>change(recordTeacherVote(session,i,-1))}>−1</button>
    </div>)}
    <label><input type="checkbox" checked={session.showResults===true}
     onChange={e=>change({...session,showResults:e.target.checked,version:session.version+1})}/>
     {vi?'Hiện kết quả trên TV':'Show results on TV'}</label>
   </div>}
   {['cloud','wall'].includes(session.mode)&&session.status!=='draft'&&<>
    <label>{vi?'Nhập ý kiến để duyệt (không nhận trực tiếp từ thiết bị học sinh)':
     'Draft a contribution for moderation (no remote student input)'}
     <textarea rows={2} maxLength={LIVE_LIMITS.text} value={entry}
      onChange={e=>setEntry(e.target.value)} placeholder={vi?'Nhập từ hoặc ghi chú':'Word or sticky note'}/></label>
    <button type="button" disabled={!active||!entry.trim()||session.queue.length>=LIVE_LIMITS.queue}
     onClick={()=>{change(queueTeacherContribution(session,entry));setEntry('');}}>
     <StickyNote size={16}/>{vi?'Đưa vào danh sách chờ duyệt':'Queue for moderation'}</button>
    <h4>{vi?'Chờ duyệt':'Moderation queue'} ({session.queue.length})</h4>
    <div className="bbd-live-queue">
     {session.queue.map(item=><div key={item.id}><span>{item.text}</span>
      <button type="button" onClick={()=>change(moderateContribution(session,item.id,true))}
       aria-label={vi?'Duyệt':'Approve'}><Check size={17}/></button>
      <button type="button" onClick={()=>change(moderateContribution(session,item.id,false))}
       aria-label={vi?'Từ chối':'Reject'}><X size={17}/></button></div>)}
    </div>
   </>}
   <div className="bbd-live-controls">
    <button type="button" onClick={()=>setShowPublic(v=>!v)}>
     {showPublic?(vi?'Ẩn xem thử':'Hide preview'):(vi?'Xem như học sinh':'Student view')}</button>
    <button type="button" disabled={session.status==='closed'} onClick={()=>{
     if(window.confirm(vi?'Xóa lượt bình chọn và nội dung đã duyệt?':'Clear votes and approved content?'))
      change(clearLiveEntries(session));
    }}><RotateCcw size={16}/>{vi?'Xóa kết quả':'Reset results'}</button>
   </div>
   {showPublic&&<BoardClassroomLivePublic snapshot={snap} vi={vi}/>}
   <small className="bbd-live-safety"><ShieldCheck size={15}/>
    {vi?'Không có kết nối học sinh từ xa hoặc nhận dữ liệu không xác thực. Phiên này chỉ lưu trong bộ nhớ máy giáo viên.':
    'No unauthenticated remote submissions. This session stays in teacher device memory.'}</small>
  </>}
 </div>;
}
