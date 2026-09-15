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

  const [liveResult, observationsResult, scope] = await Promise.all([
    resolvedWorkspace
      ? supabase.rpc('bes_get_student_support_student_360', {
          p_student_ref: studentRef,
          p_workspace_id: resolvedWorkspace,
        })
      : Promise.resolve({ data: null, error: null }),
    supabase.from('student_support_teacher_observations').select('*').eq('student_ref', studentRef).order('observation_date', { ascending: false }).limit(120),
    loadStudentSupportScope(),
  ]);

  if (liveResult?.error) throw liveResult.error;
  if (observationsResult?.error && !isMissingStudentSupportSourceError(observationsResult.error)) {
    throw observationsResult.error;
  }

  const live = liveResult?.data && typeof liveResult.data === 'object' ? liveResult.data : {};
  const liveStudent = live.student && typeof live.student === 'object' ? live.student : {};
  const attendance = Array.isArray(live.attendance) ? live.attendance : [];
  const grades = Array.isArray(live.grades) ? live.grades : [];

  return {
    student: {
      studentRef: clean(liveStudent.student_ref || studentRef),
      code: clean(liveStudent.code || code),
      fullName: clean(liveStudent.full_name || student.fullName || student.full_name),
      className: clean(liveStudent.class_name || student.className || student.class_name),
      workspaceId: clean(liveStudent.workspace_id || resolvedWorkspace),
      schoolYear: clean(liveStudent.school_year || student.schoolYear || student.school_year),
      grade: clean(liveStudent.grade || student.grade),
      lifecycleStatus: clean(liveStudent.lifecycle_status || 'active'),
    },
    attendance: attendance.map((row) => ({
      date: row.date || row.attendance_date || '',
      status: row.status || '',
      sessionName: row.session_name || row.sessionName || '',
      periodNo: row.period_no ?? null,
      note: row.note || '',
      reason: row.reason || '',
      source: 'homeroom',
    })),
    grades: grades.map((row) => ({
      date: row.date || row.created_at || row.updated_at || '',
      score: Number(row.score ?? row.value ?? row.grade),
      subject: row.subject || '',
      period: row.period || '',
      assessmentType: row.assessment_type || row.assessmentType || row.type || '',
      source: 'gradebook',
    })).filter((row) => Number.isFinite(row.score)),
    observations: observationsResult.error ? [] : (observationsResult.data || []),
    assignmentScope: scope,
  };
}
