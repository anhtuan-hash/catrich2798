import React from 'react';
import './AwardShowEffects.css';

const fireworks=[
 {x:'18%',y:'19%',color:35,delay:'0ms'},
 {x:'81%',y:'16%',color:280,delay:'110ms'},
 {x:'40%',y:'27%',color:190,delay:'300ms'},
 {x:'66%',y:'24%',color:45,delay:'440ms'},
 {x:'9%',y:'51%',color:330,delay:'620ms'},
 {x:'91%',y:'48%',color:150,delay:'770ms'},
 {x:'51%',y:'12%',color:26,delay:'930ms'}
];
const angles=Array.from({length:16},(_,index)=>index*22.5);
const confetti=Array.from({length:34},(_,index)=>({
 left:(index*73%94+3)+'%',
 delay:(index%11*90)+'ms',
 duration:(2.3+(index%6)*.28)+'s',
 rotation:(index*87%720-360)+'deg',
 color:['#ffcc67','#ff6f4a','#e1a7ff','#84f5f0','#f9e5af'][index%5]
}));

// Sounds are synthesized on a user click; no external audio or autoplay permission is required.
export function playAwardRevealSound(rank,enabled){
 if(!enabled||typeof window==='undefined')return ()=>{};
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)return ()=>{};
 let audio;
 try{audio=new AudioContextClass();void audio.resume().catch(()=>{});}catch{return ()=>{};}
 const master=audio.createGain();
 master.gain.value=.34;
 master.connect(audio.destination);
 const beginning=audio.currentTime+.035;
 const note=(start,frequency,duration,volume,type='sine',endFrequency=frequency)=>{
  const oscillator=audio.createOscillator();
  const envelope=audio.createGain();
  oscillator.type=type;
  oscillator.frequency.setValueAtTime(Math.max(20,frequency),start);
  if(endFrequency!==frequency)oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),start+duration);
  envelope.gain.setValueAtTime(.0001,start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.014);
  envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(envelope);
  envelope.connect(master);
  oscillator.start(start);
  oscillator.stop(start+duration+.025);
 };
 // A cinematic heartbeat rolls into an ascending drumroll.
 for(let index=0;index<17;index++){
  const start=beginning+index*.128;
  note(start,118+(index%3)*13,.105,.095+(index/17)*.042,'triangle',65);
  if(index%3===0)note(start,390+index*12,.075,.017,'square',240);
 }
 note(beginning+.1,94,1.85,.048,'sawtooth',185);
 const reveal=beginning+2.2;
 const melody=rank===1
  ?[523.25,659.25,783.99,1046.5,1318.51]
  :[392,493.88,587.33,783.99,987.77];
 melody.forEach((frequency,index)=>{
  note(reveal+index*.19,frequency,index===4?1.15:.48,.13,'triangle');
  note(reveal+index*.19,frequency/2,index===4?1.2:.43,.065,'sine');
 });
 [261.63,329.63,392,523.25].forEach(frequency=>note(reveal+.88,frequency,1.7,.078,'sine'));
 for(let index=0;index<10;index++){
  note(reveal+.15+index*.16,1244+index*90,.3,.014,'sine',1900+index*90);
 }
 return ()=>{void audio.close().catch(()=>{});};
}

export default function AwardShowEffects({phase,count,rank,burstKey}){
 const suspense=phase==='suspense';
 const burst=phase==='burst';
 return <div className={'brian-awards-fx brian-awards-fx--'+phase} aria-hidden="true">
  <div className="brian-awards-fx-spotlight brian-awards-fx-spotlight--left"/>
  <div className="brian-awards-fx-spotlight brian-awards-fx-spotlight--right"/>
  <div className="brian-awards-fx-smoke brian-awards-fx-smoke--left"/>
  <div className="brian-awards-fx-smoke brian-awards-fx-smoke--right"/>
  {suspense&&<div className="brian-awards-fx-suspense">
   <span>THE NEXT WINNER IS...</span>
   <strong key={count}>{count}</strong>
   <small>HALLOWEEN SHOWCASE · GRAND REVEAL</small>
  </div>}
  {burst&&<React.Fragment key={burstKey}>
   <div className="brian-awards-fx-flash"/>
   <div className="brian-awards-fx-congrats">
    <span>{rank===1?'✦ GRAND CHAMPION ✦':rank===2?'✦ SECOND PRIZE ✦':'✦ THIRD PRIZE ✦'}</span>
   </div>
   {fireworks.map((firework,index)=><div key={index} className="brian-awards-fx-firework"
     style={{left:firework.x,top:firework.y,'--hue':firework.color,'--burst-delay':firework.delay}}>
    {angles.map(angle=><i key={angle} style={{'--angle':angle+'deg'}}/>)}
   </div>)}
   {confetti.map((part,index)=><i key={index} className="brian-awards-fx-confetti" style={{
    left:part.left,'--fall-delay':part.delay,'--fall-duration':part.duration,'--twirl':part.rotation,background:part.color
   }}/>)}
  </React.Fragment>}
 </div>;
}
