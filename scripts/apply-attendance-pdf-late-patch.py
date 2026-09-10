from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected source fragment not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


report_path = 'src/utils/attendanceReport.js'
absence_tail = """    .sort((a, b) => String(a.attendance_date || '').localeCompare(String(b.attendance_date || '')) || a.student_full_name.localeCompare(b.student_full_name, 'vi'));

  return {
"""
late_block = """    .sort((a, b) => String(a.attendance_date || '').localeCompare(String(b.attendance_date || '')) || a.student_full_name.localeCompare(b.student_full_name, 'vi'));

  const lateRows = records
    .filter((record) => record.status === 'late' && completedIds.has(String(record.session_id)))
    .map((record) => {
      const session = sessionById.get(String(record.session_id));
      const classRow = classMap.get(String(session?.class_id || record?.class_id || ''));
      const audit = auditBySession.get(String(record.session_id)) || {};
      return {
        session_id: record.session_id,
        session_status: 'completed',
        attendance_date: session?.attendance_date || '',
        class_id: session?.class_id || record?.class_id || '',
        class_type: session?.class_type || classRow?.class_type || '',
        class_name: session?.class_name || classRow?.class_name || '',
        subject: session?.subject || classRow?.subject || '',
        teaching_room: session?.teaching_room || '',
        teaching_time_range: session?.teaching_time_range || '',
        checked_at: session?.checked_at || '',
        teacher_name: session?.teacher_name || '',
        checked_by_name: session?.checked_by_name || '',
        latest_changed_by_name: audit.latest_changed_by_name || '',
        latest_changed_at: audit.latest_changed_at || '',
        student_code: record.student_code || '',
        student_full_name: record.student_full_name || '',
        school_class_name: record.school_class_name || '',
      };
    })
    .sort((a, b) => String(a.attendance_date || '').localeCompare(String(b.attendance_date || '')) || a.student_full_name.localeCompare(b.student_full_name, 'vi'));

  return {
"""
replace_once(report_path, absence_tail, late_block)
replace_once(report_path, """    sessionRows,
    absenceRows,
  };
""", """    sessionRows,
    absenceRows,
    lateRows,
  };
""")

export_path = 'src/utils/attendanceReportExport.js'
replace_once(export_path, """      <td>${row.present_count ?? '—'}</td>
      <td>${row.absent_count ?? '—'}</td>
""", """      <td>${row.present_count ?? '—'}</td>
      <td>${row.late_count ?? '—'}</td>
      <td>${row.absent_count ?? '—'}</td>
""")

absence_html_tail = """  const absenceHtml = report.absenceRows.map((row) => `
    <tr>
      <td>${htmlEscape(formatDate(row.attendance_date))}</td>
      <td><b>${htmlEscape(row.student_full_name)}</b><small>${htmlEscape(row.student_code || 'Không có mã HS')} · Lớp ${htmlEscape(row.school_class_name || '—')}</small></td>
      <td><b>${htmlEscape(row.reason_label || 'Chưa ghi lý do')}</b><small>${htmlEscape(row.absence_note || '—')}</small></td>
      <td><b>${htmlEscape(row.class_name)}</b><small>${htmlEscape(row.subject || '—')}</small></td>
      <td>${htmlEscape(row.teacher_name || '—')}</td>
      <td><b>${htmlEscape(row.teaching_time_range || 'Chưa ghi')}</b><small>Chốt: ${htmlEscape(formatCheckedTime(row.checked_at))}</small></td>
      <td>${htmlEscape(row.teaching_room || 'Chưa ghi')}</td>
    </tr>
  `).join('');
"""
late_html_block = absence_html_tail + """  const lateHtml = report.lateRows.map((row) => `
    <tr>
      <td>${htmlEscape(formatDate(row.attendance_date))}</td>
      <td><b>${htmlEscape(row.student_full_name)}</b><small>${htmlEscape(row.student_code || 'Không có mã HS')} · Lớp ${htmlEscape(row.school_class_name || '—')}</small></td>
      <td><b>${htmlEscape(row.class_name)}</b><small>${htmlEscape(row.subject || '—')}</small></td>
      <td>${htmlEscape(row.teacher_name || '—')}</td>
      <td><b>${htmlEscape(row.teaching_time_range || 'Chưa ghi')}</b><small>Chốt: ${htmlEscape(formatCheckedTime(row.checked_at))}</small></td>
      <td>${htmlEscape(row.teaching_room || 'Chưa ghi')}</td>
    </tr>
  `).join('');
"""
replace_once(export_path, absence_html_tail, late_html_block)

