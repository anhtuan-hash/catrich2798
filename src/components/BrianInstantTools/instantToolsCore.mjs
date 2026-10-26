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
  return base;
}
