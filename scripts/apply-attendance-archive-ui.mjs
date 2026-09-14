import fs from 'node:fs';

const path = 'src/components/GlobalAttendanceNavigationTab.jsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  if (source.includes(after)) return;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one source match, found ${count}`);
  source = source.replace(before, after);
}

replaceOnce(
  "import AttendanceDailySchedule from './attendance/AttendanceDailySchedule.jsx';\n",
  "import AttendanceDailySchedule from './attendance/AttendanceDailySchedule.jsx';\nimport AttendanceArchivePanel from './attendance/AttendanceArchivePanel.jsx';\n",
  'archive panel import',
);

replaceOnce(
  "import { attachSupplementalProof, beginSupplementalAttendance, cancelSupplementalSession, confirmSupplementalAttendance, deleteSupplementalAttendanceHistory, loadSupplementalAttendanceActivities, loadSupplementalSessionTeachers } from '../attendance/supplementalLearningApi.js';\n",
  "import { attachSupplementalProof, beginSupplementalAttendance, cancelSupplementalSession, confirmSupplementalAttendance, loadSupplementalAttendanceActivities, loadSupplementalSessionTeachers } from '../attendance/supplementalLearningApi.js';\nimport { archiveAttendanceHistory, listAttendanceArchive, requestAttendanceArchiveDelete, restoreAttendanceArchive, reviewAttendanceArchiveDelete } from '../attendance/attendanceArchiveApi.js';\n",
  'archive API import',
);

replaceOnce(
  "  report: 'history',\n};",
  "  report: 'history',\n  archive: 'trash',\n};",
  'archive icon',
);

replaceOnce(
  "  const [supplementalHistorySessions, setSupplementalHistorySessions] = useState([]);\n  const [records, setRecords] = useState([]);",
  "  const [supplementalHistorySessions, setSupplementalHistorySessions] = useState([]);\n  const [archiveItems, setArchiveItems] = useState([]);\n  const [archiveLoading, setArchiveLoading] = useState(false);\n  const [records, setRecords] = useState([]);",
  'archive state',
);

replaceOnce(
  "  const canUseQuickAttendance = isAttendanceAdmin || hasAttendanceTabAccess(currentUser, 'quick') || hasAttendanceReportOverride;\n  const availableAttendanceTabs = ATTENDANCE_PERMISSION_ITEMS.filter((item) => item.tab === 'quick' ? canUseQuickAttendance : canAccessAttendanceView(item.tab));\n  const firstAllowedView = canUseQuickAttendance ? 'quick' : getFirstAllowedAttendanceTab(currentUser);",
  "  const canUseQuickAttendance = isAttendanceAdmin || hasAttendanceTabAccess(currentUser, 'quick') || hasAttendanceReportOverride;\n  const archiveTab = { id: 'attendance:archive', tab: 'archive', titleVi: 'Kho lưu trữ' };\n  const availableAttendanceTabs = [\n    ...ATTENDANCE_PERMISSION_ITEMS.filter((item) => item.tab === 'quick' ? canUseQuickAttendance : canAccessAttendanceView(item.tab)),\n    ...(canDeleteAttendanceHistory ? [archiveTab] : []),\n  ];\n  const archiveCount = archiveItems.length;\n  const firstAllowedView = canUseQuickAttendance ? 'quick' : getFirstAllowedAttendanceTab(currentUser);",
  'archive tab access',
);

replaceOnce(
  "    const canOpenCurrentView = view === 'quick' ? canUseQuickAttendance : canAccessAttendanceView(view);\n",
  "    const canOpenCurrentView = view === 'quick' ? canUseQuickAttendance : view === 'archive' ? canDeleteAttendanceHistory : canAccessAttendanceView(view);\n",
  'archive view guard',
);

replaceOnce(
  "  async function refreshHistoryData() {\n",
  `  async function loadArchive({ silent = false } = {}) {\n    if (!client || !runtime.ready || !runtime.session || !canDeleteAttendanceHistory) return;\n    if (!silent) setArchiveLoading(true);\n    try {\n      setArchiveItems(await listAttendanceArchive(client));\n    } catch (archiveError) {\n      setError(archiveError?.message || 'Không thể tải Kho lưu trữ điểm danh.');\n    } finally {\n      if (!silent) setArchiveLoading(false);\n    }\n  }\n\n  async function refreshHistoryData() {\n`,
  'archive loader',
);