old_header = """    <section class=\"section\"><h2>1. CHI TIẾT BUỔI HỌC</h2><table><thead><tr><th style=\"width:8%\">Ngày</th><th style=\"width:15%\">Lớp / môn</th><th style=\"width:11%\">GV / phòng</th><th style=\"width:11%\">Giờ dạy / chốt</th><th style=\"width:4%\">Tiết</th><th style=\"width:5%\">Sĩ số</th><th style=\"width:5%\">Có mặt</th><th style=\"width:4%\">Vắng</th><th style=\"width:6%\">Tỷ lệ</th><th style=\"width:10%\">Người điểm danh</th><th style=\"width:11%\">Người điều chỉnh gần nhất</th><th style=\"width:10%\">Trạng thái / ghi chú</th></tr></thead><tbody>${sessionHtml || '<tr><td colspan=\"12\">Không có dữ liệu phù hợp bộ lọc.</td></tr>'}</tbody></table></section>
"""
new_header = """    <section class=\"section\"><h2>1. CHI TIẾT BUỔI HỌC</h2><table><thead><tr><th style=\"width:7%\">Ngày</th><th style=\"width:14%\">Lớp / môn</th><th style=\"width:10%\">GV / phòng</th><th style=\"width:10%\">Giờ dạy / chốt</th><th style=\"width:4%\">Tiết</th><th style=\"width:5%\">Sĩ số</th><th style=\"width:5%\">Có mặt</th><th style=\"width:4%\">Đi trễ</th><th style=\"width:4%\">Vắng</th><th style=\"width:6%\">Tỷ lệ</th><th style=\"width:9%\">Người điểm danh</th><th style=\"width:11%\">Người điều chỉnh gần nhất</th><th style=\"width:11%\">Trạng thái / ghi chú</th></tr></thead><tbody>${sessionHtml || '<tr><td colspan=\"13\">Không có dữ liệu phù hợp bộ lọc.</td></tr>'}</tbody></table></section>
"""
replace_once(export_path, old_header, new_header)

absence_section = """    <section class=\"section\"><h2>2. CHI TIẾT HỌC SINH VẮNG</h2>${absenceHtml ? `<table><thead><tr><th style=\"width:9%\">Ngày</th><th style=\"width:22%\">Học sinh</th><th style=\"width:18%\">Lý do / ghi chú</th><th style=\"width:18%\">Lớp / môn</th><th style=\"width:15%\">Giáo viên</th><th style=\"width:12%\">Giờ dạy / chốt</th><th>Phòng</th></tr></thead><tbody>${absenceHtml}</tbody></table>` : '<p class=\"empty\">Không có học sinh vắng trong dữ liệu phù hợp bộ lọc.</p>'}</section>
"""
late_section = absence_section + """    <section class=\"section\"><h2>3. CHI TIẾT HỌC SINH ĐI TRỄ</h2>${lateHtml ? `<table><thead><tr><th style=\"width:10%\">Ngày</th><th style=\"width:26%\">Học sinh</th><th style=\"width:22%\">Lớp / môn</th><th style=\"width:18%\">Giáo viên</th><th style=\"width:16%\">Giờ dạy / chốt</th><th>Phòng</th></tr></thead><tbody>${lateHtml}</tbody></table>` : '<p class=\"empty\">Không có học sinh đi trễ trong dữ liệu phù hợp bộ lọc.</p>'}</section>
"""
replace_once(export_path, absence_section, late_section)

legacy_test = 'scripts/test-attendance-report-export.mjs'
replace_once(legacy_test, """  '2. CHI TIẾT HỌC SINH VẮNG',
  'NHẬN XÉT CHUNG',
""", """  '2. CHI TIẾT HỌC SINH VẮNG',
  '3. CHI TIẾT HỌC SINH ĐI TRỄ',
  'NHẬN XÉT CHUNG',
""")
replace_once(legacy_test, """  'Ngày', 'Lớp / môn', 'GV / phòng', 'Giờ dạy / chốt', 'Tiết', 'Sĩ số', 'Có mặt', 'Vắng', 'Tỷ lệ',
""", """  'Ngày', 'Lớp / môn', 'GV / phòng', 'Giờ dạy / chốt', 'Tiết', 'Sĩ số', 'Có mặt', 'Đi trễ', 'Vắng', 'Tỷ lệ',
""")
replace_once(legacy_test, """  'row.total_students', 'row.present_count', 'row.absent_count', 'row.attendance_rate', 'row.checked_by_name',
""", """  'row.total_students', 'row.present_count', 'row.late_count', 'row.absent_count', 'row.attendance_rate', 'row.checked_by_name',
""")
replace_once(legacy_test, """assert.doesNotMatch(reportExport, /3\\. CHI TIẾT HỌC SINH VẮNG/, 'PDF section numbering must be compact after removing teacher summary');
""", """assert.doesNotMatch(reportExport, /3\\. CHI TIẾT HỌC SINH VẮNG/, 'PDF section numbering must keep absence details as section 2');
""")

frontend = '.github/workflows/frontend-build.yml'
replace_once(frontend, """      - name: Verify attendance report export
        run: node scripts/test-attendance-report-export.mjs
""", """      - name: Verify attendance report export
        run: node scripts/test-attendance-report-export.mjs

      - name: Verify attendance PDF tardy-student details
        run: node scripts/test-attendance-pdf-late-students.mjs
""")
