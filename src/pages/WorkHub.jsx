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
    visibility: 'restricted', due_at: '', assignment_scope: 'self', assignee_ids: [],
  };
}

const EXCLUDED_ASSIGNMENT_ROLES = new Set(['student', 'learner', 'pupil', 'parent', 'guardian', 'guest', 'admin', 'administrator']);

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function departmentKey(person) {
  return String(
    person?.department_id || person?.department || person?.subject_group
    || person?.group_name || person?.subject || '',
  ).trim().toLowerCase();
}

function uniqueIds(values = []) {
  return [...new Set((values || []).filter(Boolean).map(String))];
}

function createBatchId() {
  try { return globalThis.crypto?.randomUUID?.() || uid('work-batch'); }
  catch { return uid('work-batch'); }
}

function getAssigneeLabel(item, people, currentUser) {
  const assigneeIds = uniqueIds(Array.isArray(item?.assignee_ids) ? item.assignee_ids : []);
  if (!assigneeIds.length) return 'Chưa phân công';
  const labels = assigneeIds.map((assigneeId) => {
    if (assigneeId === currentUser?.id) return currentUser?.name || currentUser?.email || 'Bạn';
    const person = people.find((entry) => entry.id === assigneeId);
    return person?.name || person?.email || 'Giáo viên';
  });
  if (labels.length <= 2) return labels.join(', ');
  return `${labels.slice(0, 2).join(', ')} và ${labels.length - 2} người khác`;
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
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [comment, setComment] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveDraft, setArchiveDraft] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
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
        department_id: profile.department_id || profile.departmentId || '',
        department: profile.department || profile.department_name || '',
        subject_group: profile.subject_group || profile.team || profile.group_name || '',
        subject: profile.subject || '',
      })).filter((person) => person.id));
    }
  }, [client, currentUser, leader, localKey, runtime.ready, runtime.session]);

  const eligibleTeachers = useMemo(() => people.filter((person) => {
    if (!person?.id || person.id === currentUser?.id) return false;
    return !EXCLUDED_ASSIGNMENT_ROLES.has(normalizeRole(person.role));
  }), [currentUser?.id, people]);

  const currentProfile = useMemo(
    () => people.find((person) => person.id === currentUser?.id) || currentUser || null,
    [currentUser, people],
  );
  const currentDepartmentKey = departmentKey(currentProfile);
  const departmentTeachers = useMemo(() => {
    if (!currentDepartmentKey) return eligibleTeachers;
    const matched = eligibleTeachers.filter((person) => departmentKey(person) === currentDepartmentKey);
    return matched.length ? matched : eligibleTeachers;
  }, [currentDepartmentKey, eligibleTeachers]);

  const assignmentTargetIds = useMemo(() => {
    if (!leader) return currentUser?.id ? [currentUser.id] : [];
    if (draft.assignment_scope === 'self') return currentUser?.id ? [currentUser.id] : [];
    if (draft.assignment_scope === 'department') return uniqueIds(departmentTeachers.map((person) => person.id));
    return uniqueIds(draft.assignee_ids);
  }, [currentUser?.id, departmentTeachers, draft.assignee_ids, draft.assignment_scope, leader]);

  const visibleAssigneeChoices = useMemo(() => {
    const needle = assigneeQuery.trim().toLowerCase();
    if (!needle) return eligibleTeachers;
    return eligibleTeachers.filter((person) => `${person.name || ''} ${person.email || ''}`.toLowerCase().includes(needle));
  }, [assigneeQuery, eligibleTeachers]);

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
    setArchiveTarget(null);
    setArchiveDraft(null);
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

  function toggleAssignee(personId) {
    setDraft((current) => {
      const selectedIds = uniqueIds(current.assignee_ids);
      const next = selectedIds.includes(personId)
        ? selectedIds.filter((id) => id !== personId)
        : [...selectedIds, personId];
      return { ...current, assignment_scope: 'selected', assignee_ids: next };
    });
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const targetIds = leader ? assignmentTargetIds : (currentUser?.id ? [currentUser.id] : []);
    if (!targetIds.length) {
      setError('Vui lòng chọn ít nhất một giáo viên nhận việc.');
      return;
    }

    setBusy(true); setError(''); setNotice('');
    const batchId = targetIds.length > 1 ? createBatchId() : '';
    const payloads = targetIds.map((assigneeId, index) => {
      const assignedToAnother = leader && assigneeId !== currentUser.id;
      return {
        title: draft.title.trim(), description: draft.description.trim(), item_type: draft.item_type,
        status: assignedToAnother ? 'assigned' : draft.status,
        priority: draft.priority,
        visibility: leader
          ? (draft.assignment_scope === 'department' ? 'department' : draft.visibility)
          : 'restricted',
        owner_id: currentUser.id, created_by: currentUser.id,
        assignee_ids: assigneeId ? [assigneeId] : [currentUser.id], watcher_ids: [],
        due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
        source_module: 'work-hub-v1135',
        metadata: {
          created_in: '11.3.5',
          notify_assignee: assignedToAnother,
          assignment_scope: leader ? draft.assignment_scope : 'self',
          assignment_batch_id: batchId || null,
          assignment_batch_size: targetIds.length,
          assignment_batch_index: index + 1,
        },
      };
    });

    try {
      let createdItems = [];
      if (client && runtime.session) {
        const { data, error: insertError } = await client.from('work_hub_items').insert(payloads).select('*');
        if (insertError) throw insertError;
        createdItems = data || [];
        setItems((current) => [...createdItems, ...current]);
      } else {
        createdItems = payloads.map((payload) => ({
          ...payload,
          id: uid('work'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const next = [...createdItems, ...items];
        setItems(next); writeLocal(localKey, next);
      }
      await recordAuditEvent({
        action: targetIds.length > 1 ? 'work.bulk_created' : 'work.created',
        entity_type: 'work_hub_item',
        entity_id: batchId || createdItems[0]?.id || '',
        source_module: 'work-hub',
        after_data: {
          count: createdItems.length,
          item_ids: createdItems.map((item) => item.id),
          assignee_ids: targetIds,
          batch_id: batchId || null,
        },
      }, currentUser);
      setDraft(emptyDraft(currentUser));
      setAssigneeQuery('');
      setNotice(targetIds.length > 1
        ? `Đã giao ${targetIds.length} công việc riêng và gửi thông báo đến từng giáo viên.`
        : (targetIds[0] !== currentUser.id
          ? 'Đã giao công việc và gửi thông báo đến tài khoản giáo viên.'
          : 'Đã tạo công việc.'));
    } catch (saveError) { setError(saveError.message || String(saveError)); }
    finally { setBusy(false); }
  }

  async function deleteWorkItems(item, deleteBatch = false) {
    if (!leader || !item) return;
    const batchId = String(item.metadata?.assignment_batch_id || '');
    const targetItems = deleteBatch && batchId
      ? items.filter((entry) => String(entry.metadata?.assignment_batch_id || '') === batchId)
      : [item];
    const targetIds = uniqueIds(targetItems.map((entry) => entry.id));
    if (!targetIds.length) return;
    const label = targetIds.length > 1
      ? `${targetIds.length} công việc trong cùng đợt giao`
      : `công việc “${item.title}”`;
    const confirmed = window.confirm(`Xoá ${label}? Thông báo, phản hồi và tệp đã nộp liên quan cũng sẽ bị xoá. Hành động này không thể hoàn tác.`);
    if (!confirmed) return;

    setBusy(true); setError(''); setNotice('');
    try {
      if (client && runtime.session) {
        const { data: commentRows, error: commentError } = await client
          .from('work_hub_comments')
          .select('attachments')
          .in('item_id', targetIds);
        if (commentError) throw commentError;
        const attachments = [
          ...targetItems.flatMap((entry) => Array.isArray(entry.attachments) ? entry.attachments : []),
          ...(commentRows || []).flatMap((entry) => Array.isArray(entry.attachments) ? entry.attachments : []),
        ];
        const removeResult = await removeWorkHubSubmissionFiles(attachments);
        if (!removeResult.ok) throw new Error(removeResult.message || 'Không thể xoá tệp đính kèm của công việc.');
        const { error: deleteError } = await client.from('work_hub_items').delete().in('id', targetIds);
        if (deleteError) throw deleteError;
      } else {
        const next = items.filter((entry) => !targetIds.includes(entry.id));
        setItems(next); writeLocal(localKey, next);
      }
      setItems((current) => current.filter((entry) => !targetIds.includes(entry.id)));
      setSelectedId('');
      setComments([]);
      await recordAuditEvent({
        action: targetIds.length > 1 ? 'work.bulk_deleted' : 'work.deleted',
        entity_type: 'work_hub_item',
        entity_id: batchId || item.id,
        source_module: 'work-hub',
        before_data: { item_ids: targetIds, batch_id: batchId || null, title: item.title },
      }, currentUser);
      setNotice(targetIds.length > 1 ? `Đã xoá ${targetIds.length} công việc trong đợt giao.` : 'Đã xoá công việc.');
    } catch (deleteError) {
      setError(deleteError.message || String(deleteError));
    } finally {
      setBusy(false);
    }
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


  function openResourceArchive(entry, attachment) {
    if (!leader || !selected || !entry || !attachment?.path) return;
    const submitterName = commentLabel(entry, currentUser, people);
    setArchiveTarget({ commentId: entry.id, attachmentPath: attachment.path });
    setArchiveDraft(createWorkHubArchiveDraft({
      attachment,
      item: selected,
      comment: entry,
      submitterName,
    }));
    setError('');
    setNotice('');
  }

  async function saveAttachmentToResourceLibrary(event) {
    event.preventDefault();
    if (!leader || !archiveTarget || !archiveDraft) return;
    const entry = comments.find((commentEntry) => commentEntry.id === archiveTarget.commentId);
    const attachment = entry?.attachments?.find((file) => file.path === archiveTarget.attachmentPath);
    if (!entry || !attachment) {
      setError('Không tìm thấy tệp phản hồi cần lưu.');
      return;
    }
    if (!archiveDraft.title.trim()) {
      setError('Vui lòng nhập tên tài liệu trước khi lưu.');
      return;
    }

    setArchiveBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await archiveWorkHubAttachmentToResourceLibrary({
        commentId: entry.id,
        attachment,
        metadata: archiveDraft,
      });
      if (!result.ok) throw new Error(result.message || 'Không thể lưu tệp vào Kho học liệu.');
      if (result.comment) {
        const resolved = await resolveWorkHubCommentAttachments([result.comment]);
        if (resolved[0]) {
          setComments((current) => current.map((commentEntry) => (
            commentEntry.id === result.comment.id ? resolved[0] : commentEntry
          )));
        }
      } else {
        await loadComments();
      }
      setArchiveTarget(null);
      setArchiveDraft(null);
      setNotice(result.message || 'Đã lưu tệp vào Kho học liệu.');
      await recordAuditEvent({
        action: 'work.attachment_archived_to_library',
        entity_type: 'work_hub_item',
        entity_id: selected.id,
        source_module: 'work-hub',
        after_data: {
          comment_id: entry.id,
          attachment_path: attachment.path,
          resource_id: result.resource?.id || null,
          category: archiveDraft.category,
        },
      }, currentUser);
    } catch (archiveError) {
      setError(archiveError.message || String(archiveError));
    } finally {
      setArchiveBusy(false);
    }
  }

  const statusOptions = leader
    ? STATUSES
    : STATUSES.filter(([value]) => ['accepted', 'in_progress'].includes(value));

  return <section className="v1093-page v1093-work-hub">
    <header className="v1093-hero v1093-hero-work">
      <div><span className="v1093-kicker">V11.3.5 · Work Submission Archive</span><h1>Trung tâm công việc</h1><p>Giao việc, nhận tệp phản hồi và lưu học liệu đạt yêu cầu trực tiếp vào kho dùng chung của tổ chuyên môn.</p></div>
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
            {leader && <select value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}><option value="restricted">Người liên quan</option><option value="department">Toàn tổ</option><option value="private">Riêng tư</option></select>}
          </div>
          {leader ? <section className="work-bulk-assignment" aria-label="Chọn người nhận công việc">
            <div className="work-bulk-assignment-heading"><div><span>Người nhận</span><strong>{assignmentTargetIds.length} tài khoản được chọn</strong></div><small>Mỗi giáo viên nhận một công việc riêng để theo dõi và nộp tệp độc lập.</small></div>
            <div className="work-bulk-mode" role="group" aria-label="Hình thức giao việc">
              <button type="button" className={draft.assignment_scope === 'self' ? 'active' : ''} onClick={() => setDraft((current) => ({ ...current, assignment_scope: 'self' }))}>Tự thực hiện</button>
              <button type="button" className={draft.assignment_scope === 'selected' ? 'active' : ''} onClick={() => setDraft((current) => ({ ...current, assignment_scope: 'selected' }))}>Chọn nhiều người</button>
              <button type="button" className={draft.assignment_scope === 'department' ? 'active' : ''} onClick={() => setDraft((current) => ({ ...current, assignment_scope: 'department' }))}>Cả tổ ({departmentTeachers.length})</button>
            </div>
            {draft.assignment_scope === 'selected' ? <div className="work-assignee-picker">
              <div className="work-assignee-picker-tools"><input value={assigneeQuery} onChange={(event) => setAssigneeQuery(event.target.value)} placeholder="Tìm giáo viên…" /><button type="button" onClick={() => setDraft((current) => ({ ...current, assignee_ids: eligibleTeachers.map((person) => person.id) }))}>Chọn tất cả</button><button type="button" onClick={() => setDraft((current) => ({ ...current, assignee_ids: [] }))}>Bỏ chọn</button></div>
              <div className="work-assignee-grid">{visibleAssigneeChoices.map((person) => {
                const checked = uniqueIds(draft.assignee_ids).includes(person.id);
                return <label key={person.id} className={checked ? 'selected' : ''}><input type="checkbox" checked={checked} onChange={() => toggleAssignee(person.id)} /><span><strong>{person.name}</strong><small>{person.email || person.role || 'Giáo viên'}</small></span></label>;
              })}</div>
              {!visibleAssigneeChoices.length ? <p className="work-assignee-empty">Không tìm thấy giáo viên phù hợp.</p> : null}
            </div> : null}
            {draft.assignment_scope === 'department' ? <p className="work-department-summary">👥 Sẽ tạo {departmentTeachers.length} công việc riêng cho toàn bộ tài khoản trong tổ{currentDepartmentKey ? ' hiện tại' : ''}.</p> : null}
          </section> : null}
          {leader ? <p className="work-delivery-form-note">🔔 Hệ thống gửi thông báo riêng đến từng giáo viên ngay sau khi giao việc.</p> : null}
        </form>

        <section className="v1093-panel">
          <div className="v1093-panel-heading"><div><span>Hộp việc</span><h2>{filtered.length} công việc</h2></div><input className="v1093-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm công việc…" /></div>
          <div className="v1093-task-list">
            {filtered.map((item) => {
              const hasSubmission = item.status === 'submitted' || item.submitted_at;
              return <article key={item.id} className={`v1093-task-card priority-${item.priority}`} onClick={() => setSelectedId(item.id)}>
                <div className="v1093-task-top"><span className={`v1093-status status-${item.status}`}>{STATUS_LABEL[item.status] || item.status}</span><span>{PRIORITY_LABEL[item.priority] || item.priority}</span></div>
                <h3>{item.title}</h3><p>{item.description || 'Chưa có mô tả.'}</p>
                <div className="work-delivery-task-meta"><span>👤 {getAssigneeLabel(item, people, currentUser)}</span>{Number(item.metadata?.assignment_batch_size || 0) > 1 ? <span className="is-bulk">👥 Đợt giao {item.metadata.assignment_batch_index}/{item.metadata.assignment_batch_size}</span> : null}{hasSubmission ? <span className="has-submission">📎 Đã có phản hồi</span> : null}</div>
                <footer><span>Hạn: {formatDate(item.due_at)}</span><div className="work-task-card-actions"><button type="button">Mở chi tiết</button>{leader ? <button type="button" className="delete" disabled={busy} onClick={(event) => { event.stopPropagation(); deleteWorkItems(item, false); }}>Xoá</button> : null}</div></footer>
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
        {leader ? <section className="work-delivery-danger-zone"><div><strong>Xoá công việc đã giao</strong><small>Chỉ Admin/TTCM có quyền xoá. Phản hồi, thông báo và tệp nộp liên quan cũng sẽ được dọn dẹp.</small></div><div><button type="button" disabled={busy} onClick={() => deleteWorkItems(selected, false)}>Xoá công việc này</button>{selected.metadata?.assignment_batch_id && Number(selected.metadata?.assignment_batch_size || 0) > 1 ? <button type="button" className="batch-delete" disabled={busy} onClick={() => deleteWorkItems(selected, true)}>Xoá cả đợt giao ({items.filter((entry) => String(entry.metadata?.assignment_batch_id || '') === String(selected.metadata.assignment_batch_id)).length})</button> : null}</div></section> : null}

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
          {Array.isArray(entry.attachments) && entry.attachments.length ? <div className="work-delivery-attachments">{entry.attachments.map((attachment, index) => {
            const archiveOpen = archiveTarget?.commentId === entry.id && archiveTarget?.attachmentPath === attachment.path;
            const archived = Boolean(attachment.library_resource_id || attachment.archived_to_library_at);
            return <div key={`${entry.id}-${attachment.path || index}`} className={`work-delivery-attachment-row${archived ? ' is-archived' : ''}`}>
              <a href={attachment.signed_url || '#'} target="_blank" rel="noreferrer" className={!attachment.signed_url ? 'disabled' : ''} onClick={(event) => { if (!attachment.signed_url) event.preventDefault(); }}><span>📎</span><strong>{attachment.name || 'Tệp đính kèm'}</strong><small>{formatWorkHubFileSize(attachment.size)}</small></a>
              {leader ? <div className="work-library-archive-actions">{archived ? <><span>✓ Đã lưu vào Kho học liệu</span><button type="button" onClick={() => { window.location.hash = '#/resource-library'; }}>Mở kho</button></> : <button type="button" onClick={() => openResourceArchive(entry, attachment)}>＋ Lưu vào Kho học liệu</button>}</div> : null}
              {leader && archiveOpen && archiveDraft ? <form className="work-library-archive-form" onSubmit={saveAttachmentToResourceLibrary}>
                <div className="work-library-archive-heading"><div><strong>Lưu tệp vào Kho học liệu</strong><small>Tệp được sao chép sang Google Drive, duyệt ngay và chia sẻ cho giáo viên trong tổ.</small></div><button type="button" aria-label="Đóng" onClick={() => { setArchiveTarget(null); setArchiveDraft(null); }}>×</button></div>
                <label><span>Tên tài liệu</span><input value={archiveDraft.title} onChange={(event) => setArchiveDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
                <div className="work-library-archive-grid">
                  <label><span>Danh mục</span><select value={archiveDraft.category} onChange={(event) => setArchiveDraft((current) => ({ ...current, category: event.target.value }))}>{RESOURCE_CATEGORY_FALLBACK.map((category) => <option key={category.slug} value={category.slug}>{category.name_vi}</option>)}</select></label>
                  <label><span>Năm học</span><input value={archiveDraft.schoolYear} onChange={(event) => setArchiveDraft((current) => ({ ...current, schoolYear: event.target.value }))} placeholder="2025–2026" /></label>
                  <label><span>Khối</span><input value={archiveDraft.grade} onChange={(event) => setArchiveDraft((current) => ({ ...current, grade: event.target.value }))} placeholder="10, 11 hoặc 12" /></label>
                  <label><span>Unit / Chủ đề</span><input value={archiveDraft.unitName} onChange={(event) => setArchiveDraft((current) => ({ ...current, unitName: event.target.value }))} placeholder="Unit 3 · Environment" /></label>
                </div>
                <label><span>Mô tả</span><textarea value={archiveDraft.description} onChange={(event) => setArchiveDraft((current) => ({ ...current, description: event.target.value }))} /></label>
                <label><span>Từ khoá</span><input value={archiveDraft.tags} onChange={(event) => setArchiveDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="worksheet, grade-11, unit-3" /></label>
                <div className="work-library-archive-footer"><button type="button" onClick={() => { setArchiveTarget(null); setArchiveDraft(null); }} disabled={archiveBusy}>Huỷ</button><button type="submit" disabled={archiveBusy || !archiveDraft.title.trim()}>{archiveBusy ? 'Đang lưu…' : '✓ Lưu và duyệt học liệu'}</button></div>
              </form> : null}
            </div>;
          })}</div> : null}
          <time>{formatDate(entry.created_at)}</time>
        </article>)}
          {!commentsBusy && !comments.length ? <div className="work-delivery-comments-empty">Chưa có phản hồi.</div> : null}
          <form onSubmit={addComment}><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Phản hồi hoặc hướng dẫn chỉnh sửa…" /><button disabled={busy || !comment.trim()}>Gửi phản hồi</button></form>
        </section>
      </aside>
    </div>}
  </section>;
}
