import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  UsersRound, Search, UserRoundCheck, UserRoundPlus, UserRoundX, AlertTriangle,
  FileUp, Download, UserRound, X, Pencil, ArrowLeftRight, Archive,
  RotateCcw, ContactRound, CalendarDays, ClipboardCheck, Award,
  CheckCircle2, ChevronRight, ListFilter, Layers3, Save, Trash2, ShieldAlert,
} from 'lucide-react';
import StudentRosterImportPanel from '../StudentRosterImportPanel.jsx';
import { addStudent, archiveStudent, restoreStudent, transferStudent, upsertStudents } from '../../utils/homeroomStore.js';
import { downloadCsv, formatViDate, normalizePhone } from '../../utils/homeroomOfflineTools.js';
import { buildZaloUrl, fillMessageTemplate, openZaloChat } from '../../utils/zaloLink.js';
import { buildStudentSupportHash, normalizeStudentRef } from '../../studentSupport/studentSupportIdentity.js';
import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';
import { deleteStudentRecordMedia, listStudentRecordMedia } from '../../utils/studentRecordMediaStore.js';
import { cleanupStudentRecordCloudOrphans } from '../../utils/studentRecordCloudStore.js';
import {
  getStudentHubCounts, filterStudentHub, findStudentHubDuplicate, studentHubSummary,
} from '../../utils/homeroom4StudentHub.js';
import './HomeroomStudentHub.css';

const EMPTY_STUDENT = {
  code: '', fullName: '', birthDate: '', gender: '', phone: '', parentName: '',
  parentPhone: '', parentEmail: '', address: '', notes: '', supportLevel: 'normal',
};
const FIELDS = [
  ['code', 'Mã học sinh'], ['fullName','Họ và tên'],
  ['birthDate','Ngày sinh','date'], ['gender','Giới tính'],
  ['phone','SĐT học sinh','tel'], ['parentName','Phụ huynh / người giám hộ'],
  ['parentPhone','SĐT phụ huynh','tel'], ['parentEmail','Email phụ huynh','email'],
  ['address','Địa chỉ'],
];
const statusLabel = (student) => student?.active === false
  ? 'Đã lưu trữ'
  : student?.supportLevel === 'priority' ? 'Ưu tiên'
  : student?.supportLevel === 'attention' ? 'Cần lưu ý' : 'Đang học';
const initials = (fullName) => String(fullName||'?').trim().split(/\s+/).slice(-2).map((word)=>word[0]||'').join('').toUpperCase();
const exportRows = (items) => [
  ['Mã HS', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'SĐT học sinh', 'Phụ huynh', 'SĐT phụ huynh', 'Email phụ huynh', 'Địa chỉ', 'Ghi chú'],
  ...items.map((s) => [s.code,s.fullName,s.birthDate,s.gender,s.phone,s.parentName,s.parentPhone,s.parentEmail,s.address,s.notes]),
];

