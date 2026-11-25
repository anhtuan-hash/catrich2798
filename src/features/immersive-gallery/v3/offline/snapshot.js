export const SNAPSHOT_FORMAT='brian-museum-offline-v1';
export const CONTEST_MAX_BYTES=45_000_000;
export const COMPACT_PAYLOAD_VERSION=1;
// Deduplicate identical embedded images without changing their bytes or the logical snapshot.
export function compactSnapshot(snapshot){
 const images=[],index=new Map();
 const walk=value=>{
  if(typeof value==='string'&&/^data:image\//i.test(value)){
   if(!index.has(value)){index.set(value,images.length);images.push(value);}
   return {__museumImageRef:index.get(value)};
  }
  if(Array.isArray(value))return value.map(walk);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v)]));
  return value;
 };
 return {snapshot:walk(snapshot),images};
}
export function expandCompactSnapshot(snapshot,images){
 const walk=value=>{
  if(Array.isArray(value))return value.map(walk);
  if(value&&typeof value==='object'){
   if(Object.keys(value).length===1&&Object.hasOwn(value,'__museumImageRef')){
    const i=value.__museumImageRef;
    if(!Number.isInteger(i)||i<0||i>=images.length||typeof images[i]!=='string'||!/^data:image\//i.test(images[i]))throw new Error('Invalid archive image reference.');
    return images[i];
   }
   return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,walk(v)]));
  }
  return value;
 };
 return walk(snapshot);
}
export function assertContestBudget(bytes){
 if(bytes>CONTEST_MAX_BYTES)throw Object.assign(new Error('The contest pack exceeds the 45 MB safety limit. No oversized file was released.'),{code:'OFFLINE_CONTEST_LIMIT'});
}
export const BLOCKED_WRITE='This is a frozen evidence archive. Adding, editing, deleting and submitting are disabled.';
const privateKey=/(?:secret|password|passcode|token|authorization|csrf|cookie|invitation|invite_handle|storage_path|session_cookie)/i;
export function sanitizeSnapshot(value){
 if(Array.isArray(value))return value.map(sanitizeSnapshot);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
  .filter(([key])=>!privateKey.test(key)&&!['reviewerCandidates','reviewers'].includes(key))
  .map(([key,val])=>[key,sanitizeSnapshot(val)]));
 if(typeof value==='string'&&/^https?:/i.test(value)&&/[?&](token|signature|sig|apikey|access_token)=/i.test(value))return '';
 return value;
}
export function deepFreeze(value){
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(deepFreeze);Object.freeze(value);
 }
 return value;
}
export const clone=value=>JSON.parse(JSON.stringify(value));
export async function digest(text){
 const bytes=new TextEncoder().encode(text);
 const sum=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(sum)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function buildOfflineHtml(runtime,snapshot,snapshotHash,extra={}){
 const compact=extra.compact?compactSnapshot(snapshot):null;
 const payload=safeJson({... (compact?{...compact,compactVersion:COMPACT_PAYLOAD_VERSION}:{snapshot}),snapshotHash,mode:extra.mode||'teacher',groupId:extra.groupId||'',...(extra.archiveInfo?{archiveInfo:extra.archiveInfo}:{})});
 const code=runtime.script.replace(/<\/script/gi,'<\\/script');
 const css=runtime.css.replace(/<\/style/gi,'<\\/style');
 const title=extra.title||'Pétrus Ký School System · Frozen evidence';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' blob:; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src data: blob:; worker-src blob:; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">'+
 '<title>'+title.replace(/[<>&]/g,'')+'</title><style>'+css+'</style></head><body><div id="root"><p>Opening the frozen Museum Lab archive…</p></div>'+
 '<script id="museum-frozen-payload" type="application/json">'+payload+'</script><script>'+code+'</script></body></html>';
}
