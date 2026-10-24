import { useEffect, useState } from 'react';
import { parseFocusYoutubeId } from './focusYoutube.js';

const STORE = 'bfc-living-atelier-v7:';
const MOODS = ['auto','dawn','golden','rain','twilight','midnight','off'];
const PARTICLES = ['off','dust','fireflies','rain','snow','leaves','fog'];
const CLOCKS = ['sense','glass','minimal','floating','kyoto','swiss','aurora','liquid'];
const clamp=(v,lo,hi,def)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):def;
const defaults = () => ({
  mood:'auto',tint:12,particle:'off',density:35,
  clock:'sense',clockWeight:350,clockSpacing:-4,clockTint:'#ffffff',
  compactDock:false, soundPan:{}, soundRecipes:[], favorites:[],
  videoOverride:'', stopAfterMinutes:0, flow:{work:25,rest:5,repeats:4,preset:'pomodoro'},
  journal:[], sessions:[],
});
export function normalizeFocus7(value){
 const v=value&&typeof value==='object'?value:{};
 const safeId=x=>{try{return parseFocusYoutubeId(x);}catch{return '';}};
 return {
  mood:MOODS.includes(v.mood)?v.mood:'auto',tint:clamp(v.tint,0,40,12),
  particle:PARTICLES.includes(v.particle)?v.particle:'off',density:clamp(v.density,5,100,35),
  clock:CLOCKS.includes(v.clock)?v.clock:'sense',clockWeight:clamp(v.clockWeight,250,750,350),
  clockSpacing:clamp(v.clockSpacing,-8,12,-4),
  clockTint:/^#[\da-f]{6}$/i.test(v.clockTint||'')?v.clockTint:'#ffffff',
  compactDock:!!v.compactDock,
  soundPan:Object.fromEntries(Object.entries(v.soundPan||{}).filter(([k,x])=>
    ['white','rain','ocean','wind','forest'].includes(k)&&Number.isFinite(Number(x))).map(([k,x])=>[k,clamp(x,-100,100,0)])),
  soundRecipes:Array.isArray(v.soundRecipes)?v.soundRecipes.filter(x=>x&&typeof x.name==='string').slice(-8):[],
  favorites:Array.isArray(v.favorites)?[...new Set(v.favorites.map(safeId).filter(Boolean))].slice(0,15):[],
  videoOverride:safeId(v.videoOverride),
  stopAfterMinutes:clamp(v.stopAfterMinutes,0,180,0),
  flow:{work:clamp(v.flow?.work,1,180,25),rest:clamp(v.flow?.rest,1,180,5),
    repeats:clamp(v.flow?.repeats,1,10,4),preset:['pomodoro','deep','custom'].includes(v.flow?.preset)?v.flow.preset:'pomodoro'},
  journal:Array.isArray(v.journal)?v.journal.filter(x=>x&&typeof x.text==='string').slice(-365).map(x=>({
    id:String(x.id||''),at:Number(x.at)||0,text:x.text.slice(0,600),mood:['calm','good','tired'].includes(x.mood)?x.mood:'calm'
  })):[],
  sessions:Array.isArray(v.sessions)?v.sessions.filter(x=>x&&Number.isFinite(x.at)&&Number.isFinite(x.minutes)).slice(-1000):[],
 };
}
export function readFocus7(userId){
 try{return normalizeFocus7(JSON.parse(localStorage.getItem(STORE+String(userId||'guest'))||'null'));}
 catch{return normalizeFocus7(defaults());}
}
export function getFocusInsights(events,now=Date.now()){
 const list=(events||[]).filter(s=>Number.isFinite(s.at)&&Number.isFinite(s.minutes)&&s.minutes>0);
 const key=ms=>new Date(ms).toLocaleDateString('en-CA');
 const days=Array.from({length:7},(_,i)=>{
  const date=new Date(now);date.setHours(12,0,0,0);date.setDate(date.getDate()-(6-i));
  const day=key(date.getTime());
  const group=list.filter(s=>key(s.at)===day);
  return {day,minutes:Math.round(group.reduce((a,b)=>a+b.minutes,0)),sessions:group.length};
 });
 let streak=0;
 for(let i=6;i>=0;i--){if(days[i].sessions>0)streak++;else if(i===6)continue;else break;}
 return {days,totalMinutes:Math.round(list.reduce((n,s)=>n+s.minutes,0)),totalSessions:list.length,streak};
}
export default function useFocus7Data(userId){
 const [record,setRecord]=useState(()=>({owner:userId,data:readFocus7(userId)}));
 const data=record.owner===userId?record.data:readFocus7(userId);
 useEffect(()=>setRecord({owner:userId,data:readFocus7(userId)}),[userId]);
 useEffect(()=>{
  if(record.owner!==userId)return;
  try{localStorage.setItem(STORE+String(userId||'guest'),JSON.stringify(record.data));}catch{}
 },[record,userId]);
 const update=patch=>setRecord(old=>{
  const current=old.owner===userId?old.data:readFocus7(userId);
  return {owner:userId,data:normalizeFocus7({...current,...patch})};
 });
 return {data,update};
}