replaceOnce(
  "  useEffect(() => {\n    if (open && allowed && !String(selectedClassId || '').startsWith('supplemental:')) loadAll();\n  }, [open, allowed, runtime.ready, runtime.session?.user?.id]);\n",
  "  useEffect(() => {\n    if (open && allowed && !String(selectedClassId || '').startsWith('supplemental:')) loadAll();\n  }, [open, allowed, runtime.ready, runtime.session?.user?.id]);\n\n  useEffect(() => {\n    if (open && canDeleteAttendanceHistory) loadArchive();\n  }, [open, canDeleteAttendanceHistory, runtime.ready, runtime.session?.user?.id]);\n",
  'archive load effect',
);

const oldDeleteBlock = `  async function deleteAttendanceHistoryAtSource(session) {\n    if (isSupplementalHistorySession(session)) {\n      try {\n        await deleteSupplementalAttendanceHistory(client, session.supplemental_session_id);\n        return { error: null };\n      } catch (error) {\n        return { error };\n      }\n    }\n    return client.rpc('bes_delete_extra_attendance_session', { p_session_id: session.id });\n  }\n\n  async function deleteAttendanceSession(session) {\n    if (!session || busy || !client || !canDeleteAttendanceHistory) return;\n    const confirmed = window.confirm(\`Xóa buổi điểm danh đã duyệt của lớp “\${session.class_name}” ngày \${formatDate(session.attendance_date)} lúc \${formatDateTime(session.checked_at)}?\\n\\nNgày này sẽ được mở khóa để có thể điểm danh lại. Không thể hoàn tác.\`);\n    if (!confirmed) return;\n    setBusy(true); setError(''); setNotice('');\n    try {\n      const { error: deleteError } = await deleteAttendanceHistoryAtSource(session);\n      if (deleteError) throw deleteError;\n      await removeAttendanceProofPaths([session.proof_path]);\n      setSelectedSessionId(''); setRecords([]);\n      if (String(session.class_id) === String(selectedClassId) && session.attendance_date === attendanceDate) setDaySession(null);\n      setNotice(\`Đã xóa điểm danh \${session.class_name} ngày \${formatDate(session.attendance_date)}. Ngày này đã được mở khóa.\`);\n      await loadAll();\n      await loadDaySession();\n      await loadTeacherDaySessions();\n      await loadCalendarSessions(calendarDate);\n    } catch (deleteError) { setError(deleteError?.message || 'Không thể xóa buổi điểm danh đã duyệt.'); }\n    finally { setBusy(false); }\n  }\n`;

const newDeleteBlock = `  async function deleteAttendanceSession(session) {\n    if (!session || busy || !client || !canDeleteAttendanceHistory) return;\n    const confirmed = window.confirm(\`Đưa buổi điểm danh của lớp “\${session.class_name}” ngày \${formatDate(session.attendance_date)} vào Kho lưu trữ?\\n\\nBuổi này sẽ không còn xuất hiện trong Lịch sử/Báo cáo và có thể khôi phục lại sau.\`);\n    if (!confirmed) return;\n    setBusy(true); setError(''); setNotice('');\n    try {\n      await archiveAttendanceHistory(client, session);\n      setSelectedSessionId(''); setRecords([]);\n      if (String(session.class_id) === String(selectedClassId) && session.attendance_date === attendanceDate) setDaySession(null);\n      setNotice(\`Đã chuyển \${session.class_name} ngày \${formatDate(session.attendance_date)} vào Kho lưu trữ.\`);\n      await loadAll();\n      await loadArchive({ silent: true });\n      await loadDaySession();\n      await loadTeacherDaySessions();\n      await loadCalendarSessions(calendarDate);\n    } catch (deleteError) { setError(deleteError?.message || 'Không thể đưa buổi điểm danh vào Kho lưu trữ.'); }\n    finally { setBusy(false); }\n  }\n`;
replaceOnce(oldDeleteBlock, newDeleteBlock, 'single archive flow');

