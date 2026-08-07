import JSZip from 'jszip';
import { initializeAuthSession } from './utils/auth.js';
import {
  getCurrentHomeroomWorkspaceId,
  loadHomeroomWorkspace,
  saveHomeroomWorkspace,
} from './utils/homeroomClassWorkspaceStore.js';

const BUTTON_ATTR = 'data-bes-grade-import';
const INPUT_ATTR = 'data-bes-grade-import-input';
const STYLE_ID = 'bes-grade-import-style';
const OVERLAY_CLASS = 'bes-grade-import-overlay';
const XLSX_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
let scheduled = false;
let busy = false;

function text(value) {
  return String(value ?? '').trim();
}

function normalized(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function subjectKey(value) {
  return text(value || 'Tiếng Anh')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tieng-anh';
}

function uid(prefix = 'grade') {
  try { return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
  catch { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function makeColumn(index = 1, label = '') {
  return { id: uid('regular-column'), label: label || `Lần ${index}` };
}

function makeRound(index = 1) {
  return { id: `round-${index}`, columns: [makeColumn(1)], scores: {}, bonus: {} };
}

function makeSemester() {
  return {
    regular: [makeRound(1), makeRound(2), makeRound(3), makeRound(4)],
    midterm: { scores: {} },
    final: { scores: {} },
  };
}

function normalizeRound(value, index) {
  const source = value && typeof value === 'object' ? value : {};
  const columns = Array.isArray(source.columns) && source.columns.length
    ? source.columns.map((column, columnIndex) => ({
      id: text(column?.id) || uid('regular-column'),
      label: text(column?.label) || `Lần ${columnIndex + 1}`,
    }))
    : [makeColumn(1)];
  return {
    id: text(source.id) || `round-${index + 1}`,
    columns,
    scores: source.scores && typeof source.scores === 'object' ? clone(source.scores) : {},
    bonus: source.bonus && typeof source.bonus === 'object' ? clone(source.bonus) : {},
  };
}

function normalizeSemester(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    regular: Array.from({ length: 4 }, (_, index) => normalizeRound(source.regular?.[index], index)),
    midterm: { scores: source.midterm?.scores && typeof source.midterm.scores === 'object' ? clone(source.midterm.scores) : {} },
    final: { scores: source.final?.scores && typeof source.final.scores === 'object' ? clone(source.final.scores) : {} },
  };
}

function normalizeSubject(value, fallbackName = 'Tiếng Anh') {
  const source = value && typeof value === 'object' ? value : {};
  return {
    name: text(source.name) || fallbackName,
    semesters: {
      semester1: normalizeSemester(source.semesters?.semester1),
      semester2: normalizeSemester(source.semesters?.semester2),
    },
  };
}

function normalizeGradebook(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const subjects = {};
  Object.entries(source.subjects || {}).forEach(([key, subject]) => {
    subjects[key] = normalizeSubject(subject, subject?.name || key);
  });
  if (!Object.keys(subjects).length) subjects['tieng-anh'] = normalizeSubject(null, 'Tiếng Anh');
  const activeSubject = subjects[source.activeSubject] ? source.activeSubject : Object.keys(subjects)[0];
  return { version: 2, activeSubject, subjects, updatedAt: text(source.updatedAt) };
}

function columnIndex(reference) {
  const letters = String(reference || '').match(/[A-Z]+/i)?.[0]?.toUpperCase() || '';
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, result - 1);
}

function nodeText(node) {
  if (!node) return '';
  return [...node.getElementsByTagName('t')].map((item) => item.textContent || '').join('');
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const documentNode = new DOMParser().parseFromString(xml, 'application/xml');
  return [...documentNode.getElementsByTagName('si')].map(nodeText);
}

function parseWorksheet(xml, sharedStrings = []) {
  const documentNode = new DOMParser().parseFromString(xml, 'application/xml');
  if (documentNode.getElementsByTagName('parsererror').length) throw new Error('Không đọc được cấu trúc worksheet trong file Excel.');
  return [...documentNode.getElementsByTagName('row')].map((rowNode) => {
    const row = [];
    [...rowNode.getElementsByTagName('c')].forEach((cell) => {
      const index = columnIndex(cell.getAttribute('r'));
      const type = cell.getAttribute('t') || '';
      let value = '';
      if (type === 'inlineStr') value = nodeText(cell);
      else {
        const raw = cell.getElementsByTagName('v')[0]?.textContent ?? '';
        value = type === 's' ? (sharedStrings[Number(raw)] ?? '') : raw;
      }
      row[index] = value;
    });
    return row;
  });
}

async function readXlsxRows(file) {
  if (!/\.xlsx$/i.test(file?.name || '')) throw new Error('Vui lòng chọn file Excel .xlsx được xuất từ sổ điểm.');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const worksheetEntry = zip.file('xl/worksheets/sheet1.xml');
  if (!worksheetEntry) throw new Error('File Excel không có worksheet đầu tiên để nhập điểm.');
  const [worksheetXml, sharedXml] = await Promise.all([
    worksheetEntry.async('string'),
    zip.file('xl/sharedStrings.xml')?.async('string') || Promise.resolve(''),
  ]);
  return parseWorksheet(worksheetXml, parseSharedStrings(sharedXml));
}

function locateHeader(rows) {
  const max = Math.min(rows.length, 30);
  for (let index = 0; index < max; index += 1) {
    const labels = (rows[index] || []).map(normalized);
    const codeIndex = labels.findIndex((value) => ['ma hoc sinh', 'ma hs', 'ma so hoc sinh'].includes(value));
    const nameIndex = labels.findIndex((value) => ['ho va ten', 'ho ten', 'ten hoc sinh'].includes(value));
    if (codeIndex >= 0 && nameIndex >= 0) return { rowIndex: index, codeIndex, nameIndex };
  }
  throw new Error('Không tìm thấy hàng tiêu đề “Mã học sinh / Họ và tên”. Hãy dùng file .xlsx được xuất từ sổ điểm của app.');
}

function findMeta(rows, headerRowIndex, aliases) {
  const targets = new Set(aliases.map(normalized));
  for (let rowIndex = 0; rowIndex < headerRowIndex; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    for (let col = 0; col < row.length; col += 1) {
      if (!targets.has(normalized(row[col]))) continue;
      for (let next = col + 1; next < Math.min(row.length, col + 4); next += 1) {
        if (text(row[next])) return text(row[next]);
      }
    }
  }
  return '';
}

function inferMeta(rows, headerRowIndex) {
  let subject = findMeta(rows, headerRowIndex, ['Môn học', 'Môn']);
  let semester = findMeta(rows, headerRowIndex, ['Học kỳ', 'HK']);
  const className = findMeta(rows, headerRowIndex, ['Lớp', 'Tên lớp']);
  if ((!subject || !semester) && rows[1]) {
    const subtitle = (rows[1] || []).map(text).filter(Boolean).join(' · ');
    const parts = subtitle.split(/\s*[·|]\s*/).map(text).filter(Boolean);
    if (!subject && parts[0]) subject = parts[0];
    if (!semester) semester = parts.find((part) => /học\s*kỳ|hoc\s*ky|hk\s*[i12]/i.test(part)) || '';
  }
  return { subject, semester, className };
}

function semesterIdFor(value) {
  const clean = normalized(value);
  return /(?:hoc ky|hk)\s*(?:ii|2)\b/.test(clean) ? 'semester2' : 'semester1';
}

function classifyScoreHeader(value) {
  const original = text(value);
  const clean = normalized(original);
  if (!clean) return null;
  if (/^(giua ky|diem giua ky|gk)$/.test(clean)) return { kind: 'midterm', label: original };
  if (/^(cuoi ky|diem cuoi ky|ck)$/.test(clean)) return { kind: 'final', label: original };
  const tx = clean.match(/^tx\s*([1-4])(?:\s+(.*))?$/);
  if (!tx) return null;
  const roundIndex = Number(tx[1]) - 1;
  const detail = text(tx[2]);
  if (!detail) return { kind: 'regular-result', roundIndex, label: original, sourceLabel: '' };
  if (/^(diem )?cong$/.test(detail) || /ket qua/.test(detail)) return { kind: 'ignore', roundIndex, label: original };
  const sourceLabel = original.replace(new RegExp(`^\\s*TX\\s*${roundIndex + 1}\\s*[·:|\\-]?\\s*`, 'i'), '').trim();
  return { kind: 'regular-score', roundIndex, label: original, sourceLabel: sourceLabel || `Lần 1` };
}

function scoreValue(raw) {
  const value = text(raw).replace(',', '.');
  if (!value) return { blank: true, value: null };
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 10) return { blank: false, invalid: true, value: null };
  return { blank: false, invalid: false, value: Math.round(number * 100) / 100 };
}

function uniqueStudentMaps(students) {
  const byCode = new Map();
  const nameGroups = new Map();
  students.forEach((student) => {
    const code = normalized(student.code);
    if (code && !byCode.has(code)) byCode.set(code, student);
    const name = normalized(student.fullName);
    if (name) nameGroups.set(name, [...(nameGroups.get(name) || []), student]);
  });
  const byName = new Map([...nameGroups.entries()].filter(([, values]) => values.length === 1).map(([name, values]) => [name, values[0]]));
  return { byCode, byName };
}

function findStudent(row, header, maps) {
  const code = normalized(row[header.codeIndex]);
  const name = normalized(row[header.nameIndex]);
  if (code && maps.byCode.has(code)) return { student: maps.byCode.get(code), matchedBy: 'code' };
  if (name && maps.byName.has(name)) return { student: maps.byName.get(name), matchedBy: 'name' };
  return { student: null, matchedBy: '', code: text(row[header.codeIndex]), name: text(row[header.nameIndex]) };
}

function roundHasData(round, studentId) {
  const row = round?.scores?.[studentId] || {};
  return Object.values(row).some((value) => text(value) !== '') || text(round?.bonus?.[studentId]) !== '';
}

function currentSubjectName() {
  return text(document.querySelector('.hr-grade-controls select')?.selectedOptions?.[0]?.textContent) || 'Tiếng Anh';
}

function currentSemesterLabel() {
  return text(document.querySelector('.hr-grade-semesters button.active')?.textContent) || 'Học kỳ I';
}

function planImport(rows, workspace) {
  const header = locateHeader(rows);
  const headers = rows[header.rowIndex] || [];
  const meta = inferMeta(rows, header.rowIndex);
  const subjectName = meta.subject || currentSubjectName();
  const semesterLabel = meta.semester || currentSemesterLabel();
  const semesterId = semesterIdFor(semesterLabel);
  const gradebook = normalizeGradebook(workspace.learningGradebook);
  const key = subjectKey(subjectName);
  const subject = gradebook.subjects[key] || normalizeSubject(null, subjectName);
  const semester = subject.semesters[semesterId] || makeSemester();
  const mappings = headers.map((headerValue, colIndex) => ({ colIndex, ...classifyScoreHeader(headerValue) })).filter((item) => item.kind && item.kind !== 'ignore');
  if (!mappings.length) throw new Error('Không tìm thấy cột điểm có thể nhập. Các cột Cộng/Kết quả được bỏ qua để tránh ghi đè điểm tính toán.');

  const students = (workspace.students || []).filter((student) => student.active !== false);
  const maps = uniqueStudentMaps(students);
  const updates = [];
  const unmatched = [];
  const invalid = [];
  const conflicts = [];
  let matchedRows = 0;
  let matchedByName = 0;
  let overwriteCount = 0;

  for (let rowIndex = header.rowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    if (!row.some((value) => text(value))) continue;
    const match = findStudent(row, header, maps);
    if (!match.student) {
      if (text(row[header.codeIndex]) || text(row[header.nameIndex])) unmatched.push({ row: rowIndex + 1, code: match.code, name: match.name });
      continue;
    }
    matchedRows += 1;
    if (match.matchedBy === 'name') matchedByName += 1;

    mappings.forEach((mapping) => {
      const parsed = scoreValue(row[mapping.colIndex]);
      if (parsed.blank) return;
      if (parsed.invalid) {
        invalid.push({ row: rowIndex + 1, student: match.student.fullName, column: headers[mapping.colIndex], value: text(row[mapping.colIndex]) });
        return;
      }

      if (mapping.kind === 'regular-result') {
        const round = semester.regular[mapping.roundIndex];
        if (roundHasData(round, match.student.id)) {
          conflicts.push({ row: rowIndex + 1, student: match.student.fullName, column: mapping.label, reason: 'Đợt TX đã có dữ liệu chi tiết nên không ghi đè bằng cột TX tổng.' });
          return;
        }
      }

      let previous = '';
      if (mapping.kind === 'midterm' || mapping.kind === 'final') previous = semester[mapping.kind]?.scores?.[match.student.id] ?? '';
      if (mapping.kind === 'regular-score') {
        const round = semester.regular[mapping.roundIndex];
        const target = round.columns.find((column) => normalized(column.label) === normalized(mapping.sourceLabel));
        previous = target ? round.scores?.[match.student.id]?.[target.id] ?? '' : '';
      }
      if (text(previous) !== '' && Number(previous) !== parsed.value) overwriteCount += 1;
      updates.push({
        studentId: match.student.id,
        studentName: match.student.fullName,
        value: parsed.value,
        kind: mapping.kind,
        roundIndex: mapping.roundIndex,
        sourceLabel: mapping.sourceLabel || '',
        sourceColumn: mapping.label,
      });
    });
  }

  const classMismatch = meta.className && normalized(meta.className) !== normalized(workspace.classProfile?.className);
  return {
    header,
    meta,
    subjectName,
    subjectKey: key,
    semesterId,
    semesterLabel: semesterId === 'semester2' ? 'Học kỳ II' : 'Học kỳ I',
    updates,
    unmatched,
    invalid,
    conflicts,
    matchedRows,
    matchedByName,
    overwriteCount,
    classMismatch,
    className: text(workspace.classProfile?.className),
  };
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${OVERLAY_CLASS} .bes-grade-import-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0 18px}
    .${OVERLAY_CLASS} .bes-grade-import-summary article{padding:12px 14px;border:1px solid #dfe5ee;border-radius:16px;background:#f8fbff}
    .${OVERLAY_CLASS} .bes-grade-import-summary b{display:block;font-size:20px;margin-bottom:3px}.bes-grade-import-summary small{color:#667085}
    .${OVERLAY_CLASS} .bes-grade-import-meta{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}.bes-grade-import-meta span{padding:7px 10px;border-radius:999px;background:#eef5ff;font-size:13px}
    .${OVERLAY_CLASS} .bes-grade-import-warning{margin:10px 0;padding:11px 13px;border-radius:14px;background:#fff4e5;color:#7a4300}.bes-grade-import-error{background:#ffebee!important;color:#8b1e2d!important}
    .${OVERLAY_CLASS} .bes-grade-import-issues{max-height:180px;overflow:auto;margin:10px 0;padding-left:20px;color:#5f6368}.bes-grade-import-issues li{margin:5px 0}
    .${OVERLAY_CLASS} .bes-grade-import-progress{padding:18px;text-align:center;font-weight:700}
    @media(max-width:760px){.${OVERLAY_CLASS} .bes-grade-import-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return text(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function closeOverlay() {
  document.querySelector(`.${OVERLAY_CLASS}`)?.remove();
}

function issueItems(plan) {
  const items = [];
  plan.unmatched.slice(0, 5).forEach((item) => items.push(`Dòng ${item.row}: không khớp học sinh ${item.code || item.name || ''}`));
  plan.invalid.slice(0, 5).forEach((item) => items.push(`Dòng ${item.row}: ${item.student} · ${item.column} = “${item.value}” không hợp lệ`));
  plan.conflicts.slice(0, 5).forEach((item) => items.push(`Dòng ${item.row}: ${item.student} · ${item.column} — ${item.reason}`));
  return items;
}

function openPreview(plan, fileName, onConfirm) {
  closeOverlay();
  ensureStyle();
  const overlay = document.createElement('div');
  overlay.className = `hr-grade-export-overlay ${OVERLAY_CLASS}`;
  const blocked = plan.classMismatch || !plan.updates.length;
  const issues = issueItems(plan);
  overlay.innerHTML = `
    <section class="hr-grade-export-dialog" role="dialog" aria-modal="true" aria-labelledby="bes-grade-import-title">
      <header><div><span>IMPORT EXCEL · PREVIEW</span><h2 id="bes-grade-import-title">Nhập điểm từ file</h2><p>Kiểm tra đối chiếu trước khi ghi vào sổ điểm. Ô trống không xóa điểm hiện có.</p></div><button type="button" data-close aria-label="Đóng">×</button></header>
      <div class="hr-grade-export-dialog-body">
        <div class="bes-grade-import-meta"><span>File: <b>${escapeHtml(fileName)}</b></span><span>Lớp: <b>${escapeHtml(plan.meta.className || plan.className || '—')}</b></span><span>Môn: <b>${escapeHtml(plan.subjectName)}</b></span><span>${escapeHtml(plan.semesterLabel)}</span></div>
        ${plan.classMismatch ? `<div class="bes-grade-import-warning bes-grade-import-error"><b>Không thể nhập:</b> file thuộc lớp “${escapeHtml(plan.meta.className)}”, trong khi app đang mở lớp “${escapeHtml(plan.className)}”.</div>` : ''}
        <div class="bes-grade-import-summary">
          <article><b>${plan.matchedRows}</b><small>học sinh khớp</small></article>
          <article><b>${plan.updates.length}</b><small>ô điểm sẽ cập nhật</small></article>
          <article><b>${plan.overwriteCount}</b><small>điểm cũ sẽ thay thế</small></article>
          <article><b>${plan.unmatched.length + plan.invalid.length + plan.conflicts.length}</b><small>mục bỏ qua / cần chú ý</small></article>
        </div>
        ${plan.matchedByName ? `<div class="bes-grade-import-warning">${plan.matchedByName} học sinh được đối chiếu bằng họ tên vì mã học sinh không khớp hoặc để trống.</div>` : ''}
        ${issues.length ? `<div class="bes-grade-import-warning"><b>Chi tiết:</b><ul class="bes-grade-import-issues">${issues.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>${plan.unmatched.length + plan.invalid.length + plan.conflicts.length > issues.length ? '<small>Chỉ hiển thị một số mục đầu tiên.</small>' : ''}</div>` : ''}
        <p class="hr-grade-export-note"><span aria-hidden="true">i</span>Cột “Điểm cộng” và “Kết quả” được bỏ qua. Điểm hợp lệ phải từ 0 đến 10.</p>
      </div>
      <footer><button type="button" class="secondary" data-close>Hủy</button><button type="button" class="primary" data-confirm ${blocked ? 'disabled' : ''}>Nhập ${plan.updates.length} ô điểm</button></footer>
    </section>`;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', closeOverlay));
  overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) closeOverlay(); });
  overlay.querySelector('[data-confirm]')?.addEventListener('click', () => onConfirm(overlay));
}

function findOrCreateColumn(round, label) {
  const existing = round.columns.find((column) => normalized(column.label) === normalized(label));
  if (existing) return existing;
  const column = makeColumn(round.columns.length + 1, label || `Lần ${round.columns.length + 1}`);
  round.columns.push(column);
  return column;
}

function applyPlanToWorkspace(workspace, plan, user) {
  const next = clone(workspace);
  const gradebook = normalizeGradebook(next.learningGradebook);
  if (!gradebook.subjects[plan.subjectKey]) gradebook.subjects[plan.subjectKey] = normalizeSubject(null, plan.subjectName);
  const subject = gradebook.subjects[plan.subjectKey];
  const semester = subject.semesters[plan.semesterId] || makeSemester();
  subject.semesters[plan.semesterId] = semester;

  plan.updates.forEach((update) => {
    if (update.kind === 'midterm' || update.kind === 'final') {
      semester[update.kind].scores[update.studentId] = update.value;
      return;
    }
    const round = semester.regular[update.roundIndex];
    if (!round) return;
    if (update.kind === 'regular-result') {
      if (roundHasData(round, update.studentId)) return;
      const firstColumn = round.columns[0] || findOrCreateColumn(round, 'Lần 1');
      round.scores[update.studentId] = { ...(round.scores[update.studentId] || {}), [firstColumn.id]: update.value };
      return;
    }
    const column = findOrCreateColumn(round, update.sourceLabel || 'Lần 1');
    round.scores[update.studentId] = { ...(round.scores[update.studentId] || {}), [column.id]: update.value };
  });

  gradebook.activeSubject = plan.subjectKey;
  gradebook.updatedAt = new Date().toISOString();
  next.learningGradebook = gradebook;
  next.updatedAt = gradebook.updatedAt;
  next.updatedBy = text(user?.name || user?.email);
  return next;
}

function hasUnsavedGradebookChanges() {
  return Boolean(document.querySelector('.hr-grade-save-actions .is-dirty'));
}

function setOverlayProgress(overlay, message) {
  const body = overlay.querySelector('.hr-grade-export-dialog-body');
  const footer = overlay.querySelector('footer');
  if (body) body.innerHTML = `<div class="bes-grade-import-progress">${escapeHtml(message)}</div>`;
  if (footer) footer.innerHTML = '';
  overlay.querySelector('header [data-close]')?.setAttribute('disabled', '');
}

async function handleFile(file) {
  if (!file || busy) return;
  if (hasUnsavedGradebookChanges()) {
    window.alert('Sổ điểm đang có thay đổi chưa lưu. Hãy bấm “Lưu bảng điểm” hoặc “Hoàn tác” trước khi nhập file Excel.');
    return;
  }
  busy = true;
  try {
    const [rows, user] = await Promise.all([readXlsxRows(file), initializeAuthSession()]);
    if (!user) throw new Error('Không xác định được tài khoản đang đăng nhập. Vui lòng đăng nhập lại rồi thử nhập điểm.');
    const workspaceId = getCurrentHomeroomWorkspaceId(user);
    const loaded = await loadHomeroomWorkspace(user, workspaceId);
    if (!loaded.workspace) throw new Error('Không mở được dữ liệu lớp hiện tại.');
    const plan = planImport(rows, loaded.workspace);
    openPreview(plan, file.name, async (overlay) => {
      if (busy === 'saving') return;
      busy = 'saving';
      setOverlayProgress(overlay, 'Đang nhập điểm và đồng bộ dữ liệu…');
      try {
        const latest = await loadHomeroomWorkspace(user, workspaceId);
        if (!latest.workspace) throw new Error('Không tải lại được dữ liệu lớp trước khi lưu.');
        const currentClass = normalized(latest.workspace.classProfile?.className);
        if (plan.meta.className && normalized(plan.meta.className) !== currentClass) throw new Error('Lớp hiện tại đã thay đổi; thao tác nhập đã được dừng để bảo vệ dữ liệu.');
        const next = applyPlanToWorkspace(latest.workspace, plan, user);
        const result = await saveHomeroomWorkspace(next, user);
        const message = result.ok
          ? `Đã nhập ${plan.updates.length} ô điểm cho ${plan.matchedRows} học sinh.`
          : `Đã lưu ${plan.updates.length} ô điểm trên thiết bị; cloud chưa đồng bộ: ${result.message || 'lỗi chưa xác định'}`;
        setOverlayProgress(overlay, `${message} Đang tải lại sổ điểm…`);
        window.setTimeout(() => window.location.reload(), 900);
      } catch (error) {
        busy = false;
        closeOverlay();
        window.alert(error?.message || 'Không thể nhập điểm từ file Excel.');
      }
    });
  } catch (error) {
    window.alert(error?.message || 'Không thể đọc file Excel.');
  } finally {
    if (busy !== 'saving') busy = false;
  }
}

function injectButton() {
  if (!/homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '')) return;
  const gradebook = document.querySelector('.hr-gradebook');
  const actions = gradebook?.querySelector('.hr-grade-export-actions');
  if (!actions || actions.querySelector(`[${BUTTON_ATTR}]`)) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = XLSX_ACCEPT;
  input.hidden = true;
  input.setAttribute(INPUT_ATTR, 'true');
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    handleFile(file).catch((error) => console.warn('[GradebookImport] Import failed.', error));
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary hr-grade-export-class';
  button.setAttribute(BUTTON_ATTR, 'true');
  button.innerHTML = '<span aria-hidden="true">⇧</span>Nhập điểm từ file';
  button.addEventListener('click', () => {
    if (busy) return;
    input.click();
  });

  actions.prepend(input);
  actions.prepend(button);
}

function scheduleInject() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    injectButton();
  });
}

export function installHomeroomGradebookImportRuntime() {
  ensureStyle();
  scheduleInject();
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node.nodeType === 1))) scheduleInject();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', scheduleInject);
}

installHomeroomGradebookImportRuntime();
