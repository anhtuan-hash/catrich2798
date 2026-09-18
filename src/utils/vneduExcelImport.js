
const SHEETJS_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

const FIELD_ALIASES = Object.freeze({
  fullName: ['họ và tên','ho va ten','họ tên','ho ten'],
  gender: ['giới tính','gioi tinh'],
  birthDate: ['ngày sinh','ngay sinh'],
  birthPlace: ['nơi sinh','noi sinh'],
  hometown: ['quê quán','que quan'],
  birthRegistrationPlace: ['nơi khai sinh','noi khai sinh'],
  currentAddress: ['chỗ ở hiện nay','cho o hien nay','chỗ ở hn','cho o hn'],
  permanentAddress: ['nơi thường trú','noi thuong tru','thường trú','thuong tru'],
  citizenId: ['căn cước','can cuoc','số căn cước','so can cuoc','căn cước công dân','can cuoc cong dan','cccd','số định danh','so dinh danh','số định danh cá nhân'],
  phone: ['điện thoại hs','dien thoai hs','đ.thoại hs','d.thoai hs','sdt hs'],
  fatherName: ['tên cha','ten cha','họ tên cha','ho ten cha'],
  fatherPhone: ['điện thoại cha','dien thoai cha','đ.thoại cha','d.thoai cha'],
  motherName: ['tên mẹ','ten me','họ tên mẹ','ho ten me'],
  motherPhone: ['điện thoại mẹ','dien thoai me','đ.thoại mẹ','d.thoai me'],
});

const IDENTIFIER_ALIASES = Object.freeze({
  studentCode: ['mã học sinh','ma hoc sinh','mã hs','ma hs'],
  vemisCode: ['mã vemis','ma vemis'],
  moetCode: ['mã moet','ma moet'],
  registerBook: ['số đăng bộ','so dang bo'],
});

const EXTRA_ALIASES = Object.freeze({
  enrollmentDate: ['ngày vào trường','ngay vao truong'],
  ethnicity: ['dân tộc','dan toc'],
  religion: ['tôn giáo','ton giao'],
  nationality: ['quốc tịch','quoc tich'],
  otherName: ['tên gọi khác','ten goi khac','tên khác','ten khac'],
  residentialArea: ['khu dân cư','khu dan cu'],
  citizenIdIssueDate: ['ngày cấp căn cước','ngay cap can cuoc','ngày cấp cccd','ngay cap cccd','ngày cấp','ngay cap'],
  citizenIdIssuePlace: ['nơi cấp căn cước','noi cap can cuoc','nơi cấp cccd','noi cap cccd','nơi cấp','noi cap'],
  policyCategory: ['diện chính sách','dien chinh sach'],
  disability: ['khuyết tật','khuyet tat'],
  priorityCategory: ['diện ưu tiên','dien uu tien'],
  benefitCategory: ['diện ưu đãi','dien uu dai'],
  residenceType: ['n.trú, b.trú','n.tru, b.tru','n.trú,b.trú','n.trú b.trú','n.tru b.tru'],
  contactPhone: ['điện thoại sll','dien thoai sll','đ.thoại sll','d.thoai sll'],
  contactEmail: ['email sll'],
  birthCertificateEthnicity: ['dt trên giấy ks','dt tren giay ks','dân tộc trên giấy ks','dan toc tren giay ks'],
  fatherBirthYear: ['năm sinh cha','nam sinh cha'],
  fatherOccupation: ['nghề nghiệp cha','nghe nghiep cha'],
  fatherWorkplace: ['đơn vị công tác cha','don vi cong tac cha','đơn vị ctác cha','don vi ctac cha'],
  fatherCitizenId: ['căn cước cha','can cuoc cha'],
  motherBirthYear: ['năm sinh mẹ','nam sinh me'],
  motherOccupation: ['nghề nghiệp mẹ','nghe nghiep me'],
  motherWorkplace: ['đơn vị công tác mẹ','don vi cong tac me','đơn vị ctác mẹ','don vi ctac me'],
  motherCitizenId: ['căn cước mẹ','can cuoc me'],
  guardianName: ['người đỡ đầu','nguoi do dau'],
  guardianBirthYear: ['năm sinh người đỡ đầu','nam sinh nguoi do dau'],
  guardianOccupation: ['nghề nghiệp người đỡ đầu','nghe nghiep nguoi do dau'],
  guardianWorkplace: ['đơn vị công tác người đỡ đầu','don vi cong tac nguoi do dau'],
  guardianPhone: ['điện thoại người đỡ đầu','dien thoai nguoi do dau'],
  guardianCitizenId: ['căn cước nđđ','can cuoc ndd','căn cước người đỡ đầu'],
  studentPhoto: ['ảnh h.sinh','anh h.sinh','ảnh học sinh','anh hoc sinh'],
  notes: ['ghi chú','ghi chu'],
});

