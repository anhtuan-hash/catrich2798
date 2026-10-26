// Pure helpers. No cloud access, no school roster, no microphone APIs in this module.
import {sanitizeTimeline} from './instantToolsTimelineCore.mjs';
const bound=(v,min,max,defaultValue=min)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):defaultValue;
const str=(v,len,def='')=>typeof v==='string'?v.slice(0,len):def;
const arr=x=>Array.isArray(x)?x:[];
export const GROUP_MAX=120;
export const GROUP_DEFAULT=Array.from({length:16},(_,i)=>'Participant '+(i+1));
export const BUZZER_DEFAULT=Array.from({length:4},(_,i)=>'Team '+(i+1));
export function normalizePeople(value,max=GROUP_MAX){
 const input=Array.isArray(value)?value:String(value??'').split(/\r?\n/);
 const seen=new Set(),out=[];
 for(const item of input){
   const name=String(item??'').trim().slice(0,60);
   const id=name.toLocaleLowerCase();
   if(name&&!seen.has(id)){out.push(name);seen.add(id);}
   if(out.length>=max)break;
 }
 return out;
}
export function shufflePeople(names,randomInt){
 const pool=[...names];
 // For each i select a random integer in [0,i], using the host's secure generator.
 for(let i=pool.length-1;i>0;i--){
   const j=randomInt(0,i);
   if(!Number.isInteger(j)||j<0||j>i)throw Error('Invalid random index');
   [pool[i],pool[j]]=[pool[j],pool[i]];
 }
 return pool;
}
export function makeGroups(names,count,randomInt){
 const participants=normalizePeople(names);
 const total=Math.round(bound(count,2,8,4));
 if(participants.length<2)return [];
 const groups=Array.from({length:total},(_,i)=>({id:'group-'+(i+1),name:'Group '+(i+1),members:[]}));
 const shuffled=shufflePeople(participants,randomInt);
 shuffled.forEach((person,i)=>groups[i%total].members.push(person));
 return groups;
}
export function relativeNoise(samples){
 if(!samples?.length)return 0;
 let sum=0;
 for(const raw of samples){const n=Number(raw);sum+=Number.isFinite(n)?n*n:0;}
 const rms=Math.sqrt(sum/samples.length);
 // A relative visual scale, deliberately NOT a calibrated decibel reading.
 return Math.round(bound(rms*450,0,100));
}
export function safeTeamNames(names){
 const clean=normalizePeople(arr(names),8);
 return clean.length>=2?clean:BUZZER_DEFAULT;
}
export function lockBuzzer(locked,name){
 return locked?locked:(typeof name==='string'&&name?name:null);
}
export function reactionDelay(rand=()=>{
 if(globalThis.crypto?.getRandomValues){
  const n=new Uint32Array(1);globalThis.crypto.getRandomValues(n);return n[0]/0x100000000;
 }
 return Math.random();
}){
 return 1500+Math.floor(bound(rand(),0,.99999999)*2501);
}
export function sanitizeWave4(raw){
 const s=raw&&typeof raw==='object'?raw:{};
 const names=normalizePeople(s.groupMaker?.names??GROUP_DEFAULT);
 const groupCount=Math.round(bound(s.groupMaker?.count,2,8,4));
 const validMembers=new Set(names);
 const previous=arr(s.groupMaker?.groups).slice(0,8);
 const groups=previous.length===groupCount?previous.map((g,i)=>({
   id:'group-'+(i+1),name:str(g?.name,32,'Group '+(i+1)),
   members:normalizePeople(arr(g?.members).filter(x=>validMembers.has(x)),GROUP_MAX)
 })): [];
 const teams=safeTeamNames(s.buzzer?.teams);
 return {
   groupMaker:{names:names.length>=2?names:GROUP_DEFAULT,count:groupCount,groups},
   noiseMeter:{threshold:Math.round(bound(s.noiseMeter?.threshold,15,85,55))},
   buzzer:{teams,score:arr(s.buzzer?.score).slice(0,teams.length).map(n=>Math.round(bound(n,0,999,0))),
     history:arr(s.buzzer?.history).slice(0,15).filter(x=>typeof x==='string').map(x=>x.slice(0,60))},
   reaction:{history:arr(s.reaction?.history).slice(0,10).map(x=>Math.round(bound(x,1,30000,30000)))},
   classBell:{volume:Math.round(bound(s.classBell?.volume,0,100,65)),duration:Math.round(bound(s.classBell?.duration,1,4,2)),timeline:sanitizeTimeline(s.classBell?.timeline)}
 };
}
