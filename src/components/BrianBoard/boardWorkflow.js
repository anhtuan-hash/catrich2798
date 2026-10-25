/**
 * Brian Teaching Board: offline-first classroom workflows.
 * All lesson operations remain owner-scoped; never publish this private
 * material to the TV or an unauthenticated endpoint.
 */
import {makeId,normalizeLesson} from './boardModel.js';
import {createBoardActivity,normalizeBoardActivities} from './boardActivities.js';

export const BOARD_BACKUP_FORMAT='brian-board-private-backup/v1';
export const BOARD_BACKUP_MAX_BYTES=25*1024*1024;
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
const requireOwner=(lesson,ownerId)=>{
 if(!ownerId||String(lesson?.ownerId)!==String(ownerId))throw Error('Board lesson owner mismatch');
};
export function duplicateBoardLesson(raw,ownerId,suffix=' (copy)'){
 requireOwner(raw,ownerId);
 const doc=normalizeLesson(raw,ownerId),pages=doc.pages.map(page=>({
  ...clone(page),id:makeId(),
  objects:page.objects.map(obj=>({...clone(obj),id:makeId()})),
  activities:page.activities.map(a=>({...clone(a),id:makeId()}))
 }));
 const activeIndex=doc.pages.findIndex(p=>p.id===doc.activePageId);
 return {...doc,id:makeId(),title:(doc.title+suffix).slice(0,180),pages,
  activePageId:pages[Math.max(0,activeIndex)]?.id||pages[0].id,updatedAt:Date.now()};
}
export function exportPrivateBoardBackup(raw,ownerId){
 requireOwner(raw,ownerId);
 const lesson=normalizeLesson(raw,ownerId);
 const text=JSON.stringify({format:BOARD_BACKUP_FORMAT,exportedAt:new Date().toISOString(),lesson});
 if(new TextEncoder().encode(text).byteLength>BOARD_BACKUP_MAX_BYTES)
  throw Error('Private backup exceeds 25 MB. Reduce embedded images first.');
 return text;
}
export function importPrivateBoardBackup(text,ownerId){
 if(!ownerId||typeof text!=='string'||new TextEncoder().encode(text).byteLength>BOARD_BACKUP_MAX_BYTES)
  throw Error('Invalid backup or file exceeds 25 MB');
 let parsed;
 try{parsed=JSON.parse(text);}catch{throw Error('Backup JSON is unreadable');}
 if(!parsed||parsed.format!==BOARD_BACKUP_FORMAT||parsed.lesson?.schema!==1||
  !Array.isArray(parsed.lesson?.pages)||parsed.lesson.pages.length<1||parsed.lesson.pages.length>80)
  throw Error('Unsupported Brian Board backup format');
 requireOwner(parsed.lesson,ownerId);
 const lesson=normalizeLesson(parsed.lesson,ownerId);
 if(lesson.pages.length!==parsed.lesson.pages.length)
  throw Error('Backup pages are incomplete');
 return duplicateBoardLesson(lesson,ownerId,' (restored)');
}
export function boardActivityRaw(activity){
 if(!activity||!Array.isArray(activity.items))return '';
 if(activity.type==='ordering')return activity.items.map(x=>x.label).join(' | ');
 return activity.items.map(x=>x.label+' | '+x.answer).join('\n');
}
export function reviseBoardActivity(current,{type,title,prompt,raw}){
 if(!current?.id)throw Error('Activity was not found');
 const edited=createBoardActivity({type,title,prompt,raw});
 return {...edited,id:current.id,createdAt:current.createdAt,
  studentVisible:current.studentVisible!==false,teacherOnly:current.teacherOnly===true};
}
export function duplicateBoardActivity(activity){
 const normalized=normalizeBoardActivities([activity])[0];
 if(!normalized)throw Error('Invalid activity');
 return {...clone(normalized),id:makeId(),title:(normalized.title+' (copy)').slice(0,130),
  studentVisible:false,createdAt:Date.now()};
}
export function moveBoardActivity(list,id,offset){
 const items=Array.isArray(list)?[...list]:[];
 const index=items.findIndex(x=>x.id===id),target=index+offset;
 if(index<0||target<0||target>=items.length)return items;
 [items[index],items[target]]=[items[target],items[index]];
 return items;
}
export function hideAllBoardActivities(list){
 return (Array.isArray(list)?list:[]).map(a=>a.studentVisible===false?a:{...a,studentVisible:false});
}
export function selectBoardNameWithoutRepeat(raw,used=[],randomValue=0){
 const names=[...new Set(String(raw||'').split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean))].slice(0,500);
 const available=names.filter(name=>!used.includes(name));
 if(!available.length)return {choice:'',used:names.filter(name=>used.includes(name)),remaining:0,total:names.length};
 const random=Number.isFinite(randomValue)?Math.max(0,Math.min(.999999999,randomValue)):0;
 const choice=available[Math.floor(random*available.length)];
 return {choice,used:[...used.filter(name=>names.includes(name)),choice],
  remaining:available.length-1,total:names.length};
}