function text(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Intl.DateTimeFormat('vi-VN').format(value);
  }
  return String(value ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}

export function foldVneduText(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d')
    .replace(/Đ/g,'D')
    .toLowerCase()
    .replace(/[.:;,()[\]{}]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function normalizeHeader(value) {
  return foldVneduText(value);
}

function aliasLookup(groups) {
  const lookup = new Map();
  Object.entries(groups).forEach(([key, aliases]) => {
    aliases.forEach((alias) => lookup.set(normalizeHeader(alias), key));
  });
  return lookup;
}

const FIELD_LOOKUP = aliasLookup(FIELD_ALIASES);
const IDENTIFIER_LOOKUP = aliasLookup(IDENTIFIER_ALIASES);
const EXTRA_LOOKUP = aliasLookup(EXTRA_ALIASES);

function looksLikeHeader(row) {
  const normalized = (row || []).map(normalizeHeader).filter(Boolean);
  const known = normalized.filter((value) => (
    FIELD_LOOKUP.has(value) || IDENTIFIER_LOOKUP.has(value) || EXTRA_LOOKUP.has(value)
  )).length;
  const required = normalized.some((value) => FIELD_LOOKUP.get(value) === 'fullName');
  return required && known >= 5;
}

function dateText(value) {
  const raw = text(value);
  const match = raw.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if (!match) return raw;
  return [String(match[1]).padStart(2,'0'),String(match[2]).padStart(2,'0'),match[3]].join('/');
}

function cleanPhone(value) {
  const digits = text(value).replace(/[^\d]/g,'');
  return digits.length >= 9 && digits.length <= 11 ? digits : text(value);
}

function cleanCitizenId(value) {
  const digits = text(value).replace(/[^\d]/g,'');
  return digits.length >= 9 && digits.length <= 14 ? digits : text(value);
}

function cleanField(key, value) {
  const raw = text(value);
  if (!raw || /^[-—]+$/.test(raw)) return '';
  if (key === 'birthDate') return dateText(raw);
  if (['phone','fatherPhone','motherPhone'].includes(key)) return cleanPhone(raw);
  if (key === 'citizenId') return cleanCitizenId(raw);
  if (key === 'gender') {
    const folded = foldVneduText(raw);
    if (folded === 'nam') return 'Nam';
    if (folded === 'nu') return 'Nữ';
  }
  return raw;
}

function headerMap(headers) {
  const fields = {};
  const identifiers = {};
  const extra = {};
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (FIELD_LOOKUP.has(normalized)) fields[FIELD_LOOKUP.get(normalized)] = index;
    if (IDENTIFIER_LOOKUP.has(normalized)) identifiers[IDENTIFIER_LOOKUP.get(normalized)] = index;
    if (EXTRA_LOOKUP.has(normalized)) extra[EXTRA_LOOKUP.get(normalized)] = index;
  });
  return { fields, identifiers, extra };
}

function nonEmptyRawColumns(headers, row, mapping) {
  const used = new Set([
    ...Object.values(mapping.fields || {}),
    ...Object.values(mapping.identifiers || {}),
    ...Object.values(mapping.extra || {}),
  ]);
  const rawColumns = {};
  const unmappedColumns = {};
  const seen = new Map();
  (headers || []).forEach((header, index) => {
    const value = text(row?.[index]);
    if (!value) return;
    const baseLabel = text(header) || ('Cột ' + (index + 1));
    const count = (seen.get(baseLabel) || 0) + 1;
    seen.set(baseLabel, count);
    const label = count > 1 ? baseLabel + ' (' + count + ')' : baseLabel;
    rawColumns[label] = value;
    if (!used.has(index)) unmappedColumns[label] = value;
  });
  return { rawColumns, unmappedColumns };
}

