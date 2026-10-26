import {createIOSMediaSounds} from './arenaIOSAudio.js';
// Brian Bomb Arena v6 — recorded desktop sounds plus local iOS media fallback.
// Recording: Fg2, Wikimedia Commons, public-domain dedication (PD-self).
// https://commons.wikimedia.org/wiki/File:Explosion-LS100155.ogg
// The sample is served by Wikimedia CDN; synthesizer stays available offline.
export const RECORDED_EXPLOSION_URL='https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b9/Explosion-LS100155.ogg/Explosion-LS100155.ogg.mp3';
export const BOMB_SOUND_STYLES = Object.freeze([
  {id:'recorded',vi:'Tiếng nổ ghi âm thực tế',en:'Real recorded explosion'},
  {id:'cinematic',vi:'Nổ trầm chân thực',en:'Cinematic boom'},
  {id:'arcade',vi:'Nổ game vui nhộn',en:'Arcade blast'},
  {id:'gentle',vi:'Nổ nhẹ cho lớp học',en:'Classroom soft'},
]);
const bounded=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(v))?Number(v):lo));
export function createArenaSound(){
  let context=null,output=null,noiseCache=null,recorded=null;
  const ios=createIOSMediaSounds();
  const iosDevice=ios.isIOS();
  const setupRecording=()=>{
    if(recorded||typeof Audio==='undefined')return recorded;
    const element=new Audio();
    element.preload='auto';
    element.src=RECORDED_EXPLOSION_URL;
    try{element.load();}catch{/* No network: synth fallback on play. */}
    recorded=element;
    return recorded;
  };
  // Preload while teacher is choosing a game, not when the bomb is first opened.
  if(!iosDevice)setupRecording();
  function getAudio(){
    const AC=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
    if(!AC)return null;
    if(!context){
      context=new AC();
      const compressor=context.createDynamicsCompressor();
      compressor.threshold.value=-20;
      compressor.knee.value=15;
      compressor.ratio.value=8;
      compressor.attack.value=.004;
      compressor.release.value=.22;
      output=context.createGain();
      output.gain.value=.62;
      output.connect(compressor);
      compressor.connect(context.destination);
    }
    if(context.state==='suspended')void context.resume().catch(()=>{});
    return context;
  }
  function noise(ctx){
    if(noiseCache)return noiseCache;
    const seconds=1.5,length=Math.ceil(ctx.sampleRate*seconds);
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
    const data=buffer.getChannelData(0);
    let prev=0;
    for(let i=0;i<length;i++){
      // Tiny decorrelation and continuous white noise, avoiding periodic "synth" rattling.
      const white=Math.random()*2-1;
      prev=.94*prev+.06*white;
      data[i]=bounded(white*.84+prev*.16,-1,1);
    }
    noiseCache=buffer;
    return buffer;
  }
  function tone(ctx,{freq=440,end=freq,at,duration=.2,type='sine',gain=.11,attack=.01}){
    const osc=ctx.createOscillator(),amp=ctx.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(Math.max(20,freq),at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),at+duration);
    amp.gain.setValueAtTime(.0001,at);
    amp.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),at+Math.min(attack,duration*.3));
    amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(amp);amp.connect(output);osc.start(at);osc.stop(at+duration+.02);
  }
  function burst(ctx,{at,duration=.22,filter='lowpass',startHz=1500,endHz=190,
    gain=.3,attack=.004,q=.7}){
    const src=ctx.createBufferSource(),eq=ctx.createBiquadFilter(),amp=ctx.createGain();
    src.buffer=noise(ctx);
    eq.type=filter;eq.Q.value=q;
    eq.frequency.setValueAtTime(Math.max(35,startHz),at);
    eq.frequency.exponentialRampToValueAtTime(Math.max(35,endHz),at+duration);
    amp.gain.setValueAtTime(.0001,at);
    amp.gain.exponentialRampToValueAtTime(gain,at+Math.min(attack,duration*.32));
    amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
    src.connect(eq);eq.connect(amp);amp.connect(output);
    src.start(at,0,duration+.01);src.stop(at+duration+.012);
  }
  function cinematic(ctx,t,gain=1){
    // 1. Sharp high-frequency crack (0-90ms).
    burst(ctx,{at:t,duration:.095,filter:'highpass',startHz:3200,endHz:780,gain:.42*gain,attack:.003});
    // 2. Wide middle "impact" layer.
    burst(ctx,{at:t+.012,duration:.43,filter:'bandpass',startHz:1100,endHz:145,q:.72,gain:.66*gain,attack:.013});
    // 3. Low frequency air pressure and room rumble (physically distinct decay).
    burst(ctx,{at:t+.025,duration:1.08,filter:'lowpass',startHz:820,endHz:95,gain:.53*gain,attack:.022});
    tone(ctx,{freq:132,end:39,at:t+.018,duration:.73,type:'triangle',gain:.29*gain,attack:.019});
    tone(ctx,{freq:76,end:31,at:t+.035,duration:.92,type:'sine',gain:.18*gain,attack:.03});
    // 4. Debris falling, several discrete crackles—not a ringing bell tone.
    const taps=[.12,.165,.23,.29,.35,.415,.5,.59];
    taps.forEach((offset,i)=>burst(ctx,{at:t+offset,duration:.027+(i%3)*.015,
      filter:'bandpass',startHz:2800+i*150,endHz:1200+i*90,q:1.1,
      gain:(.11-(i*.008))*gain,attack:.002}));
    // 5. Distant reflected burst for a cinematic tail.
    burst(ctx,{at:t+.27,duration:.87,filter:'lowpass',startHz:480,endHz:85,
      gain:.18*gain,attack:.04});
  }
  function arcade(ctx,t){
    burst(ctx,{at:t,duration:.23,filter:'bandpass',startHz:2600,endHz:250,gain:.37,attack:.003});
    tone(ctx,{freq:390,end:62,at:t,duration:.42,type:'sawtooth',gain:.20,attack:.007});
    tone(ctx,{freq:140,end:45,at:t+.03,duration:.32,type:'triangle',gain:.16,attack:.01});
    [0,.09,.18].forEach((offset,i)=>burst(ctx,{at:t+.14+offset,duration:.095,
      filter:'highpass',startHz:1800,endHz:650,gain:.07-i*.015,attack:.003}));
  }
  function gentle(ctx,t){
    burst(ctx,{at:t,duration:.29,filter:'lowpass',startHz:980,endHz:170,gain:.24,attack:.012});
    tone(ctx,{freq:170,end:65,at:t,duration:.38,type:'triangle',gain:.11,attack:.017});
    burst(ctx,{at:t+.17,duration:.29,filter:'lowpass',startHz:550,endHz:180,gain:.075,attack:.026});
  }
  function play(type,{style='recorded',volume=1}={}){
    // Safari may report a running AudioContext while hardware produces silence.
    // Prefer HTMLMediaElement for *every* effect on iOS, including silent-mode iPhones.
    if(iosDevice){
      if(type==='bomb'&&style==='recorded'){
        const media=setupRecording();
        // If the remote recording isn't ready, use a LOCAL synthesized WAV immediately
        // from this exact user gesture rather than awaiting a download / rejected promise.
        if(media&&media.readyState>=2){
          try{
            ios.unlock();
            media.pause();media.currentTime=0;
            const v=bounded(volume,0,100);
            media.volume=Math.min(.9,(v>1?v/100:v)*.82);
            const pending=media.play();
            if(pending?.catch)void pending.catch(()=>ios.play('bomb',volume));
            return true;
          }catch{/* Local iOS fallback below. */}
        }
      }
      return ios.play(type,volume);
    }
    if(type==='bomb'&&style==='recorded'){
      const media=setupRecording();
      if(media){
        try{
          media.pause();
          media.currentTime=0;
          const v=bounded(volume,0,100);
          media.volume=Math.min(.9,(v>1?v/100:v)*.82);
          const playback=media.play();
          // Browser/network failure falls back to the already available synth.
          if(playback?.catch)void playback.catch(()=>{
            try{const ctx=getAudio();if(ctx)cinematic(ctx,ctx.currentTime+.006,.7);}catch{/* no-op */}
          });
          return true;
        }catch{/* Fall through to synthesized cinematic. */}
      }
      style='cinematic';
    }
    try{
      const ctx=getAudio();
      if(!ctx)return false;
      // Global volume may be set as a percentage 0..100 or fraction 0..1.
      const adjusted=bounded(volume,0,100);
      output.gain.setTargetAtTime((adjusted>1?adjusted/100:adjusted)*.62,ctx.currentTime,.015);
      const t=ctx.currentTime+.008;
      switch(type){
        case 'bomb':
          if(style==='gentle')gentle(ctx,t);
          else if(style==='arcade')arcade(ctx,t);
          else cinematic(ctx,t);
          break;
        case 'flip':tone(ctx,{freq:430,end:620,at:t,duration:.085,type:'triangle',gain:.055});break;
        case 'points':
          [587,784,1047].forEach((f,i)=>tone(ctx,{freq:f,at:t+i*.075,duration:.20,gain:.10}));
          break;
        case 'bigpoints':
          [523,659,784,1047].forEach((f,i)=>tone(ctx,{freq:f,at:t+i*.08,duration:.27,gain:.11}));
          break;
        case 'bank':
          [440,554,659,880,1175].forEach((f,i)=>tone(ctx,{freq:f,at:t+i*.07,duration:.26,type:'triangle',gain:.092}));
          break;
        case 'wrong':
          tone(ctx,{freq:320,end:220,at:t,duration:.19,type:'triangle',gain:.08});
          tone(ctx,{freq:230,end:160,at:t+.13,duration:.22,type:'triangle',gain:.08});
          break;
        case 'win':
          [523,659,784,1047,1318,1568].forEach((f,i)=>tone(ctx,{freq:f,at:t+i*.11,duration:.30,gain:.09}));
          break;
        default:tone(ctx,{at:t,duration:.14,gain:.065});
      }
      return true;
    }catch{return false;} // Audio errors never interfere with game state.
  }
  return {
    play,
    unlock:()=>ios.unlock(),
    getStatus:()=>ios.getStatus(),
    close:()=>{
      ios.close();
      if(recorded){recorded.pause();recorded.removeAttribute('src');recorded.load();recorded=null;}
      if(context){void context.close().catch(()=>{});context=null;output=null;noiseCache=null;}
    },
  };
}
