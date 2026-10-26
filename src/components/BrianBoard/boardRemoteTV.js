/** Authenticated same-owner TV channel. Default disabled; no public/anon transport.
 * Realtime.topic RLS binds channel to auth.uid() at database level.
 */
import {supabase,isSupabaseConfigured} from '../../utils/supabase.js';
import {boardRemoteTopic,validateRemoteEnvelope} from './boardRemoteTVCore.js';
export {boardRemoteTopic,validateRemoteEnvelope,REMOTE_MAX_BYTES,REMOTE_MAX_MESSAGES,
 REMOTE_DURATION_MS,REMOTE_MIN_INTERVAL_MS} from './boardRemoteTVCore.js';
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
