import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, CircleCheckBig, ExternalLink, FileText, RefreshCw,
  RotateCcw, ShieldCheck, X,
} from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import {
  formatWorkHubFileSize,
  rememberWorkHubItem,
  resolveWorkHubCommentAttachments,
  WORK_HUB_DELIVERY_EVENT,
} from '../utils/workHubDelivery.js';
import { recordAuditEvent } from '../utils/collaborationGovernance.js';

const SOURCE_MODULE = 'brian-team';
const ITEM_COLUMNS = 'id,title,description,status,priority,due_at,assignee_ids,metadata,updated_at,submitted_at,reviewed_at,completed_at';
const COMMENT_COLUMNS = 'id,item_id,author_id,body,comment_type,attachments,created_at';
const TERMINAL_STATUSES = new Set(['completed', 'archived']);

function unique(values = []) {
  return [...new Set((values || []).map(String).filter(Boolean))];
}

function teacherIdOf(item) {
  return String(item?.metadata?.brian_team_assignee_id || item?.assignee_ids?.[0] || '');
}

function statusMeta(status, language = 'vi') {
  const english = language === 'en';
  const labels = {
    draft: english ? 'Draft' : 'Nháp',
    assigned: english ? 'Assigned' : 'Đã giao',
    accepted: english ? 'Accepted' : 'Đã tiếp nhận',
    in_progress: english ? 'In progress' : 'Đang thực hiện',
    submitted: english ? 'Submitted' : 'Đã nộp',
    changes_requested: english ? 'Needs revision' : 'Cần chỉnh sửa',
    approved: english ? 'Approved' : 'Đã phê duyệt',
    completed: english ? 'Completed' : 'Hoàn thành',
    archived: english ? 'Archived' : 'Lưu trữ',
  };
  const tones = {
    draft: 'neutral', assigned: 'neutral', accepted: 'blue', in_progress: 'blue',
    submitted: 'amber', changes_requested: 'red', approved: 'green',
    completed: 'green', archived: 'green',
  };
  return { label: labels[status] || status, tone: tones[status] || 'neutral' };
}

function formatDateTime(value, language = 'vi') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short', timeStyle: 'short',
  }).format(date);
}

function initials(value) {
  const words = String(value || 'GV').trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase() || 'GV';
}

function openWorkItem(itemId) {
  if (itemId) rememberWorkHubItem(itemId);
  window.location.hash = '#/work-hub';
}

async function loadPeople(ids = []) {
  const wanted = unique(ids);
  if (!wanted.length || !supabase) return new Map();
  const attempts = [
    ['id,full_name,email,avatar_url', 'id'],
    ['id,full_name,email', 'id'],
    ['user_id,full_name,email,avatar_url', 'user_id'],
    ['user_id,full_name,email', 'user_id'],
    ['profile_id,full_name,email', 'profile_id'],
  ];
  for (const [columns, key] of attempts) {
    const { data, error } = await supabase.from('profiles').select(columns).in(key, wanted).limit(500);
    if (!error) {
      return new Map((data || []).map((profile) => {
        const id = String(profile.id || profile.user_id || profile.profile_id || '');
        return [id, {
          id,
          name: profile.full_name || profile.name || profile.email || 'Giáo viên',
          email: profile.email || '',
          avatarUrl: profile.avatar_url || '',
        }];
      }).filter(([id]) => id));
    }
    if (!/column .* does not exist|42703/i.test(error.message || '')) break;
  }
  return new Map();
}

function personLabel(person, fallback, language = 'vi') {
  return person?.name || person?.email || fallback || (language === 'en' ? 'Teacher account' : 'Tài khoản giáo viên');
}

