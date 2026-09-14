import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Patch failed: ${label}`);
  return next;
}

// Global attendance controller: add class-archive data flow while keeping session archive permissions separate.
{
  const path = 'src/components/GlobalAttendanceNavigationTab.jsx';
  let source = read(path);

  source = replaceOnce(
    source,
    "import { archiveAttendanceHistory, listAttendanceArchive, requestAttendanceArchiveDelete, restoreAttendanceArchive, reviewAttendanceArchiveDelete } from '../attendance/attendanceArchiveApi.js';",
    "import { archiveAttendanceHistory, listAttendanceArchive, requestAttendanceArchiveDelete, restoreAttendanceArchive, reviewAttendanceArchiveDelete } from '../attendance/attendanceArchiveApi.js';\nimport { archiveExtraClass, finalizeExtraClassArchiveDelete, listExtraClassArchive, requestExtraClassArchiveDelete, restoreExtraClassArchive, reviewExtraClassArchiveDelete } from '../attendance/extraClassArchiveApi.js';",
    'extra-class archive API import',
  );

  source = replaceOnce(
    source,
    /const \[archiveItems, setArchiveItems\] = useState\(\[\]\);\n  const \[archiveLoading, setArchiveLoading\] = useState\(false\);/,
    "const [archiveItems, setArchiveItems] = useState([]);\n  const [classArchiveItems, setClassArchiveItems] = useState([]);\n  const [archiveLoading, setArchiveLoading] = useState(false);",
    'class archive state',
  );

  source = replaceOnce(
    source,
    /const canDeleteAttendanceHistory = isAttendanceAdmin[\s\S]*?const archiveCount = archiveItems\.length;/,
    `const canDeleteAttendanceHistory = isAttendanceAdmin
    || hasExplicitPermissionId(currentUser, ATTENDANCE_PERMISSION_IDS.delete)
    || String(currentUser?.email || '').trim().toLowerCase() === 'hongtham@accounts.brianenglish.studio';
  const canUseAttendanceHistoryArchive = canDeleteAttendanceHistory;
  const canUseClassArchive = isAttendanceAdmin || hasAttendanceTabAccess(currentUser, 'manage');
  const canOpenArchive = canUseAttendanceHistoryArchive || canUseClassArchive;
  const hasAttendanceReportOverride = isAttendanceAdmin || hasAttendanceTabAccess(currentUser, 'report');
  const canUseQuickAttendance = isAttendanceAdmin || hasAttendanceTabAccess(currentUser, 'quick') || hasAttendanceReportOverride;
  const archiveTab = { id: 'attendance:archive', tab: 'archive', titleVi: 'Kho lưu trữ' };
  const availableAttendanceTabs = [
    ...ATTENDANCE_PERMISSION_ITEMS.filter((item) => item.tab === 'quick' ? canUseQuickAttendance : canAccessAttendanceView(item.tab)),
    ...(canOpenArchive ? [archiveTab] : []),
  ];
  const archiveCount = archiveItems.length + classArchiveItems.length;`,
    'archive permission separation',
  );

  source = source.replaceAll("view === 'archive' ? canDeleteAttendanceHistory :", "view === 'archive' ? canOpenArchive :");
  source = source.replaceAll("canDeleteAttendanceHistory && view === 'archive'", "canOpenArchive && view === 'archive'");
  source = source.replaceAll("view === 'archive' && canDeleteAttendanceHistory", "view === 'archive' && canOpenArchive");

  source = replaceOnce(
    source,
    /  async function loadArchive\(\{ silent = false \} = \{\}\) \{[\s\S]*?\n  \}\n/,
    `  async function loadArchive({ silent = false } = {}) {
    if (!client || !runtime.ready || !runtime.session || !canOpenArchive) return;
    if (!silent) setArchiveLoading(true);
    try {
      const [attendanceItems, extraClassItems] = await Promise.all([
        canUseAttendanceHistoryArchive ? listAttendanceArchive(client) : Promise.resolve([]),
        canUseClassArchive ? listExtraClassArchive(client) : Promise.resolve([]),
      ]);
      setArchiveItems(attendanceItems);
      setClassArchiveItems(extraClassItems);
    } catch (archiveError) {
      setError(archiveError?.message || 'Không thể tải Kho lưu trữ.');
    } finally {
      if (!silent) setArchiveLoading(false);
    }
  }
