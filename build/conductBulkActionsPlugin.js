const BULK_STATE_MARKER = "  const [bulkWeekAction, setBulkWeekAction] = useState('');";

const BULK_WEEK_MEMOS = `  const attendanceWeeks = useMemo(() => {
    const weeks = Object.keys(workspace.attendance || {}).map((sessionKey) => {
      const date = String(sessionKey || '').split('::')[0];
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return '';
      try {
        return resolveConductWeekStart(workspace, date, { nearest: true });
      } catch {
        return '';
      }
    }).filter(Boolean);
    return [...new Set(weeks)].sort();
  }, [workspace]);
  const lockedWeekCount = useMemo(
    () => availableWeeks.filter((week) => isConductWeekLocked(workspace, week)).length,
    [availableWeeks, workspace],
  );
`;

const BULK_HANDLERS = `  const handleUnlockAllWeeks = async () => {
    if (bulkWeekAction) return;
    const lockedWeeks = availableWeeks.filter((week) => isConductWeekLocked(workspace, week));
    if (!lockedWeeks.length) return window.alert('Tất cả các tuần rèn luyện hiện đã được mở khóa.');

    const password = window.prompt(\`Nhập mật khẩu khóa rèn luyện để mở khóa \\${lockedWeeks.length} tuần:\`, '');
    if (password === null) return;
    const verified = await verifyConductLockPassword(workspace, password);
    if (!verified) return window.alert('Mật khẩu khóa rèn luyện không đúng.');
    if (!window.confirm(\`Mở khóa toàn bộ \\${lockedWeeks.length} tuần đã tổng kết? Các tuần này sẽ giữ nguyên dữ liệu nhưng có thể chỉnh sửa và đồng bộ lại từ điểm danh.\`)) return;

    setBulkWeekAction('unlocking');
    showRecordSaveFeedback('saving', 'Đang mở khóa tất cả các tuần…', \`Hệ thống đang mở \\${lockedWeeks.length} tuần và giữ nguyên toàn bộ điểm, vi phạm, khen thưởng.\`);
    try {
      const actor = currentUser?.name || currentUser?.email || 'GVCN';
      let next = workspace;
      lockedWeeks.forEach((week) => {
        next = reopenConductWeek(next, week, actor, 'Mở khóa hàng loạt để rà soát và đồng bộ dữ liệu điểm danh');
      });
      const saveResult = await onCommit(next, \`Đã mở khóa tất cả \\${lockedWeeks.length} tuần rèn luyện.\`);
      showRecordSaveFeedback(
        saveResult?.ok === false ? 'warning' : 'success',
        saveResult?.ok === false ? 'Đã mở khóa trên thiết bị' : 'Đã mở khóa tất cả các tuần',
        \`\\${lockedWeeks.length} tuần đã được chuyển sang trạng thái đang mở; dữ liệu cũ vẫn được giữ nguyên.\`,
        3200,
      );
    } catch (error) {
      showRecordSaveFeedback('error', 'Không thể mở khóa tất cả các tuần', error?.message || 'Vui lòng thử lại.', 3800);
    } finally {
      setBulkWeekAction('');
    }
  };

  const handleSyncAllAttendanceWeeks = async () => {
    if (bulkWeekAction) return;
    if (!attendanceWeeks.length) return window.alert('Chưa có dữ liệu điểm danh để đồng bộ.');

    const lockedAttendanceWeeks = attendanceWeeks.filter((week) => isConductWeekLocked(workspace, week));
    if (lockedAttendanceWeeks.length) {
      return window.alert(\`Có \\${lockedAttendanceWeeks.length} tuần chứa dữ liệu điểm danh đang bị khóa. Hãy bấm “Mở khóa tất cả các tuần” trước, sau đó đồng bộ lại.\`);
    }
    if (!window.confirm(\`Đồng bộ dữ liệu điểm danh của \\${attendanceWeeks.length} tuần vào điểm rèn luyện? Bản ghi cũ sẽ được cập nhật hoặc gỡ theo trạng thái điểm danh hiện tại, không tạo bản ghi trùng.\`)) return;

    setBulkWeekAction('syncing');
    showRecordSaveFeedback('saving', 'Đang đồng bộ tất cả các tuần…', \`Hệ thống đang rà soát \\${attendanceWeeks.length} tuần có dữ liệu điểm danh.\`);
    try {
      const actor = currentUser?.name || currentUser?.email || 'GVCN';
      let next = workspace;
      let added = 0;
      let updated = 0;
      let removed = 0;
      attendanceWeeks.forEach((week) => {
        const result = syncAttendanceToConduct(next, week, actor);
        next = result.workspace;
        added += Number(result.added) || 0;
        updated += Number(result.updated) || 0;
        removed += Number(result.removed) || 0;
      });
      const changed = added + updated + removed;
      if (!changed) {
        setBulkWeekAction('');
        return window.alert(\`Đã kiểm tra \\${attendanceWeeks.length} tuần. Dữ liệu điểm danh và điểm rèn luyện đã đồng bộ, không có thay đổi mới.\`);
      }
      const saveResult = await onCommit(
        next,
        \`Đã đồng bộ tất cả tuần: thêm \\${added}, cập nhật \\${updated}, gỡ \\${removed} ghi nhận điểm danh.\`,
      );
      showRecordSaveFeedback(
        saveResult?.ok === false ? 'warning' : 'success',
        saveResult?.ok === false ? 'Đã đồng bộ trên thiết bị' : 'Đã đồng bộ tất cả các tuần',
        \`Đã rà soát \\${attendanceWeeks.length} tuần: thêm \\${added}, cập nhật \\${updated}, gỡ \\${removed} ghi nhận.\`,
        3600,
      );
    } catch (error) {
      showRecordSaveFeedback('error', 'Không thể đồng bộ tất cả các tuần', error?.message || 'Vui lòng thử lại.', 4000);
    } finally {
      setBulkWeekAction('');
    }
  };

`;

