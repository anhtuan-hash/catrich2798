import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
  UsersRound,AudioLines,BellRing,Zap,AlarmClock,Plus,Minus,
  Shuffle,Copy,Check,Play,Pause,RotateCcw,Trophy,Volume2,VolumeX,
  AlertTriangle,Mic,MicOff,Timer,PartyPopper,Flag,CheckCircle2
} from 'lucide-react';
import {secureInt} from './instantToolsCore.mjs';
import {normalizePeople,makeGroups,relativeNoise,lockBuzzer,reactionDelay,BUZZER_DEFAULT} from './instantToolsWave4Core.mjs';
import './BrianInstantToolsWave4.css';
import ClassBellTimeline from './BrianInstantToolsClassTimeline.jsx';
export const WAVE4_LIBRARY=[
  {id:'groupMaker',Icon:UsersRound,vi:'Chia nhóm nhanh',en:'Group Maker',descVi:'Chia nhóm cân bằng một chạm',descEn:'Balanced groups in one tap'},
  {id:'noiseMeter',Icon:AudioLines,vi:'Đồng hồ tiếng ồn',en:'Noise Meter',descVi:'Đo âm thanh tương đối bằng micro',descEn:'Relative microphone noise level'},
  {id:'buzzer',Icon:BellRing,vi:'Bấm chuông giành quyền',en:'Buzzer',descVi:'Đội bấm đầu tiên thắng lượt',descEn:'First-team single-screen buzzer'},
  {id:'reaction',Icon:Zap,vi:'Đo phản xạ',en:'Reaction Timer',descVi:'Chạm khi màn hình chuyển xanh',descEn:'Tap when the screen turns green'},
  {id:'classBell',Icon:AlarmClock,vi:'Chuông lớp học',en:'Class Bell',descVi:'Chuông bắt đầu, chuyển và kết thúc',descEn:'Attention, start, transition, finish'}
];
const L={
 vi:{
  names:'Danh sách người tham gia (mỗi dòng một tên)',groupCount:'Số nhóm',mix:'Chia nhóm ngẫu nhiên',copied:'Đã sao chép',copy:'Sao chép kết quả',copyFail:'Không thể sao chép.',needNames:'Vui lòng nhập ít nhất 2 tên khác nhau.',groupTip:'Nhập tối đa 120 tên. Không gửi danh sách ra ngoài thiết bị.',group:'Nhóm',members:'thành viên',groupsEmpty:'Nhấn Chia nhóm để bắt đầu.',
  permission:'Dùng microphone',startMic:'Bắt đầu đo',stopMic:'Dừng microphone',micStatus:'Đang thu mức âm thanh…',noiseHint:'Đây là chỉ số tương đối 0–100, không phải số đo dB được hiệu chuẩn. Không ghi âm hay truyền dữ liệu.',threshold:'Ngưỡng cảnh báo',quiet:'Yên tĩnh',medium:'Trung bình',loud:'Vượt ngưỡng',micDenied:'Không thể truy cập microphone. Kiểm tra quyền của trình duyệt và kết nối HTTPS.',micUnavailable:'Thiết bị/trình duyệt không hỗ trợ microphone.',micIdle:'Microphone đang tắt.',
  teams:'Số đội',team:'Đội',arm:'Bắt đầu lượt mới',armed:'Sẵn sàng — đội nào bấm trước?',winner:'Đội giành quyền',locked:'Lượt đã khóa',round:'Lượt',buzzHint:'Chế độ dùng chung một màn hình TV/máy tính. Không đồng bộ điện thoại học sinh.',buzz:'BẤM CHUÔNG',score:'Điểm',lastWinners:'Lịch sử',correct:'Cộng điểm',reset:'Đặt lại',resetAsk:'Xóa điểm và lịch sử của tất cả đội?',ready:'Sẵn sàng',
  begin:'Bắt đầu thử',waiting:'Chờ tín hiệu xanh…',tapNow:'CHẠM NGAY!',falseStart:'Bấm quá sớm!',retry:'Thử lại',timeResult:'Thời gian phản ứng',best:'Tốt nhất',reactionHelp:'Nhấn bắt đầu. Đừng bấm cho đến khi nền chuyển xanh. Kết quả đo bằng đồng hồ hiệu năng trên thiết bị.',cancel:'Hủy',recent:'Gần đây',
  bellHint:'Nhấn để phát tiếng chuông trực tiếp trên thiết bị. Không dùng tệp âm thanh hoặc Internet.',volume:'Âm lượng',duration:'Thời lượng',soundOff:'Âm thanh toàn cục đang tắt. Bật loa ở tiêu đề Toolbox.',played:'Đã phát chuông',attention:'Chú ý',lessonStart:'Bắt đầu',transition:'Chuyển hoạt động',finish:'Kết thúc',sec:'giây'
 },
 en:{
  names:'Participants (one per line)',groupCount:'Groups',mix:'Shuffle into groups',copied:'Copied',copy:'Copy groups',copyFail:'Clipboard unavailable.',needNames:'Enter at least two different names.',groupTip:'Up to 120 names, never uploaded or shared.',group:'Group',members:'members',groupsEmpty:'Tap Shuffle to begin.',
  permission:'Use microphone',startMic:'Start measuring',stopMic:'Stop microphone',micStatus:'Reading microphone level…',noiseHint:'Relative 0–100 indicator, NOT calibrated sound pressure in dB. No audio recording or upload.',threshold:'Warning threshold',quiet:'Quiet',medium:'Moderate',loud:'Above threshold',micDenied:'Microphone access denied. Check browser permission and HTTPS.',micUnavailable:'Microphone unsupported on this device/browser.',micIdle:'Microphone is off.',
  teams:'Number of teams',team:'Team',arm:'Arm next round',armed:'Armed — first team to tap wins!',winner:'First team',locked:'Round locked',round:'Round',buzzHint:'Single-screen game on this computer or TV. Not synchronized across student phones.',buzz:'BUZZ!',score:'Score',lastWinners:'Recent winners',correct:'Award point',reset:'Reset',resetAsk:'Clear all team scores and winner history?',ready:'Ready',
  begin:'Start challenge',waiting:'Wait for green…',tapNow:'TAP NOW!',falseStart:'Too early!',retry:'Try again',timeResult:'Reaction time',best:'Best',reactionHelp:'Tap Start, then wait for the screen to turn green. Results use your device performance clock.',cancel:'Cancel',recent:'Recent',
  bellHint:'Tap to play an on-device sound cue. No downloaded files or Internet.',volume:'Volume',duration:'Duration',soundOff:'Master audio is muted. Enable the speaker in the Toolbox header.',played:'Bell played',attention:'Attention',lessonStart:'Start',transition:'Transition',finish:'Finish',sec:'seconds'
 }
};
function useStrings(language){return language==='en'?L.en:L.vi;}
function localBeep(frequency=660,seconds=.15,volume=.07){
 try{
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return;
  const c=new C(),osc=c.createOscillator(),gain=c.createGain(),t=c.currentTime;
  osc.type='sine';osc.frequency.setValueAtTime(frequency,t);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+seconds);
  osc.connect(gain).connect(c.destination);osc.start(t);osc.stop(t+seconds+.01);
  osc.onended=()=>c.close().catch(()=>{});
 }catch{/* Audio is optional. */}
}
function GroupMaker({value,onChange,language,sound}){
 const t=useStrings(language),[draft,setDraft]=useState(value.names.join('\n')),[copied,setCopied]=useState('');
 const [error,setError]=useState(''),[dealRun,setDealRun]=useState(0);
 const update=fn=>onChange(v=>fn(v));
 const split=()=>{
  const names=normalizePeople(draft);
  if(names.length<2){setError(t.needNames);return;}
  const groups=makeGroups(names,value.count,secureInt);
  update(v=>({...v,names,groups}));setDealRun(n=>n+1);setError('');if(sound)localBeep(588,.17);
 };
 const copy=async()=>{
  const contents=value.groups.map((g,i)=>(language==='en'?t.group:t.group)+' '+(i+1)+': '+g.members.join(', ')).join('\n');
  try{await navigator.clipboard.writeText(contents);setCopied(t.copied);}catch{setCopied(t.copyFail);}
 };
 return <div className="bit-w4-two">
  <section className="bit-w4-panel">
   <label htmlFor="bit-w4-names">{t.names}</label>
   <textarea id="bit-w4-names" rows={12} maxLength={7400} value={draft} onChange={e=>setDraft(e.target.value)}/>
   <span className="bit-w4-hint">{t.groupTip}</span>
   <label htmlFor="bit-w4-count">{t.groupCount}: {value.count}</label>
   <input id="bit-w4-count" type="range" min="2" max="8" step="1" value={value.count} onChange={e=>update(v=>({...v,count:Number(e.target.value),groups:[]}))}/>
   {error&&<p role="alert" className="bit-error">{error}</p>}
   <button type="button" className="bit-primary" onClick={split}><Shuffle size={18}/>{t.mix}</button>
   <button type="button" className="bit-secondary" disabled={!value.groups.length} onClick={copy}><Copy size={17}/>{t.copy}</button>
   {copied&&<p role="status" className="bit-w4-hint">{copied}</p>}
  </section>
  <section className="bit-w4-group-view" key={dealRun}>{value.groups.length?value.groups.map((g,i)=><article className="bit-w4-group-card" key={g.id} style={{'--w4-accent':['#587ce1','#21a994','#df9861','#b66ec1','#4aa8c9','#e27f9c','#6bb366','#8c85d8'][i]}}>
    <header><strong>{t.group} {i+1}</strong><small>{g.members.length} {t.members}</small></header>
    <ol>{g.members.map((name,j)=><li key={j} style={{'--w4-stagger':Math.min(700,(j*8+i*70))+'ms'}}>{name}</li>)}</ol>
   </article>):<div className="bit-w4-empty"><UsersRound size={48}/><p>{t.groupsEmpty}</p></div>}</section>
 </div>;
}
function NoiseMeter({value,onChange,language}){
 const t=useStrings(language);
 const [status,setStatus]=useState('idle'),[level,setLevel]=useState(0);
 const streamRef=useRef(null),contextRef=useRef(null),sourceRef=useRef(null),analyserRef=useRef(null),frameRef=useRef(null),gen=useRef(0);
 const clean=useCallback(()=>{
  gen.current++;
  if(frameRef.current!==null){cancelAnimationFrame(frameRef.current);frameRef.current=null;}
  try{sourceRef.current?.disconnect();analyserRef.current?.disconnect();}catch{}
  sourceRef.current=null;analyserRef.current=null;
  if(streamRef.current){streamRef.current.getTracks().forEach(track=>track.stop());streamRef.current=null;}
  if(contextRef.current){contextRef.current.close?.().catch(()=>{});contextRef.current=null;}
 },[]);
 useEffect(()=>{
  const hidden=()=>{if(document.visibilityState==='hidden'){clean();setStatus('idle');setLevel(0);}};
  document.addEventListener('visibilitychange',hidden);
  return ()=>{document.removeEventListener('visibilitychange',hidden);clean();};
 },[clean]);
 const stop=()=>{clean();setStatus('idle');setLevel(0);};
 const start=async()=>{
  if(!navigator.mediaDevices?.getUserMedia){setStatus('unsupported');return;}
  clean();setStatus('requesting');const ticket=gen.current;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false},video:false});
    if(gen.current!==ticket){stream.getTracks().forEach(track=>track.stop());return;}
    streamRef.current=stream;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)throw Error('unsupported');
    const context=new AC();contextRef.current=context;
    const src=context.createMediaStreamSource(stream);sourceRef.current=src;
    const analyser=context.createAnalyser();analyser.fftSize=1024;analyserRef.current=analyser;
    src.connect(analyser);
    if(context.state==='suspended')await context.resume();
    if(gen.current!==ticket)return;
    const buf=new Float32Array(analyser.fftSize);
    setStatus('active');
    let last=0;
    const tick=stamp=>{
      if(gen.current!==ticket)return;
      analyser.getFloatTimeDomainData(buf);
      if(stamp-last>90){setLevel(relativeNoise(buf));last=stamp;}
      frameRef.current=requestAnimationFrame(tick);
    };
    frameRef.current=requestAnimationFrame(tick);
    for(const track of stream.getAudioTracks())track.addEventListener('ended',stop,{once:true});
  }catch(err){
    if(gen.current===ticket){clean();setStatus(err?.message==='unsupported'?'unsupported':'denied');}
  }
 };
 const threshold=value.threshold;
 const rank=level>=threshold?'loud':level>=threshold*.65?'medium':'quiet';
 return <div className="bit-w4-two">
  <section className="bit-w4-panel">
    <label htmlFor="bit-w4-threshold">{t.threshold}: {threshold}/100</label>
    <input id="bit-w4-threshold" type="range" min="15" max="85" step="5" value={threshold} onChange={e=>onChange(v=>({...v,threshold:Number(e.target.value)}))}/>
    {status==='active'||status==='requesting'?
     <button type="button" className="bit-secondary" onClick={stop}><MicOff size={18}/>{t.stopMic}</button>:
     <button type="button" className="bit-primary" onClick={start}><Mic size={18}/>{t.startMic}</button>}
    <p role="status" className="bit-w4-hint">{status==='denied'?t.micDenied:status==='unsupported'?t.micUnavailable:status==='active'?t.micStatus:status==='requesting'?t.permission:t.micIdle}</p>
    <p className="bit-w4-hint">{t.noiseHint}</p>
  </section>
  <section className={'bit-w4-meter is-'+rank} aria-label={t.threshold}>
    <AudioLines size={53}/><strong className="bit-w4-meter-value" aria-live="off">{level}</strong>
    <span className="bit-w4-meter-tag">{status==='active'?t[rank]:t.micIdle}</span>
    <div className="bit-w4-meter-track"><span style={{width:level+'%'}}/></div>
    <small>0 — 100</small>
  </section>
 </div>;
}
function Buzzer({value,onChange,language,sound}){
 const t=useStrings(language);
 const [armed,setArmed]=useState(false),[winner,setWinner]=useState(null),[round,setRound]=useState(0);
 const winnerIndex=useRef(null),armedRef=useRef(false);
 const teams=value.teams;
 const update=fn=>onChange(v=>fn(v));
 const arm=()=>{winnerIndex.current=null;armedRef.current=true;setRound(v=>v+1);setArmed(true);setWinner(null);};
 const buzz=(name,index)=>{
  if(!armedRef.current||winnerIndex.current!==null)return;
  winnerIndex.current=index;armedRef.current=false;
  const chosen=name;
  setWinner(chosen);setArmed(false);
  update(v=>({...v,history:[chosen,...v.history].slice(0,15)}));
  if(sound)localBeep(720,.26);
 };
 const count=amount=>{
  const n=Math.min(8,Math.max(2,teams.length+amount));
  if(n===teams.length)return;
  update(v=>({...v,teams:Array.from({length:n},(_,i)=>v.teams[i]||'Team '+(i+1)),score:Array.from({length:n},(_,i)=>v.score[i]||0)}));
  armedRef.current=false;winnerIndex.current=null;setArmed(false);setWinner(null);
 };
 const award=()=>{
  const idx=winnerIndex.current;
  if(idx===null||idx<0||idx>=teams.length)return;
  update(v=>({...v,score:v.teams.map((_,i)=>i===idx?Math.min(999,(v.score[i]||0)+1):(v.score[i]||0))}));
  if(sound)localBeep(950,.12);
 };
 const reset=()=>{
  if(!window.confirm(t.resetAsk))return;
  update(v=>({...v,score:v.teams.map(()=>0),history:[]}));
  winnerIndex.current=null;armedRef.current=false;setWinner(null);setArmed(false);setRound(0);
 };
 return <div className="bit-w4-buzzer">
   <div className="bit-w4-buzz-actions">
    <div className="bit-w4-step"><span>{t.teams}</span><button type="button" aria-label="-" disabled={teams.length<=2} onClick={()=>count(-1)}><Minus size={17}/></button><b>{teams.length}</b><button type="button" aria-label="+" disabled={teams.length>=8} onClick={()=>count(1)}><Plus size={17}/></button></div>
    <button className="bit-primary" type="button" onClick={arm}><Play size={18}/>{t.arm}</button>
    <button type="button" className="bit-secondary" onClick={reset}><RotateCcw size={18}/>{t.reset}</button>
   </div>
   <div className={'bit-w4-buzz-status'+(winner?' has-winner':'')} role="status">{winner?<><Trophy size={23}/>{t.winner}: {winner}</>:armed?<><Zap size={23}/>{t.armed}</>:t.buzzHint}
    {round>0&&<small>{t.round} {round}</small>}</div>
   <div className="bit-w4-buzz-grid">{teams.map((name,i)=><section key={i} className={'bit-w4-buzz-team'+(winner===name?' is-winner':'')}>
    <input aria-label={t.team+' '+(i+1)} maxLength={32} value={name} onChange={e=>update(v=>({...v,teams:v.teams.map((x,j)=>i===j?e.target.value.slice(0,32):x)}))}/>
    <button className="bit-w4-big-buzz" type="button" disabled={!armed||Boolean(winner)} onClick={()=>buzz(name||t.team+' '+(i+1),i)}><BellRing size={27}/>{t.buzz}</button>
    <span>{t.score}: {value.score[i]||0}</span>
   </section>)}</div>
   <div className="bit-w4-buzz-actions"><button type="button" className="bit-secondary" disabled={!winner} onClick={award}><CheckCircle2 size={18}/>{t.correct}</button>
    <span className="bit-w4-hint">{t.lastWinners}: {value.history.slice(0,4).join(' · ')||'—'}</span></div>
 </div>;
}
function ReactionTimer({value,onChange,language,sound}){
 const t=useStrings(language);
 const [phase,setPhase]=useState('idle'),[result,setResult]=useState(null);
 const timer=useRef(null),readyAt=useRef(null);
 const stop=useCallback(()=>{clearTimeout(timer.current);timer.current=null;readyAt.current=null;setPhase('idle');},[]);
 useEffect(()=>{
  const visibility=()=>{if(document.visibilityState==='hidden')stop();};
  document.addEventListener('visibilitychange',visibility);
  return ()=>{document.removeEventListener('visibilitychange',visibility);clearTimeout(timer.current);};
 },[stop]);
 const start=()=>{
  clearTimeout(timer.current);readyAt.current=null;setResult(null);setPhase('waiting');
  timer.current=setTimeout(()=>{
    readyAt.current=performance.now();setPhase('ready');
  },reactionDelay());
 };
 const tap=()=>{
  if(phase==='waiting'){clearTimeout(timer.current);readyAt.current=null;setPhase('early');if(sound)localBeep(240,.11);return;}
  if(phase!=='ready'||readyAt.current===null)return;
  const ms=Math.round(performance.now()-readyAt.current);
  readyAt.current=null;setResult(ms);setPhase('result');
  onChange(v=>({...v,history:[ms,...v.history].slice(0,10)}));
  if(sound)localBeep(950,.14);
  if((!value.history.length||ms<Math.min(...value.history))&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   import('canvas-confetti').then(({default:burst})=>burst({particleCount:55,spread:55,origin:{y:.7},disableForReducedMotion:true})).catch(()=>{});
  }
 };
 useEffect(()=>{
  const handler=e=>{
   if(e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
   if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target?.tagName)||e.target?.isContentEditable)return;
   if(e.code==='Space'||e.code==='Enter'){
    if(phase==='waiting'||phase==='ready'){e.preventDefault();tap();}
    else if(phase==='idle'||phase==='early'||phase==='result'){e.preventDefault();start();}
   }
  };
  window.addEventListener('keydown',handler);return ()=>window.removeEventListener('keydown',handler);
 });
 const best=value.history.length?Math.min(...value.history):null;
 return <div className="bit-w4-reaction">
  <div className="bit-w4-react-header"><p>{t.reactionHelp}</p>
    <div className="bit-w4-react-stats"><span>{t.best}: <b>{best??'—'}{best!==null?' ms':''}</b></span><span>{t.recent}: {value.history.slice(0,4).join(', ')||'—'}</span></div></div>
  <button type="button" className={'bit-w4-reaction-stage is-'+phase} onClick={tap} disabled={phase==='idle'||phase==='early'||phase==='result'} aria-label={phase==='ready'?t.tapNow:phase==='waiting'?t.waiting:t.ready}>
    <Zap size={57}/><strong>{phase==='ready'?t.tapNow:phase==='waiting'?t.waiting:phase==='early'?t.falseStart:phase==='result'?result+' ms':t.ready}</strong>
  </button>
  <div className="bit-w4-react-buttons">
   <button className="bit-primary" type="button" onClick={start} disabled={phase==='waiting'||phase==='ready'}><Play size={18}/>{phase==='early'||phase==='result'?t.retry:t.begin}</button>
   <button className="bit-secondary" type="button" disabled={phase==='idle'} onClick={stop}><RotateCcw size={18}/>{t.cancel}</button>
  </div>
 </div>;
}
const BELLS=[
 {key:'attention',Icon:BellRing,freq:[784,784,1047]},
 {key:'lessonStart',Icon:Play,freq:[440,554,659,880]},
 {key:'transition',Icon:Flag,freq:[622,523,622]},
 {key:'finish',Icon:PartyPopper,freq:[660,523,440,349]}
];
function ManualClassBell({value,onChange,language,sound}){
 const t=useStrings(language),[last,setLast]=useState(null);
 const contexts=useRef([]);
 const endAll=useCallback(()=>{
  for(const entry of contexts.current)try{entry.close?.().catch(()=>{});}catch{}
  contexts.current=[];
 },[]);
 useEffect(()=>()=>endAll(),[endAll]);
 const play=cue=>{
  setLast(cue.key);
  if(!sound||value.volume===0)return;
  endAll();
  try{
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
   const ctx=new AC();contexts.current=[ctx];
   const start=ctx.currentTime;
   const duration=value.duration,cues=cue.freq;
   cues.forEach((hz,i)=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain(),t0=start+i*duration/cues.length;
    const delta=Math.min(.28,duration/cues.length*.84);
    osc.type=cue.key==='finish'?'triangle':'sine';
    osc.frequency.setValueAtTime(hz,t0);
    gain.gain.setValueAtTime(.0001,t0);
    gain.gain.exponentialRampToValueAtTime(value.volume/100*.115,t0+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,t0+delta);
    osc.connect(gain).connect(ctx.destination);osc.start(t0);osc.stop(t0+delta+.01);
   });
   setTimeout(()=>{ctx.close().catch(()=>{});contexts.current=contexts.current.filter(x=>x!==ctx);},duration*1000+160);
  }catch{/* audio optional; browser may block AudioContext */}
 };
 return <div className="bit-w4-bells">
  <section className="bit-w4-panel">
   <p className="bit-w4-hint">{t.bellHint}</p>
   {!sound&&<p className="bit-error" role="status">{t.soundOff}</p>}
   <label htmlFor="bit-w4-volume">{t.volume}: {value.volume}%</label>
   <input id="bit-w4-volume" type="range" min="0" max="100" step="5" value={value.volume} onChange={e=>onChange(v=>({...v,volume:Number(e.target.value)}))}/>
   <label htmlFor="bit-w4-duration">{t.duration}: {value.duration} {t.sec}</label>
   <input id="bit-w4-duration" type="range" min="1" max="4" step="1" value={value.duration} onChange={e=>onChange(v=>({...v,duration:Number(e.target.value)}))}/>
   {last&&<p role="status" className="bit-w4-hint"><Check size={17}/> {t.played}: {t[last]}</p>}
  </section>
  <div className="bit-w4-bell-grid">{BELLS.map(({key,Icon,...cue})=><button key={key} type="button" className={'bit-w4-bell-card'+(last===key?' is-played':'')} onClick={()=>play({key,...cue})}>
     <Icon size={36}/><strong>{t[key]}</strong><Volume2 size={16}/></button>)}</div>
 </div>;
}
function ClassBell({value,onChange,language,sound}){
 const [mode,setMode]=useState('manual');
 return <div className="bit-w4-bell-workspace">
  <div className="bit-w4-bell-tabs" role="tablist" aria-label={language==='en'?'Bell modes':'Chế độ chuông'}>
   <button type="button" role="tab" aria-selected={mode==='manual'} className={mode==='manual'?'active':''} onClick={()=>setMode('manual')}>{language==='en'?'Manual Bells':'Chuông thủ công'}</button>
   <button type="button" role="tab" aria-selected={mode==='timeline'} className={mode==='timeline'?'active':''} onClick={()=>setMode('timeline')}>{language==='en'?'Class Timeline':'Lịch chuông tự động'}</button>
  </div>
  {mode==='manual'?<ManualClassBell value={value} onChange={onChange} language={language} sound={sound}/>:
   <ClassBellTimeline value={value.timeline} onChange={onChange} language={language} sound={sound}/>}
 </div>;
}
export function Wave4Tool({tool,value,onChange,language,sound}){
 if(tool==='groupMaker')return <GroupMaker value={value} onChange={onChange} language={language} sound={sound}/>;
 if(tool==='noiseMeter')return <NoiseMeter value={value} onChange={onChange} language={language}/>;
 if(tool==='buzzer')return <Buzzer value={value} onChange={onChange} language={language} sound={sound}/>;
 if(tool==='reaction')return <ReactionTimer value={value} onChange={onChange} language={language} sound={sound}/>;
 if(tool==='classBell')return <ClassBell value={value} onChange={onChange} language={language} sound={sound}/>;
 return null;
}
