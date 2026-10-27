import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Award,BookOpen,Check,ChevronDown,History,RotateCcw,Shield,
  Sparkles,Target,Trophy,X,Zap} from 'lucide-react';
import {POWERUP_CARDS,powerupColor,powerupEligible,sanitizePowerups,drawPowerup,decidePowerup,getPowerup} from './powerupCatalog.mjs';
import {wheelSegments,wheelTargetForSegment} from './wheelStudioCore.mjs';
import './PowerUpWheel.css';

const WORDS={
 vi:{title:'POWER-UP ARENA',subtitle:'50 thẻ thưởng · phạt nhẹ · thử thách học tập',
  all:'Tất cả',reward:'Thưởng',challenge:'Phạt / Thử thách',
  spin:'QUAY POWER-UP',spinning:'Đang quay…',stop:'Dừng sớm',available:'Thẻ có thể quay',
  library:'Kho Power-Up',results:'Lịch sử',team:'Đội nhận thẻ',teamHelp:'Nhập tên đội (không bắt buộc)',
  noRepeat:'Không lặp lại thẻ đã dùng',reset:'Làm mới lượt quay',selectAll:'Chọn tất cả',clearSelection:'Bỏ chọn',
  approved:'Áp dụng',skipped:'Bỏ qua',pending:'GIÁO VIÊN DUYỆT KẾT QUẢ',
  rewardTitle:'THƯỞNG MAY MẮN',challengeTitle:'THỬ THÁCH BẤT NGỜ',
  empty:'Không còn thẻ phù hợp. Bật lại thẻ hoặc làm mới lượt quay.',
  noHistory:'Chưa có thẻ nào được áp dụng.',applied:'Đã áp dụng',notApplied:'Bỏ qua',
  filter:'Bộ lọc',note:'Chỉ sử dụng trong trò chơi, không tự động thay đổi điểm học tập.',
  status:'Cần giáo viên xác nhận để kết quả có hiệu lực.',spinTip:'Quay ngẫu nhiên trong những thẻ đã bật',
  noTeam:'Chưa chỉ định đội',clearLog:'Xóa lịch sử',help:'Giáo viên điều chỉnh cho phù hợp trình độ lớp.',
  selected:'Đã bật',done:'Đã sử dụng',details:'Cách áp dụng',historyHint:'Có thể hoàn tác thao tác gần nhất',
  undo:'Hoàn tác cuối',fair:'Xác suất ngang nhau giữa các thẻ đang mở'},
 en:{title:'POWER-UP ARENA',subtitle:'50 reward, light penalty and learning challenge cards',
  all:'All',reward:'Rewards',challenge:'Penalties / Challenges',
  spin:'SPIN POWER-UP',spinning:'Spinning…',stop:'Stop early',available:'Eligible cards',
  library:'Power-Up Library',results:'History',team:'Receiving team',teamHelp:'Team name (optional)',
  noRepeat:'Avoid previously used cards',reset:'Reset draw cycle',selectAll:'Select all',clearSelection:'Deselect',
  approved:'Apply',skipped:'Skip',pending:'TEACHER APPROVAL REQUIRED',
  rewardTitle:'LUCKY REWARD',challengeTitle:'SURPRISE CHALLENGE',
  empty:'No eligible cards. Re-enable cards or reset the draw cycle.',
  noHistory:'No cards have been applied yet.',applied:'Applied',notApplied:'Skipped',
  filter:'Filter',note:'Game effects only. Never automatically change academic grades.',
  status:'Teacher approval is required before a card takes effect.',
  spinTip:'Random draw from your enabled cards',noTeam:'No team selected',clearLog:'Clear history',
  help:'Adapt each task to your students’ language level.',selected:'Enabled',done:'Used',
  details:'How to apply',historyHint:'You can undo the latest decision',
  undo:'Undo last',fair:'Equal chance for each eligible card'}
};
const formatTime=(ms,vi)=>ms?new Date(ms).toLocaleTimeString(vi?'vi-VN':'en-US',{hour:'2-digit',minute:'2-digit'}):'';
export default function PowerUpWheel({value,onChange,t,sound,onSound,onCelebrate}){
 const vi=t.spin==='QUAY NGAY',L=WORDS[vi?'vi':'en'];
 const state=sanitizePowerups(value.powerups);
 const [view,setView]=useState('library'),[search,setSearch]=useState(''),[rolling,setRolling]=useState(false);
 const [showBurst,setShowBurst]=useState(0),[preview,setPreview]=useState(null),[liveMessage,setLiveMessage]=useState('');
 const wheelRef=useRef(null),raf=useRef(null),clock=useRef(null),running=useRef(null),mounted=useRef(true);
 const cards=powerupEligible(state,state.filter);
 const segments=useMemo(()=>wheelSegments(cards.map((c,i)=>({
  id:c.id,label:c[vi?'vi':'en'],weight:1,enabled:true,color:powerupColor(c,i)
 })), 'aurora'),[cards,vi]);
 const frozen=useRef(null);
 const activeSegs=rolling&&frozen.current?frozen.current:segments;
 const pending=state.pending?getPowerup(state.pending.cardId):null;
 const filtered=POWERUP_CARDS.filter(c=>(state.filter==='all'||c.type===state.filter)&&(
  c.vi.toLocaleLowerCase().includes(search.toLocaleLowerCase())||c.en.toLocaleLowerCase().includes(search.toLocaleLowerCase())
 ));
 const patch=fn=>onChange(prev=>({...prev,powerups:fn(sanitizePowerups(prev.powerups))}));
 useEffect(()=>{mounted.current=true;return ()=>{
  mounted.current=false;if(raf.current!==null)cancelAnimationFrame(raf.current);
  clearInterval(clock.current);running.current=null;
 };},[]);
 useEffect(()=>{
  if(!running.current&&wheelRef.current)wheelRef.current.style.transform='rotate('+state.rotation+'deg)';
 },[state.rotation]);
 const finish=(card,target)=>{
  if(!running.current||!mounted.current)return;
  running.current=null;if(raf.current!==null)cancelAnimationFrame(raf.current);
  raf.current=null;clearInterval(clock.current);clock.current=null;
  const angle=((target%360)+360)%360;
  if(wheelRef.current)wheelRef.current.style.transform='rotate('+angle+'deg)';
  setRolling(false);setPreview(card);setLiveMessage('');
  patch(s=>({...s,rotation:angle,spins:s.spins+1,pending:{cardId:card.id,team:s.team}}));
  onSound?.('win',sound);
  if(!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
   setShowBurst(n=>n+1);
   const rect=wheelRef.current?.getBoundingClientRect();
   onCelebrate?.(rect?{x:(rect.left+rect.width/2)/innerWidth,y:(rect.top+rect.height/2)/innerHeight}:{x:.5,y:.5});
  }
 };
 const spin=()=>{
  if(running.current||pending||cards.length===0)return;
  const card=drawPowerup(cards);
  if(!card)return;
  const sector=segments.find(s=>s.id===card.id);
  const from=state.rotation||0,target=wheelTargetForSegment(from,sector,6);
  frozen.current=segments;
  running.current={from,target,start:performance.now(),duration:4800,last:from,card};
  setRolling(true);setShowBurst(0);setPreview(null);setLiveMessage(L.spinning);
  onSound?.('roll',sound);
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){finish(card,target);return;}
  const paint=now=>{
   const run=running.current;if(!run||!mounted.current)return;
   const progress=Math.max(0,Math.min(1,(now-run.start)/run.duration));
   const easing=1-(1-progress)**3;
   run.last=run.from+(run.target-run.from)*easing;
   if(wheelRef.current)wheelRef.current.style.transform='rotate('+run.last+'deg)';
   if(progress>=1)finish(run.card,run.target);
  };
  const frame=now=>{paint(now);if(running.current)raf.current=requestAnimationFrame(frame);};
  clock.current=setInterval(()=>paint(performance.now()),70);
  raf.current=requestAnimationFrame(frame);
 };
 const stop=()=>{
  const r=running.current;if(!r)return;
  r.from=r.last;r.start=performance.now();r.duration=800;
 };
 const decide=status=>{
  if(!state.pending||rolling)return;
  patch(s=>decidePowerup(s,status));
  setPreview(null);setLiveMessage(status==='applied'?L.applied:L.notApplied);
  frozen.current=null;
 };
 const label=c=>c?.[vi?'vi':'en'];
 const desc=c=>c?.[vi?'descriptionVi':'descriptionEn'];
 const gradient=activeSegs.length?'conic-gradient('+activeSegs.map(s=>s.color+' '+s.start+'deg '+s.end+'deg').join(',')+')':'#bfd8dd';
 return <section className="bit-powerups" data-testid="powerup-wheel">
  <header className="bit-pu-header">
   <div><span><Zap size={16}/> BRIAN CLASSROOM ARCADE</span><h3>{L.title}</h3><p>{L.subtitle}</p></div>
   <div className="bit-pu-totals"><span><strong>50</strong>{L.library}</span><span><strong>{cards.length}</strong>{L.available}</span></div>
  </header>
  <div className="bit-pu-grid">
   <aside className="bit-pu-sidebar">
    <div className="bit-pu-controls">
     <div className="bit-pu-filter" role="group" aria-label={L.filter}>
      {['all','reward','challenge'].map(key=><button type="button" key={key} disabled={rolling||Boolean(pending)}
        aria-pressed={state.filter===key} onClick={()=>patch(s=>({...s,filter:key}))}>{L[key]}</button>)}
     </div>
     <label className="bit-pu-team">{L.team}
      <input value={state.team} maxLength={36} placeholder={L.teamHelp} disabled={rolling}
       onChange={e=>patch(s=>({...s,team:e.target.value,pending:s.pending?{...s.pending,team:e.target.value}:null}))}/></label>
     <label className="bit-pu-switch"><input type="checkbox" checked={state.noRepeat} disabled={rolling||Boolean(pending)}
      onChange={e=>patch(s=>({...s,noRepeat:e.target.checked}))}/>{L.noRepeat}</label>
    </div>
    <div className="bit-pu-tabs" role="tablist" aria-label={L.library}>
     <button type="button" role="tab" aria-selected={view==='library'} className={view==='library'?'selected':''} onClick={()=>setView('library')}><BookOpen size={17}/>{L.library}</button>
     <button type="button" role="tab" aria-selected={view==='history'} className={view==='history'?'selected':''} onClick={()=>setView('history')}><History size={17}/>{L.results}</button>
    </div>
    {view==='library'?<div className="bit-pu-library" role="tabpanel">
     <input type="search" aria-label={L.library} placeholder={L.library+' · '+L.selected}
      value={search} onChange={e=>setSearch(e.target.value)}/>
     <div className="bit-pu-selection">
      <button type="button" disabled={rolling||Boolean(pending)} onClick={()=>patch(s=>({...s,enabledIds:POWERUP_CARDS.map(c=>c.id)}))}>{L.selectAll}</button>
      <button type="button" disabled={rolling||Boolean(pending)} onClick={()=>patch(s=>({...s,enabledIds:[]}))}>{L.clearSelection}</button>
      <button type="button" disabled={rolling||Boolean(pending)} onClick={()=>patch(s=>({...s,usedIds:[]}))}><RotateCcw size={14}/>{L.reset}</button>
     </div>
     <div className="bit-pu-list">
      {filtered.map(c=><label key={c.id} className={'bit-pu-library-card '+c.type}>
       <input type="checkbox" disabled={rolling||Boolean(pending)}
        checked={state.enabledIds.includes(c.id)}
        onChange={e=>patch(s=>({...s,enabledIds:e.target.checked?[...s.enabledIds,c.id]:s.enabledIds.filter(id=>id!==c.id)}))}/>
       <span className="bit-pu-kind">{c.type==='reward'?'🎁':'⚡'}</span>
       <span className="bit-pu-card-text"><strong>{label(c)}</strong><small>{desc(c)}</small></span>
       {state.noRepeat&&state.usedIds.includes(c.id)&&<span className="bit-pu-used">{L.done}</span>}
      </label>)}
     </div>
    </div>:<div className="bit-pu-history" role="tabpanel">
     {state.history.length?state.history.map((r,i)=>{
      const card=getPowerup(r.cardId);return <div key={i}><span>{card?.type==='reward'?'🎁':'⚡'}</span>
       <strong>{label(card)}</strong><small>{r.team||L.noTeam} · {formatTime(r.time,vi)}</small>
       <em>{r.status==='applied'?L.applied:L.notApplied}</em></div>;
     }):<p>{L.noHistory}</p>}
     {state.history.length>0&&<div className="bit-pu-selection">
      <button type="button" disabled={rolling||Boolean(pending)} onClick={()=>patch(s=>({...s,history:s.history.slice(1),usedIds:s.noRepeat?s.usedIds.filter(id=>id!==s.history[0]?.cardId):s.usedIds}))}>{L.undo}</button>
      <button type="button" disabled={rolling||Boolean(pending)} onClick={()=>{
       if(window.confirm(L.clearLog+'?'))patch(s=>({...s,history:[],usedIds:[]}));
      }}><X size={14}/>{L.clearLog}</button>
     </div>}
    </div>}
    <p className="bit-pu-safety"><Shield size={17}/>{L.note}</p>
   </aside>
   <div className="bit-pu-stage">
    <div className="bit-pu-stage-top"><span><Sparkles size={14}/> POWER-UP WHEEL</span><span>{L.fair}</span></div>
    <div className="bit-pu-wheel-holder">
     <div className="bit-pu-pointer" aria-hidden="true">▼</div>
     <div ref={wheelRef} className="bit-pu-disc" data-testid="powerup-disc" style={{background:gradient}}>
      {activeSegs.length<=18&&activeSegs.map(seg=><span className="bit-pu-sector-name" key={seg.id}
       style={{transform:'translate(-50%,-50%) rotate('+seg.center+'deg) translateY(-132px) rotate(-'+seg.center+'deg)'}}>{seg.label}</span>)}
      <span className="bit-pu-hub" aria-hidden="true"><Zap size={33}/></span>
     </div>
     {showBurst>0&&<div className="bit-pu-burst" key={showBurst} aria-hidden="true">
      {Array.from({length:24},(_,i)=><span key={i} style={{'--pu-angle':i*15+'deg','--pu-color':i%2?'#f8c66a':'#3bd9b9','--pu-delay':i%4*50+'ms'}}/>)}
     </div>}
    </div>
    <div className="bit-pu-buttons">
     {rolling?<button type="button" className="bit-pu-spin" onClick={stop}><Target size={21}/>{L.stop}</button>:
      <button type="button" className="bit-pu-spin" onClick={spin} disabled={!cards.length||Boolean(pending)}>
       <Zap size={21}/>{L.spin}</button>}
    </div>
    {rolling?<p className="bit-pu-running" role="status">{L.spinning}</p>:
     pending?<div className={'bit-pu-reveal '+pending.type} aria-live="polite" data-testid="powerup-reveal">
      <span className="bit-pu-approval">{L.pending}</span>
      <span className="bit-pu-reveal-icon">{pending.type==='reward'?'🎁':'⚡'}</span>
      <small>{pending.type==='reward'?L.rewardTitle:L.challengeTitle}</small>
      <strong>{label(pending)}</strong>
      <p>{desc(pending)}</p>
      <span className="bit-pu-recipient">{state.pending.team||L.noTeam}</span>
      <div className="bit-pu-decisions">
       <button type="button" className="bit-pu-apply" onClick={()=>decide('applied')}><Check size={17}/>{L.approved}</button>
       <button type="button" onClick={()=>decide('skipped')}><X size={17}/>{L.skipped}</button>
      </div>
     </div>:<p className="bit-pu-hint" role="status">{cards.length===0?L.empty:liveMessage||L.spinTip}</p>}
    <p className="bit-pu-stage-foot">{L.help}</p>
   </div>
  </div>
 </section>;
}
