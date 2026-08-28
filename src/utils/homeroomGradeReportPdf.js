import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import { PEK_TEACHER_SIGNATURE_PNG_BASE64 } from '../assets/pekTeacherSignature.js';
import { buildGradeExportColumns, gradeExportValue } from './homeroomGradebookExport.js';

const SCHOOL_NAME = 'Trường Trung - Tiểu học Pétrus Ký';
const PDF_MIME = 'application/pdf';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 36;
const ROWS_PER_PAGE = 18;
const PDF_VIETNAMESE_FONT_URLS = Object.freeze([
  '/bes-fonts/brian-personal-font.ttf',
  'https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
]);

const COLORS = Object.freeze({
  blue: rgb(0.043, 0.341, 0.816),
  navy: rgb(0.071, 0.165, 0.302),
  green: rgb(0.071, 0.659, 0.216),
  yellow: rgb(0.98, 0.82, 0.12),
  red: rgb(0.91, 0.12, 0.12),
  ink: rgb(0.12, 0.13, 0.15),
  muted: rgb(0.38, 0.42, 0.48),
  line: rgb(0.83, 0.87, 0.93),
  softBlue: rgb(0.94, 0.97, 1),
  softerBlue: rgb(0.975, 0.987, 1),
  white: rgb(1, 1, 1),
});

const SEMESTER_LABELS = Object.freeze({
  semester1: 'Học kỳ I',
  semester2: 'Học kỳ II',
});

function safeText(value, fallback = '') {
  const text = String(value ?? '').normalize('NFC').trim();
  return text || fallback;
}

