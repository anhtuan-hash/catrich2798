// Family Feud storage is isolated from Brian Bomb Arena and all shared apps.
const NAME='brian-family-feud-v1',STORE='sessions',writes=new Map();
const key=id=>'brian-family-feud:'+String(id||'anonymous');
function openDb(){return new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined'){reject(Error('IndexedDB unavailable'));return;}
 const request=indexedDB.open(NAME,1);
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});}
async function transaction(id,value,write){
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,write?'readwrite':'readonly');
  const request=write
   ?value===null?tx.objectStore(STORE).delete(key(id)):tx.objectStore(STORE).put(value,key(id))
   :tx.objectStore(STORE).get(key(id));
  request.onsuccess=()=>resolve(request.result||null);
  request.onerror=()=>reject(request.error);
  tx.oncomplete=()=>db.close();
  tx.onerror=()=>{db.close();reject(tx.error);};
 });
}
function serial(id,job){
 const k=key(id),previous=writes.get(k)||Promise.resolve();
 const current=previous.catch(()=>{}).then(job);
 writes.set(k,current);
 void current.finally(()=>{if(writes.get(k)===current)writes.delete(k);}).catch(()=>{});
 return current;
}
export async function loadFeud(id){
 try{return await transaction(id,null,false);}
 catch{try{return JSON.parse(localStorage.getItem(key(id))||'null');}catch{return null;}}
}
export async function saveFeud(id,state){
 return serial(id,async()=>{try{await transaction(id,state,true);return true;}
 catch{try{localStorage.setItem(key(id),JSON.stringify(state));return true;}catch{return false;}}});
}
export async function clearFeud(id){
 return serial(id,async()=>{
  try{await transaction(id,null,true);}catch{/* fallback cleanup */}
  try{localStorage.removeItem(key(id));}catch{/* no local storage */}
 });
}
