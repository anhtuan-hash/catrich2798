import React, { useEffect, useMemo, useState } from 'react';
import './StudentSupportForms.css';
import {
  CASE_TRANSITIONS,
  appendCaseEvent,
  createFamilyContact,
  createSupportAction,
  createSupportCase,
  createSupportNote,
  transitionSupportCase,
  updateSupportAction,
} from '../../studentSupport/studentSupportApi.js';
import { archiveSupportCase } from '../../studentSupport/studentSupportArchive.js';
import {
  listCaseActions,
  listCaseEvents,
  listCaseNotes,
  listFamilyContacts,
} from '../../studentSupport/studentSupportQueries.js';
import { loadStudent360Facts } from '../../studentSupport/studentSupportSources.js';
import { validateActionInput, validateCaseInput } from '../../studentSupport/studentSupportValidation.js';

const CASE_CATEGORIES = [
  ['ATTENDANCE', 'Chuyên cần', 'Attendance'],
  ['LEARNING', 'Học tập', 'Learning'],
  ['ROUTINE', 'Nề nếp', 'Routine'],
  ['TASK_COMPLETION', 'Hoàn thành nhiệm vụ', 'Task completion'],
  ['FAMILY_COORDINATION', 'Phối hợp gia đình', 'Family coordination'],
  ['LEARNING_SUPPORT', 'Hỗ trợ học tập', 'Learning support'],
  ['OTHER', 'Khác', 'Other'],
];

function fmt(value, language) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'short', timeStyle: value.includes?.('T') ? 'short' : undefined }).format(date);
}

async function settle(loader) {
  try { return { rows: await loader(), error: '' }; }
  catch (error) { return { rows: [], error: error?.message || String(error) }; }
}

