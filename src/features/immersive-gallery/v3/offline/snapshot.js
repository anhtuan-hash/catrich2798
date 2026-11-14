export const SNAPSHOT_FORMAT='brian-museum-offline-v1';
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
export function buildOfflineHtml(runtime,snapshot,snapshotHash){
 const payload=safeJson({snapshot,snapshotHash});
 const code=runtime.script.replace(/<\/script/gi,'<\\/script');
 const css=runtime.css.replace(/<\/style/gi,'<\\/style');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' blob:; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src data: blob:; worker-src blob:; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">'+
 '<title>BRIAN Museum Lab · Frozen evidence</title><style>'+css+'</style></head><body><div id="root"><p>Opening the frozen Museum Lab archive…</p></div>'+
 '<script id="museum-frozen-payload" type="application/json">'+payload+'</script><script>'+code+'</script></body></html>';
}
