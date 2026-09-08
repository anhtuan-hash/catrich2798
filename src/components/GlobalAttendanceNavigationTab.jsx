import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { readSheet } from 'read-excel-file/browser';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import {
  attendanceSummary,
  buildAttendanceDraft,
  extraClassTypeLabel,
  memberKey,
  parseExtraClassRosterRows,
  sortMembersByName,
} from '../utils/extraClassAttendance.js';
import './GlobalAttendanceNavigationTab.css';

const CLASS_COLUMNS = 'id,class_type,class_name,subject,teacher_id,teacher_name,teacher_email,active,source_key,school_year,grade_level,expected_student_count,periods_per_week,room,weekdays,time_range,created_by,updated_by,created_at,updated_at';
const MEMBER_COLUMNS = 'id,class_id,member_key,student_code,student_full_name,school_class_name,active,joined_at,left_at,created_by,updated_by,removed_by,removal_reason,created_at,updated_at';
const CLASS_TEACHER_COLUMNS = 'id,class_id,teacher_id,teacher_name,teacher_email,position,source_key,created_at,updated_at';
const SESSION_COLUMNS = 'id,class_id,class_type,class_name,subject,teacher_id,teacher_name,teacher_email,checked_at,checked_by,total_students,present_count,absent_count,note,created_at';
const RECORD_COLUMNS = 'id,session_id,class_id,member_id,member_key,student_code,student_full_name,school_class_name,status,recorded_at';

const PATHS = {
  attendance: 'M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v16h18V5a2 2 0 0 0-2-2Zm0 16H5V8h14v11Zm-8.3-2.2-3.1-3.1 1.4-1.4 1.7 1.7 4.3-4.3 1.4 1.4-5.7 5.7Z',
  close: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
  upload: 'M11 16h2V8l3.5 3.5 1.4-1.4L12 4.2l-5.9 5.9 1.4 1.4L11 8v8Zm-6 4h14v-2H5v2Z',
  add: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Zm7 0c-.7 0-1.4.1-2 .2 2.4 1.2 4 2.9 4 4.8v3h5v-2.6c0-3-3.1-5.4-7-5.4Z',
  history: 'M13 3a9 9 0 1 0 8.5 12h-2.2A7 7 0 1 1 17 7.1V10h2V3h-2v1.7A8.9 8.9 0 0 0 13 3Zm-1 5v5.2l4 2.4 1-1.7-3-1.8V8h-2Z',
  trash: 'M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2H7Zm1-11v8h2v-8H8Zm6 0v8h2v-8h-2ZM8 4l1-1h6l1 1h4v2H4V4h4Z',
  check: 'm9.2 17.2-5-5 1.4-1.4 3.6 3.6 8.9-8.9 1.4 1.4-10.3 10.3Z',
  refresh: 'M18.4 5.6A8 8 0 1 0 20 14h-2.1a6 6 0 1 1-1-6.8L14 10h7V3l-2.6 2.6Z',
};

function Icon({ name, size = 20 }) {
  return <svg className="attendance-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={PATHS[name] || PATHS.attendance} /></svg>;
}