function SummaryChip({ icon: Icon, label, value, tone }) {
  return <div className="hr4-student-chip" data-tone={tone}>
    <span><Icon size={18} strokeWidth={2.2}/></span>
    <div><strong>{value}</strong><small>{label}</small></div>
  </div>;
}
function ParentZaloBox({ student, className }) {
  const buildDraft = () => fillMessageTemplate(
    `Kính gửi {phụ huynh}, tôi là giáo viên chủ nhiệm${className ? ` lớp ${className}` : ''}. Tôi xin trao đổi với anh/chị về em {tên học sinh}: `,
    student,
  );
  const [message, setMessage] = useState(buildDraft);
  const [notice, setNotice] = useState('');
  useEffect(() => { setMessage(buildDraft()); setNotice(''); }, [student.id, student.parentName, student.fullName, className]);
  const zaloUrl = buildZaloUrl(student.parentPhone);
  const send = async () => {
    const who = student.parentName || `phụ huynh em ${student.fullName}`;
    const result = await openZaloChat({ phone: student.parentPhone, message });
    if (!result.ok) setNotice('Chưa mở được Zalo: số điện thoại phụ huynh trống hoặc không hợp lệ.');
    else if (result.copied) setNotice(`Đã sao chép tin nhắn và mở Zalo của ${who}. Hãy dán (Ctrl+V) rồi bấm gửi.`);
    else setNotice(`Đã mở Zalo của ${who} nhưng chưa sao chép được tin nhắn. Hãy tự sao chép nội dung rồi dán vào Zalo.`);
  };
  return <section className="hr4-student-note" aria-label="Nhắn Zalo cho phụ huynh">
    <small>NHẮN ZALO PHỤ HUYNH</small>
    <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} style={{ width: '100%', boxSizing: 'border-box', margin: '8px 0' }} aria-label="Nội dung tin nhắn Zalo" />
    <button type="button" className="primary" disabled={!zaloUrl} title={zaloUrl ? 'Sao chép tin nhắn và mở Zalo của phụ huynh' : 'Cần số điện thoại phụ huynh hợp lệ'} onClick={send}>Mở Zalo phụ huynh</button>
    {!zaloUrl ? <p>Chưa có số điện thoại phụ huynh hợp lệ. Hãy bấm "Sửa hồ sơ" để bổ sung.</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </section>;
}

