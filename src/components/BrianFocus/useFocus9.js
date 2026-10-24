import {useEffect,useRef,useState} from 'react';

export const SILK_KEY='bfc-silk-flow-v9:';
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
const text=(v,n)=>typeof v==='string'?v.slice(0,n):'';
const nowDate=()=>Date.now();
const empty=()=>({
 performanceMode:'auto',quality:'balanced',shield:false,
 snapshots:[],orbit:[],captures:[],timeline:[],
 recovery:null, lastSnapshot:'',
});
const normalizeTimer=v=>{
 const seconds=clamp(v?.seconds,10,4*3600,300);
 const remaining=clamp(v?.remaining,0,4*3600*1000,seconds*1000);
 return {id:text(v?.id,60)||'timer-'+cryptoId(),label:text(v?.label,52)||'Timer',
  seconds,running:v?.running===true,deadline:clamp(v?.deadline,0,1e14,0),
  remaining,selected:v?.selected===true};
};
const cryptoId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(16).slice(2);
export function silkRemaining(timer,at=Date.now()){
 return timer?.running?Math.max(0,(Number(timer.deadline)||0)-at):Math.max(0,Number(timer?.remaining)||0);
}
export function silkAdvanceTimers(timers=[],at=Date.now()){
 let changed=false;
 const result=timers.map(item=>{
  if(!item.running||silkRemaining(item,at)>0)return item;
  changed=true;
  return {...item,running:false,remaining:0,deadline:0};
 });
 return changed?result:timers;
}
export function sanitizeSilk(input){
 const v=input&&typeof input==='object'?input:{};
 const snap=Array.isArray(v.snapshots)?v.snapshots.slice(-12):[];
 const captures=Array.isArray(v.captures)?v.captures.slice(-100):[];
 const events=Array.isArray(v.timeline)?v.timeline.slice(-500):[];
 return {
  performanceMode:['auto','beautiful','smooth'].includes(v.performanceMode)?v.performanceMode:'auto',
  quality:['beautiful','balanced','smooth'].includes(v.quality)?v.quality:'balanced',
  shield:v.shield===true,
  snapshots:snap.filter(x=>x&&typeof x.name==='string').map(x=>({
   id:text(x.id,70),name:text(x.name,50),at:clamp(x.at,0,1e14,0),
   appearance:x.appearance&&typeof x.appearance==='object'?x.appearance:{},
   focus7:x.focus7&&typeof x.focus7==='object'?x.focus7:{},
   focus8:x.focus8&&typeof x.focus8==='object'?x.focus8:{},
  })),
  orbit:Array.isArray(v.orbit)?v.orbit.slice(0,6).map(normalizeTimer):[],
  captures:captures.filter(x=>x&&typeof x.text==='string').map(x=>({
   id:text(x.id,60),at:clamp(x.at,0,1e14,0),text:text(x.text,400),
   category:['idea','task'].includes(x.category)?x.category:'idea',done:x.done===true,
  })),
  timeline:events.filter(x=>x&&Number.isFinite(x.at)&&['open','close','timer','stage','snapshot','capture','network'].includes(x.type))
    .map(x=>({id:text(x.id,60),at:x.at,type:x.type,label:text(x.label,95)})),
  recovery:v.recovery&&Number.isFinite(v.recovery.at)&&v.recovery.at>Date.now()-86400000
    ?{at:v.recovery.at,intention:text(v.recovery.intention,120),cue:text(v.recovery.cue,40),open:v.recovery.open===true}:null,
  lastSnapshot:text(v.lastSnapshot,70),
 };
}
export function readSilk(userId){
 try{return sanitizeSilk(JSON.parse(localStorage.getItem(SILK_KEY+String(userId||'guest'))||'null'));}
 catch{return sanitizeSilk(empty());}
}
export function silkSnapshot(name,appearance,focus7,focus8){
 return {id:cryptoId(),name:text(name.trim(),50)||'My Space',at:Date.now(),
  appearance:{...appearance},focus7:{...focus7},focus8:{...focus8}};
}
export function silkEvent(type,label,at=Date.now()){
 return {id:cryptoId(),at,type,label:text(label,95)};
}
export function performanceTier(mode,slowStreak,fastStreak,previous='balanced'){
 if(mode==='beautiful')return 'beautiful';
 if(mode==='smooth')return 'smooth';
 if(slowStreak>=3)return 'smooth';
 if(fastStreak>=5)return 'beautiful';
 return previous;
}
export function presenterPayload(stage,timer,at=Date.now()){
 const safe=stage||{};
 return {
  objective:text(safe.title,150),
  activity:text(safe.parts?.[safe.partIndex],80),
  deadline:safe.running?clamp(safe.deadline,0,1e14,0):0,
  timerDeadline:timer?.running?clamp(timer.deadline,0,1e14,0):0,
  sharedAt:at,
  link:/^https:\/\//i.test(safe.url||'')?text(safe.url,500):'',
 };
}
export default function useFocus9(userId){
 const [record,setRecord]=useState(()=>({owner:userId,data:readSilk(userId)}));
 const data=record.owner===userId?record.data:readSilk(userId);
 const latest=useRef(data);latest.current=data;
 useEffect(()=>setRecord({owner:userId,data:readSilk(userId)}),[userId]);
 useEffect(()=>{
  if(record.owner!==userId)return;
  try{localStorage.setItem(SILK_KEY+String(userId||'guest'),JSON.stringify(record.data));}catch{}
 },[record,userId]);
 const update=patch=>setRecord(previous=>{
  const current=previous.owner===userId?previous.data:readSilk(userId);
  const next=typeof patch==='function'?patch(current):{...current,...patch};
  return {owner:userId,data:sanitizeSilk(next)};
 });
 const event=(type,label)=>update(current=>({...current,
  timeline:[...current.timeline,silkEvent(type,label)].slice(-500)}));
 return {data,update,event,latest};
}
