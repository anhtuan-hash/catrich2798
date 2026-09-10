from pathlib import Path

path = Path('src/components/GlobalAttendanceNavigationTab.jsx')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 source match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    "import './attendance/AttendanceMaterial3.css';\n",
    "import './attendance/AttendanceMaterial3.css';\nimport './attendance/AttendanceHistoryV2.css';\n",
    'style import',
)

replace_once(
    '<div className="attendance-history-layout">',
    '<div className="attendance-history-layout attendance-history-v2">',
    'history v2 scope',
)

replace_once(
    '<div className="attendance-history-items">{filteredHistory.map((session) => {',
    '<div className="attendance-history-items">{filteredHistory.map((session, historyIndex) => {',
    'history card index',
)

replace_once(
    "                    {historySelectionMode ? <span className={`attendance-history-select-box ${isBulkSelected ? 'is-checked' : ''}`} aria-hidden=\"true\">{isBulkSelected ? <Icon name=\"check\" size={14} /> : null}</span> : null}\n                    <span className={`attendance-type-dot is-${session.class_type}`} />",
    "                    {historySelectionMode ? <span className={`attendance-history-select-box ${isBulkSelected ? 'is-checked' : ''}`} aria-hidden=\"true\">{isBulkSelected ? <Icon name=\"check\" size={14} /> : null}</span> : null}\n                    <span className=\"attendance-history-v2__number\">{historyIndex + 1}</span>\n                    <span className={`attendance-type-dot is-${session.class_type}`} />",
    'history card number',
)

replace_once(
    "                  <div className=\"attendance-history-actions\">{canAccessAttendanceView('report') ? <button type=\"button\" className=\"attendance-history-report-button\" onClick={() => { if (selectedSession.attendance_date) setReportMonth(selectedSession.attendance_date.slice(0, 7)); setView('report'); }}>Xem báo cáo tháng</button> : null}{canAccessAttendanceView('quick') ? <button type=\"button\" className=\"attendance-history-delete-button\" disabled={busy} onClick={() => deleteAttendanceSession(selectedSession)}><Icon name=\"trash\" size={17} />Xóa buổi điểm danh</button> : null}</div>",
    "                  <div className=\"attendance-history-v2__hero-art\" aria-hidden=\"true\"><span className=\"is-leaf is-leaf-1\" /><span className=\"is-leaf is-leaf-2\" /><span className=\"is-book is-book-1\" /><span className=\"is-book is-book-2\" /><span className=\"is-book is-book-3\" /></div>\n                  <div className=\"attendance-history-actions\">{canAccessAttendanceView('report') ? <button type=\"button\" className=\"attendance-history-report-button\" onClick={() => { if (selectedSession.attendance_date) setReportMonth(selectedSession.attendance_date.slice(0, 7)); setView('report'); }}>Xem báo cáo tháng</button> : null}{canAccessAttendanceView('quick') ? <button type=\"button\" className=\"attendance-history-delete-button\" disabled={busy} onClick={() => deleteAttendanceSession(selectedSession)}><Icon name=\"trash\" size={17} />Xóa buổi điểm danh</button> : null}</div>",
    'hero visual',
)

old_info = """                <div className=\"attendance-history-info-grid\">
                  <article><span>Giáo viên</span><b>{teacherForSession(selectedSession)}</b></article>
                  <article><span>Môn học</span><b>{selectedSession.subject || 'Chưa ghi môn'}</b></article>
                  <article><span>Ngày dạy</span><b>{formatDate(selectedSession.attendance_date)}</b></article>
                  <article><span>Thời gian</span><b>{selectedSession.teaching_time_range || 'Chưa ghi'}</b></article>
                  <article><span>Phòng học</span><b>{selectedSession.teaching_room || 'Chưa ghi'}</b></article>
                  <article><span>Số tiết</span><b>{selectedSession.session_status === 'cancelled' ? '0 tiết' : `${String(selectedSession.lesson_periods || 1).replace('.', ',')} tiết`}</b></article>
                </div>"""
