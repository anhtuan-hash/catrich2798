import React, { useEffect, useMemo, useState } from 'react';
import {
  listSharedRosterHistory,
  restoreSharedRosterHistory,
} from '../../utils/gradebookRosterHistory.js';
import '../../styles/GradebookLifecycle.css';

function formatTime(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function actionLabel(action) {
  if (action === 'create') return 'Khởi tạo';
  if (action === 'restore') return 'Khôi phục';
  if (action === 'seed') return 'Ảnh chụp ban đầu';
  return 'Cập nhật';
}

export default function GradebookRosterHistoryPanel({
  currentUser,
  workspace,
  canRestore = true,
  onRestored,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(0);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const latestId = useMemo(() => items[0]?.id || 0, [items]);

  const load = async () => {
    if (!workspace) return;
    setLoading(true);
    const result = await listSharedRosterHistory(currentUser, workspace, { limit: 30 });
    setLoading(false);
    if (result.ok) {
      setItems(result.items || []);
      setMessage('');
    } else {
      setItems([]);
      setMessage(result.missingTable
        ? 'Lịch sử roster chưa được kích hoạt trên Supabase.'
        : (result.message || 'Không thể tải lịch sử danh sách.'));
    }
  };

  useEffect(() => {
    setItems([]);
    setMessage('');
    setOpen(false);
  }, [workspace?.id]);

  useEffect(() => {
    if (open) load();
  }, [open, workspace?.id]);

  const restore = async (item) => {
    if (!canRestore || !item?.id || restoring) return;
    const confirmed = window.confirm(
      `Khôi phục danh sách về phiên bản ${formatTime(item.changedAt)} (${item.studentCount} học sinh)?\n\nĐiểm và ghi chú môn học không bị thay đổi.`,
    );
    if (!confirmed) return;
    setRestoring(item.id);
    const result = await restoreSharedRosterHistory(currentUser, workspace, item.id);
    setRestoring(0);
    if (!result.ok) {
      setMessage(result.message || 'Không thể khôi phục danh sách.');
      return;
    }
    setMessage('Đã khôi phục danh sách. Một snapshot mới đã được lưu vào lịch sử.');
    onRestored?.(result.workspace, result);
    await load();
  };

  return <section className="gradebook-roster-history hr-panel">
    <div className="gradebook-roster-history-head">
      <div>
        <small>AN TOÀN DỮ LIỆU · ROSTER</small>
        <h3>Lịch sử danh sách học sinh</h3>
        <p>Mỗi lần thay đổi roster cloud được lưu thành snapshot. Điểm số không nằm trong lịch sử này.</p>
      </div>
      <button type="button" className="secondary" onClick={() => setOpen((value) => !value)}>
        {open ? 'Ẩn lịch sử' : 'Xem lịch sử'}
      </button>
    </div>

    {open ? <div className="gradebook-roster-history-body">
      {loading ? <p className="gradebook-roster-history-empty">Đang tải lịch sử…</p> : null}
      {!loading && message ? <p className="gradebook-roster-history-message">{message}</p> : null}
      {!loading && !message && !items.length ? <p className="gradebook-roster-history-empty">Chưa có snapshot lịch sử.</p> : null}
      {!loading && items.length ? <div className="gradebook-roster-history-list">
        {items.map((item) => <article key={item.id}>
          <div>
            <b>{actionLabel(item.action)}</b>
            <span>{formatTime(item.changedAt)} · {item.studentCount} học sinh</span>
          </div>
          <button
            type="button"
            className="secondary"
            disabled={!canRestore || restoring || item.id === latestId}
            title={!canRestore ? 'Phân công không còn hiệu lực nên roster chỉ đọc.' : ''}
            onClick={() => restore(item)}
          >
            {restoring === item.id ? 'Đang khôi phục…' : item.id === latestId ? 'Hiện tại' : 'Khôi phục'}
          </button>
        </article>)}
      </div> : null}
    </div> : null}
  </section>;
}
