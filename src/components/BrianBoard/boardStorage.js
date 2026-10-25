import {normalizeLesson} from './boardModel.js';
const DB_NAME='brian-board-private-drafts',DB_VERSION=1,STORE='lessons';
let dbPromise=null;
export function openBoardDB(){
 if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDB unavailable'));
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Cannot open lesson storage'));
 }).catch(error=>{dbPromise=null;throw error;});
 return dbPromise;
}
export async function readBoardDraft(ownerId){
 const db=await openBoardDB();
 const key=String(ownerId)+':active';
 const result=await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(key);
  request.onsuccess=()=>resolve(request.result?.lesson||null);
  request.onerror=()=>reject(request.error);
 });
 return result?normalizeLesson(result,ownerId):null;
}
let saveChain=Promise.resolve();
/** Serialize writes across events: old debounces cannot overwrite newer snapshots. */
export function saveBoardDraft(ownerId,lesson){
 if(!ownerId||String(lesson?.ownerId)!==String(ownerId))return Promise.reject(new Error('Owner mismatch'));
 const serialized=structuredClone(normalizeLesson(lesson,ownerId));
 const operation=async()=>{
  const db=await openBoardDB();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   tx.objectStore(STORE).put({key:String(ownerId)+':active',ownerId:String(ownerId),lesson:serialized,updatedAt:Date.now()});
   tx.objectStore(STORE).put({key:String(ownerId)+':lesson:'+serialized.id,ownerId:String(ownerId),
    lesson:serialized,updatedAt:Date.now()});
   tx.oncomplete=()=>resolve({updatedAt:Date.now()});
   tx.onerror=()=>reject(tx.error||new Error('Cannot save lesson'));
   tx.onabort=()=>reject(tx.error||new Error('Lesson transaction aborted'));
  });
 };
 saveChain=saveChain.catch(()=>{}).then(operation);
 return saveChain;
}

/** A teacher sees only their local lesson IDs. No server/student master involved. */
export async function listBoardLessons(ownerId){
 const db=await openBoardDB();
 const rows=await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();
  req.onsuccess=()=>resolve(req.result||[]);
  req.onerror=()=>reject(req.error);
 });
 return rows.filter(row=>row.ownerId===String(ownerId)&&row.key.startsWith(String(ownerId)+':lesson:'))
  .map(row=>({id:row.lesson?.id,title:row.lesson?.title||'Untitled lesson',
    pages:row.lesson?.pages?.length||0,updatedAt:row.updatedAt}))
  .sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,100);
}
export async function readBoardLesson(ownerId,lessonId){
 const db=await openBoardDB();
 const key=String(ownerId)+':lesson:'+String(lessonId);
 const row=await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(key);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
 });
 return row?.ownerId===String(ownerId)?normalizeLesson(row.lesson,ownerId):null;
}
export async function deleteBoardLesson(ownerId,lessonId){
 const db=await openBoardDB();
 const key=String(ownerId)+':lesson:'+String(lessonId);
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).delete(key);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
}

/** V8 teacher-only named checkpoints, stored in the existing IndexedDB lessons store.
 * Keys are scoped to owner + lesson; the last six checkpoints are retained.
 * Never exposed to TV, students, or cloud backups without an explicit private export.
 */
export async function listBoardCheckpoints(ownerId,lessonId){
 if(!ownerId||!lessonId)return [];
 const db=await openBoardDB();
 const rows=await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();
  req.onsuccess=()=>resolve(req.result||[]);
  req.onerror=()=>reject(req.error);
 });
 const prefix=String(ownerId)+':checkpoint:'+String(lessonId)+':';
 return rows.filter(x=>x.ownerId===String(ownerId)&&x.key.startsWith(prefix))
  .map(x=>({id:x.key.slice(prefix.length),title:x.title||'Checkpoint',
   createdAt:x.createdAt||0})).sort((a,b)=>b.createdAt-a.createdAt).slice(0,6);
}
export async function saveBoardCheckpoint(ownerId,lesson,title){
 if(!ownerId||lesson?.ownerId!==String(ownerId))throw Error('Checkpoint owner mismatch');
 const current=normalizeLesson(lesson,ownerId);
 const existing=await listBoardCheckpoints(ownerId,current.id);
 const suffix=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():
  Date.now().toString(36)+Math.random().toString(36).slice(2);
 const key=String(ownerId)+':checkpoint:'+current.id+':'+suffix;
 const createdAt=Date.now(),safeTitle=String(title||'Teaching checkpoint').slice(0,80);
 const db=await openBoardDB();
 await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
  store.put({key,ownerId:String(ownerId),title:safeTitle,createdAt,lesson:structuredClone(current)});
  existing.slice(5).forEach(checkpoint=>
   store.delete(String(ownerId)+':checkpoint:'+current.id+':'+checkpoint.id));
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
 return {id:suffix,title:safeTitle,createdAt};
}
export async function readBoardCheckpoint(ownerId,lessonId,checkpointId){
 if(!ownerId||!lessonId||!checkpointId)return null;
 const key=String(ownerId)+':checkpoint:'+String(lessonId)+':'+String(checkpointId);
 const db=await openBoardDB();
 const row=await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(key);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
 });
 if(!row||row.ownerId!==String(ownerId)||row.lesson?.id!==String(lessonId))return null;
 return normalizeLesson(row.lesson,ownerId);
}
