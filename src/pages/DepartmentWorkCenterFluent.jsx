import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { formatDate, isLeader, readLocal, scopedLocalKey, uid, writeLocal } from './v1093/shared.js';
import { emitAutomationEvent } from '../utils/automationEngine.js';
import { recordAuditEvent } from '../utils/collaborationGovernance.js';
import {
  formatWorkHubFileSize,
  removeWorkHubSubmissionFile,
  removeWorkHubSubmissionFiles,
  resolveWorkHubCommentAttachments,
  uploadWorkHubSubmissionFile,
  validateWorkHubFile,
  WORK_HUB_DELIVERY_EVENT,
} from '../utils/workHubDelivery.js';
import { RESOURCE_CATEGORY_FALLBACK } from '../features/resource-library/resourceCategories.js';
import {
  archiveWorkHubAttachmentToResourceLibrary,
  createWorkHubArchiveDraft,
} from '../utils/workHubResourceArchive.js';

const STATUS_LABEL = {
  draft: 'Nháp', assigned: 'Đã giao', accepted: 'Đã tiếp nhận', in_progress: 'Đang thực hiện',
  submitted: 'Đã nộp', changes_requested: 'Cần chỉnh sửa', approved: 'Đã phê duyệt',
  completed: 'Hoàn thành', archived: 'Lưu trữ',
};
const PRIORITY_LABEL = { low: 'Thấp', normal: 'Trung bình', high: 'Cao', urgent: 'Khẩn' };
const FILTERS = [['all', 'Tất cả'], ['active', 'Đang thực hiện'], ['submitted', 'Đã nộp'], ['changes_requested', 'Cần chỉnh sửa'], ['approved', 'Đã phê duyệt'], ['overdue', 'Quá hạn']];
const EXCLUDED_ASSIGNMENT_ROLES = new Set(['student', 'learner', 'pupil', 'parent', 'guardian', 'guest', 'admin', 'administrator']);

