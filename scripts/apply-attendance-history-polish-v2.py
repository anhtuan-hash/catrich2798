from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


component_path = Path('src/components/GlobalAttendanceNavigationTab.jsx')
component = component_path.read_text()

component = replace_once(
    component,
    "  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v15h18V6a2 2 0 0 0-2-2Zm0 15H5V9h14v10ZM7 11h4v4H7v-4Z',\n};",
    "  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v15h18V6a2 2 0 0 0-2-2Zm0 15H5V9h14v10ZM7 11h4v4H7v-4Z',\n  teacher: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5Zm6.5-8.5 2 2 2-2-2-2-2 2Z',\n  book: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H7a3 3 0 0 0-3 3V4.5Zm3 11.5h11V4H6.5A.5.5 0 0 0 6 4.5v11.9c.3-.2.6-.4 1-.4Zm0 2a1 1 0 0 0 0 2h13v-2H7Z',\n  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-13h-2v6l5 3 1-1.7-4-2.3V7Z',\n  room: 'M12 2a7 7 0 0 0-7 7c0 5.1 7 13 7 13s7-7.9 7-13a7 7 0 0 0-7-7Zm0 10.5A3.5 3.5 0 1 1 12 5a3.5 3.5 0 0 1 0 7.5Z',\n  periods: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 5h12V6H6v2Zm0 5h12v-2H6v2Zm0 5h8v-2H6v2Z',\n  late: 'M12 2a10 10 0 1 0 9.5 13h-2.2A8 8 0 1 1 12 4v8l5 3-1 1.7-6-3.6V4.3A8 8 0 0 1 12 4V2Zm8 1v6h-2V3h2Zm0 8a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z',\n  absent: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v3h12.2a6.5 6.5 0 0 1-.2-1.5c0-2.2 1.1-4.2 2.8-5.4A15 15 0 0 0 9 13Zm10 1.6 1.4 1.4-1.9 1.9 1.9 1.9-1.4 1.4-1.9-1.9-1.9 1.9-1.4-1.4 1.9-1.9-1.9-1.9 1.4-1.4 1.9 1.9 1.9-1.9Z',\n  camera: 'M9 4 7.5 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.5L15 4H9Zm3 13a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',\n};",
    'add polished history icon paths',
)

old_info = '''                <h3 className="attendance-history-v2__section-title is-info"><span aria-hidden="true">▣</span>Thông tin buổi học</h3>
                <div className="attendance-history-info-grid">
                  <article><span className="attendance-history-v2__info-icon is-blue" aria-hidden="true">♙</span><div><span>Giáo viên</span><b>{teacherForSession(selectedSession)}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-green" aria-hidden="true">▥</span><div><span>Môn học</span><b>{selectedSession.subject || 'Chưa ghi môn'}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-purple" aria-hidden="true">▣</span><div><span>Ngày dạy</span><b>{formatDate(selectedSession.attendance_date)}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-orange" aria-hidden="true">◷</span><div><span>Thời gian</span><b>{selectedSession.teaching_time_range || 'Chưa ghi'}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-blue" aria-hidden="true">●</span><div><span>Phòng học</span><b>{selectedSession.teaching_room || 'Chưa ghi'}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-purple" aria-hidden="true">◆</span><div><span>Số tiết</span><b>{selectedSession.session_status === 'cancelled' ? '0 tiết' : `${String(selectedSession.lesson_periods || 1).replace('.', ',')} tiết`}</b></div></article>
                </div>'''

new_info = '''                <h3 className="attendance-history-v2__section-title is-info"><span aria-hidden="true"><Icon name="calendar" size={14} /></span>Thông tin buổi học</h3>
                <div className="attendance-history-info-grid">
                  <article><span className="attendance-history-v2__info-icon is-blue" aria-hidden="true"><Icon name="teacher" size={19} /></span><div><span>Giáo viên</span><b>{teacherForSession(selectedSession)}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-green" aria-hidden="true"><Icon name="book" size={19} /></span><div><span>Môn học</span><b>{selectedSession.subject || 'Chưa ghi môn'}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-purple" aria-hidden="true"><Icon name="calendar" size={19} /></span><div><span>Ngày dạy</span><b>{formatDate(selectedSession.attendance_date)}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-orange" aria-hidden="true"><Icon name="clock" size={19} /></span><div><span>Thời gian</span><b>{selectedSession.teaching_time_range || 'Chưa ghi'}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-blue" aria-hidden="true"><Icon name="room" size={19} /></span><div><span>Phòng học</span><b>{selectedSession.teaching_room || 'Chưa ghi'}</b></div></article>
                  <article><span className="attendance-history-v2__info-icon is-purple" aria-hidden="true"><Icon name="periods" size={19} /></span><div><span>Số tiết</span><b>{selectedSession.session_status === 'cancelled' ? '0 tiết' : `${String(selectedSession.lesson_periods || 1).replace('.', ',')} tiết`}</b></div></article>
                </div>'''
component = replace_once(component, old_info, new_info, 'replace info-card glyphs')

