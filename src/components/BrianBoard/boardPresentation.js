import {sanitizeStudentPage} from './boardModel.js';
import {publicBoardActivity} from './boardActivities.js';
import {safeBoardViewport} from './boardSpatial.js';
export function boardStudentPayload(lesson,activityId=null,live=null,viewport=null){
 const page=lesson?.pages?.find(p=>p.id===lesson.activePageId);
 const safe=sanitizeStudentPage(page);
 const activity=safe&&page?.activities?.find(x=>x.id===activityId);
 const publicActivity=activity?publicBoardActivity(activity):null;
 // Stage updates are a strict allowlist. Never broadcast student responses,
 // correct mappings, unrevealed card backs or teacher private notes.
 const publicLive=publicActivity&&live?.activityId===activityId?{
  index:Math.max(0,Math.min(23,Math.floor(Number(live.index)||0))),
  opened:Array.isArray(live.opened)?live.opened.filter(n=>Number.isInteger(n)&&n>=0&&n<16).slice(0,16):[],
  scores:Array.isArray(live.scores)?live.scores.slice(0,8).map(row=>({
   name:String(row.name||'Team').slice(0,28),
   score:Math.max(0,Math.min(10000,Math.floor(Number(row.score)||0)))
  })):[],
  finished:live.finished===true,
  revealed:live.revealAll===true,
  seconds:Math.max(0,Math.min(3600,Math.floor(Number(live.seconds)||0)))
 }:null;
 return {type:'state',schema:1,title:String(lesson?.title||'Teaching Board').slice(0,180),
  theme:['ivory','midnight','classroom'].includes(lesson?.theme)?lesson.theme:'ivory',
  page:safe,activity:publicActivity,live:publicLive,
  viewport:safeBoardViewport(viewport),at:Date.now()};
}
export function newBoardPresentationId(){
 if(typeof crypto==='undefined'||!crypto.getRandomValues)throw Error('Secure random unavailable');
 const bytes=crypto.getRandomValues(new Uint8Array(18));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
