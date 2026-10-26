import {sanitizeWave3} from './instantToolsWave3Core.mjs';
import {sanitizeWave4} from './instantToolsWave4Core.mjs';
// Pure, network-free helpers for Brian Instant Tools.
export const STORE_VERSION=1;
export const DEFAULT_NAMES=['Team 1','Team 2','Team 3','Team 4'];
export const PALETTE=['#7566df','#0b9c91','#f0a23c','#e56a83','#3886d5','#9d6cb9','#73ad61','#dd8050'];
export const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(value))?Number(value):min));
export const initialState=()=>({
  sound:true,
  dice:{count:2,values:[1,1],history:[]},
  wheel:{names:[...DEFAULT_NAMES],rotation:0,winner:null},
  scoreboard:{teams:DEFAULT_NAMES.map((name,i)=>({id:'team-'+(i+1),name,score:0})),undo:[]},
  timers:{items:Array.from({length:4},(_,i)=>({
    id:'timer-'+(i+1),label:'Team '+(i+1),durationSeconds:180,remainingMs:180000,endsAt:null,running:false,alerted:false,
  }))},
  qr:{input:'https://esl-brian.vercel.app'},
  spotlight:{radius:155,dim:82},
  bigText:{text:'Ready to learn?',fontSize:110,theme:'midnight'},
  teleprompter:{script:'Good afternoon, everyone! Welcome to our English lesson.\nToday we will learn, explore, and create together.',fontSize:38,speed:45,mirror:false,theme:'dark'},
  reveal:{items:['Warm-up','Vocabulary','Grammar','Reading','Speaking','Wrap-up'],revealed:[]},
  soundFX:{volume:70},
  ...sanitizeWave3(null),
  ...sanitizeWave4(null),
});
const safeName=(value,fallback,max=32)=>String(value??'').trim().slice(0,max)||fallback;
const list=(v)=>Array.isArray(v)?v:[];
export function normalizeWheelNames(input){
  const raw=Array.isArray(input)?input:String(input??'').split(/\r?\n/);
  const seen=new Set(),out=[];
  for(const item of raw){
    const name=String(item??'').trim().slice(0,32);
    const key=name.toLocaleLowerCase();
    if(!name||seen.has(key))continue;
    seen.add(key);out.push(name);
    if(out.length===16)break;
  }
  return out.length>=2?out:null;
}
export function storageKey(userId){
  if(typeof userId!=='string'||!/^[a-z0-9_-]{1,128}$/i.test(userId))return null;
  return 'bes:instant-tools:v1:'+userId.toLowerCase();
}
export function secureInt(min,max,cryptoSource=globalThis.crypto){
  const lo=Math.ceil(min),hi=Math.floor(max),range=hi-lo+1;
  if(!(range>0&&range<=65536))throw Error('Invalid range');
  if(cryptoSource?.getRandomValues){
    const maxUint=0x100000000,limit=maxUint-maxUint%range,bytes=new Uint32Array(1);
    do{cryptoSource.getRandomValues(bytes);}while(bytes[0]>=limit);
    return lo+(bytes[0]%range);
  }
  return lo+Math.floor(Math.random()*range);
}
export function diceRoll(count,random=secureInt){
  return Array.from({length:Math.round(clamp(count,1,6))},()=>random(1,6));
}
export function wheelTarget(rotation,index,count){
  const sector=360/count;
  const target=((360-((index+.5)*sector)%360)%360);
  const current=((rotation%360)+360)%360;
  const delta=((target-current+360)%360)+360*5;
  return rotation+delta;
}
export function timerRemaining(timer,now=Date.now()){
  return Math.max(0,Math.min(timer.durationSeconds*1000,
    timer.running&&Number.isFinite(timer.endsAt)?timer.endsAt-now:timer.remainingMs));
}
export function formatClock(ms){
  const sec=Math.ceil(Math.max(0,ms)/1000);
  return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}
