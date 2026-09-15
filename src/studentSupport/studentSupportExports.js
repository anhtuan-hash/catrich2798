const CLOSED_STATUSES = new Set(['CLOSED']);

function clean(value) {
  return String(value ?? '').trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function dateParts(value) {
  const date = new Date(value || 0);
  if (!Number.isFinite(date.getTime())) return { month: '', year: '' };
  return {
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

function matchesFilter(row, filters = {}) {
  const className = clean(row.source_class_name || row.class_name || row.className);
  const schoolYear = clean(row.school_year || row.schoolYear);
  const status = upper(row.status);
  const category = upper(row.category);
  const grade = clean(row.grade);
  const homeroomOwnerId = clean(row.homeroom_owner_id || row.homeroomOwnerId || row.owner_id);
  const semester = clean(row.semester);
  const created = dateParts(row.created_at || row.opened_at || row.updated_at);

  if (filters.className && className !== clean(filters.className)) return false;
  if (filters.schoolYear && schoolYear !== clean(filters.schoolYear)) return false;
  if (filters.status && status !== upper(filters.status)) return false;
  if (filters.category && category !== upper(filters.category)) return false;
  if (filters.grade && grade !== clean(filters.grade)) return false;
  if (filters.homeroomOwnerId && homeroomOwnerId !== clean(filters.homeroomOwnerId)) return false;
  if (filters.semester && semester !== clean(filters.semester)) return false;
  if (filters.month && created.month !== String(filters.month).padStart(2, '0')) return false;
  if (filters.calendarYear && created.year !== String(filters.calendarYear)) return false;
  return true;
}

function projectCase(row = {}) {
  return {
    id: clean(row.id),
    studentRef: clean(row.student_ref || row.studentRef),
    className: clean(row.source_class_name || row.class_name || row.className),
    schoolYear: clean(row.school_year || row.schoolYear),
    grade: clean(row.grade),
    category: upper(row.category),
    status: upper(row.status),
    ownerId: clean(row.owner_id || row.ownerId),
    followUpAt: row.follow_up_at || row.followUpAt || null,
    openedAt: row.opened_at || row.openedAt || row.created_at || null,
    resolvedAt: row.resolved_at || row.resolvedAt || null,
    closedAt: row.closed_at || row.closedAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function summarize(rows = []) {
  return rows.reduce((summary, row) => {
    const status = upper(row.status);
    summary.total += 1;
    if (status === 'ACTIVE') summary.active += 1;
    if (status === 'FOLLOW_UP') summary.followUp += 1;
    if (status === 'RESOLVED') summary.resolved += 1;
    if (CLOSED_STATUSES.has(status)) summary.closed += 1;
    if (status === 'NO_ACTION_REQUIRED') summary.noActionRequired += 1;
    return summary;
  }, {
    total: 0,
    active: 0,
    followUp: 0,
    resolved: 0,
    closed: 0,
    noActionRequired: 0,
  });
}

function groupCounts(rows, key) {
  return Object.entries(rows.reduce((acc, row) => {
    const value = clean(row[key]) || '—';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {})).map(([label, count]) => ({ label, count }));
}

export function buildSupportReport(input = {}, filters = {}) {
  const sourceCases = Array.isArray(input.cases) ? input.cases : [];
  const rows = sourceCases.filter((row) => matchesFilter(row, filters)).map(projectCase);
  const sourceAlerts = Array.isArray(input.alerts) ? input.alerts : [];
  const alertCount = sourceAlerts.filter((row) => matchesFilter(row, filters)).length;

  // Notes are deliberately not projected. Report/export surfaces must never copy
  // PRIVATE or free-text note bodies into aggregate datasets.
  return {
    title: 'Student Support Center',
    filters: {
      className: clean(filters.className),
      grade: clean(filters.grade),
      homeroomOwnerId: clean(filters.homeroomOwnerId),
      month: clean(filters.month),
      semester: clean(filters.semester),
      schoolYear: clean(filters.schoolYear),
      status: upper(filters.status),
      category: upper(filters.category),
    },
    summary: summarize(rows),
    alertCount,
    rows,
    grouped: {
      byClass: groupCounts(rows, 'className'),
      byStatus: groupCounts(rows, 'status'),
      byCategory: groupCounts(rows, 'category'),
    },
    generatedAt: new Date().toISOString(),
    productFooter: 'Thuộc bộ sản phẩm công nghệ số năm học 2026 - 2027 của Tổ Tiếng Anh THPT · TTCM: Nguyễn Anh Tuấn',
  };
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function tableRows(report) {
  return report.rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.studentRef)}</td>
      <td>${escapeHtml(row.className)}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(row.followUpAt || '')}</td>
    </tr>`).join('');
}

function reportHtml(report) {
  const filters = Object.entries(report.filters).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' · ');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Student Support Report</title>
  <style>body{font-family:Arial,sans-serif;margin:28px;color:#17211d}h1{margin:0 0 8px}p{line-height:1.5}.summary{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0}.summary b{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ccd5d1;padding:8px;text-align:left;font-size:12px}th{background:#eef6f2}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #ccd5d1;font-size:11px;color:#53645d}@media print{button{display:none}}</style>
  </head><body><h1>Trung tâm Hỗ trợ Học sinh</h1><p>${escapeHtml(filters || 'Tất cả dữ liệu trong phạm vi được phép')}</p>
  <div class="summary"><span>Tổng: <b>${report.summary.total}</b></span><span>Đang hỗ trợ: <b>${report.summary.active}</b></span><span>Theo dõi: <b>${report.summary.followUp}</b></span><span>Đã đóng: <b>${report.summary.closed}</b></span></div>
  <table><thead><tr><th>STT</th><th>Mã học sinh</th><th>Lớp</th><th>Nhóm hỗ trợ</th><th>Trạng thái</th><th>Theo dõi tiếp</th></tr></thead><tbody>${tableRows(report)}</tbody></table>
  <div class="footer">${escapeHtml(report.productFooter)} · Tạo lúc ${escapeHtml(report.generatedAt)}</div></body></html>`;
}

export function exportSupportReportPdf(report) {
  if (typeof window === 'undefined') throw new Error('PDF export requires a browser.');
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ in báo cáo.');
  popup.document.open();
  popup.document.write(reportHtml(report));
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 250);
}

export function exportSupportReportExcel(report) {
  if (typeof document === 'undefined') throw new Error('Excel export requires a browser.');
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${reportHtml(report).match(/<body>([\s\S]*)<\/body>/)?.[1] || ''}</body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `student-support-report-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
