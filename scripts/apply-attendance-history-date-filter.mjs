import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const componentPath = path.join(root, 'src/components/GlobalAttendanceNavigationTab.jsx');
const cssPath = path.join(root, 'src/components/attendance/AttendanceHistoryV2.css');

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 occurrence, found ${count}`);
  return source.replace(before, after);
}

let jsx = fs.readFileSync(componentPath, 'utf8');

jsx = replaceOnce(
  jsx,
  "import { ATTENDANCE_PROOF_BUCKET, buildAttendanceProofPath, prepareAttendanceProofImage } from '../utils/attendanceProofImage.js';\n",
  "import { ATTENDANCE_PROOF_BUCKET, buildAttendanceProofPath, prepareAttendanceProofImage } from '../utils/attendanceProofImage.js';\nimport { filterAndSortAttendanceHistory } from '../utils/attendanceHistoryFilters.js';\n",
  'History filter utility import',
);

jsx = replaceOnce(
  jsx,
  "  const [historyQuery, setHistoryQuery] = useState('');\n  const [historyType, setHistoryType] = useState('all');\n",
  "  const [historyQuery, setHistoryQuery] = useState('');\n  const [historyType, setHistoryType] = useState('all');\n  const [historySort, setHistorySort] = useState('desc');\n  const [historyDateFrom, setHistoryDateFrom] = useState('');\n  const [historyDateTo, setHistoryDateTo] = useState('');\n",
  'History filter state',
);

jsx = replaceOnce(
  jsx,
  "  const filteredHistory = useMemo(() => sessions.filter((session) => {\n    if (historyType !== 'all' && session.class_type !== historyType) return false;\n    const haystack = fold(`${session.class_name} ${teacherForSession(session)} ${session.subject} ${session.attendance_date}`);\n    return !historyQuery.trim() || haystack.includes(fold(historyQuery));\n  }), [sessions, historyQuery, historyType]);\n\n  const selectedHistorySessionIdSet = useMemo(() => new Set(selectedHistorySessionIds.map((id) => String(id))), [selectedHistorySessionIds]);\n  const allFilteredHistorySelected = filteredHistory.length > 0 && filteredHistory.every((session) => selectedHistorySessionIdSet.has(String(session.id)));\n",
  "  const filteredHistory = useMemo(() => filterAndSortAttendanceHistory(sessions, {\n    query: historyQuery,\n    type: historyType,\n    dateFrom: historyDateFrom,\n    dateTo: historyDateTo,\n    sort: historySort,\n    getTeacher: teacherForSession,\n  }), [sessions, historyQuery, historyType, historyDateFrom, historyDateTo, historySort, classTeachers]);\n\n  const selectedHistorySessionIdSet = useMemo(() => new Set(selectedHistorySessionIds.map((id) => String(id))), [selectedHistorySessionIds]);\n  const allFilteredHistorySelected = filteredHistory.length > 0 && filteredHistory.every((session) => selectedHistorySessionIdSet.has(String(session.id)));\n  const historyDateRangeInvalid = Boolean(historyDateFrom && historyDateTo && historyDateFrom > historyDateTo);\n  const historyHasFilters = Boolean(historyQuery.trim() || historyType !== 'all' || historySort !== 'desc' || historyDateFrom || historyDateTo);\n",
  'History filtered list',
);

jsx = replaceOnce(
  jsx,
  "                  <div className=\"ahv3__filters\"><select value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value=\"all\">Tất cả loại lớp</option><option value=\"remedial\">Phụ đạo</option><option value=\"gifted\">Bồi dưỡng HSG</option></select></div>\n",
  "                  <div className=\"ahv3__filters\">\n                    <label><span>Loại lớp</span><select value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value=\"all\">Tất cả loại lớp</option><option value=\"remedial\">Phụ đạo</option><option value=\"gifted\">Bồi dưỡng HSG</option></select></label>\n                    <label><span>Sắp xếp theo ngày</span><select value={historySort} onChange={(event) => setHistorySort(event.target.value)}><option value=\"desc\">Mới nhất → cũ nhất</option><option value=\"asc\">Cũ nhất → mới nhất</option></select></label>\n                  </div>\n                  <div className=\"ahv3__date-filters\" data-bes-keep-search=\"true\">\n                    <label><span>Từ ngày</span><input type=\"date\" value={historyDateFrom} max={historyDateTo || undefined} onChange={(event) => setHistoryDateFrom(event.target.value)} /></label>\n                    <label><span>Đến ngày</span><input type=\"date\" value={historyDateTo} min={historyDateFrom || undefined} onChange={(event) => setHistoryDateTo(event.target.value)} /></label>\n                  </div>\n                  <div className={`ahv3__filter-meta ${historyDateRangeInvalid ? 'is-invalid' : ''}`}>\n                    <button type=\"button\" disabled={!historyHasFilters} onClick={() => { setHistoryQuery(''); setHistoryType('all'); setHistorySort('desc'); setHistoryDateFrom(''); setHistoryDateTo(''); }}><Icon name=\"refresh\" size={14} />Xóa bộ lọc</button>\n                    <span>{historyDateRangeInvalid ? 'Khoảng ngày không hợp lệ' : `Hiển thị ${filteredHistory.length} buổi`}</span>\n                  </div>\n",
  'History filter controls',
);

fs.writeFileSync(componentPath, jsx);

let css = fs.readFileSync(cssPath, 'utf8');
const oldCss = `.ahv3__shell .ahv3__list-head > .ahv3__filters {\n  display: block;\n  grid-template-columns: none;\n  width: 100%;\n  margin: 8px 0 0 !important;\n}\n\n.ahv3__shell .ahv3__list-head > .ahv3__filters select {\n  display: block;\n  width: 100%;\n  min-height: 40px;\n  margin: 0;\n  padding: 0 12px;\n  border: 1px solid #dfe7f2;\n  border-radius: 11px;\n  background: #fff;\n  color: #263a56;\n  font: inherit;\n  font-size: 10.5px;\n  font-weight: 700;\n  box-shadow: 0 3px 9px rgba(62, 91, 140, 0.035);\n}\n`;
const newCss = `.ahv3__shell .ahv3__list-head > .ahv3__filters,\n.ahv3__shell .ahv3__list-head > .ahv3__date-filters {\n  display: grid !important;\n  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;\n  gap: 8px;\n  width: 100%;\n  margin: 9px 0 0 !important;\n}\n\n.ahv3__shell .ahv3__filters label,\n.ahv3__shell .ahv3__date-filters label {\n  display: grid;\n  gap: 5px;\n  min-width: 0;\n}\n\n.ahv3__shell .ahv3__filters label > span,\n.ahv3__shell .ahv3__date-filters label > span {\n  color: #344762;\n  font-size: 9.5px;\n  font-weight: 800;\n}\n\n.ahv3__shell .ahv3__filters select,\n.ahv3__shell .ahv3__date-filters input {\n  display: block;\n  width: 100%;\n  min-width: 0;\n  min-height: 40px;\n  margin: 0;\n  padding: 0 10px;\n  border: 1px solid #dfe7f2 !important;\n  border-radius: 11px !important;\n  outline: 0;\n  background: #fff !important;\n  color: #263a56;\n  font: inherit;\n  font-size: 10px;\n  font-weight: 700;\n  box-shadow: 0 3px 9px rgba(62, 91, 140, 0.035) !important;\n}\n\n.ahv3__shell .ahv3__filters select:focus,\n.ahv3__shell .ahv3__date-filters input:focus {\n  border-color: #9dbcf7 !important;\n  box-shadow: 0 0 0 3px rgba(47, 111, 237, 0.08) !important;\n}\n\n.ahv3__shell .ahv3__filter-meta {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  margin-top: 9px;\n}\n\n.ahv3__shell .ahv3__filter-meta button {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  min-height: 32px;\n  margin: 0 !important;\n  padding: 0 9px;\n  border: 1px solid #dce6f3 !important;\n  border-radius: 9px !important;\n  background: #f7faff !important;\n  color: #2f63ae;\n  font: inherit;\n  font-size: 9px;\n  font-weight: 800;\n  cursor: pointer;\n}\n\n.ahv3__shell .ahv3__filter-meta button:disabled {\n  opacity: .45;\n  cursor: default;\n}\n\n.ahv3__shell .ahv3__filter-meta > span {\n  color: #7a8ba2;\n  font-size: 9px;\n  font-weight: 700;\n  text-align: right;\n}\n\n.ahv3__shell .ahv3__filter-meta.is-invalid > span {\n  color: #d34252;\n}\n`;
css = replaceOnce(css, oldCss, newCss, 'History filter CSS');
fs.writeFileSync(cssPath, css);

console.log('Applied Attendance History date-range filtering and date sorting UI.');
