import { initializeAuthSession, subscribeToAuthChanges } from './auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  listHomeroomWorkspaces,
  loadHomeroomWorkspace,
  saveHomeroomWorkspace,
  setAttendanceSession,
} from './homeroomStore.js';
import { attendanceSessionKey } from './homeroomPhase3.js';
import { findPetrusKyConductWeek } from '../data/homeroomAcademicPlan.js';
import { isSubjectClass } from './homeroomClassTypes.js';

const completedRuns = new Set();
const runningRuns = new Set();
const AUTO_NOTE = 'Tự động mặc định có mặt vì ngày đã qua chưa được điểm danh.';

function localIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(iso, amount) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + amount);
  return localIso(date);
}

function eachDate(startIso, endIso) {
  const dates = [];
  if (!startIso || !endIso || startIso > endIso) return dates;
  let cursor = startIso;
  let guard = 0;
  while (cursor <= endIso && guard < 400) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

function gradeNumber(workspace) {
  const match = String(workspace?.classProfile?.grade || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function attendanceStartDate(workspace) {
  const calendarStart = String(workspace?.conductSettings?.academicCalendar?.schoolYearStart || '2026-06-15').slice(0, 10);
  const schoolYear = String(workspace?.classProfile?.schoolYear || '');
  if (schoolYear !== '2026-2027') return calendarStart;

  const grade = gradeNumber(workspace);
  if (grade === 12) return calendarStart;
  if ([3, 4, 5].includes(grade)) return calendarStart > '2026-07-16' ? calendarStart : '2026-07-16';
  return calendarStart > '2026-07-15' ? calendarStart : '2026-07-15';
}

function isPastAttendanceDay(date, workspace) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getDay() === 0) return false;

  const schoolYear = String(workspace?.classProfile?.schoolYear || '');
  if (schoolYear === '2026-2027') return Boolean(findPetrusKyConductWeek(date));

  const start = attendanceStartDate(workspace);
  const end = String(workspace?.conductSettings?.academicCalendar?.schoolYearEnd || '').slice(0, 10);
  return date >= start && (!end || date <= end);
}

function dateHasSavedAttendance(attendance, date) {
  return Object.entries(attendance || {}).some(([key, rows]) => {
    if (key !== date && !key.startsWith(`${date}::`)) return false;
    return rows && typeof rows === 'object' && Object.keys(rows).length > 0;
  });
}

function buildPresentRows(students, actor) {
  const markedAt = new Date().toISOString();
  return Object.fromEntries(students.map((student) => [student.id, {
    status: 'present',
    reason: '',
    note: '',
    evidenceName: '',
    markedAt,
    markedBy: actor || 'Hệ thống',
    autoDefault: true,
  }]));
}

function backfillWorkspace(workspace, user) {
  if (!workspace || workspace.status === 'archived' || isSubjectClass(workspace)) return { changed: false, workspace };
  const students = (workspace.students || []).filter((student) => student.active !== false && student.id);
  if (!students.length) return { changed: false, workspace };

  const today = localIso();
  const lastPastDay = addDays(today, -1);
  const start = attendanceStartDate(workspace);
  const actor = user?.email || user?.name || 'Hệ thống';
  let next = workspace;
  let changed = false;

  eachDate(start, lastPastDay).forEach((date) => {
    if (!isPastAttendanceDay(date, workspace)) return;
    if (dateHasSavedAttendance(next.attendance, date)) return;

    const key = attendanceSessionKey(date, 'morning', '');
    next = setAttendanceSession(next, key, buildPresentRows(students, actor), {
      date,
      session: 'morning',
      period: '',
      note: AUTO_NOTE,
    });
    next = {
      ...next,
      attendanceSessions: {
        ...next.attendanceSessions,
        [key]: {
          ...(next.attendanceSessions?.[key] || {}),
          autoDefault: true,
          autoDefaultRule: 'past-unmarked-present',
        },
      },
    };
    changed = true;
  });

  return { changed, workspace: next };
}

async function backfillForUser(user) {
  if (!user?.id && !user?.email) return;
  const today = localIso();
  const userKey = String(user.id || user.authId || user.email).toLowerCase();
  const runKey = `${userKey}:${today}`;
  if (completedRuns.has(runKey) || runningRuns.has(runKey)) return;
  runningRuns.add(runKey);

  try {
    const catalogResult = await listHomeroomWorkspaces(user);
    const ids = new Set(
      (catalogResult?.items || [])
        .filter((item) => item?.id && item.status !== 'archived')
        .map((item) => item.id),
    );
    const currentId = getCurrentHomeroomWorkspaceId(user);
    if (currentId) ids.add(currentId);

    for (const id of ids) {
      try {
        const loaded = await loadHomeroomWorkspace(user, id);
        const result = backfillWorkspace(loaded?.workspace, user);
        if (result.changed) await saveHomeroomWorkspace(result.workspace, user);
      } catch (error) {
        console.warn('[Attendance defaults] Could not backfill workspace:', id, error?.message || error);
      }
    }

    completedRuns.add(runKey);
  } finally {
    runningRuns.delete(runKey);
  }
}

function scheduleBackfill(user) {
  if (!user) return;
  window.setTimeout(() => {
    backfillForUser(user).catch((error) => console.warn('[Attendance defaults] Backfill failed:', error?.message || error));
  }, 250);
}

export function installPastAttendanceDefaults() {
  if (typeof window === 'undefined') return () => {};
  const unsubscribe = subscribeToAuthChanges(scheduleBackfill);
  initializeAuthSession().then(scheduleBackfill).catch(() => {});
  return unsubscribe;
}

installPastAttendanceDefaults();