`,
    'combined archive loader',
  );

  source = replaceOnce(
    source,
    /  async function deleteClass\(classRow\) \{[\s\S]*?\n  \}\n\n  function loadSupplementalSessionRecords/,
    `  async function deleteClass(classRow) {
    if (!classRow || busy || !client || !canUseClassArchive) return;
    const memberCount = members.filter((member) => String(member.class_id) === String(classRow.id)).length;
    const teacherCount = classTeachers.filter((teacher) => String(teacher.class_id) === String(classRow.id)).length;
    const sessionCount = sessions.filter((session) => String(session.class_id) === String(classRow.id)).length;
    const confirmed = window.confirm(
      \`Đưa lớp “\${classRow.class_name}” vào Kho lưu trữ?\\n\\n\`
      + \`\${memberCount} học sinh · \${teacherCount} giáo viên · \${sessionCount} buổi điểm danh sẽ được lưu cùng lớp.\\n\\n\`
      + 'Lớp có thể khôi phục sau này. Xóa vĩnh viễn vẫn phải được Admin duyệt.'
    );
    if (!confirmed) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await archiveExtraClass(client, classRow.id);
      if (String(selectedClassId) === String(classRow.id)) setSelectedClassId('');
      setSelectedSessionId(''); setRecords([]); setDaySession(null); setCalendarSessions([]);
      setNotice(\`Đã đưa lớp “\${result?.class_name || classRow.class_name}” vào Kho lưu trữ.\`);
      await loadAll({ keepSelection: false });
      await loadArchive({ silent: true });
      await loadTeacherDaySessions();
    } catch (archiveError) { setError(archiveError?.message || 'Không thể đưa lớp vào Kho lưu trữ.'); }
    finally { setBusy(false); }
  }

  function loadSupplementalSessionRecords`,
    'archive-first deleteClass',
  );

  source = replaceOnce(
    source,
    '  async function restoreArchivedSession(item) {',
    `  async function restoreArchivedClass(item) {
    if (!item?.archive_id || busy || !client || !canUseClassArchive) return;
    if (!window.confirm(\`Khôi phục nguyên trạng lớp “\${item.class_name || 'Lớp học'}” từ Kho lưu trữ?\`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await restoreExtraClassArchive(client, item.archive_id);
      setNotice(\`Đã khôi phục lớp “\${item.class_name || 'Lớp học'}” cùng danh sách học sinh, giáo viên và lịch sử điểm danh.\`);
      await loadAll({ keepSelection: false });
      await loadArchive({ silent: true });
      await loadTeacherDaySessions();
    } catch (restoreError) { setError(restoreError?.message || 'Không thể khôi phục lớp.'); }
    finally { setBusy(false); }
  }

  async function requestArchivedClassPermanentDelete(item) {
    if (!item?.archive_id || busy || !client || !canUseClassArchive) return;
    const reason = window.prompt(\`Lý do yêu cầu xóa vĩnh viễn lớp “\${item.class_name || 'Lớp học'}” (có thể để trống):\`, '');
    if (reason === null) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await requestExtraClassArchiveDelete(client, item.archive_id, reason);
      setNotice('Đã gửi yêu cầu xóa vĩnh viễn lớp. Admin phải xác nhận trước khi dữ liệu bị xóa hẳn.');
      await loadArchive({ silent: true });
    } catch (requestError) { setError(requestError?.message || 'Không thể gửi yêu cầu xóa vĩnh viễn lớp.'); }
    finally { setBusy(false); }
  }

  async function reviewArchivedClassPermanentDelete(item, approve) {
    if (!isAttendanceAdmin || !item?.archive_id || busy || !client) return;
    const retryApproved = approve && item.delete_request_status === 'approved';
    const action = retryApproved ? 'HOÀN TẤT XÓA VĨNH VIỄN' : approve ? 'DUYỆT XÓA VĨNH VIỄN' : 'TỪ CHỐI yêu cầu xóa';
    if (!window.confirm(\`\${action} lớp “\${item.class_name || 'Lớp học'}”?\${approve ? '\\n\\nSau khi hoàn tất, gói lớp và minh chứng sẽ không thể khôi phục.' : ''}\`)) return;
    const note = retryApproved ? '' : (window.prompt('Ghi chú Admin (có thể để trống):', '') ?? '');
    setBusy(true); setError(''); setNotice('');
    try {
      if (retryApproved) {
        await finalizeExtraClassArchiveDelete(client, item.archive_id, item.proof_paths);
      } else {
        await reviewExtraClassArchiveDelete(client, item.archive_id, approve, note);
      }
      setNotice(approve ? 'Đã hoàn tất xóa vĩnh viễn lớp.' : 'Đã từ chối yêu cầu xóa vĩnh viễn lớp.');
      await loadArchive({ silent: true });
    } catch (reviewError) { setError(reviewError?.message || 'Không thể xử lý yêu cầu xóa vĩnh viễn lớp.'); }
    finally { setBusy(false); }
  }

  async function restoreArchivedSession(item) {`,
    'class archive handlers',
  );

  source = replaceOnce(
    source,
    "              canManageMembers={canAccessAttendanceView('manage')}",
    "              canManageMembers={canAccessAttendanceView('manage')}\n              canArchiveClass={canUseClassArchive}",
    'workspace class archive capability',
  );

  source = replaceOnce(
    source,
    /\{canOpenArchive && view === 'archive' \? <AttendanceArchivePanel[\s\S]*?\/> : null\}/,
    `{canOpenArchive && view === 'archive' ? <AttendanceArchivePanel
            items={canUseAttendanceHistoryArchive ? archiveItems : []}
            classItems={canUseClassArchive ? classArchiveItems : []}
            loading={archiveLoading}
            busy={busy}
            isAdmin={isAttendanceAdmin}
            canManageClasses={canUseClassArchive}
            onRefresh={() => loadArchive()}
            onRestore={restoreArchivedSession}
            onRequestDelete={requestArchivedPermanentDelete}
            onApproveDelete={(item) => reviewArchivedPermanentDelete(item, true)}
            onRejectDelete={(item) => reviewArchivedPermanentDelete(item, false)}
            onRestoreClass={restoreArchivedClass}
            onRequestDeleteClass={requestArchivedClassPermanentDelete}
            onApproveDeleteClass={(item) => reviewArchivedClassPermanentDelete(item, true)}
            onRejectDeleteClass={(item) => reviewArchivedClassPermanentDelete(item, false)}
          /> : null}`,
    'unified archive panel wiring',
  );

  if (source.includes("client.rpc('bes_delete_extra_class'")) {
    throw new Error('Direct bes_delete_extra_class call remains after patch.');
  }
  if (!source.includes('canUseClassArchive') || !source.includes('classArchiveItems')) {
    throw new Error('Class archive integration is incomplete.');
  }
  write(path, source);
}

