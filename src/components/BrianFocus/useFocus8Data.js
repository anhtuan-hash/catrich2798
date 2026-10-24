import {useEffect,useState} from 'react';

export const FOCUS8_KEY='bfc-ambient-os-v8:';
const clamp=(x,lo,hi,def)=>Number.isFinite(Number(x))?Math.min(hi,Math.max(lo,Number(x))):def;
const CUES=['off','dawn','golden','rain','twilight','midnight'];
const LABELS=['clock','dock','weather','timer'];
const actions=['mood','clock','particles','journal'];
const triggers=['open','break','complete'];
const newDefaults=()=>({
 cues:[{id:'dawn',minutes:25},{id:'twilight',minutes:5}],cueRunning:false,cueIndex:0,cueDeadline:0,
 layout:{desktop:{clock:{x:50,y:50},dock:{x:50,y:94},weather:{x:50,y:68},timer:{x:50,y:82}},mobile:{clock:{x:50,y:45},dock:{x:50,y:92},weather:{x:50,y:66},timer:{x:50,y:81}},tablet:{clock:{x:50,y:48},dock:{x:50,y:93},weather:{x:50,y:67},timer:{x:50,y:82}}},
 layoutEnabled:false,depth:'off',recipes:[],stage:{title:'',url:'',minutes:10,parts:['Warm-up','Practice','Review'],partIndex:0,running:false,deadline:0},soundFade:2,
 commandHistory:[],vaultVersion:1
});
const normalizePosition=(obj,base)=>({x:clamp(obj?.x,8,92,base.x),y:clamp(obj?.y,12,96,base.y)});
export function normalizeFocus8(v){
 const d=newDefaults();const x=v&&typeof v==='object'?v:{};
 return {...d,
  cues:Array.isArray(x.cues)?x.cues.slice(0,8).filter(y=>CUES.includes(y?.id)).map(y=>({id:y.id,minutes:clamp(y.minutes,1,180,25)})):d.cues,
  cueRunning:x.cueRunning===true, cueIndex:clamp(x.cueIndex,0,7,0),cueDeadline:clamp(x.cueDeadline,0,1e14,0),
  layout:Object.fromEntries(['desktop','tablet','mobile'].map(mode=>[mode,Object.fromEntries(LABELS.map(id=>[id,normalizePosition(x.layout?.[mode]?.[id],d.layout[mode][id])]))])),
  layoutEnabled:x.layoutEnabled===true,
  depth:['off','subtle','standard'].includes(x.depth)?x.depth:'off',
  recipes:Array.isArray(x.recipes)?x.recipes.slice(0,10).filter(y=>triggers.includes(y?.trigger)&&actions.includes(y?.action)).map(y=>({
    id:String(y.id||'').slice(0,60),trigger:y.trigger,action:y.action,value:String(y.value||'').slice(0,60),enabled:y.enabled===true})):[],
  stage:{title:String(x.stage?.title||'').slice(0,150),url:/^https:\/\//i.test(x.stage?.url||'')?String(x.stage.url).slice(0,500):'',
    minutes:clamp(x.stage?.minutes,1,180,10),parts:Array.isArray(x.stage?.parts)?x.stage.parts.slice(0,8).map(y=>String(y).slice(0,80)):d.stage.parts,
    partIndex:clamp(x.stage?.partIndex,0,7,0),running:x.stage?.running===true,deadline:clamp(x.stage?.deadline,0,1e14,0)},
  soundFade:clamp(x.soundFade,0,10,2),
  commandHistory:Array.isArray(x.commandHistory)?x.commandHistory.slice(-20).map(y=>String(y).slice(0,90)):[],
  vaultVersion:1,
 };
}
export function readFocus8(userId){try{return normalizeFocus8(JSON.parse(localStorage.getItem(FOCUS8_KEY+String(userId||'guest'))||'null'));}catch{return normalizeFocus8({});}}
export function getViewportLayout(width){return width<650?'mobile':width<1060?'tablet':'desktop';}
export function snapPosition(point,step=5){return {x:clamp(Math.round(point.x/step)*step,8,92,50),y:clamp(Math.round(point.y/step)*step,12,96,50)};}
export function advanceCue(data,now=Date.now()){
 const v=normalizeFocus8(data);if(!v.cueRunning||!v.cues.length)return v;
 if(v.cueDeadline>now)return v;
 // Never loop forever after a suspended tab; advance at most one stage per tick.
 const index=(v.cueIndex+1)%v.cues.length;
 return {...v,cueIndex:index,cueDeadline:now+v.cues[index].minutes*60000};
}
export function focus8Csv(events=[]){
 const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 return ['date,minutes,mood',...events.filter(x=>Number.isFinite(x.at)&&Number.isFinite(x.minutes)).map(x=>
 [new Date(x.at).toISOString(),x.minutes,x.mood||''].map(q).join(','))].join('\r\n');
}
export default function useFocus8Data(userId){
 const [record,setRecord]=useState(()=>({user:userId,data:readFocus8(userId)}));
 const data=record.user===userId?record.data:readFocus8(userId);
 useEffect(()=>setRecord({user:userId,data:readFocus8(userId)}),[userId]);
 useEffect(()=>{if(record.user!==userId)return;try{localStorage.setItem(FOCUS8_KEY+String(userId||'guest'),JSON.stringify(record.data));}catch{}},[record,userId]);
 const update=patch=>setRecord(old=>{const current=old.user===userId?old.data:readFocus8(userId);return {user:userId,data:normalizeFocus8({...current,...(typeof patch==='function'?patch(current):patch)})};});
 return {data,update};
}