export function parseVneduMatrix(matrix, sheetName = 'Sheet1') {
  const rows = Array.isArray(matrix) ? matrix : [];
  let headerRowIndex = rows.findIndex(looksLikeHeader);
  if (headerRowIndex < 0) {
    // vnEdu exports can have a title block above the table. Search the first 40 rows
    // with a looser score and still require a full-name column.
    let best = { index: -1, score: 0 };
    rows.slice(0,40).forEach((row, index) => {
      const normalized = (row || []).map(normalizeHeader);
      const hasName = normalized.some((value) => FIELD_LOOKUP.get(value) === 'fullName');
      const score = normalized.filter((value) => FIELD_LOOKUP.has(value) || IDENTIFIER_LOOKUP.has(value) || EXTRA_LOOKUP.has(value)).length;
      if (hasName && score > best.score) best = { index, score };
    });
    headerRowIndex = best.index;
  }
  if (headerRowIndex < 0) throw new Error('Không tìm thấy dòng tiêu đề danh sách học sinh vnEdu.');

  const headers = (rows[headerRowIndex] || []).map(text);
  const mapping = headerMap(headers);
  if (mapping.fields.fullName == null) throw new Error('File không có cột Họ và tên.');

  const students = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const fullName = cleanField('fullName', row[mapping.fields.fullName]);
    if (!fullName) continue;

    const fields = {};
    Object.entries(mapping.fields).forEach(([key, index]) => {
      const value = cleanField(key, row[index]);
      if (value) fields[key] = value;
    });
    const identifiers = {};
    Object.entries(mapping.identifiers).forEach(([key, index]) => {
      const value = text(row[index]);
      if (value) identifiers[key] = value;
    });
    const extra = {};
    Object.entries(mapping.extra).forEach(([key, index]) => {
      const value = text(row[index]);
      if (value) extra[key] = value;
    });
    const { rawColumns, unmappedColumns } = nonEmptyRawColumns(headers, row, mapping);

    students.push({
      rowNumber: rowIndex + 1,
      fields,
      identifiers,
      extra,
      rawColumns,
      unmappedColumns,
      mappedCount: Object.keys(rawColumns).length,
    });
  }

  if (!students.length) throw new Error('Không tìm thấy học sinh trong file vnEdu.');
  return { sheetName, headerRowIndex, headers, students };
}

let sheetJsPromise = null;
async function loadSheetJs() {
  if (globalThis.XLSX?.read) return globalThis.XLSX;
  if (sheetJsPromise) return sheetJsPromise;
  sheetJsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-bes-sheetjs="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(globalThis.XLSX), { once: true });
      existing.addEventListener('error', () => reject(new Error('Không thể tải bộ đọc Excel.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = SHEETJS_CDN;
    script.async = true;
    script.dataset.besSheetjs = 'true';
    script.onload = () => resolve(globalThis.XLSX);
    script.onerror = () => reject(new Error('Không thể tải bộ đọc Excel. Kiểm tra kết nối và thử lại.'));
    document.head.appendChild(script);
  });
  return sheetJsPromise;
}

export async function readVneduExcelFile(file) {
  if (!file) throw new Error('Chưa chọn file Excel.');
  if (!/\.(xls|xlsx)$/i.test(file.name || '')) throw new Error('Chỉ hỗ trợ file .xls hoặc .xlsx xuất từ vnEdu.');
  const XLSX = await loadSheetJs();
  if (!XLSX?.read || !XLSX?.utils?.sheet_to_json) throw new Error('Bộ đọc Excel chưa sẵn sàng.');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellText: true });
  const sheetNames = workbook.SheetNames || [];
  if (!sheetNames.length) throw new Error('File Excel không có worksheet.');

  let best = null;
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      dateNF: 'dd/mm/yyyy',
      blankrows: false,
    });
    try {
      const parsed = parseVneduMatrix(matrix, sheetName);
      if (!best || parsed.students.length > best.students.length) best = parsed;
    } catch {
      // Try the next worksheet.
    }
  }
  if (!best) throw new Error('Không nhận diện được bảng danh sách học sinh vnEdu trong file.');
  return { ...best, fileName: file.name, fileSize: file.size };
}

function normalizedName(value) {
  return foldVneduText(value).replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
}

function normalizedDate(value) {
  const raw = text(value);
  const match = raw.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  return match ? [String(match[1]).padStart(2,'0'),String(match[2]).padStart(2,'0'),match[3]].join('/') : raw;
}

export function matchVneduImportRows(importRows, students) {
  const roster = (students || []).filter((student) => student?.active !== false);
  const nameGroups = new Map();
  roster.forEach((student) => {
    const key = normalizedName(student.fullName);
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key).push(student);
  });

  return (importRows || []).map((row) => {
    const name = normalizedName(row.fields?.fullName);
    const dob = normalizedDate(row.fields?.birthDate);
    const sameName = nameGroups.get(name) || [];
    const exactDob = sameName.filter((student) => (
      dob && normalizedDate(student.birthDate) === dob
    ));

    if (exactDob.length === 1) {
      return { ...row, matchStatus: 'exact', studentId: exactDob[0].id, candidates: [exactDob[0].id], matchLabel: 'Khớp họ tên + ngày sinh' };
    }
    if (sameName.length === 1) {
      return { ...row, matchStatus: 'name', studentId: sameName[0].id, candidates: [sameName[0].id], matchLabel: 'Khớp họ tên' };
    }
    if (sameName.length > 1) {
      return { ...row, matchStatus: 'review', studentId: '', candidates: sameName.map((student) => student.id), matchLabel: 'Trùng họ tên — cần chọn' };
    }
    return { ...row, matchStatus: 'unmatched', studentId: '', candidates: [], matchLabel: 'Không tìm thấy trong lớp' };
  });
}
