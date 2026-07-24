import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { slugify as librarySlugify } from '../utils/library.js';
import { loadMammoth, loadPdfjs } from '../utils/documentParsers.js';
import '../styles/TextCareGoogle.css';

const STORAGE_KEY = 'bes-textcare-google-draft-v2';
const DOC_TYPES = ['THÔNG BÁO', 'KẾ HOẠCH', 'BÁO CÁO', 'BIÊN BẢN', 'TỜ TRÌNH', 'CÔNG VĂN', 'QUYẾT ĐỊNH', 'GIẤY MỜI', 'PHIẾU', 'ĐƠN'];

const TYPE_ABBREVIATIONS = {
  'THÔNG BÁO': 'TB',
  'KẾ HOẠCH': 'KH',
  'BÁO CÁO': 'BC',
  'BIÊN BẢN': 'BB',
  'TỜ TRÌNH': 'TTr',
  'CÔNG VĂN': 'CV',
  'QUYẾT ĐỊNH': 'QĐ',
  'GIẤY MỜI': 'GM',
  'PHIẾU': 'P',
  'ĐƠN': 'Đ',
};

const SAMPLE_DOC_INFO = {
  parentAgency: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH',
  issuingUnit: 'TRƯỜNG THPT BRIAN ENGLISH',
  numberSymbol: '12/KH-THPTBE',
  placeDate: 'Thành phố Hồ Chí Minh, ngày 24 tháng 7 năm 2026',
  titleSummary: 'Tổ chức sinh hoạt chuyên môn môn Tiếng Anh tháng 7 năm 2026',
  recipient: 'Giáo viên Tổ Tiếng Anh',
  signerTitle: 'TỔ TRƯỞNG CHUYÊN MÔN',
  signerName: 'NGUYỄN ANH TUẤN',
  recipients: '- Ban Giám hiệu;\n- Tổ Tiếng Anh;\n- Lưu: VT, CM.',
};

const SAMPLE_BODY_BY_TYPE = {
  'KẾ HOẠCH': `I. MỤC ĐÍCH, YÊU CẦU
1. Nâng cao chất lượng sinh hoạt chuyên môn, tập trung vào đổi mới phương pháp dạy học, kiểm tra đánh giá và ứng dụng công nghệ.
2. Thống nhất nội dung ôn tập, xây dựng học liệu dùng chung và chia sẻ kinh nghiệm tổ chức hoạt động học tập.

II. NỘI DUNG THỰC HIỆN
1. Rà soát kế hoạch dạy học và thống nhất nội dung trọng tâm.
2. Xây dựng ngân hàng câu hỏi theo định hướng đánh giá năng lực.
3. Tổ chức góp ý chuyên môn đối với bài dạy minh họa.

III. TỔ CHỨC THỰC HIỆN
1. Tổ trưởng chuyên môn điều phối, tổng hợp sản phẩm và báo cáo Ban Giám hiệu.
2. Giáo viên thực hiện nhiệm vụ được phân công và nộp minh chứng đúng thời hạn.`,
  'THÔNG BÁO': `Nhà trường thông báo đến giáo viên Tổ Tiếng Anh về việc tham dự buổi sinh hoạt chuyên môn tháng 7 năm 2026.

1. Thời gian: 14 giờ 00, ngày 30 tháng 7 năm 2026.
2. Địa điểm: Phòng họp chuyên môn.
3. Nội dung: Rà soát kế hoạch dạy học, thống nhất học liệu và triển khai nhiệm vụ tháng 8.
4. Thành phần: Ban Giám hiệu phụ trách chuyên môn và toàn thể giáo viên Tổ Tiếng Anh.

Đề nghị các cá nhân có liên quan tham dự đầy đủ, đúng giờ và chuẩn bị nội dung theo phân công.`,
  'BÁO CÁO': `I. TÌNH HÌNH CHUNG
Tổ Tiếng Anh đã triển khai các nhiệm vụ chuyên môn theo kế hoạch của nhà trường.

II. KẾT QUẢ THỰC HIỆN
1. Hoàn thành rà soát kế hoạch dạy học.
2. Xây dựng ngân hàng câu hỏi dùng chung.
3. Tổ chức góp ý bài dạy minh họa.

III. HẠN CHẾ VÀ ĐỀ XUẤT
Một số minh chứng cần tiếp tục chuẩn hóa về định dạng lưu trữ.`,
  'BIÊN BẢN': `Hôm nay, vào lúc 14 giờ 00 ngày 30 tháng 7 năm 2026, tại Phòng họp chuyên môn, Tổ Tiếng Anh tiến hành họp sinh hoạt chuyên môn.

I. THÀNH PHẦN THAM DỰ
1. Đại diện Ban Giám hiệu phụ trách chuyên môn.
2. Toàn thể giáo viên Tổ Tiếng Anh.

II. NỘI DUNG CUỘC HỌP
1. Rà soát kế hoạch dạy học.
2. Góp ý bài dạy minh họa.
3. Thống nhất thời hạn nộp minh chứng.

III. KẾT LUẬN
Cuộc họp thống nhất triển khai các nhiệm vụ theo nội dung trên.`,
  'TỜ TRÌNH': `Căn cứ kế hoạch hoạt động chuyên môn, Tổ Tiếng Anh kính trình Ban Giám hiệu xem xét phê duyệt kế hoạch tổ chức sinh hoạt chuyên môn theo định hướng đổi mới phương pháp dạy học.

Nội dung đề nghị phê duyệt gồm thời gian tổ chức, thành phần tham dự, nội dung sinh hoạt, phân công nhiệm vụ và hình thức lưu trữ minh chứng.

Kính đề nghị Ban Giám hiệu xem xét, phê duyệt để tổ chuyên môn triển khai đúng tiến độ.`,
  'CÔNG VĂN': `Nhằm triển khai nhiệm vụ chuyên môn tháng 8 năm 2026, nhà trường đề nghị giáo viên thực hiện các nội dung sau:

1. Rà soát kế hoạch dạy học và cập nhật nội dung trọng tâm.
2. Hoàn thiện học liệu, ngân hàng câu hỏi và minh chứng chuyên môn.
3. Gửi sản phẩm về tổ trưởng chuyên môn đúng thời hạn.

Đề nghị các cá nhân có liên quan nghiêm túc thực hiện.`,
  'QUYẾT ĐỊNH': `Điều 1. Thành lập nhóm xây dựng học liệu môn Tiếng Anh theo danh sách phân công của tổ chuyên môn.

Điều 2. Nhóm xây dựng học liệu có nhiệm vụ rà soát nội dung dạy học, biên soạn câu hỏi, hoàn thiện tài liệu ôn tập và lưu trữ minh chứng.

Điều 3. Tổ trưởng chuyên môn, giáo viên Tổ Tiếng Anh và các cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này kể từ ngày ký.`,
  'GIẤY MỜI': `Trân trọng kính mời giáo viên Tổ Tiếng Anh đến tham dự buổi sinh hoạt chuyên môn tháng 8 năm 2026.

1. Thời gian: 14 giờ 00, ngày 05 tháng 8 năm 2026.
2. Địa điểm: Phòng họp chuyên môn.
3. Nội dung: Rà soát kế hoạch dạy học, thống nhất học liệu và góp ý bài dạy minh họa.

Đề nghị đại biểu tham dự đúng thời gian, địa điểm nêu trên.`,
  'PHIẾU': `1. Họ và tên giáo viên: ............................................................
2. Nội dung chuyên môn được phân công: ........................................
3. Sản phẩm hoặc minh chứng cần nộp: ..........................................
4. Thời hạn hoàn thành: ............................................................
5. Nhận xét của tổ chuyên môn: ...................................................`,
  'ĐƠN': `Tôi tên là: ........................................................................
Chức vụ hoặc nhiệm vụ: ..........................................................

Nay tôi làm đơn này kính đề nghị Ban Giám hiệu xem xét hỗ trợ điều chỉnh lịch sinh hoạt chuyên môn để phù hợp với kế hoạch công tác.

Tôi cam kết thực hiện đúng các nhiệm vụ được phân công và chịu trách nhiệm về nội dung trình bày trong đơn.`,
};

