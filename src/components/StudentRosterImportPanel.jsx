import React, { useMemo, useRef, useState } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import '../styles/student-roster-import.css';

const FIELDS = [
  ['code', 'Mã HS'], ['fullName', 'Họ và tên'], ['birthDate', 'Ngày sinh'], ['gender', 'Giới tính'],
  ['phone', 'SĐT học sinh'], ['parentName', 'Phụ huynh'], ['parentPhone', 'SĐT phụ huynh'],
  ['parentEmail', 'Email phụ huynh'], ['address', 'Địa chỉ'], ['notes', 'Ghi chú'],
];

const ALIASES = {
  code: ['mã hs', 'ma hs', 'mã học sinh', 'ma hoc sinh', 'student id', 'id học sinh', 'mshs'],
  fullName: ['họ và tên', 'ho va ten', 'họ tên', 'ho ten', 'tên học sinh', 'ten hoc sinh', 'full name', 'student name'],
  birthDate: ['ngày sinh', 'ngay sinh', 'date of birth', 'dob'],
  gender: ['giới tính', 'gioi tinh', 'gender', 'sex'],
  phone: ['sđt học sinh', 'sdt hoc sinh', 'điện thoại học sinh', 'dien thoai hoc sinh', 'student phone'],
  parentName: ['phụ huynh', 'phu huynh', 'tên phụ huynh', 'ten phu huynh', 'người giám hộ', 'nguoi giam ho', 'parent', 'guardian'],
  parentPhone: ['sđt phụ huynh', 'sdt phu huynh', 'điện thoại phụ huynh', 'dien thoai phu huynh', 'parent phone', 'guardian phone'],
  parentEmail: ['email phụ huynh', 'email phu huynh', 'parent email', 'guardian email'],
  address: ['địa chỉ', 'dia chi', 'address'],
  notes: ['ghi chú', 'ghi chu', 'lưu ý', 'luu y', 'notes', 'note'],
};

function clean(value) {
  return String(value ?? '').replace(/\u0000/g, '').trim();
}

function fold(value) {
  return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizePhone(value) {
  const text = clean(value).replace(/[^\d+]/g, '');
  if (/^\d{9}$/.test(text) && !text.startsWith('0')) return `0${text}`;
  return text;
}

function normalizeDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = clean(value);
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const vi = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (vi) {
    const year = vi[3].length === 2 ? `20${vi[3]}` : vi[3];
    return `${year}-${String(vi[2]).padStart(2, '0')}-${String(vi[1]).padStart(2, '0')}`;
  }
  return text;
}

function normalizeGender(value) {
  const text = fold(value);
  if (['nam', 'male', 'm'].includes(text)) return 'Nam';
  if (['nu', 'female', 'f'].includes(text)) return 'Nữ';
  return clean(value);
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) { row.push(cell); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((item) => clean(item))) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((item) => clean(item))) rows.push(row);
  return rows;
}

function detectDelimiter(text) {
  const sampleLines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => clean(line)).slice(0, 12);
  const candidates = [',', ';', '\t'];
  const scored = candidates.map((delimiter) => {
    const widths = sampleLines.map((line) => parseDelimited(line, delimiter)[0]?.length || 1);
    const useful = widths.filter((width) => width > 1);
    const consistency = useful.length ? useful.filter((width) => width === useful[0]).length : 0;
    return { delimiter, score: useful.length * 10 + consistency * 5 + Math.max(0, ...(widths || [1])) };
  });
  return scored.sort((a, b) => b.score - a.score)[0]?.delimiter || ',';
}

function expandSingleCellRows(rows) {
  const normalized = (rows || []).map((row) => Array.isArray(row) ? row : [row]);
  const nonEmpty = normalized.filter((row) => row.some((cell) => clean(cell)));
  if (!nonEmpty.length) return normalized;
  const mostlySingleCell = nonEmpty.filter((row) => row.filter((cell) => clean(cell)).length <= 1).length >= Math.ceil(nonEmpty.length * 0.7);
  if (!mostlySingleCell) return normalized;
  const joined = nonEmpty.map((row) => clean(row.find((cell) => clean(cell)) || '')).join('\n');
  const delimiter = detectDelimiter(joined);
  const reparsed = parseDelimited(joined, delimiter);
  return reparsed.some((row) => row.length > 1) ? reparsed : normalized;
}

function fieldForHeader(header) {
  const target = fold(header);
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (aliases.some((alias) => fold(alias) === target || target.includes(fold(alias)))) return field;
  }
  return '';
}

function rowsToStudents(rows) {
  const normalizedRows = expandSingleCellRows(rows).map((row) => Array.isArray(row) ? row.map((cell) => clean(cell).replace(/^\uFEFF/, '')) : []).filter((row) => row.some((cell) => clean(cell)));
  if (!normalizedRows.length) throw new Error('File không có dữ liệu.');
  const headerIndex = normalizedRows.findIndex((row) => row.some((cell) => fieldForHeader(cell) === 'fullName'));
  if (headerIndex < 0) throw new Error('Không nhận diện được cột “Họ và tên”. Hãy dùng file mẫu.');
  const headers = normalizedRows[headerIndex];
  const mapping = headers.map(fieldForHeader);
  const students = normalizedRows.slice(headerIndex + 1).map((row, index) => {
    const result = { __row: headerIndex + index + 2, __selected: true, supportLevel: 'normal' };
    mapping.forEach((field, columnIndex) => {
      if (field) result[field] = clean(row[columnIndex]);
    });
    result.birthDate = normalizeDate(result.birthDate);
    result.gender = normalizeGender(result.gender);
    result.phone = normalizePhone(result.phone);
    result.parentPhone = normalizePhone(result.parentPhone);
    return result;
  }).filter((item) => item.fullName);
  if (!students.length) throw new Error('Không tìm thấy học sinh hợp lệ sau hàng tiêu đề.');
  return students;
}

