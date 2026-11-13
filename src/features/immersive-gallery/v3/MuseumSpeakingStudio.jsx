import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AudioLines,Mic,MicOff,Play,RotateCcw,Volume2,X} from 'lucide-react';
import './museumSpeakingStudio.css';

import {presentationCueCards,speakingTime} from './museumSpeakingCues.js';

// A local rehearsal. No audio file, transcript, or biometric voice analysis is uploaded.
// Activate only in the teacher's Present and Discuss activity.
export default function MuseumSpeakingStudio({learning={},onClose,enabled=false}){
 const [recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0);
 const [audioUrl,setAudioUrl]=useState(''),[error,setError]=useState('');
 const [listening,setListening]=useState(false),[speed,setSpeed]=useState(0.92);
 const recorder=useRef(null),stream=useRef(null),chunks=useRef([]),urlRef=useRef(''),startAt=useRef(0),clock=useRef(null),audioEl=useRef(null),mounted=useRef(false);
 const cards=useMemo(()=>presentationCueCards(learning),[learning]);
 const script=useMemo(()=>cards.map(c=>c.label+'. '+c.text).join(' '),[cards]);
 const clearClock=()=>{if(clock.current){clearInterval(clock.current);clock.current=null;}};
 const clearAudio=()=>{
  if(audioEl.current){audioEl.current.pause();audioEl.current.currentTime=0;}
  if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current='';}
  setAudioUrl('');
 };
 const releaseTracks=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
 const stop=useCallback(()=>{
  clearClock();
  const current=recorder.current;
  if(current&&current.state!=='inactive')current.stop();
  else releaseTracks();
  setRecording(false);
 },[]);
 const stopSample=()=>{if(typeof window!=='undefined'&&window.speechSynthesis)window.speechSynthesis.cancel();setListening(false);};
 useEffect(()=>{mounted.current=true;return()=>{
  mounted.current=false;clearClock();
  try{if(recorder.current?.state!=='inactive')recorder.current?.stop();}catch{}
  releaseTracks();
  if(urlRef.current)URL.revokeObjectURL(urlRef.current);
  if(typeof window!=='undefined')window.speechSynthesis?.cancel();
 };},[]);
 useEffect(()=>{if(!enabled){stop();stopSample();}},[enabled,stop]);
 const start=async()=>{
  if(!enabled||recording)return;
  setError('');stopSample();clearAudio();setSeconds(0);
  if(typeof window==='undefined'||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   setError('Audio recording is not available in this browser or secure context. You can still use the speaking cue cards.');return;
  }
  try{
   const mic=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!enabled||!mounted.current){mic.getTracks().forEach(t=>t.stop());return;}
   stream.current=mic;
   const types=['audio/webm;codecs=opus','audio/webm','audio/mp4'];
   const mime=types.find(t=>typeof MediaRecorder.isTypeSupported==='function'&&MediaRecorder.isTypeSupported(t))||'';
   const rec=new MediaRecorder(mic,mime?{mimeType:mime}:undefined);
   recorder.current=rec;chunks.current=[];
   rec.ondataavailable=e=>{if(e.data?.size>0)chunks.current.push(e.data);};
   rec.onerror=()=>{setError('Recording could not finish. Please try again.');stop();};
   rec.onstop=()=>{
    releaseTracks();
    if(!mounted.current){chunks.current=[];return;}
    if(chunks.current.length){
     const blob=new Blob(chunks.current,{type:rec.mimeType||'audio/webm'});
     const url=URL.createObjectURL(blob);
     if(urlRef.current)URL.revokeObjectURL(urlRef.current);
     urlRef.current=url;setAudioUrl(url);
    }
    chunks.current=[];
    setRecording(false);
   };
   rec.start(250);startAt.current=Date.now();setRecording(true);
   clock.current=window.setInterval(()=>{
    const n=Math.min(60,Math.floor((Date.now()-startAt.current)/1000));
    setSeconds(n);
    if(n>=60)stop();
   },250);
  }catch(e){
   releaseTracks();
   setError(e?.name==='NotAllowedError'?'Microphone permission was not granted. You may rehearse without recording.':'The microphone could not be started. Check the browser permission and try again.');
  }
 };
 const speak=()=>{
  setError('');if(!enabled)return;
  if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){
   setError('Text-to-speech is not supported by this browser. Use the written cues.');return;
  }
  stopSample();
  const utterance=new SpeechSynthesisUtterance(script);
  utterance.lang='en-US';utterance.rate=speed;
  const voices=window.speechSynthesis.getVoices();
  utterance.voice=voices.find(v=>v.lang==='en-US')||voices.find(v=>v.lang?.startsWith('en'))||null;
  utterance.onend=()=>setListening(false);utterance.onerror=()=>setListening(false);
  window.speechSynthesis.speak(utterance);setListening(true);
 };
 return <div className="bml-speaking-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!recording)onClose?.();}}>
  <section role="dialog" aria-modal="true" aria-label="English Speaking Studio" data-testid="museum-speaking-studio"
   className="bml-speaking-dialog">
   <header className="bml-speaking-head"><div><span>ACTIVITY 10 · PRESENT AND DISCUSS</span>
    <h2>English Speaking Studio</h2><p>Practise a 45–60-second museum pitch in English. The recording stays on this device.</p></div>
    <button type="button" onClick={()=>{stop();stopSample();onClose?.();}} aria-label="Close Speaking Studio"><X size={20}/></button>
   </header>
   <div className="bml-speaking-cues" aria-label="Presentation cue cards">
    {cards.map((c,i)=><article key={c.label}><strong>{String(i+1).padStart(2,'0')} · {c.label}</strong><p>{c.text}</p></article>)}
   </div>
   <div className="bml-speaking-sample"><button type="button" onClick={listening?stopSample:speak} disabled={!enabled}>
    {listening?<MicOff size={17}/>:<Volume2 size={17}/>}
    {listening?'Stop sample':'Listen to English sample'}</button>
    <label>Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))} disabled={listening}>
     <option value={0.82}>Slow</option><option value={0.92}>Practice</option><option value={1}>Normal</option>
    </select></label>
    <small>The browser selects an available English voice; pronunciation is not automatically graded.</small>
   </div>
   <div className="bml-speaking-record">
    <div className="bml-speaking-counter"><AudioLines size={23}/><strong>{speakingTime(seconds)}</strong>
     <span>{recording?'Recording…':audioUrl?'Recording ready for local review':'Target: 00:45–01:00'}</span></div>
    <div className="bml-speaking-actions">
     {!recording?<button className="bml-speaking-primary" type="button" disabled={!enabled} onClick={start}>
      <Mic size={18}/>{audioUrl?'Record again':'Start local recording'}</button>:
      <button className="bml-speaking-stop" type="button" onClick={stop}><MicOff size={18}/>Stop recording</button>}
     {audioUrl&&!recording?<button type="button" onClick={()=>{clearAudio();setSeconds(0);}}><RotateCcw size={17}/>Delete recording</button>:null}
    </div>
    {audioUrl&&!recording?<div className="bml-speaking-playback"><strong><Play size={15}/>Listen to your rehearsal</strong>
     <audio ref={audioEl} controls src={audioUrl} preload="none" aria-label="Your local rehearsal recording"/></div>:null}
    {error?<p role="alert" className="bml-speaking-error">{error}</p>:null}
   </div>
   <footer>Microphone use begins only after you select Record. No audio is automatically uploaded, saved to a server, or evaluated by AI.</footer>
  </section>
 </div>;
}
