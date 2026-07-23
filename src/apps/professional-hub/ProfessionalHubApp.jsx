import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/homeroom-complete.css';
import {
  addProfessionalHubMember,
  bootstrapProfessionalHubLeader,
  canUseProfessionalHubCloud,
  createProfessionalHubAnnouncement,
  deactivateProfessionalHubMember,
  deleteProfessionalHubAnnouncement,
  loadProfessionalHubSnapshot,
  markProfessionalHubAnnouncementRead,
  openProfessionalHubSubmission,
  reviewProfessionalHubSubmission,
  submitProfessionalHubDocument,
  subscribeToProfessionalHub,
} from './professionalHubApi.js';
import './professional-hub.css';

const TABS = [
  { key: 'overview', icon: '⌂', vi: 'Tổng quan', en: 'Overview' },
  { key: 'announcements', icon: '●', vi: 'Thông báo', en: 'Notices' },
  { key: 'calendar', icon: '▦', vi: 'Lịch', en: 'Calendar' },
  { key: 'submissions', icon: '⇧', vi: 'Nộp tài liệu', en: 'Submissions' },
  { key: 'members', icon: '◎', vi: 'Thành viên', en: 'Members', leaderOnly: true },
];

const KIND_META = {
  notice: { icon: '●', label: 'Thông báo', tone: 'blue' },
  meeting: { icon: '▦', label: 'Lịch họp', tone: 'green' },
  work: { icon: '✓', label: 'Lịch làm việc', tone: 'orange' },
  submission_request: { icon: '⇧', label: 'Yêu cầu nộp tài liệu', tone: 'purple' },
};

const EMPTY_FORM = {
  kind: 'notice',
  title: '',
  content: '',
  startsAt: '',
  dueAt: '',
  allowResubmit: true,
  recipientIds: [],
};

function userIdOf(user) {
  return user?.id || user?.authId || user?.user_id || '';
}

function roleOf(user) {
  return String(
    user?.role
    || user?.app_metadata?.role
    || user?.user_metadata?.role
    || '',
  ).toLowerCase();
}

function nameOf(user) {
  return user?.name || user?.full_name || user?.display_name || user?.email || 'Tài khoản Brian';
}

function formatDate(value, withTime = true) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isUpcoming(item) {
  const value = item.starts_at || item.due_at;
  return value ? new Date(value).getTime() >= Date.now() : false;
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className={`professional-hub-toast ${message.type || 'success'}`} role="status" aria-live="polite">
      <span>{message.type === 'error' ? '!' : '✓'}</span>
      <b>{message.text}</b>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="hr-panel professional-hub-loading" aria-live="polite">
      <div className="professional-hub-spinner" />
      <div>
        <p>HUB CHUYÊN MÔN</p>
        <h2>Đang đồng bộ thông báo và tài liệu…</h2>
      </div>
    </section>
  );
}

function EmptyState({ icon = '●', title, description, action }) {
  return (
    <section className="hr-panel professional-hub-empty">
      <span className="professional-hub-empty-icon" aria-hidden="true">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action || null}
    </section>
  );
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`professional-hub-pill ${tone}`}>{children}</span>;
}

function AnnouncementCard({
  item,
  unread,
  selected,
  recipientCount,
  submittedCount,
  onOpen,
}) {
  const meta = KIND_META[item.kind] || KIND_META.notice;
  return (
    <button
      type="button"
      className={`professional-hub-announcement-card ${selected ? 'selected' : ''} ${unread ? 'unread' : ''}`}
      onClick={() => onOpen(item)}
    >
      <span className={`professional-hub-card-icon ${meta.tone}`} aria-hidden="true">{meta.icon}</span>
      <span className="professional-hub-card-copy">
        <span className="professional-hub-card-heading">
          <b>{item.title}</b>
          {unread ? <i>Chưa đọc</i> : null}
        </span>
        <small>{meta.label} · {formatDate(item.created_at)}</small>
        <span>{item.content}</span>
        <span className="professional-hub-card-meta">
          {item.starts_at ? <em>Bắt đầu: {formatDate(item.starts_at)}</em> : null}
          {item.due_at ? <em>Hạn: {formatDate(item.due_at)}</em> : null}
          {recipientCount !== undefined ? <em>{recipientCount} người nhận</em> : null}
          {item.requires_submission && submittedCount !== undefined ? <em>{submittedCount} đã nộp</em> : null}
        </span>
      </span>
      <span className="professional-hub-card-arrow">›</span>
    </button>
  );
}

