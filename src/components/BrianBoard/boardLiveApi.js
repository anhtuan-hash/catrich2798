/** Classroom Guest API - all entry/guest reads pass through narrow server RPCs.
 * No public table writes, service role, client-supplied ownership or anonymous Realtime.
 */
import {supabase,isSupabaseConfigured} from '../../utils/supabase.js';
const ensure=()=>{if(!supabase||!isSupabaseConfigured)throw Error('Classroom connection is unavailable');};
const safeCode=code=>String(code||'').trim().toLowerCase();
const safeId=id=>/^[0-9a-f-]{36}$/.test(String(id||''))?id:null;
async function rpc(name,args){
 ensure();
 const {data,error}=await supabase.rpc(name,args);
 if(error)throw Error(error.message||'Classroom request was rejected');
 return data;
}
export async function createGuestRoom(session){
 if(!['poll','cloud','wall'].includes(session?.mode))throw Error('Select a classroom activity');
 const auth=await supabase.auth.getUser();
 if(auth.error||!auth.data?.user?.id)throw Error('Sign in as an approved teacher');
 return rpc('bbd_live_create',{p_mode:session.mode,p_question:String(session.question||'').slice(0,220),
  p_options:session.mode==='poll'?session.options.slice(0,6):[]});
}
export const joinGuestRoom=code=>rpc('bbd_live_join',{p_code:safeCode(code)});
export const getGuestRoom=(code,token)=>rpc('bbd_live_guest_state',{
 p_code:safeCode(code),p_token:String(token||'')});
export const submitGuestRoom=(code,token,choice,body)=>rpc('bbd_live_submit',{
 p_code:safeCode(code),p_token:String(token||''),
 p_choice:Number.isInteger(choice)?choice:null,p_body:typeof body==='string'?body:null});
export const teacherRoomState=id=>rpc('bbd_live_teacher_state',{p_room:safeId(id)});
export const controlTeacherRoom=(id,action,entry=null,value=null)=>rpc('bbd_live_teacher_control',{
 p_room:safeId(id),p_action:action,p_entry:safeId(entry),p_value:value});
export function composeGuestPublicSession(room,baseSession){
 if(!room)return baseSession;
 const mode=room.mode;
 const approved=(room.entries||[]).filter(x=>x.status==='approved');
 return {...(baseSession||{}),id:room.id,mode,
  status:room.status,question:room.question,options:room.options||[],
  showResults:room.showResults!==false,expiresAt:room.expiresAt,
  startedAt:Math.min(Date.now(),(baseSession?.startedAt)||Date.now()-1000),
  votes:mode==='poll'?(room.votes||[]):[],
  submissions:mode==='poll'?[]:approved.map(x=>({id:x.id,text:x.text,at:x.at||0})),
  queue:[],version:(baseSession?.version||0)+1};
}
export function safeGuestShareUrl(code){
 if(!/^[0-9a-f]{12}$/.test(String(code||'')))throw Error('Invalid class code');
 return location.origin+'/#/board-live?code='+encodeURIComponent(code);
}
