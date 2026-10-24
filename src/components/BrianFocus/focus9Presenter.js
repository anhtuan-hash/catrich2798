import {supabase,isSupabaseConfigured} from '../../utils/supabase.js';
import {presenterPayload} from './useFocus9.js';
async function assertOwner(userId){
 if(!userId||!isSupabaseConfigured||!supabase)throw Error('Cloud sign-in required');
 const {data,error}=await supabase.auth.getUser();
 if(error||data?.user?.id!==userId)throw Error('Signed-in account does not own this presenter session');
 return userId;
}
export async function createPresenter(userId){
 await assertOwner(userId);
 const {data,error}=await supabase.from('brian_focus_v9_presenter').insert({
  user_id:userId,state:presenterPayload({},null),expires_at:new Date(Date.now()+2*3600000).toISOString(),
 }).select('id,expires_at,revoked').single();
 if(error)throw error;
 return data;
}
export async function publishPresenter(userId,id,stage,timer){
 await assertOwner(userId);
 const state=presenterPayload(stage,timer);
 const {data,error}=await supabase.from('brian_focus_v9_presenter')
  .update({state,updated_at:new Date().toISOString()})
  .eq('id',id).eq('user_id',userId).eq('revoked',false).gt('expires_at',new Date().toISOString())
  .select('id').maybeSingle();
 if(error)throw error;
 if(!data)throw Error('Presenter session expired or revoked');
 return state;
}
export async function readPresenter(userId,id){
 await assertOwner(userId);
 if(!/^[0-9a-f-]{36}$/i.test(id||''))throw Error('Invalid presenter ID');
 const {data,error}=await supabase.from('brian_focus_v9_presenter')
  .select('id,state,expires_at,revoked').eq('id',id).eq('user_id',userId).maybeSingle();
 if(error)throw error;
 if(!data||data.revoked||Date.parse(data.expires_at)<=Date.now())throw Error('Presenter session expired or inaccessible');
 return presenterPayloadToView(data.state);
}
export function presenterPayloadToView(raw){
 // Defensive re-sanitization even for rows created by authenticated users.
 return presenterPayload({
  title:raw?.objective,parts:[raw?.activity],partIndex:0,running:!!raw?.deadline,deadline:raw?.deadline,
  url:raw?.link,
 },{running:!!raw?.timerDeadline,deadline:raw?.timerDeadline},raw?.sharedAt||Date.now());
}
export async function revokePresenter(userId,id){
 await assertOwner(userId);
 const {error}=await supabase.from('brian_focus_v9_presenter').update({revoked:true}).eq('id',id).eq('user_id',userId);
 if(error)throw error;
}