function normalizeRole(value) { return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); }
function departmentKey(person) { return String(person?.department_id || person?.department || person?.subject_group || person?.group_name || person?.subject || '').trim().toLowerCase(); }
function uniqueIds(values = []) { return [...new Set((values || []).filter(Boolean).map(String))]; }
function createBatchId() { try { return globalThis.crypto?.randomUUID?.() || uid('work-batch'); } catch { return uid('work-batch'); } }
function emptyDraft() { return { title: '', description: '', item_type: 'task', status: 'draft', priority: 'normal', visibility: 'restricted', due_at: '', assignment_scope: 'self', assignee_ids: [], required_evidence: '' }; }
function isClosed(item) { return ['approved', 'completed', 'archived', 'cancelled'].includes(item?.status); }
function isOverdue(item) { return Boolean(item?.due_at && new Date(item.due_at).getTime() < Date.now() && !isClosed(item)); }
function matchesFilter(item, filter) {
  if (filter === 'all') return true;
  if (filter === 'active') return ['draft', 'assigned', 'accepted', 'in_progress'].includes(item.status) && !isOverdue(item);
  if (filter === 'overdue') return isOverdue(item);
  if (filter === 'approved') return ['approved', 'completed', 'archived'].includes(item.status);
  return item.status === filter;
}
function personName(person) { return person?.name || person?.email || 'Giáo viên'; }
function assigneeLabel(item, people, currentUser) {
  const ids = uniqueIds(item?.assignee_ids);
  if (!ids.length) return 'Chưa phân công';
  const labels = ids.map((id) => id === currentUser?.id ? currentUser?.name || currentUser?.email || 'Bạn' : personName(people.find((entry) => entry.id === id)));
  return labels.length > 2 ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}` : labels.join(', ');
}
function initials(value) { const parts = String(value || 'BE').trim().split(/\s+/).filter(Boolean); return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join('') || 'BE'; }
function commentLabel(comment, currentUser, people) { if (comment.author_id === currentUser?.id) return 'Bạn'; return personName(people.find((entry) => entry.id === comment.author_id)) || (comment.comment_type === 'submission' ? 'Giáo viên' : 'Người dùng'); }
function formatDue(value) {
  if (!value) return 'Chưa đặt hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function WorkIcon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>, plus: <><path d="M12 5v14M5 12h14"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>, more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>, calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>,
    flag: <><path d="M5 22V4M5 5h11l-2 4 2 4H5"/></>, message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/></>, check: <path d="m5 12 4 4L19 6"/>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></>, trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/></>,
    archive: <><path d="M4 7h16v14H4zM3 3h18v4H3zM9 11h6"/></>, chevron: <path d="m9 18 6-6-6-6"/>,
    alert: <><path d="M10.3 3.8 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.file}</svg>;
}

export default function DepartmentWorkCenterFluent({ currentUser, schoolYear = '2026-2027', semester = 'Học kỳ I', globalQuery = '', createSignal = 0, onSummaryChange }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isLeader(currentUser);
  const localKey = scopedLocalKey('bes-work-hub-v1093-local', currentUser);
  const [items, setItems] = useState([]); const [people, setPeople] = useState([]); const [comments, setComments] = useState([]);
  const [selectedId, setSelectedId] = useState(''); const [filter, setFilter] = useState('all'); const [query, setQuery] = useState(''); const [detailTab, setDetailTab] = useState('details');
  const [createOpen, setCreateOpen] = useState(false); const [draft, setDraft] = useState(emptyDraft); const [assigneeQuery, setAssigneeQuery] = useState('');
  const [comment, setComment] = useState(''); const [submissionNote, setSubmissionNote] = useState(''); const [submissionFile, setSubmissionFile] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null); const [archiveDraft, setArchiveDraft] = useState(null); const [archiveBusy, setArchiveBusy] = useState(false);
  const [busy, setBusy] = useState(false); const [commentsBusy, setCommentsBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!currentUser) return;
    setError('');
    if (!client || !runtime.ready || !runtime.session) { setItems(readLocal(localKey, [])); return; }
    const { data, error: loadError } = await client.from('work_hub_items').select('*').order('updated_at', { ascending: false }).limit(500);
    if (loadError) { setError(loadError.message || 'Không thể tải công việc.'); setItems(readLocal(localKey, [])); return; }
    setItems(data || []); writeLocal(localKey, data || []);
    if (leader) {
      const { data: profiles } = await client.from('profiles').select('*').limit(500);
      setPeople((profiles || []).map((profile) => ({ id: profile.id || profile.user_id || profile.profile_id, name: profile.full_name || profile.name || profile.email || 'Giáo viên', email: profile.email || '', role: profile.role || 'teacher', department_id: profile.department_id || profile.departmentId || '', department: profile.department || profile.department_name || '', subject_group: profile.subject_group || profile.team || profile.group_name || '', subject: profile.subject || '' })).filter((person) => person.id));
    }
  }, [client, currentUser, leader, localKey, runtime.ready, runtime.session]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeTable({ key: `department-work-${currentUser?.id || 'guest'}`, table: 'work_hub_items', onChange: load }), [currentUser?.id, load]);
  useEffect(() => { const refresh = () => load(); window.addEventListener(WORK_HUB_DELIVERY_EVENT, refresh); return () => window.removeEventListener(WORK_HUB_DELIVERY_EVENT, refresh); }, [load]);
  useEffect(() => { if (createSignal) setCreateOpen(true); }, [createSignal]);

  const eligibleTeachers = useMemo(() => people.filter((person) => person?.id && person.id !== currentUser?.id && !EXCLUDED_ASSIGNMENT_ROLES.has(normalizeRole(person.role))), [currentUser?.id, people]);
  const currentProfile = useMemo(() => people.find((person) => person.id === currentUser?.id) || currentUser || null, [currentUser, people]);
  const currentDepartmentKey = departmentKey(currentProfile);
  const departmentTeachers = useMemo(() => { if (!currentDepartmentKey) return eligibleTeachers; const matched = eligibleTeachers.filter((person) => departmentKey(person) === currentDepartmentKey); return matched.length ? matched : eligibleTeachers; }, [currentDepartmentKey, eligibleTeachers]);
  const targetIds = useMemo(() => { if (!leader) return currentUser?.id ? [currentUser.id] : []; if (draft.assignment_scope === 'self') return currentUser?.id ? [currentUser.id] : []; if (draft.assignment_scope === 'department') return uniqueIds(departmentTeachers.map((person) => person.id)); return uniqueIds(draft.assignee_ids); }, [currentUser?.id, departmentTeachers, draft.assignee_ids, draft.assignment_scope, leader]);
  const visibleAssignees = useMemo(() => { const needle = assigneeQuery.trim().toLowerCase(); if (!needle) return eligibleTeachers; return eligibleTeachers.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(needle)); }, [assigneeQuery, eligibleTeachers]);
  const selected = items.find((item) => item.id === selectedId) || null;

  const loadComments = useCallback(async () => {
    if (!selected || !client || !runtime.session) { setComments([]); return; }
    setCommentsBusy(true);
    const { data, error: loadError } = await client.from('work_hub_comments').select('*').eq('item_id', selected.id).order('created_at');
    if (loadError) setError(loadError.message || 'Không thể tải phản hồi.'); else setComments(await resolveWorkHubCommentAttachments(data || []));
    setCommentsBusy(false);
  }, [client, runtime.session, selected?.id]);
  useEffect(() => { loadComments(); }, [loadComments]);
  useEffect(() => { if (!selected?.id) return undefined; return subscribeTable({ key: `department-work-comments-${selected.id}`, table: 'work_hub_comments', filter: `item_id=eq.${selected.id}`, onChange: loadComments }); }, [selected?.id, loadComments]);
  useEffect(() => { setDetailTab('details'); setSubmissionNote(''); setSubmissionFile(null); setArchiveTarget(null); setArchiveDraft(null); }, [selected?.id]);

  const summary = useMemo(() => ({ total: items.length, active: items.filter((item) => !isClosed(item)).length, dueSoon: items.filter((item) => item.due_at && new Date(item.due_at).getTime() > Date.now() && new Date(item.due_at).getTime() - Date.now() < 3 * 86400000).length, overdue: items.filter(isOverdue).length, review: items.filter((item) => ['submitted', 'changes_requested'].includes(item.status)).length, approved: items.filter((item) => ['approved', 'completed', 'archived'].includes(item.status)).length }), [items]);
  useEffect(() => { onSummaryChange?.(summary); }, [onSummaryChange, summary]);
  const combinedQuery = `${globalQuery || ''} ${query || ''}`.trim().toLowerCase();
  const filtered = useMemo(() => items.filter((item) => matchesFilter(item, filter) && (!combinedQuery || `${item.title || ''} ${item.description || ''} ${assigneeLabel(item, people, currentUser)}`.toLowerCase().includes(combinedQuery))), [combinedQuery, currentUser, filter, items, people]);
  const selectedIsMine = Boolean(selected && uniqueIds(selected.assignee_ids).includes(currentUser?.id));
  const canTeacherSubmit = Boolean(!leader && selectedIsMine && !isClosed(selected));

  function toggleAssignee(personId) { setDraft((current) => { const ids = uniqueIds(current.assignee_ids); return { ...current, assignment_scope: 'selected', assignee_ids: ids.includes(personId) ? ids.filter((id) => id !== personId) : [...ids, personId] }; }); }
  async function saveItem(event) {
    event.preventDefault(); if (!draft.title.trim()) return; if (!targetIds.length) return setError('Vui lòng chọn ít nhất một giáo viên nhận việc.');
    setBusy(true); setError(''); setNotice(''); const batchId = targetIds.length > 1 ? createBatchId() : '';
    const payloads = targetIds.map((assigneeId, index) => { const assignedToAnother = leader && assigneeId !== currentUser.id; return { title: draft.title.trim(), description: draft.description.trim(), item_type: draft.item_type, status: assignedToAnother ? 'assigned' : draft.status, priority: draft.priority, visibility: leader ? (draft.assignment_scope === 'department' ? 'department' : draft.visibility) : 'restricted', owner_id: currentUser.id, created_by: currentUser.id, assignee_ids: [assigneeId], watcher_ids: [], due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null, source_module: 'department-fluent-workspace', metadata: { source: 'department', school_year: schoolYear, semester, required_evidence: draft.required_evidence.trim(), notify_assignee: assignedToAnother, assignment_scope: leader ? draft.assignment_scope : 'self', assignment_batch_id: batchId || null, assignment_batch_size: targetIds.length, assignment_batch_index: index + 1 } }; });
    try {
      let created = [];
      if (client && runtime.session) { const { data, error: insertError } = await client.from('work_hub_items').insert(payloads).select('*'); if (insertError) throw insertError; created = data || []; }
      else { created = payloads.map((payload) => ({ ...payload, id: uid('work'), created_at: new Date().toISOString(), updated_at: new Date().toISOString() })); writeLocal(localKey, [...created, ...items]); }
      setItems((current) => [...created, ...current]);
      await recordAuditEvent({ action: targetIds.length > 1 ? 'work.bulk_created' : 'work.created', entity_type: 'work_hub_item', entity_id: batchId || created[0]?.id || '', source_module: 'department', after_data: { item_ids: created.map((item) => item.id), assignee_ids: targetIds } }, currentUser);
      setDraft(emptyDraft()); setAssigneeQuery(''); setCreateOpen(false); setNotice(targetIds.length > 1 ? `Đã giao ${targetIds.length} công việc riêng.` : 'Đã giao công việc.');
    } catch (saveError) { setError(saveError.message || String(saveError)); } finally { setBusy(false); }
  }
  async function updateStatus(item, status) {
    if (!item) return; setBusy(true); setError(''); const patch = { status, updated_at: new Date().toISOString() };
    if (status === 'submitted') patch.submitted_at = new Date().toISOString(); if (status === 'approved') patch.reviewed_at = new Date().toISOString(); if (status === 'completed') patch.completed_at = new Date().toISOString();
    try {
      let updated = { ...item, ...patch };
      if (client && runtime.session) { const { data, error: updateError } = await client.from('work_hub_items').update(patch).eq('id', item.id).select('*').single(); if (updateError) throw updateError; updated = data; }
      else { const next = items.map((entry) => entry.id === item.id ? updated : entry); writeLocal(localKey, next); }
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
      await recordAuditEvent({ action: 'work.status_changed', entity_type: 'work_hub_item', entity_id: item.id, source_module: 'department', before_data: item, after_data: updated }, currentUser);
      if (status === 'submitted') await emitAutomationEvent('work_submitted', { source: 'department', item_id: item.id, title: item.title, summary: `Sản phẩm “${item.title}” đã được nộp.` }, currentUser);
      setNotice(`Đã chuyển sang “${STATUS_LABEL[status] || status}”.`);
    } catch (statusError) { setError(statusError.message || String(statusError)); } finally { setBusy(false); }
  }
  async function deleteWork(item) {
    if (!leader || !item || !window.confirm(`Xóa công việc “${item.title}”? Hành động này không thể hoàn tác.`)) return;
    setBusy(true); setError('');
    try {
      if (client && runtime.session) { const { data: rows, error: commentsError } = await client.from('work_hub_comments').select('attachments').eq('item_id', item.id); if (commentsError) throw commentsError; const attachments = [...(item.attachments || []), ...(rows || []).flatMap((row) => row.attachments || [])]; const removeResult = await removeWorkHubSubmissionFiles(attachments); if (!removeResult.ok) throw new Error(removeResult.message || 'Không thể xóa tệp liên quan.'); const { error: deleteError } = await client.from('work_hub_items').delete().eq('id', item.id); if (deleteError) throw deleteError; }
      else writeLocal(localKey, items.filter((entry) => entry.id !== item.id));
      setItems((current) => current.filter((entry) => entry.id !== item.id)); setSelectedId(''); setNotice('Đã xóa công việc.');
    } catch (deleteError) { setError(deleteError.message || String(deleteError)); } finally { setBusy(false); }
  }
  async function addComment(event) {
    event.preventDefault(); if (!selected || !comment.trim()) return; if (!client || !runtime.session) return setError('Phản hồi cần kết nối Supabase.');
    setBusy(true); const { data, error: commentError } = await client.from('work_hub_comments').insert({ item_id: selected.id, author_id: currentUser.id, body: comment.trim(), comment_type: 'comment', attachments: [] }).select('*').single();
    if (commentError) setError(commentError.message); else { setComments((current) => [...current, data]); setComment(''); await recordAuditEvent({ action: 'work.comment_added', entity_type: 'work_hub_item', entity_id: selected.id, source_module: 'department', after_data: { comment_id: data.id } }, currentUser); }
    setBusy(false);
  }
  async function submitTeacherResponse(event) {
    event.preventDefault(); if (!selected || !canTeacherSubmit) return; if (!client || !runtime.session) return setError('Cần kết nối Supabase để nộp sản phẩm.'); if (!submissionFile && !submissionNote.trim()) return setError('Vui lòng chọn tệp hoặc nhập ghi chú.');
    if (submissionFile) { const validation = validateWorkHubFile(submissionFile); if (!validation.ok) return setError(validation.message); }
    setBusy(true); setError(''); setNotice(''); let uploadedAttachment = null; let committed = false;
    try {
      if (submissionFile) { const result = await uploadWorkHubSubmissionFile({ file: submissionFile, itemId: selected.id, userId: currentUser.id }); if (!result.ok) throw new Error(result.message || 'Không thể tải tệp lên.'); uploadedAttachment = result.attachment; }
      const body = submissionNote.trim() || `Đã nộp tệp: ${submissionFile.name}`;
      const { data: submissionResult, error: submitError } = await client.rpc('bes_v1133_submit_work_response', { target_item: selected.id, response_body: body, response_attachments: uploadedAttachment ? [uploadedAttachment] : [] }); if (submitError) throw submitError; committed = true;
      const response = submissionResult?.comment; const updatedItem = submissionResult?.item;
      if (response) { const resolved = await resolveWorkHubCommentAttachments([response]); setComments((current) => [...current, ...resolved]); }
      if (updatedItem) setItems((current) => current.map((entry) => entry.id === selected.id ? updatedItem : entry));
      setSubmissionNote(''); setSubmissionFile(null); setDetailTab('files');
      await emitAutomationEvent('work_submitted', { source: 'department', item_id: selected.id, title: selected.title, summary: `Giáo viên đã nộp sản phẩm cho “${selected.title}”.` }, currentUser);
      setNotice('Đã nộp sản phẩm và gửi thông báo đến TTCM.');
    } catch (submitError) { if (uploadedAttachment && !committed) await removeWorkHubSubmissionFile(uploadedAttachment); setError(submitError.message || String(submitError)); } finally { setBusy(false); }
  }
  function openResourceArchive(entry, attachment) { if (!leader || !selected || !attachment?.path) return; setArchiveTarget({ commentId: entry.id, attachmentPath: attachment.path }); setArchiveDraft(createWorkHubArchiveDraft({ attachment, item: selected, comment: entry, submitterName: commentLabel(entry, currentUser, people) })); }
  async function saveAttachmentToResourceLibrary(event) {
    event.preventDefault(); const entry = comments.find((row) => row.id === archiveTarget?.commentId); const attachment = entry?.attachments?.find((file) => file.path === archiveTarget?.attachmentPath); if (!entry || !attachment || !archiveDraft?.title?.trim()) return;
    setArchiveBusy(true); setError('');
    try { const result = await archiveWorkHubAttachmentToResourceLibrary({ commentId: entry.id, attachment, metadata: archiveDraft }); if (!result.ok) throw new Error(result.message || 'Không thể lưu vào Kho học liệu.'); await loadComments(); setArchiveTarget(null); setArchiveDraft(null); setNotice(result.message || 'Đã lưu vào Kho học liệu.'); }
    catch (archiveError) { setError(archiveError.message || String(archiveError)); } finally { setArchiveBusy(false); }
  }

  const commentsOnly = comments.filter((entry) => entry.comment_type !== 'submission');
  const submissions = comments.filter((entry) => entry.comment_type === 'submission' || (entry.attachments || []).length);

  return <section className="bf-work-center" aria-label="Trung tâm công việc">
    {error ? <div className="bf-notice bf-notice--error"><WorkIcon name="alert"/><span>{error}</span><button type="button" onClick={() => { setError(''); load(); }}>Thử lại</button></div> : null}
    {notice ? <div className="bf-notice bf-notice--success"><WorkIcon name="check"/><span>{notice}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}><WorkIcon name="close"/></button></div> : null}
    <nav className="bf-work-status-tabs" aria-label="Lọc trạng thái công việc">{FILTERS.map(([value, label]) => { const count = items.filter((item) => matchesFilter(item, value)).length; return <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}><span>{label}</span><small>{count}</small></button>; })}</nav>
    <div className="bf-work-metrics"><article><span className="is-blue"><WorkIcon name="file"/></span><div><small>Công việc đang mở</small><strong>{summary.active}</strong><em>{summary.dueSoon} sắp đến hạn</em></div></article><article><span className="is-amber"><WorkIcon name="upload"/></span><div><small>Chờ phê duyệt</small><strong>{summary.review}</strong><em>Cần TTCM xử lý</em></div></article><article><span className="is-red"><WorkIcon name="alert"/></span><div><small>Quá hạn</small><strong>{summary.overdue}</strong><em>Cần cập nhật ngay</em></div></article><article><span className="is-green"><WorkIcon name="check"/></span><div><small>Đã phê duyệt</small><strong>{summary.approved}</strong><em>Hoàn tất quy trình</em></div></article></div>
    <div className={`bf-work-layout${selected ? ' has-details' : ''}`}>
      <section className="bf-work-table-panel"><header className="bf-section-toolbar"><div><h2>Danh sách công việc</h2><p>{filtered.length} công việc phù hợp</p></div><label className="bf-search-field"><WorkIcon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm công việc…" /></label></header><div className="bf-work-table-wrap"><table className="bf-work-table"><thead><tr><th className="bf-check-cell"><input type="checkbox" aria-label="Chọn tất cả" /></th><th>Công việc</th><th>Người thực hiện</th><th>Hạn</th><th>Trạng thái</th><th>Ưu tiên</th><th aria-label="Thao tác" /></tr></thead><tbody>{filtered.map((item) => { const assigned = assigneeLabel(item, people, currentUser); return <tr key={item.id} className={`${selectedId === item.id ? 'is-selected' : ''}${isOverdue(item) ? ' is-overdue' : ''}`} onClick={() => setSelectedId(item.id)}><td className="bf-check-cell" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Chọn ${item.title}`} /></td><td><div className="bf-task-title"><span><WorkIcon name="file"/></span><div><strong>{item.title}</strong><small>{item.description || item.metadata?.required_evidence || 'Chưa có mô tả'}</small></div></div></td><td><div className="bf-person-cell"><span>{initials(assigned)}</span><div><strong>{assigned}</strong><small>Giáo viên Tiếng Anh</small></div></div></td><td><strong className={isOverdue(item) ? 'bf-danger-text' : ''}>{formatDue(item.due_at)}</strong></td><td><span className={`bf-status-badge status-${isOverdue(item) ? 'overdue' : item.status}`}>{isOverdue(item) ? 'Quá hạn' : STATUS_LABEL[item.status] || item.status}</span></td><td><span className={`bf-priority priority-${item.priority}`}>{PRIORITY_LABEL[item.priority] || item.priority}</span></td><td><button type="button" className="bf-icon-button" aria-label="Mở chi tiết" onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}><WorkIcon name="chevron"/></button></td></tr>; })}</tbody></table>{!filtered.length ? <div className="bf-empty-state"><span><WorkIcon name="file" size={30}/></span><h3>Chưa có công việc phù hợp</h3><p>Thay đổi bộ lọc hoặc tạo công việc mới.</p>{leader ? <button type="button" className="bf-primary-button" onClick={() => setCreateOpen(true)}><WorkIcon name="plus"/>Giao việc</button> : null}</div> : null}</div></section>
      {selected ? <aside className="bf-details-pane"><header className="bf-details-header"><div className="bf-details-title"><span><WorkIcon name="file"/></span><div><h2>{selected.title}</h2><p>{selected.metadata?.required_evidence || 'Công việc của tổ chuyên môn'}</p></div></div><div className="bf-details-header-actions">{leader ? <button type="button" className="bf-icon-button" aria-label="Xóa công việc" onClick={() => deleteWork(selected)}><WorkIcon name="trash"/></button> : null}<button type="button" className="bf-icon-button" aria-label="Đóng" onClick={() => setSelectedId('')}><WorkIcon name="close"/></button></div><span className={`bf-status-badge status-${isOverdue(selected) ? 'overdue' : selected.status}`}>{isOverdue(selected) ? 'Quá hạn' : STATUS_LABEL[selected.status] || selected.status}</span></header>
        <nav className="bf-details-tabs" role="tablist">{[['details', 'Chi tiết'], ['discussion', 'Trao đổi'], ['files', 'Tệp đã nộp'], ['history', 'Lịch sử']].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={detailTab === value} className={detailTab === value ? 'is-active' : ''} onClick={() => setDetailTab(value)}>{label}</button>)}</nav>
        <div className="bf-details-content">
          {detailTab === 'details' ? <div className="bf-detail-info"><dl><div><dt><WorkIcon name="user"/>Người thực hiện</dt><dd>{assigneeLabel(selected, people, currentUser)}</dd></div><div><dt><WorkIcon name="calendar"/>Hạn nộp</dt><dd>{formatDue(selected.due_at)}</dd></div><div><dt><WorkIcon name="flag"/>Ưu tiên</dt><dd>{PRIORITY_LABEL[selected.priority]}</dd></div><div><dt><WorkIcon name="file"/>Mô tả</dt><dd>{selected.description || 'Chưa có mô tả.'}</dd></div>{selected.metadata?.required_evidence ? <div><dt><WorkIcon name="upload"/>Sản phẩm cần nộp</dt><dd>{selected.metadata.required_evidence}</dd></div> : null}</dl></div> : null}
          {detailTab === 'discussion' ? <section className="bf-discussion">{commentsBusy ? <p>Đang tải trao đổi…</p> : commentsOnly.map((entry) => <article key={entry.id}><span className="bf-avatar">{initials(commentLabel(entry, currentUser, people))}</span><div><header><strong>{commentLabel(entry, currentUser, people)}</strong><time>{formatDue(entry.created_at)}</time></header><p>{entry.body}</p></div></article>)}{!commentsBusy && !commentsOnly.length ? <div className="bf-inline-empty">Chưa có trao đổi.</div> : null}<form onSubmit={addComment}><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Viết phản hồi hoặc hướng dẫn chỉnh sửa…"/><button type="submit" className="bf-primary-button" disabled={busy || !comment.trim()}><WorkIcon name="message"/>Gửi phản hồi</button></form></section> : null}
          {detailTab === 'files' ? <section className="bf-submissions">{submissions.map((entry) => <article key={entry.id}><header><div><span className="bf-avatar">{initials(commentLabel(entry, currentUser, people))}</span><div><strong>{commentLabel(entry, currentUser, people)}</strong><small>{formatDue(entry.created_at)}</small></div></div><span className="bf-status-badge status-submitted">Đã nộp</span></header><p>{entry.body}</p>{(entry.attachments || []).map((attachment, index) => { const archived = Boolean(attachment.library_resource_id || attachment.archived_to_library_at); const archiveOpen = archiveTarget?.commentId === entry.id && archiveTarget?.attachmentPath === attachment.path; return <div key={`${entry.id}-${attachment.path || index}`} className="bf-attachment-row"><a href={attachment.signed_url || '#'} target="_blank" rel="noreferrer"><WorkIcon name="file"/><span><strong>{attachment.name || 'Tệp đính kèm'}</strong><small>{formatWorkHubFileSize(attachment.size)}</small></span></a>{leader ? archived ? <button type="button" className="bf-text-button" onClick={() => { window.location.hash = '#/resource-library'; }}>Đã lưu · Mở kho</button> : <button type="button" className="bf-text-button" onClick={() => openResourceArchive(entry, attachment)}><WorkIcon name="archive"/>Lưu Kho học liệu</button> : null}{leader && archiveOpen && archiveDraft ? <form className="bf-archive-form" onSubmit={saveAttachmentToResourceLibrary}><header><strong>Lưu vào Kho học liệu</strong><button type="button" className="bf-icon-button" aria-label="Đóng" onClick={() => { setArchiveTarget(null); setArchiveDraft(null); }}><WorkIcon name="close"/></button></header><label><span>Tên tài liệu</span><input value={archiveDraft.title} onChange={(event) => setArchiveDraft((current) => ({ ...current, title: event.target.value }))}/></label><div className="bf-form-grid"><label><span>Danh mục</span><select value={archiveDraft.category} onChange={(event) => setArchiveDraft((current) => ({ ...current, category: event.target.value }))}>{RESOURCE_CATEGORY_FALLBACK.map((category) => <option key={category.slug} value={category.slug}>{category.name_vi}</option>)}</select></label><label><span>Năm học</span><input value={archiveDraft.schoolYear} onChange={(event) => setArchiveDraft((current) => ({ ...current, schoolYear: event.target.value }))}/></label></div><label><span>Mô tả</span><textarea value={archiveDraft.description} onChange={(event) => setArchiveDraft((current) => ({ ...current, description: event.target.value }))}/></label><footer><button type="button" className="bf-secondary-button" onClick={() => { setArchiveTarget(null); setArchiveDraft(null); }}>Hủy</button><button type="submit" className="bf-primary-button" disabled={archiveBusy}>{archiveBusy ? 'Đang lưu…' : 'Lưu và duyệt'}</button></footer></form> : null}</div>; })}</article>)}{!submissions.length ? <div className="bf-inline-empty">Chưa có tệp được nộp.</div> : null}{canTeacherSubmit ? <form className="bf-submit-form" onSubmit={submitTeacherResponse}><h3>Nộp sản phẩm</h3><label><span>Ghi chú</span><textarea value={submissionNote} onChange={(event) => setSubmissionNote(event.target.value)} placeholder="Mô tả nội dung đã hoàn thành…"/></label><label className="bf-file-picker"><span>Tệp đính kèm</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.jpg,.jpeg,.png,.webp,.zip,.rar,.7z,.mp3,.wav,.mp4" onChange={(event) => setSubmissionFile(event.target.files?.[0] || null)}/><small>{submissionFile ? `${submissionFile.name} · ${formatWorkHubFileSize(submissionFile.size)}` : 'Tối đa 25 MB'}</small></label><button type="submit" className="bf-primary-button" disabled={busy || (!submissionFile && !submissionNote.trim())}><WorkIcon name="upload"/>{busy ? 'Đang nộp…' : 'Nộp sản phẩm'}</button></form> : null}</section> : null}
          {detailTab === 'history' ? <section className="bf-history-timeline"><article><span/><div><strong>Giao việc</strong><p>Công việc được tạo trong Tổ chuyên môn.</p><time>{formatDue(selected.created_at)}</time></div></article>{selected.accepted_at ? <article><span/><div><strong>Đã tiếp nhận</strong><p>Giáo viên đã tiếp nhận công việc.</p><time>{formatDue(selected.accepted_at)}</time></div></article> : null}{selected.submitted_at ? <article><span/><div><strong>Đã nộp sản phẩm</strong><p>Sản phẩm đã được gửi để duyệt.</p><time>{formatDue(selected.submitted_at)}</time></div></article> : null}{selected.reviewed_at ? <article><span/><div><strong>Đã phê duyệt</strong><p>TTCM đã hoàn tất phê duyệt.</p><time>{formatDue(selected.reviewed_at)}</time></div></article> : null}<article><span/><div><strong>Cập nhật lần cuối</strong><p>Trạng thái hiện tại: {STATUS_LABEL[selected.status]}.</p><time>{formatDue(selected.updated_at)}</time></div></article></section> : null}
        </div>
        <footer className="bf-details-actionbar">{leader ? <><button type="button" className="bf-secondary-button" disabled={busy || selected.status === 'changes_requested'} onClick={() => updateStatus(selected, 'changes_requested')}><WorkIcon name="edit"/>Yêu cầu chỉnh sửa</button><button type="button" className="bf-primary-button" disabled={busy || selected.status === 'approved'} onClick={() => updateStatus(selected, 'approved')}><WorkIcon name="check"/>Phê duyệt</button></> : <>{selected.status === 'assigned' ? <button type="button" className="bf-primary-button" disabled={busy} onClick={() => updateStatus(selected, 'accepted')}><WorkIcon name="check"/>Tiếp nhận</button> : null}{['accepted', 'changes_requested'].includes(selected.status) ? <button type="button" className="bf-primary-button" disabled={busy} onClick={() => updateStatus(selected, 'in_progress')}><WorkIcon name="edit"/>Bắt đầu thực hiện</button> : null}{canTeacherSubmit ? <button type="button" className="bf-primary-button" onClick={() => setDetailTab('files')}><WorkIcon name="upload"/>Nộp sản phẩm</button> : null}</>}</footer>
      </aside> : null}
    </div>
    {createOpen ? <div className="bf-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><aside className="bf-side-panel" aria-label="Giao công việc mới"><header><div><small>Tạo mới</small><h2>{leader ? 'Giao công việc' : 'Tạo công việc'}</h2></div><button type="button" className="bf-icon-button" aria-label="Đóng" onClick={() => setCreateOpen(false)}><WorkIcon name="close"/></button></header><form onSubmit={saveItem}><div className="bf-panel-content"><section><h3>Thông tin chính</h3><label><span>Tên công việc</span><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ví dụ: Nộp kế hoạch cá nhân"/></label><label><span>Mô tả và yêu cầu</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Mô tả nội dung, tiêu chí và kết quả cần nộp…"/></label><div className="bf-form-grid"><label><span>Mức ưu tiên</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option value="low">Thấp</option><option value="normal">Trung bình</option><option value="high">Cao</option><option value="urgent">Khẩn</option></select></label><label><span>Hạn hoàn thành</span><input type="datetime-local" value={draft.due_at} onChange={(event) => setDraft({ ...draft, due_at: event.target.value })}/></label></div><label><span>Sản phẩm cần nộp</span><input value={draft.required_evidence} onChange={(event) => setDraft({ ...draft, required_evidence: event.target.value })} placeholder="Ví dụ: File kế hoạch định dạng DOCX hoặc PDF"/></label></section>{leader ? <section><h3>Người nhận</h3><div className="bf-segmented-control"><button type="button" className={draft.assignment_scope === 'self' ? 'is-active' : ''} onClick={() => setDraft((current) => ({ ...current, assignment_scope: 'self' }))}>Tự thực hiện</button><button type="button" className={draft.assignment_scope === 'selected' ? 'is-active' : ''} onClick={() => setDraft((current) => ({ ...current, assignment_scope: 'selected' }))}>Chọn giáo viên</button><button type="button" className={draft.assignment_scope === 'department' ? 'is-active' : ''} onClick={() => setDraft((current) => ({ ...current, assignment_scope: 'department' }))}>Toàn tổ ({departmentTeachers.length})</button></div>{draft.assignment_scope === 'selected' ? <div className="bf-assignee-picker"><label className="bf-search-field"><WorkIcon name="search"/><input value={assigneeQuery} onChange={(event) => setAssigneeQuery(event.target.value)} placeholder="Tìm giáo viên…"/></label><div className="bf-assignee-list">{visibleAssignees.map((person) => { const checked = uniqueIds(draft.assignee_ids).includes(person.id); return <label key={person.id} className={checked ? 'is-selected' : ''}><input type="checkbox" checked={checked} onChange={() => toggleAssignee(person.id)}/><span className="bf-avatar">{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.email || 'Giáo viên Tiếng Anh'}</small></span></label>; })}</div></div> : null}</section> : null}</div><footer><button type="button" className="bf-secondary-button" onClick={() => setCreateOpen(false)}>Hủy</button><button type="submit" className="bf-primary-button" disabled={busy || !draft.title.trim() || !targetIds.length}><WorkIcon name="plus"/>{busy ? 'Đang giao…' : leader ? 'Giao việc' : 'Tạo công việc'}</button></footer></form></aside></div> : null}
  </section>;
}
