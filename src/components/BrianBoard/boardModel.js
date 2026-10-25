/** Brian Board: independent per-owner draft. No Brian Focus storage keys. */
import {normalizeBoardActivities} from './boardActivities.js';
import {normalizeBoardFrames} from './boardSpatial.js';
export const BOARD_W=1600,BOARD_H=900;
export const THEMES=['ivory','midnight','classroom'];
export const BACKGROUNDS=['plain','grid','lines','dots'];
export const makeId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
export function newPage(title='Page 1'){
 return {id:makeId(),title,background:'plain',objects:[],activities:[],frames:[],hidden:false,locked:false};
}
export function newLesson(ownerId){
 const page=newPage();
 return {schema:1,id:makeId(),ownerId:String(ownerId||''),title:'Untitled lesson',
  theme:'ivory',pages:[page],activePageId:page.id,updatedAt:Date.now()};
}
export function normalizeLesson(raw,ownerId){
 const empty=newLesson(ownerId);
 if(!raw||raw.ownerId!==String(ownerId)||!Array.isArray(raw.pages))return empty;
 const pages=raw.pages.slice(0,80).filter(p=>p&&typeof p==='object').map((p,i)=>({
  id:String(p.id||makeId()).slice(0,85),title:String(p.title||'Page '+(i+1)).slice(0,90),
  background:BACKGROUNDS.includes(p.background)?p.background:'plain',
  locked:p.locked===true,hidden:p.hidden===true,
  activities:normalizeBoardActivities(p.activities),frames:normalizeBoardFrames(p.frames),
  objects:Array.isArray(p.objects)?p.objects.slice(0,3000).filter(o=>o&&typeof o==='object'&&
   ['stroke','text','shape','image','sticky','flashcard','mask','activity-pin'].includes(o.kind)).map(o=>({...o})):[],
 }));
 if(!pages.length)pages.push(newPage());
 return {schema:1,id:String(raw.id||'legacy-'+pages[0].id).slice(0,85),ownerId:String(ownerId),title:String(raw.title||empty.title).slice(0,180),
  theme:THEMES.includes(raw.theme)?raw.theme:'ivory',pages,
  activePageId:pages.some(x=>x.id===raw.activePageId)?raw.activePageId:pages[0].id,
  updatedAt:Number(raw.updatedAt)||Date.now()};
}
export function pathFromPoints(points=[]){
 if(!points.length)return '';
 const p=points;
 if(p.length===1)return 'M '+p[0].x+' '+p[0].y+' l 0.01 0.01';
 let d='M '+p[0].x+' '+p[0].y;
 for(let i=1;i<p.length;i++){const a=p[i],b=p[i-1];d+=' L '+((a.x+b.x)/2).toFixed(2)+' '+((a.y+b.y)/2).toFixed(2);}
 d+=' L '+p.at(-1).x+' '+p.at(-1).y;return d;
}
export function distStroke(a,b){
 if(!a?.length||!b?.length)return Infinity;
 const p=a[a.length-1],q=b[b.length-1];return Math.hypot(p.x-q.x,p.y-q.y);
}
export function appendObject(doc,pageId,obj){
 return {...doc,updatedAt:Date.now(),pages:doc.pages.map(p=>p.id===pageId?{...p,objects:[...p.objects,obj]}:p)};
}
/** Deliberate ALLOWLIST: never spread objects into a student/TV payload. */
export function sanitizeStudentPage(page){
 if(!page||page.hidden)return null;
 const number=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
 const xy=o=>({x:number(o.x),y:number(o.y)});
 const safe=[];
 for(const o of (Array.isArray(page.objects)?page.objects:[]).slice(0,3000)){
  if(!o||o.studentVisible===false||o.teacherOnly===true||o.hidden===true)continue;
  const id=String(o.id||'').slice(0,85),kind=o.kind;
  if(kind==='stroke'&&Array.isArray(o.points)){
   safe.push({id,kind,color:String(o.color||'#355d63').slice(0,60),width:number(o.width,4),
    opacity:number(o.opacity,1),smoothed:o.smoothed===true,pressureSensitive:o.pressureSensitive===true,
    points:o.points.slice(0,4000).map(p=>({x:number(p.x),y:number(p.y),pressure:number(p.pressure,.5)}))});
  }else if(kind==='shape'){
   safe.push({id,kind,shape:['rect','ellipse','line','arrow','triangle'].includes(o.shape)?o.shape:'rect',
    fill:/^#[0-9a-fA-F]{6}$/.test(o.fill||'')?o.fill:'none',
    ...xy(o),x2:number(o.x2),y2:number(o.y2),color:String(o.color||'#355d63').slice(0,60),width:number(o.width,4)});
  }else if(kind==='text'||kind==='sticky'){
   safe.push({id,kind,...xy(o),text:String(o.text||'').slice(0,90),
    color:String(o.color||'#355d63').slice(0,60),fontSize:number(o.fontSize,40)});
  }else if(kind==='mask'){
   safe.push({id,kind,...xy(o),width:number(o.width,240),height:number(o.height,90),revealed:o.revealed===true});
  }else if(kind==='image'&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(o.src||'')&&o.src.length<3200000){
   safe.push({id,kind,...xy(o),width:number(o.width,500),height:number(o.height,300),src:o.src});
  }else if(kind==='flashcard'){
   const publicObject={id,kind,...xy(o),text:String(o.text||'').slice(0,90),revealed:o.revealed===true};
   if(publicObject.revealed)publicObject.publicAnswer=String(o.privateAnswer||'').slice(0,120);
   safe.push(publicObject);
  }
 }
 return {id:String(page.id||'').slice(0,85),title:String(page.title||'').slice(0,90),
  background:BACKGROUNDS.includes(page.background)?page.background:'plain',objects:safe};
}
