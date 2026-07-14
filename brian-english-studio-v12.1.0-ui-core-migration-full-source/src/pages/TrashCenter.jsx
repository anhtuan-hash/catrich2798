import React, { useEffect, useMemo, useState } from 'react';
import { TRASH_EVENT, clearTrash, listTrash, removeTrashRecord } from '../utils/trash.js';
import { readList, writeList } from '../utils/library.js';

function remainingDays(expiresAt) {
  return Math.max(0, Math.ceil((Number(expiresAt || 0) - Date.now()) / 86400000));
}

export default function TrashCenter({ language = 'vi' }) {
  const [items, setItems] = useState(() => listTrash());
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => setItems(listTrash());
    window.addEventListener(TRASH_EVENT, refresh);
    return () => window.removeEventListener(TRASH_EVENT, refresh);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.title} ${item.kind} ${item.source}`.toLowerCase().includes(q));
  }, [items, query]);

  const restore = (record) => {
    const data = record?.restoreData;
    if (data?.type === 'library' && data?.key && data?.item) {
      const current = readList(data.key);
      writeList(data.key, [data.item, ...current.filter((item) => item?.id !== data.item.id)]);
      removeTrashRecord(record.id);
      setMessage(language === 'vi' ? `Đã khôi phục “${record.title}”.` : `Restored “${record.title}”.`);
      setItems(listTrash());
      return;
    }
    if (data?.eventName) {
      window.dispatchEvent(new CustomEvent(data.eventName, { detail: data.payload || record.payload }));
      removeTrashRecord(record.id);
      setItems(listTrash());
      return;
    }
    setMessage(language === 'vi' ? 'Mục này chưa có bộ khôi phục tự động. Có thể tải báo cáo từ Trung tâm trạng thái.' : 'This item has no automatic restore adapter yet.');
  };

  return (
    <div className="page bes-trash-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="bes-trash-hero">
        <div>
          <span>RECOVERY · 30 DAYS</span>
          <h1>{language === 'vi' ? 'Thùng rác hệ thống' : 'System Trash'}</h1>
          <p>{language === 'vi' ? 'Các mục đã xóa được giữ trong 30 ngày trước khi tự động xóa vĩnh viễn.' : 'Deleted items remain available for 30 days before permanent removal.'}</p>
        </div>
        <div><strong>{items.length}</strong><span>{language === 'vi' ? 'mục có thể khôi phục' : 'recoverable items'}</span></div>
      </section>

      <section className="bes-trash-toolbar">
        <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'vi' ? 'Tìm trong thùng rác…' : 'Search trash…'} /></label>
        <button type="button" className="danger" disabled={!items.length} onClick={() => {
          if (window.confirm(language === 'vi' ? 'Xóa vĩnh viễn toàn bộ thùng rác?' : 'Permanently clear all trash?')) { clearTrash(); setItems([]); }
        }}>{language === 'vi' ? 'Xóa vĩnh viễn tất cả' : 'Empty trash'}</button>
      </section>

      {message ? <div className="bes-trash-message">{message}<button type="button" onClick={() => setMessage('')}>×</button></div> : null}

      <section className="bes-trash-list">
        {filtered.length ? filtered.map((item) => (
          <article key={item.id}>
            <span className="bes-trash-kind">{String(item.kind || 'item').slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.source} · {new Date(item.deletedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} · {remainingDays(item.expiresAt)} {language === 'vi' ? 'ngày còn lại' : 'days left'}</small>
            </div>
            <button type="button" className="primary" onClick={() => restore(item)}>{language === 'vi' ? 'Khôi phục' : 'Restore'}</button>
            <button type="button" onClick={() => { removeTrashRecord(item.id); setItems(listTrash()); }}>{language === 'vi' ? 'Xóa vĩnh viễn' : 'Delete forever'}</button>
          </article>
        )) : (
          <div className="bes-trash-empty"><span>✓</span><h2>{language === 'vi' ? 'Thùng rác đang trống' : 'Trash is empty'}</h2><p>{language === 'vi' ? 'Những mục có hỗ trợ hoàn tác sẽ xuất hiện tại đây.' : 'Items that support undo will appear here.'}</p></div>
        )}
      </section>
    </div>
  );
}
