import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Pause,Play,RotateCcw,Volume2,VolumeX} from 'lucide-react';
import {teacherVoiceover} from './museumLiveExtensions.js';

// Local browser speech: never uploads microphone audio or student recordings.
// Voice availability and playback vary by browser/OS. No voice clone or fake narration.
export default function MuseumVoiceover({stage,language='vi',compact=false}){
 const [supported,setSupported]=useState(false),[playing,setPlaying]=useState(false);
 const [paused,setPaused]=useState(false),[rate,setRate]=useState(.9),[error,setError]=useState('');
 const utterance=useRef(null);
 const text=useMemo(()=>teacherVoiceover(stage),[stage]);
 useEffect(()=>{setSupported(typeof window!=='undefined'&&'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window);},[]);
 const stop=useCallback(()=>{
  if(typeof window!=='undefined'&&'speechSynthesis' in window)window.speechSynthesis.cancel();
  utterance.current=null;setPlaying(false);setPaused(false);
 },[]);
 useEffect(()=>{stop();return stop;},[text,stop]);
 const start=()=>{
  if(!supported){setError(language==='en'?'Voiceover is not supported in this browser.':'Trình duyệt này chưa hỗ trợ đọc lời dẫn.');return;}
  stop();setError('');
  const item=new SpeechSynthesisUtterance(text);
  item.lang='en-US';item.rate=rate;item.pitch=1;item.volume=1;
  item.onend=()=>{if(utterance.current===item){setPlaying(false);setPaused(false);}};
  item.onerror=e=>{if(utterance.current===item){setPlaying(false);setPaused(false);if(e.error!=='canceled'&&e.error!=='interrupted')setError('Không thể phát voiceover. Hãy thử lại hoặc đổi trình duyệt.');}};
  utterance.current=item;window.speechSynthesis.speak(item);setPlaying(true);setPaused(false);
 };
 const toggle=()=>{
  if(!supported)return start();
  if(!playing)return start();
  if(paused){window.speechSynthesis.resume();setPaused(false);}
  else{window.speechSynthesis.pause();setPaused(true);}
 };
 return <section className={'bml-voiceover '+(compact?'is-compact':'')} data-testid="museum-voiceover">
  <div className="bml-voiceover-title"><Volume2 size={19}/><strong>English Voiceover</strong>
   <small>{language==='en'?'Browser narrator · no recording':'Giọng đọc trên thiết bị · không ghi âm'}</small></div>
  <div className="bml-voiceover-actions">
   <button type="button" onClick={toggle} disabled={!supported} aria-label={playing?(paused?'Continue voiceover':'Pause voiceover'):'Play voiceover'}>
    {playing?(paused?<Play size={17}/>:<Pause size={17}/>):<Volume2 size={17}/>}
    {playing?(paused?'Tiếp tục':'Tạm dừng'):'Phát lời dẫn'}</button>
   <button type="button" onClick={stop} disabled={!playing} aria-label="Stop voiceover"><VolumeX size={17}/>{language==='en'?'Stop':'Dừng'}</button>
   <label>Speed <select value={rate} onChange={e=>setRate(Number(e.target.value))} aria-label="Voiceover speed">
    <option value={.8}>{'0.8×'}</option><option value={.9}>{'0.9×'}</option><option value={1}>{'1×'}</option><option value={1.1}>{'1.1×'}</option>
   </select></label>
  </div>
  <details><summary>{language==='en'?'Read the transcript':'Xem kịch bản lời dẫn'}</summary>
   <p lang="en">{text}</p></details>
  {!supported?<small>{language==='en'?'Voiceover requires a browser with Speech Synthesis support.':'Voiceover chỉ hoạt động trên trình duyệt có hỗ trợ Speech Synthesis.'}</small>:null}
  {error?<p role="alert" className="bml-live-media-error">{error}</p>:null}
 </section>;
}
