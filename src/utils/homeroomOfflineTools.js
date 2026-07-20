import readXlsxFile from 'read-excel-file/browser';

export function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function startOfWeek(dateValue = todayIso()) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

export function endOfWeek(dateValue = todayIso()) {
  const date = new Date(`${startOfWeek(dateValue)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  date.setDate(date.getDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function formatViDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}

export function normalizePhone(value) {
  const raw = safeText(value).replace(/[^\d+]/g, '');
  if (/^\d{9}$/.test(raw) && !raw.startsWith('0')) return `0${raw}`;
  return raw;
}

function fold(value) {
  return safeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = safeText(value);
  const iso = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const vi = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (vi) {
    const year = vi[3].length === 2 ? `20${vi[3]}` : vi[3];
    return `${year}-${String(vi[2]).padStart(2, '0')}-${String(vi[1]).padStart(2, '0')}`;
  }
  return text;
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((item) => safeText(item))) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((item) => safeText(item))) rows.push(row);
  return rows;
}

function detectDelimiter(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => safeText(line)).slice(0, 15);
  const candidates = [',', ';', '\t'];
  return candidates.map((delimiter) => {
    const widths = lines.map((line) => parseDelimited(line, delimiter)[0]?.length || 1);
    const useful = widths.filter((width) => width > 1);
    const common = useful.length ? Math.max(...useful.map((width) => useful.filter((entry) => entry === width).length)) : 0;
    return { delimiter, score: useful.length * 10 + common * 6 + Math.max(0, ...widths) };
  }).sort((a, b) => b.score - a.score)[0]?.delimiter || ',';
}

export async function readTabularFile(file) {
  if (!file) throw new Error('Chưa chọn file.');
  const name = safeText(file.name).toLowerCase();
  if (name.endsWith('.xls')) throw new Error('File Excel .xls cũ chưa được hỗ trợ. Hãy mở file và lưu lại dưới dạng .xlsx.');
  if (name.endsWith('.xlsx')) {
    return readXlsxFile(file, { dateFormat: 'dd/mm/yyyy' });
  }
  const text = (await file.text()).replace(/^\uFEFF/, '');
  const rows = parseDelimited(text, name.endsWith('.tsv') ? '\t' : detectDelimiter(text));
  if (rows[0]?.length === 1 && /^sep=./i.test(safeText(rows[0][0]))) rows.shift();
  return rows;
}

function fieldForHeader(value, aliases) {
  const target = fold(value);
  for (const [key, names] of Object.entries(aliases)) {
    if (names.some((name) => target === fold(name) || target.includes(fold(name)))) return key;
  }
  return '';
}

function mapRows(rows, aliases, requiredField) {
  const normalized = (rows || []).map((row) => Array.isArray(row) ? row : [row]).filter((row) => row.some((cell) => safeText(cell)));
  if (!normalized.length) throw new Error('File không có dữ liệu.');
  const headerIndex = normalized.findIndex((row) => row.some((cell) => fieldForHeader(cell, aliases) === requiredField));
  if (headerIndex < 0) throw new Error(`Không nhận diện được cột bắt buộc “${requiredField}”. Hãy dùng file mẫu.`);
  const mapping = normalized[headerIndex].map((header) => fieldForHeader(header, aliases));
  return normalized.slice(headerIndex + 1).map((row, index) => {
    const item = { __row: headerIndex + index + 2 };
    mapping.forEach((field, column) => { if (field) item[field] = row[column]; });
    return item;
  });
}

const SCHEDULE_ALIASES = {
  title: ['nội dung công việc', 'noi dung cong viec', 'công việc', 'cong viec', 'tiêu đề', 'title'],
  date: ['ngày', 'ngay', 'date'],
  startTime: ['bắt đầu', 'bat dau', 'giờ bắt đầu', 'start time'],
  endTime: ['kết thúc', 'ket thuc', 'giờ kết thúc', 'end time'],
  location: ['địa điểm', 'dia diem', 'location', 'link'],
  category: ['loại công việc', 'loai cong viec', 'nhóm', 'category'],
  audience: ['đối tượng', 'doi tuong', 'audience'],
  note: ['ghi chú', 'ghi chu', 'nội dung chuẩn bị', 'note'],
  status: ['trạng thái', 'trang thai', 'status'],
};

export async function parseScheduleFile(file) {
  const rows = mapRows(await readTabularFile(file), SCHEDULE_ALIASES, 'title');
  const items = rows.map((row) => ({
    title: safeText(row.title),
    date: normalizeDate(row.date),
    startTime: safeText(row.startTime),
    endTime: safeText(row.endTime),
    location: safeText(row.location),
    category: safeText(row.category, 'Khác'),
    audience: safeText(row.audience, 'Toàn lớp'),
    note: safeText(row.note),
    status: safeText(row.status, 'Sắp tới'),
    __row: row.__row,
  })).filter((item) => item.title);
  if (!items.length) throw new Error('Không tìm thấy công việc hợp lệ trong file.');
  return items;
}

const LEARNING_ALIASES = {
  studentCode: ['mã hs', 'ma hs', 'mã học sinh', 'student code', 'student id'],
  studentName: ['họ và tên', 'ho va ten', 'họ tên', 'student name', 'name'],
  subject: ['môn học', 'mon hoc', 'môn', 'subject'],
  period: ['học kỳ', 'hoc ky', 'giai đoạn', 'period', 'term'],
  assessment: ['loại điểm', 'loai diem', 'loại đánh giá', 'assessment', 'category'],
  score: ['điểm', 'diem', 'score', 'mark'],
  maxScore: ['thang điểm', 'thang diem', 'điểm tối đa', 'max score'],
  recordedAt: ['ngày', 'ngay', 'ngày ghi nhận', 'date'],
  teacherName: ['giáo viên', 'giao vien', 'teacher'],
  note: ['ghi chú', 'ghi chu', 'note', 'comment'],
};

export async function parseLearningFile(file) {
  const rows = mapRows(await readTabularFile(file), LEARNING_ALIASES, 'score');
  const items = rows.map((row) => {
    const score = Number(String(row.score ?? '').trim().replace(',', '.'));
    const maxScore = row.maxScore === '' || row.maxScore === null || row.maxScore === undefined
      ? 10
      : Number(String(row.maxScore).trim().replace(',', '.'));
    return {
      studentCode: safeText(row.studentCode),
      studentName: safeText(row.studentName),
      subject: safeText(row.subject),
      period: safeText(row.period),
      assessment: safeText(row.assessment, 'Điểm đánh giá'),
      score,
      maxScore,
      recordedAt: normalizeDate(row.recordedAt) || todayIso(),
      teacherName: safeText(row.teacherName),
      note: safeText(row.note),
      __row: row.__row,
    };
  }).filter((item) => Number.isFinite(item.score) && (item.studentCode || item.studentName));
  if (!items.length) throw new Error('Không tìm thấy dòng điểm hợp lệ.');
  return items;
}

function normalizedScores(workspace, studentId, subject = '') {
  const subjectKey = fold(subject);
  return (workspace.learningRecords || []).filter((item) => (
    item.studentId === studentId && (!subjectKey || fold(item.subject) === subjectKey)
  )).map((item) => {
    const max = Number(item.maxScore);
    const score = Number(item.score);
    return Number.isFinite(max) && max > 0 && Number.isFinite(score) ? score / max * 10 : null;
  }).filter(Number.isFinite);
}

export function studentMetrics(workspace, studentId, options = {}) {
  const subject = typeof options === 'string' ? options : safeText(options?.subject);
  const attendanceRows = Object.values(workspace.attendance || {}).map((rows) => rows?.[studentId]).filter(Boolean);
  const scores = normalizedScores(workspace, studentId, subject);
  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  return {
    average,
    scoreCount: scores.length,
    present: attendanceRows.filter((item) => item.status === 'present').length,
    late: attendanceRows.filter((item) => item.status === 'late').length,
    excused: attendanceRows.filter((item) => item.status === 'excused').length,
    unexcused: attendanceRows.filter((item) => item.status === 'unexcused').length,
    early: attendanceRows.filter((item) => item.status === 'early').length,
  };
}

export function classMetrics(workspace, referenceDate = todayIso()) {
  const students = (workspace.students || []).filter((item) => item.active !== false);
  const perStudent = students.map((student) => ({ student, ...studentMetrics(workspace, student.id) }));
  const averages = perStudent.map((item) => item.average).filter(Number.isFinite);
  const weekStart = startOfWeek(referenceDate);
  const weekEnd = endOfWeek(referenceDate);
  const weeklyAttendanceKeys = Object.keys(workspace.attendance || {}).filter((key) => {
    const date = key.split('::')[0];
    return date >= weekStart && date <= weekEnd;
  });
  const weeklyEntries = weeklyAttendanceKeys.flatMap((key) => Object.values(workspace.attendance?.[key] || {}));
  return {
    students,
    perStudent,
    classAverage: averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null,
    priorityCount: students.filter((item) => item.supportLevel === 'priority').length,
    attentionCount: students.filter((item) => item.supportLevel === 'attention').length,
    weekStart,
    weekEnd,
    weeklyAttendanceSessions: weeklyAttendanceKeys.length,
    weeklyPresent: weeklyEntries.filter((item) => item?.status === 'present').length,
    weeklyLate: weeklyEntries.filter((item) => item?.status === 'late').length,
    weeklyAbsent: weeklyEntries.filter((item) => ['excused', 'unexcused'].includes(item?.status)).length,
  };
}

export function buildMeetingDraft(workspace, date = todayIso(), focus = '') {
  const metrics = classMetrics(workspace, date);
  const weeklySchedule = (workspace.schedule || []).filter((item) => item.date >= metrics.weekStart && item.date <= metrics.weekEnd);
  const weeklyConduct = (workspace.conductRecords || []).filter((item) => item.date >= metrics.weekStart && item.date <= metrics.weekEnd && !item.cancelledAt);
  const positive = metrics.perStudent.filter((item) => Number.isFinite(item.average) && item.average >= 8).slice(0, 6).map((item) => item.student.fullName);
  const attention = metrics.perStudent.filter((item) => item.unexcused > 0 || item.late >= 2 || (Number.isFinite(item.average) && item.average < 5) || item.student.supportLevel !== 'normal').slice(0, 8);
  const attendanceSummary = metrics.weeklyAttendanceSessions
    ? `${metrics.weeklyAttendanceSessions} phiên điểm danh; ${metrics.weeklyPresent} lượt có mặt, ${metrics.weeklyAbsent} lượt vắng, ${metrics.weeklyLate} lượt đi trễ.`
    : 'Tuần này chưa có dữ liệu điểm danh.';
  const learningSummary = Number.isFinite(metrics.classAverage)
    ? `Điểm trung bình các kết quả đã nhập: ${metrics.classAverage.toFixed(1)}/10. ${attention.filter((item) => Number.isFinite(item.average) && item.average < 5).length} học sinh đang dưới ngưỡng 5,0.`
    : 'Chưa có đủ dữ liệu học tập để tổng hợp.';
  const commendations = positive.length ? `Tuyên dương: ${positive.join(', ')}.` : 'GVCN bổ sung học sinh/nhóm cần tuyên dương trong tuần.';
  const reminders = [
    weeklyConduct.length ? `Có ${weeklyConduct.length} ghi nhận rèn luyện cần trao đổi khách quan.` : '',
    attention.length ? `Cần theo dõi: ${attention.map((item) => item.student.fullName).join(', ')}.` : '',
    focus ? `Trọng tâm bổ sung: ${safeText(focus)}.` : '',
  ].filter(Boolean).join('\n');
  const nextWeek = weeklySchedule.length
    ? weeklySchedule.map((item) => `• ${formatViDate(item.date)}${item.startTime ? ` ${item.startTime}` : ''}: ${item.title}`).join('\n')
    : '• Hoàn thiện các nhiệm vụ còn lại và chuẩn bị kế hoạch tuần mới.';
  const theme = safeText(focus, `Tổng kết tuần ${formatViDate(metrics.weekStart)} – ${formatViDate(metrics.weekEnd)}`);
  const content = [
    '1. Ổn định tổ chức, kiểm diện và nêu mục tiêu tiết sinh hoạt (3 phút).',
    `2. Tổng kết chuyên cần (7 phút): ${attendanceSummary}`,
    `3. Phản hồi học tập và rèn luyện (10 phút): ${learningSummary}`,
    `4. Tuyên dương, chia sẻ việc làm tốt (7 phút): ${commendations}`,
    `5. Trao đổi vấn đề cần cải thiện theo hướng giải pháp (8 phút).${reminders ? `\n${reminders}` : ''}`,
    `6. Phân công và kế hoạch tuần tới (7 phút):\n${nextWeek}`,
    '7. Học sinh tự cam kết một hành động cụ thể; lớp trưởng xác nhận nhiệm vụ (3 phút).',
  ].join('\n\n');
  return {
    date,
    theme,
    objectives: 'Đánh giá tuần dựa trên dữ liệu thực; ghi nhận tiến bộ; thống nhất giải pháp và phân công tuần tới.',
    attendanceSummary,
    learningSummary,
    commendations,
    reminders,
    nextWeek,
    content,
  };
}

export function buildParentMessage(workspace, input = {}) {
  const student = (workspace.students || []).find((item) => item.id === input.studentId);
  const parentName = safeText(student?.parentName, 'Quý phụ huynh');
  const studentName = safeText(student?.fullName, 'học sinh');
  const subject = safeText(input.subject, 'trao đổi tình hình học tập và rèn luyện');
  const metrics = student ? studentMetrics(workspace, student.id) : null;
  const facts = [];
  if (metrics?.scoreCount) facts.push(`điểm trung bình các kết quả đã nhập là ${metrics.average.toFixed(1)}/10`);
  if (metrics?.unexcused) facts.push(`có ${metrics.unexcused} lượt vắng không phép`);
  if (metrics?.late) facts.push(`có ${metrics.late} lượt đi trễ`);
  const factSentence = facts.length ? ` Dữ liệu hiện có cho thấy em ${facts.join(', ')}.` : '';
  const tone = safeText(input.tone, 'phối hợp');
  const opening = tone === 'trang trọng' ? `Kính gửi ${parentName},` : `Chào ${parentName},`;
  const closing = tone === 'khẩn' ? 'Kính mong phụ huynh phản hồi sớm để nhà trường và gia đình phối hợp kịp thời.' : 'Mong phụ huynh trao đổi thêm và cùng GVCN thống nhất biện pháp hỗ trợ phù hợp.';
  return `${opening}\n\nGVCN lớp ${workspace.classProfile?.className || ''} xin trao đổi về em ${studentName}: ${subject}.${factSentence}\n\n${closing}\n\nTrân trọng,\n${workspace.classProfile?.adviserName || 'Giáo viên chủ nhiệm'}`;
}

export function buildRecordDraft(workspace, input = {}) {
  const type = safeText(input.type, 'Báo cáo tuần');
  const period = safeText(input.period, `${formatViDate(startOfWeek())} – ${formatViDate(endOfWeek())}`);
  const metrics = classMetrics(workspace);
  const upcoming = (workspace.schedule || []).filter((item) => !item.date || item.date >= todayIso()).slice(0, 8);
  const openIncidents = (workspace.incidents || []).filter((item) => item.status !== 'closed');
  const activePlans = (workspace.supportPlans || []).filter((item) => item.status === 'active');
  const conduct = (workspace.conductRecords || []).filter((item) => !item.cancelledAt).slice(0, 20);
  const content = [
    `I. THÔNG TIN CHUNG\nLớp: ${workspace.classProfile?.className || '—'}\nNăm học: ${workspace.classProfile?.schoolYear || '—'}\nGVCN: ${workspace.classProfile?.adviserName || '—'}\nSĩ số đang học: ${metrics.students.length}`,
    `II. CHUYÊN CẦN\nSố phiên trong tuần: ${metrics.weeklyAttendanceSessions}\nLượt có mặt: ${metrics.weeklyPresent}\nLượt vắng: ${metrics.weeklyAbsent}\nLượt đi trễ: ${metrics.weeklyLate}`,
    `III. HỌC TẬP\nĐiểm trung bình từ dữ liệu đã nhập: ${Number.isFinite(metrics.classAverage) ? `${metrics.classAverage.toFixed(1)}/10` : 'Chưa đủ dữ liệu'}\nHọc sinh cần lưu ý: ${metrics.attentionCount}\nHọc sinh ưu tiên hỗ trợ: ${metrics.priorityCount}`,
    `IV. RÈN LUYỆN VÀ HỖ TRỢ\nGhi nhận rèn luyện đang hiệu lực: ${conduct.length}\nSự việc đang mở: ${openIncidents.length}\nKế hoạch hỗ trợ đang triển khai: ${activePlans.length}`,
    `V. CÔNG VIỆC SẮP TỚI\n${upcoming.length ? upcoming.map((item) => `• ${formatViDate(item.date)} ${item.startTime || ''} – ${item.title}`).join('\n') : '• Chưa có công việc được ghi nhận.'}`,
    'VI. KIẾN NGHỊ / ĐỀ XUẤT\nGVCN bổ sung nhận định chuyên môn và nội dung cần phối hợp với nhà trường, giáo viên bộ môn hoặc phụ huynh.',
  ].join('\n\n');
  return {
    type,
    period,
    title: safeText(input.title, `${type} lớp ${workspace.classProfile?.className || ''} · ${period}`),
    content,
    metadata: { generatedOffline: true, generatedAt: new Date().toISOString() },
  };
}

export function downloadCsv(filename, rows, delimiter = ';') {
  const escape = (value) => {
    const text = String(value ?? '');
    return new RegExp(`[${delimiter}\"\\r\\n]`).test(text) ? `\"${text.replace(/\"/g, '\"\"')}\"` : text;
  };
  const body = rows.map((row) => row.map(escape).join(delimiter)).join('\r\n');
  const blob = new Blob([`\uFEFFsep=${delimiter}\r\n${body}\r\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
