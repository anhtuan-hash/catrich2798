/** Brian Board: independent per-owner draft. No Brian Focus storage keys. */
export const BOARD_W=1600,BOARD_H=900;
export const THEMES=['ivory','midnight','classroom'];
export const BACKGROUNDS=['plain','grid','lines'];
export const makeId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
export function newPage(title='Page 1'){
 return {id:makeId(),title,background:'plain',objects:[],hidden:false,locked:false};
}
export function newLesson(ownerId){
 const page=newPage();
 return {schema:1,ownerId:String(ownerId||''),title:'Untitled lesson',
  theme:'ivory',pages:[page],activePageId:page.id,updatedAt:Date.now()};
}
export function normalizeLesson(raw,ownerId){
 const empty=newLesson(ownerId);
 if(!raw||raw.ownerId!==String(ownerId)||!Array.isArray(raw.pages))return empty;
 const pages=raw.pages.slice(0,80).filter(p=>p&&typeof p==='object').map((p,i)=>({
  id:String(p.id||makeId()).slice(0,85),title:String(p.title||'Page '+(i+1)).slice(0,90),
  background:BACKGROUNDS.includes(p.background)?p.background:'plain',
  locked:p.locked===true,hidden:p.hidden===true,
  objects:Array.isArray(p.objects)?p.objects.slice(0,3000).filter(o=>o&&typeof o==='object'&&
   ['stroke','text','shape','image','sticky','flashcard','mask'].includes(o.kind)).map(o=>({...o})):[],
 }));
 if(!pages.length)pages.push(newPage());
 return {schema:1,ownerId:String(ownerId),title:String(raw.title||empty.title).slice(0,180),
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
export function sanitizeStudentPage(page){
 if(!page||page.hidden)return null;
 return {id:page.id,title:page.title,background:page.background,
  objects:page.objects.filter(o=>o.studentVisible!==false&&o.kind!=='mask'&&o.teacherOnly!==true)
   .map(o=>{const {privateAnswer,teacherNotes,...publicObject}=o;return publicObject;})};
}
