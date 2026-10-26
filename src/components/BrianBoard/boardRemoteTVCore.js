/** Pure limits and envelope validator: safe to run in Node and browser. */
export const REMOTE_MAX_BYTES=60000;
export const REMOTE_MAX_MESSAGES=600;
export const REMOTE_DURATION_MS=20*60*1000;
export const REMOTE_MIN_INTERVAL_MS=2000;
export const boardRemoteTopic=ownerId=>'bbd-owner:'+String(ownerId||'');
export function validateRemoteEnvelope(envelope,now=Date.now()){
 if(!envelope||typeof envelope!=='object'||!envelope.payload||
  !/^[0-9a-f]{36}$/.test(String(envelope.sessionId||'')))return false;
 if(envelope.payload.schema!==1||envelope.payload.type!=='state')return false;
 const at=Number(envelope.at),exp=Number(envelope.expiresAt);
 if(!Number.isFinite(at)||!Number.isFinite(exp)||at>now+5000||
  now-at>45000||exp<=now||exp>at+REMOTE_DURATION_MS+1000)return false;
 return JSON.stringify(envelope).length<=REMOTE_MAX_BYTES;
}
