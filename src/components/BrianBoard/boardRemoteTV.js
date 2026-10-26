/** Authenticated same-owner TV channel. Default disabled; no public/anon transport.
 * Realtime.topic RLS binds channel to auth.uid() at database level.
 */
import {supabase,isSupabaseConfigured} from '../../utils/supabase.js';
const PREFIX='bbd-owner:';
export const REMOTE_MAX_BYTES=60000;
export const REMOTE_MAX_MESSAGES=600;
export const REMOTE_DURATION_MS=20*60*1000;
export const REMOTE_MIN_INTERVAL_MS=2000;
export const boardRemoteTopic=ownerId=>PREFIX+String(ownerId||'');
export function validateRemoteEnvelope(envelope,now=Date.now()){
 if(!envelope||typeof envelope!=='object'||!envelope.payload||
  !/^[0-9a-f]{36}$/.test(String(envelope.sessionId||'')))return false;
 if(envelope.payload.schema!==1||envelope.payload.type!=='state')return false;
 const at=Number(envelope.at),exp=Number(envelope.expiresAt);
 if(!Number.isFinite(at)||!Number.isFinite(exp)||at>now+5000||
  now-at>45000||exp<=now||exp>at+REMOTE_DURATION_MS+1000)return false;
 return JSON.stringify(envelope).length<=REMOTE_MAX_BYTES;
}
export async function authorizeSameOwner(ownerId){
 if(!isSupabaseConfigured||!supabase||!ownerId)throw Error('Supabase authentication unavailable');
 const {data,error}=await supabase.auth.getUser();
 if(error||!data?.user||data.user.id!==ownerId)throw Error('Sign in as the same approved teacher on this device');
 return data.user.id;
}
export function createRemoteTeacherChannel(ownerId,{onRequest,onStatus}={}){
 if(!supabase)throw Error('Supabase unavailable');
 const channel=supabase.channel(boardRemoteTopic(ownerId),{config:{private:true,broadcast:{self:false}}});
 if(onRequest)channel.on('broadcast',{event:'request'},()=>onRequest());
 channel.subscribe((state,error)=>onStatus?.(state,error));
 return channel;
}
export function createRemoteViewerChannel(ownerId,{onSnapshot,onEnd,onStatus}={}){
 if(!supabase)throw Error('Supabase unavailable');
 const channel=supabase.channel(boardRemoteTopic(ownerId),{config:{private:true,broadcast:{self:false}}});
 channel.on('broadcast',{event:'snapshot'},({payload})=>{
  if(validateRemoteEnvelope(payload))onSnapshot?.(payload);
 });
 channel.on('broadcast',{event:'end'},()=>onEnd?.());
 channel.subscribe(async(state,error)=>{
  onStatus?.(state,error);
  if(state==='SUBSCRIBED')await channel.send({type:'broadcast',event:'request',payload:{request:true}});
 });
 return channel;
}
export async function closeRemoteChannel(channel){
 if(channel&&supabase)await supabase.removeChannel(channel).catch(()=>{});
}