export default function StudentSupportCaseManager({
  cases = [],
  studentRef = '',
  workspaceId = '',
  currentUser = null,
  databasePending = false,
  language = 'vi',
  onCaseCreated,
  onCaseUpdated,
}) {
  const vi = language === 'vi';
  const [student, setStudent] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [createForm, setCreateForm] = useState({ category: 'ATTENDANCE', title: '', reason: '', goal: '', followUpAt: '' });
  const [actionForm, setActionForm] = useState({ title: '', description: '', dueAt: '' });
  const [noteForm, setNoteForm] = useState({ body: '', visibilityScope: 'HOMEROOM' });
  const [contactForm, setContactForm] = useState({ contactMethod: 'Điện thoại', contactStatus: 'Đã trao đổi', summary: '', followUpRequired: false });
  const [actions, setActions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [detailErrors, setDetailErrors] = useState({});
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const visibleCases = useMemo(() => cases.filter((row) => !row.archived_at && (!filterStatus || row.status === filterStatus)), [cases, filterStatus]);
  const selectedCase = useMemo(() => cases.find((row) => row.id === selectedId && !row.archived_at) || null, [cases, selectedId]);

  useEffect(() => {
    if (!studentRef || !workspaceId) {
      setStudent(null);
      return undefined;
    }
    let alive = true;
    loadStudent360Facts({ student: { studentRef }, workspaceId })
      .then((facts) => { if (alive) setStudent(facts.student); })
      .catch(() => { if (alive) setStudent({ studentRef, workspaceId }); });
    return () => { alive = false; };
  }, [studentRef, workspaceId]);

  useEffect(() => {
    if (selectedId && !cases.some((row) => row.id === selectedId && !row.archived_at)) setSelectedId('');
  }, [cases, selectedId]);

  useEffect(() => {
    if (!selectedCase || databasePending) {
      setActions([]); setNotes([]); setContacts([]); setEvents([]); setDetailErrors({});
      return undefined;
    }
    let alive = true;
    Promise.all([
      settle(() => listCaseActions(selectedCase.id)),
      settle(() => listCaseNotes(selectedCase.id)),
      settle(() => listFamilyContacts(selectedCase.id)),
      settle(() => listCaseEvents(selectedCase.id)),
    ]).then(([a, n, c, e]) => {
      if (!alive) return;
      setActions(a.rows); setNotes(n.rows); setContacts(c.rows); setEvents(e.rows);
      setDetailErrors({ actions: a.error, notes: n.error, contacts: c.error, events: e.error });
    });
    return () => { alive = false; };
  }, [selectedCase?.id, databasePending]);

  function patchForm(setter, key, value) {
    setter((current) => ({ ...current, [key]: value }));
  }

  function guardWrite() {
    setMessage(''); setError('');
    if (databasePending) {
      setError(vi ? 'Database Student Support chưa được kích hoạt.' : 'Student Support database is not active.');
      return false;
    }
    if (!currentUser?.id) {
      setError(vi ? 'Cần đăng nhập để thao tác.' : 'Sign in to continue.');
      return false;
    }
    return true;
  }

  async function submitCase(event) {
    event.preventDefault();
    if (!guardWrite()) return;
    setBusy('case');
    try {
      const payload = validateCaseInput({
        studentRef,
        workspaceId,
        className: student?.className,
        schoolYear: student?.schoolYear,
        ...createForm,
      });
      const row = await createSupportCase(payload, currentUser);
      setCreateForm({ category: 'ATTENDANCE', title: '', reason: '', goal: '', followUpAt: '' });
      setSelectedId(row.id);
      onCaseCreated?.(row);
      setMessage(vi ? 'Đã tạo hồ sơ hỗ trợ.' : 'Support case created.');
    } catch (nextError) {
      setError(nextError?.message || (vi ? 'Không thể tạo hồ sơ.' : 'Unable to create case.'));
    } finally { setBusy(''); }
  }

  async function changeCaseStatus(nextStatus) {
    if (!selectedCase || !guardWrite()) return;
    setBusy('status');
    try {
      const row = await transitionSupportCase(selectedCase.id, nextStatus, currentUser);
      onCaseUpdated?.(row);
      setMessage(vi ? 'Đã cập nhật trạng thái hồ sơ.' : 'Case status updated.');
    } catch (nextError) { setError(nextError?.message || String(nextError)); }
    finally { setBusy(''); }
  }

  async function archiveCase() {
    if (!selectedCase || !guardWrite()) return;
    if (!window.confirm(vi ? 'Đưa hồ sơ này vào Quản trị dữ liệu? Có thể khôi phục sau.' : 'Archive this case to Data Governance? It can be restored later.')) return;
    setBusy('archive');
    try {
      const row = await archiveSupportCase(selectedCase.id, currentUser);
      onCaseUpdated?.(row);
      setSelectedId('');
      setMessage(vi ? 'Đã lưu trữ hồ sơ. Khôi phục tại Quản trị dữ liệu.' : 'Case archived. Restore it from Data Governance.');
    } catch (nextError) { setError(nextError?.message || String(nextError)); }
    finally { setBusy(''); }
  }

  async function submitAction(event) {
    event.preventDefault();
    if (!selectedCase || !guardWrite()) return;
    setBusy('action');
    try {
      const payload = validateActionInput({
        caseId: selectedCase.id,
        studentRef: selectedCase.student_ref,
        workspaceId: selectedCase.homeroom_workspace_id,
        ...actionForm,
      });
      const row = await createSupportAction(payload, currentUser);
      await appendCaseEvent({ caseId: selectedCase.id, studentRef: selectedCase.student_ref, workspaceId: selectedCase.homeroom_workspace_id, eventType: 'ACTION_CREATED', metadata: { action_id: row.id, status: row.status } }, currentUser);
      setActions((items) => [...items, row]);
      setActionForm({ title: '', description: '', dueAt: '' });
      setMessage(vi ? 'Đã thêm hoạt động hỗ trợ.' : 'Support action added.');
    } catch (nextError) { setError(nextError?.message || String(nextError)); }
    finally { setBusy(''); }
  }

  async function setActionStatus(action, status) {
    if (!guardWrite()) return;
    setBusy(`action-${action.id}`);
    try {
      const row = await updateSupportAction(action.id, { status }, currentUser);
      await appendCaseEvent({ caseId: selectedCase.id, studentRef: selectedCase.student_ref, workspaceId: selectedCase.homeroom_workspace_id, eventType: 'ACTION_STATUS_CHANGED', metadata: { action_id: row.id, status: row.status } }, currentUser);
      setActions((items) => items.map((item) => item.id === row.id ? row : item));
    } catch (nextError) { setError(nextError?.message || String(nextError)); }
    finally { setBusy(''); }
  }

  async function submitNote(event) {
    event.preventDefault();
    if (!selectedCase || !guardWrite()) return;
    if (!noteForm.body.trim()) { setError(vi ? 'Ghi chú không được để trống.' : 'Note cannot be empty.'); return; }
    setBusy('note');
    try {
      const row = await createSupportNote({
        caseId: selectedCase.id,
        studentRef: selectedCase.student_ref,
        workspaceId: selectedCase.homeroom_workspace_id,
        body: noteForm.body,
        visibilityScope: noteForm.visibilityScope,
      }, currentUser);
      await appendCaseEvent({ caseId: selectedCase.id, studentRef: selectedCase.student_ref, workspaceId: selectedCase.homeroom_workspace_id, eventType: 'NOTE_CREATED', metadata: { note_id: row.id, visibility_scope: row.visibility_scope } }, currentUser);
      setNotes((items) => [...items, row]);
      setNoteForm((current) => ({ ...current, body: '' }));
    } catch (nextError) { setError(nextError?.message || String(nextError)); }
    finally { setBusy(''); }
  }

  async function submitContact(event) {
    event.preventDefault();
    if (!selectedCase || !guardWrite()) return;
    setBusy('contact');
    try {
      const row = await createFamilyContact({
        caseId: selectedCase.id,
        studentRef: selectedCase.student_ref,
        workspaceId: selectedCase.homeroom_workspace_id,
        ...contactForm,
      }, currentUser);
      await appendCaseEvent({ caseId: selectedCase.id, studentRef: selectedCase.student_ref, workspaceId: selectedCase.homeroom_workspace_id, eventType: 'FAMILY_CONTACT_LOGGED', metadata: { contact_id: row.id, contact_method: row.contact_method, contact_status: row.contact_status } }, currentUser);
      setContacts((items) => [...items, row]);
      setContactForm((current) => ({ ...current, summary: '', followUpRequired: false }));
    } catch (nextError) { setError(nextError?.message || String(nextError)); }
    finally { setBusy(''); }
  }

  return (
    <section className="student-support-case-manager">
      <div className="student-support-case-layout">
        <aside className="student-support-case-list">
          <div className="student-support-case-list-head">
            <div><strong>{vi ? 'Hồ sơ hỗ trợ' : 'Support cases'}</strong><span>{visibleCases.length}</span></div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">{vi ? 'Tất cả trạng thái' : 'All statuses'}</option>
              {Object.keys(CASE_TRANSITIONS).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="student-support-case-list-body">
            {visibleCases.map((row) => (
              <button type="button" className={selectedId === row.id ? 'is-active' : ''} key={row.id} onClick={() => setSelectedId(row.id)}>
                <span>{row.status}</span>
                <strong>{row.title || row.category}</strong>
                <small>{[row.source_class_name, row.category].filter(Boolean).join(' · ')}</small>
              </button>
            ))}
            {!visibleCases.length ? <p>{vi ? 'Chưa có hồ sơ phù hợp.' : 'No matching cases.'}</p> : null}
          </div>
        </aside>

        <div className="student-support-case-main">
          {studentRef ? (
            <section className="student-support-form-card">
              <header><span>{vi ? 'Mở hồ sơ mới cho học sinh đang chọn' : 'Create a case for selected student'}</span><h2>{student?.fullName || studentRef}</h2><p>{student?.className || workspaceId}</p></header>
              {databasePending ? <div className="student-support-inline-warning">{vi ? 'Chế độ xem trước: chưa thể ghi dữ liệu.' : 'Preview mode: saving is disabled.'}</div> : null}
              <form className="student-support-form" onSubmit={submitCase}>
                <label><span>{vi ? 'Loại hỗ trợ' : 'Category'}</span><select value={createForm.category} onChange={(e) => patchForm(setCreateForm, 'category', e.target.value)}>{CASE_CATEGORIES.map(([value, viLabel, enLabel]) => <option key={value} value={value}>{vi ? viLabel : enLabel}</option>)}</select></label>
                <label><span>{vi ? 'Ngày kiểm tra lại' : 'Follow-up date'}</span><input type="date" value={createForm.followUpAt} onChange={(e) => patchForm(setCreateForm, 'followUpAt', e.target.value)} /></label>
                <label className="student-support-form-wide"><span>{vi ? 'Tên hồ sơ' : 'Case title'}</span><input required value={createForm.title} onChange={(e) => patchForm(setCreateForm, 'title', e.target.value)} placeholder={vi ? 'Ví dụ: Theo dõi chuyên cần 2 tuần' : 'Example: Two-week attendance follow-up'} /></label>
                <label className="student-support-form-wide"><span>{vi ? 'Lý do / bằng chứng' : 'Reason / evidence'}</span><textarea rows={3} value={createForm.reason} onChange={(e) => patchForm(setCreateForm, 'reason', e.target.value)} /></label>
                <label className="student-support-form-wide"><span>{vi ? 'Mục tiêu hỗ trợ' : 'Support goal'}</span><textarea rows={3} value={createForm.goal} onChange={(e) => patchForm(setCreateForm, 'goal', e.target.value)} /></label>
                <div className="student-support-form-actions student-support-form-wide"><button disabled={busy === 'case' || databasePending}>{vi ? 'Tạo hồ sơ' : 'Create case'}</button></div>
              </form>
            </section>
          ) : null}

          {selectedCase ? (
            <section className="student-support-case-detail">
              <header className="student-support-case-detail-head">
                <div><span>{selectedCase.status}</span><h2>{selectedCase.title}</h2><p>{[selectedCase.category, selectedCase.source_class_name, selectedCase.school_year].filter(Boolean).join(' · ')}</p></div>
                <div className="student-support-case-transitions">
                  {(CASE_TRANSITIONS[selectedCase.status] || []).map((status) => <button key={status} type="button" disabled={busy === 'status' || databasePending} onClick={() => changeCaseStatus(status)}>{status}</button>)}
                  <button type="button" className="danger" disabled={busy === 'archive' || databasePending} onClick={archiveCase}>{vi ? 'Lưu trữ' : 'Archive'}</button>
                </div>
              </header>

              <div className="student-support-case-text-grid"><div><small>{vi ? 'Lý do' : 'Reason'}</small><p>{selectedCase.reason || '—'}</p></div><div><small>{vi ? 'Mục tiêu' : 'Goal'}</small><p>{selectedCase.goal || '—'}</p></div><div><small>{vi ? 'Kiểm tra lại' : 'Follow-up'}</small><p>{fmt(selectedCase.follow_up_at, language)}</p></div></div>

              <div className="student-support-case-section">
                <h3>{vi ? 'Kế hoạch hỗ trợ' : 'Support actions'}</h3>
                {detailErrors.actions ? <p className="student-support-form-message is-error">{detailErrors.actions}</p> : null}
                <div className="student-support-case-items">
                  {actions.map((action) => <div key={action.id}><div><span>{action.status}</span><strong>{action.title}</strong><small>{fmt(action.due_at, language)}</small></div><select value={action.status} disabled={databasePending || busy === `action-${action.id}`} onChange={(e) => setActionStatus(action, e.target.value)}>{['TODO','IN_PROGRESS','DONE','CANCELLED'].map((status) => <option key={status}>{status}</option>)}</select></div>)}
                  {!actions.length ? <p>{vi ? 'Chưa có hoạt động hỗ trợ.' : 'No support actions yet.'}</p> : null}
                </div>
                <form className="student-support-form compact" onSubmit={submitAction}>
                  <label><span>{vi ? 'Hoạt động' : 'Action'}</span><input required value={actionForm.title} onChange={(e) => patchForm(setActionForm, 'title', e.target.value)} /></label>
                  <label><span>{vi ? 'Hạn' : 'Due'}</span><input type="date" value={actionForm.dueAt} onChange={(e) => patchForm(setActionForm, 'dueAt', e.target.value)} /></label>
                  <label className="student-support-form-wide"><span>{vi ? 'Mô tả' : 'Description'}</span><textarea rows={2} value={actionForm.description} onChange={(e) => patchForm(setActionForm, 'description', e.target.value)} /></label>
                  <div className="student-support-form-actions student-support-form-wide"><button disabled={databasePending || busy === 'action'}>{vi ? 'Thêm hoạt động' : 'Add action'}</button></div>
                </form>
              </div>

              <div className="student-support-case-section">
                <h3>{vi ? 'Ghi chú nội bộ' : 'Internal notes'}</h3>
                {detailErrors.notes ? <p className="student-support-form-message is-error">{detailErrors.notes}</p> : null}
                <div className="student-support-case-items text-items">{notes.map((note) => <div key={note.id}><div><span>{note.visibility_scope}</span><strong>{note.body}</strong><small>{fmt(note.created_at, language)}</small></div></div>)}</div>
                <form className="student-support-form compact" onSubmit={submitNote}>
                  <label><span>{vi ? 'Phạm vi' : 'Visibility'}</span><select value={noteForm.visibilityScope} onChange={(e) => patchForm(setNoteForm, 'visibilityScope', e.target.value)}>{['PRIVATE','HOMEROOM','TEACHING_TEAM','MANAGEMENT'].map((scope) => <option key={scope}>{scope}</option>)}</select></label>
                  <label className="student-support-form-wide"><span>{vi ? 'Ghi chú' : 'Note'}</span><textarea rows={3} value={noteForm.body} onChange={(e) => patchForm(setNoteForm, 'body', e.target.value)} /></label>
                  <div className="student-support-form-actions student-support-form-wide"><button disabled={databasePending || busy === 'note'}>{vi ? 'Lưu ghi chú' : 'Save note'}</button></div>
                </form>
              </div>

              <div className="student-support-case-section">
                <h3>{vi ? 'Liên hệ gia đình' : 'Family contact'}</h3>
                {detailErrors.contacts ? <div className="student-support-inline-warning">{vi ? 'Tài khoản hiện tại không xem được nhật ký liên hệ hoặc dữ liệu chưa sẵn sàng.' : 'Family contact history is unavailable for this account or not active yet.'}</div> : null}
                {!detailErrors.contacts ? <>
                  <div className="student-support-case-items text-items">{contacts.map((contact) => <div key={contact.id}><div><span>{contact.contact_method}</span><strong>{contact.contact_status}</strong><small>{fmt(contact.contacted_at, language)}</small><p>{contact.summary}</p></div></div>)}</div>
                  <form className="student-support-form compact" onSubmit={submitContact}>
                    <label><span>{vi ? 'Hình thức' : 'Method'}</span><select value={contactForm.contactMethod} onChange={(e) => patchForm(setContactForm, 'contactMethod', e.target.value)}>{['Điện thoại','Trực tiếp','Tin nhắn','Họp phụ huynh','Email','Khác'].map((method) => <option key={method}>{method}</option>)}</select></label>
                    <label><span>{vi ? 'Trạng thái' : 'Status'}</span><select value={contactForm.contactStatus} onChange={(e) => patchForm(setContactForm, 'contactStatus', e.target.value)}>{['Đã trao đổi','Chưa liên hệ được','PHHS đã phản hồi'].map((status) => <option key={status}>{status}</option>)}</select></label>
                    <label className="student-support-form-wide"><span>{vi ? 'Nội dung tóm tắt' : 'Summary'}</span><textarea rows={3} value={contactForm.summary} onChange={(e) => patchForm(setContactForm, 'summary', e.target.value)} /></label>
                    <label className="student-support-check student-support-form-wide"><input type="checkbox" checked={contactForm.followUpRequired} onChange={(e) => patchForm(setContactForm, 'followUpRequired', e.target.checked)} /><span>{vi ? 'Cần liên hệ lại' : 'Follow-up required'}</span></label>
                    <div className="student-support-form-actions student-support-form-wide"><button disabled={databasePending || busy === 'contact'}>{vi ? 'Lưu liên hệ' : 'Save contact'}</button></div>
                  </form>
                </> : null}
              </div>

              <div className="student-support-case-section">
                <h3>{vi ? 'Timeline' : 'Timeline'}</h3>
                {detailErrors.events ? <p className="student-support-form-message is-error">{detailErrors.events}</p> : null}
                <div className="student-support-timeline">{events.map((event) => <div key={event.id}><span>{fmt(event.created_at, language)}</span><strong>{event.event_type}</strong><small>{[event.from_status, event.to_status].filter(Boolean).join(' → ')}</small></div>)}{!events.length ? <p>{vi ? 'Chưa có sự kiện timeline.' : 'No timeline events yet.'}</p> : null}</div>
              </div>
            </section>
          ) : (
            <section className="student-support-state-card">{vi ? 'Chọn một hồ sơ bên trái để xem chi tiết.' : 'Select a case to view details.'}</section>
          )}

          {message ? <p className="student-support-form-message is-success">{message}</p> : null}
          {error ? <p className="student-support-form-message is-error">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