new_info = """                <h3 className=\"attendance-history-v2__section-title is-info\"><span aria-hidden=\"true\">▣</span>Thông tin buổi học</h3>
                <div className=\"attendance-history-info-grid\">
                  <article><span className=\"attendance-history-v2__info-icon is-blue\" aria-hidden=\"true\">♙</span><div><span>Giáo viên</span><b>{teacherForSession(selectedSession)}</b></div></article>
                  <article><span className=\"attendance-history-v2__info-icon is-green\" aria-hidden=\"true\">▥</span><div><span>Môn học</span><b>{selectedSession.subject || 'Chưa ghi môn'}</b></div></article>
                  <article><span className=\"attendance-history-v2__info-icon is-purple\" aria-hidden=\"true\">▣</span><div><span>Ngày dạy</span><b>{formatDate(selectedSession.attendance_date)}</b></div></article>
                  <article><span className=\"attendance-history-v2__info-icon is-orange\" aria-hidden=\"true\">◷</span><div><span>Thời gian</span><b>{selectedSession.teaching_time_range || 'Chưa ghi'}</b></div></article>
                  <article><span className=\"attendance-history-v2__info-icon is-blue\" aria-hidden=\"true\">●</span><div><span>Phòng học</span><b>{selectedSession.teaching_room || 'Chưa ghi'}</b></div></article>
                  <article><span className=\"attendance-history-v2__info-icon is-purple\" aria-hidden=\"true\">◆</span><div><span>Số tiết</span><b>{selectedSession.session_status === 'cancelled' ? '0 tiết' : `${String(selectedSession.lesson_periods || 1).replace('.', ',')} tiết`}</b></div></article>
                </div>"""
replace_once(old_info, new_info, 'information cards')

old_stats = """                  <div className=\"attendance-history-stat-grid\"><article><b>{selectedSession.total_students}</b><span>Sĩ số</span></article><article className=\"is-present\"><b>{selectedSession.present_count}</b><span>Có mặt (gồm đi trễ)</span></article><article className=\"is-late\"><b>{selectedLateRecords.length}</b><span>Đi trễ</span></article><article className=\"is-absent\"><b>{selectedSession.absent_count}</b><span>Vắng</span></article><article className=\"attendance-history-rate-card\"><b>{selectedSessionAttendanceRate ?? 0}%</b><span>Tỷ lệ chuyên cần</span></article></div>"""
new_stats = """                  <h3 className=\"attendance-history-v2__section-title attendance-history-v2__summary-title\"><span aria-hidden=\"true\">◉</span>Tổng hợp điểm danh</h3>
                  <div className=\"attendance-history-stat-grid\"><article><span className=\"attendance-history-v2__summary-icon is-blue\" aria-hidden=\"true\">●●</span><b>{selectedSession.total_students}</b><span>Sĩ số lớp</span></article><article className=\"is-present\"><span className=\"attendance-history-v2__summary-icon is-green\" aria-hidden=\"true\">✓</span><b>{selectedSession.present_count}</b><span>Có mặt</span>{selectedLateRecords.length ? <small>{selectedLateRecords.length} đi trễ · vẫn tính có mặt</small> : null}</article><article className=\"is-absent\"><span className=\"attendance-history-v2__summary-icon is-red\" aria-hidden=\"true\">×</span><b>{selectedSession.absent_count}</b><span>Vắng</span></article><article className=\"attendance-history-rate-card\"><b>{selectedSessionAttendanceRate ?? 0}%</b><span>Tỷ lệ chuyên cần</span><span className=\"attendance-history-v2__rate-ring\" style={{ '--attendance-rate': `${selectedSessionAttendanceRate ?? 0}%` }} aria-hidden=\"true\" /></article></div>"""
replace_once(old_stats, new_stats, 'summary cards')

path.write_text(text, encoding='utf-8')
print('Attendance History V2 component patch applied')
