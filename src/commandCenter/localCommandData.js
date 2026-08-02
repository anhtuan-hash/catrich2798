import {
  listLocalHomeroomWorkspaces,
  loadLocalHomeroomWorkspace,
} from '../utils/homeroomClassWorkspaceStore.js';
import { commandUserKey, normalizeCommandText } from './commandCenterCore.js';

const CACHE_TTL_MS = 30000;
const MAX_CLASSES = 120;
const MAX_STUDENTS = 1400;
const cache = new Map();

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function classNameOf(item, workspace) {
  return safeText(workspace?.classProfile?.className || item?.className, 'Chưa đặt tên');
}

function decorate(entry) {
  return {
    ...entry,
    normalizedTitle: normalizeCommandText(entry.title),
    normalizedKeywords: normalizeCommandText(`${entry.keywords || ''} ${entry.subtitle || ''}`),
  };
}

function homeroomAction(workspaceId, tab = 'overview', studentQuery = '') {
  return {
    type: 'homeroom.navigate',
    workspaceId,
    tab,
    studentQuery,
  };
}

function buildClassEntry(item, workspace, language) {
  const vi = language === 'vi';
  const className = classNameOf(item, workspace);
  const profile = workspace?.classProfile || {};
  const studentCount = (workspace?.students || []).filter((student) => student?.active !== false).length;
  const schoolYear = safeText(profile.schoolYear || item?.schoolYear, '—');
  const room = safeText(profile.room, vi ? 'Chưa có phòng' : 'No room');
  const grade = safeText(profile.grade, className.split('.')[0]);
  return decorate({
    id: `class:${workspace?.id || item.id}`,
    kind: 'class',
    title: vi ? `Lớp ${className}` : `Class ${className}`,
    subtitle: vi
      ? `${schoolYear} · ${studentCount} học sinh · ${room}`
      : `${schoolYear} · ${studentCount} students · ${room}`,
    icon: className.slice(0, 3),
    color: '#0b57d0',
    priority: 18,
    keywords: `${className} lop class ${schoolYear} ${room} khoi ${grade} grade ${profile.adviserName || ''}`,
    commandAction: homeroomAction(workspace?.id || item.id, 'overview'),
    actions: [
      { id: 'open', label: vi ? 'Mở lớp' : 'Open', icon: '↗', action: homeroomAction(workspace?.id || item.id, 'overview') },
      { id: 'attendance', label: vi ? 'Điểm danh' : 'Attendance', icon: '✓', action: homeroomAction(workspace?.id || item.id, 'attendance') },
      { id: 'learning', label: vi ? 'Bảng điểm' : 'Gradebook', icon: 'Σ', action: homeroomAction(workspace?.id || item.id, 'learning') },
      { id: 'students', label: vi ? 'Học sinh' : 'Students', icon: '♙', action: homeroomAction(workspace?.id || item.id, 'students') },
    ],
    metadata: { workspaceId: workspace?.id || item.id, className, schoolYear, studentCount },
  });
}

function buildStudentEntry(student, classEntry, language) {
  const vi = language === 'vi';
  const fullName = safeText(student?.fullName, vi ? 'Học sinh chưa đặt tên' : 'Unnamed student');
  const className = classEntry?.metadata?.className || '—';
  const code = safeText(student?.code, vi ? 'chưa có mã' : 'no code');
  const workspaceId = classEntry?.metadata?.workspaceId;
  return decorate({
    id: `student:${workspaceId}:${student?.id || normalizeCommandText(`${fullName}-${code}`)}`,
    kind: 'student',
    title: fullName,
    subtitle: vi ? `Lớp ${className} · ${code}` : `Class ${className} · ${code}`,
    icon: fullName.slice(0, 1).toUpperCase(),
    color: '#34a853',
    priority: 12,
    keywords: `${fullName} ${code} hoc sinh student lop ${className} ${student?.parentName || ''} ${student?.parentPhone || ''}`,
    commandAction: homeroomAction(workspaceId, 'students', fullName),
    actions: [
      { id: 'profile', label: vi ? 'Hồ sơ' : 'Profile', icon: '♙', action: homeroomAction(workspaceId, 'students', fullName) },
      { id: 'learning', label: vi ? 'Điểm' : 'Grades', icon: 'Σ', action: homeroomAction(workspaceId, 'learning', fullName) },
      { id: 'attendance', label: vi ? 'Chuyên cần' : 'Attendance', icon: '✓', action: homeroomAction(workspaceId, 'attendance', fullName) },
      { id: 'feedback', label: vi ? 'Nhận xét' : 'Feedback', icon: '✎', action: homeroomAction(workspaceId, 'feedback', fullName) },
    ],
    metadata: {
      workspaceId,
      studentId: student?.id || '',
      fullName,
      className,
      code,
    },
  });
}

export function clearLocalCommandIndex(user = null) {
  if (user) cache.delete(commandUserKey(user));
  else cache.clear();
}

export function loadLocalCommandIndex({ user, language = 'vi', force = false } = {}) {
  const key = `${commandUserKey(user)}:${language}`;
  const cached = cache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.value;

  const catalog = listLocalHomeroomWorkspaces(user).slice(0, MAX_CLASSES);
  const classEntries = [];
  const studentEntries = [];

  for (const item of catalog) {
    const workspace = loadLocalHomeroomWorkspace(user, item.id);
    if (!workspace) continue;
    const classEntry = buildClassEntry(item, workspace, language);
    classEntries.push(classEntry);
    for (const student of workspace.students || []) {
      if (studentEntries.length >= MAX_STUDENTS) break;
      if (!student || student.active === false) continue;
      studentEntries.push(buildStudentEntry(student, classEntry, language));
    }
    if (studentEntries.length >= MAX_STUDENTS) break;
  }

  const value = {
    entries: [...classEntries, ...studentEntries],
    classes: classEntries,
    students: studentEntries,
    stats: {
      classCount: classEntries.length,
      studentCount: studentEntries.length,
      source: 'local-only',
      networkRequests: 0,
    },
  };
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
