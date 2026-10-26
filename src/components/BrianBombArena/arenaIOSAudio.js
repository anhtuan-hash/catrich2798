// iOS Safari and standalone PWA resilient sound path.
// HTMLMediaElement output is preferred on iOS because Web Audio can become
// inaudible under the Ring/Silent switch and after background interruptions.
// Sounds are synthesized into LOCAL 16-bit WAV blobs, not fetched from a CDN.
const isIOS=()=>typeof navigator!=='undefined'&&(
  /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
  (/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1)
);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
function setPlaybackSession(){
  if(typeof navigator==='undefined')return;
  try{
    if(navigator.audioSession&&navigator.audioSession.type!=='playback'){
      navigator.audioSession.type='playback';
    }
  }catch{/* Not all Safari versions implement AudioSession. */}
}
function tone(f,t,duration,kind){
  const local=Math.max(0,t);
  if(kind==='bomb'){
    // Deep falling bass and filtered, decaying broadband impact.
    const boom=Math.sin(2*Math.PI*(114*local-95*local*local/2));
    const impact=Math.sin(2*Math.PI*34*local)*.35;
    return (boom*.52+impact)*Math.exp(-local*4.6);
  }
  const wave=Math.sin(2*Math.PI*f*local);
  const ramp=Math.min(1,local/.008)*Math.max(0,1-local/duration);
  return wave*ramp;
}
export function createLocalAudioWav(type){
  const rate=22050;
  const duration=type==='bomb'?1.1:type==='bank'?.59:type==='win'?.8:type==='wrong'?.38:type==='flip'?.12:.42;
  const frames=Math.ceil(rate*duration);
  const bytes=new ArrayBuffer(44+frames*2),view=new DataView(bytes);
  const ascii=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
  ascii(0,'RIFF');view.setUint32(4,36+frames*2,true);ascii(8,'WAVE');
  ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
  view.setUint16(22,1,true);view.setUint32(24,rate,true);
  view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  ascii(36,'data');view.setUint32(40,frames*2,true);
  const notes=type==='bank'?[440,554,659,880,1175]:type==='win'?[523,659,784,1046,1318,1568]:
    type==='bigpoints'?[523,659,784,1046]:type==='points'?[587,784,1047]:
    type==='wrong'?[310,220]:[440];
  let seed=0x5a9f31;
  for(let i=0;i<frames;i++){
    const t=i/rate;
    let v=0;
    if(type==='bomb'){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const noise=(seed/4294967295)*2-1;
      const snap=noise*Math.exp(-t*26)*.75;
      const rumble=noise*Math.exp(-t*5.2)*.24;
      v=snap+rumble+tone(114,t,duration,'bomb');
    }else if(type==='flip'){
      v=tone(430+t*1450,t,duration,'note')*.55;
    }else{
      const each=type==='wrong'?.13:.09;
      for(let j=0;j<notes.length;j++){
        const u=t-j*each;
        if(u>=0&&u<.23)v+=tone(type==='wrong'?notes[j]-u*200:notes[j],u,.23,'note')*.42;
      }
    }
    // Soft limiting ensures iPhone speakers are never overdriven.
    view.setInt16(44+i*2,Math.round(Math.tanh(v*.85)*23000),true);
  }
  return new Blob([bytes],{type:'audio/wav'});
}
export function createIOSMediaSounds(){
  const cache=new Map();
  const playing=new Set();
  let state='idle';
  const getURL=type=>{
    if(!cache.has(type))cache.set(type,URL.createObjectURL(createLocalAudioWav(type)));
    return cache.get(type);
  };
  const play=(type,volume=75)=>{
    if(typeof Audio==='undefined')return false;
    try{
      setPlaybackSession();
      const audio=new Audio(getURL(type));
      audio.preload='auto';
      audio.volume=clamp(volume,0,100)/100;
      audio.setAttribute('playsinline','');
      playing.add(audio);
      const tidy=()=>{playing.delete(audio);audio.onended=null;audio.onerror=null;};
      audio.onended=tidy;audio.onerror=()=>{state='error';tidy();};
      // play() is synchronously invoked in the pointer/click event.
      const result=audio.play();
      state='requested';
      if(result&&typeof result.then==='function'){
        void result.then(()=>{state='playing';}).catch(()=>{state='blocked';tidy();});
      }
      return true;
    }catch{state='error';return false;}
  };
  return {
    play, getStatus:()=>state, isIOS:isIOS,
    unlock:()=>{setPlaybackSession();return true;},
    close:()=>{
      for(const player of playing){try{player.pause();player.removeAttribute('src');}catch{/* cleanup */}}
      playing.clear();
      for(const url of cache.values())URL.revokeObjectURL(url);
      cache.clear();
    },
  };
}
