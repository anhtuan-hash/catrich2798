import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { formatDate, isLeader, readLocal, scopedLocalKey, uid, writeLocal } from './v1093/shared.js';
import { emitAutomationEvent } from '../utils/automationEngine.js';
import { recordAuditEvent } from '../utils/collaborationGovernance.js';
import {
  consumeRememberedWorkHubItem,
  formatWorkHubFileSize,
  removeWorkHubSubmissionFile,
  resolveWorkHubCommentAttachments,
  uploadWorkHubSubmissionFile,
  validateWorkHubFile,
  WORK_HUB_DELIVERY_EVENT,
} from '../utils/workHubDelivery.js';

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

function getAssigneeLabel(item, people, currentUser) {
  const assigneeId = Array.isArray(item?.assignee_ids) ? item.assignee_ids[0] : '';
  if (!assigneeId) return 'Chưa phân công';
  if (assigneeId === currentUser?.id) return currentUser?.name || currentUser?.email || 'Bạn';
  const person = people.find((entry) => entry.id === assigneeId);
  return person?.name || person?.email || 'Giáo viên';
}

function commentLabel(comment, currentUser, people) {
  if (comment.author_id === currentUser?.id) return 'Bạn';
  const person = people.find((entry) => entry.id === comment.author_id);
  return person?.name || person?.email || (comment.comment_type === 'submission' ? 'Giáo viên' : 'Người dùng');
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
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [commentsBusy, setCommentsBusy] = useState(false);
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

  const selected = items.find((item) => item.id === selectedId) || null;

  const loadComments = useCallback(async () => {
    if (!selected || !client || !runtime.session) {
      setComments([]);
      return;
    }
    setCommentsBusy(true);
    const { data, error: loadError } = await client
      .from('work_hub_comments')
      .select('*')
      .eq('item_id', selected.id)
      .order('created_at');
    if (loadError) {
      setError(loadError.message || 'Không thể tải phản hồi công việc.');
      setCommentsBusy(false);
      return;
    }
    const resolved = await resolveWorkHubCommentAttachments(data || []);
    setComments(resolved);
    setCommentsBusy(false);
  }, [client, runtime.session, selected?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('bes-v1096-automation-work-draft');
      if (!raw) return;
      const incoming = JSON.parse(raw);
      setDraft((current) => ({
        ...current,
        title: incoming.title || current.title,
        description: incoming.description || current.description,
        priority: incoming.priority || current.priority,
        due_at: incoming.due_at || current.due_at,
      }));
      sessionStorage.removeItem('bes-v1096-automation-work-draft');
      setNotice('Đã nhận bản nháp từ Automation Center.');
    } catch { /* invalid transfer is ignored */ }
  }, []);
  useEffect(() => subscribeTable({
    key: `work-hub-${currentUser?.id || 'guest'}`,
    table: 'work_hub_items',
    onChange: load,
  }), [currentUser?.id, load]);
  useEffect(() => { loadComments(); }, [loadComments]);
  useEffect(() => {
    if (!selected?.id) return () => {};
    return subscribeTable({
      key: `work-hub-comments-${selected.id}`,
      table: 'work_hub_comments',
      filter: `item_id=eq.${selected.id}`,
      onChange: loadComments,
    });
  }, [selected?.id, loadComments]);
  useEffect(() => {
    const refresh = () => {
      load();
      loadComments();
    };
    window.addEventListener(WORK_HUB_DELIVERY_EVENT, refresh);
    return () => window.removeEventListener(WORK_HUB_DELIVERY_EVENT, refresh);
  }, [load, loadComments]);
  useEffect(() => {
    if (!items.length || selectedId) return;
    const remembered = consumeRememberedWorkHubItem();
    if (remembered && items.some((item) => item.id === remembered)) setSelectedId(remembered);
  }, [items, selectedId]);
  useEffect(() => {
    setSubmissionNote('');
    setSubmissionFile(null);
  }, [selected?.id]);

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

  const selectedIsMine = Boolean(selected && Array.isArray(selected.assignee_ids) && selected.assignee_ids.includes(currentUser?.id));
  const canTeacherSubmit = Boolean(!leader && selectedIsMine && !['approved', 'completed', 'archived'].includes(selected?.status));

  async function saveItem(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setBusy(true); setError(''); setNotice('');
    const assigneeId = leader ? (draft.assignee_id || currentUser.id) : currentUser.id;
    const assignedToAnother = leader && assigneeId !== currentUser.id;
    const payload = {
      title: draft.title.trim(), description: draft.description.trim(), item_type: draft.item_type,
      status: assignedToAnother ? 'assigned' : draft.status,
      priority: draft.priority, visibility: leader ? draft.visibility : 'restricted',
      owner_id: currentUser.id, created_by: currentUser.id,
      assignee_ids: assigneeId ? [assigneeId] : [currentUser.id], watcher_ids: [],
      due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
      source_module: 'work-hub-v1133',
      metadata: { created_in: '11.3.3', notify_assignee: assignedToAnother },
    };
    try {
      let createdItem = null;
      if (client && runtime.session) {
        const { data, error: insertError } = await client.from('work_hub_items').insert(payload).select('*').single();
        if (insertError) throw insertError;
        createdItem = data;
        setItems((current) => [data, ...current]);
      } else {
        const item = { ...payload, id: uid('work'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        createdItem = item;
        const next = [item, ...items]; setItems(next); writeLocal(localKey, next);
      }
      await recordAuditEvent({ action: 'work.created', entity_type: 'work_hub_item', entity_id: createdItem?.id || '', source_module: 'work-hub', after_data: createdItem || payload }, currentUser);
      setDraft(emptyDraft(currentUser));
      setNotice(assignedToAnother
        ? 'Đã giao công việc và gửi thông báo đến tài khoản giáo viên.'
        : 'Đã tạo công việc.');
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
      await recordAuditEvent({ action: 'work.status_changed', entity_type: 'work_hub_item', entity_id: item.id, source_module: 'work-hub', before_data: item, after_data: { ...item, ...patch } }, currentUser);
      if (status === 'submitted') {
        await emitAutomationEvent('work_submitted', {
          source: 'work-hub', item_id: item.id, title: item.title,
          summary: `Sản phẩm “${item.title}” đã được nộp.`,
        }, currentUser);
      }
      setNotice(`Đã chuyển trạng thái sang “${STATUS_LABEL[status] || status}”.`);
    } catch (statusError) { setError(statusError.message || String(statusError)); }
    finally { setBusy(false); }
  }

  async function addComment(event) {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    if (!client || !runtime.session) { setNotice('Phản hồi cần kết nối Supabase.'); return; }
    setBusy(true);
    const { data, error: commentError } = await client.from('work_hub_comments')
      .insert({ item_id: selected.id, author_id: currentUser.id, body: comment.trim(), comment_type: 'comment', attachments: [] })
      .select('*').single();
    if (commentError) {
      setError(commentError.message);
    } else {
      setComments((current) => [...current, data]);
      setComment('');
      await recordAuditEvent({ action: 'work.comment_added', entity_type: 'work_hub_item', entity_id: selected.id, source_module: 'work-hub', after_data: { comment_id: data.id, body: data.body } }, currentUser);
      setNotice('Đã gửi phản hồi.');
    }
    setBusy(false);
  }

  async function submitTeacherResponse(event) {
    event.preventDefault();
    if (!selected || !canTeacherSubmit) return;
    if (!client || !runtime.session) {
      setError('Cần kết nối Supabase để nộp tệp phản hồi.');
      return;
    }
    if (!submissionFile && !submissionNote.trim()) {
      setError('Vui lòng chọn tệp hoặc nhập nội dung phản hồi.');
      return;
    }
    if (submissionFile) {
      const validation = validateWorkHubFile(submissionFile);
      if (!validation.ok) {
        setError(validation.message);
        return;
      }
    }

    setBusy(true); setError(''); setNotice('');
    let uploadedAttachment = null;
    let submissionCommitted = false;
    try {
      if (submissionFile) {
        const uploadResult = await uploadWorkHubSubmissionFile({
          file: submissionFile,
          itemId: selected.id,
          userId: currentUser.id,
        });
        if (!uploadResult.ok) throw new Error(uploadResult.message || 'Không thể tải tệp lên.');
        uploadedAttachment = uploadResult.attachment;
      }

      const body = submissionNote.trim()
        || (submissionFile ? `Đã nộp tệp phản hồi: ${submissionFile.name}` : 'Đã nộp phản hồi công việc.');
      const { data: submissionResult, error: submitError } = await client.rpc('bes_v1133_submit_work_response', {
        target_item: selected.id,
        response_body: body,
        response_attachments: uploadedAttachment ? [uploadedAttachment] : [],
      });
      if (submitError) throw submitError;
      submissionCommitted = true;
      const response = submissionResult?.comment || null;
      const updatedItem = submissionResult?.item || null;
      const resolved = response ? await resolveWorkHubCommentAttachments([response]) : [];
      if (resolved.length) setComments((current) => [...current, ...resolved]);
      if (updatedItem) setItems((current) => current.map((entry) => entry.id === selected.id ? updatedItem : entry));
      setSubmissionNote('');
      setSubmissionFile(null);
      await recordAuditEvent({
        action: 'work.response_submitted',
        entity_type: 'work_hub_item',
        entity_id: selected.id,
        source_module: 'work-hub',
        after_data: { comment_id: response.id, attachment: uploadedAttachment, status: 'submitted' },
      }, currentUser);
      await emitAutomationEvent('work_submitted', {
        source: 'work-hub', item_id: selected.id, title: selected.title,
        summary: `Giáo viên đã nộp phản hồi cho “${selected.title}”.`,
      }, currentUser);
      setNotice('Đã nộp phản hồi và gửi thông báo đến Admin/TTCM.');
    } catch (submitError) {
      if (uploadedAttachment && !submissionCommitted) await removeWorkHubSubmissionFile(uploadedAttachment);
      setError(submitError.message || String(submitError));
    } finally {
      setBusy(false);
    }
  }

  const statusOptions = leader
    ? STATUSES
    : STATUSES.filter(([value]) => ['accepted', 'in_progress'].includes(value));

  return <section className="v1093-page v1093-work-hub">
    <header className="v1093-hero v1093-hero-work">
      <div><span className="v1093-kicker">V11.3.3 · Work Delivery</span><h1>Trung tâm công việc</h1><p>Giao việc, gửi thông báo, nhận phản hồi và tệp nộp trong một luồng thống nhất.</p></div>
      <div className="v1093-runtime-pill" data-state={runtime.phase}><b>{runtime.ready ? 'Đã kết nối' : 'Đang kết nối'}</b><span>{runtime.role}</span></div>
    </header>

    {error && <div className="v1093-alert error"><b>Không thể xử lý dữ liệu</b><span>{error}</span><button onClick={() => { setError(''); load(); }}>Thử lại</button></div>}
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
          <div className="v1093-panel-heading"><div><span>Tạo nhanh</span><h2>{leader ? 'Giao công việc mới' : 'Công việc mới'}</h2></div><button type="submit" disabled={busy || !draft.title.trim()}>+ {leader ? 'Giao việc' : 'Tạo công việc'}</button></div>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Tên nhiệm vụ hoặc lịch làm việc" />
          <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Mô tả, yêu cầu và kết quả cần nộp" />
          <div className="v1093-form-grid">
            <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}><option value="low">Ưu tiên thấp</option><option value="normal">Bình thường</option><option value="high">Ưu tiên cao</option><option value="urgent">Khẩn</option></select>
            <input type="datetime-local" value={draft.due_at} onChange={(e) => setDraft({ ...draft, due_at: e.target.value })} />
            {leader && <select value={draft.assignee_id} onChange={(e) => setDraft({ ...draft, assignee_id: e.target.value })}><option value={currentUser.id}>Tự thực hiện</option>{people.filter((person) => person.id !== currentUser.id).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>}
            {leader && <select value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}><option value="restricted">Người liên quan</option><option value="department">Toàn tổ</option><option value="private">Riêng tư</option></select>}
          </div>
          {leader ? <p className="work-delivery-form-note">🔔 Khi giao cho giáo viên, hệ thống sẽ gửi thông báo trực tiếp tới tài khoản được chọn.</p> : null}
        </form>

        <section className="v1093-panel">
          <div className="v1093-panel-heading"><div><span>Hộp việc</span><h2>{filtered.length} công việc</h2></div><input className="v1093-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm công việc…" /></div>
          <div className="v1093-task-list">
            {filtered.map((item) => {
              const hasSubmission = item.status === 'submitted' || item.submitted_at;
              return <article key={item.id} className={`v1093-task-card priority-${item.priority}`} onClick={() => setSelectedId(item.id)}>
                <div className="v1093-task-top"><span className={`v1093-status status-${item.status}`}>{STATUS_LABEL[item.status] || item.status}</span><span>{PRIORITY_LABEL[item.priority] || item.priority}</span></div>
                <h3>{item.title}</h3><p>{item.description || 'Chưa có mô tả.'}</p>
                <div className="work-delivery-task-meta"><span>👤 {getAssigneeLabel(item, people, currentUser)}</span>{hasSubmission ? <span className="has-submission">📎 Đã có phản hồi</span> : null}</div>
                <footer><span>Hạn: {formatDate(item.due_at)}</span><button type="button">Mở chi tiết</button></footer>
              </article>;
            })}
            {!filtered.length && <div className="v1093-empty"><strong>Chưa có công việc phù hợp</strong><span>Tạo công việc mới hoặc đổi bộ lọc.</span></div>}
          </div>
        </section>
      </div>
    </div>

    {selected && <div className="v1093-drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedId(''); }}>
      <aside className="v1093-drawer work-delivery-drawer">
        <button className="v1093-drawer-close" onClick={() => setSelectedId('')}>×</button>
        <span className={`v1093-status status-${selected.status}`}>{STATUS_LABEL[selected.status] || selected.status}</span>
        <h2>{selected.title}</h2><p>{selected.description || 'Chưa có mô tả.'}</p>
        <dl><div><dt>Ưu tiên</dt><dd>{PRIORITY_LABEL[selected.priority]}</dd></div><div><dt>Hạn</dt><dd>{formatDate(selected.due_at)}</dd></div><div><dt>Người thực hiện</dt><dd>{getAssigneeLabel(selected, people, currentUser)}</dd></div></dl>
        <div className="v1093-status-actions">{statusOptions.map(([value, label]) => <button key={value} disabled={busy || selected.status === value} onClick={() => updateStatus(selected, value)}>{label}</button>)}</div>

        {canTeacherSubmit ? <section className="work-delivery-submission-box">
          <div className="work-delivery-submission-heading"><span>📤</span><div><strong>Nộp phản hồi công việc</strong><small>Tải tệp và gửi ghi chú trực tiếp cho Admin/TTCM.</small></div></div>
          <form onSubmit={submitTeacherResponse}>
            <label><span>Ghi chú phản hồi</span><textarea value={submissionNote} onChange={(event) => setSubmissionNote(event.target.value)} placeholder="Mô tả nội dung đã hoàn thành hoặc lưu ý cho người giao việc…" /></label>
            <label className="work-delivery-file-picker"><span>Tệp đính kèm</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.jpg,.jpeg,.png,.webp,.zip,.rar,.7z,.mp3,.wav,.mp4" onChange={(event) => setSubmissionFile(event.target.files?.[0] || null)} />{submissionFile ? <small>📎 {submissionFile.name} · {formatWorkHubFileSize(submissionFile.size)}</small> : <small>Tối đa 25 MB</small>}</label>
            <button type="submit" disabled={busy || (!submissionFile && !submissionNote.trim())}>{busy ? 'Đang nộp…' : '✓ Nộp phản hồi'}</button>
          </form>
        </section> : null}

        <section className="v1093-comments"><h3>Trao đổi và tệp nộp</h3>{commentsBusy ? <div className="work-delivery-comments-loading">Đang tải phản hồi…</div> : null}{comments.map((entry) => <article key={entry.id} className={entry.comment_type === 'submission' ? 'is-submission' : ''}>
          <header><strong>{commentLabel(entry, currentUser, people)}</strong>{entry.comment_type === 'submission' ? <span>ĐÃ NỘP</span> : null}</header>
          <p>{entry.body}</p>
          {Array.isArray(entry.attachments) && entry.attachments.length ? <div className="work-delivery-attachments">{entry.attachments.map((attachment, index) => <a key={`${entry.id}-${attachment.path || index}`} href={attachment.signed_url || '#'} target="_blank" rel="noreferrer" className={!attachment.signed_url ? 'disabled' : ''} onClick={(event) => { if (!attachment.signed_url) event.preventDefault(); }}><span>📎</span><strong>{attachment.name || 'Tệp đính kèm'}</strong><small>{formatWorkHubFileSize(attachment.size)}</small></a>)}</div> : null}
          <time>{formatDate(entry.created_at)}</time>
        </article>)}
          {!commentsBusy && !comments.length ? <div className="work-delivery-comments-empty">Chưa có phản hồi.</div> : null}
          <form onSubmit={addComment}><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Phản hồi hoặc hướng dẫn chỉnh sửa…" /><button disabled={busy || !comment.trim()}>Gửi phản hồi</button></form>
        </section>
      </aside>
    </div>}
  </section>;
}
