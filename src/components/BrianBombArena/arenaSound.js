// Synthesized audio, all local Web Audio (no hosted assets, subscriptions or AI).
// Each call originates from a user click, keeping browser autoplay policy intact.
export function createArenaSound(){
  let audio=null;
  const get=()=>{
    const AC=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
    if(!AC)return null;
    if(!audio)audio=new AC();
    if(audio.state==='suspended')void audio.resume().catch(()=>{});
    return audio;
  };
  const note=(ctx,freq,start,duration=0.17,kind='sine',volume=.11,endFreq=freq)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=kind;o.frequency.setValueAtTime(Math.max(1,freq),start);
    if(endFreq!==freq)o.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),start+duration);
    g.gain.setValueAtTime(.0001,start);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.014);
    g.gain.exponentialRampToValueAtTime(.0001,start+duration);
    o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+duration+.01);
  };
  const explosion=(ctx,start)=>{
    // Filtered noise + bass pitch drop = a tangible, speaker-safe explosion.
    const duration=.65,length=Math.ceil(ctx.sampleRate*duration);
    const buffer=ctx.createBuffer(1,length,ctx.sampleRate),channel=buffer.getChannelData(0);
    for(let i=0;i<length;i++)channel[i]=(Math.random()*2-1)*Math.exp(-i/(length*.19));
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    src.buffer=buffer;filter.type='lowpass';
    filter.frequency.setValueAtTime(3800,start);
    filter.frequency.exponentialRampToValueAtTime(160,start+.59);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.5,start+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,start+.63);
    src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    src.start(start);src.stop(start+duration);
    note(ctx,130,start,.5,'sawtooth',.2,44);
    note(ctx,75,start+.035,.4,'triangle',.13,35);
  };
  const play=type=>{
    try{
      const ctx=get();if(!ctx)return;
      const t=ctx.currentTime+.006;
      switch(type){
        case 'flip':
          note(ctx,430,t,.085,'triangle',.045,640);break;
        case 'points':
          note(ctx,580,t,.19,'sine',.09);
          note(ctx,780,t+.085,.23,'sine',.11);
          note(ctx,1046,t+.17,.26,'sine',.09);break;
        case 'bigpoints':
          [523,659,784,1046].forEach((f,i)=>note(ctx,f,t+i*.08,.25,'sine',.11));break;
        case 'bank':
          [440,554,659,880,1175].forEach((f,i)=>note(ctx,f,t+i*.07,.27,'triangle',.095));break;
        case 'bomb':explosion(ctx,t);break;
        case 'wrong':
          note(ctx,310,t,.15,'triangle',.075,250);
          note(ctx,220,t+.1,.21,'triangle',.08,160);break;
        case 'win':
          [523,659,784,1046,1318,1568].forEach((f,i)=>note(ctx,f,t+i*.11,.32,'sine',.1));break;
        default:note(ctx,600,t,.14,'sine',.07);
      }
    }catch{/* No audio device or blocked Web Audio must never stop the game. */}
  };
  return {play,close:()=>{if(audio){void audio.close().catch(()=>{});audio=null;}}};
}
