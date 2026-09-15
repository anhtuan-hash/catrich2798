import { supabase } from '../utils/supabase.js';
import { normalizeStudentRef } from './studentSupportIdentity.js';

function clean(value) {
  return String(value || '').trim();
}

export function isMissingStudentSupportSourceError(error) {
  const code = clean(error?.code).toUpperCase();
  const message = clean(error?.message || error).toLowerCase();
  const isMissingCode = code === '42P01' || code === 'PGRST205' || code === 'PGRST202';
  const referencesStudentSupport = message.includes('student_support_');
  const missingMessage = /does not exist|could not find|schema cache/.test(message);
  return referencesStudentSupport && (isMissingCode || missingMessage);
}

async function loadCanonicalStudentRecord(studentRef, fallbackCode, workspaceId) {
  if (!workspaceId) return null;
  const code = clean(fallbackCode || (studentRef.startsWith('code:') ? studentRef.slice(5) : ''));
  let query = supabase
    .from('bes_homeroom_students')
    .select('student_ref,code,full_name,lifecycle_status')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null);
  query = code ? query.eq('code', code) : query.eq('student_ref', studentRef);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function loadWorkspaceMetadata(workspaceId) {
  if (!workspaceId) return null;
  const { data, error } = await supabase
    .from('bes_homeroom_workspaces')
    .select('workspace_id,class_name,school_year')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function searchScopedStudents(query, limit = 30) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const p_query = clean(query);
  const p_limit = Math.max(1, Math.min(50, Number(limit) || 30));
  const { data, error } = await supabase.rpc('bes_search_student_support_students', { p_query, p_limit });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function loadStudentSupportScope() {
  if (!supabase) return { isHomeroomOwner: false, subjectClasses: [] };
  const { data, error } = await supabase.rpc('get_my_assigned_school_classes');
  if (error) throw error;
  const classes = Array.isArray(data) ? data : [];
  return {
    isHomeroomOwner: false,
    subjectClasses: classes.map((item) => clean(item.class_name || item.className)).filter(Boolean),
  };
}

export async function loadStudent360Facts({ student = {}, workspaceId = '' } = {}) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const studentRef = normalizeStudentRef(student);
  if (!studentRef) throw new Error('Học sinh chưa có mã định danh ổn định.');
  const code = clean(student.code || student.student_code || student.studentCode);
  const resolvedWorkspace = clean(workspaceId || student.workspaceId || student.workspace_id);

  const [studentResult, workspaceResult, attendanceResult, gradesResult, observationsResult, scope] = await Promise.all([
    loadCanonicalStudentRecord(studentRef, code, resolvedWorkspace),
    loadWorkspaceMetadata(resolvedWorkspace),
    resolvedWorkspace
      ? supabase.from('bes_homeroom_attendance').select('*').eq('workspace_id', resolvedWorkspace).eq('student_ref', studentRef).order('attendance_date', { ascending: false }).limit(120)
      : Promise.resolve({ data: [], error: null }),
    resolvedWorkspace
      ? supabase.from('bes_homeroom_learning_records').select('*').eq('workspace_id', resolvedWorkspace).eq('student_ref', studentRef).order('created_at', { ascending: false }).limit(120)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('student_support_teacher_observations').select('*').eq('student_ref', studentRef).order('observation_date', { ascending: false }).limit(120),
    loadStudentSupportScope(),
  ]);

  if (attendanceResult?.error) throw attendanceResult.error;
  if (gradesResult?.error) throw gradesResult.error;
  if (observationsResult?.error && !isMissingStudentSupportSourceError(observationsResult.error)) {
    throw observationsResult.error;
  }

  return {
    student: {
      studentRef: clean(studentResult?.student_ref || studentRef),
      code: clean(studentResult?.code || code),
      fullName: clean(studentResult?.full_name || student.fullName || student.full_name),
      className: clean(workspaceResult?.class_name || student.className || student.class_name),
      workspaceId: clean(workspaceResult?.workspace_id || resolvedWorkspace),
      schoolYear: clean(workspaceResult?.school_year || student.schoolYear || student.school_year),
      grade: clean(student.grade),
      lifecycleStatus: clean(studentResult?.lifecycle_status || 'active'),
    },
    attendance: (attendanceResult.data || []).map((row) => ({
      date: row.attendance_date || row.date || '',
      status: row.status || '',
      sessionName: row.session_name || row.sessionName || '',
      periodNo: row.period_no ?? null,
      source: 'homeroom',
    })),
    grades: (gradesResult.data || []).map((row) => ({
      date: row.created_at || row.updated_at || '',
      score: Number(row.score ?? row.value ?? row.grade),
      subject: row.subject || '',
      period: row.period || '',
      assessmentType: row.assessment_type || row.type || '',
      source: 'homeroom',
    })).filter((row) => Number.isFinite(row.score)),
    observations: observationsResult.error ? [] : (observationsResult.data || []),
    assignmentScope: scope,
  };
}