export function scoreLeaders(teams){
  if(!teams.length)return [];
  const top=Math.max(...teams.map(t=>t.score));
  return top<=0?[]:teams.filter(t=>t.score===top).map(t=>t.id);
}
export function makeQrInput(input){
  const val=String(input??'').trim();
  if(!val) return {error:'empty'};
  if(val.length>900)return {error:'long'};
  if(/^[a-z][a-z0-9+.-]*:/i.test(val)&&!/^https?:\/\//i.test(val))return {error:'protocol'};
  if(/^https?:\/\//i.test(val)){
    try{
      const u=new URL(val);
      if(!u.hostname||u.username||u.password)return {error:'protocol'};
      return {value:val,kind:'url'};
    }catch{return {error:'invalid'};}
  }
  return {value:val,kind:'text'};
}
export function sanitizeState(raw){
  const base=initialState();
  if(!raw||typeof raw!=='object'||raw.version!==STORE_VERSION)return base;
  const s=raw.state;
  if(!s||typeof s!=='object')return base;
  base.sound=s.sound!==false;
  const d=s.dice||{};
  base.dice.count=Math.round(clamp(d.count,1,6));
  base.dice.values=list(d.values).slice(0,6).map(x=>Math.round(clamp(x,1,6)));
  if(!base.dice.values.length)base.dice.values=[1];
  base.dice.history=list(d.history).slice(0,8).map(x=>list(x).slice(0,6).map(n=>Math.round(clamp(n,1,6))));
  const w=s.wheel||{},names=normalizeWheelNames(w.names);
  base.wheel.names=names||[...DEFAULT_NAMES];
  base.wheel.rotation=clamp(w.rotation,0,100000000);
  base.wheel.winner=typeof w.winner==='string'?w.winner.slice(0,32):null;
  const sc=s.scoreboard||{},teamList=list(sc.teams).slice(0,8);
  if(teamList.length>=2){
    base.scoreboard.teams=teamList.map((t,i)=>({
      id:'team-'+(i+1),name:safeName(t?.name,'Team '+(i+1)),score:Math.round(clamp(t?.score,-999,9999)),
    }));
  }
  base.scoreboard.undo=[]; // never persist an unbounded stack with stale identifiers
  const timerItems=list(s.timers?.items).slice(0,8);
  if(timerItems.length){
    base.timers.items=timerItems.map((t,i)=>{
      const durationSeconds=Math.round(clamp(t?.durationSeconds,60,3600));
      const endsAt=typeof t?.endsAt==='number'&&Number.isFinite(t.endsAt)?t.endsAt:null;
      return {
        id:'timer-'+(i+1),label:safeName(t?.label,'Team '+(i+1)),
        durationSeconds,remainingMs:Math.round(clamp(t?.remainingMs,0,durationSeconds*1000)),
        running:Boolean(t?.running&&endsAt),endsAt,alerted:Boolean(t?.alerted),
      };
    });
  }
  base.qr.input=typeof s.qr?.input==='string'?s.qr.input.slice(0,900):base.qr.input;
  base.spotlight.radius=Math.round(clamp(s.spotlight?.radius??base.spotlight.radius,90,260));
  base.spotlight.dim=Math.round(clamp(s.spotlight?.dim??base.spotlight.dim,45,95));
  base.bigText.text=cleanText(s.bigText?.text,400,base.bigText.text);
  base.bigText.fontSize=Math.round(clamp(s.bigText?.fontSize??base.bigText.fontSize,52,220));
  base.bigText.theme=['midnight','ivory','neon'].includes(s.bigText?.theme)?s.bigText.theme:'midnight';
  base.teleprompter.script=cleanText(s.teleprompter?.script,12000,base.teleprompter.script);
  base.teleprompter.fontSize=Math.round(clamp(s.teleprompter?.fontSize??base.teleprompter.fontSize,12,80));
  base.teleprompter.speed=Math.round(clamp(s.teleprompter?.speed??base.teleprompter.speed,12,160));
  base.teleprompter.mirror=s.teleprompter?.mirror===true;
  base.teleprompter.theme=s.teleprompter?.theme==='light'?'light':'dark';
  const cards=normalizeRevealItems(s.reveal?.items);
  if(cards)base.reveal.items=cards;
  base.reveal.revealed=Array.isArray(s.reveal?.revealed)?[...new Set(s.reveal.revealed.filter(n=>Number.isInteger(n)&&n>=0&&n<base.reveal.items.length))]:[];
  base.soundFX.volume=Math.round(clamp(s.soundFX?.volume??base.soundFX.volume,0,100));
  Object.assign(base,sanitizeWave3(s));
  Object.assign(base,sanitizeWave4(s));
  return base;
}

export function cleanText(value,max,fallback=''){
  return typeof value==='string'?value.slice(0,max):fallback;
}
export function normalizeRevealItems(input){
  const items=(Array.isArray(input)?input:String(input??'').split(/\r?\n/))
    .map(x=>String(x??'').trim().slice(0,120)).filter(Boolean).slice(0,24);
  return items.length?items:null;
}
export function spotlightStyle(x,y,radius,dim){
  const r=Math.round(clamp(radius,90,260));
  const a=clamp(dim,45,95)/100;
  const px=Math.round(clamp(x,0,100000)),py=Math.round(clamp(y,0,100000));
  return 'radial-gradient(circle '+r+'px at '+px+'px '+py+'px, transparent 0%, transparent '+Math.max(1,r-2)+'px, rgba(4,12,30,'+a+') '+(r+4)+'px)';
}
export function soundFXVolume(n){return clamp(n,0,100)/100;}