const BULK_PANEL = `
      <section className="hr-panel hr-conduct-bulk-panel">
        <div>
          <small>THAO TÁC HÀNG LOẠT</small>
          <h3>Mở khóa và đồng bộ toàn bộ năm học</h3>
          <p>Mở khóa tất cả các tuần đã tổng kết, sau đó đồng bộ toàn bộ dữ liệu điểm danh vào điểm rèn luyện. Hệ thống cập nhật đúng bản ghi hiện có và không tạo dữ liệu trùng.</p>
          <span><b>{lockedWeekCount}</b> tuần đang khóa · <b>{attendanceWeeks.length}</b> tuần có dữ liệu điểm danh</span>
        </div>
        <div className="hr-conduct-bulk-actions">
          <button type="button" className="warning" disabled={Boolean(bulkWeekAction) || lockedWeekCount === 0} onClick={handleUnlockAllWeeks}>
            {bulkWeekAction === 'unlocking' ? 'Đang mở khóa…' : 'Mở khóa tất cả các tuần'}
          </button>
          <button type="button" className="primary" disabled={Boolean(bulkWeekAction) || attendanceWeeks.length === 0} onClick={handleSyncAllAttendanceWeeks}>
            {bulkWeekAction === 'syncing' ? 'Đang đồng bộ…' : 'Đồng bộ tất cả các tuần'}
          </button>
        </div>
      </section>
`;

export default function conductBulkActionsPlugin() {
  return {
    name: 'brian-conduct-bulk-actions',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\\\', '/');
      if (!cleanId.endsWith('/src/components/HomeroomConductTab.jsx')) return null;
      if (code.includes('handleSyncAllAttendanceWeeks')) return code;

      let next = code;
      next = next.replace(
        "import './HomeroomConductScrollColor.css';",
        "import './HomeroomConductScrollColor.css';\nimport './ConductBulkActions.css';",
      );
      next = next.replace(
        "  const [lockPasswordStatus, setLockPasswordStatus] = useState({ type: '', message: '' });",
        "  const [lockPasswordStatus, setLockPasswordStatus] = useState({ type: '', message: '' });\n" + BULK_STATE_MARKER,
      );
      next = next.replace(
        '  const selectAdjacentWeek = (offset) => {',
        BULK_WEEK_MEMOS + '  const selectAdjacentWeek = (offset) => {',
      );
      next = next.replace(
        '  const handleAddCustomRule = async () => {',
        BULK_HANDLERS + '  const handleAddCustomRule = async () => {',
      );
      next = next.replace(
        '      {selectedPlanRow ? (',
        BULK_PANEL + '\n      {selectedPlanRow ? (',
      );

      return next;
    },
  };
}
