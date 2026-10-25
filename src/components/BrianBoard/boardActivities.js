import {makeId} from './boardModel.js';
export const BOARD_ACTIVITY_TYPES=['matching','ordering','sorting'];
const clean=s=>String(s||'').trim().slice(0,130);
const rows=raw=>String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
export function createBoardActivity({type,title,prompt,raw}){
 if(!BOARD_ACTIVITY_TYPES.includes(type))throw Error('Unsupported activity type');
 const input=rows(raw);let items=[];
 if(type==='ordering'){
  const parts=(input.length>1?input:input[0]?.split('|')||[]).map(clean).filter(Boolean);
  if(parts.length<3||parts.length>16)throw Error('Ordering requires 3–16 words or phrases');
  items=parts.map((label,i)=>({id:'i'+i,label}));
 }else{
  const limit=type==='matching'?12:20;
  if(input.length<2||input.length>limit)throw Error('Provide 2–'+limit+' lines');
  items=input.map((line,i)=>{
   const parts=line.split('|');
   if(parts.length!==2||!clean(parts[0])||!clean(parts[1]))throw Error('Line '+(i+1)+' must contain "item | answer"');
   return {id:'i'+i,label:clean(parts[0]),answer:clean(parts[1])};
  });
  if(new Set(items.map(x=>x.label.toLowerCase())).size!==items.length)throw Error('Items must be unique');
  if(type==='matching'&&new Set(items.map(x=>x.answer.toLowerCase())).size!==items.length)
   throw Error('Matching answers must be unique');
  if(type==='sorting'&&new Set(items.map(x=>x.answer)).size>6)
   throw Error('Sorting allows up to six categories');
 }
 return {id:makeId(),type,title:clean(title)||'Interactive activity',prompt:clean(prompt),items,createdAt:Date.now()};
}
export function normalizeBoardActivities(activities){
 if(!Array.isArray(activities))return [];
 return activities.slice(0,24).filter(x=>x&&BOARD_ACTIVITY_TYPES.includes(x.type)&&Array.isArray(x.items))
  .map(x=>({
   id:String(x.id||makeId()).slice(0,80),type:x.type,title:clean(x.title),prompt:clean(x.prompt),
   items:x.items.slice(0,20).map((row,i)=>({id:String(row.id||'i'+i).slice(0,30),
    label:clean(row.label),...(x.type!=='ordering'?{answer:clean(row.answer)}:{})})),
   createdAt:Number(x.createdAt)||Date.now()
  })).filter(x=>x.items.length>=2);
}
export function publicBoardActivity(activity){
 if(!activity||!BOARD_ACTIVITY_TYPES.includes(activity.type))return null;
 return {id:String(activity.id||''),type:activity.type,title:clean(activity.title),prompt:clean(activity.prompt),
  // No answer mapping, ordered solution, or token indices leave the teacher context.
  labels:activity.items.map(x=>clean(x.label)),
  options:activity.type==='matching'?activity.items.map(x=>clean(x.answer)).sort():[],
  categories:activity.type==='sorting'?[...new Set(activity.items.map(x=>clean(x.answer)))].sort():[]
 };
}
export function shuffleBoardItems(items,random=Math.random){
 const out=[...items];
 for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}
export function gradeBoardActivity(activity,chosen){
 if(!activity||!Array.isArray(chosen))return {correct:0,total:0};
 const total=activity.items.length;
 let correct=0;
 activity.items.forEach((item,i)=>{
  if(activity.type==='ordering'){
   if(chosen[i]===item.id)correct++;
  }else if(chosen[i]===item.answer)correct++;
 });
 return {correct,total,complete:chosen.filter(x=>x!=null).length>=total};
}