// Class management detail: keep a visible delete/archive action only for managers.
{
  const path = 'src/components/attendance/AttendanceClassManagementWorkspace.jsx';
  let source = read(path);
  source = replaceOnce(
    source,
    '  canManageMembers,\n  removeStudent,',
    '  canManageMembers,\n  canArchiveClass = false,\n  removeStudent,',
    'workspace canArchiveClass prop',
  );
  source = replaceOnce(
    source,
    '<button type="button" className="is-danger" disabled={busy} onClick={() => deleteClass?.(selectedClass)}><WorkspaceIcon name="trash" size={15} />Xóa lớp</button>',
    '{canArchiveClass ? (<button type="button" className="is-danger" disabled={busy} onClick={() => deleteClass?.(selectedClass)}><WorkspaceIcon name="trash" size={15} />Xóa lớp</button>) : null}',
    'conditional archive button',
  );
  write(path, source);
}

// Unified Archive panel. The backing collections stay separate and permission-gated by the controller.
{
  const path = 'src/components/attendance/AttendanceArchivePanel.jsx';
  write(path, `import React, { useMemo, useState } from 'react';
import './AttendanceArchive.css';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(\`\${String(value).slice(0, 10)}T00:00:00\`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN');
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function fold(value) {
  return String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
}

function requestLabel(status) {
  if (status === 'pending') return 'Đang chờ Admin duyệt';
  if (status === 'approved') return 'Admin đã duyệt · chờ hoàn tất xóa';
  if (status === 'rejected') return 'Admin đã từ chối yêu cầu xóa';
  return 'Chưa yêu cầu xóa vĩnh viễn';
}

function classTypeLabel(value) {
  return value === 'remedial' ? 'Phụ đạo' : value === 'gifted' ? 'Bồi dưỡng' : 'Lớp học';
}

export default function AttendanceArchivePanel({
  items = [],
  classItems = [],
  loading = false,
  busy = false,
  isAdmin = false,
  canManageClasses = false,
  onRefresh,
  onRestore,
  onRequestDelete,
  onApproveDelete,
  onRejectDelete,
  onRestoreClass,
  onRequestDeleteClass,
  onApproveDeleteClass,
  onRejectDeleteClass,
}) {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [requestStatus, setRequestStatus] = useState('all');

  const combined = useMemo(() => [
    ...items.map((item) => ({ ...item, archive_kind: 'attendance' })),
    ...classItems.map((item) => ({ ...item, archive_kind: 'class', source_type: 'class' })),
  ], [items, classItems]);

  const filtered = useMemo(() => combined.filter((item) => {
    if (source !== 'all' && item.source_type !== source) return false;
    if (requestStatus !== 'all' && item.delete_request_status !== requestStatus) return false;
    if (!query.trim()) return true;
    return fold(\`\${item.class_name} \${item.subject} \${item.teacher_name} \${item.archived_by_name} \${item.grade_level} \${item.school_year}\`).includes(fold(query));
  }), [combined, query, source, requestStatus]);

  const pendingCount = combined.filter((item) => item.delete_request_status === 'pending').length;
  const approvedCount = combined.filter((item) => item.delete_request_status === 'approved').length;

  return (
    <section className="attendance-archive" aria-label="Kho lưu trữ điểm danh">
      <header className="attendance-archive__hero">
        <div>
          <span className="attendance-archive__eyebrow">AN TOÀN DỮ LIỆU</span>
          <h2>Kho lưu trữ điểm danh</h2>
          <p>Buổi điểm danh và lớp học được xóa lần đầu sẽ nằm ở đây, vẫn có thể khôi phục trước khi Admin duyệt xóa vĩnh viễn.</p>
        </div>
        <div className="attendance-archive__stats" aria-label="Thống kê kho lưu trữ">
          <strong>{combined.length}</strong><span>đang lưu trữ</span>
          {isAdmin && pendingCount > 0 ? <em>{pendingCount} chờ duyệt xóa</em> : null}
          {isAdmin && approvedCount > 0 ? <em>{approvedCount} chờ hoàn tất xóa</em> : null}
        </div>
      </header>

      <div className="attendance-archive__toolbar" data-bes-keep-search="true">
        <label className="attendance-archive__search"><span>Tìm trong kho</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên lớp, môn, giáo viên…" /></label>
        <label><span>Nguồn</span><select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Tất cả</option><option value="class">Lớp học</option><option value="extra">Phụ đạo / Bồi dưỡng</option><option value="supplemental">Học bổ sung</option></select></label>
        <label><span>Trạng thái xóa</span><select value={requestStatus} onChange={(event) => setRequestStatus(event.target.value)}><option value="all">Tất cả</option><option value="none">Chưa yêu cầu</option><option value="pending">Chờ duyệt</option><option value="approved">Chờ hoàn tất</option><option value="rejected">Đã từ chối</option></select></label>
        <button type="button" className="attendance-archive__refresh" disabled={busy || loading} onClick={onRefresh}>Làm mới</button>
      </div>

      {loading ? <div className="attendance-archive__empty">Đang tải Kho lưu trữ…</div> : null}
      {!loading && !filtered.length ? <div className="attendance-archive__empty"><strong>{combined.length ? 'Không có mục phù hợp bộ lọc.' : 'Kho lưu trữ đang trống.'}</strong><span>{combined.length ? 'Hãy thay đổi từ khóa hoặc bộ lọc.' : 'Các lớp/buổi điểm danh được lưu trữ sẽ xuất hiện tại đây.'}</span></div> : null}

      {!loading && filtered.length ? <div className="attendance-archive__list">{filtered.map((item) => {
        const pending = item.delete_request_status === 'pending';
        const approved = item.delete_request_status === 'approved';
        const rejected = item.delete_request_status === 'rejected';
        const isClass = item.archive_kind === 'class';
        const mayMutate = isClass ? canManageClasses : true;
        const restore = isClass ? onRestoreClass : onRestore;
        const requestDelete = isClass ? onRequestDeleteClass : onRequestDelete;
        const approveDelete = isClass ? onApproveDeleteClass : onApproveDelete;
        const rejectDelete = isClass ? onRejectDeleteClass : onRejectDelete;
        return (
          <article key={\`\${item.archive_kind}:\${item.archive_id}\`} className={\`attendance-archive__card \${isClass ? 'is-class-card' : ''} \${pending || approved ? 'is-pending' : ''} \${rejected ? 'is-rejected' : ''}\`}>
            <div className="attendance-archive__card-main">
              <div className="attendance-archive__card-title"><span className={\`attendance-archive__source is-\${item.source_type}\`}>{isClass ? 'Lớp học' : item.source_type === 'supplemental' ? 'Học bổ sung' : 'Điểm danh lớp'}</span><h3>{item.class_name || (isClass ? 'Lớp học' : 'Buổi điểm danh')}</h3></div>
              {isClass ? <>
                <div className="attendance-archive__meta"><span><b>Loại lớp</b>{classTypeLabel(item.class_type)}</span><span><b>Môn</b>{item.subject || '—'}</span><span><b>Khối</b>{item.grade_level ? \`Khối \${item.grade_level}\` : '—'}</span><span><b>Năm học</b>{item.school_year || '—'}</span><span><b>Lưu trữ lúc</b>{formatDateTime(item.archived_at)}</span><span><b>Người lưu trữ</b>{item.archived_by_name || '—'}</span></div>
                <div className="attendance-archive__counts"><span>{item.member_count || 0} học sinh</span><span>{item.teacher_count || 0} giáo viên</span><span>{item.session_count || 0} buổi điểm danh</span><span>{item.record_count || 0} bản ghi</span></div>
              </> : <div className="attendance-archive__meta"><span><b>Ngày học</b>{formatDate(item.attendance_date)}</span><span><b>Giáo viên</b>{item.teacher_name || '—'}</span><span><b>Môn</b>{item.subject || '—'}</span><span><b>Lưu trữ lúc</b>{formatDateTime(item.archived_at)}</span></div>}
              <div className={\`attendance-archive__request-state is-\${item.delete_request_status || 'none'}\`}><strong>{requestLabel(item.delete_request_status)}</strong>{pending && item.delete_request_reason ? <span>Lý do: {item.delete_request_reason}</span> : null}{approved && item.delete_review_note ? <span>Ghi chú Admin: {item.delete_review_note}</span> : null}{rejected && item.delete_review_note ? <span>Phản hồi Admin: {item.delete_review_note}</span> : null}</div>
            </div>
            <div className="attendance-archive__actions">
              {mayMutate && !pending && !approved ? <button type="button" className="is-restore" disabled={busy} onClick={() => restore?.(item)}>Khôi phục</button> : null}
              {mayMutate && !pending && !approved ? <button type="button" className="is-request" disabled={busy} onClick={() => requestDelete?.(item)}>{rejected ? 'Gửi lại yêu cầu xóa' : 'Yêu cầu xóa vĩnh viễn'}</button> : null}
              {isAdmin && pending ? <><button type="button" className="is-reject" disabled={busy} onClick={() => rejectDelete?.(item)}>Từ chối</button><button type="button" className="is-approve" disabled={busy} onClick={() => approveDelete?.(item)}>Duyệt xóa vĩnh viễn</button></> : null}
              {isAdmin && approved ? <button type="button" className="is-approve" disabled={busy} onClick={() => approveDelete?.(item)}>Hoàn tất xóa vĩnh viễn</button> : null}
            </div>
          </article>
        );
      })}</div> : null}
    </section>
  );
}
`);
}

