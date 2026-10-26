// Owner-scoped offline drafts; IndexedDB primary and localStorage fallback.
const DB_NAME='brian-bomb-arena-v1';
const STORE='sessions';
const keyFor=ownerId=>'bomb-arena:'+String(ownerId||'anonymous');
function db(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(new Error('No IndexedDB'));return;}
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function transaction(ownerId,value,write){
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction(STORE,write?'readwrite':'readonly');
    const req=write
      ? value===null?tx.objectStore(STORE).delete(keyFor(ownerId)):tx.objectStore(STORE).put(value,keyFor(ownerId))
      :tx.objectStore(STORE).get(keyFor(ownerId));
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    tx.oncomplete=()=>database.close();
    tx.onerror=()=>{database.close();reject(tx.error);};
  });
}
export async function loadArena(ownerId){
  try{return await transaction(ownerId,null,false)||null;}
  catch{
    try{return JSON.parse(localStorage.getItem(keyFor(ownerId))||'null');}catch{return null;}
  }
}
export async function saveArena(ownerId,session){
  try{await transaction(ownerId,session,true);return true;}
  catch{
    try{localStorage.setItem(keyFor(ownerId),JSON.stringify(session));return true;}catch{return false;}
  }
}
export async function clearArena(ownerId){
  try{await transaction(ownerId,null,true);}catch{/* local fallback below */}
  try{localStorage.removeItem(keyFor(ownerId));}catch{/* no-op */}
}
