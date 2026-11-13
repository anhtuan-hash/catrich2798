import React,{useCallback,useEffect,useRef,useState} from 'react';
import {RotateCcw,Volume2,VolumeX} from 'lucide-react';
import {rankAmericanVoices} from './americanVoices.js';
import './museumStudentVoiceGuide.css';

const STORAGE_KEY='brian-museum-student-auto-us-voice-v1';
function readAutoPreference(){
 try{return window.localStorage.getItem(STORAGE_KEY)!=='off';}catch{return true;}
}

/**
 * Always-on English (United States) guidance for student activities.
 * Playback runs in the browser and never uploads learner data or recordings.
 * Some browsers require a tap before sound is allowed; a visible replay
 * affordance is kept available rather than claiming silent autoplay worked.
 */
export default function MuseumStudentVoiceGuide({cue}){
 const [auto,setAuto]=useState(readAutoPreference);
 const [voices,setVoices]=useState([]),[voiceUri,setVoiceUri]=useState('');
 const [rate,setRate]=useState(.92),[status,setStatus]=useState('idle');
 const lastCue=useRef(''),utterance=useRef(null),watchdog=useRef(null);
 const supported=typeof window!=='undefined'&&'speechSynthesis' in window&&
  typeof window.SpeechSynthesisUtterance==='function';
 const cueKey=cue?.key||'',cueText=cue?.text||'';

 const cancel=useCallback(()=>{
  if(watchdog.current!==null){window.clearTimeout(watchdog.current);watchdog.current=null;}
  if(supported)window.speechSynthesis.cancel();
  utterance.current=null;
 },[supported]);

 const refreshVoices=useCallback(()=>{
  if(!supported)return;
  const found=rankAmericanVoices(window.speechSynthesis.getVoices());
  setVoices(found);
  setVoiceUri(prev=>found.some(v=>v.voiceURI===prev)?prev:(found[0]?.voiceURI||''));
 },[supported]);

 useEffect(()=>{
  if(!supported){setStatus('unsupported');return undefined;}
  const synth=window.speechSynthesis;
  refreshVoices();
  synth.addEventListener?.('voiceschanged',refreshVoices);
  return()=>synth.removeEventListener?.('voiceschanged',refreshVoices);
 },[supported,refreshVoices]);

 // Stop the preceding instruction as soon as a new activity starts or closes.
 useEffect(()=>{
  cancel();
  lastCue.current='';
  setStatus('idle');
 },[cueKey,cancel]);
 useEffect(()=>()=>cancel(),[cancel]);
 useEffect(()=>{
  if(!supported)return undefined;
  const onHide=()=>{if(document.hidden){cancel();setStatus('idle');}};
  document.addEventListener('visibilitychange',onHide);
  return()=>document.removeEventListener('visibilitychange',onHide);
 },[supported,cancel]);

 const play=useCallback(()=>{
  if(!cueKey||!cueText)return;
  if(!supported){setStatus('unsupported');return;}
  const selected=voices.find(v=>v.voiceURI===voiceUri)||voices[0];
  if(!selected){setStatus('no-voice');return;}
  cancel();
  const item=new window.SpeechSynthesisUtterance(cueText);
  item.lang='en-US';
  item.voice=selected;
  item.rate=rate;
  item.pitch=1;
  item.volume=1;
  item.onstart=()=>{
   if(utterance.current===item){
    if(watchdog.current!==null){window.clearTimeout(watchdog.current);watchdog.current=null;}
    setStatus('playing');
   }
  };
  item.onend=()=>{
   if(utterance.current===item){
    utterance.current=null;
    if(watchdog.current!==null){window.clearTimeout(watchdog.current);watchdog.current=null;}
    setStatus('finished');
   }
  };
  item.onerror=e=>{
   if(utterance.current!==item)return;
   utterance.current=null;
   if(watchdog.current!==null){window.clearTimeout(watchdog.current);watchdog.current=null;}
   setStatus(e.error==='not-allowed'||e.error==='audio-busy'?'tap':'failed');
  };
  utterance.current=item;
  setStatus('starting');
  try{
   window.speechSynthesis.speak(item);
   // A silent browser autoplay block does not reliably emit an error event.
   // Show a user-gesture recovery button instead of hanging indefinitely.
   watchdog.current=window.setTimeout(()=>{
    if(utterance.current===item&&!window.speechSynthesis.speaking){
     cancel();
     setStatus('tap');
    }
   },4000);
  }catch{
   cancel();
   setStatus('tap');
  }
 },[cueKey,cueText,supported,voices,voiceUri,rate,cancel]);

 useEffect(()=>{
  if(!cueKey||!auto){cancel();setStatus(auto?'idle':'muted');return;}
  if(!supported){setStatus('unsupported');return;}
  if(!voices.length){setStatus('no-voice');return;}
  if(lastCue.current===cueKey)return;
  lastCue.current=cueKey;
  play();
 },[cueKey,auto,supported,voices,play,cancel]);

 const toggleAuto=()=>{
  const next=!auto;
  try{window.localStorage.setItem(STORAGE_KEY,next?'on':'off');}catch{}
  if(next)lastCue.current='';
  else cancel();
  setAuto(next);
 };
 const replay=()=>{lastCue.current=cueKey;play();};
 const changeVoice=e=>{cancel();lastCue.current='';setVoiceUri(e.target.value);};
 const changeRate=e=>{cancel();lastCue.current='';setRate(Number(e.target.value));};
 const available=supported&&voices.length>0;
 const message=!auto?'Muted':!supported?'Voice unavailable':
  !voices.length?'Install an en-US voice':
  status==='tap'?'Tap replay to enable sound':
  status==='failed'?'Replay to try again':
  status==='playing'?'Speaking…':
  status==='starting'?'Starting…':
  status==='finished'?'Guidance finished':
  cueKey?'Auto guidance on':'Waiting for activity';
 return <aside className="bml-student-voice-guide" data-testid="student-auto-voice"
  aria-label="Automatic American English activity guidance" data-voice-status={status}>
  <button className={'bml-student-voice-toggle '+(auto?'is-on':'is-off')}
   type="button" aria-pressed={auto}
   aria-label={auto?'Turn off automatic US voice guidance':'Turn on automatic US voice guidance'}
   onClick={toggleAuto} title="Automatic US English narration">
   {auto?<Volume2 size={17}/>:<VolumeX size={17}/>}
   <span>US Voice <small>{auto?'AUTO':'OFF'}</small></span>
  </button>
  <button type="button" className="bml-student-voice-replay"
   aria-label="Replay activity guidance" title="Replay English instructions"
   disabled={!cueKey||!available} onClick={replay}>
   <RotateCcw size={17}/>
  </button>
  <details className="bml-student-voice-details">
   <summary title="Read the activity voiceover" aria-label="Read voice guidance transcript">Transcript</summary>
   <div className="bml-student-voice-transcript">
    <strong>{cue?.label||'Activity instructions'}</strong>
    <p lang="en-US">{cueText||'Your next activity will appear here.'}</p>
    <label>US English voice
     <select aria-label="US narrator voice" value={voiceUri} disabled={!available} onChange={changeVoice}>
      {voices.length===0?<option value="">No en-US voice available</option>:null}
      {voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
     </select>
    </label>
    <label>Reading speed
     <select aria-label="Narration speed" value={rate} onChange={changeRate}>
      <option value={.85}>0.85×</option>
      <option value={.92}>0.92×</option>
      <option value={1}>1×</option>
      <option value={1.08}>1.08×</option>
     </select>
    </label>
    <small>The narrator uses only voices identified as English (United States). Browser audio may need one tap to start.</small>
   </div>
  </details>
  <span className="bml-student-voice-status" role="status" aria-live="polite">{message}</span>
 </aside>;
}
