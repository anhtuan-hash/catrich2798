// Brian Wheel Studio: bounded, network-free selectors and layout math.
import {PALETTE,secureInt} from './instantToolsCore.mjs';
export const WHEEL_MAX_ITEMS=60;
export const WHEEL_THEMES={
 aurora:['#166a71','#2aa69a','#53c5ad','#54a4bd','#6575cd','#9066b7','#dc739f','#f1a661'],
 sunset:['#ed6b65','#f4a358','#f8cb69','#d985bc','#9b7bd4','#7eadd8'],
 ocean:['#255b87','#327ca9','#33a3ba','#3cb9aa','#6cb1d4','#4775bd'],
 candy:['#e76891','#ef9a6b','#e6bd54','#6cc9ab','#72a5e0','#a185de']
};
const str=(x,n=45)=>String(x??'').trim().slice(0,n);
export const wheelLimit=(n,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(n))?Number(n):min));
export const wheelRowsFromNames=names=>(Array.isArray(names)?names:[]).slice(0,WHEEL_MAX_ITEMS).map((name,i)=>({
 id:'wheel-'+i,label:str(name)||'Option '+(i+1),weight:1,enabled:true,color:''
}));
export function wheelSanitizeRows(rows,fallback=[]){
 const source=Array.isArray(rows)&&rows.length?rows:wheelRowsFromNames(fallback);
 const ids=new Set();
 return source.slice(0,WHEEL_MAX_ITEMS).map((r,i)=>{
  const name=str(r?.label??r?.name) || 'Option '+(i+1);
  let id=/^[a-z0-9_-]{1,55}$/i.test(String(r?.id||''))?r.id:'wheel-'+i;
  if(ids.has(id))id='wheel-'+i+'-'+i;
  ids.add(id);
  return {id,label:name,weight:Math.round(wheelLimit(r?.weight??1,1,20)),
   enabled:r?.enabled!==false,color:/^#[0-9a-f]{6}$/i.test(r?.color||'')?r.color:''};
 });
}
export const activeWheelRows=rows=>rows.filter(r=>r.enabled!==false);
export function wheelSegments(rows,theme='aurora'){
 const active=activeWheelRows(rows);
 const total=active.reduce((s,r)=>s+r.weight,0);
 let start=0;const palette=WHEEL_THEMES[theme]||WHEEL_THEMES.aurora;
 return active.map((r,i)=>{
  const size=total?360*r.weight/total:0;
  const result={...r,start,end:start+size,center:start+size/2,color:r.color||palette[i%palette.length]};
  start+=size;
  return result;
 });
}
export function pickWheelSegment(segments,random=secureInt){
 const total=segments.reduce((s,r)=>s+r.weight,0);
 if(!total)return null;
 const value=random(0,total-1);
 let sum=0;
 for(const s of segments){sum+=s.weight;if(value<sum)return s;}
 return segments.at(-1)||null;
}
export function wheelTargetForSegment(current,segment,revolutions=6){
 const angle=((Number(current)||0)%360+360)%360;
 const at=((360-(segment.center%360))%360);
 return angle+((at-angle+360)%360)+360*revolutions;
}
export function makeWheelHistory(prev,segment,mode){
 const item={id:segment.id,label:segment.label,time:Date.now(),mode};
 return [item,...(Array.isArray(prev)?prev:[])].slice(0,100);
}
export function sanitiseWheelStudio(w){
 const rows=wheelSanitizeRows(w?.rows,w?.names||['Team 1','Team 2','Team 3','Team 4']);
 const rawHistory=Array.isArray(w?.history)?w.history:[];
 const history=rawHistory.slice(0,100).filter(i=>i&&typeof i==='object').map(i=>({
  id:str(i.id,55),label:str(i.label),mode:['normal','elimination','accumulation'].includes(i.mode)?i.mode:'normal',
  time:Number.isFinite(i.time)?i.time:0
 }));
 const counts={};
 if(w?.counts&&typeof w.counts==='object'){
  rows.forEach(r=>{counts[r.id]=Math.floor(wheelLimit(w.counts[r.id]||0,0,100000));});
 }
 return {rows,mode:['normal','elimination','accumulation'].includes(w?.mode)?w.mode:'normal',
  theme:Object.hasOwn(WHEEL_THEMES,w?.theme)?w.theme:'aurora',
  duration:wheelLimit(w?.duration??5,2,20),
  confetti:w?.confetti!==false,showLabels:w?.showLabels!==false,mystery:w?.mystery===true,
  history,counts,spins:Math.floor(wheelLimit(w?.spins??0,0,100000)),
  rotation:wheelLimit(w?.rotation||0,0,360),winner:typeof w?.winner==='string'?str(w.winner):null};
}
export function wheelCsv(rows){
 const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 return ['name,weight,color,enabled',...rows.map(r=>[cell(r.label),r.weight,cell(r.color),r.enabled?'yes':'no'].join(','))].join('\r\n');
}
function splitCsvLine(line){
 const out=[];let v='',inside=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(c==='"'){if(inside&&line[i+1]==='"'){v+='"';i++;}else inside=!inside;}
  else if(c===','&&!inside){out.push(v);v='';}
  else v+=c;
 }
 out.push(v);return out;
}
export function parseWheelCsv(text){
 const raw=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(s=>s.trim());
 if(!raw.length)return [];
 const rows=raw[0].toLowerCase().includes('name,')?raw.slice(1):raw;
 return wheelSanitizeRows(rows.slice(0,WHEEL_MAX_ITEMS).map((line,i)=>{
  const cols=splitCsvLine(line);
  return {id:'csv-'+i,label:cols[0],weight:cols[1]||1,color:cols[2]||'',
   enabled:cols[3]?.toLowerCase()!=='no'};
 }));
}
export const shuffleWheelRows=(rows,random=secureInt)=>{
 const a=[...rows];
 for(let i=a.length-1;i>0;i--){const j=random(0,i);[a[i],a[j]]=[a[j],a[i]];}
 return a;
};
