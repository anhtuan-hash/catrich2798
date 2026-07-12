import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { formatDate, isLeader, readLocal, scopedLocalKey, uid, writeLocal } from './v1093/shared.js';

const STATUSES = [
  ['draft', 'Nháp'], ['assigned', 'Đã giao'], ['accepted', 'Đã tiếp nhận'],
  ['in_progress', 'Đang thực hiện'], ['submitted', 'Đã nộp'],
  ['changes_requested', 'Cần chỉnh sửa'], ['approved', 'Đã phê duyệt'],
  ['completed', 'Hoàn thành'], ['archived', 'Lưu trữ'],
];
const STATUS_LABEL = Object.fromEntries(STATUSES);
const PRIORITY_LABEL = { low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn' };

function emptyDraft(user) {
  return {
    title: '', description: '', item_type: 'task', status: 'draft', priority: 'normal',
    visibility: 'restricted', due_at: '', assignee_id: user?.id || '',
  };
}

export default function WorkHub({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isLeader(currentUser);
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [comments, setComments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(() => emptyDraft(currentUser));
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const localKey = scopedLocalKey('bes-work-hub-v1093-local', currentUser);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setError('');
    if (!client || !runtime.ready || !runtime.session) {
      setItems(readLocal(localKey, []));
      return;
    }
    const { data, error: loadError } = await client
      .from('work_hub_items')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(300);
    if (loadError) {
      setError(loadError.message || 'Không thể tải Trung tâm công việc.');
      setItems(readLocal(localKey, []));
      return;
    }
    setItems(data || []);
    writeLocal(localKey, data || []);

    if (leader) {
      const { data: profiles } = await client.from('profiles').select('*').limit(500);
      setPeople((profiles || []).map((profile) => ({
        id: profile.id || profile.user_id || profile.profile_id,
        name: profile.full_name || profile.name || profile.email || 'Giáo viên',
        email: profile.email || '',
        role: profile.role || 'teacher',
      })).filter((person) => person.id));
    }
  }, [client, currentUser, leader, localKey, runtime.ready, runtime.session]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeTable({ key: `work-hub-${currentUser?.id || 'guest'}`, table: 'work_hub_items', onChange: load }), [currentUser?.id, load]);

  const selected = items.find((item) => item.id === selectedId) || null;
  useEffect(() => {
    if (!selected || !client || !runtime.session) { setComments([]); return; }
    client.from('work_hub_comments').select('*').eq('item_id', selected.id).order('created_at')
      .then(({ data }) => setComments(data || []));
  }, [client, runtime.session, selected?.id]);

  const filtered = useMemo(() => items.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false;
    const haystack = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [items, filter, query]);

  const counts = useMemo(() => ({
    active: items.filter((item) => !['completed', 'archived', 'cancelled'].includes(item.status)).length,
    dueSoon: items.filter((item) => item.due_at && new Date(item.due_at).getTime() - Date.now() < 3 * 86400000 && new Date(item.due_at) > new Date()).length,
    overdue: items.filter((item) => item.due_at && new Date(item.due_at) < new Date() && !['completed', 'archived', 'approved'].includes(item.status)).length,
    review: items.filter((item) => ['submitted', 'changes_requested'].includes(item.status)).length,
  }), [items]);

  async function saveItem(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setBusy(true); setError(''); setNotice('');
    const assigneeId = leader ? (draft.assignee_id || currentUser.id) : currentUser.id;
    const payload = {
      title: draft.title.trim(), description: draft.description.trim(), item_type: draft.item_type,
      status: leader && assigneeId !== currentUser.id ? 'assigned' : draft.status,
      priority: draft.priority, visibility: leader ? draft.visibility : 'restricted',
      owner_id: currentUser.id, created_by: currentUser.id,
      assignee_ids: assigneeId ? [assigneeId] : [currentUser.id], watcher_ids: [],
      due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
      source_module: 'work-hub-v1093', metadata: { created_in: '10.93.0' },
    };
    try {
      if (client && runtime.session) {
        const { data, error: insertError } = await client.from('work_hub_items').insert(payload).select('*').single();
        if (insertError) throw insertError;
        setItems((current) => [data, ...current]);
      } else {
        const item = { ...payload, id: uid('work'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        const next = [item, ...items]; setItems(next); writeLocal(localKey, next);
      }
      setDraft(emptyDraft(currentUser));
      setNotice('Đã tạo công việc.');
    } catch (saveError) { setError(saveError.message || String(saveError)); }
    finally { setBusy(false); }
  }

  async function updateStatus(item, status) {
    setBusy(true); setError('');
    const patch = { status, updated_at: new Date().toISOString() };
    if (status === 'submitted') patch.submitted_at = new Date().toISOString();
    if (status === 'approved') patch.reviewed_at = new Date().toISOString();
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    try {
      if (client && runtime.session) {
        const { data, error: updateError } = await client.from('work_hub_items').update(patch).eq('id', item.id).select('*').single();
        if (updateError) throw updateError;
        setItems((current) => current.map((entry) => entry.id === item.id ? data : entry));
      } else {
        const next = items.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry);
        setItems(next); writeLocal(localKey, next);
      }
    } catch (statusError) { setError(statusError.message || String(statusError)); }
    finally { setBusy(false); }
  }

  async function addComment(event) {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    if (!client || !runtime.session) { setNotice('Bình luận cần kết nối Supabase.'); return; }
    setBusy(true);
    const { data, error: commentError } = await client.from('work_hub_comments')
      .insert({ item_id: selected.id, author_id: currentUser.id, body: comment.trim(), comment_type: 'comment' })
      .select('*').single();
    if (commentError) setError(commentError.message); else { setComments((current) => [...current, data]); setComment(''); }
    setBusy(false);
  }

  const statusOptions = leader
    ? STATUSES
    : STATUSES.filter(([value]) => ['accepted', 'in_progress', 'submitted', 'completed'].includes(value));

  return <section className="v1093-page v1093-work-hub">
    <header className="v1093-hero v1093-hero-work">
      <div><span className="v1093-kicker">V10.93 · Runtime Core</span><h1>Trung tâm công việc</h1><p>Nhiệm vụ, lịch, phản hồi và phê duyệt trong một luồng thống nhất.</p></div>
      <div className="v1093-runtime-pill" data-state={runtime.phase}><b>{runtime.ready ? 'Đã kết nối' : 'Đang kết nối'}</b><span>{runtime.role}</span></div>
    </header>

    {error && <div className="v1093-alert error"><b>Không thể tải dữ liệu</b><span>{error}</span><button onClick={load}>Thử lại</button></div>}
    {notice && <div className="v1093-alert success">{notice}</div>}

    <div className="v1093-metrics">
      <article><strong>{counts.active}</strong><span>Đang hoạt động</span></article>
      <article><strong>{counts.dueSoon}</strong><span>Sắp đến hạn</span></article>
      <article><strong>{counts.overdue}</strong><span>Quá hạn</span></article>
      <article><strong>{counts.review}</strong><span>Chờ xử lý</span></article>
    </div>

    <div className="v1093-work-layout">
      <aside className="v1093-sidebar-card">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tất cả <span>{items.length}</span></button>
        {STATUSES.map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}<span>{items.filter((item) => item.status === value).length}</span></button>)}
      </aside>

      <div className="v1093-main-column">
        <form className="v1093-panel v1093-create-form" onSubmit={saveItem}>
          <div className="v1093-panel-heading"><div><span>Tạo nhanh</span><h2>Công việc mới</h2></div><button type="submit" disabled={busy || !draft.title.trim()}>+ Tạo công việc</button></div>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Tên nhiệm vụ hoặc lịch làm việc" />
          <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Mô tả, yêu cầu và kết quả cần nộp" />
          <div className="v1093-form-grid">
            <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}><option value="low">Ưu tiên thấp</option><option value="normal">Bình thường</option><option value="high">Ưu tiên cao</option><option value="urgent">Khẩn</option></select>
            <input type="datetime-local" value={draft.due_at} onChange={(e) => setDraft({ ...draft, due_at: e.target.value })} />
            {leader && <select value={draft.assignee_id} onChange={(e) => setDraft({ ...draft, assignee_id: e.target.value })}><option value={currentUser.id}>Tự thực hiện</option>{people.filter((person) => person.id !== currentUser.id).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>}
            {leader && <select value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}><option value="restricted">Người liên quan</option><option value="department">Toàn tổ</option><option value="private">Riêng tư</option></select>}
          </div>
        </form>

        <section className="v1093-panel">
          <div className="v1093-panel-heading"><div><span>Hộp việc</span><h2>{filtered.length} công việc</h2></div><input className="v1093-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm công việc…" /></div>
          <div className="v1093-task-list">
            {filtered.map((item) => <article key={item.id} className={`v1093-task-card priority-${item.priority}`} onClick={() => setSelectedId(item.id)}>
              <div className="v1093-task-top"><span className={`v1093-status status-${item.status}`}>{STATUS_LABEL[item.status] || item.status}</span><span>{PRIORITY_LABEL[item.priority] || item.priority}</span></div>
              <h3>{item.title}</h3><p>{item.description || 'Chưa có mô tả.'}</p>
              <footer><span>Hạn: {formatDate(item.due_at)}</span><button type="button">Mở chi tiết</button></footer>
            </article>)}
            {!filtered.length && <div className="v1093-empty"><strong>Chưa có công việc phù hợp</strong><span>Tạo công việc mới hoặc đổi bộ lọc.</span></div>}
          </div>
        </section>
      </div>
    </div>

    {selected && <div className="v1093-drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedId(''); }}>
      <aside className="v1093-drawer">
        <button className="v1093-drawer-close" onClick={() => setSelectedId('')}>×</button>
        <span className={`v1093-status status-${selected.status}`}>{STATUS_LABEL[selected.status] || selected.status}</span>
        <h2>{selected.title}</h2><p>{selected.description || 'Chưa có mô tả.'}</p>
        <dl><div><dt>Ưu tiên</dt><dd>{PRIORITY_LABEL[selected.priority]}</dd></div><div><dt>Hạn</dt><dd>{formatDate(selected.due_at)}</dd></div><div><dt>Cập nhật</dt><dd>{formatDate(selected.updated_at)}</dd></div></dl>
        <div className="v1093-status-actions">{statusOptions.map(([value, label]) => <button key={value} disabled={busy || selected.status === value} onClick={() => updateStatus(selected, value)}>{label}</button>)}</div>
        <section className="v1093-comments"><h3>Trao đổi</h3>{comments.map((entry) => <article key={entry.id}><p>{entry.body}</p><time>{formatDate(entry.created_at)}</time></article>)}
          <form onSubmit={addComment}><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Phản hồi hoặc hướng dẫn chỉnh sửa…" /><button disabled={busy || !comment.trim()}>Gửi phản hồi</button></form>
        </section>
      </aside>
    </div>}
  </section>;
}