// Archive styling additions.
{
  const path = 'src/components/attendance/AttendanceArchive.css';
  let source = read(path);
  if (!source.includes('.attendance-archive__source.is-class')) {
    source += `\n.attendance-archive__source.is-class { background: #f0fdf4; color: #166534; }\n.attendance-archive__card.is-class-card { border-left: 4px solid #22c55e; }\n.attendance-archive__counts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; color: #475569; font-size: .8rem; font-weight: 700; }\n.attendance-archive__counts span { padding: 5px 8px; border-radius: 999px; background: #f8fafc; border: 1px solid #e2e8f0; }\n`;
  }
  write(path, source);
}

// Update the old class-deletion contract to require archive-first UI.
{
  const path = 'scripts/test-extra-class-attendance.mjs';
  let source = read(path);
  source = replaceOnce(
    source,
    "assert.match(attendanceManagementUi, /bes_delete_extra_class/, 'Class-management UI must call the class-deletion RPC');",
    "assert.match(attendanceManagementUi, /archiveExtraClass/, 'Class-management UI must route class deletion through the archive-first adapter');\nassert.doesNotMatch(attendance, /client\\.rpc\\(['\"]bes_delete_extra_class['\"]/, 'Class-management UI must not call the legacy hard-delete RPC directly');",
    'legacy extra-class deletion UI contract',
  );
  write(path, source);
}

// Ensure the general Frontend Build also runs the new contract.
{
  const path = '.github/workflows/frontend-build.yml';
  let source = read(path);
  if (!source.includes('test-extra-class-archive-governance.mjs')) {
    source = replaceOnce(
      source,
      "      - name: Verify report-access class creation\n        run: node scripts/test-attendance-report-class-creation-permission.mjs\n",
      "      - name: Verify report-access class creation\n        run: node scripts/test-attendance-report-class-creation-permission.mjs\n\n      - name: Verify extra-class archive governance\n        run: node scripts/test-extra-class-archive-governance.mjs\n",
      'frontend build archive contract',
    );
  }
  write(path, source);
}

console.log('Applied extra-class archive UI integration.');