function filePart(value, fallback) {
  return safeText(value, fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function base64Bytes(value) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function fetchBytes(path, label) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Không thể tải ${label} để tạo phiếu điểm PDF.`);
  return new Uint8Array(await response.arrayBuffer());
}

function assertTrueTypeFont(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 4) {
    throw new Error('Font tiếng Việt dùng để tạo PDF không hợp lệ.');
  }
  const isTrueType = bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00;
  const isOpenType = bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f;
  if (!isTrueType && !isOpenType) {
    throw new Error('Font tiếng Việt dùng để tạo PDF không đúng định dạng TTF/OTF.');
  }
  return bytes;
}

async function fetchVietnameseFontBytes() {
  let lastError = null;
  for (const path of PDF_VIETNAMESE_FONT_URLS) {
    try {
      return assertTrueTypeFont(await fetchBytes(path, 'font tiếng Việt'));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Không thể tải font tiếng Việt đầy đủ để tạo phiếu điểm PDF.');
}

function reportTime(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function signatureDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `Ngày ${day} tháng ${month} năm ${date.getFullYear()}`;
}

function fitText(font, value, maxWidth, preferredSize, minimumSize = 6.8) {
  const original = safeText(value, '-');
  let size = preferredSize;
  while (size > minimumSize && font.widthOfTextAtSize(original, size) > maxWidth) size -= 0.25;
  if (font.widthOfTextAtSize(original, size) <= maxWidth) return { text: original, size };

  let text = original;
  while (text.length > 1 && font.widthOfTextAtSize(`${text}...`, size) > maxWidth) text = text.slice(0, -1);
  return { text: `${text}...`, size };
}

function drawFittedText(page, font, value, options) {
  const {
    x,
    y,
    width,
    size = 9,
    color = COLORS.ink,
    align = 'left',
  } = options;
  const fitted = fitText(font, value, width, size);
  const textWidth = font.widthOfTextAtSize(fitted.text, fitted.size);
  const finalX = align === 'center' ? x + (width - textWidth) / 2 : align === 'right' ? x + width - textWidth : x;
  page.drawText(fitted.text, { x: finalX, y, size: fitted.size, font, color });
}

function drawHeader(page, font, logo, meta) {
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const stripeWidth = contentWidth / 3;
  page.drawRectangle({ x: PAGE_MARGIN, y: PAGE_HEIGHT - 16, width: stripeWidth, height: 6, color: COLORS.green });
  page.drawRectangle({ x: PAGE_MARGIN + stripeWidth, y: PAGE_HEIGHT - 16, width: stripeWidth, height: 6, color: COLORS.yellow });
  page.drawRectangle({ x: PAGE_MARGIN + stripeWidth * 2, y: PAGE_HEIGHT - 16, width: stripeWidth, height: 6, color: COLORS.red });

  const logoHeight = 82;
  const logoWidth = logo.width / logo.height * logoHeight;
  page.drawImage(logo, { x: PAGE_MARGIN + 4, y: PAGE_HEIGHT - 113, width: logoWidth, height: logoHeight });

  const textX = PAGE_MARGIN + 92;
  const textWidth = PAGE_WIDTH - PAGE_MARGIN - textX;
  drawFittedText(page, font, meta.schoolName.toLocaleUpperCase('vi-VN'), {
    x: textX, y: PAGE_HEIGHT - 45, width: textWidth, size: 11.5, color: COLORS.navy, align: 'center',
  });
  drawFittedText(page, font, 'PHIẾU ĐIỂM CÁ NHÂN', {
    x: textX, y: PAGE_HEIGHT - 72, width: textWidth, size: 19, color: COLORS.blue, align: 'center',
  });
  drawFittedText(page, font, `${meta.subjectName} - ${meta.semesterLabel}`, {
    x: textX, y: PAGE_HEIGHT - 94, width: textWidth, size: 10.5, color: COLORS.muted, align: 'center',
  });
  page.drawLine({
    start: { x: PAGE_MARGIN, y: PAGE_HEIGHT - 121 },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: PAGE_HEIGHT - 121 },
    thickness: 1.2,
    color: COLORS.blue,
  });
}

function drawMetaCard(page, font, meta) {
  const x = PAGE_MARGIN;
  const y = PAGE_HEIGHT - 222;
  const width = PAGE_WIDTH - PAGE_MARGIN * 2;
  const height = 86;
  const cellWidth = width / 2;
  const rowHeight = height / 3;
  const fields = [
    ['Họ và tên', meta.studentName, 'Mã học sinh', meta.studentCode],
    ['Lớp', meta.className, 'Năm học', meta.schoolYear],
    ['Môn học', meta.subjectName, 'Học kỳ', meta.semesterLabel],
  ];

  page.drawRectangle({ x, y, width, height, color: COLORS.softBlue, borderColor: COLORS.line, borderWidth: 0.8 });
  page.drawLine({ start: { x: x + cellWidth, y }, end: { x: x + cellWidth, y: y + height }, thickness: 0.65, color: COLORS.line });
  for (let index = 1; index < 3; index += 1) {
    page.drawLine({
      start: { x, y: y + rowHeight * index },
      end: { x: x + width, y: y + rowHeight * index },
      thickness: 0.65,
      color: COLORS.line,
    });
  }

  fields.forEach((field, rowIndex) => {
    const baseline = y + height - rowHeight * (rowIndex + 1) + 9.5;
    [0, 1].forEach((columnIndex) => {
      const offset = x + cellWidth * columnIndex + 10;
      const label = field[columnIndex * 2];
      const value = field[columnIndex * 2 + 1];
      drawFittedText(page, font, label, { x: offset, y: baseline, width: 66, size: 8.2, color: COLORS.muted });
      drawFittedText(page, font, value, { x: offset + 67, y: baseline - 0.5, width: cellWidth - 87, size: 10.2, color: COLORS.ink });
    });
  });
  return y;
}

function scoreText(value) {
  if (value == null) return '-';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

function drawTable(page, font, semester, studentId, columns, startIndex, metaCardY) {
  const x = PAGE_MARGIN;
  const tableTop = metaCardY - 42;
  const headerHeight = 27;
  const rowHeight = 22;
  const widths = [34, 210, 120, 58, 101];
  const headers = ['STT', 'Thành phần điểm', 'Nhóm điểm', 'Điểm', 'Trạng thái'];
  const totalWidth = widths.reduce((sum, value) => sum + value, 0);

  drawFittedText(page, font, 'CÁC CỘT ĐIỂM ĐÃ CHỌN', {
    x, y: tableTop + 13, width: totalWidth - 70, size: 9.5, color: COLORS.navy,
  });
  drawFittedText(page, font, `${startIndex + 1}-${startIndex + columns.length}`, {
    x: x + totalWidth - 70, y: tableTop + 13, width: 70, size: 8.5, color: COLORS.muted, align: 'right',
  });

  let cursorY = tableTop - headerHeight;
  page.drawRectangle({ x, y: cursorY, width: totalWidth, height: headerHeight, color: COLORS.blue });
  let columnX = x;
  headers.forEach((header, index) => {
    drawFittedText(page, font, header, {
      x: columnX + 4, y: cursorY + 9, width: widths[index] - 8, size: 8.8, color: COLORS.white, align: 'center',
    });
    columnX += widths[index];
    if (index < headers.length - 1) {
      page.drawLine({ start: { x: columnX, y: cursorY }, end: { x: columnX, y: cursorY + headerHeight }, thickness: 0.5, color: COLORS.white, opacity: 0.55 });
    }
  });

  columns.forEach((column, rowIndex) => {
    cursorY -= rowHeight;
    const value = gradeExportValue(semester, column, studentId);
    const values = [
      String(startIndex + rowIndex + 1),
      column.dialogLabel,
      column.group.replace(' · ', ' - '),
      scoreText(value),
      value == null ? 'Chưa nhập' : 'Đã nhập',
    ];
    page.drawRectangle({
      x,
      y: cursorY,
      width: totalWidth,
      height: rowHeight,
      color: rowIndex % 2 ? COLORS.white : COLORS.softerBlue,
      borderColor: COLORS.line,
      borderWidth: 0.45,
    });
    page.drawRectangle({ x: x + widths[0] + widths[1] + widths[2], y: cursorY, width: widths[3], height: rowHeight, color: COLORS.softBlue });

    columnX = x;
    values.forEach((cell, index) => {
      drawFittedText(page, font, cell, {
        x: columnX + 5,
        y: cursorY + 7.5,
        width: widths[index] - 10,
        size: index === 1 ? 8.8 : 8.4,
        color: index === 3 ? COLORS.navy : COLORS.ink,
        align: index === 1 ? 'left' : 'center',
      });
      columnX += widths[index];
      if (index < values.length - 1) {
        page.drawLine({ start: { x: columnX, y: cursorY }, end: { x: columnX, y: cursorY + rowHeight }, thickness: 0.45, color: COLORS.line });
      }
    });
  });
  return cursorY;
}

function drawSignature(page, font, signature, meta, date) {
  const blockWidth = 220;
  const blockX = PAGE_WIDTH - PAGE_MARGIN - blockWidth;
  drawFittedText(page, font, signatureDate(date), {
    x: blockX, y: 137, width: blockWidth, size: 8.8, color: COLORS.muted, align: 'center',
  });
  drawFittedText(page, font, 'GIÁO VIÊN CHỦ NHIỆM', {
    x: blockX, y: 119, width: blockWidth, size: 9.6, color: COLORS.navy, align: 'center',
  });
  const signatureWidth = 154;
  const signatureHeight = signature.height / signature.width * signatureWidth;
  page.drawImage(signature, {
    x: blockX + (blockWidth - signatureWidth) / 2,
    y: 69,
    width: signatureWidth,
    height: signatureHeight,
  });
  drawFittedText(page, font, meta.adviserName, {
    x: blockX, y: 52, width: blockWidth, size: 10, color: COLORS.ink, align: 'center',
  });

  drawFittedText(page, font, 'Ghi chú', { x: PAGE_MARGIN, y: 118, width: 170, size: 9.2, color: COLORS.navy });
  drawFittedText(page, font, '- Ô trống là điểm chưa nhập.', { x: PAGE_MARGIN, y: 100, width: 245, size: 8.2, color: COLORS.muted });
  drawFittedText(page, font, '- Phiếu được tạo từ dữ liệu sổ điểm tại thời điểm xuất.', { x: PAGE_MARGIN, y: 84, width: 245, size: 8.2, color: COLORS.muted });
  drawFittedText(page, font, `Thời điểm xuất: ${meta.exportedAt}`, { x: PAGE_MARGIN, y: 62, width: 245, size: 8, color: COLORS.muted });
}

function drawFooter(page, font, pageNumber, pageCount) {
  page.drawLine({
    start: { x: PAGE_MARGIN, y: 34 },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: 34 },
    thickness: 0.55,
    color: COLORS.line,
  });
  drawFittedText(page, font, 'Ứng dụng GVCN - Pétrus Ký School', {
    x: PAGE_MARGIN, y: 19, width: 300, size: 7.4, color: COLORS.muted,
  });
  drawFittedText(page, font, `Trang ${pageNumber}/${pageCount}`, {
    x: PAGE_WIDTH - PAGE_MARGIN - 100, y: 19, width: 100, size: 7.4, color: COLORS.muted, align: 'right',
  });
}

export async function buildStudentGradeReportPdf(input) {
  const {
    workspace,
    student,
    subjectName,
    semesterId,
    semester,
    selectedColumnIds,
    currentUser,
    fontBytes: suppliedFontBytes,
    logoBytes: suppliedLogoBytes,
    signatureBytes: suppliedSignatureBytes,
  } = input || {};
  if (!student) throw new Error('Hãy chọn học sinh cần xuất phiếu điểm.');

  const selected = new Set(selectedColumnIds || []);
  const columns = buildGradeExportColumns(semester).filter((column) => selected.has(column.id));
  if (!columns.length) throw new Error('Hãy chọn ít nhất một cột điểm.');

  const profile = workspace?.classProfile || {};
  const now = new Date();
  const meta = {
    schoolName: SCHOOL_NAME,
    studentName: safeText(student.fullName, 'Chưa có tên'),
    studentCode: safeText(student.code, '-'),
    className: safeText(profile.className, 'Chưa thiết lập'),
    schoolYear: safeText(profile.schoolYear, '-'),
    subjectName: safeText(subjectName, 'Môn học'),
    semesterLabel: SEMESTER_LABELS[semesterId] || safeText(semesterId, 'Học kỳ'),
    adviserName: safeText(profile.adviserName || currentUser?.name || currentUser?.email, 'Giáo viên'),
    exportedAt: reportTime(now),
  };

  const [fontBytes, logoBytes, signatureBytes] = await Promise.all([
    suppliedFontBytes ? Promise.resolve(assertTrueTypeFont(suppliedFontBytes)) : fetchVietnameseFontBytes(),
    suppliedLogoBytes || fetchBytes('/footer-pek-logo.png', 'logo trường'),
    suppliedSignatureBytes || Promise.resolve(base64Bytes(PEK_TEACHER_SIGNATURE_PNG_BASE64)),
  ]);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Phiếu điểm cá nhân - ${meta.studentName}`);
  pdf.setAuthor(meta.adviserName);
  pdf.setSubject(`${meta.subjectName} - ${meta.semesterLabel} - Lớp ${meta.className}`);
  pdf.setCreator('Ứng dụng GVCN - Pétrus Ký School');
  pdf.setProducer('Pétrus Ký School');
  pdf.setCreationDate(now);
  pdf.setModificationDate(now);

  const [font, logo, signature] = await Promise.all([
    pdf.embedFont(fontBytes, { subset: true }),
    pdf.embedPng(logoBytes),
    pdf.embedPng(signatureBytes),
  ]);

  const pageChunks = [];
  for (let index = 0; index < columns.length; index += ROWS_PER_PAGE) pageChunks.push(columns.slice(index, index + ROWS_PER_PAGE));
  pageChunks.forEach((pageColumns, pageIndex) => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader(page, font, logo, meta);
    const metaCardY = drawMetaCard(page, font, meta);
    drawTable(page, font, semester, student.id, pageColumns, pageIndex * ROWS_PER_PAGE, metaCardY);
    if (pageIndex === pageChunks.length - 1) drawSignature(page, font, signature, meta, now);
    drawFooter(page, font, pageIndex + 1, pageChunks.length);
  });

  const bytes = await pdf.save();
  return {
    fileName: `Phieu-diem-${filePart(meta.studentName, 'hoc-sinh')}-${filePart(meta.subjectName, 'mon-hoc')}-${filePart(meta.semesterLabel, 'hoc-ky')}.pdf`,
    bytes,
    pageCount: pageChunks.length,
    mimeType: PDF_MIME,
  };
}

export async function exportStudentGradeReportPdf(input) {
  const result = await buildStudentGradeReportPdf(input);
  const blob = new Blob([result.bytes], { type: PDF_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { ...result, blob };
}