old_proof = '<section className="attendance-history-proof"><header><div><span aria-hidden="true">📷</span><div><strong>Minh chứng hình ảnh</strong>'
new_proof = '<section className="attendance-history-proof"><header><div><span className="attendance-history-v2__proof-icon" aria-hidden="true"><Icon name="camera" size={18} /></span><div><strong>Minh chứng hình ảnh</strong>'
component = replace_once(component, old_proof, new_proof, 'replace proof emoji')

old_summary = '''                  <h3 className="attendance-history-v2__section-title attendance-history-v2__summary-title"><span aria-hidden="true">◉</span>Tổng hợp điểm danh</h3>
                  <div className="attendance-history-stat-grid"><article><span className="attendance-history-v2__summary-icon is-blue" aria-hidden="true">●●</span><b>{selectedSession.total_students}</b><span>Sĩ số lớp</span></article><article className="is-present"><span className="attendance-history-v2__summary-icon is-green" aria-hidden="true">✓</span><b>{selectedSession.present_count}</b><span>Có mặt</span>{selectedLateRecords.length ? <small>{selectedLateRecords.length} đi trễ · vẫn tính có mặt</small> : null}</article><article className="is-absent"><span className="attendance-history-v2__summary-icon is-red" aria-hidden="true">×</span><b>{selectedSession.absent_count}</b><span>Vắng</span></article><article className="attendance-history-rate-card"><b>{selectedSessionAttendanceRate ?? 0}%</b><span>Tỷ lệ chuyên cần</span><span className="attendance-history-v2__rate-ring" style={{ '--attendance-rate': `${selectedSessionAttendanceRate ?? 0}%` }} aria-hidden="true" /></article></div>'''

new_summary = '''                  <h3 className="attendance-history-v2__section-title attendance-history-v2__summary-title"><span aria-hidden="true"><Icon name="attendance" size={14} /></span>Tổng hợp điểm danh</h3>
                  <div className="attendance-history-stat-grid">
                    <article><span className="attendance-history-v2__summary-icon is-blue" aria-hidden="true"><Icon name="people" size={19} /></span><b>{selectedSession.total_students}</b><span>Sĩ số lớp</span></article>
                    <article className="is-present"><span className="attendance-history-v2__summary-icon is-green" aria-hidden="true"><Icon name="check" size={19} /></span><b>{selectedSession.present_count}</b><span>Có mặt</span><small>Đã gồm học sinh đi trễ</small></article>
                    <article className="is-late"><span className="attendance-history-v2__summary-icon is-orange" aria-hidden="true"><Icon name="late" size={19} /></span><b>{selectedLateRecords.length}</b><span>Đi trễ</span><small>Vẫn tính có mặt</small></article>
                    <article className="is-absent"><span className="attendance-history-v2__summary-icon is-red" aria-hidden="true"><Icon name="absent" size={19} /></span><b>{selectedSession.absent_count}</b><span>Vắng</span></article>
                    <article className="attendance-history-rate-card"><b>{selectedSessionAttendanceRate ?? 0}%</b><span>Tỷ lệ chuyên cần</span><span className="attendance-history-v2__rate-ring" style={{ '--attendance-rate': `${selectedSessionAttendanceRate ?? 0}%` }} aria-hidden="true" /></article>
                  </div>'''
component = replace_once(component, old_summary, new_summary, 'replace attendance summary cards')

component_path.write_text(component)

css_path = Path('src/components/attendance/AttendanceHistoryV2.css')
css = css_path.read_text()

css = replace_once(
    css,
    '''.attendance-history-v2 .attendance-history-list-head {
  padding: 18px 16px 12px;
  border-bottom: 0;
  background: #fff;
}''',
    '''.attendance-history-v2 .attendance-history-list-head {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px 14px 10px;
  border-bottom: 0;
  background: #fff;
}''',
    'compact list header',
)

css = replace_once(
    css,
    '''.attendance-history-v2 .attendance-history-search {
  display: none;
}''',
    '''.attendance-history-v2 .attendance-history-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  margin-top: 10px;
  padding: 0 11px;
  border: 1px solid #dce6f5;
  border-radius: 12px;
  background: #f7faff;
  color: #6b82a5;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.attendance-history-v2 .attendance-history-search:focus-within {
  border-color: #9dbcf7;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(39, 100, 238, 0.08);
}

.attendance-history-v2 .attendance-history-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #243754;
  font: inherit;
  font-size: 11px;
}

.attendance-history-v2 .attendance-history-search input::placeholder {
  color: #91a0b6;
}''',
    'restore history search',
)

css = replace_once(
    css,
    '''.attendance-history-v2 .attendance-history-filters {
  margin-top: 18px;
}''',
    '''.attendance-history-v2 .attendance-history-filters {
  margin-top: 8px;
}''',
    'tighten filter gap',
)

css = replace_once(css, '  min-height: 104px;\n  padding: 12px 12px 12px 10px;', '  min-height: 88px;\n  padding: 10px 11px 10px 9px;', 'compact history session card')
css = replace_once(css, '  gap: 14px;\n  padding: 14px;\n  overflow: auto;', '  gap: 10px;\n  padding: 12px;\n  overflow: auto;', 'compact detail rhythm')
css = replace_once(css, '  min-height: 142px;\n  align-items: flex-start;', '  min-height: 118px;\n  align-items: flex-start;', 'compact hero height')
css = replace_once(css, '  padding: 18px 18px 17px;\n  overflow: hidden;', '  padding: 15px 16px 14px;\n  overflow: hidden;', 'compact hero padding')

