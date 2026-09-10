import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { readSheet } from 'read-excel-file/browser';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import {
  ATTENDANCE_PERMISSION_ITEMS,
  getFirstAllowedAttendanceTab,
  hasAnyAttendanceAccess,
  hasAttendanceTabAccess,
} from '../utils/permissions.js';
import {
  ABSENCE_REASON_OPTIONS,
  ATTENDANCE_STATUS,
  ATTENDANCE_SUBJECT_HUB,
  attendanceStatusLabel,
  attendanceSubjectKey,
  attendanceSummary,
  buildAttendanceDraft,
  normalizeAttendanceStatus,
  extraClassTypeLabel,
  memberKey,
  parseExtraClassRosterRows,
  sortMembersByName,
} from '../utils/extraClassAttendance.js';
import { isExtraClassScheduledOnDate, roomForExtraClass } from '../utils/extraClassSchedule2026.js';
import {
  giftedAssignmentForClass,
  teachersForGiftedAssignment,
} from '../utils/giftedTeacherCatalog2026.js';
import './GlobalAttendanceNavigationTab.css';
import './GlobalAttendanceDailyCalendar.css';
import './GlobalAttendanceManualTeacher.css';
import AttendanceMonthlyReport from './attendance/AttendanceMonthlyReport.jsx';
import AttendanceClassManagementWorkspace from './attendance/AttendanceClassManagementWorkspace.jsx';
import AttendanceDailySchedule from './attendance/AttendanceDailySchedule.jsx';
import { ATTENDANCE_PROOF_BUCKET, buildAttendanceProofPath, prepareAttendanceProofImage } from '../utils/attendanceProofImage.js';
import './attendance/AttendanceMaterial3.css';
import './attendance/AttendanceHistoryV2.css';

const CLASS_COLUMNS = 'id,class_type,class_name,subject,teacher_id,teacher_name,teacher_email,active,source_key,school_year,grade_level,expected_student_count,periods_per_week,room,weekdays,time_range,created_by,updated_by,created_at,updated_at';
const MEMBER_COLUMNS = 'id,class_id,member_key,student_code,student_full_name,school_class_name,active,joined_at,left_at,created_by,updated_by,removed_by,removal_reason,created_at,updated_at';
const CLASS_TEACHER_COLUMNS = 'id,class_id,teacher_id,teacher_name,teacher_email,position,source_key,created_at,updated_at';
const SESSION_COLUMNS = 'id,class_id,class_type,class_name,subject,teacher_id,teacher_name,teacher_email,attendance_date,checked_at,checked_by,total_students,present_count,absent_count,note,session_status,lesson_periods,cancellation_reason,teaching_room,teaching_time_range,proof_path,created_at';
const RECORD_COLUMNS = 'id,session_id,class_id,member_id,member_key,student_code,student_full_name,school_class_name,status,recorded_at,absence_reason_code,absence_note';
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const PATHS = {
  attendance: 'M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v16h18V5a2 2 0 0 0-2-2Zm0 16H5V8h14v11Zm-8.3-2.2-3.1-3.1 1.4-1.4 1.7 1.7 4.3-4.3 1.4 1.4-5.7 5.7Z',
  close: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
  upload: 'M11 16h2V8l3.5 3.5 1.4-1.4L12 4.2l-5.9 5.9 1.4 1.4L11 8v8Zm-6 4h14v-2H5v2Z',
  add: 'M11 5h2v6h6v2h6v2h-6v6h-2v-6H5v-2h6V5Z',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Zm7 0c-.7 0-1.4.1-2 .2 2.4 1.2 4 2.9 4 4.8v3h5v-2.6c0-3-3.1-5.4-7-5.4Z',
  history: 'M13 3a9 9 0 1 0 8.5 12h-2.2A7 7 0 1 1 17 7.1V10h2V3h-2v1.7A8.9 8.9 0 0 0 13 3Zm-1 5v5.2l4 2.4 1-1.7-3-1.8V8h-2Z',
  trash: 'M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2H7Zm1-11v8h2v-8H8Zm6 0v8h2v-8h-2ZM8 4l1-1h6l1 1h4v2H4V4h4Z',
  check: 'm9.2 17.2-5-5 1.4-1.4 3.6 3.6 8.9-8.9 1.4 1.4-10.3 10.3Z',
  refresh: 'M18.4 5.6A8 8 0 1 0 20 14h-2.1a6 6 0 1 1-1-6.8L14 10h7V3l-2.6 2.6Z',
  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v15h18V6a2 2 0 0 0-2-2Zm0 15H5V9h14v10ZM7 11h4v4H7v-4Z',
  teacher: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5Zm6.5-8.5 2 2 2-2-2-2-2 2Z',
  book: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H7a3 3 0 0 0-3 3V4.5Zm3 11.5h11V4H6.5A.5.5 0 0 0 6 4.5v11.9c.3-.2.6-.4 1-.4Zm0 2a1 1 0 0 0 0 2h13v-2H7Z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-13h-2v6l5 3 1-1.7-4-2.3V7Z',
  room: 'M12 2a7 7 0 0 0-7 7c0 5.1 7 13 7 13s7-7.9 7-13a7 7 0 0 0-7-7Zm0 10.5A3.5 3.5 0 1 1 12 5a3.5 3.5 0 0 1 0 7.5Z',
  periods: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 5h12V6H6v2Zm0 5h12v-2H6v2Zm0 5h8v-2H6v2Z',
  late: 'M12 2a10 10 0 1 0 9.5 13h-2.2A8 8 0 1 1 12 4v8l5 3-1 1.7-6-3.6V4.3A8 8 0 0 1 12 4V2Zm8 1v6h-2V3h2Zm0 8a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z',
  absent: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v3h12.2a6.5 6.5 0 0 1-.2-1.5c0-2.2 1.1-4.2 2.8-5.4A15 15 0 0 0 9 13Zm10 1.6 1.4 1.4-1.9 1.9 1.9 1.9-1.4 1.4-1.9-1.9-1.9 1.9-1.4-1.4 1.9-1.9-1.9-1.9 1.4-1.4 1.9 1.9 1.9-1.9Z',
  camera: 'M9 4 7.5 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.5L15 4H9Zm3 13a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
};

const ATTENDANCE_TAB_ICONS = {
  quick: 'check',
  calendar: 'calendar',
  manage: 'people',
  history: 'history',
  report: 'history',
};

function Icon({ name, size = 20 }) {
  return <svg className="attendance-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={PATHS[name] || PATHS.attendance} /></svg>;
}