function Tabs({ active, onChange, language, isLeader, unreadCount }) {
  const items = TABS.filter((tab) => !tab.leaderOnly || isLeader);
  return (
    <nav className="hr-tabs professional-hub-tabs" aria-label="Chức năng Hub Chuyên môn">
      {items.map((tab) => (
        <button
          type="button"
          key={tab.key}
          className={active === tab.key ? 'active' : ''}
          onClick={() => onChange(tab.key)}
          aria-current={active === tab.key ? 'page' : undefined}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <b>{language === 'vi' ? tab.vi : tab.en}</b>
          {tab.key === 'announcements' && unreadCount > 0 ? <i>{unreadCount}</i> : null}
        </button>
      ))}
    </nav>
  );
}

function ComposerModal({ members, form, setForm, saving, onClose, onSave }) {
  const teachers = members.filter((member) => member.role === 'teacher' && member.active !== false);
  const allSelected = teachers.length > 0 && teachers.every((member) => form.recipientIds.includes(member.user_id));
  const toggleAll = () => setForm((current) => ({
    ...current,
    recipientIds: allSelected ? [] : teachers.map((member) => member.user_id),
  }));
  const toggleRecipient = (userId) => setForm((current) => ({
    ...current,
    recipientIds: current.recipientIds.includes(userId)
      ? current.recipientIds.filter((id) => id !== userId)
      : [...current.recipientIds, userId],
  }));

  return (
    <div className="professional-hub-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section className="professional-hub-modal" role="dialog" aria-modal="true" aria-labelledby="professional-hub-composer-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>TTCM · GỬI THÔNG BÁO</p>
            <h2 id="professional-hub-composer-title">Tạo nội dung mới</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng">×</button>
        </header>

        <div className="professional-hub-modal-body">
          <label>
            <span>Loại nội dung</span>
            <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}>
              <option value="notice">Thông báo chung</option>
              <option value="meeting">Lịch họp tổ</option>
              <option value="work">Lịch làm việc</option>
              <option value="submission_request">Yêu cầu nộp tài liệu</option>
            </select>
          </label>

          <label>
            <span>Tiêu đề</span>
            <input value={form.title} maxLength={180} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Họp tổ chuyên môn tháng 8" />
          </label>

          <label className="wide">
            <span>Nội dung</span>
            <textarea value={form.content} rows={5} maxLength={3000} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Thông tin giáo viên cần biết hoặc yêu cầu cần thực hiện…" />
          </label>

          <label>
            <span>{form.kind === 'meeting' || form.kind === 'work' ? 'Ngày giờ diễn ra' : 'Ngày giờ bắt đầu (không bắt buộc)'}</span>
            <input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
          </label>

          <label>
            <span>{form.kind === 'submission_request' ? 'Hạn nộp' : 'Hạn phản hồi (không bắt buộc)'}</span>
            <input type="datetime-local" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
          </label>

          {form.kind === 'submission_request' ? (
            <label className="professional-hub-check wide">
              <input type="checkbox" checked={form.allowResubmit} onChange={(event) => setForm((current) => ({ ...current, allowResubmit: event.target.checked }))} />
              <span>Cho phép giáo viên thay file trước khi tài liệu được duyệt</span>
            </label>
          ) : null}

          <fieldset className="professional-hub-recipient-fieldset wide">
            <legend>Người nhận</legend>
            <button type="button" className="professional-hub-select-all" onClick={toggleAll}>
              {allSelected ? 'Bỏ chọn tất cả' : `Chọn toàn bộ giáo viên (${teachers.length})`}
            </button>
            <div className="professional-hub-recipient-grid">
              {teachers.map((member) => (
                <label key={member.user_id}>
                  <input type="checkbox" checked={form.recipientIds.includes(member.user_id)} onChange={() => toggleRecipient(member.user_id)} />
                  <span>
                    <b>{member.display_name || member.email}</b>
                    <small>{member.email}</small>
                  </span>
                </label>
              ))}
            </div>
            {!teachers.length ? <p className="professional-hub-inline-warning">Chưa có giáo viên trong Hub. Hãy thêm thành viên trước.</p> : null}
          </fieldset>
        </div>

        <footer>
          <button type="button" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="button" className="primary" onClick={onSave} disabled={saving || !teachers.length}>
            {saving ? 'Đang gửi…' : `Gửi đến ${form.recipientIds.length} giáo viên`}
          </button>
        </footer>
      </section>
    </div>
  );
}

