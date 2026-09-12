import { normalizeSupplementalActivity } from './attendanceActivity.js';

function requireClient(client) {
  if (!client?.rpc) throw new Error('Supabase client is not ready.');
  return client;
}
async function rpc(client, name, params = {}) {
  const { data, error } = await requireClient(client).rpc(name, params);
  if (error) throw error;
  return data;
}
function isoDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
function compact(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}
function teacherPayload(teachers = []) {
  return (teachers || []).map((teacher) => ({
    teacherId: teacher.teacherId || teacher.id || null,
    fullName: teacher.fullName || teacher.teacherName || '',
    email: teacher.email || teacher.teacherEmail || '',
  }));
}

// Class-centric facade used by the simplified Học bổ sung management UI.
export async function loadSupplementalClasses(client, { includeArchived = true } = {}) {
  return (await rpc(client, 'bes_list_supplemental_classes', { p_include_archived: includeArchived })) || [];
}
export async function upsertSupplementalClass(client, input = {}) {
  return rpc(client, 'bes_upsert_supplemental_class', compact({
    p_group_name: input.className || input.groupName || '',
    p_subject: input.subject || '',
    p_grade_level: input.gradeLevel || '',
    p_start_date: isoDate(input.startDate),
    p_end_date: isoDate(input.endDate),
    p_weekdays: (input.weekdays || []).map(Number),
    p_start_time: input.startTime || '',
    p_end_time: input.endTime || '',
    p_group_id: input.id || input.groupId || null,
    p_room: input.room || '',
    p_note: input.note || '',
    p_active: input.active !== false,
    p_teachers: teacherPayload(input.teachers),
  }));
}
export async function archiveSupplementalClass(client, groupId, reason = '') {
  return rpc(client, 'bes_archive_supplemental_class', { p_group_id: groupId, p_reason: reason || 'Lớp đã được lưu trữ' });
}
export async function upsertSupplementalClassMember(client, input = {}) {
  return rpc(client, 'bes_upsert_supplemental_class_member', compact({
    p_group_id: input.groupId,
    p_full_name: input.fullName || '',
    p_student_id: input.studentId || null,
    p_student_code: input.studentCode || '',
    p_school_class_name: input.schoolClassName || '',
    p_effective_from: isoDate(input.effectiveFrom || new Date()),
  }));
}
export async function setSupplementalClassMemberStatus(client, input = {}) {
  return rpc(client, 'bes_set_supplemental_class_member_status', {
    p_group_id: input.groupId,
    p_student_id: input.studentId,
    p_active: input.active === true,
    p_effective_date: isoDate(input.effectiveDate || new Date()),
    p_removal_reason: input.removalReason || '',
  });
}
export async function setSupplementalClassTeachers(client, groupId, teachers = []) {
  return rpc(client, 'bes_set_supplemental_class_teachers', { p_group_id: groupId, p_teachers: teacherPayload(teachers) });
}