const oldBulk = `    const confirmed = window.confirm(\`Xóa \${targets.length} buổi điểm danh đã chọn?\\n\\nCác ngày tương ứng sẽ được mở khóa để có thể điểm danh lại. Không thể hoàn tác.\`);\n    if (!confirmed) return;\n    setBusy(true); setError(''); setNotice('');\n    const failed = [];\n    const deletedIds = new Set();\n    const proofPathsToRemove = [];\n    try {\n      for (const session of targets) {\n        const { error: deleteError } = await deleteAttendanceHistoryAtSource(session);\n        if (deleteError) {\n          failed.push(\`\${session.class_name} \${formatDate(session.attendance_date)}: \${deleteError.message || 'Lỗi không xác định'}\`);\n        } else {\n          deletedIds.add(String(session.id));\n          if (session.proof_path) proofPathsToRemove.push(session.proof_path);\n        }\n      }\n      await removeAttendanceProofPaths(proofPathsToRemove);\n`;
const newBulk = `    const confirmed = window.confirm(\`Đưa \${targets.length} buổi điểm danh đã chọn vào Kho lưu trữ?\\n\\nCác buổi này sẽ không còn xuất hiện trong Lịch sử/Báo cáo và có thể khôi phục lại sau.\`);\n    if (!confirmed) return;\n    setBusy(true); setError(''); setNotice('');\n    const failed = [];\n    const deletedIds = new Set();\n    try {\n      for (const session of targets) {\n        try {\n          await archiveAttendanceHistory(client, session);\n          deletedIds.add(String(session.id));\n        } catch (archiveError) {\n          failed.push(\`\${session.class_name} \${formatDate(session.attendance_date)}: \${archiveError?.message || 'Lỗi không xác định'}\`);\n        }\n      }\n`;
replaceOnce(oldBulk, newBulk, 'bulk archive start');

replaceOnce(
  "      if (deletedIds.size) setNotice(`Đã xóa ${deletedIds.size} buổi điểm danh. Các ngày tương ứng đã được mở khóa.`);\n      if (failed.length) setError(`Không thể xóa ${failed.length} buổi: ${failed.slice(0, 3).join(' · ')}${failed.length > 3 ? ` · và ${failed.length - 3} buổi khác` : ''}`);\n      await loadAll();\n",
  "      if (deletedIds.size) setNotice(`Đã chuyển ${deletedIds.size} buổi điểm danh vào Kho lưu trữ.`);\n      if (failed.length) setError(`Không thể lưu trữ ${failed.length} buổi: ${failed.slice(0, 3).join(' · ')}${failed.length > 3 ? ` · và ${failed.length - 3} buổi khác` : ''}`);\n      await loadAll();\n      await loadArchive({ silent: true });\n",
  'bulk archive result',
);

replaceOnce(
  "  const combinedHistorySessions = useMemo(() => [...sessions, ...supplementalHistorySessions], [sessions, supplementalHistorySessions]);\n",
  `  async function restoreArchivedSession(item) {\n    if (!item?.archive_id || busy || !client) return;\n    if (!window.confirm(\`Khôi phục “\${item.class_name || 'buổi điểm danh'}” ngày \${formatDate(item.attendance_date)} về Lịch sử điểm danh?\`)) return;\n    setBusy(true); setError(''); setNotice('');\n    try {\n      await restoreAttendanceArchive(client, item.archive_id);\n      setNotice(\`Đã khôi phục \${item.class_name || 'buổi điểm danh'} ngày \${formatDate(item.attendance_date)}.\`);\n      await loadAll();\n      await loadArchive({ silent: true });\n      await loadTeacherDaySessions();\n      await loadCalendarSessions(calendarDate);\n    } catch (restoreError) {\n      setError(restoreError?.message || 'Không thể khôi phục buổi điểm danh.');\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function requestArchivedPermanentDelete(item) {\n    if (!item?.archive_id || busy || !client) return;\n    const reason = window.prompt('Nhập lý do yêu cầu Admin xóa vĩnh viễn (có thể để trống):', item.delete_request_reason || '');\n    if (reason === null) return;\n    setBusy(true); setError(''); setNotice('');\n    try {\n      await requestAttendanceArchiveDelete(client, item.archive_id, reason);\n      setNotice('Đã gửi yêu cầu xóa vĩnh viễn. Dữ liệu vẫn được giữ nguyên cho đến khi Admin duyệt.');\n      await loadArchive({ silent: true });\n    } catch (requestError) {\n      setError(requestError?.message || 'Không thể gửi yêu cầu xóa vĩnh viễn.');\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function reviewArchivedPermanentDelete(item, approve) {\n    if (!isAttendanceAdmin || !item?.archive_id || busy || !client) return;\n    const action = approve ? 'DUYỆT XÓA VĨNH VIỄN' : 'TỪ CHỐI yêu cầu xóa';\n    if (!window.confirm(\`\${action} “\${item.class_name || 'buổi điểm danh'}” ngày \${formatDate(item.attendance_date)}?\${approve ? '\\n\\nDữ liệu và ảnh minh chứng sẽ không thể khôi phục.' : ''}\`)) return;\n    const note = window.prompt('Ghi chú của Admin (có thể để trống):', '') ?? '';\n    setBusy(true); setError(''); setNotice('');\n    try {\n      await reviewAttendanceArchiveDelete(client, item.archive_id, approve, note);\n      setNotice(approve ? 'Admin đã duyệt xóa vĩnh viễn mục lưu trữ.' : 'Admin đã từ chối yêu cầu xóa vĩnh viễn.');\n      await loadArchive({ silent: true });\n    } catch (reviewError) {\n      setError(reviewError?.message || 'Không thể xử lý yêu cầu xóa vĩnh viễn.');\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  const combinedHistorySessions = useMemo(() => [...sessions, ...supplementalHistorySessions], [sessions, supplementalHistorySessions]);\n`,
  'archive action handlers',
);

