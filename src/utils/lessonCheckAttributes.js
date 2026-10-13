import { isSupabaseConfigured, supabase } from './supabase.js';
export async function listActivityAttributes() {
  if (!isSupabaseConfigured || !supabase) return {ok:false,items:[],message:'Supabase unavailable'};
  const {data,error}=await supabase.from('lesson_check_activity_attributes').select('*').limit(1000);
  return error?{ok:false,items:[],message:error.message}:{ok:true,items:data||[]};
}
export async function saveActivityAttributes(activityId,fields,userId) {
  if (!isSupabaseConfigured || !supabase || !activityId || !userId) return {ok:false,message:'Missing user or activity'};
  const keywords=Array.from(new Set(String(fields.keywords||'').split(',').map(v=>v.trim()).filter(Boolean))).slice(0,15);
  const {data,error}=await supabase.from('lesson_check_activity_attributes').upsert({
    activity_id:activityId,
    difficulty:fields.difficulty||'unclassified',
    duration_minutes:Math.max(1,Math.min(120,Number(fields.durationMinutes)||15)),
    delivery_mode:fields.deliveryMode||'whole_class',
    keywords,learning_goal:String(fields.learningGoal||'').slice(0,1000),
    updated_by:userId,updated_at:new Date().toISOString(),
  },{onConflict:'activity_id'}).select().single();
  return error?{ok:false,message:error.message}:{ok:true,item:data};
}