function DetailDrawer({
  item,
  membership,
  members,
  recipients,
  submissions,
  currentUserId,
  onClose,
  onDelete,
  onSubmit,
  onReview,
  onDownload,
  saving,
}) {
  const isLeader = membership?.role === 'leader';
  const meta = KIND_META[item.kind] || KIND_META.notice;
  const itemRecipients = recipients.filter((row) => row.announcement_id === item.id);
  const itemSubmissions = submissions.filter((row) => row.announcement_id === item.id);
  const ownSubmission = itemSubmissions.find((row) => row.user_id === currentUserId);
  const memberMap = new Map(members.map((member) => [member.user_id, member]));
  const [file, setFile] = useState(null);
  const [note, setNote] = useState(ownSubmission?.note || '');
  const [feedbackById, setFeedbackById] = useState({});

  return (
    <div className="professional-hub-overlay" role="presentation" onMouseDown={onClose}>
      <aside className="professional-hub-drawer" role="dialog" aria-modal="true" aria-labelledby="professional-hub-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>{meta.label.toUpperCase()}</p>
            <h2 id="professional-hub-detail-title">{item.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng">×</button>
        </header>

        <div className="professional-hub-drawer-body">
          <div className="professional-hub-detail-meta">
            <StatusPill tone={meta.tone}>{meta.icon} {meta.label}</StatusPill>
            <span>Gửi lúc {formatDate(item.created_at)}</span>
          </div>
          <p className="professional-hub-detail-content">{item.content}</p>

          {(item.starts_at || item.due_at) ? (
            <div className="professional-hub-time-grid">
              {item.starts_at ? <div><small>Bắt đầu</small><b>{formatDate(item.starts_at)}</b></div> : null}
              {item.due_at ? <div><small>Hạn hoàn thành</small><b>{formatDate(item.due_at)}</b></div> : null}
            </div>
          ) : null}

          {isLeader ? (
            <section className="professional-hub-detail-section">
              <div className="professional-hub-section-title">
                <div><p>TRẠNG THÁI NGƯỜI NHẬN</p><h3>{itemRecipients.length} giáo viên</h3></div>
                <StatusPill tone="green">{itemRecipients.filter((row) => row.read_at).length} đã đọc</StatusPill>
              </div>
              <div className="professional-hub-recipient-status-list">
                {itemRecipients.map((recipient) => {
                  const member = memberMap.get(recipient.user_id);
                  const submission = itemSubmissions.find((row) => row.user_id === recipient.user_id);
                  return (
                    <article key={`${recipient.announcement_id}-${recipient.user_id}`}>
                      <span>{(member?.display_name || member?.email || 'GV').slice(0, 1).toUpperCase()}</span>
                      <div>
                        <b>{member?.display_name || member?.email || 'Giáo viên'}</b>
                        <small>{recipient.read_at ? `Đã đọc ${formatDate(recipient.read_at)}` : 'Chưa đọc'}</small>
                      </div>
                      {item.requires_submission ? (
                        <StatusPill tone={submission?.status === 'approved' ? 'green' : submission ? 'orange' : 'neutral'}>
                          {submission?.status === 'approved' ? 'Đã duyệt' : submission ? 'Đã nộp' : 'Chưa nộp'}
                        </StatusPill>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {item.requires_submission && !isLeader ? (
            <section className="professional-hub-detail-section professional-hub-submit-panel">
              <div className="professional-hub-section-title">
                <div><p>NỘP TÀI LIỆU</p><h3>{ownSubmission ? 'Tài liệu của bạn' : 'Chưa nộp tài liệu'}</h3></div>
                {ownSubmission ? <StatusPill tone={ownSubmission.status === 'approved' ? 'green' : ownSubmission.status === 'needs_revision' ? 'red' : 'orange'}>{ownSubmission.status === 'approved' ? 'Đã duyệt' : ownSubmission.status === 'needs_revision' ? 'Cần bổ sung' : 'Đã nộp'}</StatusPill> : null}
              </div>

              {ownSubmission ? (
                <div className="professional-hub-file-row">
                  <div><b>{ownSubmission.file_name}</b><small>{formatBytes(ownSubmission.file_size)} · {formatDate(ownSubmission.submitted_at)}</small></div>
                  <button type="button" onClick={() => onDownload(ownSubmission.file_path)}>Mở file</button>
                </div>
              ) : null}

              {ownSubmission?.feedback ? <div className="professional-hub-feedback"><b>Phản hồi của TTCM</b><p>{ownSubmission.feedback}</p></div> : null}

              {ownSubmission?.status !== 'approved' && (!ownSubmission || item.allow_resubmit) ? (
                <div className="professional-hub-upload-form">
                  <label><span>{ownSubmission ? 'Chọn file thay thế' : 'Chọn file'}</span><input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
                  <label><span>Ghi chú</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú thêm cho TTCM…" /></label>
                  <button type="button" className="primary" disabled={saving || !file} onClick={() => onSubmit({ file, note })}>{saving ? 'Đang nộp…' : ownSubmission ? 'Thay file và nộp lại' : 'Nộp tài liệu'}</button>
                </div>
              ) : null}
            </section>
          ) : null}

          {item.requires_submission && isLeader ? (
            <section className="professional-hub-detail-section">
              <div className="professional-hub-section-title"><div><p>BÀI ĐÃ NỘP</p><h3>{itemSubmissions.length}/{itemRecipients.length} giáo viên</h3></div></div>
              <div className="professional-hub-submission-review-list">
                {itemSubmissions.map((submission) => {
                  const member = memberMap.get(submission.user_id);
                  return (
                    <article key={submission.id}>
                      <div className="professional-hub-file-row">
                        <div><b>{member?.display_name || member?.email || 'Giáo viên'}</b><small>{submission.file_name} · {formatBytes(submission.file_size)} · {formatDate(submission.submitted_at)}</small></div>
                        <button type="button" onClick={() => onDownload(submission.file_path)}>Mở file</button>
                      </div>
                      {submission.note ? <p className="professional-hub-submission-note">“{submission.note}”</p> : null}
                      <textarea rows={2} value={feedbackById[submission.id] ?? submission.feedback ?? ''} onChange={(event) => setFeedbackById((current) => ({ ...current, [submission.id]: event.target.value }))} placeholder="Phản hồi cho giáo viên…" />
                      <div className="professional-hub-review-actions">
                        <button type="button" onClick={() => onReview(submission.id, 'needs_revision', feedbackById[submission.id] ?? submission.feedback ?? '')} disabled={saving}>Yêu cầu bổ sung</button>
                        <button type="button" className="primary" onClick={() => onReview(submission.id, 'approved', feedbackById[submission.id] ?? submission.feedback ?? '')} disabled={saving}>Duyệt tài liệu</button>
                      </div>
                    </article>
                  );
                })}
                {!itemSubmissions.length ? <p className="professional-hub-muted">Chưa có giáo viên nộp tài liệu.</p> : null}
              </div>
            </section>
          ) : null}
        </div>

        <footer>
          {isLeader ? <button type="button" className="danger" onClick={() => onDelete(item.id)} disabled={saving}>Xóa thông báo</button> : <span />}
          <button type="button" onClick={onClose}>Đóng</button>
        </footer>
      </aside>
    </div>
  );
}

export default function ProfessionalHubApp({ language = 'vi', currentUser }) {
  const userId = userIdOf(currentUser);
  const currentRole = roleOf(currentUser);
  const canBootstrap = ['admin', 'ttcm', 'department_leader', 'head', 'leader'].includes(currentRole);
  const [activeTab, setActiveTab] = useState('overview');
  const [snapshot, setSnapshot] = useState({ membership: null, members: [], announcements: [], recipients: [], submissions: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fatalError, setFatalError] = useState('');
  const [toast, setToast] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const toastTimer = useRef(null);

  const flash = useCallback((text, type = 'success') => {
    setToast({ text, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!userId || !canUseProfessionalHubCloud()) {
      setLoading(false);
      setFatalError(!userId ? 'Không xác định được tài khoản Brian.' : 'Supabase chưa được cấu hình cho Brian.');
      return;
    }
    if (!silent) setLoading(true);
    try {
      const next = await loadProfessionalHubSnapshot(userId);
      setSnapshot(next);
      setFatalError('');
    } catch (error) {
      setFatalError(error.message || 'Không thể mở Hub Chuyên môn.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!snapshot.membership) return undefined;
    return subscribeToProfessionalHub({
      userId,
      onChange: () => refresh({ silent: true }),
      onRecipient: () => {
        flash('Bạn vừa nhận được thông báo mới từ TTCM.');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Hub Chuyên môn', { body: 'Bạn vừa nhận được thông báo mới từ TTCM.' });
        }
      },
    });
  }, [snapshot.membership, userId, refresh, flash]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const isLeader = snapshot.membership?.role === 'leader';
  const ownRecipients = useMemo(() => snapshot.recipients.filter((row) => row.user_id === userId), [snapshot.recipients, userId]);
  const recipientMap = useMemo(() => new Map(ownRecipients.map((row) => [row.announcement_id, row])), [ownRecipients]);
  const unreadCount = useMemo(() => ownRecipients.filter((row) => !row.read_at).length, [ownRecipients]);
  const selected = snapshot.announcements.find((item) => item.id === selectedId) || null;
  const teacherMembers = snapshot.members.filter((member) => member.role === 'teacher' && member.active !== false);

  const stats = useMemo(() => {
    const upcoming = snapshot.announcements.filter(isUpcoming).length;
    if (isLeader) {
      const requests = snapshot.announcements.filter((item) => item.requires_submission);
      const totalExpected = requests.reduce((total, item) => total + snapshot.recipients.filter((row) => row.announcement_id === item.id).length, 0);
      const totalSubmitted = snapshot.submissions.filter((row) => requests.some((item) => item.id === row.announcement_id)).length;
      return [
        [String(snapshot.announcements.length), 'Thông báo đã gửi', 'Toàn bộ nội dung của tổ'],
        [String(upcoming), 'Lịch sắp tới', 'Họp và công việc chưa diễn ra'],
        [String(Math.max(0, totalExpected - totalSubmitted)), 'Chưa nộp tài liệu', `${totalSubmitted}/${totalExpected} lượt đã nộp`],
        [String(teacherMembers.length), 'Giáo viên', 'Thành viên đang hoạt động'],
      ];
    }
    const requests = snapshot.announcements.filter((item) => item.requires_submission);
    const ownSubmissionIds = new Set(snapshot.submissions.filter((row) => row.user_id === userId).map((row) => row.announcement_id));
    return [
      [String(unreadCount), 'Thông báo chưa đọc', unreadCount ? 'Cần xem ngay' : 'Đã đọc đầy đủ'],
      [String(upcoming), 'Lịch sắp tới', 'Họp và công việc của tổ'],
      [String(requests.filter((item) => !ownSubmissionIds.has(item.id)).length), 'Tài liệu chưa nộp', 'Theo yêu cầu của TTCM'],
      [String(snapshot.submissions.filter((row) => row.user_id === userId && row.status === 'approved').length), 'Đã được duyệt', 'Tài liệu hoàn thành'],
    ];
  }, [snapshot, isLeader, teacherMembers.length, unreadCount, userId]);

  const openAnnouncement = async (item) => {
    setSelectedId(item.id);
    const recipient = recipientMap.get(item.id);
    if (!isLeader && recipient && !recipient.read_at) {
      try {
        await markProfessionalHubAnnouncementRead(item.id);
        await refresh({ silent: true });
      } catch (error) {
        flash(error.message || 'Không đánh dấu được trạng thái đã đọc.', 'error');
      }
    }
  };

  const openComposer = () => {
    setForm({ ...EMPTY_FORM, recipientIds: teacherMembers.map((member) => member.user_id) });
    setComposerOpen(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createProfessionalHubAnnouncement(form, userId);
      setComposerOpen(false);
      setForm(EMPTY_FORM);
      await refresh({ silent: true });
      flash('Đã gửi thông báo đến giáo viên.');
    } catch (error) {
      flash(error.message || 'Không thể gửi thông báo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBootstrap = async () => {
    setSaving(true);
    try {
      await bootstrapProfessionalHubLeader(nameOf(currentUser));
      await refresh();
      flash('Đã khởi tạo Hub và phân quyền TTCM cho tài khoản này.');
    } catch (error) {
      flash(error.message || 'Không thể khởi tạo Hub.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) return;
    setSaving(true);
    try {
      await addProfessionalHubMember(memberEmail, 'teacher');
      setMemberEmail('');
      await refresh({ silent: true });
      flash('Đã thêm giáo viên vào Hub.');
    } catch (error) {
      flash(error.message || 'Không thể thêm giáo viên.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateMember = async (targetUserId) => {
    if (!window.confirm('Gỡ giáo viên này khỏi Hub Chuyên môn?')) return;
    setSaving(true);
    try {
      await deactivateProfessionalHubMember(targetUserId);
      await refresh({ silent: true });
      flash('Đã gỡ giáo viên khỏi Hub.');
    } catch (error) {
      flash(error.message || 'Không thể gỡ giáo viên.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async ({ file, note }) => {
    if (!selected) return;
    setSaving(true);
    try {
      await submitProfessionalHubDocument({ announcement: selected, userId, file, note });
      await refresh({ silent: true });
      flash('Đã nộp tài liệu cho TTCM.');
    } catch (error) {
      flash(error.message || 'Không thể nộp tài liệu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (submissionId, status, feedback) => {
    setSaving(true);
    try {
      await reviewProfessionalHubSubmission(submissionId, status, feedback, userId);
      await refresh({ silent: true });
      flash(status === 'approved' ? 'Đã duyệt tài liệu.' : 'Đã yêu cầu giáo viên bổ sung.');
    } catch (error) {
      flash(error.message || 'Không thể cập nhật bài nộp.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (announcementId) => {
    if (!window.confirm('Xóa thông báo này? Các trạng thái đã đọc và bài nộp liên quan cũng sẽ bị xóa.')) return;
    setSaving(true);
    try {
      await deleteProfessionalHubAnnouncement(announcementId);
      setSelectedId('');
      await refresh({ silent: true });
      flash('Đã xóa thông báo.');
    } catch (error) {
      flash(error.message || 'Không thể xóa thông báo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (filePath) => {
    try {
      await openProfessionalHubSubmission(filePath);
    } catch (error) {
      flash(error.message || 'Không thể mở file.', 'error');
    }
  };

  const enableBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') {
      flash('Trình duyệt này không hỗ trợ thông báo hệ thống.', 'error');
      return;
    }
    const result = await Notification.requestPermission();
    flash(result === 'granted' ? 'Đã bật thông báo trình duyệt.' : 'Quyền thông báo chưa được cấp.', result === 'granted' ? 'success' : 'error');
  };

  if (loading) return <div className="page hr-page professional-hub-page"><LoadingState /></div>;

  if (fatalError) {
    return (
      <div className="page hr-page professional-hub-page">
        <section className="hr-hero professional-hub-hero">
          <div className="hr-hero-copy"><p>PROFESSIONAL HUB · MINIMAL MVP</p><h1>Hub Chuyên môn</h1><span>Thông báo, lịch làm việc và nộp tài liệu</span></div>
          <div className="hr-hero-art" aria-hidden="true"><div className="hr-board professional-hub-board"><i /><i /><i /><b>HUB</b></div><span className="hr-person p1" /><span className="hr-person p2" /><span className="hr-person p3" /></div>
          <aside className="hr-hero-meta"><span className="hr-sync local"><i />Chưa kết nối dữ liệu</span><b>{nameOf(currentUser)}</b><small>{currentUser?.email || ''}</small></aside>
        </section>
        <EmptyState icon="!" title="Chưa thể mở Hub Chuyên môn" description={fatalError} action={<button type="button" className="primary" onClick={() => refresh()}>Thử lại</button>} />
      </div>
    );
  }

  if (!snapshot.membership) {
    return (
      <div className="page hr-page professional-hub-page">
        <section className="hr-hero professional-hub-hero">
          <div className="hr-hero-copy"><p>PROFESSIONAL HUB · MINIMAL MVP</p><h1>Hub Chuyên môn</h1><span>Thông báo, lịch làm việc và nộp tài liệu</span></div>
          <div className="hr-hero-art" aria-hidden="true"><div className="hr-board professional-hub-board"><i /><i /><i /><b>HUB</b></div><span className="hr-person p1" /><span className="hr-person p2" /><span className="hr-person p3" /></div>
          <aside className="hr-hero-meta"><span className="hr-sync local"><i />Chưa tham gia Hub</span><b>{nameOf(currentUser)}</b><small>{currentUser?.email || ''}</small></aside>
        </section>
        <EmptyState
          icon="◎"
          title={canBootstrap ? 'Hub chưa có TTCM' : 'Bạn chưa được thêm vào Hub'}
          description={canBootstrap ? 'Tài khoản quản trị có thể khởi tạo Hub tối giản và trở thành TTCM đầu tiên.' : 'TTCM cần thêm email tài khoản Brian của bạn vào danh sách thành viên.'}
          action={canBootstrap ? <button type="button" className="primary" onClick={handleBootstrap} disabled={saving}>{saving ? 'Đang khởi tạo…' : 'Khởi tạo Hub tối giản'}</button> : null}
        />
        <Toast message={toast} />
      </div>
    );
  }

  const displayedAnnouncements = activeTab === 'calendar'
    ? snapshot.announcements.filter((item) => item.starts_at || item.due_at).sort((a, b) => new Date(a.starts_at || a.due_at) - new Date(b.starts_at || b.due_at))
    : activeTab === 'submissions'
      ? snapshot.announcements.filter((item) => item.requires_submission)
      : snapshot.announcements;

  return (
    <div className="page hr-page professional-hub-page" data-role={snapshot.membership.role}>
      <section className="hr-hero professional-hub-hero">
        <div className="hr-hero-copy">
          <p>PROFESSIONAL HUB · MINIMAL MVP</p>
          <h1>{language === 'vi' ? 'Hub Chuyên môn' : 'Professional Hub'}</h1>
          <span>{isLeader ? 'Gửi thông báo, lịch làm việc và nhận tài liệu từ giáo viên' : 'Nhận thông báo và nộp tài liệu cho TTCM'}</span>
        </div>
        <div className="hr-hero-art" aria-hidden="true"><div className="hr-board professional-hub-board"><i /><i /><i /><b>HUB</b></div><span className="hr-person p1" /><span className="hr-person p2" /><span className="hr-person p3" /></div>
        <aside className="hr-hero-meta">
          <span className="hr-sync cloud"><i />Đồng bộ Supabase Realtime</span>
          <b>{snapshot.membership.display_name || nameOf(currentUser)}</b>
          <small>{snapshot.membership.email || currentUser?.email || ''}</small>
          <span className="hrc-offline-badge">{isLeader ? 'Vai trò TTCM' : 'Vai trò Giáo viên'}</span>
        </aside>
      </section>

      <Tabs active={activeTab} onChange={setActiveTab} language={language} isLeader={isLeader} unreadCount={unreadCount} />
      <Toast message={toast} />
      {saving ? <div className="hr-saving-strip"><i />Đang đồng bộ Hub Chuyên môn…</div> : null}

      <main className="hr-workspace-body professional-hub-workspace">
        {activeTab === 'overview' ? (
          <>
            <section className="professional-hub-stat-grid">
              {stats.map(([value, label, detail]) => (
                <article className="hr-panel professional-hub-stat" key={label}><strong>{value}</strong><b>{label}</b><span>{detail}</span></article>
              ))}
            </section>

            <section className="professional-hub-overview-grid">
              <div className="hr-panel professional-hub-stream-panel">
                <div className="professional-hub-section-title">
                  <div><p>HOẠT ĐỘNG GẦN ĐÂY</p><h2>Dòng thông báo chuyên môn</h2></div>
                  {isLeader ? <button type="button" className="primary" onClick={openComposer}>＋ Tạo thông báo</button> : null}
                </div>
                <div className="professional-hub-announcement-list">
                  {snapshot.announcements.slice(0, 6).map((item) => (
                    <AnnouncementCard
                      key={item.id}
                      item={item}
                      unread={!isLeader && !recipientMap.get(item.id)?.read_at}
                      selected={selectedId === item.id}
                      recipientCount={isLeader ? snapshot.recipients.filter((row) => row.announcement_id === item.id).length : undefined}
                      submittedCount={isLeader ? snapshot.submissions.filter((row) => row.announcement_id === item.id).length : undefined}
                      onOpen={openAnnouncement}
                    />
                  ))}
                  {!snapshot.announcements.length ? <EmptyState icon="●" title="Chưa có thông báo" description={isLeader ? 'Tạo thông báo đầu tiên cho giáo viên trong tổ.' : 'Thông báo của TTCM sẽ xuất hiện tại đây.'} /> : null}
                </div>
              </div>

              <aside className="hr-panel professional-hub-side-panel">
                <p className="professional-hub-kicker">TÀI KHOẢN & THÔNG BÁO</p>
                <h2>{isLeader ? `${teacherMembers.length} giáo viên trong Hub` : `${unreadCount} thông báo chưa đọc`}</h2>
                <div className="professional-hub-account-lines">
                  <span><small>Vai trò</small><b>{isLeader ? 'TTCM' : 'Giáo viên'}</b></span>
                  <span><small>Email</small><b>{snapshot.membership.email}</b></span>
                  <span><small>Trạng thái</small><b>Đang hoạt động</b></span>
                </div>
                {typeof Notification !== 'undefined' && Notification.permission !== 'granted' ? <button type="button" onClick={enableBrowserNotifications}>Bật thông báo trình duyệt</button> : null}
                {isLeader ? <button type="button" onClick={() => setActiveTab('members')}>Quản lý thành viên</button> : null}
              </aside>
            </section>
          </>
        ) : null}

        {['announcements', 'calendar', 'submissions'].includes(activeTab) ? (
          <section className="hr-panel professional-hub-list-panel">
            <div className="professional-hub-section-title">
              <div>
                <p>{activeTab === 'calendar' ? 'LỊCH CHUYÊN MÔN' : activeTab === 'submissions' ? 'YÊU CẦU NỘP TÀI LIỆU' : 'TẤT CẢ THÔNG BÁO'}</p>
                <h2>{activeTab === 'calendar' ? 'Các mốc sắp tới' : activeTab === 'submissions' ? (isLeader ? 'Theo dõi bài nộp' : 'Tài liệu cần nộp') : 'Dòng thông báo của tổ'}</h2>
              </div>
              {isLeader ? <button type="button" className="primary" onClick={openComposer}>＋ Tạo mới</button> : null}
            </div>
            <div className="professional-hub-announcement-list">
              {displayedAnnouncements.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  unread={!isLeader && !recipientMap.get(item.id)?.read_at}
                  selected={selectedId === item.id}
                  recipientCount={isLeader ? snapshot.recipients.filter((row) => row.announcement_id === item.id).length : undefined}
                  submittedCount={isLeader ? snapshot.submissions.filter((row) => row.announcement_id === item.id).length : undefined}
                  onOpen={openAnnouncement}
                />
              ))}
              {!displayedAnnouncements.length ? <EmptyState icon={activeTab === 'calendar' ? '▦' : activeTab === 'submissions' ? '⇧' : '●'} title="Chưa có nội dung" description="Nội dung phù hợp sẽ xuất hiện tại đây." /> : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'members' && isLeader ? (
          <section className="professional-hub-member-layout">
            <div className="hr-panel professional-hub-member-add">
              <p className="professional-hub-kicker">THÊM GIÁO VIÊN</p>
              <h2>Dùng email tài khoản Brian</h2>
              <p>Giáo viên phải đăng ký tài khoản Brian trước khi được thêm vào Hub.</p>
              <div><input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="giaovien@truong.edu.vn" /><button type="button" className="primary" onClick={handleAddMember} disabled={saving || !memberEmail.trim()}>Thêm vào Hub</button></div>
            </div>
            <div className="hr-panel professional-hub-member-list-panel">
              <div className="professional-hub-section-title"><div><p>THÀNH VIÊN ĐANG HOẠT ĐỘNG</p><h2>{snapshot.members.length} tài khoản</h2></div></div>
              <div className="professional-hub-member-list">
                {snapshot.members.map((member) => (
                  <article key={member.user_id}>
                    <span>{(member.display_name || member.email || 'U').slice(0, 1).toUpperCase()}</span>
                    <div><b>{member.display_name || member.email}</b><small>{member.email}</small></div>
                    <StatusPill tone={member.role === 'leader' ? 'purple' : 'blue'}>{member.role === 'leader' ? 'TTCM' : 'Giáo viên'}</StatusPill>
                    {member.role === 'teacher' ? <button type="button" className="danger" onClick={() => handleDeactivateMember(member.user_id)} disabled={saving}>Gỡ</button> : null}
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      {composerOpen ? <ComposerModal members={snapshot.members} form={form} setForm={setForm} saving={saving} onClose={() => setComposerOpen(false)} onSave={handleCreate} /> : null}
      {selected ? <DetailDrawer item={selected} membership={snapshot.membership} members={snapshot.members} recipients={snapshot.recipients} submissions={snapshot.submissions} currentUserId={userId} onClose={() => setSelectedId('')} onDelete={handleDelete} onSubmit={handleSubmit} onReview={handleReview} onDownload={handleDownload} saving={saving} /> : null}
    </div>
  );
}