replaceOnce(
  "          <div className=\"attendance-top-actions\"><button type=\"button\" className=\"attendance-icon-button\" onClick={() => { loadAll(); loadDaySession(); loadTeacherDaySessions(); if (view === 'calendar') loadCalendarSessions(calendarDate); }} title=\"Làm mới\"><Icon name=\"refresh\" /></button><button type=\"button\" className=\"attendance-icon-button\" onClick={() => setOpen(false)} aria-label=\"Đóng\"><Icon name=\"close\" /></button></div>\n",
  "          <div className=\"attendance-top-actions\"><button type=\"button\" className=\"attendance-icon-button\" onClick={() => { loadAll(); loadDaySession(); loadTeacherDaySessions(); if (view === 'calendar') loadCalendarSessions(calendarDate); if (view === 'archive') loadArchive(); }} title=\"Làm mới\"><Icon name=\"refresh\" /></button><button type=\"button\" className=\"attendance-icon-button\" onClick={() => setOpen(false)} aria-label=\"Đóng\"><Icon name=\"close\" /></button></div>\n",
  'archive refresh',
);

replaceOnce(
  "              <Icon name={ATTENDANCE_TAB_ICONS[item.tab] || 'attendance'} size={18} />{item.titleVi}\n",
  "              <Icon name={ATTENDANCE_TAB_ICONS[item.tab] || 'attendance'} size={18} />{item.titleVi}{item.tab === 'archive' && archiveCount > 0 ? <span className=\"attendance-tab-badge\">{archiveCount > 99 ? '99+' : archiveCount}</span> : null}\n",
  'archive count badge',
);

replaceOnce(
  "          {!loading && canAccessAttendanceView('report') && view === 'report' ? <AttendanceMonthlyReport client={client} classes={classes} includeSupplemental={canSeeSupplementalHistory} month={reportMonth} onMonthChange={setReportMonth} onError={setError} /> : null}\n\n",
  `          {!loading && canAccessAttendanceView('report') && view === 'report' ? <AttendanceMonthlyReport client={client} classes={classes} includeSupplemental={canSeeSupplementalHistory} month={reportMonth} onMonthChange={setReportMonth} onError={setError} /> : null}\n\n          {canDeleteAttendanceHistory && view === 'archive' ? <AttendanceArchivePanel\n            items={archiveItems}\n            loading={archiveLoading}\n            busy={busy}\n            isAdmin={isAttendanceAdmin}\n            onRefresh={() => loadArchive()}\n            onRestore={restoreArchivedSession}\n            onRequestDelete={requestArchivedPermanentDelete}\n            onApproveDelete={(item) => reviewArchivedPermanentDelete(item, true)}\n            onRejectDelete={(item) => reviewArchivedPermanentDelete(item, false)}\n          /> : null}\n\n`,
  'archive panel render',
);

replaceOnce(
  "<Icon name=\"trash\" size={16} />{busy ? 'Đang xóa…' : `Xóa ${selectedHistorySessionIds.length} buổi`}",
  "<Icon name=\"trash\" size={16} />{busy ? 'Đang lưu trữ…' : `Lưu trữ ${selectedHistorySessionIds.length} buổi`}",
  'bulk button copy',
);

replaceOnce(
  "<p>Chọn các buổi ở danh sách bên trái, sau đó dùng nút xóa để xử lý một lần.</p>",
  "<p>Chọn các buổi ở danh sách bên trái, sau đó chuyển một lần vào Kho lưu trữ.</p>",
  'bulk helper copy',
);

replaceOnce(
  "<Icon name=\"trash\" size={17} />Xóa buổi điểm danh",
  "<Icon name=\"trash\" size={17} />Đưa vào Kho lưu trữ",
  'single button copy',
);

fs.writeFileSync(path, source);
console.log('Applied attendance archive UI patch.');
