import { isSupabaseConfigured, supabase } from './supabase.js';

const invalid = message=>({ok:false,message});
const ready = () => Boolean(isSupabaseConfigured && supabase);
export async function readTeachingQueue(userId) {
 if (!ready() || !userId) return invalid('Hãy đăng nhập để tải buổi dạy.');
 const {data,error}=await supabase.from('lesson_check_teaching_queue')
  .select('activity_ids,class_name,default_minutes,updated_at').eq('user_id',userId).maybeSingle();
 return error?invalid(error.message):{ok:true,queue:data||{activity_ids:[],class_name:'',default_minutes:5}};
}
export async function writeTeachingQueue(userId,{ids=[],className='',minutes=5}) {
 if (!ready() || !userId) return invalid('Hãy đăng nhập để lưu buổi dạy.');
 const cleanIds=[...new Set(ids)].filter(Boolean).slice(0,20);
 const {data,error}=await supabase.from('lesson_check_teaching_queue').upsert({
  user_id:userId,activity_ids:cleanIds,class_name:String(className).slice(0,80),
  default_minutes:Math.max(1,Math.min(60,Number(minutes)||5)),updated_at:new Date().toISOString(),
 },{onConflict:'user_id'}).select('activity_ids,class_name,default_minutes').single();
 return error?invalid(error.message):{ok:true,queue:data};
}
export async function markRecentActivity(activityId) {
 if(!ready()||!activityId)return invalid('Không thể đồng bộ hoạt động.');
 const {data,error}=await supabase.rpc('lesson_check_mark_recent',{p_activity:activityId});
 return error?invalid(error.message):{ok:true,recentIds:data||[]};
}
