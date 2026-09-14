import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { readSheet } from 'read-excel-file/browser';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { parseExtraClassRosterRows } from '../utils/extraClassAttendance.js';
import { hasAttendanceTabAccess } from '../utils/permissions.js';
import { normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import {
  GIFTED_TEACHER_ASSIGNMENTS_2026_2027,
  giftedAssignmentForClass,
  giftedAssignmentOptions,
} from '../utils/giftedTeacherCatalog2026.js';
import './GlobalAttendanceAdminPersistenceBridge.css';

const ASSIGNMENT_OPTIONS = giftedAssignmentOptions();
const DEFAULT_ASSIGNMENT_KEY = 'hsg-2026-tieng-anh-10';

const EMPTY_FORM = {
  class_type: 'gifted',
  class_name: '',
  assignment_key: DEFAULT_ASSIGNMENT_KEY,
};

function fold(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function sameClassIdentity(row, group) {
  return row?.class_type === group?.class_type
    && fold(row?.class_name) === fold(group?.class_name)
    && fold(row?.subject) === fold(group?.subject);
}

export default function GlobalAttendanceAdminPersistenceBridge({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const fileRef = useRef(null);
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const systemRole = normalizeSystemRole(runtime.role || currentUser?.role, SYSTEM_ROLES.GUEST);
  const isAdmin = systemRole === SYSTEM_ROLES.ADMIN;
  const hasManageAccess = hasAttendanceTabAccess(currentUser, 'manage');
  const hasReportAccess = hasAttendanceTabAccess(currentUser, 'report');
  const allowed = Boolean(currentUser?.id && (isAdmin || hasManageAccess || hasReportAccess));
  const reportOnlyCreator = Boolean(currentUser?.id && hasReportAccess && !hasManageAccess && !isAdmin);
  const assignment = useMemo(
    () => GIFTED_TEACHER_ASSIGNMENTS_2026_2027.find((item) => item.sourceKey === form.assignment_key) || null,
    [form.assignment_key],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => {
      const managementHost = document.querySelector('.attendance-import-card');
      const fallbackHost = reportOnlyCreator ? document.querySelector('.attendance-top-actions') : null;
      setHost(managementHost || fallbackHost);
    };
    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [reportOnlyCreator]);

  async function createClass(event) {
    event.preventDefault();
    if (!allowed || !client || busy) return;
    const className = form.class_name.trim();

    if (!className) {
      setError('Vui lòng nhập tên lớp.');
      return;
    }
    if (!assignment) {
      setError('Vui lòng chọn đúng khối/môn trong danh sách phân công 2026–2027.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data, error: createError } = await client.rpc('bes_create_extra_class_with_teachers', {
        p_class_type: form.class_type,
        p_class_name: className,
        p_subject: assignment.subject,
        p_source_key: assignment.sourceKey,
        p_school_year: '2026-2027',
        p_grade_level: assignment.gradeLevel,
        p_teacher_names: assignment.teachers,
      });

      if (createError) {
        if (String(createError.code) === '23505') {
          throw new Error('Lớp này hoặc phân công này đã tồn tại trên hệ thống.');
        }
        throw createError;
      }

      const created = Array.isArray(data) ? data[0] : data;
      setNotice(`Đã lưu lớp “${created?.class_name || className}” với ${assignment.teachers.length} giáo viên theo phân công chính thức.`);
      setForm(EMPTY_FORM);
      setOpen(false);

      window.setTimeout(() => {
        document.querySelector('.attendance-top-actions button[title="Làm mới"]')?.click();
      }, 80);
    } catch (createError) {
      setError(createError?.message || 'Không thể lưu lớp vào hệ thống.');
    } finally {
      setBusy(false);
    }
  }

  async function importNewClasses(file) {
    if (!reportOnlyCreator || !file || !client || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const rows = await readSheet(file);
      const parsed = parseExtraClassRosterRows(rows);
      const { data: existingClasses, error: classLoadError } = await client
        .from('bes_extra_classes')
        .select('id,class_type,class_name,subject,source_key,grade_level,active');
      if (classLoadError) throw classLoadError;

      let createdClasses = 0;
      let addedMembers = 0;
      const warnings = [...parsed.warnings];
      const knownClasses = [...(existingClasses || [])];

      for (const group of parsed.groups) {
        const classRow = knownClasses.find((row) => row.active !== false && sameClassIdentity(row, group));
        if (classRow) {
          warnings.push(`Bỏ qua lớp đã tồn tại: ${group.class_name}. Tài khoản Báo cáo chỉ được tạo lớp mới.`);
          continue;
        }

        const assignmentForImport = giftedAssignmentForClass({
          subject: group.subject,
          className: group.class_name,
        });
        const teacherNames = assignmentForImport?.teachers?.length
          ? assignmentForImport.teachers
          : [String(group.teacher_name || '').trim()].filter(Boolean);
        if (!teacherNames.length) {
          warnings.push(`${group.class_name}: chưa có giáo viên trong phân công hoặc file import nên chưa tạo lớp.`);
          continue;
        }

        const { data, error: createError } = await client.rpc('bes_create_extra_class_with_members', {
          p_class_type: group.class_type,
          p_class_name: group.class_name,
          p_subject: assignmentForImport?.subject || group.subject || '',
          p_source_key: assignmentForImport?.sourceKey || null,
          p_school_year: assignmentForImport ? '2026-2027' : '',
          p_grade_level: assignmentForImport?.gradeLevel || '',
          p_teacher_names: teacherNames,
          p_members: group.members.map((entry) => ({
            member_key: entry.member_key,
            student_code: entry.student_code || '',
            student_full_name: entry.student_full_name,
            school_class_name: entry.school_class_name || '',
          })),
        });
        if (createError) throw createError;

        const created = Array.isArray(data) ? data[0] : data;
        knownClasses.push(created || {
          class_type: group.class_type,
          class_name: group.class_name,
          subject: assignmentForImport?.subject || group.subject || '',
          active: true,
        });
        createdClasses += 1;
        addedMembers += group.members.length;
      }

      const warningText = warnings.length ? ` Có ${warnings.length} lưu ý; các lớp đã tồn tại được giữ nguyên.` : '';
      setNotice(`Đã tạo ${createdClasses} lớp mới và thêm ${addedMembers} học sinh từ ${file.name}.${warningText}`);
      window.setTimeout(() => {
        document.querySelector('.attendance-top-actions button[title="Làm mới"]')?.click();
      }, 80);
    } catch (importError) {
      setError(importError?.message || 'Không thể import lớp phụ đạo/bồi dưỡng mới.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!host || !allowed) return null;

  const headerFallback = host.classList?.contains('attendance-top-actions');
  const controls = createPortal(
    <div className={`attendance-persistence-actions${headerFallback ? ' is-header-fallback' : ''}`}>
      {reportOnlyCreator ? <>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => importNewClasses(event.target.files?.[0])}
          hidden
        />
        <button type="button" className="attendance-create-class-button attendance-import-new-class-button" disabled={busy} onClick={() => fileRef.current?.click()}>
          <span aria-hidden="true">⇧</span>{busy ? 'Đang xử lý…' : 'Chọn file Excel'}
        </button>
      </> : null}
      <button type="button" className="attendance-create-class-button" disabled={busy} onClick={() => { setOpen(true); setError(''); setNotice(''); }}>
        <span aria-hidden="true">＋</span>Tạo lớp mới
      </button>
      {!headerFallback ? <small>Được lưu trên hệ thống · không phụ thuộc trình duyệt</small> : null}
    </div>,
    host,
  );

  const modal = open ? createPortal(
    <div className="attendance-create-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <form className="attendance-create-dialog" onSubmit={createClass}>
        <header>
          <div><small>TẠO LỚP THỦ CÔNG</small><h3>Lớp phụ đạo / bồi dưỡng mới</h3><p>Giáo viên lấy từ bảng phân công chính thức khối 10–12 năm học 2026–2027, không lấy từ tài khoản website.</p></div>
          <button type="button" aria-label="Đóng" disabled={busy} onClick={() => setOpen(false)}>×</button>
        </header>

        {error ? <div className="attendance-create-message is-error">{error}</div> : null}
        {notice ? <div className="attendance-create-message is-success">{notice}</div> : null}

        <div className="attendance-create-fields">
          <label><span>Loại lớp *</span><select value={form.class_type} onChange={(event) => setForm((current) => ({ ...current, class_type: event.target.value }))}><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option></select></label>
          <label className="is-wide"><span>Tên lớp *</span><input value={form.class_name} onChange={(event) => setForm((current) => ({ ...current, class_name: event.target.value }))} placeholder={assignment?.className || 'Ví dụ: Bồi dưỡng Tiếng Anh 10'} required /></label>
          <label className="is-wide"><span>Khối / môn theo phân công *</span><select value={form.assignment_key} onChange={(event) => setForm((current) => ({ ...current, assignment_key: event.target.value }))} required>{ASSIGNMENT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="is-wide"><span>Giáo viên theo phân công</span><strong>{assignment?.teachers.join(', ') || '—'}</strong><small>{assignment ? `${assignment.teachers.length} giáo viên · khối ${assignment.gradeLevel} · ${assignment.subject}` : 'Chưa có phân công'}</small></label>
        </div>

        <footer>
          <span>Các lớp có nhiều giáo viên sẽ giữ đầy đủ toàn bộ giáo viên trong danh sách phân công.</span>
          <div><button type="button" disabled={busy} onClick={() => setOpen(false)}>Hủy</button><button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu lớp trên hệ thống'}</button></div>
        </footer>
      </form>
    </div>,
    document.body,
  ) : null;

  const toast = !open && (error || notice) ? createPortal(
    <div className={`attendance-create-toast ${error ? 'is-error' : 'is-success'}`} role="status" onClick={() => { setError(''); setNotice(''); }}>
      {error || notice}
    </div>,
    document.body,
  ) : null;

  return <>{controls}{modal}{toast}</>;
}
