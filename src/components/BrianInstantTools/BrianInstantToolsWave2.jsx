import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {
  Flashlight,Type,ScrollText,Layers3,Music2,Play,Pause,RotateCcw,
  Eye,EyeOff,Check,Volume2,X,Maximize2,FlipHorizontal,ArrowUp,
  Bell,Hand,Drum,CheckCircle2,XCircle,Wind,PartyPopper,Clock3,
  Trophy,AlertTriangle,Sparkles,Ghost
} from 'lucide-react';
import {clamp,normalizeRevealItems,spotlightStyle,soundFXVolume} from './instantToolsCore.mjs';
import './BrianInstantToolsWave2.css';

export const WAVE2_LIBRARY=[
 {id:'spotlight',Icon:Flashlight,vi:'Đèn Spotlight',en:'Spotlight',descVi:'Hướng sự chú ý lên màn hình',descEn:'Highlight the screen'},
 {id:'bigText',Icon:Type,vi:'Chữ khổng lồ',en:'Big Text',descVi:'Thông báo cực lớn lên TV',descEn:'Present giant text'},
 {id:'teleprompter',Icon:ScrollText,vi:'Máy nhắc chữ',en:'Teleprompter',descVi:'Cuộn kịch bản theo tốc độ',descEn:'Scroll a script smoothly'},
 {id:'reveal',Icon:Layers3,vi:'Thẻ lật bí mật',en:'Reveal Cards',descVi:'Lật từng câu hỏi hoặc đáp án',descEn:'Reveal cards one by one'},
 {id:'soundFX',Icon:Music2,vi:'Bàn âm thanh',en:'Sound FX',descVi:'12 hiệu ứng âm thanh tức thì',descEn:'12 instant sound effects'}
];
const TEXT={
 vi:{radius:'Bán kính vùng sáng',strength:'Độ tối vùng ngoài',launch:'Bật Spotlight trên trang hiện tại',exit:'Thoát Spotlight',move:'Di chuột hoặc chạm để di chuyển vùng sáng',bright:'Câu chữ muốn trình chiếu',size:'Cỡ chữ',theme:'Giao diện',present:'Trình chiếu',close:'Đóng trình chiếu',dark:'Đêm xanh',light:'Trắng ngà',neon:'Neon',script:'Kịch bản hoặc nội dung',speed:'Tốc độ cuộn',mirror:'Phản chiếu ngang',start:'Bắt đầu',pause:'Tạm dừng',reset:'Về đầu',textHelp:'Dán nội dung rồi bấm bắt đầu. Có thể đổi tốc độ khi chạy.',cards:'Nội dung các thẻ (mỗi dòng một thẻ)',apply:'Áp dụng thẻ',all:'Lật tất cả',hide:'Úp tất cả',count:'Thẻ đã mở',sound:'Âm lượng',soundOff:'Âm thanh toàn cục đang tắt. Bật loa ở góc trên để phát.',soundHelp:'Nhấn một hiệu ứng để phát ngay. Âm thanh tổng hợp trên máy, không tải từ Internet.',noText:'Nhập ít nhất một dòng.',spotHint:'Spotlight không ghi hình hoặc đọc nội dung màn hình.'},
 en:{radius:'Spotlight radius',strength:'Outside dimness',launch:'Activate Spotlight over this page',exit:'Exit Spotlight',move:'Move mouse or touch to reposition the spotlight',bright:'Text to present',size:'Font size',theme:'Theme',present:'Present',close:'Close presentation',dark:'Midnight',light:'Ivory',neon:'Neon',script:'Script or notes',speed:'Scroll speed',mirror:'Mirror horizontally',start:'Start',pause:'Pause',reset:'Back to top',textHelp:'Paste a script and press Start. Adjust speed while playing.',cards:'Card text (one entry per line)',apply:'Apply cards',all:'Reveal all',hide:'Hide all',count:'Revealed cards',sound:'Volume',soundOff:'Master sound is muted. Turn on the speaker in the header to hear cues.',soundHelp:'Tap a sound to play it immediately. Synthesized on-device without downloads.',noText:'Enter at least one line.',spotHint:'Spotlight does not capture or inspect your screen.'}
};
const SOUNDS=[
 {id:'bell',Icon:Bell,vi:'Chuông',en:'Bell',freq:880},
 {id:'applause',Icon:Hand,vi:'Vỗ tay',en:'Applause',freq:480},
 {id:'drum',Icon:Drum,vi:'Trống',en:'Drum',freq:145},
 {id:'correct',Icon:CheckCircle2,vi:'Chính xác',en:'Correct',freq:670},
 {id:'wrong',Icon:XCircle,vi:'Chưa đúng',en:'Incorrect',freq:230},
 {id:'whistle',Icon:Wind,vi:'Còi',en:'Whistle',freq:1070},
 {id:'pop',Icon:PartyPopper,vi:'Bụp!',en:'Pop',freq:355},
 {id:'countdown',Icon:Clock3,vi:'Đếm ngược',en:'Countdown',freq:550},
 {id:'victory',Icon:Trophy,vi:'Chiến thắng',en:'Victory',freq:660},
 {id:'attention',Icon:AlertTriangle,vi:'Chú ý',en:'Attention',freq:520},
 {id:'magic',Icon:Sparkles,vi:'Phép thuật',en:'Magic',freq:850},
 {id:'halloween',Icon:Ghost,vi:'Halloween',en:'Halloween',freq:195},
];
let ctx=null;
function playSoundFX(name,volume){
 const level=soundFXVolume(volume);
 if(level<=0)return false;
 try{
   const AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return false;
   if(!ctx)ctx=new AC();
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
   const time=ctx.currentTime;
   const cue=SOUNDS.find(c=>c.id===name)||SOUNDS[0];
   const frequencies=name==='victory'?[523,659,784,1046]:
     name==='countdown'?[550,550,550,830]:
     name==='correct'?[588,783]:
     name==='wrong'?[360,240]:
     name==='halloween'?[196,173,155]:
     name==='magic'?[960,1160,1460]:
     name==='attention'?[523,523,390]:
     name==='applause'?Array.from({length:10},(_,i)=>320+((i*137)%600)):
     name==='drum'?[155,112,85]:
     name==='bell'?[880,1320]:
     [cue.freq];
   frequencies.forEach((freq,i)=>{
     const osc=ctx.createOscillator(),gain=ctx.createGain();
     const t=time+i*(name==='applause'?.065:.17);
     const length=name==='bell'?.58:name==='whistle'?.65:name==='applause'?.07:.19;
     osc.type=name==='drum'||name==='wrong'||name==='halloween'?'sawtooth':name==='applause'?'triangle':'sine';
     osc.frequency.setValueAtTime(freq,t);
     if(name==='drum'||name==='pop')osc.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.4),t+length);
     gain.gain.setValueAtTime(.0001,t);
     gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level*.09),t+.015);
     gain.gain.exponentialRampToValueAtTime(.0001,t+length);
     osc.connect(gain).connect(ctx.destination);
     osc.start(t);osc.stop(t+length+.018);
   });
   return true;
 }catch{return false;}
}
export function SpotlightOverlay({config,onExit,language='vi'}){
 const t=language==='en'?TEXT.en:TEXT.vi;
 const [pos,setPos]=useState(()=>({x:window.innerWidth/2,y:window.innerHeight/2}));
 useEffect(()=>{
  const handler=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation?.();onExit();}};
  window.addEventListener('keydown',handler,true);
  return ()=>window.removeEventListener('keydown',handler,true);
 },[onExit]);
 const pointerFrame=useRef(null);
 useEffect(()=>()=>cancelAnimationFrame(pointerFrame.current),[]);
 const move=e=>{
  if(pointerFrame.current!==null)return;
  const x=e.clientX,y=e.clientY;
  pointerFrame.current=requestAnimationFrame(()=>{pointerFrame.current=null;setPos({x,y});});
 };
 return createPortal(<div className="bit-spot-overlay" role="dialog" aria-label="Spotlight" aria-modal="true"
   onPointerMove={move} onPointerDown={move}
   style={{background:spotlightStyle(pos.x,pos.y,config.radius,config.dim)}}>
   <div className="bit-spot-toolbar" onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()}>
    <span><Flashlight size={18}/> Spotlight <small>{t.move}</small></span>
    <button type="button" onClick={onExit}><X size={19}/>{t.exit}</button>
   </div>
 </div>,document.body);
}
function SpotlightTool({value,onChange,language,onSpotlightStart}){
 const t=language==='en'?TEXT.en:TEXT.vi;
 return <div className="bit-w2-panel bit-w2-spot">
   <h3><Flashlight/> Spotlight</h3>
   <p>{t.spotHint}</p>
   <div className="bit-w2-field"><label htmlFor="bit-spot-size">{t.radius}: {value.radius}px</label>
    <input id="bit-spot-size" type="range" min="90" max="260" step="10" value={value.radius}
      onChange={e=>onChange(v=>({...v,radius:Number(e.target.value)}))}/></div>
   <div className="bit-w2-field"><label htmlFor="bit-spot-dim">{t.strength}: {value.dim}%</label>
    <input id="bit-spot-dim" type="range" min="45" max="95" step="5" value={value.dim}
      onChange={e=>onChange(v=>({...v,dim:Number(e.target.value)}))}/></div>
   <div className="bit-w2-spot-preview" style={{background:spotlightStyle(170,105,75,value.dim)}} aria-hidden="true"><Flashlight size={22}/></div>
   <button className="bit-primary" type="button" onClick={onSpotlightStart}><Flashlight size={19}/>{t.launch}</button>
 </div>;
}
function BigTextTool({value,onChange,language}){
 const t=language==='en'?TEXT.en:TEXT.vi;
 const [stage,setStage]=useState(false);
 useEffect(()=>{
  if(!stage)return;
  const handler=e=>{if(e.key==='Escape'){e.stopImmediatePropagation?.();e.preventDefault();setStage(false);}};
  window.addEventListener('keydown',handler,true);
  return ()=>window.removeEventListener('keydown',handler,true);
 },[stage]);
 const theme=value.theme;
 const content=<div className={'bit-w2-bigstage theme-'+theme} style={{'--big-size':value.fontSize+'px'}}>
   <div className="bit-w2-bigtext">{value.text||'…'}</div>
 </div>;
 return <div className="bit-w2-two-col">
   <div className="bit-w2-panel">
    <label htmlFor="bit-w2-bigtext">{t.bright}</label>
    <textarea id="bit-w2-bigtext" rows={5} maxLength={400} value={value.text}
      onChange={e=>onChange(x=>({...x,text:e.target.value.slice(0,400)}))}/>
    <label htmlFor="bit-w2-bigsize">{t.size}: {value.fontSize}px</label>
    <input id="bit-w2-bigsize" type="range" min="52" max="220" step="4" value={value.fontSize}
      onChange={e=>onChange(x=>({...x,fontSize:Number(e.target.value)}))}/>
    <div className="bit-w2-theme" role="group" aria-label={t.theme}>
     {['midnight','ivory','neon'].map((id,i)=><button type="button" className={theme===id?'active':''} key={id}
       onClick={()=>onChange(x=>({...x,theme:id}))}>{[t.dark,t.light,t.neon][i]}</button>)}
    </div>
    <button type="button" className="bit-primary" onClick={()=>setStage(true)}><Maximize2 size={18}/>{t.present}</button>
   </div>
   <div className="bit-w2-big-preview">{content}</div>
   {stage&&createPortal(<div role="dialog" aria-modal="true" aria-label="Big Text" className="bit-w2-stage-overlay">
      {content}<button className="bit-w2-stage-close" type="button" onClick={()=>setStage(false)}><X size={22}/>{t.close}</button>
    </div>,document.body)}
 </div>;
}
function TeleprompterTool({value,onChange,language}){
 const t=language==='en'?TEXT.en:TEXT.vi;
 const [playing,setPlaying]=useState(false);
 const viewport=useRef(null),frame=useRef(null),last=useRef(null);
 useEffect(()=>{
  if(!playing)return;
  const step=time=>{
   const element=viewport.current;
   if(element){
    if(last.current!==null)element.scrollTop+=(time-last.current)*value.speed/1000;
    if(element.scrollTop+element.clientHeight>=element.scrollHeight-2){setPlaying(false);return;}
   }
   last.current=time;frame.current=requestAnimationFrame(step);
  };
  last.current=null;frame.current=requestAnimationFrame(step);
  return ()=>{cancelAnimationFrame(frame.current);last.current=null;};
 },[playing,value.speed]);
 useEffect(()=>()=>{
  cancelAnimationFrame(frame.current);
 },[]);
 const reset=()=>{setPlaying(false);if(viewport.current)viewport.current.scrollTop=0;};
 return <div className="bit-w2-two-col">
   <div className="bit-w2-panel">
    <label htmlFor="bit-w2-script">{t.script}</label>
    <textarea id="bit-w2-script" rows={8} maxLength={12000} value={value.script} onChange={e=>onChange(x=>({...x,script:e.target.value.slice(0,12000)}))}/>
    <label htmlFor="bit-w2-speed">{t.speed}: {value.speed}px/s</label>
    <input id="bit-w2-speed" type="range" min="12" max="160" value={value.speed}
      onChange={e=>onChange(x=>({...x,speed:Number(e.target.value)}))}/>
    <label htmlFor="bit-w2-font">{t.size}: {value.fontSize}px</label>
    <input id="bit-w2-font" type="range" min="12" max="80" value={value.fontSize}
      onChange={e=>onChange(x=>({...x,fontSize:Number(e.target.value)}))}/>
    <div className="bit-w2-theme">
      <button type="button" aria-pressed={value.mirror} onClick={()=>onChange(x=>({...x,mirror:!x.mirror}))}><FlipHorizontal size={16}/>{t.mirror}</button>
      <button type="button" onClick={()=>onChange(x=>({...x,theme:x.theme==='dark'?'light':'dark'}))}>{value.theme==='dark'?t.light:t.dark}</button>
    </div>
    <div className="bit-w2-actions">
      <button className="bit-primary" type="button" onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={17}/>:<Play size={17}/>}
        {playing?t.pause:t.start}</button>
      <button className="bit-secondary" type="button" onClick={reset}><RotateCcw size={17}/>{t.reset}</button>
    </div>
    <p>{t.textHelp}</p>
   </div>
   <div className={'bit-w2-tele-stage '+(value.theme==='light'?'theme-light':'theme-dark')} ref={viewport}>
    <div className="bit-w2-tele-text" style={{fontSize:value.fontSize,transform:value.mirror?'scaleX(-1)':'none'}}>{value.script||'…'}</div>
    <div className="bit-w2-tele-end"><ArrowUp size={23}/></div>
   </div>
 </div>;
}
function RevealTool({value,onChange,language}){
 const t=language==='en'?TEXT.en:TEXT.vi;
 const [draft,setDraft]=useState(value.items.join('\n'));
 const [error,setError]=useState('');
 const apply=()=>{
  const items=normalizeRevealItems(draft);
  if(!items){setError(t.noText);return;}
  setError('');onChange(x=>({...x,items,revealed:[]}));
 };
 const reveal=index=>onChange(x=>({...x,revealed:x.revealed.includes(index)?x.revealed.filter(i=>i!==index):[...x.revealed,index]}));
 return <div className="bit-w2-reveal-wrap">
  <div className="bit-w2-panel">
   <label htmlFor="bit-w2-reveal-input">{t.cards}</label>
   <textarea rows={7} id="bit-w2-reveal-input" maxLength={3000} value={draft} onChange={e=>setDraft(e.target.value)}/>
   {error&&<p role="alert" className="bit-error">{error}</p>}
   <button type="button" className="bit-secondary" onClick={apply}><Check size={16}/>{t.apply}</button>
   <span className="bit-w2-count">{t.count}: {value.revealed.length} / {value.items.length}</span>
   <div className="bit-w2-actions">
     <button type="button" className="bit-secondary" onClick={()=>onChange(x=>({...x,revealed:x.items.map((_,i)=>i)}))}><Eye size={16}/>{t.all}</button>
     <button type="button" className="bit-secondary" onClick={()=>onChange(x=>({...x,revealed:[]}))}><EyeOff size={16}/>{t.hide}</button>
   </div>
  </div>
  <div className="bit-w2-reveal-grid">{value.items.map((item,i)=>{
   const shown=value.revealed.includes(i);
   return <button key={i} type="button" className={'bit-w2-reveal-card'+(shown?' is-flipped':'')}
     aria-pressed={shown} onClick={()=>reveal(i)}>
     <span className="bit-w2-reveal-scene" aria-hidden="true">
       <span className="bit-w2-reveal-face bit-w2-reveal-front"><span className="bit-w2-reveal-number">{String(i+1).padStart(2,'0')}</span><strong>?</strong><Layers3 size={21}/></span>
       <span className="bit-w2-reveal-face bit-w2-reveal-back"><span className="bit-w2-reveal-number">{String(i+1).padStart(2,'0')}</span><strong>{item}</strong><Eye size={20}/></span>
     </span>
     <span className="bit-w2-reveal-sr">{shown?item:(language==='en'?'Hidden card':'Thẻ chưa mở')}</span>
   </button>;
  })}</div>
 </div>;
}
function SoundFXTool({value,onChange,language,sound}){
 const t=language==='en'?TEXT.en:TEXT.vi;
 const [last,setLast]=useState('');
 const trigger=id=>{if(sound&&playSoundFX(id,value.volume))setLast(id);};
 return <div className="bit-w2-sounds">
  <div className="bit-w2-sound-head">
   <div><h3><Music2 size={21}/> Sound FX</h3><p>{t.soundHelp}</p>
   {!sound&&<p className="bit-error" role="status">{t.soundOff}</p>}</div>
   <div className="bit-w2-volume"><label htmlFor="bit-w2-volume">{t.sound}: {value.volume}%</label>
    <input id="bit-w2-volume" type="range" min="0" max="100" value={value.volume}
     onChange={e=>onChange(x=>({...x,volume:Number(e.target.value)}))}/></div>
  </div>
  <div className="bit-w2-sound-grid">{SOUNDS.map((cue,i)=><button type="button" className={'bit-w2-sound-card'+(last===cue.id?' is-played':'')} key={cue.id}
    onClick={()=>trigger(cue.id)} style={{'--w2-sfx-color':['#5468d3','#21a997','#cf8b3b','#c46fa6'][i%4]}}>
    <cue.Icon size={29}/><strong>{language==='en'?cue.en:cue.vi}</strong><Volume2 size={15} className="bit-w2-sfx-mini"/></button>)}</div>
 </div>;
}
export function Wave2Tool({tool,value,onChange,language,sound,onSpotlightStart}){
 if(tool==='spotlight')return <SpotlightTool value={value} onChange={onChange} language={language} onSpotlightStart={onSpotlightStart}/>;
 if(tool==='bigText')return <BigTextTool value={value} onChange={onChange} language={language}/>;
 if(tool==='teleprompter')return <TeleprompterTool value={value} onChange={onChange} language={language}/>;
 if(tool==='reveal')return <RevealTool value={value} onChange={onChange} language={language}/>;
 if(tool==='soundFX')return <SoundFXTool value={value} onChange={onChange} language={language} sound={sound}/>;
 return null;
}
