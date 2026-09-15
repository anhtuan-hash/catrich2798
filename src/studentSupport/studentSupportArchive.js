import { supabase } from '../utils/supabase.js';
import { restoreDeletedEntity } from '../utils/collaborationGovernance.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  return supabase;
}

function requireUser(user) {
  if (!user?.id) throw new Error('Cần đăng nhập để thao tác Student Support.');
  return user;
}

export async function archiveSupportCase(caseId, user) {
  requireUser(user);
  const client = requireClient();
  const { data: deletedItemId, error } = await client.rpc('bes_archive_student_support_case', {
    p_case_id: caseId,
  });
  if (error) throw error;
  if (!deletedItemId) throw new Error('Không thể tạo bản ghi lưu trữ Student Support.');
  const { data: archivedCase, error: caseError } = await client
    .from('student_support_cases')
    .select('*')
    .eq('id', caseId)
    .single();
  if (caseError) throw caseError;
  return archivedCase;
}

export async function restoreSupportCase(caseId, user) {
  requireUser(user);
  const client = requireClient();
  const { data: record, error } = await client
    .from('deleted_items')
    .select('*')
    .eq('entity_type', 'student_support_case')
    .eq('entity_id', String(caseId))
    .eq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!record) throw new Error('Không tìm thấy hồ sơ Student Support trong Thùng rác.');
  await restoreDeletedEntity(record, user);
  const { data: restoredCase, error: caseError } = await client
    .from('student_support_cases')
    .select('*')
    .eq('id', caseId)
    .single();
  if (caseError) throw caseError;
  return restoredCase;
}