export default function BrianTeamDirectReviewBridge({ currentUser, language = 'vi' }) {
  const english = language === 'en';
  const [assignmentId, setAssignmentId] = useState('');
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState([]);
  const [people, setPeople] = useState(new Map());
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const canManage = Boolean(
    currentUser?.id
    && isDepartmentLeaderRole(currentUser.role)
    && isSupabaseConfigured
    && supabase,
  );

  const commentsByItem = useMemo(() => {
    const grouped = new Map();
    comments.forEach((comment) => {
      const bucket = grouped.get(String(comment.item_id)) || [];
      bucket.push(comment);
      grouped.set(String(comment.item_id), bucket);
    });
    grouped.forEach((bucket) => bucket.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)));
    return grouped;
  }, [comments]);

  const summary = useMemo(() => ({
    total: items.length,
    submitted: items.filter((item) => item.status === 'submitted').length,
    revision: items.filter((item) => item.status === 'changes_requested').length,
    approved: items.filter((item) => item.status === 'approved').length,
    completed: items.filter((item) => ['completed', 'archived'].includes(item.status)).length,
  }), [items]);

  const loadAssignment = useCallback(async (targetAssignmentId = assignmentId) => {
    if (!canManage || !targetAssignmentId) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: itemError } = await supabase
        .from('work_hub_items')
        .select(ITEM_COLUMNS)
        .eq('owner_id', currentUser.id)
        .eq('source_module', SOURCE_MODULE)
        .limit(900);
      if (itemError) throw itemError;

      const linkedItems = (data || []).filter((item) => (
        String(item.metadata?.brian_team_assignment_id || '') === String(targetAssignmentId)
      ));
      setItems(linkedItems);

      const itemIds = linkedItems.map((item) => item.id).filter(Boolean);
      let nextComments = [];
      if (itemIds.length) {
        const { data: commentRows, error: commentError } = await supabase
          .from('work_hub_comments')
          .select(COMMENT_COLUMNS)
          .in('item_id', itemIds)
          .order('created_at', { ascending: true });
        if (commentError) throw commentError;
        nextComments = await resolveWorkHubCommentAttachments(commentRows || []);
      }
      setComments(nextComments);

      const personIds = unique([
        ...linkedItems.map(teacherIdOf),
        ...nextComments.map((comment) => comment.author_id),
      ]);
      setPeople(await loadPeople(personIds));
    } catch (loadError) {
      setError(loadError.message || String(loadError));
      setItems([]);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, canManage, currentUser?.id]);

  useEffect(() => {
    if (assignmentId) loadAssignment(assignmentId);
  }, [assignmentId, loadAssignment]);

  const scanAssignmentCards = useCallback(() => {
    const onBrianTeam = window.location.hash.includes('brian-team');
    const articles = [...document.querySelectorAll('.bt-list article')];
    if (!canManage || !onBrianTeam) {
      document.querySelectorAll('.bes-bt-review-trigger').forEach((node) => node.remove());
      return;
    }

    articles.forEach((article) => {
      const progressHost = article.querySelector('.bes-bt-progress-host[data-assignment-id]');
      const stableId = String(progressHost?.dataset.assignmentId || article.dataset.assignmentId || '');
      if (!stableId) return;
      article.dataset.assignmentId = stableId;

      const progressHead = article.querySelector('.bes-bt-progress-head');
      if (!progressHead) return;
      let button = progressHead.querySelector('.bes-bt-review-trigger');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'bes-bt-review-trigger';
        progressHead.appendChild(button);
      }
      button.dataset.assignmentId = stableId;
      const buttonLabel = english ? 'Review here' : 'Duyệt tại đây';
      if (button.textContent !== buttonLabel) button.textContent = buttonLabel;
      button.onclick = () => {
        setNotes({});
        setNotice('');
        setError('');
        setAssignmentId(stableId);
      };
    });
  }, [canManage, english]);

  useEffect(() => {
    scanAssignmentCards();
    const observer = new MutationObserver(scanAssignmentCards);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', scanAssignmentCards);
    window.addEventListener('focus', scanAssignmentCards);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', scanAssignmentCards);
      window.removeEventListener('focus', scanAssignmentCards);
      document.querySelectorAll('.bes-bt-review-trigger').forEach((node) => node.remove());
    };
  }, [scanAssignmentCards]);

  async function writeAudit(item, status, note = '') {
    try {
      await recordAuditEvent({
        action: status === 'changes_requested' ? 'work.review_changes_requested' : `work.${status}`,
        entity_type: 'work_hub_item',
        entity_id: item.id,
        source_module: 'brian-team',
        before_data: item,
        after_data: { ...item, status, review_note: note || null },
      }, currentUser);
    } catch { /* audit logging must not block the review action */ }
  }

  function broadcastRefresh() {
    window.dispatchEvent(new CustomEvent(WORK_HUB_DELIVERY_EVENT));
    window.dispatchEvent(new CustomEvent('bes-work-hub-refresh-requested'));
    window.dispatchEvent(new CustomEvent('bes-brian-team-review-updated'));
  }

  async function updateStatus(item, status) {
    if (!item?.id || busyId) return;
    const note = String(notes[item.id] || '').trim();
    if (status === 'changes_requested' && !note) {
      setError(english ? 'Enter a revision request first.' : 'Vui lòng nhập nội dung cần chỉnh sửa.');
      return;
    }

    setBusyId(item.id);
    setError('');
    setNotice('');
    try {
      if (status === 'changes_requested') {
        const { error: commentError } = await supabase
          .from('work_hub_comments')
          .insert({
            item_id: item.id,
            author_id: currentUser.id,
            body: note,
            comment_type: 'comment',
            attachments: [],
          });
        if (commentError) throw commentError;
      }

      const now = new Date().toISOString();
      const patch = { status, updated_at: now };
      if (status === 'changes_requested' || status === 'approved') patch.reviewed_at = now;
      if (status === 'completed') patch.completed_at = now;

      const { data, error: updateError } = await supabase
        .from('work_hub_items')
        .update(patch)
        .eq('id', item.id)
        .eq('owner_id', currentUser.id)
        .eq('source_module', SOURCE_MODULE)
        .select(ITEM_COLUMNS)
        .single();
      if (updateError) throw updateError;

      setItems((current) => current.map((entry) => entry.id === item.id ? data : entry));
      setNotes((current) => ({ ...current, [item.id]: '' }));
      await writeAudit(item, status, note);
      broadcastRefresh();
      setNotice(status === 'changes_requested'
        ? (english ? 'Revision request sent to the teacher.' : 'Đã gửi yêu cầu chỉnh sửa cho giáo viên.')
        : status === 'approved'
          ? (english ? 'Submission approved.' : 'Đã phê duyệt sản phẩm.')
          : (english ? 'Work marked complete.' : 'Đã đánh dấu hoàn thành.'));
      await loadAssignment(assignmentId);
    } catch (actionError) {
      setError(actionError.message || String(actionError));
    } finally {
      setBusyId('');
    }
  }

  async function approveAllSubmitted() {
    const targets = items.filter((item) => item.status === 'submitted');
    if (!targets.length || busyId) return;
    setBusyId('bulk');
    setError('');
    setNotice('');
    try {
      const now = new Date().toISOString();
      const ids = targets.map((item) => item.id);
      const { error: updateError } = await supabase
        .from('work_hub_items')
        .update({ status: 'approved', reviewed_at: now, updated_at: now })
        .in('id', ids)
        .eq('owner_id', currentUser.id)
        .eq('source_module', SOURCE_MODULE);
      if (updateError) throw updateError;
      for (const item of targets) await writeAudit(item, 'approved');
      broadcastRefresh();
      setNotice(english
        ? `Approved ${targets.length} submitted item(s).`
        : `Đã phê duyệt ${targets.length} sản phẩm đã nộp.`);
      await loadAssignment(assignmentId);
    } catch (actionError) {
      setError(actionError.message || String(actionError));
    } finally {
      setBusyId('');
    }
  }

  if (!canManage) return null;

  const title = items[0]?.title || (english ? 'Direct review' : 'Duyệt trực tiếp');

  return (
    <>
      {assignmentId && (
        <div className="bes-bt-review-layer" onMouseDown={(event) => event.target === event.currentTarget && setAssignmentId('')}>
          <section className="bes-bt-review-modal" role="dialog" aria-modal="true" aria-label={title}>
            <header className="bes-bt-review-modal-head">
              <div>
                <span><ShieldCheck /> {english ? 'BRIAN TEAM REVIEW' : 'DUYỆT TRỰC TIẾP TRONG BRIAN TEAM'}</span>
                <h2>{title}</h2>
                <p>{english
                  ? 'Review submissions, request revisions, approve, or complete each teacher’s work without leaving Brian Team.'
                  : 'Xem bài nộp, yêu cầu chỉnh sửa, phê duyệt hoặc hoàn thành công việc của từng giáo viên mà không cần rời Brian Team.'}</p>
              </div>
              <button type="button" className="bes-bt-review-close" onClick={() => setAssignmentId('')}><X /></button>
            </header>

            <div className="bes-bt-review-summary">
              <span><b>{summary.total}</b><small>{english ? 'Teachers' : 'Giáo viên'}</small></span>
              <span data-tone="amber"><b>{summary.submitted}</b><small>{english ? 'Submitted' : 'Đã nộp'}</small></span>
              <span data-tone="red"><b>{summary.revision}</b><small>{english ? 'Revision' : 'Cần sửa'}</small></span>
              <span data-tone="green"><b>{summary.approved}</b><small>{english ? 'Approved' : 'Đã duyệt'}</small></span>
              <span data-tone="green"><b>{summary.completed}</b><small>{english ? 'Completed' : 'Hoàn thành'}</small></span>
              <button type="button" onClick={approveAllSubmitted} disabled={!summary.submitted || Boolean(busyId)}>
                {busyId === 'bulk' ? <RefreshCw className="spin" /> : <CheckCircle2 />}
                {english ? 'Approve all submitted' : 'Duyệt tất cả đã nộp'}
              </button>
            </div>

            {error && <div className="bes-bt-review-alert is-error">{error}</div>}
            {notice && <div className="bes-bt-review-alert is-success">{notice}</div>}

            <div className="bes-bt-review-body">
              {loading ? (
                <div className="bes-bt-review-loading"><RefreshCw className="spin" /><b>{english ? 'Loading submissions…' : 'Đang tải bài nộp…'}</b></div>
              ) : items.length ? items.map((item) => {
                const teacherId = teacherIdOf(item);
                const person = people.get(teacherId);
                const teacherName = personLabel(person, '', language);
                const meta = statusMeta(item.status, language);
                const itemComments = commentsByItem.get(String(item.id)) || [];
                const submissionComments = itemComments.filter((comment) => (
                  comment.comment_type === 'submission'
                  || (Array.isArray(comment.attachments) && comment.attachments.length)
                ));
                const latestSubmission = submissionComments[submissionComments.length - 1] || null;
                const reviewComments = itemComments.filter((comment) => comment.comment_type !== 'submission');
                const itemBusy = busyId === item.id;
                return (
                  <article key={item.id} className="bes-bt-review-card" data-tone={meta.tone}>
                    <header>
                      <div className="bes-bt-review-person">
                        <i>{person?.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials(teacherName)}</i>
                        <span><b>{teacherName}</b><small>{person?.email || teacherId || '—'}</small></span>
                      </div>
                      <em>{meta.label}</em>
                    </header>

                    <div className="bes-bt-review-context">
                      <p>{item.description || (english ? 'No description.' : 'Không có mô tả.')}</p>
                      <small>{english ? 'Deadline' : 'Hạn'}: {formatDateTime(item.due_at, language)} · {english ? 'Updated' : 'Cập nhật'}: {formatDateTime(item.updated_at, language)}</small>
                    </div>

                    <section className="bes-bt-review-submission">
                      <header><FileText /><b>{english ? 'Latest submission' : 'Bài nộp gần nhất'}</b></header>
                      {latestSubmission ? (
                        <>
                          <p>{latestSubmission.body || (english ? 'Submitted without a note.' : 'Giáo viên nộp bài không kèm ghi chú.')}</p>
                          <small>{formatDateTime(latestSubmission.created_at, language)}</small>
                          {Array.isArray(latestSubmission.attachments) && latestSubmission.attachments.length > 0 && (
                            <div className="bes-bt-review-files">
                              {latestSubmission.attachments.map((file, index) => (
                                <a key={`${file.path || file.name}-${index}`} href={file.signed_url || file.url || '#'} target="_blank" rel="noreferrer">
                                  <FileText /><span><b>{file.name || (english ? 'Attachment' : 'Tệp đính kèm')}</b><small>{formatWorkHubFileSize(file.size)}</small></span><ExternalLink />
                                </a>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="is-muted">{english ? 'No submission has been recorded yet.' : 'Chưa ghi nhận bài nộp hoặc tệp đính kèm.'}</p>
                      )}
                    </section>

                    {reviewComments.length > 0 && (
                      <section className="bes-bt-review-history">
                        <b>{english ? 'Recent discussion' : 'Trao đổi gần đây'}</b>
                        {reviewComments.slice(-3).map((comment) => {
                          const author = comment.author_id === currentUser.id
                            ? (english ? 'You' : 'Bạn')
                            : personLabel(people.get(String(comment.author_id)), english ? 'Teacher' : 'Giáo viên', language);
                          return <p key={comment.id}><span>{author}</span>{comment.body}<small>{formatDateTime(comment.created_at, language)}</small></p>;
                        })}
                      </section>
                    )}

                    <label className="bes-bt-review-note">
                      <span>{english ? 'Revision request' : 'Nội dung cần chỉnh sửa'}</span>
                      <textarea
                        value={notes[item.id] || ''}
                        onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                        placeholder={english ? 'State exactly what the teacher should revise…' : 'Ghi rõ nội dung giáo viên cần chỉnh sửa…'}
                        rows="3"
                      />
                    </label>

                    <footer>
                      <button type="button" onClick={() => openWorkItem(item.id)}><ExternalLink /> {english ? 'Open Work Hub' : 'Mở Work Hub'}</button>
                      <button type="button" className="is-revision" onClick={() => updateStatus(item, 'changes_requested')} disabled={itemBusy || TERMINAL_STATUSES.has(item.status)}>
                        {itemBusy ? <RefreshCw className="spin" /> : <RotateCcw />} {english ? 'Request revision' : 'Yêu cầu chỉnh sửa'}
                      </button>
                      <button type="button" className="is-approve" onClick={() => updateStatus(item, 'approved')} disabled={itemBusy || ['approved', 'completed', 'archived'].includes(item.status)}>
                        {itemBusy ? <RefreshCw className="spin" /> : <CheckCircle2 />} {english ? 'Approve' : 'Phê duyệt'}
                      </button>
                      <button type="button" className="is-complete" onClick={() => updateStatus(item, 'completed')} disabled={itemBusy || TERMINAL_STATUSES.has(item.status)}>
                        {itemBusy ? <RefreshCw className="spin" /> : <CircleCheckBig />} {english ? 'Complete' : 'Hoàn thành'}
                      </button>
                    </footer>
                  </article>
                );
              }) : (
                <div className="bes-bt-review-empty">
                  <ShieldCheck />
                  <h3>{english ? 'No linked Work Hub items' : 'Chưa có công việc Work Hub liên kết'}</h3>
                  <p>{english
                    ? 'Wait for the assignment sync to finish, or verify that every member is linked to an approved teacher account.'
                    : 'Hãy chờ quá trình đồng bộ hoàn tất hoặc kiểm tra từng thành viên đã liên kết với tài khoản giáo viên được duyệt.'}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <style>{`
        .bes-bt-review-trigger{border-color:#697b23!important;background:#2e381e!important;color:#fff!important}
        .bt-list article[data-assignment-id]{scroll-margin-top:120px}
        .bes-bt-review-layer{position:fixed;z-index:120000;inset:0;display:grid;place-items:center;padding:24px;background:rgba(17,23,13,.58);backdrop-filter:blur(10px)}
        .bes-bt-review-modal{display:grid;grid-template-rows:auto auto auto minmax(0,1fr);width:min(1180px,calc(100vw - 28px));max-height:min(920px,calc(100vh - 28px));overflow:hidden;border:1px solid rgba(80,94,43,.2);border-radius:30px;background:#f7f9f2;color:#252c1d;box-shadow:0 34px 100px rgba(19,26,13,.34);font-family:var(--bes-personal-font,inherit)}
        .bes-bt-review-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:25px 28px 20px;background:linear-gradient(135deg,#2b351c,#4a5927);color:#fff}.bes-bt-review-modal-head>div>span{display:flex;align-items:center;gap:8px;font-size:.72rem;font-weight:900;letter-spacing:.12em}.bes-bt-review-modal-head h2{margin:8px 0 5px;font-size:clamp(28px,4vw,48px);line-height:1;letter-spacing:-.045em}.bes-bt-review-modal-head p{max-width:780px;margin:0;color:rgba(255,255,255,.74)}
        .bes-bt-review-close{display:grid;place-items:center;width:44px;height:44px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:rgba(255,255,255,.1);color:#fff}.bes-bt-review-close svg{width:22px;height:22px}
        .bes-bt-review-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr)) auto;gap:9px;padding:14px 20px;border-bottom:1px solid rgba(59,72,37,.12);background:#fff}.bes-bt-review-summary>span{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:14px;background:#f0f3e9}.bes-bt-review-summary>span b{font-size:1.15rem}.bes-bt-review-summary>span small{font-size:.72rem;font-weight:800}.bes-bt-review-summary>span[data-tone="amber"]{background:#fff2cf;color:#75500c}.bes-bt-review-summary>span[data-tone="red"]{background:#ffebe7;color:#8d392f}.bes-bt-review-summary>span[data-tone="green"]{background:#e7f4e2;color:#2f6428}.bes-bt-review-summary>button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 14px;border:0;border-radius:14px;background:#b2c248;color:#202711;font-weight:850}.bes-bt-review-summary>button:disabled{opacity:.45;cursor:default}
        .bes-bt-review-alert{margin:12px 20px 0;padding:11px 14px;border-radius:13px;font-weight:760}.bes-bt-review-alert.is-error{background:#ffebe7;color:#8d392f}.bes-bt-review-alert.is-success{background:#e7f4e2;color:#2f6428}
        .bes-bt-review-body{display:grid;gap:13px;min-height:0;overflow:auto;padding:18px 20px 24px}.bes-bt-review-loading,.bes-bt-review-empty{display:grid;place-items:center;align-content:center;min-height:340px;text-align:center}.bes-bt-review-loading{gap:12px}.bes-bt-review-empty svg{width:48px;height:48px;color:#66772a}.bes-bt-review-empty h3{margin:14px 0 5px}.bes-bt-review-empty p{max-width:620px;margin:0;color:#6d7566}
        .bes-bt-review-card{display:grid;gap:13px;padding:18px;border:1px solid rgba(55,67,38,.13);border-left:6px solid #879279;border-radius:22px;background:#fff;box-shadow:0 9px 28px rgba(34,42,27,.06)}.bes-bt-review-card[data-tone="blue"]{border-left-color:#3978b8}.bes-bt-review-card[data-tone="amber"]{border-left-color:#c58a24}.bes-bt-review-card[data-tone="red"]{border-left-color:#c65a4a}.bes-bt-review-card[data-tone="green"]{border-left-color:#5a934d}.bes-bt-review-card>header{display:flex;align-items:center;justify-content:space-between;gap:16px}.bes-bt-review-person{display:flex;align-items:center;gap:11px}.bes-bt-review-person>i{display:grid;place-items:center;width:46px;height:46px;overflow:hidden;border-radius:15px;background:#edf1df;color:#46521f;font-style:normal;font-weight:900}.bes-bt-review-person img{width:100%;height:100%;object-fit:cover}.bes-bt-review-person>span{display:flex;flex-direction:column}.bes-bt-review-person small{color:#737a6d}.bes-bt-review-card>header>em{padding:7px 10px;border-radius:999px;background:#edf1e6;font-size:.74rem;font-style:normal;font-weight:850}.bes-bt-review-context p{margin:0 0 5px;color:#535b4d}.bes-bt-review-context small{color:#7a8174}
        .bes-bt-review-submission,.bes-bt-review-history{padding:14px;border-radius:16px;background:#f6f8f1}.bes-bt-review-submission>header{display:flex;align-items:center;gap:8px}.bes-bt-review-submission>p{margin:9px 0 5px;white-space:pre-wrap}.bes-bt-review-submission>p.is-muted{color:#747b70}.bes-bt-review-submission>small{color:#7c8377}.bes-bt-review-files{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}.bes-bt-review-files>a{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;padding:10px;border:1px solid rgba(55,67,38,.12);border-radius:13px;background:#fff;color:#303827;text-decoration:none}.bes-bt-review-files>a>span{display:flex;flex-direction:column;min-width:0}.bes-bt-review-files a b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bes-bt-review-files a small{color:#7b8275}
        .bes-bt-review-history{display:grid;gap:7px}.bes-bt-review-history>p{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;margin:0;padding:8px 9px;border-radius:11px;background:#fff}.bes-bt-review-history>p>span{font-weight:850}.bes-bt-review-history>p>small{color:#7a8174}
        .bes-bt-review-note{display:grid;gap:7px}.bes-bt-review-note>span{font-size:.8rem;font-weight:850;color:#596252}.bes-bt-review-note textarea{width:100%;padding:11px 12px;border:1px solid rgba(58,69,42,.16);border-radius:14px;background:#fbfcf9;color:#252c1d;font:inherit;resize:vertical;outline:0}.bes-bt-review-note textarea:focus{border-color:#8ca12c;box-shadow:0 0 0 3px rgba(178,194,72,.18)}
        .bes-bt-review-card>footer{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.bes-bt-review-card>footer button{display:flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:0 12px;border:1px solid rgba(58,69,42,.14);border-radius:12px;background:#f5f7ef;color:#333c28;font-weight:820}.bes-bt-review-card>footer button.is-revision{background:#fff0ed;color:#8e3c31}.bes-bt-review-card>footer button.is-approve{background:#edf5d5;color:#465718}.bes-bt-review-card>footer button.is-complete{background:#e6f4e1;color:#2f6428}.bes-bt-review-card>footer button:disabled{opacity:.45;cursor:default}
        .spin{animation:bes-bt-review-spin 1s linear infinite}@keyframes bes-bt-review-spin{to{transform:rotate(360deg)}}
        @media(max-width:900px){.bes-bt-review-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.bes-bt-review-summary>button{grid-column:1/-1}.bes-bt-review-files{grid-template-columns:1fr}}
        @media(max-width:620px){.bes-bt-review-layer{padding:8px}.bes-bt-review-modal{width:100%;max-height:calc(100vh - 16px);border-radius:22px}.bes-bt-review-modal-head{padding:19px}.bes-bt-review-summary{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}.bes-bt-review-body{padding:12px}.bes-bt-review-history>p{grid-template-columns:1fr}.bes-bt-review-card>footer{display:grid}.bes-bt-review-card>footer button{width:100%}}
      `}</style>
    </>
  );
}
