import { supabase } from '../utils/supabase.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  return supabase;
}

function clean(value) {
  return String(value ?? '').trim();
}

async function run(query) {
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function listSupportRules({ enabledOnly = false } = {}) {
  let query = requireClient().from('student_support_rules').select('*').order('name', { ascending: true }).limit(200);
  if (enabledOnly) query = query.eq('enabled', true);
  return run(query);
}

export async function listTeacherObservations({ studentRef = '', workspaceId = '', teacherId = '' } = {}) {
  let query = requireClient()
    .from('student_support_teacher_observations')
    .select('*')
    .is('archived_at', null)
    .order('observation_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300);
  if (clean(studentRef)) query = query.eq('student_ref', clean(studentRef));
  if (clean(workspaceId)) query = query.eq('homeroom_workspace_id', clean(workspaceId));
  if (clean(teacherId)) query = query.eq('teacher_id', clean(teacherId));
  return run(query);
}

export async function listCaseActions(caseId) {
  const id = clean(caseId);
  if (!id) return [];
  return run(requireClient()
    .from('student_support_actions')
    .select('*')
    .eq('case_id', id)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(300));
}

export async function listCaseNotes(caseId) {
  const id = clean(caseId);
  if (!id) return [];
  return run(requireClient()
    .from('student_support_notes')
    .select('*')
    .eq('case_id', id)
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(300));
}

export async function listFamilyContacts(caseId) {
  const id = clean(caseId);
  if (!id) return [];
  return run(requireClient()
    .from('student_support_family_contacts')
    .select('*')
    .eq('case_id', id)
    .order('contacted_at', { ascending: true })
    .limit(300));
}

export async function listCaseEvents(caseId) {
  const id = clean(caseId);
  if (!id) return [];
  return run(requireClient()
    .from('student_support_case_events')
    .select('*')
    .eq('case_id', id)
    .order('created_at', { ascending: true })
    .limit(500));
}
