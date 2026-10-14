import { isSupabaseConfigured, supabase } from './supabase.js';

// The server enforces leader privileges and verifies that each member is an approved teacher.
const available = () => Boolean(isSupabaseConfigured && supabase);
const errorResult = (error, fallback) => ({ ok:false, message:error?.message || fallback });
export async function listLessonCheckTeacherGroups(ownerId) {
  if (!available() || !ownerId) return errorResult(null,'Cần đăng nhập để tải nhóm giáo viên.');
  const { data, error } = await supabase.from('lesson_check_teacher_groups')
    .select('id,name,member_ids,updated_at').eq('owner_id',ownerId)
    .order('name',{ascending:true}).limit(100);
  return error ? errorResult(error,'Không tải được nhóm giáo viên.') : {ok:true,groups:data||[]};
}
export async function saveLessonCheckTeacherGroup(ownerId, {id,name,memberIds=[]}) {
  if (!available() || !ownerId) return errorResult(null,'Cần đăng nhập để lưu nhóm giáo viên.');
  const cleanName=String(name||'').trim();
  const cleanMembers=[...new Set(memberIds.filter(Boolean))].slice(0,100);
  if (!cleanName || cleanName.length>100 || !cleanMembers.length)
    return errorResult(null,'Nhập tên nhóm và chọn ít nhất một giáo viên.');
  const row={owner_id:ownerId,name:cleanName,member_ids:cleanMembers};
  if(id)row.id=id;
  const {data,error}=await supabase.from('lesson_check_teacher_groups')
    .upsert(row,{onConflict:'id'}).select('id,name,member_ids,updated_at').single();
  return error ? errorResult(error,'Không lưu được nhóm giáo viên.') : {ok:true,group:data};
}
export async function deleteLessonCheckTeacherGroup(ownerId,id) {
  if (!available() || !ownerId || !id) return errorResult(null,'Thiếu thông tin nhóm.');
  const {error}=await supabase.from('lesson_check_teacher_groups').delete()
    .eq('id',id).eq('owner_id',ownerId);
  return error ? errorResult(error,'Không xóa được nhóm giáo viên.') : {ok:true};
}
