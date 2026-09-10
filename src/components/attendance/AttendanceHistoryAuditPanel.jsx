import React, { useEffect, useMemo, useState } from 'react';
import { attendanceAuditForSession, describeAttendanceAuditItem } from '../../utils/attendanceAuditActors.js';
import './AttendanceHistoryAuditPanel.css';

const CHANGE_COLUMNS = 'id,session_id,record_id,class_id,member_key,student_full_name,change_kind,changed_by,changed_by_name,changed_at,old_status,new_status,old_absence_reason_code,new_absence_reason_code,old_absence_note,new_absence_note,session_note_before,session_note_after';
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

export default function AttendanceHistoryAuditPanel({ client, session }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setChanges([]);
    setError('');
    if (!client || !session?.id) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    client.from('bes_extra_attendance_record_changes')
      .select(CHANGE_COLUMNS)
      .eq('session_id', session.id)
      .order('changed_at', { ascending: true })
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        setLoading(false);
        if (queryError) {
          setError(queryError.message || 'Không thể tải nhật ký điều chỉnh.');
          return;
        }
        setChanges(data || []);
      });

    return () => { cancelled = true; };
  }, [client, session?.id]);

  const audit = useMemo(() => attendanceAuditForSession(changes, session?.id), [changes, session?.id]);
  const teacher = session?.session_status === 'cancelled' ? '—' : (session?.teacher_name || 'Chưa ghi giáo viên');
  const checkActor = String(session?.checked_by_name || '').trim() || String(session?.checked_by || '').trim() || 'Chưa xác định';
  const latestText = audit.latest_changed_by_name
    ? `${audit.latest_changed_by_name} · ${formatDateTime(audit.latest_changed_at)}`
    : 'Chưa có điều chỉnh';

  return (
    <section className={`ahv3__audit-actor-panel${loading ? ' is-loading' : ''}`} aria-label="Nhật ký người thao tác">
      <header className="ahv3__audit-actor-head">
        <div><strong>Nhật ký người thao tác</strong><span>Tách riêng giáo viên dạy, người điểm danh và người điều chỉnh.</span></div>
      </header>

      {loading ? <div className="ahv3__audit-loading">Đang tải thông tin người thao tác…</div> : null}
      {!loading ? (
        <>
          <div className="ahv3__audit-grid">
            <article><span>Giáo viên dạy</span><b>{teacher}</b></article>
            <article><span>Người thực hiện điểm danh</span><b>{checkActor}</b><small>{formatDateTime(session?.checked_at)}</small></article>
            <article><span>Điều chỉnh gần nhất</span><b>{latestText}</b></article>
            <article><span>Đã điều chỉnh</span><b>{audit.change_count} lần</b></article>
          </div>

          {error ? <div className="ahv3__audit-error">Không thể tải nhật ký điều chỉnh: {error}</div> : null}
          {!error && audit.events.length ? (
            <details className="ahv3__audit-history">
              <summary>Xem lịch sử điều chỉnh</summary>
              <div>
                {audit.events.map((event, index) => (
                  <article className="ahv3__audit-event" key={event.key}>
                    <header><b>Lần {index + 1} · {event.changed_by_name}</b><time>{formatDateTime(event.changed_at)}</time></header>
                    <ul>{event.items.map((item) => <li key={item.id}>{describeAttendanceAuditItem(item)}</li>)}</ul>
                  </article>
                ))}
              </div>
            </details>
          ) : null}
          {!error && !audit.events.length ? <div className="ahv3__audit-empty">Buổi này chưa từng điều chỉnh sau khi chốt.</div> : null}
        </>
      ) : null}
    </section>
  );
}
