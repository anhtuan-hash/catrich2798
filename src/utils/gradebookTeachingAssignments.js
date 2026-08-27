import { isSupabaseConfigured, supabase } from './supabase.js';

const DEFAULT_SUBJECT = 'Tiếng Anh';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function asList(value) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferGrade(className = '') {
  const match = text(className).match(/^(10|11|12)(?:\.|\s|$)/);
  return match?.[1] || '';
}

function assignmentId(departmentId, className, subject) {
  return [departmentId, className, subject]
    .map((part) => text(part).toLowerCase().replace(/\s+/g, '-'))
    .join(':');
}

function normalizeRow(row) {
  const member = row?.member && typeof row.member === 'object' ? row.member : {};
  const subject = text(member.teachingSubject, DEFAULT_SUBJECT);
  const teachingClasses = asList(member.teachingClasses);
  const teachingGrades = asList(member.teachingGrades);

  return teachingClasses.map((className) => ({
    id: assignmentId(row?.department_id, className, subject),
    className,
    grade: inferGrade(className) || teachingGrades.find((item) => className.startsWith(item)) || '',
    subject,
    departmentId: text(row?.department_id),
    departmentName: text(row?.department_name, 'Tổ chuyên môn'),
    departmentShortName: text(row?.department_short_name),
    teacherAccountId: text(row?.teacher_account_id),
    homeroomClass: text(member.homeroomClass),
    weeklyPeriods: Number(member.weeklyPeriods) || 0,
    syncedAt: row?.synced_at || '',
    source: 'brian-team',
  }));
}

function isMissingAssignmentRpc(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  return code === 'PGRST202'
    || code === '42883'
    || message.includes('bes_my_brian_assignments') && (
      message.includes('could not find')
      || message.includes('does not exist')
      || message.includes('schema cache')
    );
}

export async function listMyGradebookTeachingAssignments(user) {
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, assignments: [], source: 'no-cloud' };
  }

  const { data, error } = await supabase.rpc('bes_my_brian_assignments');
  if (error) {
    return {
      ok: false,
      assignments: [],
      source: isMissingAssignmentRpc(error) ? 'assignment-sync-not-installed' : 'assignment-sync-error',
      message: error.message || 'Không thể tải phân công giảng dạy.',
      optional: true,
    };
  }

  const deduped = new Map();
  (data || []).flatMap(normalizeRow).forEach((item) => {
    if (!item.className) return;
    const key = `${item.className.toLowerCase()}::${item.subject.toLowerCase()}`;
    if (!deduped.has(key)) deduped.set(key, item);
  });

  const assignments = [...deduped.values()].sort((a, b) => (
    a.grade.localeCompare(b.grade, 'vi')
    || a.className.localeCompare(b.className, 'vi', { numeric: true })
    || a.subject.localeCompare(b.subject, 'vi')
  ));

  return { ok: true, assignments, source: 'brian-team-sync' };
}

export function matchGradebookClassToAssignment(classItem, assignment) {
  const className = text(classItem?.className).toLowerCase();
  const assignedName = text(assignment?.className).toLowerCase();
  if (!className || !assignedName || className !== assignedName) return false;
  const currentSubject = text(classItem?.teachingSubject || classItem?.subject).toLowerCase();
  const assignedSubject = text(assignment?.subject).toLowerCase();
  return !currentSubject || !assignedSubject || currentSubject === assignedSubject;
}
