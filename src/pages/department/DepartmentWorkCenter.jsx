import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../../services/runtime/core.js';
import { useRuntimeCore } from '../../services/runtime/useRuntimeCore.js';
import { isLeader, readLocal, scopedLocalKey, uid, writeLocal } from '../v1093/shared.js';
import { recordAuditEvent } from '../../utils/collaborationGovernance.js';
import {
  formatWorkHubFileSize,
  removeWorkHubSubmissionFile,
  removeWorkHubSubmissionFiles,
  resolveWorkHubCommentAttachments,
  uploadWorkHubSubmissionFile,
  validateWorkHubFile,
  WORK_HUB_DELIVERY_EVENT,
} from '../../utils/workHubDelivery.js';
import {
  archiveWorkHubAttachmentToResourceLibrary,
  createWorkHubArchiveDraft,
} from '../../utils/workHubResourceArchive.js';
import DepartmentIcon from './DepartmentIcons.jsx';

const STATUS_LABEL = {
  draft: 'Nháp',
  assigned: 'Đã giao',
  accepted: 'Đã tiếp nhận',
  in_progress: 'Đang thực hiện',
  submitted: 'Đã nộp',
  changes_requested: 'Cần chỉnh sửa',
  approved: 'Đã phê duyệt',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

const PRIORITY_LABEL = { low: 'Thấp', normal: 'Bình thường', high: 'Cao', urgent: 'Khẩn' };
const FILTERS = [
  ['all', 'Tất cả'],
  ['active', 'Đang thực hiện'],
  ['submitted', 'Đã nộp'],
  ['changes_requested', 'Cần chỉnh sửa'],
  ['approved', 'Đã phê duyệt'],
  ['overdue', 'Quá hạn'],
];
const EXCLUDED_ROLES = new Set(['student', 'learner', 'pupil', 'parent', 'guardian', 'guest', 'admin', 'administrator']);

function emptyDraft() {
  return {
    title: '',
    description: '',
    item_type: 'task',
    status: 'draft',
    priority: 'normal',
    visibility: 'restricted',
    due_at: '',
    assignment_scope: 'self',
    assignee_ids: [],
    required_evidence: '',
  };
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function uniqueIds(values = []) {
  return [...new Set((values || []).filter(Boolean).map(String))];
}

function isClosed(item) {
  return ['approved', 'completed', 'archived', 'cancelled'].includes(item?.status);
}

function isOverdue(item) {
  return Boolean(item?.due_at && new Date(item.due_at).getTime() < Date.now() && !isClosed(item));
}

function matchesFilter(item, filter) {
  if (filter === 'all') return true;
  if (filter === 'active') return ['draft', 'assigned', 'accepted', 'in_progress'].includes(item.status) && !isOverdue(item);
  if (filter === 'overdue') return isOverdue(item);
  if (filter === 'approved') return ['approved', 'completed', 'archived'].includes(item.status);
  return item.status === filter;
}

function personName(person) {
  return person?.name || person?.email || 'Giáo viên';
}

function initials(value) {
  const parts = String(value || 'BE').trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join('') || 'BE';
}

function formatDue(value) {
  if (!value) return 'Chưa đặt hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function assigneeLabel(item, people, currentUser) {
  const ids = uniqueIds(item?.assignee_ids);
  if (!ids.length) return 'Chưa phân công';
  const names = ids.map((id) => {
    if (id === currentUser?.id) return currentUser?.name || currentUser?.email || 'Bạn';
    return personName(people.find((person) => String(person.id) === String(id)));
  });
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
}

export default function DepartmentWorkCenter({
  currentUser,
  schoolYear = '2026-2027',
  semester = 'Học kỳ I',
  globalQuery = '',
  createSignal = 0,
  onSummaryChange,
}) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isLeader(currentUser);
  const localStorageKey = scopedLocalKey('bes-department-work-rebuild', currentUser);

  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [comments, setComments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [detailTab, setDetailTab] = useState('details');
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [comment, setComment] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [commentsBusy, setCommentsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!currentUser) return;
    setError('');
    if (!client || !runtime.ready || !runtime.session) {
      setItems(readLocal(localStorageKey, []));
      return;
    }

    const { data, error: loadError } = await client
      .from('work_hub_items')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (loadError) {
      setError(loadError.message || 'Không thể tải công việc.');
      setItems(readLocal(localStorageKey, []));
      return;
    }

    setItems(data || []);
    writeLocal(localStorageKey, data || []);

    if (leader) {
      const { data: profiles } = await client.from('profiles').select('*').limit(500);
      setPeople((profiles || []).map((profile) => ({
        id: profile.id || profile.user_id || profile.profile_id,
        name: profile.full_name || profile.name || profile.email || 'Giáo viên',
        email: profile.email || '',
        role: profile.role || 'teacher',
      })).filter((person) => person.id));
    }
  }, [client, currentUser, leader, localStorageKey, runtime.ready, runtime.session]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeTable({
    key: `department-rebuild-work-${currentUser?.id || 'guest'}`,
    table: 'work_hub_items',
    onChange: load,
  }), [currentUser?.id, load]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener(WORK_HUB_DELIVERY_EVENT, refresh);
    return () => window.removeEventListener(WORK_HUB_DELIVERY_EVENT, refresh);
  }, [load]);
  useEffect(() => { if (createSignal) setCreateOpen(true); }, [createSignal]);

  const eligibleTeachers = useMemo(() => people.filter((person) => (
    person?.id
    && String(person.id) !== String(currentUser?.id)
    && !EXCLUDED_ROLES.has(normalizeRole(person.role))
  )), [currentUser?.id, people]);

  const visibleTeachers = useMemo(() => {
    const needle = assigneeQuery.trim().toLowerCase();
    if (!needle) return eligibleTeachers;
    return eligibleTeachers.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(needle));
  }, [assigneeQuery, eligibleTeachers]);

  const targetIds = useMemo(() => {
    if (!leader || draft.assignment_scope === 'self') return currentUser?.id ? [currentUser.id] : [];
    if (draft.assignment_scope === 'department') return uniqueIds(eligibleTeachers.map((person) => person.id));
    return uniqueIds(draft.assignee_ids);
  }, [currentUser?.id, draft.assignment_scope, draft.assignee_ids, eligibleTeachers, leader]);

  const selected = items.find((item) => String(item.id) === String(selectedId)) || null;

  const loadComments = useCallback(async () => {
    if (!selected || !client || !runtime.session) {
      setComments([]);
      return;
    }
    setCommentsBusy(true);
    const { data, error: commentsError } = await client
      .from('work_hub_comments')
      .select('*')
      .eq('item_id', selected.id)
      .order('created_at');
    if (commentsError) setError(commentsError.message || 'Không thể tải trao đổi.');
    else setComments(await resolveWorkHubCommentAttachments(data || []));
    setCommentsBusy(false);
  }, [client, runtime.session, selected?.id]);

  useEffect(() => { loadComments(); }, [loadComments]);
  useEffect(() => {
    if (!selected?.id) return undefined;
    return subscribeTable({
      key: `department-rebuild-comments-${selected.id}`,
      table: 'work_hub_comments',
      filter: `item_id=eq.${selected.id}`,
      onChange: loadComments,
    });
  }, [loadComments, selected?.id]);

  useEffect(() => {
    setDetailTab('details');
    setComment('');
    setSubmissionNote('');
    setSubmissionFile(null);
  }, [selected?.id]);

  const summary = useMemo(() => ({
    total: items.length,
    active: items.filter((item) => !isClosed(item)).length,
    dueSoon: items.filter((item) => item.due_at && new Date(item.due_at).getTime() > Date.now() && new Date(item.due_at).getTime() - Date.now() < 3 * 86400000).length,
    overdue: items.filter(isOverdue).length,
    review: items.filter((item) => ['submitted', 'changes_requested'].includes(item.status)).length,
    approved: items.filter((item) => ['approved', 'completed', 'archived'].includes(item.status)).length,
  }), [items]);

  useEffect(() => { onSummaryChange?.(summary); }, [onSummaryChange, summary]);

  const combinedQuery = `${globalQuery || ''} ${query || ''}`.trim().toLowerCase();
  const filtered = useMemo(() => items.filter((item) => {
    if (!matchesFilter(item, filter)) return false;
    if (!combinedQuery) return true;
    return `${item.title || ''} ${item.description || ''} ${assigneeLabel(item, people, currentUser)}`
      .toLowerCase()
      .includes(combinedQuery);
  }), [combinedQuery, currentUser, filter, items, people]);

  const selectedIsMine = Boolean(selected && uniqueIds(selected.assignee_ids).includes(String(currentUser?.id)));
  const canTeacherSubmit = Boolean(!leader && selectedIsMine && !isClosed(selected));
  const submissions = comments.filter((entry) => entry.comment_type === 'submission' || (entry.attachments || []).length);
  const discussions = comments.filter((entry) => entry.comment_type !== 'submission');

  function toggleAssignee(id) {
    setDraft((current) => {
      const ids = uniqueIds(current.assignee_ids);
      return {
        ...current,
        assignment_scope: 'selected',
        assignee_ids: ids.includes(String(id)) ? ids.filter((value) => value !== String(id)) : [...ids, String(id)],
      };
    });
  }

  async function createTask(event) {
    event.preventDefault();
    if (!draft.title.trim()) return setError('Nhập tên công việc.');
    if (!targetIds.length) return setError('Chọn ít nhất một giáo viên nhận việc.');

    setBusy(true);
    setError('');
    const batchId = targetIds.length > 1 ? uid('department-batch') : '';
    const payloads = targetIds.map((assigneeId, index) => ({
      title: draft.title.trim(),
      description: draft.description.trim(),
      item_type: draft.item_type,
      status: leader && String(assigneeId) !== String(currentUser.id) ? 'assigned' : draft.status,
      priority: draft.priority,
      visibility: draft.assignment_scope === 'department' ? 'department' : draft.visibility,
      owner_id: currentUser.id,
      created_by: currentUser.id,
      assignee_ids: [assigneeId],
      watcher_ids: [],
      due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
      source_module: 'department-workspace-rebuild',
      metadata: {
        source: 'department',
        school_year: schoolYear,
        semester,
        required_evidence: draft.required_evidence.trim(),
        assignment_scope: draft.assignment_scope,
        assignment_batch_id: batchId || null,
        assignment_batch_size: targetIds.length,
        assignment_batch_index: index + 1,
      },
    }));

    try {
      let created;
      if (client && runtime.session) {
        const { data, error: saveError } = await client.from('work_hub_items').insert(payloads).select('*');
        if (saveError) throw saveError;
        created = data || [];
      } else {
        created = payloads.map((payload) => ({
          ...payload,
          id: uid('department-work'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        writeLocal(localStorageKey, [...created, ...items]);
      }
      setItems((current) => [...created, ...current]);
      await recordAuditEvent({
        action: targetIds.length > 1 ? 'work.bulk_created' : 'work.created',
        entity_type: 'work_hub_item',
        entity_id: batchId || created[0]?.id || '',
        source_module: 'department',
        after_data: { item_ids: created.map((item) => item.id), assignee_ids: targetIds },
      }, currentUser);
      setDraft(emptyDraft());
      setAssigneeQuery('');
      setCreateOpen(false);
      setNotice(targetIds.length > 1 ? `Đã giao ${targetIds.length} công việc riêng.` : 'Đã giao công việc.');
    } catch (saveError) {
      setError(saveError.message || String(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(status) {
    if (!selected) return;
    setBusy(true);
    setError('');
    const patch = { status, updated_at: new Date().toISOString() };
    if (status === 'approved') patch.reviewed_at = new Date().toISOString();
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    try {
      let updated = { ...selected, ...patch };
      if (client && runtime.session) {
        const { data, error: statusError } = await client
          .from('work_hub_items')
          .update(patch)
          .eq('id', selected.id)
          .select('*')
          .single();
        if (statusError) throw statusError;
        updated = data;
      } else {
        writeLocal(localStorageKey, items.map((item) => item.id === selected.id ? updated : item));
      }
      setItems((current) => current.map((item) => item.id === selected.id ? updated : item));
      await recordAuditEvent({
        action: 'work.status_changed',
        entity_type: 'work_hub_item',
        entity_id: selected.id,
        source_module: 'department',
        before_data: selected,
        after_data: updated,
      }, currentUser);
      setNotice(`Đã chuyển sang “${STATUS_LABEL[status] || status}”.`);
    } catch (statusError) {
      setError(statusError.message || String(statusError));
    } finally {
      setBusy(false);
    }
  }

  async function deleteTask() {
    if (!leader || !selected || !window.confirm(`Xóa công việc “${selected.title}”?`)) return;
    setBusy(true);
    try {
      if (client && runtime.session) {
        const { data: commentRows, error: commentError } = await client
          .from('work_hub_comments')
          .select('attachments')
          .eq('item_id', selected.id);
        if (commentError) throw commentError;
        const attachments = [
          ...(selected.attachments || []),
          ...(commentRows || []).flatMap((row) => row.attachments || []),
        ];
        const removal = await removeWorkHubSubmissionFiles(attachments);
        if (!removal.ok) throw new Error(removal.message || 'Không thể xóa tệp liên quan.');
        const { error: deleteError } = await client.from('work_hub_items').delete().eq('id', selected.id);
        if (deleteError) throw deleteError;
      } else {
        writeLocal(localStorageKey, items.filter((item) => item.id !== selected.id));
      }
      setItems((current) => current.filter((item) => item.id !== selected.id));
      setSelectedId('');
      setNotice('Đã xóa công việc.');
    } catch (deleteError) {
      setError(deleteError.message || String(deleteError));
    } finally {
      setBusy(false);
    }
  }

  async function addComment(event) {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    if (!client || !runtime.session) return setError('Trao đổi cần kết nối Supabase.');
    setBusy(true);
    const { data, error: commentError } = await client.from('work_hub_comments').insert({
      item_id: selected.id,
      author_id: currentUser.id,
      body: comment.trim(),
      comment_type: 'comment',
      attachments: [],
    }).select('*').single();
    if (commentError) setError(commentError.message);
    else {
      setComments((current) => [...current, data]);
      setComment('');
    }
    setBusy(false);
  }

  async function submitWork(event) {
    event.preventDefault();
    if (!selected || !canTeacherSubmit) return;
    if (!client || !runtime.session) return setError('Cần kết nối Supabase để nộp sản phẩm.');
    if (!submissionFile && !submissionNote.trim()) return setError('Chọn tệp hoặc nhập ghi chú.');
    if (submissionFile) {
      const validation = validateWorkHubFile(submissionFile);
      if (!validation.ok) return setError(validation.message);
    }

    setBusy(true);
    setError('');
    let uploadedAttachment = null;
    let committed = false;
    try {
      if (submissionFile) {
        const upload = await uploadWorkHubSubmissionFile({
          file: submissionFile,
          itemId: selected.id,
          userId: currentUser.id,
        });
        if (!upload.ok) throw new Error(upload.message || 'Không thể tải tệp lên.');
        uploadedAttachment = upload.attachment;
      }
      const body = submissionNote.trim() || `Đã nộp tệp: ${submissionFile.name}`;
      const { data, error: submitError } = await client.rpc('bes_v1133_submit_work_response', {
        target_item: selected.id,
        response_body: body,
        response_attachments: uploadedAttachment ? [uploadedAttachment] : [],
      });
      if (submitError) throw submitError;
      committed = true;
      if (data?.comment) {
        const resolved = await resolveWorkHubCommentAttachments([data.comment]);
        setComments((current) => [...current, ...resolved]);
      }
      if (data?.item) setItems((current) => current.map((item) => item.id === selected.id ? data.item : item));
      setSubmissionNote('');
      setSubmissionFile(null);
      setDetailTab('files');
      setNotice('Đã nộp sản phẩm.');
    } catch (submitError) {
      if (uploadedAttachment && !committed) await removeWorkHubSubmissionFile(uploadedAttachment);
      setError(submitError.message || String(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function archiveAttachment(entry, attachment) {
    if (!leader || !selected || !attachment?.path) return;
    setBusy(true);
    setError('');
    try {
      const metadata = createWorkHubArchiveDraft({
        attachment,
        item: selected,
        comment: entry,
        submitterName: entry.author_id === currentUser?.id ? 'Bạn' : 'Giáo viên',
      });
      const result = await archiveWorkHubAttachmentToResourceLibrary({
        commentId: entry.id,
        attachment,
        metadata,
      });
      if (!result.ok) throw new Error(result.message || 'Không thể lưu vào Kho học liệu.');
      await loadComments();
      setNotice(result.message || 'Đã lưu vào Kho học liệu.');
    } catch (archiveError) {
      setError(archiveError.message || String(archiveError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dwr-work-page" aria-label="Trung tâm công việc">
      {error ? <div className="dwr-alert is-error"><DepartmentIcon name="warning"/><span>{error}</span><button type="button" onClick={() => setError('')}>Đóng</button></div> : null}
      {notice ? <div className="dwr-alert is-success"><DepartmentIcon name="check"/><span>{notice}</span><button type="button" onClick={() => setNotice('')}>Đóng</button></div> : null}

      <div className="dwr-filter-tabs">
        {FILTERS.map(([value, label]) => {
          const count = items.filter((item) => matchesFilter(item, value)).length;
          return (
            <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>
              {label}<span>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="dwr-work-metrics">
        <article className="tone-blue"><DepartmentIcon name="tasks"/><div><small>Công việc đang mở</small><strong>{summary.active}</strong><span>{summary.dueSoon} sắp đến hạn</span></div></article>
        <article className="tone-amber"><DepartmentIcon name="upload"/><div><small>Chờ phê duyệt</small><strong>{summary.review}</strong><span>Cần TTCM xử lý</span></div></article>
        <article className="tone-red"><DepartmentIcon name="warning"/><div><small>Quá hạn</small><strong>{summary.overdue}</strong><span>Cần cập nhật ngay</span></div></article>
        <article className="tone-green"><DepartmentIcon name="check"/><div><small>Đã phê duyệt</small><strong>{summary.approved}</strong><span>Hoàn tất quy trình</span></div></article>
      </div>

      <div className={`dwr-master-detail${selected ? ' has-detail' : ''}`}>
        <section className="dwr-table-card">
          <header className="dwr-card-toolbar">
            <div><h2>Danh sách công việc</h2><p>{filtered.length} công việc phù hợp</p></div>
            <label className="dwr-search"><DepartmentIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm công việc…"/></label>
          </header>
          <div className="dwr-table-scroll">
            <table className="dwr-table">
              <thead><tr><th>Công việc</th><th>Người thực hiện</th><th>Hạn</th><th>Trạng thái</th><th>Ưu tiên</th><th/></tr></thead>
              <tbody>
                {filtered.map((item) => {
                  const assigned = assigneeLabel(item, people, currentUser);
                  const overdue = isOverdue(item);
                  return (
                    <tr key={item.id} className={`${String(selectedId) === String(item.id) ? 'is-selected' : ''}${overdue ? ' is-overdue' : ''}`} onClick={() => setSelectedId(item.id)}>
                      <td><div className="dwr-task-cell"><span><DepartmentIcon name="file"/></span><div><strong>{item.title}</strong><small>{item.description || item.metadata?.required_evidence || 'Chưa có mô tả'}</small></div></div></td>
                      <td><div className="dwr-person-cell"><span>{initials(assigned)}</span><div><strong>{assigned}</strong><small>Giáo viên Tiếng Anh</small></div></div></td>
                      <td><strong className={overdue ? 'is-danger' : ''}>{formatDue(item.due_at)}</strong></td>
                      <td><span className={`dwr-status status-${overdue ? 'overdue' : item.status}`}>{overdue ? 'Quá hạn' : STATUS_LABEL[item.status] || item.status}</span></td>
                      <td><span className={`dwr-priority priority-${item.priority}`}>{PRIORITY_LABEL[item.priority] || item.priority}</span></td>
                      <td><button type="button" className="dwr-icon-button" aria-label="Mở chi tiết"><DepartmentIcon name="chevron"/></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length ? <div className="dwr-empty"><DepartmentIcon name="tasks" size={30}/><h3>Chưa có công việc phù hợp</h3><p>Thay đổi bộ lọc hoặc tạo công việc mới.</p>{leader ? <button type="button" className="dwr-primary" onClick={() => setCreateOpen(true)}><DepartmentIcon name="plus"/>Giao việc</button> : null}</div> : null}
          </div>
        </section>

        {selected ? (
          <aside className="dwr-detail-panel">
            <header className="dwr-detail-head">
              <div className="dwr-detail-title"><span><DepartmentIcon name="file"/></span><div><h2>{selected.title}</h2><p>{selected.metadata?.required_evidence || 'Công việc của tổ chuyên môn'}</p></div></div>
              <button type="button" className="dwr-icon-button" aria-label="Đóng" onClick={() => setSelectedId('')}><DepartmentIcon name="close"/></button>
            </header>

            <nav className="dwr-detail-tabs">
              {[['details', 'Chi tiết'], ['discussion', 'Trao đổi'], ['files', 'Tệp đã nộp'], ['history', 'Lịch sử']].map(([value, label]) => (
                <button key={value} type="button" className={detailTab === value ? 'is-active' : ''} onClick={() => setDetailTab(value)}>{label}</button>
              ))}
            </nav>

            <div className="dwr-detail-body">
              {detailTab === 'details' ? (
                <>
                  <dl className="dwr-meta-grid">
                    <div><dt>Người thực hiện</dt><dd>{assigneeLabel(selected, people, currentUser)}</dd></div>
                    <div><dt>Hạn hoàn thành</dt><dd>{formatDue(selected.due_at)}</dd></div>
                    <div><dt>Trạng thái</dt><dd><span className={`dwr-status status-${isOverdue(selected) ? 'overdue' : selected.status}`}>{isOverdue(selected) ? 'Quá hạn' : STATUS_LABEL[selected.status] || selected.status}</span></dd></div>
                    <div><dt>Ưu tiên</dt><dd>{PRIORITY_LABEL[selected.priority] || selected.priority}</dd></div>
                  </dl>
                  <section className="dwr-detail-section"><h3>Mô tả</h3><p>{selected.description || 'Chưa có mô tả.'}</p></section>
                  <section className="dwr-detail-section"><h3>Yêu cầu sản phẩm</h3><p>{selected.metadata?.required_evidence || 'Chưa có yêu cầu cụ thể.'}</p></section>
                </>
              ) : null}

              {detailTab === 'discussion' ? (
                <section className="dwr-thread">
                  {commentsBusy ? <p>Đang tải trao đổi…</p> : discussions.map((entry) => <article key={entry.id}><span>{initials(entry.author_id === currentUser?.id ? currentUser?.name : 'GV')}</span><div><strong>{entry.author_id === currentUser?.id ? 'Bạn' : 'Giáo viên'}</strong><p>{entry.body}</p><small>{entry.created_at ? formatDue(entry.created_at) : ''}</small></div></article>)}
                  {!commentsBusy && !discussions.length ? <p>Chưa có trao đổi.</p> : null}
                  <form onSubmit={addComment} className="dwr-comment-form"><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Nhập phản hồi…"/><button type="submit" className="dwr-primary" disabled={busy}>Gửi</button></form>
                </section>
              ) : null}

              {detailTab === 'files' ? (
                <section className="dwr-files">
                  {submissions.map((entry) => (
                    <article key={entry.id}>
                      <div><strong>{entry.body || 'Sản phẩm đã nộp'}</strong><small>{entry.created_at ? formatDue(entry.created_at) : ''}</small></div>
                      {(entry.attachments || []).map((attachment) => (
                        <div className="dwr-file-row" key={attachment.path || attachment.name}>
                          <DepartmentIcon name="file"/><div><a href={attachment.signed_url || attachment.url || '#'} target="_blank" rel="noreferrer">{attachment.name || 'Tệp đính kèm'}</a><small>{formatWorkHubFileSize(attachment.size)}</small></div>
                          {leader && attachment.path ? <button type="button" onClick={() => archiveAttachment(entry, attachment)} disabled={busy}><DepartmentIcon name="archive"/>Lưu Kho học liệu</button> : null}
                        </div>
                      ))}
                    </article>
                  ))}
                  {!submissions.length ? <p>Chưa có sản phẩm được nộp.</p> : null}
                  {canTeacherSubmit ? <form onSubmit={submitWork} className="dwr-submit-form"><textarea value={submissionNote} onChange={(event) => setSubmissionNote(event.target.value)} placeholder="Ghi chú khi nộp…"/><label><DepartmentIcon name="upload"/><span>{submissionFile?.name || 'Chọn tệp'}</span><input type="file" hidden onChange={(event) => setSubmissionFile(event.target.files?.[0] || null)}/></label><button type="submit" className="dwr-primary" disabled={busy}>Nộp sản phẩm</button></form> : null}
                </section>
              ) : null}

              {detailTab === 'history' ? <section className="dwr-timeline"><article><span/><div><strong>Tạo công việc</strong><small>{formatDue(selected.created_at)}</small></div></article><article><span/><div><strong>Cập nhật gần nhất</strong><small>{formatDue(selected.updated_at)}</small></div></article></section> : null}
            </div>

            <footer className="dwr-detail-actions">
              {leader && ['submitted', 'changes_requested'].includes(selected.status) ? <button type="button" className="dwr-secondary is-warning" onClick={() => updateStatus('changes_requested')} disabled={busy}>Yêu cầu chỉnh sửa</button> : null}
              {leader && !['approved', 'completed', 'archived'].includes(selected.status) ? <button type="button" className="dwr-primary" onClick={() => updateStatus('approved')} disabled={busy}><DepartmentIcon name="check"/>Phê duyệt</button> : null}
              {!leader && selectedIsMine && selected.status === 'assigned' ? <button type="button" className="dwr-primary" onClick={() => updateStatus('accepted')} disabled={busy}>Tiếp nhận</button> : null}
              {!leader && selectedIsMine && ['accepted', 'changes_requested'].includes(selected.status) ? <button type="button" className="dwr-primary" onClick={() => updateStatus('in_progress')} disabled={busy}>Bắt đầu thực hiện</button> : null}
              {leader ? <button type="button" className="dwr-danger" onClick={deleteTask} disabled={busy}><DepartmentIcon name="trash"/>Xóa</button> : null}
            </footer>
          </aside>
        ) : null}
      </div>

      {leader && createOpen ? (
        <div className="dwr-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}>
          <aside className="dwr-drawer">
            <header><div><small>TẠO MỚI</small><h2>Giao công việc</h2></div><button type="button" className="dwr-icon-button" onClick={() => setCreateOpen(false)}><DepartmentIcon name="close"/></button></header>
            <form onSubmit={createTask}>
              <div className="dwr-drawer-body">
                <label><span>Tên công việc</span><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ví dụ: Hoàn thiện ma trận đề giữa kỳ"/></label>
                <label><span>Mô tả và kết quả cần nộp</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label>
                <div className="dwr-form-grid"><label><span>Ưu tiên</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn</option></select></label><label><span>Hạn hoàn thành</span><input type="datetime-local" value={draft.due_at} onChange={(event) => setDraft({ ...draft, due_at: event.target.value })}/></label></div>
                <label><span>Yêu cầu minh chứng</span><input value={draft.required_evidence} onChange={(event) => setDraft({ ...draft, required_evidence: event.target.value })} placeholder="File kế hoạch, biên bản, ảnh minh chứng…"/></label>
                <fieldset className="dwr-assignment"><legend>Người nhận</legend><div className="dwr-scope-buttons"><button type="button" className={draft.assignment_scope === 'self' ? 'is-active' : ''} onClick={() => setDraft({ ...draft, assignment_scope: 'self', assignee_ids: [] })}>Tự thực hiện</button><button type="button" className={draft.assignment_scope === 'selected' ? 'is-active' : ''} onClick={() => setDraft({ ...draft, assignment_scope: 'selected' })}>Chọn giáo viên</button><button type="button" className={draft.assignment_scope === 'department' ? 'is-active' : ''} onClick={() => setDraft({ ...draft, assignment_scope: 'department', assignee_ids: [] })}>Cả tổ ({eligibleTeachers.length})</button></div>{draft.assignment_scope === 'selected' ? <><label className="dwr-search"><DepartmentIcon name="search"/><input value={assigneeQuery} onChange={(event) => setAssigneeQuery(event.target.value)} placeholder="Tìm giáo viên…"/></label><div className="dwr-assignee-list">{visibleTeachers.map((person) => <button key={person.id} type="button" className={draft.assignee_ids.includes(String(person.id)) ? 'is-selected' : ''} onClick={() => toggleAssignee(person.id)}><span>{initials(person.name)}</span><div><strong>{person.name}</strong><small>{person.email}</small></div><DepartmentIcon name={draft.assignee_ids.includes(String(person.id)) ? 'check' : 'plus'}/></button>)}</div></> : null}</fieldset>
              </div>
              <footer><button type="button" className="dwr-secondary" onClick={() => setCreateOpen(false)}>Hủy</button><button type="submit" className="dwr-primary" disabled={busy}><DepartmentIcon name="plus"/>{busy ? 'Đang giao…' : 'Giao việc'}</button></footer>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