const ICON_PATHS = {
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z',
  description: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm1 7V3.5L20.5 9zM8 13h8v2H8zm0 4h8v2H8zm0-8h4v2H8z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  tune: 'M3 17v2h6v-2zm0-12v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zm-6-8h14v-2H7V9H5v6h2z',
  preview: 'M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 11.5A4.5 4.5 0 1 1 12 7a4.5 4.5 0 0 1 0 9.5zm0-7A2.5 2.5 0 1 0 12 14a2.5 2.5 0 0 0 0-5z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11z',
  print: 'M19 8H5a3 3 0 0 0-3 3v4h4v4h12v-4h4v-4a3 3 0 0 0-3-3zm-3 9H8v-5h8zm3-5a1 1 0 1 1 1-1 1 1 0 0 1-1 1zM18 3H6v4h12z',
  download: 'M19 9h-4V3H9v6H5l7 7zm-14 9v2h14v-2z',
  fullscreen: 'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zm-3-12v2h3v3h2V5z',
  check: 'm9 16.17-3.88-3.88L3.88 7 9 12.12 20.12 1 21.53 2.41z',
  refresh: 'M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-4.9 6H4.02A8 8 0 1 0 17.65 6.35z',
  delete: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zm3.5-9h2v8h-2zm3 0h2v8h-2zM15.5 4l-1-1h-5l-1 1H5v2h14V4z',
  save: 'M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7zm-5 16a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm3-10H5V5h10z',
  minus: 'M5 11h14v2H5z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z',
  arrow: 'M10 17l5-5-5-5v10z',
};

function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} focusable="false"><path d={ICON_PATHS[name] || ICON_PATHS.description} /></svg>;
}

function useToast() {
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);
  const show = (text) => {
    setMessage(text);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMessage(''), 2600);
  };
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  return [message, show];
}

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeXml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  downloadBlob(filename, new Blob([content], { type }));
}

function normalizeLines(value = '') {
  return String(value).replace(/\r/g, '').split('\n').map((line) => line.trimEnd());
}

function nonEmptyLines(value = '') {
  return normalizeLines(value).map((line) => line.trim()).filter(Boolean);
}

function isRomanHeading(line = '') {
  const match = String(line).trim().match(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+(.+)$/i);
  return Boolean(match && match[2] === match[2].toUpperCase());
}

function isNumberedLine(line = '') {
  return /^(\d+[.)]|[a-zđ][.)]|[-–•])\s+/i.test(String(line).trim());
}

function isArticleLine(line = '') {
  return /^Điều\s+\d+[.:]?/i.test(String(line).trim());
}

function documentNeedsRecipient(docType) {
  return ['CÔNG VĂN', 'GIẤY MỜI', 'ĐƠN', 'TỜ TRÌNH'].includes(docType);
}