// Legacy adapters remain callable for backward compatibility. The simplified UI
// deliberately does not use official-student linking or adhoc-session creation.
export async function loadSupplementalAdminData(client) {
  return (await rpc(client, 'bes_list_supplemental_admin_data')) || {};
}
export async function upsertSupplementalStudent(client, input = {}) {
  return rpc(client, 'bes_upsert_supplemental_student', compact({
    p_student_id: input.id || null, p_source_type: input.sourceType || 'manual', p_official_key: input.officialKey || null,
    p_student_code: input.studentCode || '', p_full_name: input.fullName || '', p_school_class_name: input.schoolClassName || '', p_active: input.active !== false,
  }));
}
export async function linkSupplementalStudent(client, studentId, officialKey) {
  return rpc(client, 'bes_link_supplemental_student', { p_student_id: studentId, p_official_key: officialKey });
}
export async function upsertSupplementalGroup(client, input = {}) {
  return rpc(client, 'bes_upsert_supplemental_group', compact({
    p_group_id: input.id || null, p_group_name: input.groupName || '', p_subject: input.subject || '', p_grade_level: input.gradeLevel || '',
    p_teacher_id: input.teacherId || null, p_teacher_name: input.teacherName || '', p_teacher_email: input.teacherEmail || '', p_room: input.room || '',
    p_start_date: isoDate(input.startDate), p_end_date: isoDate(input.endDate), p_weekdays: input.weekdays || [], p_start_time: input.startTime || '', p_end_time: input.endTime || '', p_active: input.active !== false,
  }));
}
export async function setSupplementalMembership(client, input = {}) {
  return rpc(client, 'bes_set_supplemental_membership', compact({
    p_membership_id: input.id || null, p_group_id: input.groupId, p_student_id: input.studentId,
    p_effective_from: isoDate(input.effectiveFrom), p_effective_until: input.effectiveUntil ? isoDate(input.effectiveUntil) : null, p_removal_reason: input.removalReason || '',
  }));
}
export async function upsertSupplementalSession(client, input = {}) {
  return rpc(client, 'bes_upsert_supplemental_session', compact({
    p_session_id: input.id || null, p_group_id: input.groupId || null, p_kind: input.kind || 'adhoc', p_title: input.title || '', p_attendance_date: isoDate(input.attendanceDate),
    p_subject: input.subject || '', p_teacher_id: input.teacherId || null, p_teacher_name: input.teacherName || '', p_teacher_email: input.teacherEmail || '', p_room: input.room || '',
    p_start_time: input.startTime || '', p_end_time: input.endTime || '', p_participant_ids: input.participantIds || [], p_session_note: input.sessionNote || '',
  }));
}
export async function cancelSupplementalSession(client, sessionId, reason = '') {
  return rpc(client, 'bes_cancel_supplemental_session', { p_session_id: sessionId, p_reason: reason });
}
export async function deleteSupplementalAttendanceHistory(client, sessionId) {
  return rpc(client, 'bes_delete_supplemental_attendance_history', { p_session_id: sessionId });
}
export async function loadSupplementalAttendanceActivities(client, range = {}) {
  const data = await rpc(client, 'bes_list_supplemental_attendance', { p_from: isoDate(range.from), p_to: isoDate(range.to) });
  return (Array.isArray(data) ? data : []).map(normalizeSupplementalActivity);
}
export async function beginSupplementalAttendance(client, sessionId) {
  return rpc(client, 'bes_begin_supplemental_attendance', { p_session_id: sessionId });
}
export async function confirmSupplementalAttendance(client, input = {}) {
  return rpc(client, 'bes_confirm_supplemental_attendance_v2', {
    p_session_id: input.sessionId,
    p_participants: (input.participants || []).map((item) => ({ participantId: item.participantId || item.id, status: item.status || 'present', absenceReasonCode: item.absenceReasonCode || '', absenceNote: item.absenceNote || '' })),
    p_session_note: input.sessionNote || '',
    p_proof_path: input.proofPath || '',
    p_lesson_periods: Number(input.lessonPeriods || 1),
    p_teacher_name: input.teacherName || '',
    p_room: input.room || '',
    p_start_time: input.startTime || null,
    p_end_time: input.endTime || null,
  });
}
export async function attachSupplementalProof(client, sessionId, proofPath) {
  return rpc(client, 'bes_attach_supplemental_proof', { p_session_id: sessionId, p_proof_path: proofPath });
}
export async function loadSupplementalHistory(client, range = {}, query = '') {
  return (await rpc(client, 'bes_list_supplemental_history', { p_from: isoDate(range.from), p_to: isoDate(range.to), p_query: query || '' })) || [];
}
export async function loadSupplementalStudentReport(client, range = {}, studentKey = null) {
  return (await rpc(client, 'bes_supplemental_student_report', { p_from: isoDate(range.from), p_to: isoDate(range.to), p_student_key: studentKey })) || [];
}
export async function loadAttendanceActivities(client, range = {}, activityType = 'all') {
  return (await rpc(client, 'bes_list_attendance_activities', { p_from: isoDate(range.from), p_to: isoDate(range.to), p_activity_type: activityType })) || [];
}
