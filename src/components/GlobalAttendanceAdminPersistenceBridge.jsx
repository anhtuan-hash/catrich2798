import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import './GlobalAttendanceAdminPersistenceBridge.css';

function teacherLabel(teacher) {
  return teacher?.full_name || teacher?.name || teacher?.email || 'Giáo viên';
}

const EMPTY_FORM = {
  class_type: 'remedial',
  class_name: '',
  subject: 'Tiếng Anh',
  teacher_id: '',
};

export default function GlobalAttendanceAdminPersistenceBridge({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const systemRole = normalizeSystemRole(runtime.role || currentUser?.role, SYSTEM_ROLES.GUEST);
  const allowed = Boolean(currentUser?.id && systemRole === SYSTEM_ROLES.ADMIN);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => setHost(document.querySelector('.attendance-import-card'));
    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open || !allowed || !client || !runtime.ready || !runtime.session) return;
    let cancelled = false;
    (async () => {
      const { data, error: teacherError } = await client.rpc('bes_extra_attendance_list_teachers');
      if (cancelled) return;
      if (teacherError) {
        setError(teacherError.message || 'Không thể tải danh sách giáo viên.');
        return;
      }
      setTeachers(data || []);
    })();
    return () => { cancelled = true; };
  }, [open, allowed, client, runtime.ready, runtime.session?.user?.id]);

  async function createClass(event) {
    event.preventDefault();
    if (!allowed || !client || busy) return;
    const className = form.class_name.trim();
    const subject = form.subject.trim();
    const teacher = teachers.find((row) => String(row.id) === String(form.teacher_id));

    if (!className) {
      setError('Vui lòng nhập tên lớp.');
      return;
    }
    if (!teacher) {
      setError('Vui lòng chọn giáo viên đứng lớp.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        class_type: form.class_type,
        class_name: className,
        subject,
        teacher_id: teacher.id,
        teacher_name: teacherLabel(teacher),
        teacher_email: teacher.email || '',
        active: true,
        created_by: currentUser.id,
        updated_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await client
        .from('bes_extra_classes')
        .insert(payload)
        .select('id,class_type,class_name,subject,teacher_id,teacher_name,teacher_email,active,created_at')
        .single();

      if (insertError) {
        if (String(insertError.code) === '23505') {
          throw new Error('Lớp này đã tồn tại trên hệ thống.');
        }
        throw insertError;
      }

      setNotice(`Đã lưu lớp “${data?.class_name || className}” vào Supabase. Lớp sẽ còn nguyên khi đăng nhập ở trình duyệt hoặc thiết bị khác.`);
      setForm(EMPTY_FORM);
      setOpen(false);

      // Reuse the attendance workspace's authoritative reload path so the newly
      // persisted class appears immediately without duplicating roster state here.
      window.setTimeout(() => {
        document.querySelector('.attendance-top-actions button[title="Làm mới"]')?.click();
      }, 80);
    } catch (createError) {
      setError(createError?.message || 'Không thể lưu lớp vào hệ thống.');
    } finally {
      setBusy(false);
    }
  }

  if (!host || !allowed) return null;

  const controls = createPortal(
    <div className="attendance-persistence-actions">
      <button type="button" className="attendance-create-class-button" onClick={() => { setOpen(true); setError(''); setNotice(''); }}>
        <span aria-hidden="true">＋</span>Tạo lớp mới
      </button>
      <small>Được lưu trên hệ thống · không phụ thuộc trình duyệt</small>
    </div>,
    host,
  );

  const modal = open ? createPortal(
    <div className="attendance-create-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <form className="attendance-create-dialog" onSubmit={createClass}>
        <header>
          <div><small>TẠO LỚP THỦ CÔNG</small><h3>Lớp phụ đạo / bồi dưỡng mới</h3><p>Dữ liệu được ghi trực tiếp vào Supabase, không lưu bằng localStorage.</p></div>
          <button type="button" aria-label="Đóng" disabled={busy} onClick={() => setOpen(false)}>×</button>
        </header>

        {error ? <div className="attendance-create-message is-error">{error}</div> : null}
        {notice ? <div className="attendance-create-message is-success">{notice}</div> : null}

        <div className="attendance-create-fields">
          <label><span>Loại lớp *</span><select value={form.class_type} onChange={(event) => setForm((current) => ({ ...current, class_type: event.target.value }))}><option value="remedial">Phụ đạo</option><option value="gifted">Bồi dưỡng HSG</option></select></label>
          <label className="is-wide"><span>Tên lớp *</span><input value={form.class_name} onChange={(event) => setForm((current) => ({ ...current, class_name: event.target.value }))} placeholder="Ví dụ: Phụ đạo Tiếng Anh 12 - Nhóm 1" required /></label>
          <label><span>Môn</span><input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Tiếng Anh" /></label>
          <label className="is-wide"><span>Giáo viên đứng lớp *</span><select value={form.teacher_id} onChange={(event) => setForm((current) => ({ ...current, teacher_id: event.target.value }))} required><option value="">Chọn giáo viên</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacherLabel(teacher)}{teacher.email ? ` · ${teacher.email}` : ''}</option>)}</select></label>
        </div>

        <footer>
          <span>Sau khi tạo lớp, Admin có thể thêm học sinh thủ công hoặc import Excel.</span>
          <div><button type="button" disabled={busy} onClick={() => setOpen(false)}>Hủy</button><button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu lớp trên hệ thống'}</button></div>
        </footer>
      </form>
    </div>,
    document.body,
  ) : null;

  return <>{controls}{modal}</>;
}
