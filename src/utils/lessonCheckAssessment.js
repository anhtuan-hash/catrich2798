import { isSupabaseConfigured, supabase } from './supabase.js';

const ASSIGNED_CLASSES_RPC = 'get_my_assigned_school_classes';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function activeStudent(student) {
  return student?.active !== false
    && student?.lifecycleStatus !== 'deleted'
    && !student?.deletedAt;
}

function stableStudentRef(student = {}) {
  const direct = text(student.id || student.studentRef || student.code);
  if (direct) return direct;
  const slug = text(student.fullName, 'student')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `name-${slug || 'student'}`;
}

function normalizeAssignedClass(row) {
  const payload = row?.class_payload && typeof row.class_payload === 'object' ? row.class_payload : {};
  const className = text(row?.class_name || payload.className);
  if (!className) return null;
  const students = (Array.isArray(payload.students) ? payload.students : [])
    .filter(activeStudent)
    .map((student) => ({
      ref: stableStudentRef(student),
      id: text(student.id),
      code: text(student.code),
      fullName: text(student.fullName, 'Học sinh'),
      className,
      birthDate: text(student.birthDate),
      gender: text(student.gender),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  return {
    className,
    grade: text(payload.grade, className.split('.')[0]),
    schoolYear: text(payload.schoolYear),
    room: text(payload.room),
    assignmentType: text(row?.assignment_type, 'subject'),
    registryOwnerId: text(row?.registry_owner_id),
    registryUpdatedAt: text(row?.registry_updated_at || payload.updatedAt),
    students,
  };
}

function errorResult(error, fallback) {
  return {
    ok: false,
    message: error?.message || fallback,
    code: error?.code || '',
  };
}

export async function listAssessmentAssignedClasses(user) {
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, items: [] };
  }
  const { data, error } = await supabase.rpc(ASSIGNED_CLASSES_RPC);
  if (error) return errorResult(error, 'Không tải được lớp đã phân công.');
  const byName = new Map();
  (data || []).forEach((row) => {
    const item = normalizeAssignedClass(row);
    if (!item) return;
    const current = byName.get(item.className);
    if (!current || Date.parse(item.registryUpdatedAt || 0) >= Date.parse(current.registryUpdatedAt || 0)) {
      byName.set(item.className, item);
    }
  });
  const items = [...byName.values()].sort((a, b) => (
    Number(a.grade || 0) - Number(b.grade || 0)
    || a.className.localeCompare(b.className, 'vi', { numeric: true })
  ));
  return { ok: true, items };
}

export async function saveAssessmentSession(payload) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Supabase chưa được cấu hình.' };
  }
  const { data, error } = await supabase.rpc('lesson_check_save_assessment_session', {
    p_payload: payload,
  });
  if (error) return errorResult(error, 'Không thể lưu phiên đánh giá.');
  return { ok: true, id: String(data || payload?.id || '') };
}

export async function listAssessmentSessions(className = '', limit = 100) {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, items: [] };
  }
  const { data, error } = await supabase.rpc('lesson_check_list_assessment_sessions', {
    p_class_name: text(className) || null,
    p_limit: Number(limit) || 100,
  });
  if (error) return errorResult(error, 'Không thể tải lịch sử đánh giá.');
  return {
    ok: true,
    items: (data || []).map((row) => ({
      id: row.id,
      teacherId: row.teacher_id,
      teacherName: text(row.teacher_name),
      className: text(row.class_name),
      grade: text(row.grade),
      activityId: row.activity_id || '',
      activityTitle: text(row.activity_title),
      focusArea: text(row.focus_area, 'unclassified'),
      unitNo: text(row.unit_no),
      unitTitle: text(row.unit_title),
      lessonTitle: text(row.lesson_title),
      purpose: text(row.purpose, 'formative'),
      participationMode: text(row.participation_mode, 'individual'),
      scoringMode: text(row.scoring_mode, 'manual'),
      status: text(row.status, 'draft'),
      teachingAdjustment: text(row.teaching_adjustment),
      notes: text(row.notes),
      startedAt: row.started_at || '',
      completedAt: row.completed_at || '',
      resultCount: Number(row.result_count || 0),
      studentCount: Number(row.student_count || 0),
      averageGrade10: row.average_grade_10 == null ? null : Number(row.average_grade_10),
    })),
  };
}

export async function listAssessmentResults(className = '') {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: true, items: [] };
  }
  const { data, error } = await supabase.rpc('lesson_check_list_assessment_results', {
    p_class_name: text(className) || null,
  });
  if (error) return errorResult(error, 'Không thể tải dữ liệu kết quả đánh giá.');
  return {
    ok: true,
    items: (data || []).map((row) => ({
      sessionId: row.session_id,
      teacherName: text(row.teacher_name),
      className: text(row.class_name),
      activityTitle: text(row.activity_title),
      focusArea: text(row.focus_area, 'unclassified'),
      unitNo: text(row.unit_no),
      lessonTitle: text(row.lesson_title),
      purpose: text(row.purpose, 'formative'),
      participationMode: text(row.participation_mode, 'individual'),
      scoringMode: text(row.scoring_mode, 'manual'),
      completedAt: row.completed_at || '',
      studentRef: text(row.student_ref),
      studentCode: text(row.student_code),
      studentName: text(row.student_name, 'Học sinh'),
      groupLabel: text(row.group_label),
      rawResult: text(row.raw_result),
      scoreValue: row.score_value == null ? null : Number(row.score_value),
      scoreMax: row.score_max == null ? null : Number(row.score_max),
      grade10: row.grade_10 == null ? null : Number(row.grade_10),
      achievement: text(row.achievement),
      note: text(row.note),
    })),
  };
}
