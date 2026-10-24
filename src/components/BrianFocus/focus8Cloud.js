import {supabase,isSupabaseConfigured} from '../../utils/supabase.js';
import {normalizeFocus8} from './useFocus8Data.js';

async function owner(userId){
 if(!supabase||!isSupabaseConfigured||!userId)throw new Error('Please sign in to use Focus Cloud.');
 const {data,error}=await supabase.auth.getUser();
 if(error||!data?.user||data.user.id!==userId)throw new Error('Account authentication required; cloud action not authorized.');
 return data.user.id;
}
export async function saveFocus8Vault(userId,settings,version=1){
 const uid=await owner(userId);
 const payload={schema:'brian-focus-v8',settings:normalizeFocus8(settings)};
 const {data,error}=await supabase.from('brian_focus_v8_vault')
  .upsert({user_id:uid,payload,version:Math.max(1,Math.round(version)),updated_at:new Date().toISOString()},{onConflict:'user_id'})
  .select('version,updated_at').single();
 if(error)throw error;
 return data;
}
export async function loadFocus8Vault(userId){
 const uid=await owner(userId);
 const {data,error}=await supabase.from('brian_focus_v8_vault')
  .select('payload,version,updated_at').eq('user_id',uid).maybeSingle();
 if(error)throw error;
 return data?.payload?.schema==='brian-focus-v8'
  ? {settings:normalizeFocus8(data.payload.settings),version:data.version,updatedAt:data.updated_at}
  : null;
}
const COMMANDS=['timer-toggle','timer-reset','clock-next','classroom-toggle','mood-next','scene-next','volume-up','volume-down','layout-toggle','focus-close'];
export function validateFocus8Command(input){
 if(!COMMANDS.includes(input?.type))throw new Error('Invalid remote command');
 return {type:input.type};
}
export async function createFocus8Remote(userId){
 const uid=await owner(userId);
 const code=Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');
 const {data,error}=await supabase.from('brian_focus_v8_remote')
 .insert({user_id:uid,code,expires_at:new Date(Date.now()+10*60000).toISOString()})
 .select('id,code,expires_at,revoked,seq').single();
 if(error)throw error;
 return data;
}
export async function getFocus8Remote(userId,id,code){
 const uid=await owner(userId);
 const {data,error}=await supabase.from('brian_focus_v8_remote')
 .select('id,code,expires_at,revoked,seq,command').eq('id',id).eq('user_id',uid).maybeSingle();
 if(error)throw error;
 if(!data||data.revoked||new Date(data.expires_at).getTime()<Date.now()||data.code!==code)
  throw new Error('Pairing expired, revoked or not authorized.');
 return data;
}
export async function sendFocus8RemoteCommand(userId,id,code,command){
 const s=await getFocus8Remote(userId,id,code);
 const {data,error}=await supabase.from('brian_focus_v8_remote')
  .update({command:validateFocus8Command(command),seq:s.seq+1,updated_at:new Date().toISOString()})
  .eq('id',id).eq('user_id',userId).eq('seq',s.seq).eq('revoked',false)
  .select('seq').single();
 if(error)throw error;
 return data;
}
export async function revokeFocus8Remote(userId,id){
 await owner(userId);
 const {error}=await supabase.from('brian_focus_v8_remote').update({revoked:true})
 .eq('id',id).eq('user_id',userId);
 if(error)throw error;
}
