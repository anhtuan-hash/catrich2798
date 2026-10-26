import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Blocks,Dices,Disc3,Trophy,Timer,QrCode,X,ChevronLeft,Maximize2,Minimize2,
  Volume2,VolumeX,Play,Pause,RotateCcw,Undo2,Plus,Minus,Download,Copy,
  Sparkles,Check,ArrowRight,Save,Grid2X2,StickyNote
} from 'lucide-react';
import {
  initialState,sanitizeState,storageKey,secureInt,diceRoll,wheelTarget,PALETTE,
  normalizeWheelNames,clamp,scoreLeaders,timerRemaining,formatClock,makeQrInput,STORE_VERSION
} from './instantToolsCore.mjs';
import './BrianInstantTools.css';
import {Wave2Tool,WAVE2_LIBRARY,SpotlightOverlay} from './BrianInstantToolsWave2.jsx';
import {Wave3Tool,WAVE3_LIBRARY} from './BrianInstantToolsWave3.jsx';
import {Wave4Tool,WAVE4_LIBRARY} from './BrianInstantToolsWave4.jsx';

const LIBRARY=[
  {id:'dice',Icon:Dices,vi:'Xúc xắc 3D',en:'3D Dice',descVi:'Lắc xúc xắc tức thì',descEn:'Roll instantly'},
  {id:'wheel',Icon:Disc3,vi:'Vòng quay may mắn',en:'Lucky Wheel',descVi:'Chọn tên hoặc nhóm',descEn:'Pick names or teams'},
  {id:'scoreboard',Icon:Trophy,vi:'Bảng điểm đội',en:'Scoreboard',descVi:'Cộng điểm và ăn mừng',descEn:'Score and celebrate'},
  {id:'timers',Icon:Timer,vi:'Đồng hồ nhiều đội',en:'Multi-Timer',descVi:'Các bộ đếm độc lập',descEn:'Independent clocks'},
  {id:'qr',Icon:QrCode,vi:'Tạo mã QR',en:'QR Maker',descVi:'Tạo và lưu QR ngay',descEn:'Instant QR and download'},
  ...WAVE2_LIBRARY,
  ...WAVE3_LIBRARY,
  ...WAVE4_LIBRARY,
];
const MSG={
  vi:{launcher:'Mở bộ công cụ tức thì',eyebrow:'INSTANT CLASSROOM KIT',title:'Brian Instant Tools',subtitle:'20 công cụ sẵn sàng sử dụng',home:'Bộ công cụ',minimize:'Thu nhỏ về bong bóng',expand:'Phóng to',restore:'Thu nhỏ cửa sổ',
    save:'Tự lưu trên thiết bị',saveFailed:'Không thể lưu phiên trên trình duyệt này',roll:'Tung xúc xắc',diceCount:'Số xúc xắc',sum:'Tổng điểm',history:'Lần tung gần đây',sound:'Bật/tắt âm thanh',spin:'QUAY NGAY',spinning:'Đang quay…',winner:'Kết quả',apply:'Áp dụng tên',options:'Tên đội / học sinh (mỗi dòng một tên)',badOptions:'Cần 2–16 tên khác nhau.',undo:'Hoàn tác',reset:'Đặt lại',resetAsk:'Bạn có chắc muốn đặt lại điểm số?',team:'Đội',addTeam:'Thêm đội',removeTeam:'Bớt đội',celebrate:'Ăn mừng',leaders:'Đang dẫn đầu',duration:'Thời lượng',allPause:'Dừng tất cả',allReset:'Đặt lại tất cả',start:'Bắt đầu',pause:'Tạm dừng',resume:'Tiếp tục',minutes:'phút',done:'Hết giờ!',timerResetAsk:'Đặt lại toàn bộ đồng hồ?',qrLabel:'Liên kết hoặc văn bản',qrGenerate:'Tạo mã QR',qrPreview:'Mã QR đã tạo',qrEmpty:'Vui lòng nhập nội dung.',qrLong:'Tối đa 900 ký tự.',qrInvalid:'Đường dẫn không hợp lệ hoặc chứa giao thức không an toàn.',qrDownload:'Tải PNG',qrCopy:'Sao chép nội dung',qrError:'Không tạo được QR. Hãy thử nội dung ngắn hơn.',qrHint:'Tạo mã QR ngay trên thiết bị. Không gửi dữ liệu ra bên ngoài.',copyFailed:'Không thể sao chép trên trình duyệt này.',close:'Đóng',back:'Trở về bộ công cụ',tools:'Công cụ',label:'Tên',clear:'Xóa kết quả',continue:'Mở công cụ',savedLocal:'Tự lưu trên trình duyệt, không đồng bộ giữa thiết bị'},
  en:{launcher:'Open instant classroom tools',eyebrow:'INSTANT CLASSROOM KIT',title:'Brian Instant Tools',subtitle:'20 ready-to-use tools',home:'Tool library',minimize:'Minimize to bubble',expand:'Expand',restore:'Restore window',
    save:'Saved on this device',saveFailed:'This browser cannot save the session',roll:'Roll dice',diceCount:'Number of dice',sum:'Total',history:'Recent rolls',sound:'Toggle sounds',spin:'SPIN NOW',spinning:'Spinning…',winner:'Winner',apply:'Apply names',options:'Names or teams (one per line)',badOptions:'Enter 2–16 different names.',undo:'Undo',reset:'Reset',resetAsk:'Reset all team scores?',team:'Team',addTeam:'Add team',removeTeam:'Remove team',celebrate:'Celebrate',leaders:'Leading',duration:'Duration',allPause:'Pause all',allReset:'Reset all',start:'Start',pause:'Pause',resume:'Resume',minutes:'minutes',done:'Time is up!',timerResetAsk:'Reset all timers?',qrLabel:'Link or text',qrGenerate:'Generate QR',qrPreview:'Generated QR',qrEmpty:'Enter some content.',qrLong:'Maximum 900 characters.',qrInvalid:'Invalid link or unsafe protocol.',qrDownload:'Download PNG',qrCopy:'Copy content',qrError:'Unable to generate QR. Try shorter content.',qrHint:'QR is generated on your device. Nothing is sent online.',copyFailed:'Could not copy on this browser.',close:'Close',back:'Back to tool library',tools:'Tools',label:'Name',clear:'Clear winner',continue:'Open tool',savedLocal:'Auto-saved in this browser; not synced across devices'},
};
const DICE_FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
let audioContext=null;
function beep(type,enabled){
  if(!enabled||typeof window==='undefined')return;
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    if(!audioContext)audioContext=new Ctx();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const notes=type==='win'?[523,659,784]:type==='end'?[392,294,196]:type==='roll'?[200,270,370]:[440];
    notes.forEach((hz,i)=>{
      const osc=audioContext.createOscillator(),gain=audioContext.createGain();
      const t=audioContext.currentTime+i*.095;
      osc.type=type==='end'?'sawtooth':'sine';
      osc.frequency.setValueAtTime(hz,t);
      gain.gain.setValueAtTime(.0001,t);
      gain.gain.exponentialRampToValueAtTime(type==='end'?.075:.045,t+.013);
      gain.gain.exponentialRampToValueAtTime(.0001,t+.115);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(t);osc.stop(t+.125);
    });
  }catch{/* Audio is optional and requires a browser gesture. */}
}
function celebrate(){
  if(typeof window==='undefined'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  try{confetti({particleCount:85,spread:62,origin:{y:.64},disableForReducedMotion:true,colors:PALETTE});}catch{/* visual decoration only */}
}
function load(user){
  const key=storageKey(user);
  if(!key||typeof window==='undefined')return initialState();
  try{return sanitizeState(JSON.parse(window.localStorage.getItem(key)||'null'));}catch{return initialState();}
}
const edit=(set,section,fn)=>set(prev=>({...prev,[section]:fn(prev[section])}));
function DiceTool({value,onChange,t,sound}){
  const [rolling,setRolling]=useState(false);
  const timeout=useRef(null);
  useEffect(()=>()=>clearTimeout(timeout.current),[]);
  const roll=()=>{
    if(rolling)return;
    const values=diceRoll(value.count);
    setRolling(true);
    beep('roll',sound);
    onChange(d=>({...d,values,history:[values,...d.history].slice(0,8)}));
    timeout.current=setTimeout(()=>{setRolling(false);beep('tap',sound);},750);
  };
  return <div className="bit-two-cols">
    <div className="bit-panel">
      <label className="bit-field-label" htmlFor="bit-dice-count">{t.diceCount}</label>
      <div className="bit-stepper">
        <button type="button" onClick={()=>onChange(d=>({...d,count:Math.max(1,d.count-1)}))} aria-label="-"><Minus size={18}/></button>
        <strong>{value.count}</strong>
        <button type="button" onClick={()=>onChange(d=>({...d,count:Math.min(6,d.count+1)}))} aria-label="+"><Plus size={18}/></button>
      </div>
      <button type="button" className="bit-primary" disabled={rolling} onClick={roll}><Dices size={21}/>{t.roll}</button>
      <div className="bit-stat"><span>{t.sum}</span><strong>{value.values.reduce((a,b)=>a+b,0)}</strong></div>
      <div className="bit-muted">{t.history}</div>
      <div className="bit-roll-history">{value.history.map((a,i)=><span key={i}>{a.reduce((x,y)=>x+y,0)}</span>)}</div>
    </div>
    <div className="bit-preview bit-dice-zone">
      <div className="bit-dice-grid">{value.values.slice(0,value.count).map((n,i)=>{
        const orientations=['rotateX(0deg) rotateY(0deg)','rotateY(-90deg)','rotateY(180deg)','rotateY(90deg)','rotateX(-90deg)','rotateX(90deg)'];
        return <span className={'bit-die'+(rolling?' is-rolling':'')} key={i} style={{'--die-index':i}} role="img" aria-label={String(n)}>
          <span className="bit-cube" style={{transform:orientations[n-1]}}>
            {DICE_FACES.map((face,side)=><span className={'bit-cube-face bit-cube-face-'+(side+1)} key={side} aria-hidden="true">{face}</span>)}
          </span>
        </span>;
      })}</div>
    </div>
  </div>;
}
function WheelTool({value,onChange,t,sound}){
  const [draft,setDraft]=useState(value.names.join('\n'));
  const [error,setError]=useState('');
  const [spinning,setSpinning]=useState(false);
  const timeout=useRef(null);
  useEffect(()=>()=>clearTimeout(timeout.current),[]);
  const apply=()=>{
    const names=normalizeWheelNames(draft);
    if(!names){setError(t.badOptions);return;}
    onChange(w=>({...w,names,rotation:0,winner:null}));setError('');beep('tap',sound);
  };
  const spin=()=>{
    if(spinning||value.names.length<2)return;
    const idx=secureInt(0,value.names.length-1);
    const rotation=wheelTarget(value.rotation,idx,value.names.length);
    setSpinning(true);
    onChange(w=>({...w,rotation,winner:null}));
    beep('roll',sound);
    timeout.current=setTimeout(()=>{
      setSpinning(false);
      onChange(w=>({...w,winner:w.names[idx]??null}));
      beep('win',sound);celebrate();
    },4600);
  };
  const colors=value.names.map((_,i)=>{
    const start=i*360/value.names.length,end=(i+1)*360/value.names.length;
    return PALETTE[i%PALETTE.length]+' '+start+'deg '+end+'deg';
  }).join(', ');
  return <div className="bit-two-cols">
    <div className="bit-panel">
      <label className="bit-field-label" htmlFor="bit-wheel-list">{t.options}</label>
      <textarea id="bit-wheel-list" rows="7" value={draft} maxLength={650} onChange={e=>setDraft(e.target.value)} disabled={spinning}/>
      {error&&<p role="alert" className="bit-error">{error}</p>}
      <button className="bit-secondary" type="button" onClick={apply} disabled={spinning}><Check size={17}/>{t.apply}</button>
      <button type="button" className="bit-primary" onClick={spin} disabled={spinning}>{spinning?t.spinning:t.spin}</button>
      {value.winner&&<div className="bit-winner" aria-live="polite"><Trophy size={26}/><small>{t.winner}</small><strong>{value.winner}</strong></div>}
    </div>
    <div className="bit-preview bit-wheel-zone">
      <div className="bit-pointer" aria-hidden="true">▼</div>
      <div className="bit-wheel" style={{background:'conic-gradient('+colors+')',transform:'rotate('+value.rotation+'deg)',transition:spinning?'transform 4.6s cubic-bezier(.12,.79,.09,1)':'none'}}>
        {value.names.map((name,i)=>{
          const a=(i+.5)*360/value.names.length;
          return <span key={i} className="bit-wheel-label" style={{transform:'rotate('+a+'deg) translateY(calc(-1 * var(--bit-wheel-label-radius))) rotate(90deg)'}} title={name}>{name}</span>;
        })}
        <span className="bit-wheel-hub" aria-hidden="true"><Sparkles size={24}/></span>
      </div>
    </div>
  </div>;
}
function ScoreboardTool({value,onChange,t,sound}){
  const teams=value.teams,leaders=scoreLeaders(teams);
  const changeScore=(id,delta)=>{
    const next=teams.map(team=>team.id===id?{...team,score:Math.round(clamp(team.score+delta,-999,9999))}:team);
    const fresh=scoreLeaders(next);
    onChange(v=>({...v,teams:next,undo:[v.teams,...v.undo].slice(0,30)}));
    beep(delta>0?'tap':'roll',sound);
    if(delta>0&&fresh.length===1&&(!leaders.includes(fresh[0])||leaders.length>1)){beep('win',sound);celebrate();}
  };
  const changeCount=(amount)=>{
    const n=Math.round(clamp(teams.length+amount,2,8));
    if(n===teams.length)return;
    const next=Array.from({length:n},(_,i)=>teams[i]||{id:'team-'+(i+1),name:'Team '+(i+1),score:0});
    onChange(v=>({...v,teams:next,undo:[v.teams,...v.undo].slice(0,30)}));
  };
  return <div className="bit-scoreboard">
    <div className="bit-actions"><button type="button" className="bit-secondary" onClick={()=>changeCount(1)} disabled={teams.length===8}><Plus size={17}/>{t.addTeam}</button>
      <button type="button" className="bit-secondary" onClick={()=>changeCount(-1)} disabled={teams.length===2}><Minus size={17}/>{t.removeTeam}</button>
      <button type="button" className="bit-secondary" disabled={!value.undo.length} onClick={()=>onChange(v=>v.undo.length&&Array.isArray(v.undo[0])?({...v,teams:v.undo[0],undo:v.undo.slice(1)}):v)}><Undo2 size={17}/>{t.undo}</button>
      <button type="button" className="bit-secondary" onClick={()=>{if(window.confirm(t.resetAsk))onChange(v=>({...v,teams:v.teams.map(x=>({...x,score:0})),undo:[v.teams,...v.undo].slice(0,30)}));}}><RotateCcw size={17}/>{t.reset}</button>
      <button type="button" className="bit-secondary" onClick={()=>{beep('win',sound);celebrate();}}><Sparkles size={17}/>{t.celebrate}</button>
    </div>
    <div className="bit-team-grid">{teams.map((team,i)=><div key={team.id} className={'bit-team'+(leaders.includes(team.id)?' is-leading':'')} style={{'--team-color':PALETTE[i%PALETTE.length]}}>
      <div className="bit-team-top">{leaders.includes(team.id)&&<Trophy size={18} aria-label={t.leaders}/>}<input value={team.name} aria-label={t.team+' '+(i+1)} maxLength={32} onChange={e=>onChange(v=>({...v,teams:v.teams.map(x=>x.id===team.id?{...x,name:e.target.value}:x)}))}/></div>
      <strong className="bit-team-score" aria-live="polite">{team.score}</strong>
      <div className="bit-team-actions">{[-1,1,5].map(delta=><button type="button" key={delta} onClick={()=>changeScore(team.id,delta)}>{delta>0?'+':''}{delta}</button>)}</div>
    </div>)}</div>
  </div>;
}
function TimerTool({value,onChange,t,sound,now}){
  const items=value.items;
  const setItem=(id,func)=>onChange(v=>({...v,items:v.items.map(x=>x.id===id?func(x):x)}));
  const pause=item=>setItem(item.id,x=>({...x,remainingMs:timerRemaining(x,Date.now()),endsAt:null,running:false}));
  const run=item=>{
    const remaining=timerRemaining(item,Date.now())||item.durationSeconds*1000;
    setItem(item.id,x=>({...x,remainingMs:remaining,endsAt:Date.now()+remaining,running:true,alerted:false}));
    beep('tap',sound);
  };
  const reset=item=>setItem(item.id,x=>({...x,running:false,endsAt:null,alerted:false,remainingMs:x.durationSeconds*1000}));
  const setDuration=(item,sec)=>setItem(item.id,x=>({...x,durationSeconds:sec,remainingMs:sec*1000,endsAt:null,running:false,alerted:false}));
  return <div className="bit-timers">
    <div className="bit-actions">
      <button type="button" className="bit-secondary" disabled={items.length===8} onClick={()=>onChange(v=>({...v,items:[...v.items,{id:'timer-'+(v.items.length+1),label:'Team '+(v.items.length+1),durationSeconds:180,remainingMs:180000,endsAt:null,running:false,alerted:false}]}))}><Plus size={17}/>{t.addTeam}</button>
      <button type="button" className="bit-secondary" disabled={items.length===1} onClick={()=>onChange(v=>({...v,items:v.items.slice(0,-1)}))}><Minus size={17}/>{t.removeTeam}</button>
      <button type="button" className="bit-secondary" onClick={()=>onChange(v=>({...v,items:v.items.map(x=>({...x,running:false,endsAt:null,remainingMs:timerRemaining(x,Date.now())}))}))}><Pause size={17}/>{t.allPause}</button>
      <button type="button" className="bit-secondary" onClick={()=>{if(window.confirm(t.timerResetAsk))onChange(v=>({...v,items:v.items.map(x=>({...x,running:false,alerted:false,endsAt:null,remainingMs:x.durationSeconds*1000}))}));}}><RotateCcw size={17}/>{t.allReset}</button>
    </div>
    <div className="bit-timer-grid">{items.map((item,i)=>{
      const remaining=timerRemaining(item,now),completed=remaining<=0;
      const status=completed?'is-done':item.running?'is-running':'is-paused';
      return <div className={'bit-timer-card '+status} key={item.id} style={{'--team-color':PALETTE[i%PALETTE.length]}}>
        <input aria-label={t.label+' '+(i+1)} value={item.label} maxLength={32} onChange={e=>setItem(item.id,x=>({...x,label:e.target.value}))}/>
        <strong className="bit-time" aria-live="off">{formatClock(remaining)}</strong>
        <div className="bit-progress"><span style={{width:Math.max(0,remaining/(item.durationSeconds*1000)*100)+'%'}}/></div>
        {completed&&<span role="status" className="bit-done">{t.done}</span>}
        <div className="bit-preset">{[60,180,300,600].map(n=><button key={n} disabled={item.running} type="button" className={item.durationSeconds===n?'active':''} onClick={()=>setDuration(item,n)}>{n/60}m</button>)}</div>
        <div className="bit-timer-controls"><button className="bit-primary" type="button" onClick={()=>item.running?pause(item):run(item)}>{item.running?<Pause size={16}/>:<Play size={16}/>}
          {item.running?t.pause:completed?t.start:remaining<item.durationSeconds*1000?t.resume:t.start}</button>
          <button type="button" className="bit-icon-button" title={t.reset} aria-label={t.reset} onClick={()=>reset(item)}><RotateCcw size={18}/></button></div>
      </div>;
    })}</div>
  </div>;
}
function QrTool({value,onChange,t,sound}){
  const [png,setPng]=useState('');
  const [error,setError]=useState('');
  const [actual,setActual]=useState('');
  const [copied,setCopied]=useState(false);
  const [showBig,setShowBig]=useState(false);
  useEffect(()=>{
    const valid=makeQrInput(value.input);
    if(valid.error){setPng('');setError(t[valid.error==='empty'?'qrEmpty':valid.error==='long'?'qrLong':'qrInvalid']);return;}
    let active=true;
    const timer=setTimeout(()=>{
      QRCode.toDataURL(valid.value,{width:480,margin:3,errorCorrectionLevel:'M',color:{dark:'#1c314f',light:'#ffffff'}})
        .then(src=>{if(active){setPng(src);setActual(valid.value);setError('');}})
        .catch(()=>{if(active){setPng('');setError(t.qrError);}});
    },220);
    return ()=>{active=false;clearTimeout(timer);};
  },[value.input,t]);
  const download=()=>{
    if(!png)return;
    const a=document.createElement('a');a.download='brian-qr.png';a.href=png;document.body.appendChild(a);a.click();a.remove();beep('tap',sound);
  };
  const copy=async()=>{
    try{await navigator.clipboard.writeText(actual);setCopied(true);beep('tap',sound);setTimeout(()=>setCopied(false),1500);}
    catch{setError(t.copyFailed);}
  };
  return <div className="bit-two-cols">
    <div className="bit-panel">
      <label htmlFor="bit-qr-input" className="bit-field-label">{t.qrLabel}</label>
      <textarea id="bit-qr-input" rows="6" value={value.input} maxLength={940} onChange={e=>onChange(v=>({...v,input:e.target.value}))}/>
      <p className="bit-muted">{t.qrHint}</p>
      {error&&<p role="alert" className="bit-error">{error}</p>}
      <div className="bit-actions"><button className="bit-primary" type="button" disabled={!png} onClick={download}><Download size={18}/>{t.qrDownload}</button>
        <button className="bit-secondary" type="button" disabled={!png} onClick={copy}>{copied?<Check size={18}/>:<Copy size={18}/>} {t.qrCopy}</button></div>
    </div>
    <div className="bit-preview bit-qr-preview">
      {png?<><button type="button" className="bit-qr-expand" onClick={()=>setShowBig(true)} aria-label={t.expand}><img src={png} alt={t.qrPreview}/><Maximize2 size={15}/></button><span>{t.qrPreview}</span></>:<QrCode size={110} strokeWidth={.6}/>}
    </div>
    {showBig&&createPortal(<div className="bit-qr-lightbox" role="dialog" aria-modal="true" aria-label={t.qrPreview} onClick={()=>setShowBig(false)}>
      <button className="bit-lightbox-close" type="button" aria-label={t.close} onClick={()=>setShowBig(false)}><X/></button><img src={png} alt={t.qrPreview}/></div>,document.body)}
  </div>;
}
export default function BrianInstantTools({currentUser,language='vi'}){
  const userId=currentUser?.id;
  const t=language==='en'?MSG.en:MSG.vi;
  const [data,setData]=useState(()=>load(userId));
  const [open,setOpen]=useState(false);
  const [tool,setTool]=useState('home');
  const [expanded,setExpanded]=useState(false);
  const [spotlightActive,setSpotlightActive]=useState(false);
  const [pinnedNoteId,setPinnedNoteId]=useState(null);
  const [saveFailed,setSaveFailed]=useState(false);
  const [now,setNow]=useState(()=>Date.now());
  const launcher=useRef(null),dialog=useRef(null);
  const tickLock=useRef(false);
  const sound=data.sound;
  const storage=storageKey(userId);
  useEffect(()=>{
    if(!storage)return;
    try{window.localStorage.setItem(storage,JSON.stringify({version:STORE_VERSION,state:data}));setSaveFailed(false);}
    catch{setSaveFailed(true);}
  },[storage,data]);
  useEffect(()=>{
    const running=data.timers.items.some(x=>x.running);
    if(!running)return undefined;
    const id=setInterval(()=>setNow(Date.now()),250);
    return ()=>clearInterval(id);
  },[data.timers.items]);
  useEffect(()=>{
    if(tickLock.current)return;
    const expired=data.timers.items.filter(x=>x.running&&x.endsAt<=now);
    if(!expired.length)return;
    tickLock.current=true;
    setData(prev=>({...prev,timers:{items:prev.timers.items.map(x=>x.running&&x.endsAt<=Date.now()?{...x,remainingMs:0,endsAt:null,running:false,alerted:true}:x)}}));
    if(sound)beep('end',true);
    tickLock.current=false;
  },[now,data.timers.items,sound]);
  useEffect(()=>{
    if(!open)return undefined;
    const before=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog.current?.focus();
    const onKey=e=>{if(e.key==='Escape'&&!document.querySelector('.bit-w2-stage-overlay, .bit-qr-lightbox')){setOpen(false);}};
    window.addEventListener('keydown',onKey);
    return ()=>{document.body.style.overflow=before;window.removeEventListener('keydown',onKey);launcher.current?.focus();};
  },[open]);
  const active=LIBRARY.find(x=>x.id===tool);
  const pinnedNote=data.notes.items.find(n=>n.id===pinnedNoteId);
  const update=useCallback((section,fn)=>edit(setData,section,fn),[]);
  const choose=id=>{setTool(id);beep('tap',sound);};
  const activateSpotlight=()=>{setOpen(false);setSpotlightActive(true);};
  if(!userId||!storage)return null;
  return <>
    <button className="bit-launcher" ref={launcher} type="button" aria-label={t.launcher} title={t.launcher} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Blocks size={27} strokeWidth={1.8}/><span className="bit-launcher-dot" aria-hidden="true"/></button>
    {open&&createPortal(<div className="bit-overlay" onPointerDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
      <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={active?(language==='en'?active.en:active.vi):t.title} className={'bit-portal'+(expanded?' is-max':'')}>
        <header className="bit-header">
          <div className="bit-header-title"><div className="bit-brand"><Blocks size={25}/></div><div><span className="bit-eyebrow">{t.eyebrow}</span><h2>{active?(language==='en'?active.en:active.vi):t.title}</h2></div></div>
          <div className="bit-window-actions">
            <button type="button" aria-label={t.sound} title={t.sound} onClick={()=>setData(p=>({...p,sound:!p.sound}))}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
            <button type="button" aria-label={expanded?t.restore:t.expand} title={expanded?t.restore:t.expand} onClick={()=>setExpanded(e=>!e)}>{expanded?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button>
            <button type="button" aria-label={t.minimize} title={t.minimize} onClick={()=>setOpen(false)}><X size={21}/></button>
          </div>
        </header>
        <div className="bit-content">
          {tool==='home'?<>
            <div className="bit-intro"><span className="bit-intro-kicker"><Sparkles size={16}/>{t.subtitle}</span><h3>{t.home}</h3><p>{t.savedLocal}</p></div>
            <div className="bit-library">{LIBRARY.map(({id,Icon,vi,en,descVi,descEn},i)=><button className="bit-app-card" type="button" key={id} onClick={()=>choose(id)} style={{'--card-accent':PALETTE[i%PALETTE.length]}}>
              <span className="bit-app-icon"><Icon size={29}/></span><strong>{language==='en'?en:vi}</strong><small>{language==='en'?descEn:descVi}</small><ArrowRight size={18} className="bit-card-arrow"/></button>)}</div>
          </>:<>
            <nav className="bit-backbar"><button type="button" className="bit-secondary" onClick={()=>setTool('home')}><ChevronLeft size={18}/>{t.back}</button><span className="bit-pill"><Save size={15}/>{saveFailed?t.saveFailed:t.save}</span></nav>
            {tool==='dice'&&<DiceTool value={data.dice} onChange={fn=>update('dice',fn)} t={t} sound={sound}/>}
            {tool==='wheel'&&<WheelTool value={data.wheel} onChange={fn=>update('wheel',fn)} t={t} sound={sound}/>}
            {tool==='scoreboard'&&<ScoreboardTool value={data.scoreboard} onChange={fn=>update('scoreboard',fn)} t={t} sound={sound}/>}
            {tool==='timers'&&<TimerTool value={data.timers} onChange={fn=>update('timers',fn)} t={t} sound={sound} now={now}/>}
            {tool==='qr'&&<QrTool value={data.qr} onChange={fn=>update('qr',fn)} t={t} sound={sound}/>}
            {WAVE2_LIBRARY.some(item=>item.id===tool)&&<Wave2Tool key={tool} tool={tool} value={data[tool]}
              onChange={fn=>update(tool,fn)} language={language} sound={sound} onSpotlightStart={activateSpotlight}/>}
            {WAVE3_LIBRARY.some(item=>item.id===tool)&&<Wave3Tool key={tool} tool={tool} value={data[tool]}
              onChange={fn=>update(tool,fn)} language={language} pinnedId={pinnedNoteId} onPin={setPinnedNoteId}/>}
            {WAVE4_LIBRARY.some(item=>item.id===tool)&&<Wave4Tool key={tool} tool={tool} value={data[tool]}
              onChange={fn=>update(tool,fn)} language={language} sound={sound}/>} 
          </>}
        </div>
        <footer className="bit-footer"><span>BRIAN INSTANT TOOLS · 04 / 04</span><span>{saveFailed?t.saveFailed:t.savedLocal}</span></footer>
      </section>
    </div>,document.body)}
    {spotlightActive&&<SpotlightOverlay config={data.spotlight} language={language} onExit={()=>setSpotlightActive(false)}/>}
    {pinnedNote&&createPortal(<aside className={'bit-w3-pinned tone-'+pinnedNote.color} role="complementary" aria-label={pinnedNote.title||'Pinned note'}>
      <header><StickyNote size={19}/><strong>{pinnedNote.title||'Quick Note'}</strong>
        <button type="button" aria-label={language==='en'?'Edit pinned note':'Sửa ghi chú được ghim'} onClick={()=>{setOpen(true);setTool('notes');}}><ChevronLeft size={17}/></button>
        <button type="button" aria-label={language==='en'?'Unpin note':'Bỏ ghim ghi chú'} onClick={()=>setPinnedNoteId(null)}><X size={18}/></button>
      </header><pre>{pinnedNote.body}</pre>
    </aside>,document.body)}
  </>;
}
