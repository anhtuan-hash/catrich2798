import React, { useMemo, useState } from 'react';
import './AttendanceArchive.css';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN');
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function fold(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function requestLabel(status) {
  if (status === 'pending') return 'Đang chờ Admin duyệt';
  if (status === 'approved') return 'Admin đã duyệt · chờ hoàn tất xóa';
  if (status === 'rejected') return 'Admin đã từ chối yêu cầu xóa';
  return 'Chưa yêu cầu xóa vĩnh viễn';
}

export default function AttendanceArchivePanel({
  items = [],
  loading = false,
  busy = false,
  isAdmin = false,
  onRefresh,
  onRestore,
  onRequestDelete,
  onApproveDelete,
  onRejectDelete,
}) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [requestStatus, setRequestStatus] = useState('all');

  const filtered = useMemo(() => items.filter((item) => {
    if (source !== 'all' && item.source_type !== source) return false;
    if (requestStatus !== 'all' && item.delete_request_status !== requestStatus) return false;
    if (!query.trim()) return true;
    return fold(`${item.class_name} ${item.subject} ${item.teacher_name} ${item.archived_by_name}`).includes(fold(query));
  }), [items, query, source, requestStatus]);

  const pendingCount = items.filter((item) => item.delete_request_status === 'pending').length;
  const approvedCount = items.filter((item) => item.delete_request_status === 'approved').length;

  return (
    <section className="attendance-archive" aria-label="Kho lưu trữ điểm danh">
      <header className="attendance-archive__hero">
        <div>
          <span className="attendance-archive__eyebrow">AN TOÀN DỮ LIỆU</span>
          <h2>Kho lưu trữ điểm danh</h2>
          <p>Buổi điểm danh bị xóa lần đầu sẽ nằm ở đây, không xuất hiện trong Lịch sử/Báo cáo và vẫn có thể khôi phục.</p>
        </div>
        <div className="attendance-archive__stats" aria-label="Thống kê kho lưu trữ">
          <strong>{items.length}</strong><span>đang lưu trữ</span>
          {isAdmin && pendingCount > 0 ? <em>{pendingCount} chờ duyệt xóa</em> : null}
          {isAdmin && approvedCount > 0 ? <em>{approvedCount} chờ hoàn tất xóa</em> : null}
        </div>
      </header>

      <div className="attendance-archive__toolbar" data-bes-keep-search="true">
        <label className="attendance-archive__search">
          <span>Tìm trong kho</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên lớp, môn, giáo viên…" />
        </label>
        <label><span>Nguồn</span><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Tất cả</option><option value="extra">Phụ đạo / Bồi dưỡng</option><option value="supplemental">Học bổ sung</option></select></label>
        <label><span>Trạng thái xóa</span><select value={requestStatus} onChange={(event) => setRequestStatus(event.target.value)}><option value="all">Tất cả</option><option value="none">Chưa yêu cầu</option><option value="pending">Chờ duyệt</option><option value="approved">Chờ hoàn tất</option><option value="rejected">Đã từ chối</option></select></label>
        <button type="button" className="attendance-archive__refresh" disabled={busy || loading} onClick={onRefresh}>Làm mới</button>
      </div>

      {loading ? <div className="attendance-archive__empty">Đang tải Kho lưu trữ…</div> : null}
      {!loading && !filtered.length ? (
        <div className="attendance-archive__empty">
          <strong>{items.length ? 'Không có mục phù hợp bộ lọc.' : 'Kho lưu trữ đang trống.'}</strong>
          <span>{items.length ? 'Hãy thay đổi từ khóa hoặc bộ lọc.' : 'Các buổi điểm danh được lưu trữ sẽ xuất hiện tại đây.'}</span>
        </div>
      ) : null}

      {!loading && filtered.length ? <div className="attendance-archive__list">{filtered.map((item) => {
        const pending = item.delete_request_status === 'pending';
        const approved = item.delete_request_status === 'approved';
        const rejected = item.delete_request_status === 'rejected';
        return (
          <article key={item.archive_id} className={`attendance-archive__card ${pending || approved ? 'is-pending' : ''} ${rejected ? 'is-rejected' : ''}`}>
            <div className="attendance-archive__card-main">
              <div className="attendance-archive__card-title">
                <span className={`attendance-archive__source is-${item.source_type}`}>{item.source_type === 'supplemental' ? 'Học bổ sung' : 'Điểm danh lớp'}</span>
                <h3>{item.class_name || 'Buổi điểm danh'}</h3>
              </div>
              <div className="attendance-archive__meta">
                <span><b>Ngày học</b>{formatDate(item.attendance_date)}</span>
                <span><b>Giáo viên</b>{item.teacher_name || '—'}</span>
                <span><b>Môn</b>{item.subject || '—'}</span>
                <span><b>Lưu trữ lúc</b>{formatDateTime(item.archived_at)}</span>
              </div>
              <div className={`attendance-archive__request-state is-${item.delete_request_status || 'none'}`}>
                <strong>{requestLabel(item.delete_request_status)}</strong>
                {pending && item.delete_request_reason ? <span>Lý do: {item.delete_request_reason}</span> : null}
                {approved && item.delete_review_note ? <span>Ghi chú Admin: {item.delete_review_note}</span> : null}
                {rejected && item.delete_review_note ? <span>Phản hồi Admin: {item.delete_review_note}</span> : null}
              </div>
            </div>

            <div className="attendance-archive__actions">
              {!approved ? <button type="button" className="is-restore" disabled={busy} onClick={() => onRestore?.(item)}>Khôi phục</button> : null}
              {!pending && !approved ? <button type="button" className="is-request" disabled={busy} onClick={() => onRequestDelete?.(item)}>{rejected ? 'Gửi lại yêu cầu xóa' : 'Yêu cầu xóa vĩnh viễn'}</button> : null}
              {isAdmin && pending ? <>
                <button type="button" className="is-reject" disabled={busy} onClick={() => onRejectDelete?.(item)}>Từ chối</button>
                <button type="button" className="is-approve" disabled={busy} onClick={() => onApproveDelete?.(item)}>Duyệt xóa vĩnh viễn</button>
              </> : null}
              {isAdmin && approved ? <button type="button" className="is-approve" disabled={busy} onClick={() => onApproveDelete?.(item)}>Hoàn tất xóa vĩnh viễn</button> : null}
            </div>
          </article>
        );
      })}</div> : null}
    </section>
  );
}
