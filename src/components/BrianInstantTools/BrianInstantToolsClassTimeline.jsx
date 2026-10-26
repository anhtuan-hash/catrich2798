import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Play,Pause,SkipForward,RotateCcw,Plus,Minus,BellRing,CheckCircle2} from 'lucide-react';
import {initialTimeline,sanitizeTimeline,advanceTimeline,timelineMs} from './instantToolsTimelineCore.mjs';
import './BrianInstantToolsClassTimeline.css';

const LABEL={
 vi:{stage:'Giai đoạn',seconds:'Giây',start:'Bắt đầu',pause:'Tạm dừng',resume:'Tiếp tục',next:'Chặng tiếp',reset:'Làm lại',add:'Thêm hoạt động',remove:'Bớt hoạt động',completed:'Đã hoàn thành',mute:'Chế độ tắt tiếng',notice:'Chuông tự động chỉ phát khi trang đang mở và trình duyệt cho phép âm thanh. Không phát khi đóng trang.',phase:'Tiến trình tiết học',edit:'Thiết lập các hoạt động',finish:'Hoàn thành buổi học',unlocked:'Đã sẵn sàng chuông'},
 en:{stage:'Stage',seconds:'Seconds',start:'Start',pause:'Pause',resume:'Resume',next:'Next stage',reset:'Reset',add:'Add activity',remove:'Remove last',completed:'Completed',mute:'Sound muted',notice:'Automatic bells only play while this page is open and browser audio is allowed. No bells after closing the page.',phase:'Class progress',edit:'Set up class activities',finish:'Class finished',unlocked:'Bell ready'}
};
function bell(ctx,volume){
 if(!ctx||ctx.state!=='running'||volume<=0)return;
 try{
  for(const [i,hz] of [784,988,1174].entries()){
   const at=ctx.currentTime+i*.13,osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(hz,at);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume/100*.085,at+.014);
   gain.gain.exponentialRampToValueAtTime(.0001,at+.20);
   osc.connect(gain).connect(ctx.destination);osc.start(at);osc.stop(at+.22);
  }
 }catch{/* Sound is optional; clock still works. */}
}
const pad=n=>String(Math.max(0,Math.floor(n))).padStart(2,'0');
export default function ClassBellTimeline({value,onChange,language='vi',sound=true}){
 const t=LABEL[language]||LABEL.vi;
 const timeline=sanitizeTimeline(value||initialTimeline());
 const [now,setNow]=useState(Date.now());
 const [alert,setAlert]=useState(false);
 const ctx=useRef(null),active=useRef(true),transitionRef=useRef(null),alertTimer=useRef(null);
 const getAudio=async()=>{
  if(!sound)return;
  try{
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
   if(!ctx.current||ctx.current.state==='closed')ctx.current=new AC();
   await ctx.current.resume();
  }catch{/* Not all devices allow autoplay; continue silently. */}
 };
 useEffect(()=>{
  active.current=true;
  return ()=>{active.current=false;clearTimeout(alertTimer.current);ctx.current?.close?.().catch(()=>{});ctx.current=null;};
 },[]);
 useEffect(()=>{
  if(!timeline.running)return;
  const id=window.setInterval(()=>setNow(Date.now()),150);
  return ()=>window.clearInterval(id);
 },[timeline.running]);
 useEffect(()=>{
  if(!timeline.running||document.hidden)return;
  const next=advanceTimeline(timeline,now);
  if(!next.changes)return;
  const signature=String(timeline.endsAt)+'/'+next.index;
  if(transitionRef.current===signature)return;
  transitionRef.current=signature;
  const {changes,finished,...saved}=next;
  onChange(prev=>({...prev,timeline:saved}));
  bell(ctx.current,sound?value.volume:0);
  setAlert(true);
  clearTimeout(alertTimer.current);
  alertTimer.current=window.setTimeout(()=>{if(active.current)setAlert(false);},1500);
 },[now,timeline.running,timeline.endsAt,timeline.index,sound,value.volume,onChange]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)setAlert(false);else setNow(Date.now());};
  document.addEventListener('visibilitychange',hide);
  return ()=>document.removeEventListener('visibilitychange',hide);
 },[]);
 const commit=fn=>onChange(prev=>({...prev,timeline:fn(sanitizeTimeline(prev.timeline))}));
 const play=async()=>{
  if(timeline.running){
   const next=advanceTimeline(timeline,Date.now());
   const {changes,finished,...saved}=next;
   commit(()=>({...saved,running:false,endsAt:null,remainingMs:timelineMs(saved,Date.now())}));
   return;
  }
  await getAudio();
  const ms=timeline.remainingMs>0?timeline.remainingMs:timeline.segments[timeline.index].seconds*1000;
  commit(x=>({...x,running:true,endsAt:Date.now()+ms,remainingMs:ms}));
  setNow(Date.now());
 };
 const next=()=>{
  const idx=Math.min(timeline.segments.length-1,timeline.index+1),ms=timeline.segments[idx].seconds*1000;
  commit(x=>({...x,index:idx,remainingMs:ms,endsAt:x.running?Date.now()+ms:null}));
  bell(ctx.current,sound?value.volume:0);
  setNow(Date.now());
 };
 const reset=()=>{commit(x=>initialTimeline(x.segments));setAlert(false);};
 const changePhase=(i,patch)=>commit(x=>{
   const seg=x.segments.map((p,j)=>i===j?{...p,...patch}:p);
   return {...x,segments:seg,...(i===x.index?{running:false,endsAt:null,remainingMs:seg[i].seconds*1000}:{})};
 });
 const add=()=>commit(x=>x.segments.length>=10?x:{...x,segments:[...x.segments,{id:'phase-'+(x.segments.length+1),name:language==='vi'?'Hoạt động '+(x.segments.length+1):'Activity '+(x.segments.length+1),seconds:180}]});
 const remove=()=>commit(x=>{
   const seg=x.segments.length>1?x.segments.slice(0,-1):x.segments,idx=Math.min(x.index,seg.length-1);
   return {...x,segments:seg,index:idx,running:false,endsAt:null,remainingMs:seg[idx].seconds*1000};
 });
 const remaining=timelineMs(timeline,now),current=timeline.segments[timeline.index],pct=Math.min(100,Math.max(0,100-remaining/(current.seconds*1000)*100));
 const finished=remaining===0&&!timeline.running&&timeline.index===timeline.segments.length-1;
 return <div className="bit-timeline" data-tool="class-bell-timeline" data-state={finished?'completed':timeline.running?'running':'paused'}>
  <section className={'bit-timeline-display'+(alert?' is-ringing':'')}>
   <span className="bit-timeline-eyebrow"><BellRing size={20}/>{t.phase} · {t.stage} {timeline.index+1}/{timeline.segments.length}</span>
   <strong className="bit-timeline-name">{current.name}</strong>
   <div className="bit-timeline-clock" aria-label={t.phase}>{pad(Math.ceil(remaining/1000)/60)}:{pad(Math.ceil(remaining/1000)%60)}</div>
   <div className="bit-timeline-progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><span style={{width:pct+'%'}}/></div>
   {finished&&<p role="status" className="bit-timeline-done"><CheckCircle2 size={22}/>{t.finish}</p>}
   <div className="bit-timeline-controls">
    <button className="bit-primary" type="button" onClick={play}>{timeline.running?<Pause size={19}/>:<Play size={19}/>} {timeline.running?t.pause:timeline.remainingMs<current.seconds*1000?t.resume:t.start}</button>
    <button className="bit-secondary" type="button" disabled={timeline.index>=timeline.segments.length-1} onClick={next}><SkipForward size={18}/>{t.next}</button>
    <button className="bit-secondary" type="button" onClick={reset}><RotateCcw size={18}/>{t.reset}</button>
   </div>
  </section>
  <section className="bit-timeline-editor">
   <h3>{t.edit}</h3>
   <div className="bit-timeline-phases">{timeline.segments.map((p,i)=><div key={p.id} className={'bit-timeline-phase'+(i===timeline.index?' is-current':'')}>
    <span className="bit-timeline-num">{i+1}</span>
    <input type="text" maxLength={45} aria-label={t.stage+' '+(i+1)} value={p.name} onChange={e=>changePhase(i,{name:e.target.value})}/>
    <label>{t.seconds}<input type="number" min="15" max="3600" step="15" aria-label={t.seconds+' '+(i+1)} value={p.seconds} onChange={e=>changePhase(i,{seconds:Math.min(3600,Math.max(15,Math.round(Number(e.target.value)||15)))})}/></label>
   </div>)}</div>
   <div className="bit-timeline-controls"><button type="button" className="bit-secondary" onClick={add} disabled={timeline.segments.length>=10}><Plus size={17}/>{t.add}</button><button className="bit-secondary" type="button" onClick={remove} disabled={timeline.segments.length<=1}><Minus size={17}/>{t.remove}</button></div>
   <p className="bit-timeline-note">{t.notice}{!sound?' '+t.mute:''}</p>
  </section>
 </div>;
}
