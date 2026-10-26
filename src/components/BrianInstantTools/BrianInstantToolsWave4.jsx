import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Users,Mic,RadioTower,Zap,Bell,Plus,Minus,Shuffle,Copy,Play,Pause,RotateCcw,Volume2,VolumeX,Check,AlertCircle,ArrowRight} from 'lucide-react';
import {parseGroupNames,makeBalancedGroups,rmsToDbfs,relativeLoudness,reactionLabel,normalizeBellSegments,bellRemaining,progressBell} from './instantToolsWave4Core.mjs';
import './BrianInstantToolsWave4.css';

export const WAVE4_LIBRARY=[
 {id:'groupMaker',Icon:Users,vi:'Chia nhóm ngẫu nhiên',en:'Group Maker',descVi:'Chia nhóm công bằng, nhanh chóng',descEn:'Balanced randomized groups'},
 {id:'noiseMeter',Icon:Mic,vi:'Đo độ ồn lớp học',en:'Noise Meter',descVi:'Đo micro không ghi âm',descEn:'Private microphone level display'},
 {id:'buzzer',Icon:RadioTower,vi:'Chuông giành quyền',en:'Buzzer',descVi:'Đội bấm nhanh nhất thắng',descEn:'First team to buzz wins'},
 {id:'reactionTimer',Icon:Zap,vi:'Kiểm tra phản xạ',en:'Reaction Timer',descVi:'Thử tốc độ phản ứng',descEn:'Test your reaction speed'},
 {id:'classBell',Icon:Bell,vi:'Chuông tiết học',en:'Class Bell',descVi:'Báo hiệu chuyển hoạt động',descEn:'Timed classroom transitions'}
];
const TEXT={
 vi:{participants:'Danh sách học sinh (mỗi dòng một tên)',groups:'Số nhóm',make:'Chia nhóm',shuffle:'Xáo lại',copy:'Sao chép',copied:'Đã sao chép',invalid:'Cần ít nhất 2 tên khác nhau.',assigned:'học sinh được phân nhóm',group:'Nhóm',deviceOnly:'Lưu trong trình duyệt, không đồng bộ thiết bị.',micStart:'Bật micro',micStop:'Tắt micro',micDenied:'Không thể truy cập micro. Hãy kiểm tra quyền micro và kết nối HTTPS.',micIdle:'Micro đang tắt',micActive:'Đang đo tín hiệu trực tiếp',micPrivacy:'Chỉ phân tích cường độ âm thanh ngay trên thiết bị. Không ghi âm, không gửi dữ liệu ra ngoài.',micAccuracy:'Chỉ số dBFS tương đối, KHÔNG phải số đo dB tiếng ồn được hiệu chuẩn.',micThreshold:'Ngưỡng cảnh báo',micQuiet:'Yên tĩnh',micLoud:'Ồn quá!',micHint:'Dùng để theo dõi xu hướng âm lượng, không thay thế thiết bị đo tiếng ồn.',buzzerHint:'Bấm vào ô đội hoặc phím 1–8 trên cùng thiết bị. Đội đầu tiên được khóa quyền.',first:'GIÀNH QUYỀN',reset:'Lượt mới',winner:'Đội nhanh nhất',localOnly:'Chỉ áp dụng trên một màn hình, không hỗ trợ thi bấm từ nhiều điện thoại.',reactionStart:'Bắt đầu',reactionWait:'Chờ màu xanh…',reactionReady:'BẤM NGAY!',reactionEarly:'Bấm quá sớm!',reactionAgain:'Thử lại',reactionIdle:'Bấm Bắt đầu rồi đợi nền đổi xanh. Chạm hoặc nhấn phím Space ngay khi thấy tín hiệu.',reactionBest:'Thành tích tốt nhất',reactionLast:'Kết quả vừa rồi',reactionTip:'Thời gian tính bằng mili giây (ms). Nhấn sớm không được tính.',bellAdd:'Thêm chặng',bellRemove:'Xóa chặng cuối',bellActivity:'Hoạt động',bellDuration:'Giây',bellStart:'Bắt đầu',bellPause:'Tạm dừng',bellNext:'Chặng tiếp',bellReset:'Đặt lại',bellRing:'Rung chuông',bellCompleted:'Đã hoàn thành!',bellPrivacy:'Âm thanh chỉ phát khi trang đang mở và trình duyệt cho phép. Không có thông báo nền.',bellStage:'Giai đoạn',bellFinished:'Hết giờ',soundHint:'Bật âm thanh trong tiêu đề Toolbox để nghe chuông.'},
 en:{participants:'Student names (one per line)',groups:'Groups',make:'Make groups',shuffle:'Reshuffle',copy:'Copy',copied:'Copied',invalid:'Enter at least two distinct names.',assigned:'students assigned',group:'Group',deviceOnly:'Saved in this browser, not synced between devices.',micStart:'Start microphone',micStop:'Stop microphone',micDenied:'Microphone unavailable. Check permissions and HTTPS.',micIdle:'Microphone off',micActive:'Measuring local audio level',micPrivacy:'Only analyzes loudness on this device. No recording or network transmission.',micAccuracy:'Relative dBFS level, NOT calibrated environmental noise in dB SPL.',micThreshold:'Warning threshold',micQuiet:'Quiet',micLoud:'Too loud!',micHint:'Shows trends only; not a calibrated sound level meter.',buzzerHint:'Tap a team or press keys 1–8 on this device. First buzzer wins.',first:'BUZZ!',reset:'New round',winner:'First team',localOnly:'Single-screen mode only; no multi-phone synchronized buzzers.',reactionStart:'Start',reactionWait:'Wait for green…',reactionReady:'TAP NOW!',reactionEarly:'Too early!',reactionAgain:'Try again',reactionIdle:'Press Start, wait for green, then tap or hit Space as quickly as you can.',reactionBest:'Personal best',reactionLast:'Last time',reactionTip:'Results in milliseconds (ms); early taps do not count.',bellAdd:'Add phase',bellRemove:'Remove last',bellActivity:'Activity',bellDuration:'Seconds',bellStart:'Start',bellPause:'Pause',bellNext:'Next phase',bellReset:'Reset',bellRing:'Ring bell',bellCompleted:'Finished!',bellPrivacy:'Bell only sounds with this page open and browser audio enabled. No background notifications.',bellStage:'Phase',bellFinished:'Time up',soundHint:'Enable sound in the Toolbox header to hear the bell.'}
};
let audioContext;
function soundEffect(kind,enabled){
 if(!enabled||typeof window==='undefined')return;
 try{
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)return;
  if(!audioContext||audioContext.state==='closed')audioContext=new Ctx();
  if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
  const tones=kind==='bell'?[783.99,587.33,783.99]:kind==='win'?[523,659,784]:kind==='fail'?[260,210]:[550];
  tones.forEach((freq,i)=>{
   const osc=audioContext.createOscillator(),gain=audioContext.createGain(),at=audioContext.currentTime+i*.14;
   osc.type=kind==='fail'?'triangle':'sine';osc.frequency.setValueAtTime(freq,at);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.055,at+.025);
   gain.gain.exponentialRampToValueAtTime(.0001,at+.21);osc.connect(gain).connect(audioContext.destination);
   osc.start(at);osc.stop(at+.23);
  });
 }catch{/* audio may be blocked on iOS until a user gesture */}
}
function GroupMaker({value,onChange,language,sound}){
 const t=TEXT[language]||TEXT.vi;
 const [draft,setDraft]=useState(value.input),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 const names=parseGroupNames(draft);
 const shuffle=()=>{
  try{const groups=makeBalancedGroups(draft,value.count);onChange(v=>({...v,input:draft,groups}));setError('');soundEffect('win',sound);}
  catch{setError(t.invalid);}
 };
 const copy=async()=>{
  const txt=value.groups.map((group,i)=>t.group+' '+(i+1)+':\n'+group.map((n,j)=>(j+1)+'. '+n).join('\n')).join('\n\n');
  try{await navigator.clipboard.writeText(txt);setCopied(true);setTimeout(()=>setCopied(false),1300);}catch{setCopied(false);}
 };
 return <div className="bit-w4-columns">
   <div className="bit-panel bit-w4-panel">
     <label htmlFor="bit-w4-roster" className="bit-field-label">{t.participants}</label>
     <textarea id="bit-w4-roster" rows={11} maxLength={7000} value={draft} onChange={e=>{setDraft(e.target.value);onChange(v=>({...v,input:e.target.value,groups:[]}));}}/>
     <p className="bit-muted">{names.length}/80 · {t.deviceOnly}</p>
     <label htmlFor="bit-w4-group-count" className="bit-field-label">{t.groups}</label>
     <select id="bit-w4-group-count" value={value.count} onChange={e=>onChange(v=>({...v,count:Number(e.target.value),groups:[]}))}>
       {[2,3,4,5,6,7,8].map(n=><option value={n} key={n}>{n}</option>)}
     </select>
     {error&&<p role="alert" className="bit-error">{error}</p>}
     <button type="button" className="bit-primary" onClick={shuffle} disabled={names.length<2}><Shuffle size={18}/>{value.groups.length?t.shuffle:t.make}</button>
   </div>
   <div className="bit-w4-results">
    <div className="bit-w4-heading"><strong>{value.groups.reduce((a,g)=>a+g.length,0)} {t.assigned}</strong>
      <button className="bit-secondary" type="button" disabled={!value.groups.length} onClick={copy}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?t.copied:t.copy}</button>
    </div>
    <div className="bit-w4-group-grid">{value.groups.map((g,i)=><section key={i} className="bit-w4-group">
       <h3>{t.group} {i+1} <small>{g.length}</small></h3><ol>{g.map((name,j)=><li key={j}>{name}</li>)}</ol>
     </section>)}</div>
   </div>
 </div>;
}
function NoiseMeter({value,onChange,language}){
 const t=TEXT[language]||TEXT.vi;
 const [status,setStatus]=useState('off'),[db,setDb]=useState(-90),[error,setError]=useState('');
 const audio=useRef(null),stream=useRef(null),raf=useRef(0),request=useRef(0);
 const stop=useCallback(()=>{
  request.current++;
  if(raf.current)cancelAnimationFrame(raf.current);raf.current=0;
  stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;
  if(audio.current){audio.current.close().catch(()=>{});audio.current=null;}
  setStatus('off');setDb(-90);
 },[]);
 useEffect(()=>{
  const hidden=()=>{if(document.hidden)stop();};
  document.addEventListener('visibilitychange',hidden);
  return ()=>{document.removeEventListener('visibilitychange',hidden);stop();};
 },[stop]);
 const start=async()=>{
  if(status!=='off')return;
  setError('');setStatus('asking');
  const ticket=++request.current;
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('MIC_UNAVAILABLE');
   const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
   if(ticket!==request.current){media.getTracks().forEach(x=>x.stop());return;}
   const Ctx=window.AudioContext||window.webkitAudioContext;
   if(!Ctx){media.getTracks().forEach(x=>x.stop());throw Error('AUDIO_UNAVAILABLE');}
   const ctx=new Ctx(),analyser=ctx.createAnalyser();
   stream.current=media;audio.current=ctx;analyser.fftSize=2048;analyser.smoothingTimeConstant=.72;
   const source=ctx.createMediaStreamSource(media);source.connect(analyser);await ctx.resume();
   if(ticket!==request.current){stop();return;}
   const samples=new Float32Array(analyser.fftSize);
   const tick=()=>{
    if(ticket!==request.current)return;
    analyser.getFloatTimeDomainData(samples);
    let energy=0;for(let i=0;i<samples.length;i++)energy+=samples[i]*samples[i];
    const level=rmsToDbfs(Math.sqrt(energy/samples.length));
    setDb(prev=>prev*.6+level*.4);
    raf.current=requestAnimationFrame(tick);
   };
   setStatus('on');tick();
  }catch{if(ticket===request.current){stop();setError(t.micDenied);}}
 };
 const hot=status==='on'&&db>=value.threshold;
 return <div className="bit-w4-meter bit-panel">
   <div className={'bit-w4-meter-dial'+(hot?' is-hot':'')} style={{'--w4-level':relativeLoudness(db)}}>
     <Mic size={27}/><strong aria-live="off">{status==='on'?Math.round(db):'—'}</strong><span>dBFS</span>
   </div>
   <div className="bit-w4-meter-banner" role="status">{status==='on'?(hot?t.micLoud:t.micQuiet):status==='asking'?'…':t.micIdle}</div>
   <p>{t.micPrivacy}</p><p className="bit-w4-warning"><AlertCircle size={18}/>{t.micAccuracy}</p>
   <label htmlFor="bit-w4-threshold" className="bit-field-label">{t.micThreshold}: {value.threshold} dBFS</label>
   <input id="bit-w4-threshold" type="range" min="-55" max="-8" step="1" value={value.threshold} onChange={e=>onChange(v=>({...v,threshold:Number(e.target.value)}))}/>
   <button type="button" disabled={status==='asking'} className={status==='on'?'bit-secondary':'bit-primary'} onClick={status==='on'?stop:start}>{status==='on'?<VolumeX size={18}/>:<Mic size={18}/>} {status==='on'?t.micStop:t.micStart}</button>
   {error&&<p role="alert" className="bit-error">{error}</p>}
   <small className="bit-muted">{t.micHint}</small>
 </div>;
}
function Buzzer({value,onChange,language,sound}){
 const t=TEXT[language]||TEXT.vi,teams=value.teams,winner=value.winner;
 const buzz=useCallback(i=>{if(winner!==null)return;onChange(v=>v.winner!==null?v:{...v,winner:i});soundEffect('win',sound);},[winner,onChange,sound]);
 useEffect(()=>{
  const key=e=>{if(e.repeat||e.altKey||e.metaKey||e.ctrlKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)||e.target?.isContentEditable)return;
    const n=Number(e.key);if(n>=1&&n<=teams.length)buzz(n-1);
  };
  window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);
 },[teams.length,buzz]);
 return <div className="bit-w4-buzzer">
  <p className="bit-muted">{t.buzzerHint}</p>
  {winner!==null&&<div role="status" className="bit-w4-buzz-winner"><Zap size={34}/><span>{t.winner}</span><strong>{teams[winner]}</strong></div>}
  <div className="bit-w4-buzz-grid">{teams.map((name,i)=><button type="button" aria-label={name+' '+t.first} className={'bit-w4-buzz-team'+(winner===i?' is-winner':'')+(winner!==null&&winner!==i?' is-locked':'')} key={i} disabled={winner!==null} onClick={()=>buzz(i)}>
    <span>{i+1}</span><strong>{name}</strong><RadioTower size={29}/><small>{winner===i?t.winner:t.first}</small>
  </button>)}</div>
  <div className="bit-w4-actions"><button type="button" className="bit-primary" onClick={()=>{onChange(v=>({...v,winner:null}));soundEffect('tap',sound);}}><RotateCcw size={18}/>{t.reset}</button>
  <button type="button" className="bit-secondary" onClick={()=>onChange(v=>({...v,teams:[...v.teams,'Team '+(v.teams.length+1)],winner:null}))} disabled={teams.length>=8}><Plus size={18}/></button>
  <button type="button" className="bit-secondary" onClick={()=>onChange(v=>({...v,teams:v.teams.slice(0,-1),winner:null}))} disabled={teams.length<=2}><Minus size={18}/></button></div>
  <div className="bit-w4-team-edits">{teams.map((n,i)=><input key={i} value={n} maxLength={32} aria-label={t.group+' '+(i+1)} onChange={e=>onChange(v=>({...v,teams:v.teams.map((old,j)=>j===i?e.target.value:old)}))}/>)}</div>
  <p className="bit-w4-warning"><AlertCircle size={17}/>{t.localOnly}</p>
 </div>;
}
function ReactionTimer({value,onChange,language,sound}){
 const t=TEXT[language]||TEXT.vi;
 const [phase,setPhase]=useState('idle'),[last,setLast]=useState(null);
 const timer=useRef(0),started=useRef(0),phaseRef=useRef('idle');
 const change=next=>{phaseRef.current=next;setPhase(next);};
 const cancel=useCallback(()=>{clearTimeout(timer.current);timer.current=0;phaseRef.current='idle';setPhase('idle');},[]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)cancel();};
  document.addEventListener('visibilitychange',hide);
  return ()=>{document.removeEventListener('visibilitychange',hide);clearTimeout(timer.current);};
 },[cancel]);
 const begin=()=>{
  clearTimeout(timer.current);soundEffect('tap',sound);change('wait');setLast(null);
  let random=Math.floor(Math.random()*2700)+1300;
  if(globalThis.crypto?.getRandomValues){const v=new Uint32Array(1);globalThis.crypto.getRandomValues(v);random=1300+v[0]%2700;}
  timer.current=setTimeout(()=>{started.current=performance.now();change('ready');},random);
 };
 const tap=()=>{
  if(phaseRef.current==='idle'||phaseRef.current==='result'||phaseRef.current==='early'){begin();return;}
  if(phaseRef.current==='wait'){clearTimeout(timer.current);change('early');setLast(null);soundEffect('fail',sound);return;}
  if(phaseRef.current==='ready'){
   const ms=Math.max(1,Math.round(performance.now()-started.current));
   setLast(ms);change('result');soundEffect('win',sound);
   onChange(v=>({...v,best:v.best===null?ms:Math.min(v.best,ms),attempts:[ms,...v.attempts].slice(0,12)}));
  }
 };
 useEffect(()=>{
  const key=e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat&&!/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target?.tagName)&&!e.target?.isContentEditable){e.preventDefault();tap();}};
  window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);
 });
 const label=phase==='wait'?t.reactionWait:phase==='ready'?t.reactionReady:phase==='early'?t.reactionEarly:phase==='result'?String(last)+' ms':t.reactionIdle;
 return <div className="bit-w4-reaction">
  <button type="button" className={'bit-w4-reaction-pad stage-'+phase} aria-live="polite" onClick={tap}>
    <Zap size={51}/><strong>{label}</strong><span>{phase==='idle'||phase==='result'||phase==='early'?t.reactionStart:phase==='wait'?'…':t.reactionReady}</span>
  </button>
  <div className="bit-w4-reaction-stats">
   <div><span>{t.reactionBest}</span><strong>{value.best===null?'—':value.best+' ms'}</strong></div>
   <div><span>{t.reactionLast}</span><strong>{last===null?'—':last+' ms'}</strong></div>
  </div>
  <p className="bit-muted">{t.reactionTip}</p>
 </div>;
}
function ClassBell({value,onChange,language,sound}){
 const t=TEXT[language]||TEXT.vi;
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{if(!value.running)return;const id=setInterval(()=>setNow(Date.now()),230);return ()=>clearInterval(id);},[value.running]);
 useEffect(()=>{
  if(!value.running)return;
  const next=progressBell(value,now);
  if(next.advanced){
   onChange(v=>{const p=progressBell(v,Date.now());const {advanced,completed,...rest}=p;return {...v,...rest};});
   if(!document.hidden)soundEffect('bell',sound);
  }
 },[now,value,onChange,sound]);
 const phase=value.segments[value.index],ms=bellRemaining(value,now);
 const run=()=>{
  if(value.running){const p=progressBell(value,Date.now());onChange(v=>({...v,segments:p.segments,index:p.index,endsAt:null,remainingMs:p.remainingMs,running:false}));return;}
  const remaining=ms>0?ms:phase.seconds*1000;
  onChange(v=>({...v,remainingMs:remaining,endsAt:Date.now()+remaining,running:true}));
  soundEffect('tap',sound);
 };
 const advance=()=>{
  const index=Math.min(value.segments.length-1,value.index+1),seconds=value.segments[index].seconds;
  onChange(v=>({...v,index,remainingMs:seconds*1000,endsAt:v.running?Date.now()+seconds*1000:null}));
  soundEffect('bell',sound);
 };
 const reset=()=>onChange(v=>({...v,index:0,running:false,endsAt:null,remainingMs:v.segments[0].seconds*1000}));
 const setSegment=(i,changes)=>onChange(v=>{
  const segments=v.segments.map((s,j)=>j===i?{...s,...changes}:s);
  return {...v,segments,...(i===v.index?{running:false,endsAt:null,remainingMs:segments[i].seconds*1000}:{})};
 });
 return <div className="bit-w4-bell">
  <div className="bit-w4-bell-display bit-panel">
   <Bell size={34}/><small>{t.bellStage} {value.index+1}/{value.segments.length} · {phase.name}</small>
   <strong aria-live="off">{String(Math.floor(Math.ceil(ms/1000)/60)).padStart(2,'0')}:{String(Math.ceil(ms/1000)%60).padStart(2,'0')}</strong>
   <div className="bit-w4-progress"><span style={{width:(100*Math.min(1,ms/(phase.seconds*1000)))+'%'}}/></div>
   {ms===0&&!value.running&&<p role="status">{t.bellCompleted}</p>}
   <div className="bit-w4-actions"><button className="bit-primary" type="button" onClick={run}>{value.running?<Pause size={18}/>:<Play size={18}/>} {value.running?t.bellPause:t.bellStart}</button>
    <button className="bit-secondary" type="button" onClick={advance} disabled={value.index===value.segments.length-1}><ArrowRight size={18}/>{t.bellNext}</button>
    <button className="bit-secondary" type="button" onClick={()=>soundEffect('bell',sound)}><Volume2 size={18}/>{t.bellRing}</button>
    <button className="bit-secondary" type="button" onClick={reset}><RotateCcw size={18}/>{t.bellReset}</button>
   </div>
  </div>
  <div className="bit-w4-bell-list">{value.segments.map((s,i)=><div className={'bit-w4-bell-row'+(i===value.index?' active':'')} key={s.id}>
   <span>{i+1}</span><input aria-label={t.bellActivity+' '+(i+1)} maxLength={45} value={s.name} onChange={e=>setSegment(i,{name:e.target.value})}/>
   <label><span>{t.bellDuration}</span><input aria-label={t.bellDuration+' '+(i+1)} type="number" min="10" max="3600" step="10" value={s.seconds} onChange={e=>setSegment(i,{seconds:Math.min(3600,Math.max(10,Number(e.target.value)||10))})}/></label>
  </div>)}</div>
  <div className="bit-w4-actions"><button type="button" className="bit-secondary" disabled={value.segments.length>=8} onClick={()=>onChange(v=>({...v,segments:[...v.segments,{id:'bell-'+v.segments.length,name:'Phase '+(v.segments.length+1),seconds:60}]}))}><Plus size={17}/>{t.bellAdd}</button>
   <button type="button" className="bit-secondary" disabled={value.segments.length<=1} onClick={()=>onChange(v=>{
    const segments=normalizeBellSegments(v.segments.slice(0,-1)),index=Math.min(v.index,segments.length-1);
    return {...v,segments,index,running:false,endsAt:null,remainingMs:segments[index].seconds*1000};
   })}><Minus size={17}/>{t.bellRemove}</button></div>
  <p className="bit-w4-warning"><AlertCircle size={17}/>{t.bellPrivacy} {t.soundHint}</p>
 </div>;
}
export function Wave4Tool({tool,value,onChange,language='vi',sound}){
 const props={value,onChange,language,sound};
 if(tool==='groupMaker')return <GroupMaker {...props}/>;
 if(tool==='noiseMeter')return <NoiseMeter {...props}/>;
 if(tool==='buzzer')return <Buzzer {...props}/>;
 if(tool==='reactionTimer')return <ReactionTimer {...props}/>;
 if(tool==='classBell')return <ClassBell {...props}/>;
 return null;
}
