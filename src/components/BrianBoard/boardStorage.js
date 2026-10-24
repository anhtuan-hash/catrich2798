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
   tx.oncomplete=()=>resolve({updatedAt:Date.now()});
   tx.onerror=()=>reject(tx.error||new Error('Cannot save lesson'));
   tx.onabort=()=>reject(tx.error||new Error('Lesson transaction aborted'));
  });
 };
 saveChain=saveChain.catch(()=>{}).then(operation);
 return saveChain;
}