function fold(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

function teacherLabel(teacher) {
  return teacher?.full_name || teacher?.name || teacher?.email || 'Giáo viên';
}

function resolveTeacher(group, teachers) {
  const email = String(group?.teacher_email || '').trim().toLowerCase();
  if (email) {
    const exactEmail = teachers.find((teacher) => String(teacher.email || '').trim().toLowerCase() === email);
    if (exactEmail) return exactEmail;
  }
  const name = fold(group?.teacher_name);
  if (name) {
    const exactName = teachers.find((teacher) => fold(teacherLabel(teacher)) === name);
    if (exactName) return exactName;
  }
  return null;
}

function sameClassIdentity(row, group) {
  return row?.class_type === group?.class_type
    && fold(row?.class_name) === fold(group?.class_name)
    && fold(row?.subject) === fold(group?.subject);
}

export default function GlobalAttendanceNavigationTab({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('quick');
  const [classes, setClasses] = useState([]);
  const [members, setMembers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classTeachers, setClassTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [draft, setDraft] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [importReport, setImportReport] = useState(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyType, setHistoryType] = useState('all');
  const [memberQuery, setMemberQuery] = useState('');
  const [addForm, setAddForm] = useState({ student_code: '', student_full_name: '', school_class_name: '' });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const fileRef = useRef(null);

  const systemRole = normalizeSystemRole(runtime.role || currentUser?.role, SYSTEM_ROLES.GUEST);
  const allowed = Boolean(currentUser?.id && systemRole === SYSTEM_ROLES.ADMIN);

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

  async function loadAll({ keepSelection = true } = {}) {
    if (!client || !runtime.ready || !runtime.session || !allowed) return;
    setLoading(true);
    setError('');
    try {
      const [classResult, memberResult, teacherResult, classTeacherResult, sessionResult] = await Promise.all([
        client.from('bes_extra_classes').select(CLASS_COLUMNS).order('class_name', { ascending: true }),
        client.from('bes_extra_class_members').select(MEMBER_COLUMNS).order('student_full_name', { ascending: true }),
        client.rpc('bes_extra_attendance_list_teachers'),
        client.from('bes_extra_class_teachers').select(CLASS_TEACHER_COLUMNS).order('position', { ascending: true }),
        client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).order('checked_at', { ascending: false }).limit(400),
      ]);
      const firstError = classResult.error || memberResult.error || teacherResult.error || classTeacherResult.error || sessionResult.error;
      if (firstError) throw firstError;
      const nextClasses = classResult.data || [];
      setClasses(nextClasses);
      setMembers(memberResult.data || []);
      setTeachers(teacherResult.data || []);
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

  function teachersForClass(classRow) {
    const assigned = classTeacherNames.get(String(classRow?.id)) || [];
    return assigned.length ? assigned.join(', ') : (classRow?.teacher_name || 'Chưa phân công GV');
  }

  useEffect(() => {
    if (view !== 'quick' || !selectedClassId) return;
    setDraft(buildAttendanceDraft(selectedMembers));
    setNote('');
  }, [view, selectedClassId, selectedMembers.length]);

  const summary = useMemo(() => attendanceSummary(draft), [draft]);

  function toggleAbsent(memberKeyValue) {
    setDraft((current) => current.map((row) => (
      row.member_key === memberKeyValue ? { ...row, present: row.present === false } : row
    )));
  }

  async function confirmAttendance() {
    if (!selectedClass || busy || !client) return;
    const absentKeys = draft.filter((row) => row.present === false).map((row) => row.member_key);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data, error: confirmError } = await client.rpc('bes_confirm_extra_class_attendance', {
        p_class_id: selectedClass.id,
        p_absent_member_keys: absentKeys,
        p_note: note.trim(),
      });
      if (confirmError) throw confirmError;
      const created = Array.isArray(data) ? data[0] : data;
      setNotice(`Đã điểm danh ${selectedClass.class_name} lúc ${formatDateTime(created?.checked_at || new Date())}: ${summary.present}/${summary.total} học sinh có mặt.`);
      await loadAll();
      setDraft(buildAttendanceDraft(selectedMembers));
      setNote('');
    } catch (confirmError) {
      setError(confirmError?.message || 'Không thể xác nhận điểm danh.');
    } finally {
      setBusy(false);
    }
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
        const teacher = resolveTeacher(group, teachers);
        if (!teacher) {
          teacherWarnings.push(`${group.class_name}: chưa khớp “${group.teacher_name || group.teacher_email}” với tài khoản giáo viên.`);
          continue;
        }

        let classRow = classes.find((row) => row.active !== false && sameClassIdentity(row, group));
        const classPayload = {
          class_type: group.class_type,
          class_name: group.class_name,
          subject: group.subject || '',
          teacher_id: teacher.id,
          teacher_name: teacherLabel(teacher),
          teacher_email: teacher.email || '',
          active: true,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString(),
        };

        if (classRow) {
          const { data, error: classUpdateError } = await client
            .from('bes_extra_classes')
            .update(classPayload)
            .eq('id', classRow.id)
            .select(CLASS_COLUMNS)
            .single();
          if (classUpdateError) throw classUpdateError;
          classRow = data;
        } else {
          const { data, error: classInsertError } = await client
            .from('bes_extra_classes')
            .insert({ ...classPayload, created_by: currentUser.id })
            .select(CLASS_COLUMNS)
            .single();
          if (classInsertError) throw classInsertError;
          classRow = data;
          createdClasses += 1;
        }

        for (const entry of group.members) {
          const existingActive = members.find((row) => String(row.class_id) === String(classRow.id) && row.member_key === entry.member_key && row.active !== false);
          const existingInactive = [...members].reverse().find((row) => String(row.class_id) === String(classRow.id) && row.member_key === entry.member_key && row.active === false);
          const memberPayload = {
            student_code: entry.student_code || '',
            student_full_name: entry.student_full_name,
            school_class_name: entry.school_class_name || '',
            member_key: entry.member_key,
            updated_by: currentUser.id,
            updated_at: new Date().toISOString(),
          };
          if (existingActive) {
            const { error: updateError } = await client.from('bes_extra_class_members').update(memberPayload).eq('id', existingActive.id);
            if (updateError) throw updateError;
            updatedMembers += 1;
          } else if (existingInactive) {
            const { error: reactivateError } = await client.from('bes_extra_class_members').update({
              ...memberPayload,
              active: true,
              joined_at: new Date().toISOString(),
              left_at: null,
              removed_by: null,
              removal_reason: '',
            }).eq('id', existingInactive.id);
            if (reactivateError) throw reactivateError;
            reactivatedMembers += 1;
          } else {
            const { error: insertError } = await client.from('bes_extra_class_members').insert({
              class_id: classRow.id,
              ...memberPayload,
              active: true,
              created_by: currentUser.id,
            });
            if (insertError) throw insertError;
            addedMembers += 1;
          }
        }
      }

      setImportReport({
        fileName: file.name,
        totalClasses: parsed.totalClasses,
        totalStudents: parsed.totalStudents,
        createdClasses,
        addedMembers,
        reactivatedMembers,
        updatedMembers,
        warnings: [...parsed.warnings, ...teacherWarnings],
      });
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
    const payload = {
      student_code: addForm.student_code.trim(),
      student_full_name: addForm.student_full_name.trim(),
      school_class_name: addForm.school_class_name.trim(),
    };
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
          ...payload,
          active: true,
          joined_at: new Date().toISOString(),
          left_at: null,
          removed_by: null,
          removal_reason: '',
          updated_by: currentUser.id,
          updated_at: new Date().toISOString(),
        }).eq('id', inactive.id);
        if (reactivateError) throw reactivateError;
      } else {
        const { error: insertError } = await client.from('bes_extra_class_members').insert({
          class_id: selectedClass.id,
          ...payload,
          active: true,
          created_by: currentUser.id,
          updated_by: currentUser.id,
        });
        if (insertError) throw insertError;
      }
      setAddForm({ student_code: '', student_full_name: '', school_class_name: '' });
      setShowAddStudent(false);
      setNotice(`Đã thêm ${payload.student_full_name} vào lớp ${selectedClass.class_name}.`);
      await loadAll();
    } catch (addError) {
      setError(addError?.message || 'Không thể thêm học sinh vào lớp.');
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
      const { error: removeError } = await client.from('bes_extra_class_members').update({
        active: false,
        left_at: new Date().toISOString(),
        removed_by: currentUser.id,
        removal_reason: reason.trim(),
        updated_by: currentUser.id,
        updated_at: new Date().toISOString(),
      }).eq('id', member.id);
      if (removeError) throw removeError;
      setNotice(`Đã xóa ${member.student_full_name} khỏi danh sách hiện tại. Các buổi điểm danh trước đây không thay đổi.`);
      await loadAll();
    } catch (removeError) {
      setError(removeError?.message || 'Không thể xóa học sinh khỏi lớp.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteClass(classRow) {
    if (!classRow || busy || !client) return;
    const confirmed = window.confirm(`Xóa lớp “${classRow.class_name}”?\n\nThao tác này sẽ xóa danh sách học sinh, phân công giáo viên và toàn bộ các buổi điểm danh của lớp này. Không thể hoàn tác.`);
    if (!confirmed) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: deleteError } = await client.rpc('bes_delete_extra_class', { p_class_id: classRow.id });
      if (deleteError) throw deleteError;
      if (String(selectedClassId) === String(classRow.id)) setSelectedClassId('');
      if (sessions.some((session) => String(session.class_id) === String(classRow.id) && String(session.id) === String(selectedSessionId))) {
        setSelectedSessionId('');
        setRecords([]);
      }
      setNotice(`Đã xóa lớp ${classRow.class_name} cùng dữ liệu điểm danh liên quan.`);
      await loadAll({ keepSelection: false });
    } catch (deleteError) {
      setError(deleteError?.message || 'Không thể xóa lớp.');
    } finally {
      setBusy(false);
    }
  }

  async function changeTeacher(classRow, teacherId) {
    if (!classRow || busy || !client) return;
    const teacher = teachers.find((row) => String(row.id) === String(teacherId));
    if (!teacher) return;
    setBusy(true);
    setError('');
    try {
      const { error: updateError } = await client.from('bes_extra_classes').update({
        teacher_id: teacher.id,
        teacher_name: teacherLabel(teacher),
        teacher_email: teacher.email || '',
        updated_by: currentUser.id,
        updated_at: new Date().toISOString(),
      }).eq('id', classRow.id);
      if (updateError) throw updateError;
      setNotice(`Đã đổi giáo viên chính lớp ${classRow.class_name} thành ${teacherLabel(teacher)}.`);
      await loadAll();
    } catch (updateError) {
      setError(updateError?.message || 'Không thể đổi giáo viên chính.');
    } finally {
      setBusy(false);
    }
  }

  async function loadSessionRecords(sessionId) {
    if (!client || !sessionId) return;
    setSelectedSessionId(sessionId);
    setError('');
    const { data, error: recordError } = await client.from('bes_extra_attendance_records')
      .select(RECORD_COLUMNS)
      .eq('session_id', sessionId)
      .order('student_full_name', { ascending: true });
    if (recordError) setError(recordError.message);
    else setRecords(data || []);
  }

  async function deleteAttendanceSession(session) {
    if (!session || busy || !client) return;
    const confirmed = window.confirm(`Xóa buổi điểm danh đã duyệt của lớp “${session.class_name}” lúc ${formatDateTime(session.checked_at)}?\n\nDanh sách có mặt/vắng của buổi này sẽ bị xóa. Không thể hoàn tác.`);
    if (!confirmed) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: deleteError } = await client.rpc('bes_delete_extra_attendance_session', { p_session_id: session.id });
      if (deleteError) throw deleteError;
      setSelectedSessionId('');
      setRecords([]);
      setNotice(`Đã xóa buổi điểm danh của ${session.class_name} lúc ${formatDateTime(session.checked_at)}.`);
      await loadAll();
    } catch (deleteError) {
      setError(deleteError?.message || 'Không thể xóa buổi điểm danh đã duyệt.');
    } finally {
      setBusy(false);
    }
  }

  const filteredHistory = useMemo(() => sessions.filter((session) => {
    if (historyType !== 'all' && session.class_type !== historyType) return false;
    const haystack = fold(`${session.class_name} ${session.teacher_name} ${session.subject}`);
    return !historyQuery.trim() || haystack.includes(fold(historyQuery));
  }), [sessions, historyQuery, historyType]);

  const filteredManagementMembers = useMemo(() => allSelectedMembers.filter((member) => {
    if (!memberQuery.trim()) return true;
    return fold(`${member.student_full_name} ${member.student_code} ${member.school_class_name}`).includes(fold(memberQuery));
  }), [allSelectedMembers, memberQuery]);

  const selectedSession = sessions.find((session) => String(session.id) === String(selectedSessionId));
  const selectedAbsentRecords = records.filter((record) => record.status === 'absent');

  if (!host || !allowed) return null;

  const tab = createPortal(
    <button
      type="button"
      className={`brian-nav__attendance-tab ${open ? 'is-active' : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => { setOpen((value) => !value); setError(''); if (!open) setView('quick'); }}
    >
      <Icon name="attendance" size={18} /><span>Điểm danh</span>
    </button>,
    host,
  );

  const overlay = open ? createPortal(
    <div className="attendance-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="attendance-shell" role="dialog" aria-modal="true" aria-label="Điểm danh lớp phụ đạo và bồi dưỡng học sinh giỏi">
        <header className="attendance-topbar">
          <div className="attendance-title">
            <span><Icon name="attendance" size={28} /></span>
            <div><small>QUẢN LÝ CHUYÊN CẦN</small><strong>Điểm danh lớp phụ đạo & bồi dưỡng</strong><p>Tách biệt hoàn toàn với GVCN · dữ liệu lưu theo từng buổi học</p></div>
          </div>
          <div className="attendance-top-actions">
            <button type="button" className="attendance-icon-button" onClick={() => loadAll()} title="Làm mới"><Icon name="refresh" /></button>
            <button type="button" className="attendance-icon-button" onClick={() => setOpen(false)} aria-label="Đóng"><Icon name="close" /></button>
          </div>
        </header>

        <nav className="attendance-tabs" aria-label="Phân hệ điểm danh">
          <button type="button" className={view === 'quick' ? 'is-active' : ''} onClick={() => setView('quick')}><Icon name="check" size={18} />Điểm danh nhanh</button>
          <button type="button" className={view === 'manage' ? 'is-active' : ''} onClick={() => setView('manage')}><Icon name="people" size={18} />Quản lý lớp</button>
          <button type="button" className={view === 'history' ? 'is-active' : ''} onClick={() => setView('history')}><Icon name="history" size={18} />Lịch sử</button>
        </nav>

        {notice ? <div className="attendance-banner is-success">{notice}</div> : null}
        {error ? <div className="attendance-banner is-error">{error}</div> : null}

        <main className="attendance-content">
          {loading ? <div className="attendance-loading">Đang đồng bộ dữ liệu điểm danh…</div> : null}

          {!loading && view === 'quick' ? (
            <div className="attendance-quick-layout">
              <aside className="attendance-class-list">
                <header><strong>Lớp đang hoạt động</strong><span>{activeClasses.length} lớp</span></header>
                <div>
                  {activeClasses.map((classRow) => {
                    const last = lastSessionByClass.get(String(classRow.id));
                    return (
                      <button key={classRow.id} type="button" className={String(selectedClassId) === String(classRow.id) ? 'is-selected' : ''} onClick={() => setSelectedClassId(classRow.id)}>
                        <span className={`attendance-type-dot is-${classRow.class_type}`} />
                        <div><b>{classRow.class_name}</b><small>{extraClassTypeLabel(classRow.class_type)} · {classRow.subject || 'Chưa ghi môn'}</small><em>{teachersForClass(classRow)}</em></div>
                        <span className="attendance-count">{memberCounts.get(String(classRow.id)) || 0}</span>
                        {last ? <time>{formatDateTime(last.checked_at)}</time> : <time>Chưa điểm danh</time>}
                      </button>
                    );
                  })}
                  {!activeClasses.length ? <div className="attendance-empty">Chưa có lớp. Mở “Quản lý lớp” để import danh sách.</div> : null}
                </div>
              </aside>

              <section className="attendance-rollcall">
                {selectedClass ? (
                  <>
                    <header className="attendance-rollcall-head">
                      <div><span>{extraClassTypeLabel(selectedClass.class_type)}</span><h2>{selectedClass.class_name}</h2><p>{selectedClass.subject || 'Chưa ghi môn'} · GV {teachersForClass(selectedClass)}</p></div>
                      <div className="attendance-summary"><b>{summary.present}/{summary.total}</b><span>Có mặt</span><em>{summary.absent} vắng</em></div>
                    </header>
                    <div className="attendance-roster-head"><span>Học sinh</span><span>Lớp chính khóa</span><span>Vắng</span></div>
                    <div className="attendance-roster">
                      {draft.map((member, index) => (
                        <label key={member.id || member.member_key} className={member.present === false ? 'is-absent' : ''}>
                          <span className="attendance-index">{String(index + 1).padStart(2, '0')}</span>
                          <div><b>{member.student_full_name}</b><small>{member.student_code || 'Không có mã HS'}</small></div>
                          <span className="attendance-school-class">{member.school_class_name || '—'}</span>
                          <input type="checkbox" checked={member.present === false} onChange={() => toggleAbsent(member.member_key)} aria-label={`Đánh dấu ${member.student_full_name} vắng`} />
                        </label>
                      ))}
                      {!draft.length ? <div className="attendance-empty">Lớp này chưa có học sinh đang hoạt động.</div> : null}
                    </div>
                    <footer className="attendance-confirm-bar">
                      <label><span>Ghi chú buổi học</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Không bắt buộc" /></label>
                      <div><span>Giờ điểm danh được lưu theo giờ máy chủ khi nhấn nút.</span><button type="button" disabled={busy || !draft.length} onClick={confirmAttendance}><Icon name="check" size={18} />{busy ? 'Đang lưu…' : 'Xác nhận điểm danh'}</button></div>
                    </footer>
                  </>
                ) : <div className="attendance-empty is-large">Chọn một lớp để bắt đầu điểm danh.</div>}
              </section>
            </div>
          ) : null}

          {!loading && view === 'manage' ? (
            <div className="attendance-manage-layout">
              <section className="attendance-import-card">
                <div><span><Icon name="upload" size={24} /></span><div><strong>Import lớp phụ đạo / bồi dưỡng</strong><p>Excel: Loại lớp · Tên lớp · Môn · Giáo viên · Mã HS · Họ và tên · Lớp chính khóa</p></div></div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={(event) => importExcel(event.target.files?.[0])} hidden />
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}><Icon name="upload" size={18} />{busy ? 'Đang xử lý…' : 'Chọn file Excel'}</button>
              </section>

              {importReport ? (
                <section className="attendance-import-report">
                  <strong>{importReport.fileName}</strong>
                  <div><span>{importReport.totalClasses} lớp trong file</span><span>{importReport.totalStudents} học sinh</span><span>{importReport.createdClasses} lớp mới</span><span>{importReport.addedMembers} HS thêm mới</span><span>{importReport.reactivatedMembers} HS trở lại</span></div>
                  {importReport.warnings?.length ? <details><summary>{importReport.warnings.length} lưu ý import</summary>{importReport.warnings.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</details> : null}
                </section>
              ) : null}

              <div className="attendance-management-grid">
                <aside className="attendance-manage-classes">
                  <header><strong>Danh sách lớp</strong><span>{activeClasses.length}</span></header>
                  {activeClasses.map((classRow) => (
                    <button key={classRow.id} type="button" className={String(selectedClassId) === String(classRow.id) ? 'is-selected' : ''} onClick={() => setSelectedClassId(classRow.id)}>
                      <b>{classRow.class_name}</b><small>{extraClassTypeLabel(classRow.class_type)} · {classRow.subject || 'Chưa ghi môn'}</small><span>{memberCounts.get(String(classRow.id)) || 0} HS</span>
                    </button>
                  ))}
                </aside>

                <section className="attendance-member-manager">
                  {selectedClass ? (
                    <>
                      <header>
                        <div><h2>{selectedClass.class_name}</h2><p>{extraClassTypeLabel(selectedClass.class_type)} · {selectedClass.subject || 'Chưa ghi môn'}</p></div>
                        <div className="attendance-teacher-field">
                          <label>Toàn bộ giáo viên</label>
                          <strong>{teachersForClass(selectedClass)}</strong>
                          <label>Giáo viên chính</label>
                          <select value={selectedClass.teacher_id || ''} disabled={busy} onChange={(event) => changeTeacher(selectedClass, event.target.value)}><option value="">Chọn giáo viên</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacherLabel(teacher)}{teacher.email ? ` · ${teacher.email}` : ''}</option>)}</select>
                        </div>
                      </header>
                      <div className="attendance-member-tools">
                        <input value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} placeholder="Tìm học sinh, mã HS, lớp chính khóa…" />
                        <button type="button" onClick={() => setShowAddStudent((value) => !value)}><Icon name="add" size={18} />Thêm học sinh</button>
                        <button type="button" disabled={busy} onClick={() => deleteClass(selectedClass)}><Icon name="trash" size={17} />Xóa lớp</button>
                      </div>

                      {showAddStudent ? (
                        <form className="attendance-add-student" onSubmit={addStudent}>
                          <label><span>Mã HS</span><input value={addForm.student_code} onChange={(event) => setAddForm((current) => ({ ...current, student_code: event.target.value }))} placeholder="Có thể để trống" /></label>
                          <label><span>Họ và tên *</span><input value={addForm.student_full_name} onChange={(event) => setAddForm((current) => ({ ...current, student_full_name: event.target.value }))} required /></label>
                          <label><span>Lớp chính khóa *</span><input value={addForm.school_class_name} onChange={(event) => setAddForm((current) => ({ ...current, school_class_name: event.target.value }))} placeholder="Ví dụ 12.6" required /></label>
                          <div><button type="button" onClick={() => setShowAddStudent(false)}>Hủy</button><button type="submit" disabled={busy}><Icon name="add" size={17} />Thêm vào lớp</button></div>
                        </form>
                      ) : null}

                      <div className="attendance-member-table">
                        <div className="attendance-member-table-head"><span>Học sinh</span><span>Lớp</span><span>Trạng thái</span><span /></div>
                        {filteredManagementMembers.map((member) => (
                          <div key={member.id} className={member.active === false ? 'is-inactive' : ''}>
                            <span><b>{member.student_full_name}</b><small>{member.student_code || 'Không có mã HS'}</small></span>
                            <span>{member.school_class_name || '—'}</span>
                            <span>{member.active === false ? `Đã rời lớp${member.left_at ? ` · ${formatDateTime(member.left_at)}` : ''}` : 'Đang học'}</span>
                            <span>{member.active !== false ? <button type="button" disabled={busy} onClick={() => removeStudent(member)}><Icon name="trash" size={16} />Xóa khỏi lớp</button> : <em>{member.removal_reason || 'Đã lưu lịch sử'}</em>}</span>
                          </div>
                        ))}
                        {!filteredManagementMembers.length ? <div className="attendance-empty">Không có học sinh phù hợp.</div> : null}
                      </div>
                    </>
                  ) : <div className="attendance-empty is-large">Chọn lớp để quản lý học sinh.</div>}
                </section>
              </div>
            </div>
          ) : null}

          {!loading && view === 'history' ? (
            <div className="attendance-history-layout">
              <section className="attendance-history-list">
                <header><div><strong>Lịch sử điểm danh</strong><span>{filteredHistory.length} buổi</span></div><div><select value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value="all">Tất cả loại lớp</option><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option></select><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Tìm lớp, giáo viên…" /></div></header>
                <div>
                  {filteredHistory.map((session) => (
                    <button key={session.id} type="button" className={String(selectedSessionId) === String(session.id) ? 'is-selected' : ''} onClick={() => loadSessionRecords(session.id)}>
                      <span className={`attendance-type-dot is-${session.class_type}`} />
                      <div><b>{session.class_name}</b><small>{session.teacher_name || 'Chưa ghi giáo viên'} · {extraClassTypeLabel(session.class_type)}</small><time>{formatDateTime(session.checked_at)}</time></div>
                      <span className="attendance-history-count"><b>{session.present_count}/{session.total_students}</b><em>{session.absent_count} vắng</em></span>
                    </button>
                  ))}
                  {!filteredHistory.length ? <div className="attendance-empty">Chưa có buổi điểm danh phù hợp.</div> : null}
                </div>
              </section>

              <section className="attendance-history-detail">
                {selectedSession ? (
                  <>
                    <header><span>{extraClassTypeLabel(selectedSession.class_type)}</span><h2>{selectedSession.class_name}</h2><p>{formatDateTime(selectedSession.checked_at)} · GV {selectedSession.teacher_name || '—'}</p><button type="button" disabled={busy} onClick={() => deleteAttendanceSession(selectedSession)}><Icon name="trash" size={17} />Xóa buổi điểm danh</button></header>
                    <div className="attendance-history-stat"><div><b>{selectedSession.total_students}</b><span>Sĩ số</span></div><div><b>{selectedSession.present_count}</b><span>Có mặt</span></div><div><b>{selectedSession.absent_count}</b><span>Vắng</span></div></div>
                    {selectedSession.note ? <div className="attendance-history-note"><b>Ghi chú</b><p>{selectedSession.note}</p></div> : null}
                    <div className="attendance-absent-list"><strong>Học sinh vắng</strong>{selectedAbsentRecords.map((record, index) => <div key={record.id}><span>{index + 1}</span><div><b>{record.student_full_name}</b><small>{record.student_code || 'Không có mã HS'}</small></div><em>{record.school_class_name || '—'}</em></div>)}{!selectedAbsentRecords.length ? <p>Tất cả học sinh đều có mặt.</p> : null}</div>
                  </>
                ) : <div className="attendance-empty is-large">Chọn một buổi để xem danh sách vắng và thời gian điểm danh.</div>}
              </section>
            </div>
          ) : null}
        </main>
      </section>
    </div>,
    document.body,
  ) : null;

  return <>{tab}{overlay}</>;
}