function buildModel({ docType, docInfo, bodyText }) {
  return {
    docType: docType || 'KẾ HOẠCH',
    parentAgency: String(docInfo.parentAgency || '').trim(),
    issuingUnit: String(docInfo.issuingUnit || '').trim(),
    numberSymbol: String(docInfo.numberSymbol || '').trim(),
    placeDate: String(docInfo.placeDate || '').trim(),
    titleSummary: String(docInfo.titleSummary || '').trim(),
    recipient: String(docInfo.recipient || '').trim(),
    signerTitle: String(docInfo.signerTitle || '').trim(),
    signerName: String(docInfo.signerName || '').trim(),
    recipients: nonEmptyLines(docInfo.recipients || ''),
    bodyLines: normalizeLines(bodyText || '').filter((line, index, array) => line.trim() || (index > 0 && array[index - 1].trim())),
  };
}

function serializeModel(model) {
  const body = model.bodyLines.join('\n').trim();
  const recipient = documentNeedsRecipient(model.docType) && model.recipient ? `Kính gửi: ${model.recipient}\n\n` : '';
  return `${model.parentAgency}\n${model.issuingUnit}\nSố: ${model.numberSymbol}\n\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n________________________\n\n${model.placeDate}\n\n${model.docType}\n${model.titleSummary}\n________________________\n\n${recipient}${body}\n\nNơi nhận:\n${model.recipients.join('\n')}\n\n${model.signerTitle}\n(Ký, ghi rõ họ tên)\n\n\n${model.signerName}`;
}

function parseAdministrativeSource(text, fallbackInfo, fallbackType) {
  const lines = nonEmptyLines(text);
  const nationalIndex = lines.findIndex((line) => /CỘNG\s+H[ÒO]A\s+X[ÃA]\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(line));
  const typeIndex = lines.findIndex((line, index) => index > Math.max(nationalIndex, -1) && DOC_TYPES.includes(line.toUpperCase()));
  if (nationalIndex < 1 || typeIndex < 0) {
    return { docType: fallbackType, docInfo: fallbackInfo, bodyText: String(text || '').trim() };
  }
  const left = lines.slice(0, nationalIndex);
  const numberIndex = left.findIndex((line) => /^Số\s*:/i.test(line));
  const right = lines.slice(nationalIndex + 1, typeIndex).filter((line) => !/^_+$/.test(line));
  const dateLine = [...right].reverse().find((line) => /ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/i.test(line));
  const titleSummary = lines[typeIndex + 1] || fallbackInfo.titleSummary;
  const remaining = lines.slice(typeIndex + 2).filter((line) => !/^_+$/.test(line));
  const recipientsIndex = remaining.findIndex((line) => /^Nơi\s+nhận/i.test(line));
  const footer = recipientsIndex >= 0 ? remaining.slice(recipientsIndex + 1) : [];
  const signatureIndex = footer.findIndex((line) => /^(TM\.|KT\.|Q\.|HIỆU TRƯỞNG|PHÓ HIỆU TRƯỞNG|TỔ TRƯỞNG|THỦ TRƯỞNG|NGƯỜI KÝ|NGƯỜI LÀM ĐƠN)/i.test(line));
  const bodyLines = recipientsIndex >= 0 ? remaining.slice(0, recipientsIndex) : remaining;
  let recipient = fallbackInfo.recipient;
  if (/^Kính\s+gửi\s*:/i.test(bodyLines[0] || '')) recipient = bodyLines.shift().replace(/^Kính\s+gửi\s*:\s*/i, '').trim();
  return {
    docType: lines[typeIndex].toUpperCase(),
    docInfo: {
      ...fallbackInfo,
      parentAgency: left[0] || fallbackInfo.parentAgency,
      issuingUnit: left.slice(1, numberIndex >= 0 ? numberIndex : undefined).join(' ') || fallbackInfo.issuingUnit,
      numberSymbol: numberIndex >= 0 ? left[numberIndex].replace(/^Số\s*:\s*/i, '') : fallbackInfo.numberSymbol,
      placeDate: dateLine || fallbackInfo.placeDate,
      titleSummary,
      recipient,
      recipients: (signatureIndex >= 0 ? footer.slice(0, signatureIndex) : footer.slice(0, 4)).join('\n') || fallbackInfo.recipients,
      signerTitle: signatureIndex >= 0 ? footer[signatureIndex] : fallbackInfo.signerTitle,
      signerName: footer.length ? footer[footer.length - 1] : fallbackInfo.signerName,
    },
    bodyText: bodyLines.join('\n'),
  };
}

function bodyLineToHtml(line) {
  const value = String(line || '').trim();
  if (!value) return '<div class="doc-spacer"></div>';
  if (isRomanHeading(value)) return `<p class="section-heading">${escapeHtml(value)}</p>`;
  if (isArticleLine(value)) {
    const match = value.match(/^(Điều\s+\d+[.:]?)(.*)$/i);
    return `<p class="article-line"><strong>${escapeHtml(match?.[1] || value)}</strong>${escapeHtml(match?.[2] || '')}</p>`;
  }
  if (isNumberedLine(value)) return `<p class="list-line">${escapeHtml(value)}</p>`;
  return `<p>${escapeHtml(value)}</p>`;
}