function StudentDetail({ workspace, student, summary, close, edit, requestAction, openSupport, requestPermanentDelete, decisionForm }) {
  return <aside className="hr4-student-detail" aria-label={`Hồ sơ học sinh ${student.fullName}`}>
    <header className="hr4-student-detail-header">
      <div><small>STUDENT 360°</small><h3>Hồ sơ học sinh</h3></div>
      <button type="button" className="hr4-student-icon-btn" aria-label="Đóng hồ sơ" onClick={close}><X size={19}/></button>
    </header>
    <div className="hr4-student-detail-person">
      <span className="hr4-student-avatar is-large">{initials(student.fullName)}</span>
      <h4>{student.fullName}</h4>
      <small>{student.code || 'Chưa có mã học sinh'} · {workspace.classProfile?.className || 'Chưa đặt tên lớp'}</small>
      <span className="hr4-student-pill" data-state={student.active === false ? 'inactive' : (student.supportLevel || 'normal')}>{statusLabel(student)}</span>
    </div>
    <div className="hr4-student-detail-fields">
      {[
        ['Ngày sinh', student.birthDate ? formatViDate(student.birthDate) : 'Chưa cập nhật'],
        ['Giới tính', student.gender || 'Chưa cập nhật'],
        ['Điện thoại', student.phone || 'Chưa cập nhật'],
        ['Phụ huynh', student.parentName || 'Chưa cập nhật'],
        ['Liên hệ phụ huynh', student.parentPhone || student.parentEmail || 'Chưa cập nhật'],
        ['Địa chỉ', student.address || 'Chưa cập nhật'],
      ].map(([label,value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}
    </div>
    <section className="hr4-student-snapshot" aria-label="Tình trạng đã ghi nhận">
      <h4><ClipboardCheck size={17}/> Tình trạng trong sổ chủ nhiệm</h4>
      <div className="hr4-student-snapshot-grid">
        <div><strong>{summary.attendanceSessions}</strong><small>Lượt điểm danh</small></div>
        <div><strong>{summary.attendanceLate}</strong><small>Lượt trễ</small></div>
        <div><strong>{summary.attendanceUnexcused}</strong><small>Vắng không phép</small></div>
        <div><strong>{summary.conductRecords}</strong><small>Ghi nhận rèn luyện</small></div>
      </div>
      <p>{summary.paperVerified ? 'Hồ sơ đối chiếu đã xác nhận' : summary.paperRecordExists ? 'Đã có hồ sơ đối chiếu, chưa xác nhận hoàn tất' : 'Chưa có hồ sơ đối chiếu'}</p>
      {summary.pendingConduct > 0 ? <p className="hr4-student-pending">{summary.pendingConduct} ghi nhận rèn luyện đang chờ xác nhận.</p> : null}
    </section>
    {student.active === false ? null : <ParentZaloBox student={student} className={workspace.classProfile?.className || ''} />}
    {student.notes ? <section className="hr4-student-note"><small>GHI CHÚ</small><p>{student.notes}</p></section> : null}
    <div className="hr4-student-detail-actions">
      <button type="button" className="primary" onClick={() => edit(student)}><Pencil size={16}/> Sửa hồ sơ</button>
      <button type="button" className="secondary" disabled={!normalizeStudentRef(student)} onClick={() => openSupport(student)}><ContactRound size={16}/> Hồ sơ hỗ trợ</button>
      {student.active === false
        ? <>
          <button type="button" className="secondary" onClick={() => requestAction(student,'restore')}><RotateCcw size={16}/> Khôi phục</button>
          <button type="button" className="hr4-permanent-detail-delete" onClick={() => requestPermanentDelete([student])}><Trash2 size={16}/> Xóa vĩnh viễn</button>
        </>
        : <>
          <button type="button" className="secondary" onClick={() => requestAction(student,'transfer')}><ArrowLeftRight size={16}/> Chuyển lớp</button>
          <button type="button" className="secondary" onClick={() => requestAction(student,'archive')}><Archive size={16}/> Lưu trữ</button>
        </>}
    </div>
    {decisionForm}
  </aside>;
}
export default function HomeroomStudentHub({ workspace, onCommit }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [order, setOrder] = useState('name');
  const [selectedId, setSelectedId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState(EMPTY_STUDENT);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState(null);
  const decisionInputRef = useRef(null);
  const [reason, setReason] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleteNotice, setDeleteNotice] = useState('');
  const deleteInputRef = useRef(null);
  useEffect(() => { if (deleteRequest) deleteInputRef.current?.focus(); }, [deleteRequest]);
  useEffect(() => { if (decision) decisionInputRef.current?.focus(); }, [decision]);

  const counts = useMemo(() => getStudentHubCounts(workspace), [workspace.students]);
  const visible = useMemo(() => filterStudentHub(workspace, { query, status, order }), [workspace.students, query, status, order]);
  const selectedStudent = useMemo(() => (workspace.students || []).find((item) => String(item.id) === String(selectedId)) || null, [workspace.students, selectedId]);
  const summary = useMemo(() => selectedStudent ? studentHubSummary(workspace, selectedStudent.id) : null, [workspace, selectedStudent]);
  const selectedExport = (workspace.students || []).filter((item) => selectedRows.includes(String(item.id)));
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selectedRows.includes(String(item.id)));
  const archivedSelected = selectedExport.filter((item) => item.active === false);
  const deletionStudents = deleteRequest
    ? (workspace.students || []).filter((item) => item.active === false && deleteRequest.ids.includes(String(item.id)))
    : [];
  const expectedDeleteText = 'XÓA ' + deletionStudents.length;
  const deleteConfirmed = Boolean(deleteRequest && deletionStudents.length === deleteRequest.ids.length
    && deletionStudents.length > 0 && deleteTyped.trim().normalize('NFC').toLocaleUpperCase('vi') === expectedDeleteText);

  useEffect(() => {
    if (selectedId && !(workspace.students || []).some((student) => String(student.id) === String(selectedId))) setSelectedId('');
    setSelectedRows((old) => old.filter((id) => (workspace.students || []).some((student) => String(student.id) === id)));
  }, [workspace.students, selectedId]);

  const openNew = () => { setEditingId(''); setDraft(EMPTY_STUDENT); setEditorOpen(true); setError(''); setDecision(null); };
  const edit = (student) => {
    setEditingId(student.id); setDraft({ ...EMPTY_STUDENT, ...student });
    setEditorOpen(true); setError(''); setDecision(null);
  };
  const closeEditor = () => { if(busy) return; setEditorOpen(false); setDraft(EMPTY_STUDENT); setEditingId(''); setError(''); };
  const persist = async () => {
    if (busy) return;
    if (!String(draft.fullName || '').trim()) { setError('Vui lòng nhập họ và tên học sinh.'); return; }
    const duplicate = findStudentHubDuplicate(workspace, draft, editingId);
    if (duplicate) { setError(`${duplicate.type === 'code' ? 'Mã học sinh' : 'Họ tên'} đã tồn tại ở hồ sơ ${duplicate.student.fullName}. Vui lòng kiểm tra để tránh ghi đè dữ liệu.`); return; }
    setBusy(true); setError('');
    try {
      const next = editingId
        ? { ...workspace, students: (workspace.students || []).map((item) => item.id === editingId
          ? { ...item, ...draft, id:item.id, updatedAt: new Date().toISOString() } : item) }
        : addStudent(workspace, draft);
      const result = await onCommit(next, editingId ? 'Đã cập nhật hồ sơ học sinh.' : 'Đã thêm học sinh.');
      if (result?.ok === false) {
        setError(result.message || 'Dữ liệu chưa đồng bộ lên cloud. Hãy kiểm tra kết nối trước khi đóng hồ sơ.');
        return;
      }
      setEditorOpen(false); setDraft(EMPTY_STUDENT); setEditingId('');
    } catch(err) { setError(err?.message || 'Không thể lưu học sinh.'); }
    finally { setBusy(false); }
  };
  const requestAction = (student, type) => { setDecision({ studentId: student.id, type }); setReason(''); setError(''); };
  const cancelAction = () => { if (!busy) { setDecision(null); setReason(''); } };
  const confirmAction = async () => {
    if (busy || !decision) return;
    const student = (workspace.students || []).find((item) => item.id === decision.studentId);
    if (!student) { setDecision(null); return; }
    if (decision.type !== 'restore' && !String(reason).trim()) { setError(decision.type === 'transfer' ? 'Nhập tên lớp chuyển đến.' : 'Nhập lý do lưu trữ.'); return; }
    setError(''); setBusy(true);
    try {
      const next = decision.type === 'restore' ? restoreStudent(workspace, student.id)
        : decision.type === 'transfer' ? transferStudent(workspace, student.id, reason.trim())
        : archiveStudent(workspace, student.id, reason.trim());
      const result = await onCommit(next, decision.type === 'restore' ? 'Đã khôi phục hồ sơ.'
        : decision.type === 'transfer' ? 'Đã lưu lịch sử chuyển lớp.' : 'Đã lưu trữ hồ sơ, giữ nguyên lịch sử.');
      if (result?.ok === false) {
        setError(result.message || 'Thao tác chưa đồng bộ thành công. Vui lòng kiểm tra trước khi tiếp tục.');
        return;
      }
      setDecision(null); setReason('');
    } catch(err) { setError(err?.message || 'Không thể cập nhật trạng thái học sinh.'); }
    finally { setBusy(false); }
  };
  const openSupport = (student) => {
    const ref = normalizeStudentRef(student);
    if (!ref) return;
    window.location.hash = buildStudentSupportHash({
      studentRef: ref, workspaceId: workspace.id || workspace.workspaceId || '', tab:'student',
    }).replace(/^#/, '');
  };
  const exportRoster = (items, label='danh-sach') => downloadCsv(`${label}-${workspace.classProfile?.className || 'lop'}.csv`, exportRows(items));
  const importRows = async (rows) => {
    const result = await onCommit(upsertStudents(workspace, rows), `Đã nhập/cập nhật ${rows.length} học sinh từ file mẫu.`);
    if (result?.ok === false) throw new Error(result.message || 'Đã lưu trên thiết bị nhưng chưa đồng bộ lên cloud.');
  };
  const toggleSelected = (id, checked) => setSelectedRows((previous) => checked ? [...new Set([...previous, String(id)])] : previous.filter((x) => x !== String(id)));
  const togglePage = (checked) => setSelectedRows((previous) => checked
    ? [...new Set([...previous, ...visible.map((item) => String(item.id))])]
    : previous.filter((id) => !visible.some((item) => String(item.id) === id)));
  const requestPermanentDelete = (students) => {
    if (busy) return;
    const archived = (students || []).filter((item) => item.active === false);
    if (!archived.length) return;
    setDecision(null);
    setError('');
    setDeleteNotice('');
    setDeleteTyped('');
    setDeleteRequest({ ids: [...new Set(archived.map((item) => String(item.id)))] });
  };
  const confirmPermanentDelete = async () => {
    if (busy || !deleteConfirmed) return;
    setBusy(true);
    setError('');
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Không thể kết nối Supabase. Chưa có hồ sơ nào bị xóa.');
      }
      // Always check the actual cloud version immediately before destructive
      // writes. Browser caches can carry old syncMeta.cloudUpdatedAt values.
      const { data: sessionResult, error: authError } = await supabase.auth.getUser();
      const cloudUser = sessionResult?.user;
      if (authError || !cloudUser?.id) {
        throw new Error('Phiên đăng nhập Supabase đã hết hạn. Chưa có hồ sơ nào bị xóa.');
      }
      const { data: latest, error: latestError } = await supabase
        .from('bes_homeroom_workspaces')
        .select('updated_at,payload')
        .eq('owner_id', cloudUser.id)
        .eq('workspace_id', workspace.id)
        .maybeSingle();
      if (latestError || !latest?.updated_at || !latest?.payload) {
        throw new Error('Không xác minh được bản ghi trên Supabase. Chưa có hồ sơ nào bị xóa.');
      }
      const targetStudents = deletionStudents;
      const latestRoster = Array.isArray(latest.payload.students) ? latest.payload.students : [];
      const upToDate = targetStudents.every((item) => latestRoster.some((cloudStudent) =>
        String(cloudStudent.id) === String(item.id)
        && cloudStudent.active === false
        && String(cloudStudent.fullName || '') === String(item.fullName || '')
        && String(cloudStudent.code || '') === String(item.code || ''),
      ));
      if (!upToDate) {
        throw new Error('Hồ sơ đã thay đổi trên Supabase. Hãy tải lại trang và xác nhận lại trước khi xóa.');
      }
      const revision = latest.updated_at;
      // The server validates ownership, archived status and the cloud revision,
      // then removes records across related tables in ONE Postgres transaction.
      // No local removal is performed before the RPC commits successfully.
      const { data: deletion, error: cloudError } = await supabase.rpc(
        'bes_cloud_permanent_delete_archived_v1',
        {
          p_workspace_id: workspace.id,
          p_student_ids: deleteRequest.ids,
          p_expected_revision: revision,
        },
      );
      if (cloudError) throw new Error(cloudError.message || 'Supabase từ chối xóa hồ sơ.');
      if (deletion?.ok !== true || deletion.deletedCount !== targetStudents.length) {
        throw new Error('Supabase chưa xác nhận đủ số học sinh đã xóa.');
      }
      // Evict the stale device copy only AFTER the Supabase transaction succeeds.
      // Next hydration must fetch the authoritative cloud workspace.
      try {
        localStorage.removeItem(
          'bes-homeroom-workspace-v1:' + String(cloudUser.id).toLowerCase() + ':' + workspace.id,
        );
      } catch { /* Cloud deletion is already committed. */ }
      let mediaWarning = '';
      {
        const cleanupResults = await Promise.all(targetStudents.map(async (student) => {
          try {
            const stored = await listStudentRecordMedia(workspace.id, student.id);
            await Promise.all(stored.map((item) => deleteStudentRecordMedia(item.key)));
            // Cloud commit has already completed; remove linked Storage objects.
            return await cleanupStudentRecordCloudOrphans({
              workspaceId: workspace.id, studentId: student.id, keepPaths: [],
            });
          } catch (err) { return { ok: false, message: err?.message || 'Lỗi dọn ảnh hồ sơ.' }; }
        }));
        if (cleanupResults.some((item) => !item.ok)) {
          mediaWarning = ' Một số tệp ảnh hồ sơ chưa được dọn khỏi kho lưu trữ; cần kiểm tra lại.';
        }
      }
      setSelectedRows([]);
      setSelectedId('');
      setDeleteRequest(null);
      setDeleteTyped('');
      setStatus('inactive');
      setDeleteNotice('Supabase đã xác nhận xóa vĩnh viễn ' + deletion.deletedCount
        + ' học sinh và dữ liệu liên quan.' + mediaWarning);
      // A hard refresh ensures no older React state or workspace snapshot can
      // reinsert the deleted student after the server transaction.
      window.setTimeout(() => window.location.reload(), mediaWarning ? 3200 : 1100);
    } catch (err) { setError(err?.message || 'Không thể xóa vĩnh viễn học sinh.'); }
    finally { setBusy(false); }
  };

  return <div className="hr4-student-hub" aria-label="Student Hub 360">
    <header className="hr4-student-title">
      <div><span>STUDENT HUB 360°</span><h2>Quản lý học sinh</h2><p>Danh sách, hồ sơ và hoạt động của lớp {workspace.classProfile?.className || 'chưa đặt tên'}.</p></div>
      <div className="hr4-student-toolbar">
        <button type="button" className="secondary" onClick={() => setShowImporter((v) => !v)} aria-expanded={showImporter}><FileUp size={17}/> Nhập Excel/CSV</button>
        <button type="button" className="secondary" onClick={() => exportRoster(workspace.students || [])}><Download size={17}/> Xuất danh sách</button>
        <button type="button" className="primary" onClick={openNew}><UserRoundPlus size={17}/> Thêm học sinh</button>
      </div>
    </header>
    <div className="hr4-student-summary">
      <SummaryChip icon={UsersRound} tone="blue" label="Đang học" value={counts.active}/>
      <SummaryChip icon={AlertTriangle} tone="amber" label="Cần lưu ý" value={counts.attention}/>
      <SummaryChip icon={UserRoundCheck} tone="coral" label="Ưu tiên hỗ trợ" value={counts.priority}/>
      <SummaryChip icon={UserRoundX} tone="violet" label="Đã lưu trữ" value={counts.archived}/>
    </div>
    {deleteNotice ? <p className="hr4-permanent-notice" role="status">{deleteNotice}</p> : null}
    {showImporter ? <StudentRosterImportPanel
      existingStudents={workspace.students || []} onImport={importRows} onClose={() => setShowImporter(false)}
    /> : null}

    {editorOpen ? <section className="hr4-student-editor" aria-label={editingId ? 'Chỉnh sửa học sinh' : 'Thêm học sinh'}>
      <div className="hr4-student-section-heading">
        <div><small>{editingId ? 'CHỈNH SỬA' : 'HỒ SƠ MỚI'}</small><h3>{editingId ? 'Cập nhật thông tin học sinh' : 'Thêm học sinh vào lớp'}</h3></div>
        <button type="button" className="hr4-student-icon-btn" aria-label="Đóng biểu mẫu" onClick={closeEditor}><X size={19}/></button>
      </div>
      <div className="hr4-student-form-grid">
        {FIELDS.map(([key,label,type='text']) => <label key={key}><span>{label}</span><input type={type} value={draft[key] || ''} onChange={(event) => setDraft((old) => ({
          ...old, [key]: key.toLowerCase().includes('phone') ? normalizePhone(event.target.value) : event.target.value,
        }))}/></label>)}
        <label><span>Mức theo dõi</span><select value={draft.supportLevel || 'normal'} onChange={(event) => setDraft((old)=>({...old,supportLevel:event.target.value}))}>
          <option value="normal">Bình thường</option><option value="attention">Cần lưu ý</option><option value="priority">Ưu tiên hỗ trợ</option>
        </select></label>
        <label className="hr4-student-wide"><span>Ghi chú / hoàn cảnh cần lưu ý</span>
          <textarea value={draft.notes || ''} rows={3} onChange={(event)=>setDraft((old)=>({...old,notes:event.target.value}))}/>
        </label>
      </div>
      {error && !decision ? <p className="hr4-student-error" role="alert">{error}</p> : null}
      <div className="hr4-student-editor-actions">
        <button type="button" className="secondary" onClick={closeEditor}>Hủy</button>
        <button type="button" className="primary" onClick={persist} disabled={busy}><Save size={17}/> {busy ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm học sinh'}</button>
      </div>
    </section> : null}

    <div className="hr4-student-application">
      <section className="hr4-student-list-panel">
        <div className="hr4-student-section-heading">
          <div><small>DANH SÁCH LỚP</small><h3>Danh sách học sinh</h3></div>
          <strong>{visible.length} / {counts.total} hồ sơ</strong>
        </div>
        <div className="hr4-student-filters">
          <label className="hr4-student-search"><Search size={17} aria-hidden="true"/><input aria-label="Tìm học sinh" placeholder="Tìm họ tên, mã HS, phụ huynh…" value={query} onChange={(event)=>setQuery(event.target.value)}/></label>
          <label className="hr4-student-select"><ListFilter size={16}/><select aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="active">Đang học</option><option value="attention">Cần lưu ý</option><option value="priority">Ưu tiên</option><option value="inactive">Đã lưu trữ</option><option value="all">Tất cả</option>
          </select></label>
          <label className="hr4-student-select"><Layers3 size={16}/><select aria-label="Sắp xếp" value={order} onChange={(event) => setOrder(event.target.value)}>
            <option value="name">Theo họ tên</option><option value="code">Theo mã HS</option>
          </select></label>
        </div>
        <div className="hr4-student-batchbar">
          <label><input type="checkbox" checked={allVisibleSelected} onChange={(event)=>togglePage(event.target.checked)} disabled={!visible.length}/> Chọn trang hiện tại</label>
          <span>{selectedRows.length} học sinh được chọn</span>
          {selectedRows.length ? <button type="button" onClick={() => exportRoster(selectedExport,'danh-sach-da-chon')}><Download size={15}/> Xuất mục đã chọn</button> : null}
          {status === 'inactive' && archivedSelected.length > 0 ? <button type="button" className="hr4-student-delete-bulk" disabled={busy} onClick={() => requestPermanentDelete(archivedSelected)}><Trash2 size={15}/> Xóa vĩnh viễn ({archivedSelected.length})</button> : null}
        </div>
        {visible.length ? <div className="hr4-student-directory" role="list">
          {visible.map((student) => <div key={student.id} className="hr4-student-row" data-selected={String(student.id) === String(selectedId)}>
            <input type="checkbox" aria-label={`Chọn ${student.fullName}`} checked={selectedRows.includes(String(student.id))} onChange={(event)=>toggleSelected(student.id,event.target.checked)}/>
            <button type="button" className="hr4-student-row-open" onClick={() => {setSelectedId(String(student.id));setDecision(null);setError('');}} aria-label={`Xem hồ sơ ${student.fullName}`}>
              <span className="hr4-student-avatar">{initials(student.fullName)}</span>
              <span className="hr4-student-row-identity"><strong>{student.fullName}</strong><small>{student.code || 'Chưa có mã HS'} · {student.birthDate ? formatViDate(student.birthDate) : 'Chưa có ngày sinh'}</small></span>
              <span className="hr4-student-pill" data-state={student.active === false ? 'inactive' : (student.supportLevel || 'normal')}>{statusLabel(student)}</span>
              <ChevronRight size={18} aria-hidden="true"/>
            </button>
            {student.active === false ? <button type="button" className="hr4-student-delete-row" aria-label={'Xóa vĩnh viễn ' + student.fullName} title="Xóa vĩnh viễn" disabled={busy} onClick={() => requestPermanentDelete([student])}><Trash2 size={17}/></button> : null}
          </div>)}
        </div> : <div className="hr4-student-empty"><UserRound size={28}/><strong>Không tìm thấy học sinh phù hợp</strong><small>Thử thay đổi từ khóa hoặc bộ lọc để tiếp tục.</small></div>}
      </section>

      {selectedStudent && summary ? <StudentDetail
        workspace={workspace} student={selectedStudent} summary={summary}
        close={() => {setSelectedId('');setDecision(null);setError('');}}
        edit={edit} requestAction={requestAction} openSupport={openSupport} requestPermanentDelete={requestPermanentDelete}
        decisionForm={decision && String(decision.studentId) === String(selectedStudent.id) ? <section className="hr4-student-decision" aria-label="Xác nhận thay đổi trạng thái" role="group">
          <div><small>XÁC NHẬN THAO TÁC</small>
            <h3>{decision.type === 'archive' ? 'Lưu trữ học sinh' : decision.type === 'transfer' ? 'Ghi nhận chuyển lớp' : 'Khôi phục học sinh'}</h3>
            <p>{decision.type === 'archive' ? 'Hồ sơ và lịch sử sẽ được giữ lại, không xóa vĩnh viễn.' : decision.type === 'transfer' ? 'Lớp chuyển đến được lưu vào lịch sử, không tự sao chép hồ sơ sang lớp khác.' : 'Học sinh sẽ trở lại danh sách đang học.'}</p>
          </div>
          {decision.type !== 'restore' ? <label><span>{decision.type === 'transfer' ? 'Tên lớp chuyển đến' : 'Lý do lưu trữ'}</span>
            <input ref={decisionInputRef} value={reason} onChange={(event)=>setReason(event.target.value)} placeholder={decision.type === 'transfer' ? 'Ví dụ: 12.7' : 'Nhập lý do lưu trữ'}/></label> : null}
          {error ? <p role="alert" className="hr4-student-error">{error}</p> : null}
          <div><button type="button" className="secondary" disabled={busy} onClick={cancelAction}>Hủy</button><button type="button" className="primary" disabled={busy} onClick={confirmAction}><CheckCircle2 size={16}/> {busy ? 'Đang xử lý…' : 'Xác nhận'}</button></div>
        </section> : null}
      /> : <aside className="hr4-student-empty-detail" aria-label="Hướng dẫn xem hồ sơ">
        <ContactRound size={39}/>
        <h3>Chọn một học sinh</h3>
        <p>Xem thông tin, tình trạng chuyên cần và rèn luyện trong sổ chủ nhiệm; sửa hoặc chuyển lớp khi cần.</p>
      </aside>}
    </div>
    {deleteRequest ? createPortal(<div className="hr4-permanent-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDeleteRequest(null); }}>
      <section className="hr4-permanent-dialog" role="alertdialog" aria-modal="true" aria-labelledby="hr4-permanent-title" aria-describedby="hr4-permanent-description">
        <span className="hr4-permanent-icon"><ShieldAlert size={26}/></span>
        <h2 id="hr4-permanent-title">Xóa vĩnh viễn {deletionStudents.length} học sinh?</h2>
        <p id="hr4-permanent-description">Thao tác không thể hoàn tác. Hồ sơ, điểm danh, rèn luyện, bản sao lưu và dữ liệu liên quan trong lớp sẽ bị loại bỏ.</p>
        <div className="hr4-permanent-names">{deletionStudents.slice(0, 5).map((item) => <span key={item.id}>{item.fullName}</span>)}{deletionStudents.length > 5 ? <small>Và {deletionStudents.length - 5} học sinh khác</small> : null}</div>
        <label>Nhập <b>{expectedDeleteText}</b> để xác nhận
          <input ref={deleteInputRef} value={deleteTyped} disabled={busy} autoComplete="off" spellCheck={false} placeholder={expectedDeleteText} onChange={(event) => setDeleteTyped(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && !busy) setDeleteRequest(null); if (event.key === 'Enter' && deleteConfirmed) confirmPermanentDelete(); }}/>
        </label>
        {error ? <p className="hr4-permanent-error" role="alert">{error}</p> : null}
        <div className="hr4-permanent-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => { setDeleteRequest(null); setError(''); }}>Hủy</button>
          <button type="button" className="hr4-permanent-confirm" disabled={busy || !deleteConfirmed} onClick={confirmPermanentDelete}><Trash2 size={17}/>{busy ? 'Đang xóa…' : 'Xóa vĩnh viễn'}</button>
        </div>
      </section>
    </div>, document.body) : null}
  </div>;
}