function fold(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function vietnamDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

function sameClassIdentity(row, group) {
  return row?.class_type === group?.class_type
    && fold(row?.class_name) === fold(group?.class_name)
    && fold(row?.subject) === fold(group?.subject);
}

export default function GlobalAttendanceNavigationTab({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const today = vietnamDateString();
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('quick');
  const [classes, setClasses] = useState([]);
  const [members, setMembers] = useState([]);
  const [classTeachers, setClassTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [calendarSessions, setCalendarSessions] = useState([]);
  const [teacherDaySessions, setTeacherDaySessions] = useState([]);
  const [dayRecords, setDayRecords] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [sessionTeacher, setSessionTeacher] = useState('');
  const [daySession, setDaySession] = useState(null);
  const [calendarDate, setCalendarDate] = useState(today);
  const [calendarRoomFilter, setCalendarRoomFilter] = useState('all');
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [draft, setDraft] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [importReport, setImportReport] = useState(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyType, setHistoryType] = useState('all');
  const [historySelectionMode, setHistorySelectionMode] = useState(false);
  const [selectedHistorySessionIds, setSelectedHistorySessionIds] = useState([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [classQuery, setClassQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [addForm, setAddForm] = useState({ student_code: '', student_full_name: '', school_class_name: '' });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [lessonPeriods, setLessonPeriods] = useState(1);
  const [teachingRoom, setTeachingRoom] = useState('');
  const [teachingTimeRange, setTeachingTimeRange] = useState('');
  const [showCancelSession, setShowCancelSession] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [proofFile, setProofFile] = useState(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState('');
  const [historyProofUrl, setHistoryProofUrl] = useState('');
  const [historyProofLoading, setHistoryProofLoading] = useState(false);
  const fileRef = useRef(null);
  const proofInputRef = useRef(null);

  const systemRole = normalizeSystemRole(runtime.role || currentUser?.role, SYSTEM_ROLES.GUEST);
  const isAttendanceAdmin = systemRole === SYSTEM_ROLES.ADMIN;
  const canAccessAttendanceView = (tabId) => isAttendanceAdmin || hasAttendanceTabAccess(currentUser, tabId);
  const hasAttendanceReportOverride = isAttendanceAdmin || hasAttendanceTabAccess(currentUser, 'report');
  const canUseQuickAttendance = isAttendanceAdmin || hasAttendanceTabAccess(currentUser, 'quick') || hasAttendanceReportOverride;
  const availableAttendanceTabs = ATTENDANCE_PERMISSION_ITEMS.filter((item) => item.tab === 'quick' ? canUseQuickAttendance : canAccessAttendanceView(item.tab));
  const firstAllowedView = canUseQuickAttendance ? 'quick' : getFirstAllowedAttendanceTab(currentUser);
  const allowed = Boolean(currentUser?.id && (isAttendanceAdmin || hasAnyAttendanceAccess(currentUser)));

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => setHost(document.querySelector('.brian-nav__primary'));
    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-attendance-open');
    return () => document.documentElement.classList.remove('bes-attendance-open');
  }, [open]);

  useEffect(() => {
    if (!open || !allowed || !firstAllowedView) return;
    const canOpenCurrentView = view === 'quick' ? canUseQuickAttendance : canAccessAttendanceView(view);
    if (!canOpenCurrentView) setView(firstAllowedView);
  }, [open, allowed, firstAllowedView, view, currentUser?.permissions, systemRole, canUseQuickAttendance]);

  async function loadAll({ keepSelection = true } = {}) {
    if (!client || !runtime.ready || !runtime.session || !allowed) return;
    setLoading(true);
    setError('');
    try {
      const [classResult, memberResult, classTeacherResult, sessionResult] = await Promise.all([
        client.from('bes_extra_classes').select(CLASS_COLUMNS).order('class_name', { ascending: true }),
        client.from('bes_extra_class_members').select(MEMBER_COLUMNS).order('student_full_name', { ascending: true }),
        client.from('bes_extra_class_teachers').select(CLASS_TEACHER_COLUMNS).order('position', { ascending: true }),
        client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).order('checked_at', { ascending: false }).limit(400),
      ]);
      const firstError = classResult.error || memberResult.error || classTeacherResult.error || sessionResult.error;
      if (firstError) throw firstError;
      const nextClasses = classResult.data || [];
      setClasses(nextClasses);
      setMembers(memberResult.data || []);
      setClassTeachers(classTeacherResult.data || []);
      setSessions(sessionResult.data || []);
      if (!keepSelection || !nextClasses.some((row) => String(row.id) === String(selectedClassId))) {
        setSelectedClassId(nextClasses.find((row) => row.active)?.id || '');
      }
    } catch (loadError) {
      setError(loadError?.message?.includes('does not exist')
        ? 'Phân hệ Điểm danh chưa được cài đặt đầy đủ trên Supabase. Hãy chạy migration điểm danh mới nhất.'
        : (loadError?.message || 'Không thể tải dữ liệu điểm danh.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && allowed) loadAll();
  }, [open, allowed, runtime.ready, runtime.session?.user?.id]);

  const activeClasses = useMemo(() => classes.filter((row) => row.active !== false), [classes]);
  const selectedClass = useMemo(() => classes.find((row) => String(row.id) === String(selectedClassId)) || null, [classes, selectedClassId]);
  const selectedMembers = useMemo(() => sortMembersByName(members.filter((row) => String(row.class_id) === String(selectedClassId) && row.active !== false)), [members, selectedClassId]);
  const allSelectedMembers = useMemo(() => sortMembersByName(members.filter((row) => String(row.class_id) === String(selectedClassId))), [members, selectedClassId]);
  const memberCounts = useMemo(() => {
    const map = new Map();
    members.forEach((row) => {
      if (row.active === false) return;
      map.set(String(row.class_id), (map.get(String(row.class_id)) || 0) + 1);
    });
    return map;
  }, [members]);
  const classTeacherNames = useMemo(() => {
    const map = new Map();
    classTeachers.forEach((row) => {
      const key = String(row.class_id);
      const current = map.get(key) || [];
      if (row.teacher_name && !current.some((name) => fold(name) === fold(row.teacher_name))) current.push(row.teacher_name);
      map.set(key, current);
    });
    return map;
  }, [classTeachers]);
  const lastSessionByClass = useMemo(() => {
    const map = new Map();
    sessions.forEach((session) => { if (!map.has(String(session.class_id))) map.set(String(session.class_id), session); });
    return map;
  }, [sessions]);

  function assignedTeachersForClass(classRow) {
    const authoritative = teachersForGiftedAssignment({
      sourceKey: classRow?.source_key,
      subject: classRow?.subject,
      gradeLevel: classRow?.grade_level,
      className: classRow?.class_name,
    });
    const normalized = classTeacherNames.get(String(classRow?.id)) || [];
    const fallback = String(classRow?.teacher_name || '').split(/\s*,\s*/).map((name) => name.trim()).filter(Boolean);
    const merged = [];
    [...authoritative, ...normalized, ...fallback].forEach((name) => {
      const clean = String(name || '').trim();
      if (clean && !merged.some((current) => fold(current) === fold(clean))) merged.push(clean);
    });
    return merged;
  }

  function teachersForClass(classRow) {
    const names = assignedTeachersForClass(classRow);
    return names.length ? names.join(', ') : 'Chưa phân công GV';
  }

  function teacherForSession(session) {
    if (session?.session_status === 'cancelled') return '—';
    return session?.teacher_name || 'Chưa ghi giáo viên';
  }

  const subjectCounts = useMemo(() => {
    const map = new Map();
    activeClasses.forEach((classRow) => {
      const key = attendanceSubjectKey(classRow.subject);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [activeClasses]);

  const filteredActiveClasses = useMemo(() => activeClasses.filter((classRow) => {
    const subjectKey = attendanceSubjectKey(classRow.subject);
    if (subjectFilter !== 'all' && subjectKey !== subjectFilter) return false;
    if (!classQuery.trim()) return true;
    const haystack = fold(`${classRow.class_name} ${classRow.subject} ${teachersForClass(classRow)}`);
    return haystack.includes(fold(classQuery));
  }), [activeClasses, classQuery, subjectFilter, classTeacherNames]);

  const selectedTeacherOptions = useMemo(() => assignedTeachersForClass(selectedClass), [selectedClass, classTeacherNames]);
  const teacherUsageForDate = useMemo(() => {
    const map = new Map();
    teacherDaySessions.forEach((session) => {
      const key = fold(session.teacher_name);
      if (key && !map.has(key)) map.set(key, session);
    });
    return map;
  }, [teacherDaySessions]);
  const blockedTeacherUsage = sessionTeacher ? teacherUsageForDate.get(fold(sessionTeacher)) : null;
  const isTeacherBlocked = Boolean(blockedTeacherUsage && String(blockedTeacherUsage.class_id) !== String(selectedClassId));

  useEffect(() => {
    setShowAddTeacher(false);
    setNewTeacherName('');
  }, [selectedClassId]);

  async function loadDaySession(classId = selectedClassId, dateValue = attendanceDate) {
    if (!client || !classId || !dateValue || !allowed) {
      setDaySession(null);
      setDayRecords([]);
      return null;
    }
    const { data, error: dayError } = await client.from('bes_extra_attendance_sessions')
      .select(SESSION_COLUMNS)
      .eq('class_id', classId)
      .eq('attendance_date', dateValue)
      .limit(1);
    if (dayError) {
      setError(dayError.message || 'Không thể kiểm tra trạng thái điểm danh theo ngày.');
      return null;
    }
    const found = data?.[0] || null;
    setDaySession(found);
    if (found?.session_status === 'completed') {
      const { data: detailRows, error: detailError } = await client.from('bes_extra_attendance_records')
        .select(RECORD_COLUMNS)
        .eq('session_id', found.id)
        .order('student_full_name', { ascending: true });
      if (detailError) setError(detailError.message || 'Không thể tải chi tiết điểm danh đã chốt.');
      setDayRecords(detailRows || []);
    } else {
      setDayRecords([]);
    }
    return found;
  }

  async function loadTeacherDaySessions(dateValue = attendanceDate) {
    if (!client || !dateValue || !allowed) {
      setTeacherDaySessions([]);
      return [];
    }
    const { data, error: usageError } = await client.from('bes_extra_attendance_sessions')
      .select('id,class_id,class_name,teacher_name,attendance_date,session_status')
      .eq('attendance_date', dateValue)
      .eq('session_status', 'completed')
      .order('checked_at', { ascending: true });
    if (usageError) {
      setError(usageError.message || 'Không thể kiểm tra giáo viên đã điểm danh trong ngày.');
      return [];
    }
    const rows = data || [];
    setTeacherDaySessions(rows);
    return rows;
  }

  useEffect(() => {
    if (!open || !allowed || !selectedClassId || !attendanceDate) return;
    loadDaySession(selectedClassId, attendanceDate);
  }, [open, allowed, selectedClassId, attendanceDate]);

  useEffect(() => {
    if (!open || !allowed || !attendanceDate) return;
    loadTeacherDaySessions(attendanceDate);
  }, [open, allowed, attendanceDate]);

  useEffect(() => {
    const next = buildAttendanceDraft(selectedMembers);
    if (daySession?.session_status === 'completed' && dayRecords.length) {
      const recordMap = new Map(dayRecords.map((record) => [record.member_key, record]));
      next.forEach((row) => {
        const record = recordMap.get(row.member_key);
        if (!record) return;
        row.status = normalizeAttendanceStatus(record.status);
        row.present = row.status !== ATTENDANCE_STATUS.ABSENT;
        row.absence_reason_code = record.absence_reason_code || '';
        row.absence_note = record.absence_note || '';
      });
    }
    setDraft(next);
    setNote(daySession?.note || '');
  }, [selectedClassId, selectedMembers, attendanceDate, daySession?.id, dayRecords]);

  useEffect(() => {
    if (daySession) {
      setSessionTeacher(daySession.teacher_name || '');
      setLessonPeriods(daySession.session_status === 'cancelled' ? 0 : Number(daySession.lesson_periods || 1));
      setTeachingRoom(daySession.teaching_room || '');
      setTeachingTimeRange(daySession.teaching_time_range || '');
      setNote(daySession.note || '');
      setShowCancelSession(false);
      setCancellationReason(daySession.cancellation_reason || '');
      return;
    }
    setLessonPeriods(1);
    setTeachingRoom(roomForExtraClass(selectedClass));
    setTeachingTimeRange(String(selectedClass?.time_range || '').trim());
    setShowCancelSession(false);
    setCancellationReason('');
    const soleTeacher = selectedTeacherOptions.length === 1 ? selectedTeacherOptions[0] : '';
    const soleUsage = soleTeacher ? teacherUsageForDate.get(fold(soleTeacher)) : null;
    const soleBlocked = Boolean(soleUsage && String(soleUsage.class_id) !== String(selectedClassId));
    if (soleTeacher && !soleBlocked) setSessionTeacher(soleTeacher);
    else setSessionTeacher('');
  }, [daySession?.id, selectedClassId, selectedClass?.room, selectedClass?.time_range, selectedClass?.weekdays, selectedTeacherOptions.join('|'), teacherUsageForDate]);

  const summary = useMemo(() => attendanceSummary(draft), [draft]);
  const isFutureDate = attendanceDate > today;
  const isDayLocked = Boolean(daySession);
  const invalidAbsentRows = useMemo(() => draft.filter((row) => row.status === ATTENDANCE_STATUS.ABSENT && (
    !row.absence_reason_code || (row.absence_reason_code === 'other' && !String(row.absence_note || '').trim())
  )), [draft]);

  useEffect(() => {
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(null);
    setProofPreviewUrl('');
    if (proofInputRef.current) proofInputRef.current.value = '';
  }, [selectedClassId, attendanceDate]);

  useEffect(() => () => {
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
  }, [proofPreviewUrl]);

  function setAttendanceStatus(memberKeyValue, nextStatus) {
    if (isDayLocked) return;
    setDraft((current) => current.map((row) => {
      if (row.member_key !== memberKeyValue) return row;
      const status = normalizeAttendanceStatus(nextStatus);
      const absent = status === ATTENDANCE_STATUS.ABSENT;
      return {
        ...row,
        status,
        present: !absent,
        absence_reason_code: absent ? row.absence_reason_code : '',
        absence_note: absent ? row.absence_note : '',
      };
    }));
  }

  function updateAbsenceField(memberKeyValue, patch) {
    if (isDayLocked) return;
    setDraft((current) => current.map((row) => row.member_key === memberKeyValue ? { ...row, ...patch } : row));
  }

  function clearProofSelection() {
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(null);
    setProofPreviewUrl('');
    if (proofInputRef.current) proofInputRef.current.value = '';
  }

  function chooseProofFile(file) {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh để làm minh chứng.');
      return;
    }
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(file);
    setProofPreviewUrl(URL.createObjectURL(file));
    setError('');
  }

  async function uploadAttendanceProof(session) {
    if (!proofFile || !session?.id || !client) return '';
    const prepared = await prepareAttendanceProofImage(proofFile);
    const proofPath = buildAttendanceProofPath(session.id);
    const { error: uploadError } = await client.storage
      .from(ATTENDANCE_PROOF_BUCKET)
      .upload(proofPath, prepared, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;

    const { error: attachError } = await client.rpc('bes_set_extra_attendance_proof', {
      p_session_id: session.id,
      p_proof_path: proofPath,
    });
    if (attachError) {
      await client.storage.from(ATTENDANCE_PROOF_BUCKET).remove([proofPath]);
      throw attachError;
    }
    clearProofSelection();
    return proofPath;
  }

  async function removeAttendanceProofPaths(paths) {
    const cleanPaths = Array.from(new Set((paths || []).map((value) => String(value || '').trim()).filter(Boolean)));
    if (!client || !cleanPaths.length) return;
    const { error: removeError } = await client.storage.from(ATTENDANCE_PROOF_BUCKET).remove(cleanPaths);
    if (removeError) console.warn('Không thể dọn ảnh minh chứng điểm danh:', removeError.message || removeError);
  }

  async function confirmAttendance() {
    if (!selectedClass || busy || !client || isDayLocked) return;
    if (!attendanceDate || isFutureDate) {
      setError('Ngày điểm danh không được ở tương lai theo giờ Việt Nam.');
      return;
    }
    if (!sessionTeacher) {
      setError('Vui lòng chọn giáo viên dạy hôm nay.');
      return;
    }
    if (isTeacherBlocked) {
      setError(`Giáo viên ${sessionTeacher} đã được điểm danh tại lớp ${blockedTeacherUsage.class_name} ngày ${formatDate(attendanceDate)}.`);
      setSessionTeacher('');
      return;
    }
    if (!teachingRoom.trim()) {
      setError('Vui lòng nhập phòng học.');
      return;
    }
    if (!teachingTimeRange.trim()) {
      setError('Vui lòng nhập thời gian dạy.');
      return;
    }
    if (invalidAbsentRows.length) {
      const first = invalidAbsentRows[0];
      setError(first.absence_reason_code === 'other'
        ? `Vui lòng ghi chú lý do “Khác” cho ${first.student_full_name}.`
        : `Vui lòng chọn lý do vắng cho ${first.student_full_name}.`);
      return;
    }
    const absenceDetails = draft.filter((row) => row.status === ATTENDANCE_STATUS.ABSENT).map((row) => ({
      member_key: row.member_key,
      reason_code: row.absence_reason_code,
      note: String(row.absence_note || '').trim(),
    }));
    const lateMemberKeys = draft
      .filter((row) => row.status === ATTENDANCE_STATUS.LATE)
      .map((row) => row.member_key);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data, error: confirmError } = await client.rpc('bes_confirm_extra_class_attendance', {
        p_class_id: selectedClass.id,
        p_attendance_date: attendanceDate,
        p_teacher_name: sessionTeacher,
        p_lesson_periods: lessonPeriods,
        p_absence_details: absenceDetails,
        p_note: note.trim(),
        p_teaching_room: teachingRoom.trim(),
        p_teaching_time_range: teachingTimeRange.trim(),
        p_late_member_keys: lateMemberKeys,
      });
      if (confirmError) throw confirmError;
      const created = Array.isArray(data) ? data[0] : data;
      setDaySession(created || null);
      let proofSaved = false;
      let proofUploadFailure = '';
      if (proofFile && created?.id) {
        try {
          await uploadAttendanceProof(created);
          proofSaved = true;
        } catch (proofError) {
          proofUploadFailure = proofError?.message || 'Không thể tải ảnh minh chứng lên hệ thống.';
          clearProofSelection();
        }
      }
      await loadAll();
      await loadDaySession();
      await loadTeacherDaySessions();
      await loadCalendarSessions(calendarDate);
      setNotice(`Đã chốt điểm danh ${selectedClass.class_name} ngày ${formatDate(attendanceDate)} · GV ${sessionTeacher} · ${summary.present}/${summary.total} có mặt · ${summary.late} đi trễ.${proofSaved ? ' · Đã lưu ảnh minh chứng.' : ''}`);
      if (proofUploadFailure) setError(`Điểm danh đã được chốt, nhưng ảnh minh chứng chưa được lưu: ${proofUploadFailure}`);
    } catch (confirmError) {
      setError(confirmError?.message || 'Không thể xác nhận điểm danh.');
      await loadDaySession();
      await loadTeacherDaySessions();
    } finally {
      setBusy(false);
    }
  }

  async function cancelClassSession() {
    if (!selectedClass || busy || !client || isDayLocked || isFutureDate) return;
    const reason = cancellationReason.trim();
    if (!reason) {
      setError('Vui lòng nhập Lý do hủy buổi học.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data, error: cancelError } = await client.rpc('bes_cancel_extra_class_session', {
        p_class_id: selectedClass.id,
        p_attendance_date: attendanceDate,
        p_cancellation_reason: reason,
        p_teaching_room: teachingRoom.trim(),
        p_teaching_time_range: teachingTimeRange.trim(),
      });
      if (cancelError) throw cancelError;
      const created = Array.isArray(data) ? data[0] : data;
      setDaySession(created || null);
      setShowCancelSession(false);
      clearProofSelection();
      setNotice(`Đã hủy buổi học ${selectedClass.class_name} ngày ${formatDate(attendanceDate)}.`);
      await loadAll();
      await loadDaySession();
      await loadCalendarSessions(calendarDate);
    } catch (cancelError) {
      setError(cancelError?.message || 'Không thể hủy buổi học.');
      await loadDaySession();
    } finally {
      setBusy(false);
    }
  }

  async function loadCalendarSessions(dateValue = calendarDate) {
    if (!client || !dateValue || !allowed) {
      setCalendarSessions([]);
      setCalendarLoading(false);
      return;
    }
    setCalendarLoading(true);
    const { data, error: calendarError } = await client.from('bes_extra_attendance_sessions')
      .select(SESSION_COLUMNS)
      .eq('attendance_date', dateValue)
      .order('checked_at', { ascending: true });
    if (calendarError) {
      setError(calendarError.message || 'Không thể tải lịch điểm danh theo ngày.');
      setCalendarSessions([]);
    } else {
      setCalendarSessions(data || []);
    }
    setCalendarLoading(false);
  }

  useEffect(() => {
    if (open && view === 'calendar') loadCalendarSessions(calendarDate);
  }, [open, view, calendarDate]);

  async function openSessionFromCalendar(session) {
    if (!session) return;
    if (!canAccessAttendanceView('history')) {
      setNotice('Bạn có quyền xem Lịch tháng. Cần thêm quyền Lịch sử để mở chi tiết buổi học.');
      return;
    }
    await loadSessionRecords(session.id);
    setView('history');
  }

  async function importExcel(file) {
    if (!file || busy || !client) return;
    setBusy(true);
    setError('');
    setNotice('');
    setImportReport(null);
    try {
      const rows = await readSheet(file);
      const parsed = parseExtraClassRosterRows(rows);
      let createdClasses = 0;
      let addedMembers = 0;
      let reactivatedMembers = 0;
      let updatedMembers = 0;
      const teacherWarnings = [];

      for (const group of parsed.groups) {
        let classRow = classes.find((row) => row.active !== false && sameClassIdentity(row, group));
        const assignment = giftedAssignmentForClass({
          sourceKey: classRow?.source_key,
          subject: group.subject,
          gradeLevel: classRow?.grade_level,
          className: group.class_name,
        });
        const assignmentTeachers = assignment?.teachers || [];
        const teacherSnapshot = assignmentTeachers.length ? assignmentTeachers.join(', ') : String(group.teacher_name || '').trim();
        if (!teacherSnapshot) teacherWarnings.push(`${group.class_name}: chưa có giáo viên trong danh sách phân công hoặc trong file import.`);

        const classPayload = {
          class_type: group.class_type,
          class_name: group.class_name,
          subject: assignment?.subject || group.subject || '',
          teacher_id: null,
          teacher_name: teacherSnapshot,
          teacher_email: '',
          active: true,
          source_key: classRow?.source_key || assignment?.sourceKey || null,
          school_year: classRow?.school_year || (assignment ? '2026-2027' : ''),
          grade_level: classRow?.grade_level || assignment?.gradeLevel || '',
          updated_by: currentUser.id,
          updated_at: new Date().toISOString(),
        };

        if (classRow) {
          const { data, error: classUpdateError } = await client.from('bes_extra_classes').update(classPayload).eq('id', classRow.id).select(CLASS_COLUMNS).single();
          if (classUpdateError) throw classUpdateError;
          classRow = data;
        } else {
          const { data, error: classInsertError } = await client.from('bes_extra_classes').insert({ ...classPayload, created_by: currentUser.id }).select(CLASS_COLUMNS).single();
          if (classInsertError) throw classInsertError;
          classRow = data;
          createdClasses += 1;
        }

        for (const entry of group.members) {
          const existingActive = members.find((row) => String(row.class_id) === String(classRow.id) && row.member_key === entry.member_key && row.active !== false);
          const existingInactive = [...members].reverse().find((row) => String(row.class_id) === String(classRow.id) && row.member_key === entry.member_key && row.active === false);
          const memberPayload = {
            student_code: entry.student_code || '', student_full_name: entry.student_full_name,
            school_class_name: entry.school_class_name || '', member_key: entry.member_key,
            updated_by: currentUser.id, updated_at: new Date().toISOString(),
          };
          if (existingActive) {
            const { error: updateError } = await client.from('bes_extra_class_members').update(memberPayload).eq('id', existingActive.id);
            if (updateError) throw updateError;
            updatedMembers += 1;
          } else if (existingInactive) {
            const { error: reactivateError } = await client.from('bes_extra_class_members').update({
              ...memberPayload, active: true, joined_at: new Date().toISOString(), left_at: null,
              removed_by: null, removal_reason: '',
            }).eq('id', existingInactive.id);
            if (reactivateError) throw reactivateError;
            reactivatedMembers += 1;
          } else {
            const { error: insertError } = await client.from('bes_extra_class_members').insert({
              class_id: classRow.id, ...memberPayload, active: true, created_by: currentUser.id,
            });
            if (insertError) throw insertError;
            addedMembers += 1;
          }
        }
      }

      setImportReport({ fileName: file.name, totalClasses: parsed.totalClasses, totalStudents: parsed.totalStudents, createdClasses, addedMembers, reactivatedMembers, updatedMembers, warnings: [...parsed.warnings, ...teacherWarnings] });
      setNotice(`Đã xử lý ${parsed.totalStudents} học sinh từ ${file.name}. Danh sách hiện có được giữ nguyên nếu không xuất hiện trong tệp.`);
      await loadAll({ keepSelection: false });
    } catch (importError) {
      setError(importError?.message || 'Không thể import danh sách lớp phụ đạo/bồi dưỡng.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function addStudent(event) {
    event.preventDefault();
    if (!selectedClass || busy || !client) return;
    const payload = { student_code: addForm.student_code.trim(), student_full_name: addForm.student_full_name.trim(), school_class_name: addForm.school_class_name.trim() };
    if (!payload.student_full_name || !payload.school_class_name) {
      setError('Vui lòng nhập Họ và tên và Lớp chính khóa.');
      return;
    }
    payload.member_key = memberKey(payload);
    const duplicate = allSelectedMembers.find((row) => row.member_key === payload.member_key && row.active !== false);
    if (duplicate) {
      setError(`${duplicate.student_full_name} đang có trong lớp ${selectedClass.class_name}.`);
      return;
    }
    const inactive = [...allSelectedMembers].reverse().find((row) => row.member_key === payload.member_key && row.active === false);
    setBusy(true);
    setError('');
    try {
      if (inactive) {
        const { error: reactivateError } = await client.from('bes_extra_class_members').update({
          ...payload, active: true, joined_at: new Date().toISOString(), left_at: null, removed_by: null, removal_reason: '', updated_by: currentUser.id, updated_at: new Date().toISOString(),
        }).eq('id', inactive.id);
        if (reactivateError) throw reactivateError;
      } else {
        const { error: insertError } = await client.from('bes_extra_class_members').insert({ class_id: selectedClass.id, ...payload, active: true, created_by: currentUser.id, updated_by: currentUser.id });
        if (insertError) throw insertError;
      }
      setAddForm({ student_code: '', student_full_name: '', school_class_name: '' });
      setShowAddStudent(false);
      setNotice(`Đã thêm ${payload.student_full_name} vào lớp ${selectedClass.class_name}.`);
      await loadAll();
    } catch (addError) {
      setError(addError?.message || 'Không thể thêm học sinh vào lớp.');
    } finally { setBusy(false); }
  }

  async function addTeacher(event) {
    event.preventDefault();
    if (!selectedClass || busy || !client) return;
    const teacherName = newTeacherName.trim();
    if (!teacherName) {
      setError('Vui lòng nhập họ tên giáo viên.');
      return;
    }
    if (assignedTeachersForClass(selectedClass).some((name) => fold(name) === fold(teacherName))) {
      setError(`${teacherName} đã có trong lớp ${selectedClass.class_name}.`);
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: teacherError } = await client.rpc('bes_add_extra_class_teacher', {
        p_class_id: selectedClass.id,
        p_teacher_name: teacherName,
      });
      if (teacherError) throw teacherError;
      setNewTeacherName('');
      setShowAddTeacher(false);
      setNotice(`Đã thêm giáo viên ${teacherName} vào lớp ${selectedClass.class_name}.`);
      await loadAll();
    } catch (teacherError) {
      setError(teacherError?.message || 'Không thể thêm giáo viên vào lớp.');
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(member) {
    if (!member || busy || !client) return;
    const reason = window.prompt(`Xóa ${member.student_full_name} khỏi lớp ${selectedClass?.class_name}?\n\nCó thể nhập lý do. Lịch sử điểm danh cũ sẽ vẫn được giữ nguyên.`, 'Ra khỏi lớp');
    if (reason === null) return;
    setBusy(true);
    setError('');
    try {
      const { error: removeError } = await client.from('bes_extra_class_members').update({ active: false, left_at: new Date().toISOString(), removed_by: currentUser.id, removal_reason: reason.trim(), updated_by: currentUser.id, updated_at: new Date().toISOString() }).eq('id', member.id);
      if (removeError) throw removeError;
      setNotice(`Đã xóa ${member.student_full_name} khỏi danh sách hiện tại. Các buổi điểm danh trước đây không thay đổi.`);
      await loadAll();
    } catch (removeError) { setError(removeError?.message || 'Không thể xóa học sinh khỏi lớp.'); }
    finally { setBusy(false); }
  }

  async function deleteClass(classRow) {
    if (!classRow || busy || !client) return;
    const confirmed = window.confirm(`Xóa lớp “${classRow.class_name}”?\n\nThao tác này sẽ xóa danh sách học sinh, phân công giáo viên và toàn bộ các buổi điểm danh của lớp này. Không thể hoàn tác.`);
    if (!confirmed) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const classProofPaths = sessions.filter((session) => String(session.class_id) === String(classRow.id)).map((session) => session.proof_path);
      const { error: deleteError } = await client.rpc('bes_delete_extra_class', { p_class_id: classRow.id });
      if (deleteError) throw deleteError;
      await removeAttendanceProofPaths(classProofPaths);
      if (String(selectedClassId) === String(classRow.id)) setSelectedClassId('');
      setSelectedSessionId(''); setRecords([]); setDaySession(null); setCalendarSessions([]);
      setNotice(`Đã xóa lớp ${classRow.class_name} cùng dữ liệu điểm danh liên quan.`);
      await loadAll({ keepSelection: false });
      await loadTeacherDaySessions();
    } catch (deleteError) { setError(deleteError?.message || 'Không thể xóa lớp.'); }
    finally { setBusy(false); }
  }

  async function loadSessionRecords(sessionId) {
    if (!client || !sessionId) return;
    setSelectedSessionId(sessionId);
    setError('');
    const { data, error: recordError } = await client.from('bes_extra_attendance_records').select(RECORD_COLUMNS).eq('session_id', sessionId).order('student_full_name', { ascending: true });
    if (recordError) setError(recordError.message);
    else setRecords(data || []);
  }

  async function deleteAttendanceSession(session) {
    if (!session || busy || !client) return;
    const confirmed = window.confirm(`Xóa buổi điểm danh đã duyệt của lớp “${session.class_name}” ngày ${formatDate(session.attendance_date)} lúc ${formatDateTime(session.checked_at)}?\n\nNgày này sẽ được mở khóa để có thể điểm danh lại. Không thể hoàn tác.`);
    if (!confirmed) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: deleteError } = await client.rpc('bes_delete_extra_attendance_session', { p_session_id: session.id });
      if (deleteError) throw deleteError;
      await removeAttendanceProofPaths([session.proof_path]);
      setSelectedSessionId(''); setRecords([]);
      if (String(session.class_id) === String(selectedClassId) && session.attendance_date === attendanceDate) setDaySession(null);
      setNotice(`Đã xóa điểm danh ${session.class_name} ngày ${formatDate(session.attendance_date)}. Ngày này đã được mở khóa.`);
      await loadAll();
      await loadDaySession();
      await loadTeacherDaySessions();
      await loadCalendarSessions(calendarDate);
    } catch (deleteError) { setError(deleteError?.message || 'Không thể xóa buổi điểm danh đã duyệt.'); }
    finally { setBusy(false); }
  }

  function toggleHistorySelectionMode() {
    setHistorySelectionMode((current) => {
      const next = !current;
      if (!next) setSelectedHistorySessionIds([]);
      return next;
    });
  }

  function toggleHistoryBulkSelection(sessionId) {
    const key = String(sessionId);
    setSelectedHistorySessionIds((current) => (
      current.some((id) => String(id) === key)
        ? current.filter((id) => String(id) !== key)
        : [...current, sessionId]
    ));
  }

  function toggleAllFilteredHistorySelection() {
    const filteredIds = filteredHistory.map((session) => session.id);
    if (!filteredIds.length) return;
    const filteredIdSet = new Set(filteredIds.map((id) => String(id)));
    setSelectedHistorySessionIds((current) => {
      const currentSet = new Set(current.map((id) => String(id)));
      const allSelected = filteredIds.every((id) => currentSet.has(String(id)));
      if (allSelected) return current.filter((id) => !filteredIdSet.has(String(id)));
      return Array.from(new Map([...current, ...filteredIds].map((id) => [String(id), id])).values());
    });
  }

  async function deleteSelectedHistorySessions() {
    if (!selectedHistorySessionIds.length || busy || !client) return;
    const selectedIdSet = new Set(selectedHistorySessionIds.map((id) => String(id)));
    const targets = sessions.filter((session) => selectedIdSet.has(String(session.id)));
    if (!targets.length) {
      setSelectedHistorySessionIds([]);
      return;
    }
    const confirmed = window.confirm(`Xóa ${targets.length} buổi điểm danh đã chọn?\n\nCác ngày tương ứng sẽ được mở khóa để có thể điểm danh lại. Không thể hoàn tác.`);
    if (!confirmed) return;
    setBusy(true); setError(''); setNotice('');
    const failed = [];
    const deletedIds = new Set();
    const proofPathsToRemove = [];
    try {
      for (const session of targets) {
        const { error: deleteError } = await client.rpc('bes_delete_extra_attendance_session', { p_session_id: session.id });
        if (deleteError) {
          failed.push(`${session.class_name} ${formatDate(session.attendance_date)}: ${deleteError.message || 'Lỗi không xác định'}`);
        } else {
          deletedIds.add(String(session.id));
          if (session.proof_path) proofPathsToRemove.push(session.proof_path);
        }
      }
      await removeAttendanceProofPaths(proofPathsToRemove);
      if (deletedIds.has(String(selectedSessionId))) {
        setSelectedSessionId('');
        setRecords([]);
      }
      if (daySession && deletedIds.has(String(daySession.id))) setDaySession(null);
      setSelectedHistorySessionIds((current) => current.filter((id) => !deletedIds.has(String(id))));
      if (!failed.length) setHistorySelectionMode(false);
      if (deletedIds.size) setNotice(`Đã xóa ${deletedIds.size} buổi điểm danh. Các ngày tương ứng đã được mở khóa.`);
      if (failed.length) setError(`Không thể xóa ${failed.length} buổi: ${failed.slice(0, 3).join(' · ')}${failed.length > 3 ? ` · và ${failed.length - 3} buổi khác` : ''}`);
      await loadAll();
      await loadDaySession();
      await loadTeacherDaySessions();
      await loadCalendarSessions(calendarDate);
    } finally {
      setBusy(false);
    }
  }

  const filteredHistory = useMemo(() => sessions.filter((session) => {
    if (historyType !== 'all' && session.class_type !== historyType) return false;
    const haystack = fold(`${session.class_name} ${teacherForSession(session)} ${session.subject} ${session.attendance_date}`);
    return !historyQuery.trim() || haystack.includes(fold(historyQuery));
  }), [sessions, historyQuery, historyType]);

  const selectedHistorySessionIdSet = useMemo(() => new Set(selectedHistorySessionIds.map((id) => String(id))), [selectedHistorySessionIds]);
  const allFilteredHistorySelected = filteredHistory.length > 0 && filteredHistory.every((session) => selectedHistorySessionIdSet.has(String(session.id)));

  const filteredManagementMembers = useMemo(() => allSelectedMembers.filter((member) => {
    if (!memberQuery.trim()) return true;
    return fold(`${member.student_full_name} ${member.student_code} ${member.school_class_name}`).includes(fold(memberQuery));
  }), [allSelectedMembers, memberQuery]);

  const selectedSession = sessions.find((session) => String(session.id) === String(selectedSessionId)) || calendarSessions.find((session) => String(session.id) === String(selectedSessionId));

  useEffect(() => {
    let cancelled = false;
    setHistoryProofUrl('');
    if (!client || view !== 'history' || !canAccessAttendanceView('history') || !selectedSession?.proof_path) {
      setHistoryProofLoading(false);
      return undefined;
    }
    setHistoryProofLoading(true);
    client.storage.from(ATTENDANCE_PROOF_BUCKET).createSignedUrl(selectedSession.proof_path, 300)
      .then(({ data, error: signedUrlError }) => {
        if (cancelled) return;
        setHistoryProofLoading(false);
        if (signedUrlError) {
          setHistoryProofUrl('');
          return;
        }
        setHistoryProofUrl(data?.signedUrl || '');
      });
    return () => { cancelled = true; };
  }, [view, selectedSession?.id, selectedSession?.proof_path, currentUser?.permissions, systemRole]);

  const selectedAbsentRecords = records.filter((record) => record.status === ATTENDANCE_STATUS.ABSENT);
  const selectedLateRecords = records.filter((record) => record.status === ATTENDANCE_STATUS.LATE);
  const selectedSessionAttendanceRate = selectedSession?.session_status === 'completed' && Number(selectedSession.total_students) > 0
    ? Math.round((Number(selectedSession.present_count || 0) / Number(selectedSession.total_students)) * 100)
    : 0;

  if (!host || !allowed) return null;

  const tab = createPortal(
    <button type="button" className={`brian-nav__attendance-tab ${open ? 'is-active' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((value) => !value); setError(''); if (!open) setView(firstAllowedView || 'quick'); }}>
      <Icon name="attendance" size={18} /><span>Điểm danh</span>
    </button>, host,
  );

  const overlay = open ? createPortal(
    <div className="attendance-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="attendance-shell" role="dialog" aria-modal="true" aria-label="Điểm danh lớp phụ đạo và bồi dưỡng học sinh giỏi">
        <header className="attendance-topbar">
          <div className="attendance-title"><span><Icon name="attendance" size={28} /></span><div><small>QUẢN LÝ CHUYÊN CẦN</small><strong>Điểm danh lớp phụ đạo & bồi dưỡng</strong></div></div>
          <div className="attendance-top-actions"><button type="button" className="attendance-icon-button" onClick={() => { loadAll(); loadDaySession(); loadTeacherDaySessions(); if (view === 'calendar') loadCalendarSessions(calendarDate); }} title="Làm mới"><Icon name="refresh" /></button><button type="button" className="attendance-icon-button" onClick={() => setOpen(false)} aria-label="Đóng"><Icon name="close" /></button></div>
        </header>

        <nav className="attendance-tabs" aria-label="Phân hệ điểm danh">
          {availableAttendanceTabs.map((item) => (
            <button key={item.id} type="button" className={view === item.tab ? 'is-active' : ''} onClick={() => setView(item.tab)}>
              <Icon name={ATTENDANCE_TAB_ICONS[item.tab] || 'attendance'} size={18} />{item.titleVi}
            </button>
          ))}
        </nav>

        {notice ? <div className="attendance-banner is-success">{notice}</div> : null}
        {error ? <div className="attendance-banner is-error">{error}</div> : null}

        <main className="attendance-content">
          {loading ? <div className="attendance-loading">Đang đồng bộ dữ liệu điểm danh…</div> : null}

          {!loading && canUseQuickAttendance && view === 'quick' ? (
            <div className="attendance-quick-layout">
              <aside className="attendance-class-list">
                <header><strong>Lớp đang hoạt động</strong><span>{filteredActiveClasses.length}/{activeClasses.length} lớp</span></header>
                <div className="att-m3-class-discovery" data-bes-keep-search="true">
                  <label className="att-m3-class-search"><span>Tìm nhanh lớp</span><input value={classQuery} onChange={(event) => setClassQuery(event.target.value)} placeholder="Tên lớp, môn hoặc giáo viên…" /></label>
                  <div className="att-m3-subject-hub" aria-label="Phân loại lớp theo bộ môn">
                    {ATTENDANCE_SUBJECT_HUB.map((item) => <button key={item.key} type="button" className={`is-subject-${item.key} ${subjectFilter === item.key ? 'is-active' : ''}`} onClick={() => setSubjectFilter(item.key)}><span>{item.label}</span><b>{item.key === 'all' ? activeClasses.length : (subjectCounts.get(item.key) || 0)}</b></button>)}
                  </div>
                </div>
                <div>{filteredActiveClasses.map((classRow) => {
                  const last = lastSessionByClass.get(String(classRow.id));
                  const subjectKey = attendanceSubjectKey(classRow.subject);
                  const scheduledForDate = isExtraClassScheduledOnDate(classRow, attendanceDate);
                  const room = roomForExtraClass(classRow);
                  return <button key={classRow.id} type="button" className={`is-subject-${subjectKey} ${String(selectedClassId) === String(classRow.id) ? 'is-selected ' : ''}${scheduledForDate ? '' : 'is-off-schedule'}`.trim()} title={scheduledForDate ? undefined : `Không có lịch học ngày ${formatDate(attendanceDate)}`} onClick={() => setSelectedClassId(classRow.id)}><span className={`attendance-type-dot is-${classRow.class_type}`} /><div><div className="attendance-class-name-row"><b>{classRow.class_name}</b>{room ? <span className="attendance-room-chip">{room}</span> : null}</div><small>{extraClassTypeLabel(classRow.class_type)} · <span className="attendance-subject-chip">{classRow.subject || 'Chưa ghi môn'}</span></small><em>{teachersForClass(classRow)}</em></div><span className="attendance-count">{memberCounts.get(String(classRow.id)) || 0}</span>{last ? <time>{formatDate(last.attendance_date)}</time> : <time>Chưa điểm danh</time>}</button>;
                })}{!filteredActiveClasses.length ? <div className="attendance-empty">Không có lớp phù hợp bộ lọc.</div> : null}</div>
              </aside>

              <section className="attendance-rollcall">
                {selectedClass ? <>
                  <header className="attendance-rollcall-head"><div><span>{extraClassTypeLabel(selectedClass.class_type)}</span><div className="attendance-rollcall-title-row"><h2>{selectedClass.class_name}</h2>{roomForExtraClass(selectedClass) ? <span className="attendance-room-chip is-large">{roomForExtraClass(selectedClass)}</span> : null}</div><p>{selectedClass.subject || 'Chưa ghi môn'} · GV phân công: {teachersForClass(selectedClass)}</p></div><div className="attendance-summary"><b>{daySession?.session_status === 'cancelled' ? 'Đã hủy' : daySession ? `${daySession.present_count}/${daySession.total_students}` : `${summary.present}/${summary.total}`}</b><span>{daySession?.session_status === 'cancelled' ? 'Buổi học' : 'Có mặt'}</span><em>{daySession?.session_status === 'cancelled' ? '0 tiết' : `${daySession ? daySession.absent_count : summary.absent} vắng`}</em></div></header>

                  <div className="attendance-session-controls">
                    <label><span>Ngày điểm danh</span><input type="date" value={attendanceDate} max={today} onChange={(event) => { setAttendanceDate(event.target.value); setNotice(''); setError(''); }} /></label>
                    <label className="is-teacher"><span>Giáo viên dạy hôm nay</span><select value={sessionTeacher} disabled={isDayLocked || !selectedTeacherOptions.length} onChange={(event) => setSessionTeacher(event.target.value)}><option value="">Chọn giáo viên</option>{selectedTeacherOptions.map((name) => { const usage = teacherUsageForDate.get(fold(name)); const blocked = Boolean(usage && String(usage.class_id) !== String(selectedClassId)); return <option key={name} value={name} disabled={blocked}>{blocked ? `${name} — đã điểm danh: ${usage.class_name}` : name}</option>; })}</select></label>
                    <div className="att-m3-period-field"><span>Số tiết dạy</span><div className="att-m3-period-segment">{[[1,'1 tiết'],[1.5,'1,5 tiết'],[2,'2 tiết']].map(([value,label]) => <button key={value} type="button" disabled={isDayLocked} className={lessonPeriods === value ? 'is-active' : ''} onClick={() => setLessonPeriods(value)}>{label}</button>)}</div></div>
                    <label><span>Phòng học</span><input value={teachingRoom} disabled={isDayLocked} onChange={(event) => setTeachingRoom(event.target.value)} placeholder="Ví dụ P.203" /></label>
                    <label><span>Thời gian dạy</span><input value={teachingTimeRange} disabled={isDayLocked} onChange={(event) => setTeachingTimeRange(event.target.value)} placeholder="Ví dụ 14:00–15:30" /></label>
                    {isDayLocked ? <div className={`attendance-day-lock ${daySession.session_status === 'cancelled' ? 'is-cancelled' : ''}`}><Icon name="check" size={18} /><div><b>{daySession.session_status === 'cancelled' ? `Đã hủy ${formatDate(daySession.attendance_date)}` : `Đã điểm danh ${formatDate(daySession.attendance_date)}`}</b><span>{daySession.session_status === 'cancelled' ? `${daySession.cancellation_reason} · 0 tiết` : `GV ${daySession.teacher_name} · ${String(daySession.lesson_periods || 1).replace('.', ',')} tiết · ${formatDateTime(daySession.checked_at)}`}</span></div></div> : <div className="attendance-day-open"><b>Chưa chốt ngày này</b><span>{isFutureDate ? 'Không thể chọn ngày tương lai.' : 'Có thể điểm danh hoặc hủy buổi học.'}</span></div>}
                  </div>

                  <div className="attendance-roster-head"><span>Học sinh</span><span>Lớp chính khóa</span><span>Trạng thái</span></div>
                  <div className="attendance-roster">{draft.map((member, index) => <div key={member.id || member.member_key} className={`att-m3-roster-entry ${member.status === ATTENDANCE_STATUS.ABSENT ? 'is-absent' : member.status === ATTENDANCE_STATUS.LATE ? 'is-late' : 'is-present'}`}><label><span className="attendance-index">{String(index + 1).padStart(2, '0')}</span><div><b>{member.student_full_name}</b><small>{member.student_code || 'Không có mã HS'}</small></div><span className="attendance-school-class">{member.school_class_name || '—'}</span><div className="att-m3-attendance-status" role="group" aria-label={`Trạng thái ${member.student_full_name}`}>
                          <button type="button" data-status="present" disabled={isDayLocked} className={member.status === ATTENDANCE_STATUS.PRESENT ? 'is-active is-present' : ''} onClick={() => setAttendanceStatus(member.member_key, ATTENDANCE_STATUS.PRESENT)}>Có mặt</button>
                          <button type="button" data-status="late" disabled={isDayLocked} className={member.status === ATTENDANCE_STATUS.LATE ? 'is-active is-late' : ''} onClick={() => setAttendanceStatus(member.member_key, ATTENDANCE_STATUS.LATE)}>Đi trễ</button>
                          <button type="button" data-status="absent" disabled={isDayLocked} className={member.status === ATTENDANCE_STATUS.ABSENT ? 'is-active is-absent' : ''} onClick={() => setAttendanceStatus(member.member_key, ATTENDANCE_STATUS.ABSENT)}>Vắng</button>
                        </div></label>{member.status === ATTENDANCE_STATUS.ABSENT ? <div className="att-m3-absence-detail"><span>Lý do vắng</span><div className="att-m3-reason-chips">{ABSENCE_REASON_OPTIONS.map((reason) => <button key={reason.value} type="button" disabled={isDayLocked} className={member.absence_reason_code === reason.value ? 'is-active' : ''} onClick={() => updateAbsenceField(member.member_key, { absence_reason_code: reason.value, absence_note: reason.value === 'other' ? member.absence_note : member.absence_note })}>{reason.label}</button>)}</div><input disabled={isDayLocked} value={member.absence_note || ''} onChange={(event) => updateAbsenceField(member.member_key, { absence_note: event.target.value })} placeholder={member.absence_reason_code === 'other' ? 'Ghi rõ lý do khác *' : 'Ghi chú thêm (không bắt buộc)'} /></div> : null}</div>)}{!draft.length ? <div className="attendance-empty">Lớp này chưa có học sinh đang hoạt động.</div> : null}</div>
                  <section className={`att-m3-proof-card ${isDayLocked ? 'is-locked' : ''}`}>
                    <div className="att-m3-proof-card-head"><span aria-hidden="true">📷</span><div><strong>Minh chứng hình ảnh</strong><small>Không bắt buộc · 01 ảnh cho mỗi buổi điểm danh</small></div>{daySession?.proof_path ? <em>Đã lưu</em> : null}</div>
                    <input ref={proofInputRef} type="file" accept="image/*" capture="environment" hidden disabled={isDayLocked} onChange={(event) => chooseProofFile(event.target.files?.[0])} />
                    {proofPreviewUrl && !isDayLocked ? <div className="att-m3-proof-preview"><img src={proofPreviewUrl} alt="Ảnh minh chứng đang chọn" /><div><b>Ảnh đã sẵn sàng</b><span>Ảnh sẽ được nén và lưu khi xác nhận điểm danh.</span><p><button type="button" onClick={() => proofInputRef.current?.click()}>Đổi ảnh</button><button type="button" className="is-remove" onClick={clearProofSelection}>Xóa ảnh</button></p></div></div> : !isDayLocked ? <button className="att-m3-proof-picker" type="button" onClick={() => proofInputRef.current?.click()}><span aria-hidden="true">📷</span><b>Chụp ảnh / Chọn ảnh</b><small>Tùy chọn, không ảnh hưởng việc xác nhận điểm danh</small></button> : <div className="att-m3-proof-locked-note">{daySession?.proof_path ? 'Buổi này đã có ảnh minh chứng. Xem ảnh tại tab Lịch sử.' : 'Buổi này đã chốt và không có ảnh minh chứng.'}</div>}
                  </section>
                  <footer className="attendance-confirm-bar"><label><span>Ghi chú buổi học</span><input disabled={isDayLocked} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Không bắt buộc" /></label><div className="att-m3-session-actions"><button className="att-m3-cancel-button" type="button" disabled={busy || isDayLocked || isFutureDate} onClick={() => setShowCancelSession((value) => !value)}>Hủy buổi học</button><button type="button" disabled={busy || !draft.length || isDayLocked || isFutureDate || !sessionTeacher || isTeacherBlocked || !teachingRoom.trim() || !teachingTimeRange.trim() || invalidAbsentRows.length > 0} onClick={confirmAttendance}><Icon name="check" size={18} />{isDayLocked ? (daySession.session_status === 'cancelled' ? 'Đã hủy' : `Đã chốt ${formatDate(daySession.attendance_date)}`) : busy ? 'Đang lưu…' : 'Xác nhận điểm danh'}</button></div></footer>
                  {showCancelSession && !isDayLocked ? <div className="att-m3-cancel-surface"><label><span>Lý do hủy *</span><input value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} placeholder="Ví dụ: Giáo viên bận công tác" autoFocus /></label><button type="button" onClick={() => { setShowCancelSession(false); setCancellationReason(''); }}>Không hủy</button><button className="is-confirm" type="button" disabled={busy || !cancellationReason.trim()} onClick={cancelClassSession}>{busy ? 'Đang lưu…' : 'Xác nhận hủy'}</button></div> : null}
                </> : <div className="attendance-empty is-large">Chọn một lớp để bắt đầu điểm danh.</div>}
              </section>
            </div>
          ) : null}

          {!loading && canAccessAttendanceView('calendar') && view === 'calendar' ? (
            <div className="attendance-calendar-layout">
              <AttendanceDailySchedule
                classes={activeClasses}
                sessions={calendarSessions}
                date={calendarDate}
                maxDate={today}
                loading={calendarLoading}
                roomFilter={calendarRoomFilter}
                onDateChange={(nextDate) => {
                  if (!nextDate) return;
                  setCalendarDate(nextDate);
                  setNotice('');
                  setError('');
                }}
                onRoomFilterChange={setCalendarRoomFilter}
                teacherLabelForClass={teachersForClass}
                onOpenClass={(classRow, session) => {
                  if (session?.session_status === 'completed' || session?.session_status === 'cancelled') {
                    openSessionFromCalendar(session);
                    return;
                  }
                  setSelectedClassId(String(classRow.id));
                  setAttendanceDate(calendarDate);
                  setNotice('');
                  setError('');
                  setView('quick');
                }}
              />
            </div>
          ) : null}

          {!loading && canAccessAttendanceView('manage') && view === 'manage' ? (
            <AttendanceClassManagementWorkspace
              activeClasses={activeClasses}
              selectedClass={selectedClass}
              selectedClassId={selectedClassId}
              allSelectedMembers={allSelectedMembers}
              filteredManagementMembers={filteredManagementMembers}
              memberCounts={memberCounts}
              teachersForClass={teachersForClass}
              busy={busy}
              fileRef={fileRef}
              importExcel={importExcel}
              importReport={importReport}
              memberQuery={memberQuery}
              setMemberQuery={setMemberQuery}
              showAddStudent={showAddStudent}
              setShowAddStudent={setShowAddStudent}
              addForm={addForm}
              setAddForm={setAddForm}
              addStudent={addStudent}
              showAddTeacher={showAddTeacher}
              setShowAddTeacher={setShowAddTeacher}
              newTeacherName={newTeacherName}
              setNewTeacherName={setNewTeacherName}
              addTeacher={addTeacher}
              deleteClass={deleteClass}
              client={client}
              isAdmin={isAttendanceAdmin}
              canManageMembers={canAccessAttendanceView('manage')}
              removeStudent={removeStudent}
              loadAll={loadAll}
              setError={setError}
              setNotice={setNotice}
              onSelectClass={setSelectedClassId}
            />
          ) : null}

          {!loading && canAccessAttendanceView('report') && view === 'report' ? <AttendanceMonthlyReport client={client} classes={classes} month={reportMonth} onMonthChange={setReportMonth} onError={setError} /> : null}

          {!loading && canAccessAttendanceView('history') && view === 'history' ? (
            <div className="ahv3__shell" data-attendance-history-v3="true">
              <section className="ahv3__list">
                <header className="ahv3__list-head">
                  <div className="ahv3__list-title"><div><strong>Lịch sử điểm danh</strong><p>Tra cứu các buổi đã chốt và buổi đã hủy.</p></div><div className="ahv3__list-actions"><span>{filteredHistory.length} buổi</span>{canAccessAttendanceView('quick') ? <button type="button" className={historySelectionMode ? 'is-active' : ''} disabled={busy} onClick={toggleHistorySelectionMode}>{historySelectionMode ? 'Thoát chọn' : 'Chọn nhiều'}</button> : null}</div></div>
                  <label className="ahv3__search" data-bes-keep-search="true"><Icon name="history" size={16} /><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Tìm theo tên lớp, môn học, giáo viên hoặc ngày…" /></label>
                  <div className="ahv3__filters"><select value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value="all">Tất cả loại lớp</option><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option></select></div>
                  {historySelectionMode ? <div className="ahv3__bulk-toolbar"><button type="button" disabled={busy || !filteredHistory.length} onClick={toggleAllFilteredHistorySelection}>{allFilteredHistorySelected ? 'Bỏ chọn kết quả' : 'Chọn tất cả kết quả'}</button><span>Đã chọn <b>{selectedHistorySessionIds.length}</b> buổi</span><button type="button" className="is-danger" disabled={busy || !selectedHistorySessionIds.length} onClick={deleteSelectedHistorySessions}><Icon name="trash" size={16} />{busy ? 'Đang xóa…' : `Xóa ${selectedHistorySessionIds.length} buổi`}</button></div> : null}
                </header>
                <div className="ahv3__items">{filteredHistory.map((session, historyIndex) => {
                  const rate = session.session_status === 'cancelled' || !Number(session.total_students) ? null : Math.round((Number(session.present_count || 0) / Number(session.total_students)) * 100);
                  const isBulkSelected = selectedHistorySessionIdSet.has(String(session.id));
                  return <button key={session.id} type="button" className={`${String(selectedSessionId) === String(session.id) && !historySelectionMode ? 'is-selected' : ''}${historySelectionMode ? ' is-bulk-mode' : ''}${isBulkSelected ? ' is-bulk-selected' : ''}`.trim()} aria-pressed={historySelectionMode ? isBulkSelected : undefined} onClick={() => { if (historySelectionMode) toggleHistoryBulkSelection(session.id); else loadSessionRecords(session.id); }}>
                    {historySelectionMode ? <span className={`ahv3__select-box ${isBulkSelected ? 'is-checked' : ''}`} aria-hidden="true">{isBulkSelected ? <Icon name="check" size={14} /> : null}</span> : null}
                    <span className="ahv3__number">{historyIndex + 1}</span>
                    <span className={`attendance-type-dot is-${session.class_type}`} />
                    <div className="ahv3__card-copy"><div className="ahv3__card-title"><b>{session.class_name}</b><span className={`ahv3__type is-${session.class_type}`}>{extraClassTypeLabel(session.class_type)}</span></div><small>{session.subject || 'Chưa ghi môn'} · {teacherForSession(session)}</small><time>{formatDate(session.attendance_date)} · {session.teaching_time_range || 'Chưa ghi giờ'} · {session.teaching_room || 'Chưa ghi phòng'}</time></div>
                    <span className="ahv3__count"><b>{session.session_status === 'cancelled' ? 'Đã hủy' : `${session.present_count}/${session.total_students}`}</b><em>{session.session_status === 'cancelled' ? '0 tiết' : `${session.absent_count} vắng`}</em>{rate !== null ? <i>{rate}%</i> : null}</span>
                  </button>;
                })}{!filteredHistory.length ? <div className="attendance-empty">Chưa có buổi điểm danh phù hợp.</div> : null}</div>
              </section>

              <section className="ahv3__detail">{historySelectionMode ? <div className="ahv3__bulk-detail"><span><Icon name="trash" size={28} /></span><h2>Chọn nhiều buổi điểm danh</h2><p>Chọn các buổi ở danh sách bên trái, sau đó dùng nút xóa để xử lý một lần.</p><b>{selectedHistorySessionIds.length} buổi đã chọn</b></div> : selectedSession ? <>
                <div className="ahv3__hero">
                  <div className="ahv3__hero-copy"><span className={`att-m3-status-chip is-${selectedSession.session_status === 'cancelled' ? 'cancelled' : 'completed'}`}>{selectedSession.session_status === 'cancelled' ? 'Đã hủy' : 'Đã điểm danh'}</span><h2>{selectedSession.class_name}</h2><div className="ahv3__hero-chips"><span className={`ahv3__type is-${selectedSession.class_type}`}>{extraClassTypeLabel(selectedSession.class_type)}</span><span className="att-m3-period-chip">{selectedSession.session_status === 'cancelled' ? '0 tiết' : `${String(selectedSession.lesson_periods || 1).replace('.', ',')} tiết`}</span><span>{formatDate(selectedSession.attendance_date)}</span><span>{selectedSession.teaching_room || 'Chưa ghi phòng'}</span></div></div>
                  <div className="ahv3__hero-art" aria-hidden="true"><span className="is-leaf is-leaf-1" /><span className="is-leaf is-leaf-2" /><span className="is-book is-book-1" /><span className="is-book is-book-2" /><span className="is-book is-book-3" /></div>
                  <div className="ahv3__actions">{canAccessAttendanceView('report') ? <button type="button" className="ahv3__report-button" onClick={() => { if (selectedSession.attendance_date) setReportMonth(selectedSession.attendance_date.slice(0, 7)); setView('report'); }}>Xem báo cáo tháng</button> : null}{canAccessAttendanceView('quick') ? <button type="button" className="ahv3__delete-button" disabled={busy} onClick={() => deleteAttendanceSession(selectedSession)}><Icon name="trash" size={17} />Xóa buổi điểm danh</button> : null}</div>
                </div>

                <h3 className="ahv3__section-title is-info"><span aria-hidden="true"><Icon name="calendar" size={14} /></span>Thông tin buổi học</h3>
                <div className="ahv3__info-grid">
                  <article><span className="ahv3__info-icon is-blue" aria-hidden="true"><Icon name="teacher" size={19} /></span><div><span>Giáo viên</span><b>{teacherForSession(selectedSession)}</b></div></article>
                  <article><span className="ahv3__info-icon is-green" aria-hidden="true"><Icon name="book" size={19} /></span><div><span>Môn học</span><b>{selectedSession.subject || 'Chưa ghi môn'}</b></div></article>
                  <article><span className="ahv3__info-icon is-purple" aria-hidden="true"><Icon name="calendar" size={19} /></span><div><span>Ngày dạy</span><b>{formatDate(selectedSession.attendance_date)}</b></div></article>
                  <article><span className="ahv3__info-icon is-orange" aria-hidden="true"><Icon name="clock" size={19} /></span><div><span>Thời gian</span><b>{selectedSession.teaching_time_range || 'Chưa ghi'}</b></div></article>
                  <article><span className="ahv3__info-icon is-blue" aria-hidden="true"><Icon name="room" size={19} /></span><div><span>Phòng học</span><b>{selectedSession.teaching_room || 'Chưa ghi'}</b></div></article>
                  <article><span className="ahv3__info-icon is-purple" aria-hidden="true"><Icon name="periods" size={19} /></span><div><span>Số tiết</span><b>{selectedSession.session_status === 'cancelled' ? '0 tiết' : `${String(selectedSession.lesson_periods || 1).replace('.', ',')} tiết`}</b></div></article>
                </div>

                {selectedSession.proof_path ? <section className="ahv3__proof"><header><div><span className="ahv3__proof-icon" aria-hidden="true"><Icon name="camera" size={18} /></span><div><strong>Minh chứng hình ảnh</strong><small>Ảnh được lưu riêng tư và chỉ mở bằng liên kết tạm thời.</small></div></div>{historyProofUrl ? <a href={historyProofUrl} target="_blank" rel="noreferrer">Mở ảnh lớn</a> : null}</header>{historyProofLoading ? <div className="ahv3__proof-loading">Đang tải ảnh minh chứng…</div> : historyProofUrl ? <a className="ahv3__proof-image" href={historyProofUrl} target="_blank" rel="noreferrer"><img src={historyProofUrl} alt={`Minh chứng điểm danh ${selectedSession.class_name} ngày ${formatDate(selectedSession.attendance_date)}`} /></a> : <div className="ahv3__proof-loading">Không thể tải ảnh minh chứng lúc này.</div>}</section> : null}

                <section className="ahv3__audit-actor-panel" aria-label="Nhật ký người thao tác">
                  <header className="ahv3__audit-actor-panel__head">
                    <div><strong>Nhật ký người thao tác</strong><span>Dữ liệu chốt buổi</span></div>
                  </header>
                  <div className="ahv3__audit-actor-panel__grid">
                    <div><span>Người thao tác</span><b>{selectedSession.checked_by || 'Không ghi nhận'}</b></div>
                    <div><span>Chốt lúc</span><b>{formatDateTime(selectedSession.checked_at)}</b></div>
                  </div>
                </section>
                {selectedSession.session_status === 'cancelled' ? <>
                  <div className="att-m3-cancel-reason"><b>Lý do hủy</b><p>{selectedSession.cancellation_reason || 'Chưa ghi lý do.'}</p></div>
                  <div className="ahv3__footer-grid"><section className="ahv3__note"><strong>Ghi chú buổi học</strong><p>{selectedSession.note || 'Buổi học đã hủy, không có ghi chú bổ sung.'}</p></section><section className="ahv3__lock"><strong>Nhật ký chốt buổi</strong><div><span>Chốt lúc</span><b>{formatDateTime(selectedSession.checked_at)}</b></div><div><span>Trạng thái</span><b>Đã hủy</b></div></section></div>
                </> : <>
                  <h3 className="ahv3__section-title ahv3__summary-title"><span aria-hidden="true"><Icon name="attendance" size={14} /></span>Tổng hợp điểm danh</h3>
                  <div className="ahv3__stat-grid">
                    <article><span className="ahv3__summary-icon is-blue" aria-hidden="true"><Icon name="people" size={19} /></span><b>{selectedSession.total_students}</b><span>Sĩ số lớp</span></article>
                    <article className="is-present"><span className="ahv3__summary-icon is-green" aria-hidden="true"><Icon name="check" size={19} /></span><b>{selectedSession.present_count}</b><span>Có mặt</span><small>Đã gồm học sinh đi trễ</small></article>
                    <article className="is-late"><span className="ahv3__summary-icon is-orange" aria-hidden="true"><Icon name="late" size={19} /></span><b>{selectedLateRecords.length}</b><span>Đi trễ</span><small>Vẫn tính có mặt</small></article>
                    <article className="is-absent"><span className="ahv3__summary-icon is-red" aria-hidden="true"><Icon name="absent" size={19} /></span><b>{selectedSession.absent_count}</b><span>Vắng</span></article>
                    <article className="ahv3__rate-card"><b>{selectedSessionAttendanceRate ?? 0}%</b><span>Tỷ lệ chuyên cần</span><span className="ahv3__rate-ring" style={{ '--attendance-rate': `${selectedSessionAttendanceRate ?? 0}%` }} aria-hidden="true" /></article>
                  </div>

                  {selectedLateRecords.length ? <section className="ahv3__late-section"><header><div><strong>Danh sách học sinh đi trễ</strong><span>{selectedLateRecords.length} học sinh</span></div></header><div className="attendance-late-list">{selectedLateRecords.map((record, index) => <div key={record.id}><span>{index + 1}</span><div><b>{record.student_full_name}</b><small>{record.student_code || 'Không có mã HS'} · {attendanceStatusLabel(record.status)} · vẫn tính có mặt</small></div><em>{record.school_class_name || '—'}</em></div>)}</div></section> : null}

                  <section className="ahv3__absent-section"><header><div><strong>Danh sách học sinh vắng</strong><span>{selectedAbsentRecords.length} học sinh</span></div></header>{selectedAbsentRecords.length ? <div className="attendance-absent-list">{selectedAbsentRecords.map((record, index) => <div key={record.id}><span>{index + 1}</span><div><b>{record.student_full_name}</b><small>{record.student_code || 'Không có mã HS'} · {ABSENCE_REASON_OPTIONS.find((item) => item.value === record.absence_reason_code)?.label || 'Chưa ghi lý do'}{record.absence_note ? ` · ${record.absence_note}` : ''}</small></div><em>{record.school_class_name || '—'}</em></div>)}</div> : <div className="ahv3__all-present"><Icon name="check" size={24} /><div><b>Tất cả học sinh đều có mặt.</b><span>Lớp duy trì sĩ số đầy đủ trong buổi học này.</span></div></div>}</section>

                  <div className="ahv3__footer-grid"><section className="ahv3__note"><strong>Ghi chú buổi học</strong><p>{selectedSession.note || 'Chưa có ghi chú cho buổi học này.'}</p></section><section className="ahv3__lock"><strong>Nhật ký chốt buổi</strong><div><span>Chốt lúc</span><b>{formatDateTime(selectedSession.checked_at)}</b></div><div><span>Trạng thái</span><b>Đã chốt</b></div></section></div>
                </>}
              </> : <div className="attendance-empty is-large">Chọn một buổi để xem chi tiết.</div>}</section>
            </div>
          ) : null}
        </main>
      </section>
    </div>, document.body,
  ) : null;

  return <>{tab}{overlay}</>;
}