function modelToAdministrativeHtml(model, title = 'Văn bản hành chính') {
  const bodyHtml = model.bodyLines.map(bodyLineToHtml).join('');
  const recipientHtml = documentNeedsRecipient(model.docType) && model.recipient ? `<p class="recipient"><strong>Kính gửi:</strong> ${escapeHtml(model.recipient)}</p>` : '';
  const recipientsHtml = model.recipients.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4 portrait;margin:20mm 15mm 20mm 30mm}*{box-sizing:border-box}html,body{margin:0;background:#e9eef6;color:#000}body,body *{font-family:"Times New Roman",Times,serif}.page{width:210mm;min-height:297mm;margin:0 auto;padding:20mm 15mm 20mm 30mm;background:#fff;color:#000;font-size:13pt;line-height:1.15}.admin-head{display:grid;grid-template-columns:1fr 1fr;gap:9mm;align-items:start}.admin-head p{margin:0;text-align:center;line-height:1.15}.agency,.national{font-size:13pt;text-transform:uppercase}.agency strong,.national strong,.motto strong{font-weight:700}.issuing{font-size:13pt;font-weight:700;text-transform:uppercase}.short-rule{width:44%;height:1px;margin:3pt auto 5pt;background:#000}.number{font-size:13pt}.motto{font-size:14pt}.date{margin-top:7pt!important;font-size:13pt;font-style:italic}.doc-title{margin:15pt 0 2pt;text-align:center;font-size:14pt;font-weight:700;text-transform:uppercase}.doc-summary{margin:0;text-align:center;font-size:14pt;font-weight:700}.summary-rule{width:38%;height:1px;margin:5pt auto 11pt;background:#000}.recipient{margin:0 0 8pt;text-align:left}.doc-body p{margin:0 0 6pt;text-align:justify;text-indent:10mm}.doc-body .section-heading{margin-top:8pt;text-indent:0;font-weight:700;text-transform:uppercase}.doc-body .list-line,.doc-body .article-line{padding-left:0;text-indent:0}.doc-body .article-line{margin-top:6pt}.doc-spacer{height:3pt}.doc-footer{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-top:15pt;break-inside:avoid}.doc-footer p{margin:0 0 3pt}.recipients{font-size:11pt}.recipients .label{font-weight:700;font-style:italic}.signature{text-align:center;font-size:13pt}.signature .title{font-weight:700;text-transform:uppercase}.signature .instruction{margin-top:3pt;font-style:italic}.signature .space{height:28mm}.signature .name{font-weight:700;text-transform:uppercase}@media print{html,body{background:#fff}.page{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none}}
  </style></head><body><main class="page"><div class="admin-head"><div><p class="agency">${escapeHtml(model.parentAgency)}</p><p class="issuing">${escapeHtml(model.issuingUnit)}</p><div class="short-rule"></div><p class="number">Số: ${escapeHtml(model.numberSymbol)}</p></div><div><p class="national"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p><p class="motto"><strong>Độc lập - Tự do - Hạnh phúc</strong></p><div class="short-rule"></div><p class="date">${escapeHtml(model.placeDate)}</p></div></div><p class="doc-title">${escapeHtml(model.docType)}</p><p class="doc-summary">${escapeHtml(model.titleSummary)}</p><div class="summary-rule"></div>${recipientHtml}<div class="doc-body">${bodyHtml}</div><div class="doc-footer"><div class="recipients"><p class="label">Nơi nhận:</p>${recipientsHtml}</div><div class="signature"><p class="title">${escapeHtml(model.signerTitle)}</p><p class="instruction">(Ký, ghi rõ họ tên)</p><div class="space"></div><p class="name">${escapeHtml(model.signerName)}</p></div></div></main></body></html>`;
}

function wRun(text, { bold = false, italic = false, size = 26 } = {}) {
  const props = `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>${bold ? '<w:b/><w:bCs/>' : ''}${italic ? '<w:i/><w:iCs/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  return `<w:r>${props}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function wParagraph(runs, { align = 'left', before = 0, after = 0, line = 276, firstLine = 0, left = 0, keepNext = false, borderBottom = false } = {}) {
  const runXml = Array.isArray(runs) ? runs.join('') : wRun(String(runs ?? ''));
  const indent = firstLine || left ? `<w:ind${firstLine ? ` w:firstLine="${firstLine}"` : ''}${left ? ` w:left="${left}"` : ''}/>` : '';
  const border = borderBottom ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="000000"/></w:pBdr>' : '';
  return `<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>${indent}${keepNext ? '<w:keepNext/>' : ''}${border}</w:pPr>${runXml}</w:p>`;
}

function wEmptyParagraph(height = 0) {
  return `<w:p><w:pPr><w:spacing w:after="${height}"/></w:pPr></w:p>`;
}

function wCell(content, width) {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="top"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>${content}</w:tc>`;
}

function wTable(leftContent, rightContent, widths = [4677, 4678]) {
  return `<w:tbl><w:tblPr><w:tblW w:w="9355" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="${widths[0]}"/><w:gridCol w:w="${widths[1]}"/></w:tblGrid><w:tr>${wCell(leftContent, widths[0])}${wCell(rightContent, widths[1])}</w:tr></w:tbl>`;
}

function bodyLineToWordXml(line) {
  const value = String(line || '').trim();
  if (!value) return wEmptyParagraph(40);
  if (isRomanHeading(value)) return wParagraph(wRun(value, { bold: true, size: 26 }), { before: 120, after: 80, keepNext: true });
  if (isArticleLine(value)) {
    const match = value.match(/^(Điều\s+\d+[.:]?)(.*)$/i);
    return wParagraph([wRun(match?.[1] || value, { bold: true, size: 26 }), wRun(match?.[2] || '', { size: 26 })], { align: 'both', before: 80, after: 120 });
  }
  if (isNumberedLine(value)) return wParagraph(wRun(value, { size: 26 }), { align: 'both', after: 120 });
  return wParagraph(wRun(value, { size: 26 }), { align: 'both', after: 120, firstLine: 567 });
}

function buildDocxDocumentXml(model) {
  const leftHeader = [wParagraph(wRun(model.parentAgency, { size: 26 }), { align: 'center', line: 240 }), wParagraph(wRun(model.issuingUnit, { bold: true, size: 26 }), { align: 'center', line: 240 }), wParagraph(wRun('________________', { size: 26 }), { align: 'center', after: 40, line: 240 }), wParagraph(wRun(`Số: ${model.numberSymbol}`, { size: 26 }), { align: 'center', line: 240 })].join('');
  const rightHeader = [wParagraph(wRun('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { bold: true, size: 26 }), { align: 'center', line: 240 }), wParagraph(wRun('Độc lập - Tự do - Hạnh phúc', { bold: true, size: 28 }), { align: 'center', line: 240 }), wParagraph(wRun('________________', { size: 26 }), { align: 'center', after: 40, line: 240 }), wParagraph(wRun(model.placeDate, { italic: true, size: 26 }), { align: 'center', line: 240 })].join('');
  const recipient = documentNeedsRecipient(model.docType) && model.recipient ? wParagraph([wRun('Kính gửi: ', { bold: true, size: 26 }), wRun(model.recipient, { size: 26 })], { after: 120 }) : '';
  const body = model.bodyLines.map(bodyLineToWordXml).join('');
  const recipients = [wParagraph(wRun('Nơi nhận:', { bold: true, italic: true, size: 22 }), { after: 40 }), ...model.recipients.map((line) => wParagraph(wRun(line, { size: 22 }), { after: 20, line: 240 }))].join('');
  const signature = [wParagraph(wRun(model.signerTitle, { bold: true, size: 26 }), { align: 'center', after: 20, keepNext: true }), wParagraph(wRun('(Ký, ghi rõ họ tên)', { italic: true, size: 26 }), { align: 'center', keepNext: true }), wEmptyParagraph(840), wParagraph(wRun(model.signerName, { bold: true, size: 26 }), { align: 'center' })].join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${wTable(leftHeader, rightHeader)}${wParagraph(wRun(model.docType, { bold: true, size: 28 }), { align: 'center', before: 220, after: 40, keepNext: true })}${wParagraph(wRun(model.titleSummary, { bold: true, size: 28 }), { align: 'center', after: 20, keepNext: true })}${wParagraph(wRun('________________', { size: 26 }), { align: 'center', after: 180, line: 240 })}${recipient}${body}${wTable(recipients, signature, [4400, 4955])}<w:sectPr><w:headerReference w:type="default" r:id="rId1"/><w:titlePg/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr></w:body></w:document>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN" w:eastAsia="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style></w:styles>`;
}

function buildHeaderXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:hdr>`;
}

async function buildAdministrativeDocx(model, title) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  const word = zip.folder('word');
  word.file('document.xml', buildDocxDocumentXml(model));
  word.file('styles.xml', buildStylesXml());
  word.file('settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:updateFields w:val="true"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`);
  word.file('header1.xml', buildHeaderXml());
  word.folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>`);
  const now = new Date().toISOString();
  const props = zip.folder('docProps');
  props.file('core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>TextCare</dc:creator><cp:lastModifiedBy>TextCare</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
  props.file('app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>TextCare</Application><AppVersion>1.0</AppVersion></Properties>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

async function readUploadedFile(file) {
  const lower = String(file.name || '').toLowerCase();
  const buffer = await file.arrayBuffer();
  if (lower.endsWith('.docx')) {
    const mammoth = await loadMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  }
  if (lower.endsWith('.pdf')) {
    const pdfjs = await loadPdfjs();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const pages = [];
    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' '));
    }
    return pages.join('\n\n');
  }
  return file.text();
}

function detectAdministrativeDocument(model) {
  const fields = [['agency', 'Cơ quan chủ quản', Boolean(model.parentAgency)], ['unit', 'Đơn vị ban hành', Boolean(model.issuingUnit)], ['number', 'Số/ký hiệu', Boolean(model.numberSymbol)], ['date', 'Địa danh/ngày tháng', Boolean(model.placeDate)], ['type', 'Tên loại', Boolean(model.docType)], ['summary', 'Trích yếu', Boolean(model.titleSummary)], ['content', 'Nội dung', model.bodyLines.join('').trim().length > 20], ['signature', 'Người ký', Boolean(model.signerTitle && model.signerName)], ['recipients', 'Nơi nhận', model.recipients.length > 0]].map(([id, label, ok]) => ({ id, label, ok }));
  const text = serializeModel(model);
  return { fields, score: Math.round((fields.filter((field) => field.ok).length / fields.length) * 100), missing: fields.filter((field) => !field.ok).map((field) => field.label), wordCount: text.split(/\s+/).filter(Boolean).length, charCount: text.length };
}

function loadDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function printHtmlDocument(html, onError) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '1px', height: '1px', opacity: '0', border: '0', pointerEvents: 'none' });
  const cleanup = () => window.setTimeout(() => frame.remove(), 500);
  frame.onload = () => {
    try {
      const printWindow = frame.contentWindow;
      if (!printWindow) throw new Error('Không truy cập được cửa sổ in.');
      printWindow.addEventListener('afterprint', cleanup, { once: true });
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 120);
      window.setTimeout(cleanup, 10000);
    } catch (error) {
      cleanup();
      onError(error);
    }
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

export default function TextCareGoogleStudio({ tool, language }) {
  const saved = useMemo(loadDraft, []);
  const [rawText, setRawText] = useState(saved?.rawText || '');
  const [docType, setDocType] = useState(saved?.docType || 'KẾ HOẠCH');
  const [docInfo, setDocInfo] = useState(() => ({ ...SAMPLE_DOC_INFO, ...(saved?.docInfo || {}) }));
  const [contentText, setContentText] = useState(saved?.contentText || '');
  const [sourceName, setSourceName] = useState(saved?.sourceName || '');
  const [activeStep, setActiveStep] = useState(saved?.activeStep || 'source');
  const [loadingFile, setLoadingFile] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [previewAccepted, setPreviewAccepted] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(78);
  const [frameHeight, setFrameHeight] = useState(1123);
  const [pageCount, setPageCount] = useState(1);
  const [lastSavedAt, setLastSavedAt] = useState(saved?.savedAt || '');
  const [toast, showToast] = useToast();
  const fileInputRef = useRef(null);
  const previewCardRef = useRef(null);
  const previewFrameRef = useRef(null);

  const toolTitle = language === 'en' ? (tool?.title || 'TextCare') : (tool?.titleVi || tool?.title || 'TextCare');
  const effectiveBody = contentText || rawText || SAMPLE_BODY_BY_TYPE[docType] || SAMPLE_BODY_BY_TYPE['KẾ HOẠCH'];
  const model = useMemo(() => buildModel({ docType, docInfo, bodyText: effectiveBody }), [docType, docInfo, effectiveBody]);
  const detected = useMemo(() => detectAdministrativeDocument(model), [model]);
  const previewHtml = useMemo(() => modelToAdministrativeHtml(model, toolTitle), [model, toolTitle]);
  const serializedText = useMemo(() => serializeModel(model), [model]);
  const downloadName = librarySlugify(`${docType}-${docInfo.titleSummary || 'van-ban-hanh-chinh'}`);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rawText, docType, docInfo, contentText, sourceName, activeStep, savedAt }));
        setLastSavedAt(savedAt);
      } catch {
        // Browser storage may be unavailable in private mode.
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [rawText, docType, docInfo, contentText, sourceName, activeStep]);

  const setInfo = (key, value) => {
    setDocInfo((current) => ({ ...current, [key]: value }));
    setPreviewAccepted(false);
  };

  const chooseDocType = (type) => {
    setDocType(type);
    setDocInfo((current) => {
      const prefix = String(current.numberSymbol || '').split('/')[0] || '01';
      const suffix = String(current.numberSymbol || '').split('-').slice(1).join('-') || 'THPTBE';
      return { ...current, numberSymbol: `${prefix}/${TYPE_ABBREVIATIONS[type] || 'VB'}-${suffix}` };
    });
    if (!rawText.trim() && !contentText.trim()) setContentText(SAMPLE_BODY_BY_TYPE[type] || '');
    setPreviewAccepted(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    setError('');
    setLoadingFile(true);
    setSourceName(file.name || 'document');
    try {
      const text = await readUploadedFile(file);
      setRawText(text);
      setContentText('');
      setPreviewAccepted(false);
      showToast(`Đã đọc ${file.name}.`);
    } catch (fileError) {
      setError(`Không đọc được file: ${fileError.message || fileError}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleFileInput = async (event) => {
    await processFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const recognizeSource = () => {
    const parsed = parseAdministrativeSource(rawText || effectiveBody, docInfo, docType);
    setDocType(parsed.docType);
    setDocInfo(parsed.docInfo);
    setContentText(parsed.bodyText || SAMPLE_BODY_BY_TYPE[parsed.docType] || '');
    setActiveStep('format');
    setPreviewAccepted(false);
    showToast('Đã nhận diện và điền các trường khai báo.');
  };

  const resetAll = () => {
    setRawText('');
    setContentText('');
    setSourceName('');
    setDocType('KẾ HOẠCH');
    setDocInfo({ ...SAMPLE_DOC_INFO });
    setActiveStep('source');
    setPreviewAccepted(false);
    setError('');
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* optional */ }
    showToast('Đã tạo văn bản mới.');
  };

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(serializedText);
      showToast('Đã sao chép văn bản.');
    } catch {
      setError('Trình duyệt không cho phép sao chép tự động.');
    }
  };

  const printPreview = () => {
    setError('');
    printHtmlDocument(previewHtml, (printError) => setError(`Không thể in: ${printError.message || printError}`));
  };

  const exportDocx = async () => {
    setError('');
    setExportingDocx(true);
    try {
      const blob = await buildAdministrativeDocx(model, docInfo.titleSummary || toolTitle);
      downloadBlob(`${downloadName}-nghi-dinh-30.docx`, blob);
      showToast('Đã xuất DOCX chuẩn A4 theo Nghị định 30.');
    } catch (docxError) {
      setError(`Không thể xuất DOCX: ${docxError.message || docxError}`);
    } finally {
      setExportingDocx(false);
    }
  };

  const fullscreenPreview = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await previewCardRef.current?.requestFullscreen?.();
    } catch {
      setError('Không thể mở preview toàn màn hình.');
    }
  };

  const handlePreviewLoad = () => {
    try {
      const doc = previewFrameRef.current?.contentDocument;
      const height = Math.max(1123, doc?.documentElement?.scrollHeight || doc?.body?.scrollHeight || 1123);
      setFrameHeight(height);
      setPageCount(Math.max(1, Math.ceil(height / 1123)));
    } catch {
      setFrameHeight(1123);
      setPageCount(1);
    }
  };

  const zoomBy = (delta) => setPreviewZoom((current) => Math.min(120, Math.max(55, current + delta)));
  const savedLabel = lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'chưa lưu';
  const steps = [{ id: 'source', label: 'Nguồn' }, { id: 'format', label: 'Khai báo' }, { id: 'content', label: 'Nội dung' }];

  return (
    <div className="page textcare-google-page">
      <header className="tcg-topbar">
        <button className="tcg-icon-button" onClick={() => window.history.back()} aria-label="Quay lại"><Icon name="back" /></button>
        <div className="tcg-brand-mark"><Icon name="description" size={21} /></div>
        <div className="tcg-title-block"><strong>TextCare</strong><span>Văn bản hành chính · Nghị định 30/2020/NĐ-CP</span></div>
        <div className="tcg-status-summary"><span>{detected.score}% đầy đủ</span><span>{docType}</span><span>{pageCount} trang A4</span></div>
        <div className="tcg-autosave"><Icon name="save" size={17} /> Tự lưu {savedLabel}</div>
        <button className="tcg-text-button" onClick={resetAll}><Icon name="refresh" size={18} /> Bản mới</button>
      </header>

      <main className="tcg-workbench">
        <section className="tcg-editor-card">
          <nav className="tcg-stepper" aria-label="Quy trình chuẩn hoá">
            {steps.map((step, index) => <button key={step.id} className={activeStep === step.id ? 'active' : ''} onClick={() => setActiveStep(step.id)}><b>{index + 1}</b><span>{step.label}</span></button>)}
          </nav>

          <div className="tcg-editor-scroll">
            {activeStep === 'source' && (
              <div className="tcg-panel tcg-source-panel">
                <div className="tcg-panel-heading"><div><span>BƯỚC 1</span><h2>Thêm nội dung nguồn</h2><p>Tải văn bản hoặc dán nội dung cần chuẩn hoá.</p></div><small>DOCX · PDF · TXT</small></div>
                <div className={`tcg-dropzone ${dragging ? 'dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); processFile(event.dataTransfer.files?.[0]); }}>
                  <input ref={fileInputRef} type="file" hidden accept=".txt,.md,.csv,.html,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileInput} />
                  <div className="tcg-upload-icon"><Icon name="upload" size={23} /></div>
                  <div><strong>{loadingFile ? 'Đang đọc nội dung…' : 'Thả file vào đây'}</strong><span>hoặc chọn file từ máy</span></div>
                  <button className="tcg-outlined-button" onClick={() => fileInputRef.current?.click()} disabled={loadingFile}>Chọn file</button>
                </div>
                {sourceName && <div className="tcg-file-chip"><Icon name="description" size={18} /><span>{sourceName}</span><button onClick={() => { setSourceName(''); setRawText(''); setContentText(''); }} aria-label="Xoá file"><Icon name="delete" size={17} /></button></div>}
                <label className="tcg-source-editor"><span><Icon name="description" size={18} /> Nội dung nguồn <small>Văn bản thuần · tự lưu</small></span><textarea value={rawText} onChange={(event) => { setRawText(event.target.value); setContentText(''); setPreviewAccepted(false); }} placeholder="Dán nội dung cần chuẩn hoá tại đây…" /><footer><span>{rawText.split(/\s+/).filter(Boolean).length.toLocaleString('vi-VN')} từ</span><span>{rawText.length.toLocaleString('vi-VN')} ký tự</span></footer></label>
                <div className="tcg-action-row tcg-action-row-end"><button className="tcg-filled-button" onClick={recognizeSource}><Icon name="arrow" size={18} /> Nhận diện và tiếp tục</button></div>
              </div>
            )}

            {activeStep === 'format' && (
              <div className="tcg-panel">
                <div className="tcg-panel-heading"><div><span>BƯỚC 2</span><h2>Khai báo thể thức</h2><p>Các trường này được dùng đồng nhất cho preview, in và DOCX.</p></div><small>A4 · Times New Roman</small></div>
                <div className="tcg-type-chips">{DOC_TYPES.map((type) => <button key={type} className={docType === type ? 'active' : ''} onClick={() => chooseDocType(type)}>{type}</button>)}</div>
                <div className="tcg-form-grid">
                  <label className="tcg-field"><span>Cơ quan chủ quản</span><input value={docInfo.parentAgency} onChange={(event) => setInfo('parentAgency', event.target.value)} /></label>
                  <label className="tcg-field"><span>Đơn vị ban hành</span><input value={docInfo.issuingUnit} onChange={(event) => setInfo('issuingUnit', event.target.value)} /></label>
                  <label className="tcg-field"><span>Số / ký hiệu</span><input value={docInfo.numberSymbol} onChange={(event) => setInfo('numberSymbol', event.target.value)} /></label>
                  <label className="tcg-field"><span>Địa danh, ngày tháng</span><input value={docInfo.placeDate} onChange={(event) => setInfo('placeDate', event.target.value)} /></label>
                  <label className="tcg-field wide"><span>Trích yếu nội dung</span><input value={docInfo.titleSummary} onChange={(event) => setInfo('titleSummary', event.target.value)} /></label>
                  {documentNeedsRecipient(docType) && <label className="tcg-field wide"><span>Kính gửi / đối tượng nhận</span><input value={docInfo.recipient} onChange={(event) => setInfo('recipient', event.target.value)} /></label>}
                  <label className="tcg-field"><span>Chức vụ người ký</span><input value={docInfo.signerTitle} onChange={(event) => setInfo('signerTitle', event.target.value)} /></label>
                  <label className="tcg-field"><span>Họ tên người ký</span><input value={docInfo.signerName} onChange={(event) => setInfo('signerName', event.target.value)} /></label>
                  <label className="tcg-field wide"><span>Nơi nhận</span><textarea rows={4} value={docInfo.recipients} onChange={(event) => setInfo('recipients', event.target.value)} /></label>
                </div>
                <div className="tcg-validation-card"><strong>{detected.score}%</strong><div><h3>Kiểm tra thành phần</h3><p>{detected.missing.length ? `Còn thiếu: ${detected.missing.join(', ')}.` : 'Đã đủ các thành phần chính để xuất bản.'}</p></div><div className="tcg-check-grid">{detected.fields.map((field) => <span key={field.id} className={field.ok ? 'ok' : ''}>{field.ok ? '✓' : '!'} {field.label}</span>)}</div></div>
                <div className="tcg-action-row tcg-action-row-end"><button className="tcg-filled-button" onClick={() => setActiveStep('content')}>Tiếp tục nội dung <Icon name="arrow" size={18} /></button></div>
              </div>
            )}

            {activeStep === 'content' && (
              <div className="tcg-panel tcg-content-panel">
                <div className="tcg-panel-heading"><div><span>BƯỚC 3</span><h2>Nội dung văn bản</h2><p>Chỉnh phần nội dung; preview bên phải cập nhật tức thời.</p></div><small>13 pt · giãn dòng 1,15</small></div>
                <label className="tcg-content-editor"><textarea value={contentText || effectiveBody} onChange={(event) => { setContentText(event.target.value); setPreviewAccepted(false); }} /><footer><span>Thụt đầu dòng 1 cm</span><span>Khoảng cách đoạn 6 pt</span></footer></label>
                <div className="tcg-action-row"><button className="tcg-outlined-button" onClick={() => setContentText(SAMPLE_BODY_BY_TYPE[docType] || '')}><Icon name="refresh" size={17} /> Nạp nội dung mẫu</button><button className="tcg-text-button" onClick={() => setContentText('')}><Icon name="delete" size={17} /> Xoá nội dung</button></div>
              </div>
            )}
          </div>

          {error && <div className="tcg-error" role="alert"><strong>Không thể hoàn tất thao tác</strong><span>{error}</span><button onClick={() => setError('')}>Đóng</button></div>}
        </section>

        <aside ref={previewCardRef} className="tcg-preview-card">
          <div className="tcg-preview-head"><div><span>PREVIEW A4</span><h2>{docType}</h2></div><div className={`tcg-review-state ${previewAccepted ? 'accepted' : ''}`}><Icon name={previewAccepted ? 'check' : 'preview'} size={17} />{previewAccepted ? 'Đã duyệt' : 'Bản nháp'}</div></div>
          <div className="tcg-preview-toolbar"><div className="tcg-zoom-control"><button onClick={() => zoomBy(-5)} aria-label="Thu nhỏ"><Icon name="minus" size={17} /></button><button onClick={() => setPreviewZoom(78)}>{previewZoom}%</button><button onClick={() => zoomBy(5)} aria-label="Phóng to"><Icon name="plus" size={17} /></button></div><span>Trang 1 / {pageCount}</span><div className="tcg-toolbar-actions"><button onClick={copyPreview} title="Sao chép"><Icon name="copy" size={18} /></button><button onClick={printPreview} title="In văn bản"><Icon name="print" size={18} /></button><button onClick={fullscreenPreview} title="Toàn màn hình"><Icon name="fullscreen" size={18} /></button></div></div>
          <div className="tcg-a4-viewport"><div className="tcg-a4-stage" style={{ height: `${Math.ceil(frameHeight * previewZoom / 100) + 24}px` }}><iframe ref={previewFrameRef} title="Preview văn bản hành chính" srcDoc={previewHtml} sandbox="allow-same-origin" onLoad={handlePreviewLoad} style={{ height: `${frameHeight}px`, transform: `scale(${previewZoom / 100})` }} /></div></div>
          <div className="tcg-export-panel"><button className="tcg-filled-button" onClick={() => { setPreviewAccepted(true); showToast('Đã duyệt preview.'); }}><Icon name="check" size={18} /> Duyệt preview</button><div className="tcg-export-menu"><button onClick={exportDocx} disabled={exportingDocx}><Icon name="download" size={18} /><span><b>{exportingDocx ? 'Đang tạo…' : 'Word'}</b><small>.docx chuẩn</small></span></button><button onClick={printPreview}><Icon name="print" size={18} /><span><b>In</b><small>A4 trực tiếp</small></span></button><button onClick={() => downloadText(`${downloadName}-preview.html`, previewHtml, 'text/html;charset=utf-8')}><Icon name="download" size={18} /><span><b>HTML</b><small>.html</small></span></button><button onClick={() => downloadText(`${downloadName}.txt`, serializedText)}><Icon name="download" size={18} /><span><b>Văn bản</b><small>.txt</small></span></button></div></div>
        </aside>
      </main>

      {toast && <div className="tcg-toast" role="status"><Icon name="check" size={18} />{toast}</div>}
    </div>
  );
}
