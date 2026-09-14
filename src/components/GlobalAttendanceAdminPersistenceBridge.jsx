import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { readSheet } from 'read-excel-file/browser';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { parseExtraClassRosterRows } from '../utils/extraClassAttendance.js';
import { hasAttendanceTabAccess } from '../utils/permissions.js';
import { normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import { giftedAssignmentForClass } from '../utils/giftedTeacherCatalog2026.js';
import './GlobalAttendanceAdminPersistenceBridge.css';

const EMPTY_FORM = {
  class_type: 'gifted',
  class_name: '',
  subject: '',
  grade_level: '',
  school_year: '2026-2027',
  teacher_names: '',
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

function parseManualTeacherNames(value) {
  const names = [];
  String(value || '').split(/[\n,;]+/).forEach((rawName) => {
    const name = rawName.trim();
    if (name && !names.some((current) => fold(current) === fold(name))) names.push(name);
  });
  return names;
}

function buildManualSourceKey(classType, className) {
  const slug = fold(className)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36) || 'class';
  const uniquePart = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `manual-${classType}-${slug}-${uniquePart}`;
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
    const subject = form.subject.trim();
    const gradeLevel = form.grade_level.trim();
    const schoolYear = form.school_year.trim();
    const teacherNames = parseManualTeacherNames(form.teacher_names);

    if (!className) {
      setError('Vui lòng nhập tên lớp.');
      return;
    }
    if (!subject) {
      setError('Vui lòng nhập môn học.');
      return;
    }
    if (!['10', '11', '12'].includes(gradeLevel)) {
      setError('Vui lòng nhập khối 10, 11 hoặc 12.');
      return;
    }
    if (!schoolYear) {
      setError('Vui lòng nhập năm học.');
      return;
    }
    if (!teacherNames.length) {
      setError('Vui lòng nhập ít nhất một giáo viên phụ trách.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data, error: createError } = await client.rpc('bes_create_extra_class_with_teachers', {
        p_class_type: form.class_type,
        p_class_name: className,
        p_subject: subject,
        p_source_key: buildManualSourceKey(form.class_type, className),
        p_school_year: schoolYear,
        p_grade_level: gradeLevel,
        p_teacher_names: teacherNames,
      });

      if (createError) {
        if (String(createError.code) === '23505') {
          throw new Error('Lớp này đã tồn tại trên hệ thống.');
        }
        throw createError;
      }

      const created = Array.isArray(data) ? data[0] : data;
      setNotice(`Đã lưu lớp “${created?.class_name || className}” với ${teacherNames.length} giáo viên bạn tự nhập.`);
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
          <div><small>TẠO LỚP THỦ CÔNG</small><h3>Lớp phụ đạo / bồi dưỡng mới</h3><p>Tự nhập thông tin lớp và giáo viên phụ trách. Không bắt buộc theo bảng phân công sẵn có.</p></div>
          <button type="button" aria-label="Đóng" disabled={busy} onClick={() => setOpen(false)}>×</button>
        </header>

        {error ? <div className="attendance-create-message is-error">{error}</div> : null}
        {notice ? <div className="attendance-create-message is-success">{notice}</div> : null}

        <div className="attendance-create-fields">
          <label><span>Loại lớp *</span><select value={form.class_type} onChange={(event) => setForm((current) => ({ ...current, class_type: event.target.value }))}><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option></select></label>
          <label><span>Khối *</span><input value={form.grade_level} inputMode="numeric" maxLength="2" onChange={(event) => setForm((current) => ({ ...current, grade_level: event.target.value }))} placeholder="10, 11 hoặc 12" required /></label>
          <label className="is-full"><span>Tên lớp *</span><input value={form.class_name} onChange={(event) => setForm((current) => ({ ...current, class_name: event.target.value }))} placeholder="Ví dụ: Bồi dưỡng Tiếng Anh 10" required /></label>
          <label><span>Môn học *</span><input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Ví dụ: Tiếng Anh" required /></label>
          <label><span>Năm học *</span><input value={form.school_year} onChange={(event) => setForm((current) => ({ ...current, school_year: event.target.value }))} placeholder="2026-2027" required /></label>
          <label className="is-full"><span>Giáo viên phụ trách *</span><textarea rows="2" value={form.teacher_names} onChange={(event) => setForm((current) => ({ ...current, teacher_names: event.target.value }))} placeholder="Nhập tên giáo viên. Nhiều giáo viên có thể cách nhau bằng dấu phẩy, dấu chấm phẩy hoặc xuống dòng." required /></label>
        </div>

        <footer>
          <span>Bạn tự quyết định tên lớp, môn, khối và giáo viên; hệ thống chỉ kiểm tra dữ liệu bắt buộc.</span>
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
