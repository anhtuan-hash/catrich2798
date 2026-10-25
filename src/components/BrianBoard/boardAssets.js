/** Teacher-private reusable blocks. Uses existing Board IndexedDB store, no Supabase. */
import {openBoardDB} from './boardStorage.js';
import {spatialObjectBounds} from './boardSpatial.js';
const STORE='lessons',maxEntries=30,maxObjects=30,maxBytes=1024*1024;
const makeId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const clone=v=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));
const prefix=ownerId=>String(ownerId)+':asset:';
export async function listBoardAssets(ownerId){
 if(!ownerId)return [];
 const db=await openBoardDB();
 const rows=await new Promise((resolve,reject)=>{
  const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
  req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
 });
 return rows.filter(r=>r.ownerId===String(ownerId)&&r.key?.startsWith(prefix(ownerId)))
  .sort((a,b)=>b.createdAt-a.createdAt)
  .slice(0,maxEntries).map(r=>({id:r.key.slice(prefix(ownerId).length),title:r.title,
   count:r.objects.length,createdAt:r.createdAt}));
}
export async function saveBoardAsset(ownerId,objects,title){
 if(!ownerId||!Array.isArray(objects)||!objects.length||objects.length>maxObjects)
  throw Error('Select between 1 and 30 objects');
 const valid=objects.filter(o=>o&&['stroke','shape','text','image','sticky','mask','flashcard'].includes(o.kind));
 if(valid.length!==objects.length)throw Error('Unsupported item in reusable block');
 const bounds=valid.map(spatialObjectBounds).filter(Boolean);
 if(!bounds.length)throw Error('Empty reusable block');
 const ox=Math.min(...bounds.map(b=>b.x)),oy=Math.min(...bounds.map(b=>b.y));
 const shifted=clone(valid).map(o=>{
  if(o.kind==='stroke')o.points=(o.points||[]).map(p=>({...p,x:p.x-ox,y:p.y-oy}));
  else if(o.kind==='shape'){o.x-=ox;o.x2-=ox;o.y-=oy;o.y2-=oy;}
  else{o.x-=ox;o.y-=oy;}
  return o;
 });
 if(new TextEncoder().encode(JSON.stringify(shifted)).length>maxBytes)
  throw Error('Reusable block exceeds 1 MB. Reduce embedded images.');
 const id=makeId(),key=prefix(ownerId)+id,db=await openBoardDB(),existing=await listBoardAssets(ownerId);
 await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  store.put({key,ownerId:String(ownerId),createdAt:Date.now(),
   title:String(title||'Reusable teaching block').slice(0,90),objects:shifted});
  existing.slice(maxEntries-1).forEach(row=>store.delete(prefix(ownerId)+row.id));
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
 return id;
}
export async function readBoardAsset(ownerId,assetId,x=0,y=0){
 if(!ownerId||!assetId)return [];
 const db=await openBoardDB(),key=prefix(ownerId)+String(assetId);
 const row=await new Promise((resolve,reject)=>{
  const req=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
 });
 if(!row||row.ownerId!==String(ownerId))return [];
 return clone(row.objects).map(o=>{
  o.id=makeId();o.hidden=false;o.locked=false;
  if(o.kind==='stroke')o.points=o.points.map(p=>({...p,x:p.x+x,y:p.y+y}));
  else if(o.kind==='shape'){o.x+=x;o.x2+=x;o.y+=y;o.y2+=y;}
  else{o.x+=x;o.y+=y;}
  return o;
 });
}
