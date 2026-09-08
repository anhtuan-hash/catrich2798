import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { getRuntimeClient } from '../services/runtime/core.js';
import './ExtraClassAdminDataManager.css';

const CLASS_COLUMNS = 'id,class_type,class_name,subject,teacher_name,source_key,school_year,grade_level,expected_student_count,periods_per_week,room,weekday_text,time_text,active,created_at';
const TEACHER_COLUMNS = 'id,class_id,teacher_id,teacher_name,teacher_email,sort_order,is_primary';
const SESSION_COLUMNS = 'id,class_id,class_type,class_name,subject,teacher_name,checked_at,total_students,present_count,absent_count,note';

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function typeLabel(value) {
  return value === 'gifted' ? 'Bồi dưỡng HSG' : 'Phụ đạo';
}

function notifyAttendanceWorkspace() {
  window.dispatchEvent(new CustomEvent('bes-extra-attendance-data-changed'));
  window.setTimeout(() => {
    document.querySelector('.attendance-top-actions .attendance-icon-button[title="Làm mới"]')?.click();
  }, 60);
}

export function ExtraClassAdminDataManager() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    const client = getRuntimeClient();
    if (!client) {
      setError('Chưa kết nối được máy chủ dữ liệu.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [classResult, teacherResult, memberResult, sessionResult] = await Promise.all([
        client.from('bes_extra_classes').select(CLASS_COLUMNS).order('class_type').order('class_name'),
        client.from('bes_extra_class_teachers').select(TEACHER_COLUMNS).order('sort_order'),
        client.from('bes_extra_class_members').select('id,class_id,active'),
        client.from('bes_extra_attendance_sessions').select(SESSION_COLUMNS).order('checked_at', { ascending: false }).limit(500),
      ]);
      const firstError = classResult.error || teacherResult.error || memberResult.error || sessionResult.error;
      if (firstError) throw firstError;
      setClasses(classResult.data || []);
      setTeachers(teacherResult.data || []);
      setMembers(memberResult.data || []);
      setSessions(sessionResult.data || []);
    } catch (loadError) {
      setError(loadError?.message || 'Không tải được dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const teachersByClass = useMemo(() => {
    const map = new Map();
    teachers.forEach((teacher) => {
      const key = String(teacher.class_id);
      const current = map.get(key) || [];
      current.push(teacher);
      map.set(key, current);
    });
    return map;
  }, [teachers]);

  const memberCountByClass = useMemo(() => {
    const map = new Map();
    members.forEach((member) => {
      if (member.active === false) return;
      const key = String(member.class_id);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [members]);

  const deleteClass = async (classRow) => {
    const teacherNames = (teachersByClass.get(String(classRow.id)) || []).map((item) => item.teacher_name).filter(Boolean);
    const confirmed = window.confirm(
      `Xóa vĩnh viễn lớp “${classRow.class_name}”?\n\nThao tác này sẽ xóa danh sách học sinh, toàn bộ phân công giáo viên và mọi buổi điểm danh của lớp. Không thể hoàn tác.`,
    );
    if (!confirmed) return;
    const client = getRuntimeClient();
    if (!client) return;
    setBusyKey(`class:${classRow.id}`);
    setError('');
    setNotice('');
    const { error: deleteError } = await client.rpc('bes_delete_extra_class', { p_class_id: classRow.id });
    if (deleteError) setError(deleteError.message || 'Không xóa được lớp.');
    else {
      setNotice(`Đã xóa lớp ${classRow.class_name}${teacherNames.length ? ` (${teacherNames.join(', ')})` : ''}.`);
      await loadData();
      notifyAttendanceWorkspace();
    }
    setBusyKey('');
  };

  const deleteSession = async (session) => {
    const confirmed = window.confirm(
      `Xóa buổi điểm danh đã duyệt của “${session.class_name}” lúc ${formatDateTime(session.checked_at)}?\n\nToàn bộ bản ghi có mặt/vắng của buổi này sẽ bị xóa. Không thể hoàn tác.`,
    );
    if (!confirmed) return;
    const client = getRuntimeClient();
    if (!client) return;
    setBusyKey(`session:${session.id}`);
    setError('');
    setNotice('');
    const { error: deleteError } = await client.rpc('bes_delete_extra_attendance_session', { p_session_id: session.id });
    if (deleteError) setError(deleteError.message || 'Không xóa được buổi điểm danh.');
    else {
      setNotice(`Đã xóa buổi điểm danh ${formatDateTime(session.checked_at)} của ${session.class_name}.`);
      await loadData();
      notifyAttendanceWorkspace();
    }
    setBusyKey('');
  };

  const overlay = open ? createPortal(
    <div className="extra-class-data-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="extra-class-data-shell" role="dialog" aria-modal="true" aria-label="Quản trị dữ liệu lớp phụ đạo và bồi dưỡng">
        <header className="extra-class-data-head">
          <div><small>QUẢN TRỊ DỮ LIỆU</small><h2>Lớp & điểm danh đã duyệt</h2><p>Xóa dữ liệu bằng giao dịch máy chủ, chỉ dành cho Admin.</p></div>
          <div><button type="button" onClick={loadData} disabled={loading}>Làm mới</button><button type="button" onClick={() => setOpen(false)} aria-label="Đóng">×</button></div>
        </header>
        <nav className="extra-class-data-tabs">
          <button type="button" className={tab === 'classes' ? 'is-active' : ''} onClick={() => setTab('classes')}>Lớp ({classes.length})</button>
          <button type="button" className={tab === 'sessions' ? 'is-active' : ''} onClick={() => setTab('sessions')}>Điểm danh đã duyệt ({sessions.length})</button>
        </nav>
        {notice ? <div className="extra-class-data-banner is-success">{notice}</div> : null}
        {error ? <div className="extra-class-data-banner is-error">{error}</div> : null}
        <main className="extra-class-data-body">
          {loading ? <div className="extra-class-data-empty">Đang tải dữ liệu…</div> : null}
          {!loading && tab === 'classes' ? classes.map((classRow) => {
            const assignedTeachers = teachersByClass.get(String(classRow.id)) || [];
            const teacherNames = assignedTeachers.map((teacher) => teacher.teacher_name).filter(Boolean);
            const memberCount = memberCountByClass.get(String(classRow.id)) || 0;
            return (
              <article key={classRow.id} className="extra-class-data-card">
                <div className="extra-class-data-card-main">
                  <div className="extra-class-data-kicker"><span>{typeLabel(classRow.class_type)}</span>{classRow.school_year ? <em>{classRow.school_year}</em> : null}</div>
                  <h3>{classRow.class_name}</h3>
                  <p><b>Môn:</b> {classRow.subject || '—'} · <b>Học sinh:</b> {memberCount}{Number.isFinite(classRow.expected_student_count) ? ` / dự kiến ${classRow.expected_student_count}` : ''}</p>
                  <p><b>Toàn bộ GV:</b> {teacherNames.length ? teacherNames.join(' · ') : (classRow.teacher_name || 'Chưa phân công')}</p>
                  {(classRow.room || classRow.weekday_text || classRow.time_text) ? <p><b>Lịch:</b> {classRow.weekday_text ? `Thứ ${classRow.weekday_text}` : '—'} · {classRow.time_text || '—'} · {classRow.room || 'Chưa ghi phòng'}{classRow.periods_per_week ? ` · ${classRow.periods_per_week} tiết/tuần` : ''}</p> : null}
                </div>
                <button type="button" className="extra-class-danger" disabled={Boolean(busyKey)} onClick={() => deleteClass(classRow)}>{busyKey === `class:${classRow.id}` ? 'Đang xóa…' : 'Xóa lớp'}</button>
              </article>
            );
          }) : null}
          {!loading && tab === 'classes' && !classes.length ? <div className="extra-class-data-empty">Chưa có lớp.</div> : null}

          {!loading && tab === 'sessions' ? sessions.map((session) => (
            <article key={session.id} className="extra-class-data-card">
              <div className="extra-class-data-card-main">
                <div className="extra-class-data-kicker"><span>{typeLabel(session.class_type)}</span><em>{formatDateTime(session.checked_at)}</em></div>
                <h3>{session.class_name}</h3>
                <p><b>Giáo viên:</b> {session.teacher_name || '—'} · <b>Kết quả:</b> {session.present_count}/{session.total_students} có mặt · {session.absent_count} vắng</p>
                {session.note ? <p><b>Ghi chú:</b> {session.note}</p> : null}
              </div>
              <button type="button" className="extra-class-danger" disabled={Boolean(busyKey)} onClick={() => deleteSession(session)}>{busyKey === `session:${session.id}` ? 'Đang xóa…' : 'Xóa buổi điểm danh'}</button>
            </article>
          )) : null}
          {!loading && tab === 'sessions' && !sessions.length ? <div className="extra-class-data-empty">Chưa có buổi điểm danh đã duyệt.</div> : null}
        </main>
      </section>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button type="button" className="extra-class-data-trigger" onClick={() => setOpen(true)} title="Xóa lớp hoặc điểm danh đã duyệt">Quản trị dữ liệu</button>
      {overlay}
    </>
  );
}

export function installExtraClassAdminDataManager() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (window.__besExtraClassAdminDataManagerObserver) return window.__besExtraClassAdminDataManagerCleanup || (() => {});

  const mount = () => {
    const actions = document.querySelector('.attendance-top-actions');
    if (!actions || actions.querySelector('[data-extra-class-admin-manager]')) return;
    const host = document.createElement('span');
    host.dataset.extraClassAdminManager = 'true';
    host.className = 'extra-class-data-host';
    const closeButton = actions.lastElementChild;
    if (closeButton) actions.insertBefore(host, closeButton);
    else actions.appendChild(host);
    createRoot(host).render(<ExtraClassAdminDataManager />);
  };

  const observer = new MutationObserver(mount);
  observer.observe(document.body, { childList: true, subtree: true });
  window.__besExtraClassAdminDataManagerObserver = observer;
  window.__besExtraClassAdminDataManagerCleanup = () => {
    observer.disconnect();
    delete window.__besExtraClassAdminDataManagerObserver;
    delete window.__besExtraClassAdminDataManagerCleanup;
  };
  mount();
  return window.__besExtraClassAdminDataManagerCleanup;
}

export default ExtraClassAdminDataManager;