css = replace_once(
    css,
    '''.attendance-history-v2 .att-m3-status-chip {
  padding: 6px 11px;''',
    '''.attendance-history-v2 .att-m3-status-chip {
  display: inline-flex;
  align-items: center;
  width: auto;
  max-width: max-content;
  padding: 6px 11px;''',
    'fix over-wide status chip',
)
css = replace_once(css, '  margin: 13px 0 9px;\n  color: #0c1d3b;', '  margin: 8px 0 7px;\n  color: #0c1d3b;', 'tighten hero title')
css = replace_once(css, '  min-height: 72px;\n  padding: 10px 11px;', '  min-height: 64px;\n  padding: 9px 10px;', 'compact info cards')

css = replace_once(
    css,
    '''.attendance-history-v2__summary-icon.is-red {
  background: #ffe4e8;
  color: #e13d50;
}''',
    '''.attendance-history-v2__summary-icon.is-red {
  background: #ffe4e8;
  color: #e13d50;
}

.attendance-history-v2__info-icon .attendance-icon,
.attendance-history-v2__summary-icon .attendance-icon,
.attendance-history-v2__section-title .attendance-icon,
.attendance-history-v2__proof-icon .attendance-icon {
  fill: currentColor;
}

.attendance-history-v2__proof-icon {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  background: #e9f1ff;
  color: #2764ee;
}''',
    'polish icon rendering',
)

css = replace_once(css, '  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 10px;\n}\n\n.attendance-history-v2 .attendance-history-stat-grid article {', '  grid-template-columns: repeat(5, minmax(0, 1fr));\n  gap: 8px;\n}\n\n.attendance-history-v2 .attendance-history-stat-grid article {', 'five-card attendance summary')
css = replace_once(css, '  min-height: 86px;\n  align-items: center;\n  padding: 12px;', '  min-height: 78px;\n  align-items: center;\n  padding: 10px;', 'compact summary cards')

css = replace_once(
    css,
    '''.attendance-history-v2 .attendance-history-stat-grid article.is-absent {
  border-color: #f6d6da;
  background: linear-gradient(135deg, #fff7f8, #ffedf0);
}''',
    '''.attendance-history-v2 .attendance-history-stat-grid article.is-late {
  border-color: #f5dfbf;
  background: linear-gradient(135deg, #fffaf1, #fff1da);
}

.attendance-history-v2 .attendance-history-stat-grid article.is-absent {
  border-color: #f6d6da;
  background: linear-gradient(135deg, #fff7f8, #ffedf0);
}''',
    'style tardy summary card',
)

css = replace_once(
    css,
    '''.attendance-history-v2 .attendance-history-stat-grid article.is-absent > b {
  color: #db3145;
}''',
    '''.attendance-history-v2 .attendance-history-stat-grid article.is-late > b {
  color: #db7b13;
}

.attendance-history-v2 .attendance-history-stat-grid article.is-absent > b {
  color: #db3145;
}''',
    'color tardy summary value',
)

css = replace_once(
    css,
    '''.attendance-history-v2 .attendance-audit-actor-panel {
  grid-column: 1;
  min-width: 0;''',
    '''.attendance-history-v2 .attendance-audit-actor-panel {
  grid-column: 1;
  align-self: start;
  min-width: 0;''',
    'stop audit stretch',
)

css = replace_once(
    css,
    '''.attendance-history-v2 .attendance-audit-actor-panel__head strong {''',
    '''.attendance-history-v2 .attendance-audit-actor-panel.is-loading {
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  background: linear-gradient(110deg, #fbfdff, #f5f9ff);
}

.attendance-history-v2 .attendance-audit-actor-panel.is-loading strong {
  flex: 0 0 auto;
  color: #1c2e4a;
  font-size: 12px;
}

.attendance-history-v2 .attendance-audit-actor-panel.is-loading span {
  min-width: 0;
  overflow: hidden;
  color: #71829c;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attendance-history-v2 .attendance-audit-actor-panel__head strong {''',
    'compact audit loading state',
)

css = replace_once(
    css,
    '''.attendance-history-v2 .attendance-history-proof {
  grid-column: 2;
  min-width: 0;''',
    '''.attendance-history-v2 .attendance-history-proof {
  grid-column: 2;
  align-self: start;
  min-width: 0;''',
    'stop proof stretch',
)
css = replace_once(css, '  max-height: 260px;\n  object-fit: cover;', '  max-height: 230px;\n  object-fit: cover;', 'compact proof image')
css = replace_once(css, '    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n\n  .attendance-history-v2__hero-art {', '    grid-template-columns: repeat(3, minmax(0, 1fr));\n  }\n\n  .attendance-history-v2__hero-art {', 'improve medium summary layout')

css_path.write_text(css)
print('Attendance history polish V2 patch applied')