async function readRows(file) {
  const name = clean(file?.name).toLowerCase();
  if (name.endsWith('.xls')) throw new Error('File Excel .xls cũ chưa được hỗ trợ. Hãy mở file và lưu lại dưới dạng .xlsx.');
  if (name.endsWith('.xlsx')) return readXlsxFile(file, { dateFormat: 'dd/mm/yyyy' });
  const text = (await file.text()).replace(/^\uFEFF/, '');
  return parseDelimited(text, name.endsWith('.tsv') ? '\t' : detectDelimiter(text));
}

function downloadTemplate() {
  const header = FIELDS.map(([, label]) => label);
  const example = ['126701', 'Nguyễn Minh Anh', '15/08/2009', 'Nữ', '0912345678', 'Nguyễn Văn A', '0987654321', 'phuhuynh@example.com', 'Thủ Dầu Một, Bình Dương', ''];
  const delimiter = ';';
  const escape = (value) => {
    const text = String(value ?? '');
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = '\uFEFFsep=;\r\n' + [header, example].map((row) => row.map(escape).join(delimiter)).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mau-danh-sach-hoc-sinh-excel-vn.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export default function StudentRosterImportPanel({ existingStudents = [], onImport, onClose }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const existingCodes = useMemo(() => new Set(existingStudents.map((item) => item.code ? fold(item.code) : '').filter(Boolean)), [existingStudents]);
  const existingNameOnly = useMemo(() => new Set(existingStudents.filter((item) => !item.code).map((item) => fold(item.fullName)).filter(Boolean)), [existingStudents]);
  const selectedRows = rows.filter((row) => row.__selected && row.fullName);
  const duplicateCount = rows.filter((row) => row.__duplicate).length;

  const chooseFile = async (file) => {
    if (!file) return;
    setBusy(true); setError(''); setFileName(file.name); setRows([]);
    try {
      const parsed = rowsToStudents(await readRows(file)).map((item) => ({
        ...item,
        __duplicate: Boolean(
          (item.code && existingCodes.has(fold(item.code)))
          || (!item.code && existingNameOnly.has(fold(item.fullName)))
        ),
      }));
      setRows(parsed);
    } catch (err) { setError(err?.message || 'Không thể đọc file.'); }
    finally { setBusy(false); }
  };

  const update = (index, key, value) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const submit = async () => {
    if (!selectedRows.length) return;
    setBusy(true); setError('');
    try {
      await onImport(selectedRows.map(({ __row, __selected, __duplicate, ...student }) => student));
      onClose?.();
    } catch (err) { setError(err?.message || 'Không thể nhập danh sách.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="hr-panel sri-panel" aria-label="Nhập nhanh danh sách học sinh">
      <div className="hr-panel-head sri-head">
        <div><small>NHẬN DIỆN TỰ ĐỘNG · KHÔNG DÙNG AI</small><h2>Nhập nhanh danh sách học sinh</h2><p>Tải file mẫu, điền dữ liệu rồi tải lên. Hệ thống nhận dạng cột ngay trên thiết bị và cho xem trước trước khi lưu.</p></div>
        <div className="hr-head-actions"><button type="button" className="secondary" onClick={downloadTemplate}>Tải file mẫu Excel CSV</button><button type="button" className="secondary" onClick={() => inputRef.current?.click()}>Chọn file</button><button type="button" className="text-btn" onClick={onClose}>Đóng</button></div>
      </div>
      <input ref={inputRef} hidden type="file" accept=".xlsx,.csv,.tsv,.txt" onChange={(event) => chooseFile(event.target.files?.[0])} />
      <div className="sri-drop" onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}>
        <strong>{busy ? 'Đang đọc file…' : fileName || 'Kéo thả hoặc bấm để chọn file'}</strong>
        <span>Hỗ trợ Excel XLSX và CSV/TSV/TXT · không gửi dữ liệu ra ngoài</span>
      </div>
      {error ? <div className="sri-error">⚠ {error}</div> : null}
      {rows.length ? <>
        <div className="sri-summary"><span><b>{rows.length}</b> dòng hợp lệ</span><span><b>{selectedRows.length}</b> được chọn</span><span><b>{duplicateCount}</b> có thể trùng và sẽ được cập nhật</span></div>
        <div className="sri-table-wrap"><table className="sri-table"><thead><tr><th><input type="checkbox" checked={selectedRows.length === rows.length} onChange={(event) => setRows((current) => current.map((row) => ({ ...row, __selected: event.target.checked })))} /></th>{FIELDS.map(([key, label]) => <th key={key}>{label}</th>)}<th>Trạng thái</th></tr></thead><tbody>
          {rows.map((row, index) => <tr key={`${row.__row}-${index}`} className={row.__duplicate ? 'is-duplicate' : ''}><td><input type="checkbox" checked={row.__selected} onChange={(event) => update(index, '__selected', event.target.checked)} /></td>{FIELDS.map(([key]) => <td key={key}><input value={row[key] || ''} onChange={(event) => update(index, key, event.target.value)} /></td>)}<td><span className={row.__duplicate ? 'duplicate' : 'new'}>{row.__duplicate ? 'Cập nhật' : 'Thêm mới'}</span></td></tr>)}
        </tbody></table></div>
        <div className="sri-actions"><button type="button" className="secondary" onClick={() => setRows([])}>Chọn file khác</button><button type="button" className="primary" disabled={busy || !selectedRows.length} onClick={submit}>{busy ? 'Đang lưu…' : `Nhập ${selectedRows.length} học sinh`}</button></div>
      </> : null}
    </section>
  );
}
