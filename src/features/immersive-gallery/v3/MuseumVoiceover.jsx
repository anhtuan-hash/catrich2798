import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Pause,Play,RefreshCcw,Volume2,VolumeX} from 'lucide-react';
import {teacherVoiceover} from './museumLiveExtensions.js';
import {rankAmericanVoices} from './americanVoices.js';

// Local browser TTS: never records pupils, never sends text to our own TTS server.
// We only present voices marked en-US. Browser voice quality/availability is OS-dependent.
export default function MuseumVoiceover({stage,language='vi',compact=false}){
 const [supported,setSupported]=useState(false),[voices,setVoices]=useState([]);
 const [voiceUri,setVoiceUri]=useState('');
 const [playing,setPlaying]=useState(false),[paused,setPaused]=useState(false);
 const [rate,setRate]=useState(.9),[error,setError]=useState('');
 const utterance=useRef(null);
 const text=useMemo(()=>teacherVoiceover(stage),[stage]);
 const stop=useCallback(()=>{
  if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();
  utterance.current=null;setPlaying(false);setPaused(false);
 },[]);
 const updateVoices=useCallback(()=>{
  if(typeof window==='undefined'||!('speechSynthesis' in window))return;
  const found=rankAmericanVoices(window.speechSynthesis.getVoices());
  setVoices(found);
  setVoiceUri(current=>found.some(v=>v.voiceURI===current)?current:(found[0]?.voiceURI||''));
 },[]);
 useEffect(()=>{
  const available=typeof window!=='undefined'&&'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
  setSupported(available);
  if(!available)return;
  const synth=window.speechSynthesis;
  updateVoices();
  synth.addEventListener?.('voiceschanged',updateVoices);
  return()=>synth.removeEventListener?.('voiceschanged',updateVoices);
 },[updateVoices]);
 useEffect(()=>{stop();return stop;},[text,stop]);
 const start=()=>{
  if(!supported){setError(language==='en'?'Voiceover is not supported in this browser.':'Trình duyệt này chưa hỗ trợ đọc lời dẫn.');return;}
  const list=rankAmericanVoices(window.speechSynthesis.getVoices());
  const chosen=list.find(v=>v.voiceURI===voiceUri)||list[0];
  if(!chosen){
   setError(language==='en'?'No American English (en-US) voice is installed. Add an en-US system voice, then refresh the list.':'Thiết bị chưa có giọng English (United States) (en-US). Hãy cài giọng Mỹ trong hệ điều hành rồi bấm Tải lại giọng.');
   setVoices([]);return;
  }
  stop();setError('');
  const item=new SpeechSynthesisUtterance(text);
  item.lang='en-US';item.voice=chosen;item.rate=rate;item.pitch=1;item.volume=1;
  item.onend=()=>{if(utterance.current===item){setPlaying(false);setPaused(false);}};
  item.onerror=e=>{if(utterance.current===item){setPlaying(false);setPaused(false);
   if(e.error!=='canceled'&&e.error!=='interrupted')setError(language==='en'?'American English voice playback failed. Please select another en-US voice.':'Không thể phát giọng Mỹ đã chọn. Hãy thử giọng en-US khác.');}};
  utterance.current=item;window.speechSynthesis.speak(item);setPlaying(true);setPaused(false);
 };
 const toggle=()=>{
  if(!playing)return start();
  if(paused){window.speechSynthesis.resume();setPaused(false);}
  else{window.speechSynthesis.pause();setPaused(true);}
 };
 const available=supported&&voices.length>0;
 return <section className={'bml-voiceover '+(compact?'is-compact':'')} data-testid="museum-voiceover">
  <div className="bml-voiceover-title"><Volume2 size={19}/><strong>American English Voiceover · en-US</strong>
   <small>{language==='en'?'On-device narrator · no recording':'Giọng đọc trên thiết bị · không ghi âm'}</small></div>
  <label className="bml-voice-choice">{language==='en'?'US English voice':'Chọn giọng Anh Mỹ'}
   <select aria-label="American English voice" value={voiceUri} disabled={!available}
    onChange={e=>{stop();setVoiceUri(e.target.value);}}>
    {!available?<option value="">{language==='en'?'No en-US voice available':'Chưa tìm thấy giọng en-US'}</option>:null}
    {voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} · en-US</option>)}
   </select>
  </label>
  <div className="bml-voiceover-actions">
   <button type="button" onClick={toggle} disabled={!available}
    aria-label={playing?(paused?'Continue voiceover':'Pause voiceover'):'Play voiceover'}>
    {playing?(paused?<Play size={17}/>:<Pause size={17}/>):<Volume2 size={17}/>}
    {playing?(paused?(language==='en'?'Resume':'Tiếp tục'):(language==='en'?'Pause':'Tạm dừng')):(language==='en'?'Play narration':'Phát lời dẫn')}</button>
   <button type="button" onClick={stop} disabled={!playing} aria-label="Stop voiceover"><VolumeX size={17}/>{language==='en'?'Stop':'Dừng'}</button>
   <button type="button" onClick={updateVoices} aria-label="Refresh American voices"><RefreshCcw size={16}/>{language==='en'?'Refresh voices':'Tải lại giọng'}</button>
   <label>Speed <select value={rate} onChange={e=>{stop();setRate(Number(e.target.value));}} aria-label="Voiceover speed">
    <option value={.8}>{'0.8×'}</option><option value={.9}>{'0.9×'}</option><option value={1}>{'1×'}</option><option value={1.1}>{'1.1×'}</option>
   </select></label>
  </div>
  <details><summary>{language==='en'?'Read the transcript':'Xem kịch bản lời dẫn'}</summary>
   <p lang="en">{text}</p></details>
  {!supported?<small>{language==='en'?'Voiceover requires a browser with Speech Synthesis support.':'Voiceover chỉ hoạt động trên trình duyệt có hỗ trợ Speech Synthesis.'}</small>:null}
  {supported&&!voices.length?<small role="status">{language==='en'?'Install an English (United States) system voice. We do not substitute another accent.':'Hãy cài giọng English (United States) trong macOS/Windows. BRIAN không tự chuyển sang giọng Anh-Anh hay giọng khác.'}</small>:null}
  {error?<p role="alert" className="bml-live-media-error">{error}</p>:null}
 </section>;
}
