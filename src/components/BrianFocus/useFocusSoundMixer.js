import { useEffect, useRef, useState } from 'react';
import { FOCUS_SOUNDS } from './useFocusSoundscape.js';

const DEFAULT_LEVELS={white:0,rain:24,ocean:0,wind:0,forest:0};
const clamp=(n,min=0,max=100)=>Math.min(max,Math.max(min,Number(n)||0));
const key=userId=>'bfc-mixer-v6:'+String(userId||'guest');
function load(userId){
  try{const raw=JSON.parse(localStorage.getItem(key(userId))||'{}');
    return {levels:Object.fromEntries(FOCUS_SOUNDS.map(n=>[n,clamp(raw.levels?.[n]??DEFAULT_LEVELS[n])])),
      master:clamp(raw.master??35)};}
  catch{return {levels:{...DEFAULT_LEVELS},master:35};}
}
function makeBuffer(context,type) {
  const length=context.sampleRate*3;
  const buffer=context.createBuffer(1,length,context.sampleRate);
  const dest=buffer.getChannelData(0);let brown=0;
  for(let i=0;i<length;i++){
    const white=Math.random()*2-1;
    brown=(brown+0.025*white)/1.025;
    dest[i]=['white','rain'].includes(type)?white*.35:brown*2.8;
  }
  return buffer;
}
function createLayer(ctx,destination,type,level) {
  const source=ctx.createBufferSource();source.buffer=makeBuffer(ctx,type);source.loop=true;
  const filter=ctx.createBiquadFilter();
  filter.type=type==='rain'?'highpass':type==='wind'?'bandpass':'lowpass';
  filter.frequency.value=({white:11000,rain:470,ocean:430,wind:500,forest:1650})[type];
  if(type==='wind')filter.Q.value=.55;
  const gain=ctx.createGain();gain.gain.value=clamp(level)/100;
  source.connect(filter).connect(gain).connect(destination);
  source.start();
  return {gain,source};
}
/** One user-driven AudioContext with independent local-only procedural layers. */
export default function useFocusSoundMixer(userId) {
  const [config,setConfig]=useState(()=>load(userId));
  const [loadedOwner,setLoadedOwner]=useState(userId);
  const [playing,setPlaying]=useState(false);
  const [error,setError]=useState('');
  const engine=useRef(null);
  useEffect(()=>{setConfig(load(userId));setLoadedOwner(userId);},[userId]);
  useEffect(()=>{
    if(loadedOwner!==userId)return; // do not copy another account's levels during switch
    try{localStorage.setItem(key(userId),JSON.stringify(config));}catch{}
  },[userId,loadedOwner,config]);
  const stop=async()=>{
    const previous=engine.current;engine.current=null;
    if(previous) {
      previous.layers.forEach(({source})=>{try{source.stop()}catch{}});
      await previous.ctx.close().catch(()=>{});
    }
    setPlaying(false);
  };
  const start=async()=>{
    if(engine.current)return;
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context){setError('Web Audio unavailable');return;}
    try{
      const ctx=new Context();
      const masterGain=ctx.createGain();masterGain.gain.value=clamp(config.master)/100*.34;
      masterGain.connect(ctx.destination);
      const layers=new Map();
      for(const type of FOCUS_SOUNDS)layers.set(type,createLayer(ctx,masterGain,type,config.levels[type]));
      engine.current={ctx,masterGain,layers};
      await ctx.resume();
      setPlaying(true);setError('');
    }catch(e){setError(e?.message||'Audio unavailable');await stop();}
  };
  const setLevel=(type,value)=>{
    if(!FOCUS_SOUNDS.includes(type))return;
    const level=clamp(value);
    setConfig(old=>({...old,levels:{...old.levels,[type]:level}}));
    const actual=engine.current?.layers.get(type);
    if(actual)actual.gain.gain.setTargetAtTime(level/100,engine.current.ctx.currentTime,.05);
  };
  const setMaster=value=>{
    const master=clamp(value);
    setConfig(old=>({...old,master}));
    if(engine.current)engine.current.masterGain.gain.setTargetAtTime(master/100*.34,engine.current.ctx.currentTime,.05);
  };
  const toggleLayer=async type=>{
    if(!FOCUS_SOUNDS.includes(type))return;
    const level=config.levels[type];
    setLevel(type,level>0?0:35);
    if(!playing) await start();
  };
  useEffect(()=>{
    const onUnmute=()=>{void stop();};
    window.addEventListener('bfc-youtube-unmute',onUnmute);
    return()=>window.removeEventListener('bfc-youtube-unmute',onUnmute);
  },[]);
  useEffect(()=>()=>{const prior=engine.current;engine.current=null;
    if(prior){prior.layers.forEach(({source})=>{try{source.stop()}catch{}});prior.ctx.close().catch(()=>{});}
  },[]);
  useEffect(()=>{void stop();},[userId]);
  return { ...config, playing, error, start, stop, setLevel, setMaster, toggleLayer };
}
