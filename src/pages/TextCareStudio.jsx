import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateGenericToolOutput } from '../utils/gemini.js';
import { addHistoryEntry, slugify as librarySlugify } from '../utils/library.js';
import { loadMammoth, loadPdfjs } from '../utils/documentParsers.js';
import '../styles/TextCareGoogle.css';

const STORAGE_KEY = 'bes-textcare-google-draft-v1';
const DOC_TYPES = ['THÔNG BÁO', 'KẾ HOẠCH', 'BÁO CÁO', 'BIÊN BẢN', 'TỜ TRÌNH', 'CÔNG VĂN', 'QUYẾT ĐỊNH', 'GIẤY MỜI', 'PHIẾU', 'ĐƠN'];

const DOC_TYPE_PROMPTS = {
  'THÔNG BÁO': 'Tạo hoặc chỉnh thông báo hành chính ngắn gọn, nêu rõ đối tượng nhận, thời gian, địa điểm, nội dung và nơi nhận.',
  'KẾ HOẠCH': 'Tạo hoặc chỉnh kế hoạch hành chính, chia rõ căn cứ, mục đích, yêu cầu, nội dung, thời gian, phân công và tổ chức thực hiện.',
  'BÁO CÁO': 'Tạo hoặc chỉnh báo cáo hành chính, gồm tình hình chung, kết quả, hạn chế, nguyên nhân và đề xuất.',
  'BIÊN BẢN': 'Tạo hoặc chỉnh biên bản, nêu thời gian, địa điểm, thành phần, diễn biến, kết luận và chữ ký.',
  'TỜ TRÌNH': 'Tạo hoặc chỉnh tờ trình, nêu căn cứ, lý do, nội dung đề nghị và kiến nghị cấp có thẩm quyền xem xét.',
  'CÔNG VĂN': 'Tạo hoặc chỉnh công văn hành chính, có phần V/v và nội dung chỉ đạo, trao đổi hoặc đề nghị rõ ràng.',
  'QUYẾT ĐỊNH': 'Tạo hoặc chỉnh quyết định, có căn cứ ban hành, điều khoản, trách nhiệm thi hành, hiệu lực và chữ ký.',
  'GIẤY MỜI': 'Tạo hoặc chỉnh giấy mời, nêu rõ người được mời, thời gian, địa điểm, nội dung, yêu cầu chuẩn bị và liên hệ.',
  'PHIẾU': 'Tạo hoặc chỉnh phiếu hành chính với các mục thông tin rõ ràng, dễ điền và đúng chính tả.',
  'ĐƠN': 'Tạo hoặc chỉnh đơn theo thể thức hành chính phù hợp, gồm kính gửi, thông tin người làm đơn, đề nghị, cam kết và chữ ký.',
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
  'CÔNG VĂN': `Kính gửi: Giáo viên Tổ Tiếng Anh

Nhằm triển khai nhiệm vụ chuyên môn tháng 8 năm 2026, nhà trường đề nghị giáo viên thực hiện các nội dung sau:

1. Rà soát kế hoạch dạy học và cập nhật nội dung trọng tâm.
2. Hoàn thiện học liệu, ngân hàng câu hỏi và minh chứng chuyên môn.
3. Gửi sản phẩm về tổ trưởng chuyên môn đúng thời hạn.

Đề nghị các cá nhân có liên quan nghiêm túc thực hiện.`,
  'QUYẾT ĐỊNH': `Điều 1. Thành lập nhóm xây dựng học liệu môn Tiếng Anh theo danh sách phân công của tổ chuyên môn.

Điều 2. Nhóm xây dựng học liệu có nhiệm vụ rà soát nội dung dạy học, biên soạn câu hỏi, hoàn thiện tài liệu ôn tập và lưu trữ minh chứng.

Điều 3. Tổ trưởng chuyên môn, giáo viên Tổ Tiếng Anh và các cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này kể từ ngày ký.`,
  'GIẤY MỜI': `Trân trọng kính mời: Giáo viên Tổ Tiếng Anh

Đến tham dự buổi sinh hoạt chuyên môn tháng 8 năm 2026.

1. Thời gian: 14 giờ 00, ngày 05 tháng 8 năm 2026.
2. Địa điểm: Phòng họp chuyên môn.
3. Nội dung: Rà soát kế hoạch dạy học, thống nhất học liệu và góp ý bài dạy minh họa.

Đề nghị đại biểu tham dự đúng thời gian, địa điểm nêu trên.`,
  'PHIẾU': `1. Họ và tên giáo viên: ............................................................
2. Nội dung chuyên môn được phân công: ........................................
3. Sản phẩm hoặc minh chứng cần nộp: ..........................................
4. Thời hạn hoàn thành: ............................................................
5. Nhận xét của tổ chuyên môn: ...................................................`,
  'ĐƠN': `Kính gửi: Ban Giám hiệu Trường THPT Brian English

Tôi tên là: ........................................................................
Chức vụ hoặc nhiệm vụ: ..........................................................

Nay tôi làm đơn này kính đề nghị Ban Giám hiệu xem xét hỗ trợ điều chỉnh lịch sinh hoạt chuyên môn để phù hợp với kế hoạch công tác.

Tôi cam kết thực hiện đúng các nhiệm vụ được phân công và chịu trách nhiệm về nội dung trình bày trong đơn.`,
};

const ADMIN_RULES = `Chuẩn hoá văn bản hành chính Việt Nam theo Nghị định số 30/2020/NĐ-CP về công tác văn thư, đặc biệt Phụ lục I về thể thức và kỹ thuật trình bày văn bản hành chính.

YÊU CẦU BẮT BUỘC:
1. Không bịa thông tin hành chính chưa có. Nếu thiếu cơ quan, số/ký hiệu, địa danh, ngày tháng, chức vụ hoặc người ký, để dạng [CẦN BỔ SUNG: ...].
2. Bảo toàn ý chính từ nội dung nguồn; chỉ chỉnh sửa, bổ sung phần thể thức hoặc hành chính khi có căn cứ.
3. Dùng văn phong hành chính chuẩn, ngắn gọn, đúng chính tả, rõ trách nhiệm, thời gian, đối tượng và nội dung thực hiện.
4. Trình bày theo thứ tự: cơ quan ban hành, quốc hiệu/tiêu ngữ, số/ký hiệu, địa danh/ngày tháng, tên loại/trích yếu, nội dung, chức vụ/họ tên người ký, nơi nhận.
5. Không đưa lời xin lỗi, không nói rằng bạn là AI. Trả về duy nhất văn bản đã chuẩn hoá, không dùng bảng markdown.`;

const ICON_PATHS = {
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z',
  description: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm1 7V3.5L20.5 9zM8 13h8v2H8zm0 4h8v2H8zm0-8h4v2H8z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  sparkle: 'm19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zM11.5 9.5 9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12z',
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
};

function Icon({ name, size = 20 }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} focusable="false">
      <path d={ICON_PATHS[name] || ICON_PATHS.description} />
    </svg>
  );
}

function useToast() {
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);
  const show = (text) => {
    setMessage(text);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMessage(''), 2800);
  };
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  return [message, show];
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function isRomanHeading(line = '') {
  const value = String(line).trim();
  const match = value.match(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+(.+)$/i);
  return Boolean(match && match[2] === match[2].toUpperCase());
}

function textBlockToHtml(line) {
  const value = String(line || '').trim();
  if (!value) return '';
  if (isRomanHeading(value)) return `<p class="section-heading">${escapeHtml(value)}</p>`;
  const articleMatch = value.match(/^(Điều\s+\d+[.:]?)(\s+.*)?$/i);
  if (articleMatch) return `<p class="article-line"><strong>${escapeHtml(articleMatch[1])}</strong>${escapeHtml(articleMatch[2] || '')}</p>`;
  return `<p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`;
}

function adminTextToHtml(text = '') {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '<p>[Chưa có nội dung]</p>';
  const nationalIndex = lines.findIndex((line) => /CỘNG\s+H[ÒO]A\s+X[ÃA]\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(line));
  const typeIndex = lines.findIndex((line, index) => index > nationalIndex && DOC_TYPES.includes(line.toUpperCase()));

  if (nationalIndex < 1 || typeIndex < 0) {
    return lines.map(textBlockToHtml).join('\n');
  }

  const left = lines.slice(0, nationalIndex);
  const right = lines.slice(nationalIndex, typeIndex);
  const title = lines[typeIndex];
  const summary = lines[typeIndex + 1] || '';
  const remaining = lines.slice(typeIndex + 2);
  const recipientsIndex = remaining.findIndex((line) => /^Nơi\s+nhận/i.test(line));
  const body = recipientsIndex >= 0 ? remaining.slice(0, recipientsIndex) : remaining;
  const footer = recipientsIndex >= 0 ? remaining.slice(recipientsIndex) : [];
  const signatureIndex = footer.findIndex((line, index) => index > 0 && /^(TM\.|KT\.|HIỆU TRƯỞNG|PHÓ HIỆU TRƯỞNG|TỔ TRƯỞNG|THỦ TRƯỞNG|NGƯỜI KÝ|NGƯỜI LÀM ĐƠN)/i.test(line));
  const recipients = signatureIndex > 0 ? footer.slice(0, signatureIndex) : footer.slice(0, 4);
  const signature = signatureIndex > 0 ? footer.slice(signatureIndex) : footer.slice(4);

  return `<div class="admin-doc">
    <div class="admin-head">
      <div>${left.map((line, index) => `<p class="center ${index < 2 ? 'strong' : ''}">${escapeHtml(line)}</p>`).join('')}</div>
      <div>${right.map((line, index) => `<p class="center ${index < 2 ? 'strong' : index === right.length - 1 ? 'italic' : ''}">${escapeHtml(line)}</p>`).join('')}</div>
    </div>
    <p class="doc-title">${escapeHtml(title)}</p>
    ${summary ? `<p class="doc-summary">${escapeHtml(summary)}</p>` : ''}
    <div class="doc-body">${body.map(textBlockToHtml).join('')}</div>
    ${footer.length ? `<div class="doc-footer"><div>${recipients.map((line, index) => `<p class="${index === 0 ? 'strong' : ''}">${escapeHtml(line)}</p>`).join('')}</div><div class="signature">${signature.map((line, index) => `<p class="center ${index === signature.length - 1 || index < 1 ? 'strong' : index === signature.length - 2 ? 'italic' : ''}">${escapeHtml(line)}</p>`).join('')}</div></div>` : ''}
  </div>`;
}

function buildAdministrativeHtml(text = '', title = 'Văn bản hành chính') {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page{size:A4;margin:22mm 18mm 22mm 32mm}*{box-sizing:border-box}html,body{margin:0;background:#f2f4f7;color:#000}body,body *{font-family:"Times New Roman",Times,serif!important}.page{width:210mm;min-height:297mm;margin:0 auto;padding:20mm 18mm 22mm 32mm;background:#fff;font-size:13pt;line-height:1.35}.admin-head{display:grid;grid-template-columns:1fr 1.08fr;gap:18mm;margin-bottom:10pt}.admin-head p{margin:0 0 3pt;line-height:1.2}.center{text-align:center!important}.strong{font-weight:700!important}.italic{font-style:italic}.doc-title{text-align:center;font-weight:700;text-transform:uppercase;font-size:14pt;margin:14pt 0 2pt}.doc-summary{text-align:center;font-weight:700;margin:0 0 12pt}.doc-body p{margin:0 0 7pt;text-align:justify}.section-heading{font-weight:700;margin-top:10pt!important;text-align:left!important}.article-line{margin-top:7pt!important}.doc-footer{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-top:16pt;break-inside:avoid}.doc-footer p{margin:0 0 5pt;text-align:left}.signature p{text-align:center}.page>p{margin:0 0 8pt;text-align:justify}@media print{html,body{background:#fff}.page{width:auto;min-height:auto;margin:0;padding:0}}
  </style></head><body><main class="page">${adminTextToHtml(text)}</main></body></html>`;
}

function textToWordHtml(text = '', title = 'Văn bản hành chính') {
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page Section1{size:21cm 29.7cm;margin:2.2cm 1.8cm 2.2cm 3.2cm}div.Section1{page:Section1}body,body *{font-family:"Times New Roman",Times,serif!important;font-size:13pt;line-height:1.35;color:#000}.admin-head{display:table;width:100%;table-layout:fixed;margin-bottom:10pt}.admin-head>div{display:table-cell;width:50%;vertical-align:top;padding:0 8mm}.admin-head p{margin:0 0 3pt}.center{text-align:center!important}.strong{font-weight:700!important}.italic{font-style:italic}.doc-title{text-align:center;font-weight:700;text-transform:uppercase;font-size:14pt;margin:14pt 0 2pt}.doc-summary{text-align:center;font-weight:700;margin:0 0 12pt}.doc-body p{margin:0 0 7pt;text-align:justify}.section-heading{font-weight:700;margin-top:10pt!important;text-align:left!important}.doc-footer{display:table;width:100%;table-layout:fixed;margin-top:16pt}.doc-footer>div{display:table-cell;width:50%;vertical-align:top}.doc-footer p{margin:0 0 5pt}.signature p{text-align:center}</style></head><body><div class="Section1">${adminTextToHtml(text)}</div></body></html>`;
}

function detectAdministrativeDocument(text = '') {
  const source = String(text || '').replace(/\u00a0/g, ' ').trim();
  const upper = source.toUpperCase();
  const lines = source.split('\n').map((line) => line.trim()).filter(Boolean);
  const type = DOC_TYPES.find((item) => upper.includes(item));
  const checks = [
    ['agency', 'Cơ quan ban hành', lines.some((line) => line.length > 4 && line.length < 120 && line === line.toUpperCase() && !/CỘNG|ĐỘC LẬP|SỐ:/.test(line))],
    ['national', 'Quốc hiệu', /CỘNG\s+H[ÒO]A\s+X[ÃA]\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(source)],
    ['motto', 'Tiêu ngữ', /Độc\s+lập\s*[-–]\s*Tự\s+do\s*[-–]\s*Hạnh\s+phúc/i.test(source)],
    ['number', 'Số/ký hiệu', /Số\s*[:：]\s*\S+/i.test(source) || /\bSố\s+\d+\//i.test(source)],
    ['date', 'Ngày tháng', /(ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})/i.test(source)],
    ['type', 'Tên loại/trích yếu', Boolean(type) || /^V\/v\s+/im.test(source)],
    ['content', 'Nội dung', source.length > 120],
    ['signature', 'Ký tên', /(TM\.|KT\.|THỦ TRƯỞNG|HIỆU TRƯỞNG|TỔ TRƯỞNG|NGƯỜI KÝ|Ký tên|Đã ký)/i.test(source)],
    ['recipients', 'Nơi nhận', /Nơi\s+nhận/i.test(source)],
  ].map(([id, label, ok]) => ({ id, label, ok: Boolean(ok) }));
  return {
    typeLabel: type || (/V\/v\s+/i.test(source) ? 'CÔNG VĂN' : 'Chưa rõ'),
    fields: checks,
    missing: checks.filter((item) => !item.ok).map((item) => item.label),
    score: Math.round((checks.filter((item) => item.ok).length / checks.length) * 100),
    wordCount: source ? source.split(/\s+/).filter(Boolean).length : 0,
    charCount: source.length,
  };
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

function compact(value, fallback) {
  return String(value || '').trim() || fallback;
}

function buildLocalAdministrativeDocument({ docType, docInfo, bodyText }) {
  const info = { ...SAMPLE_DOC_INFO, ...(docInfo || {}) };
  const effectiveType = docType || 'KẾ HOẠCH';
  const content = String(bodyText || '').trim() || SAMPLE_BODY_BY_TYPE[effectiveType] || SAMPLE_BODY_BY_TYPE['KẾ HOẠCH'];
  const recipientLine = ['CÔNG VĂN', 'GIẤY MỜI', 'ĐƠN'].includes(effectiveType) && info.recipient ? `Kính gửi: ${info.recipient}\n\n` : '';
  return `${compact(info.parentAgency, '[CẦN BỔ SUNG: CƠ QUAN CHỦ QUẢN]')}\n${compact(info.issuingUnit, '[CẦN BỔ SUNG: ĐƠN VỊ BAN HÀNH]')}\nSố: ${compact(info.numberSymbol, '[CẦN BỔ SUNG: SỐ/KÝ HIỆU]')}\n\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n________________________\n\n${compact(info.placeDate, '[CẦN BỔ SUNG: ĐỊA DANH, NGÀY THÁNG]')}\n\n${effectiveType}\n${compact(info.titleSummary, '[CẦN BỔ SUNG: TRÍCH YẾU]')}\n\n${recipientLine}${content}\n\nNơi nhận:\n${compact(info.recipients, '- Lưu: VT.')}\n\n${compact(info.signerTitle, '[CẦN BỔ SUNG: CHỨC VỤ NGƯỜI KÝ]')}\n(Ký, ghi rõ họ tên)\n\n\n${compact(info.signerName, '[CẦN BỔ SUNG: HỌ TÊN NGƯỜI KÝ]')}`;
}

function buildAiInstruction({ mode, aiRequest, rawText, detected, docType, docInfo }) {
  return `${ADMIN_RULES}

NHIỆM VỤ: ${mode === 'create' ? 'TẠO MỚI văn bản hành chính từ yêu cầu và các trường thể thức.' : 'CHỈNH SỬA/CHUẨN HOÁ văn bản hành chính từ nội dung nguồn.'}

Loại văn bản: ${docType}
- Cơ quan chủ quản: ${docInfo.parentAgency || '[CẦN BỔ SUNG]'}
- Đơn vị ban hành: ${docInfo.issuingUnit || '[CẦN BỔ SUNG]'}
- Số/ký hiệu: ${docInfo.numberSymbol || '[CẦN BỔ SUNG]'}
- Địa danh/ngày tháng: ${docInfo.placeDate || '[CẦN BỔ SUNG]'}
- Trích yếu/tiêu đề: ${docInfo.titleSummary || '[CẦN BỔ SUNG]'}
- Kính gửi/đối tượng nhận: ${docInfo.recipient || '[NẾU CÓ]'}
- Chức vụ người ký: ${docInfo.signerTitle || '[CẦN BỔ SUNG]'}
- Họ tên người ký: ${docInfo.signerName || '[CẦN BỔ SUNG]'}
- Nơi nhận: ${docInfo.recipients || '[CẦN BỔ SUNG]'}

Yêu cầu của giáo viên:
${aiRequest || '(Không có yêu cầu riêng)'}

Nhận diện hiện tại:
- Loại: ${detected.typeLabel}
- Mức đầy đủ: ${detected.score}%
- Còn thiếu: ${detected.missing.length ? detected.missing.join('; ') : 'Không'}

Nội dung nguồn:
${rawText || '(Không có nội dung nguồn. Các thông tin chưa chắc chắn phải để [CẦN BỔ SUNG].)'}

TRẢ VỀ DUY NHẤT VĂN BẢN ĐÃ CHUẨN HOÁ, không dùng bảng markdown.`;
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

export default function TextCareGoogleStudio({ tool, language, apiKey, aiModel, hasApiKey }) {
  const saved = useMemo(loadDraft, []);
  const [rawText, setRawText] = useState(saved?.rawText || '');
  const [aiRequest, setAiRequest] = useState(saved?.aiRequest || DOC_TYPE_PROMPTS['KẾ HOẠCH']);
  const [docType, setDocType] = useState(saved?.docType || 'KẾ HOẠCH');
  const [docInfo, setDocInfo] = useState(() => ({ ...SAMPLE_DOC_INFO, ...(saved?.docInfo || {}) }));
  const [output, setOutput] = useState(saved?.output || '');
  const [sourceName, setSourceName] = useState(saved?.sourceName || '');
  const [activeStep, setActiveStep] = useState('source');
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [previewAccepted, setPreviewAccepted] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(86);
  const [frameHeight, setFrameHeight] = useState(1123);
  const [pageCount, setPageCount] = useState(1);
  const [lastSavedAt, setLastSavedAt] = useState(saved?.savedAt || '');
  const [toast, showToast] = useToast();
  const fileInputRef = useRef(null);
  const previewCardRef = useRef(null);
  const previewFrameRef = useRef(null);

  const toolTitle = language === 'en' ? (tool?.title || 'TextCare') : (tool?.titleVi || tool?.title || 'TextCare');
  const previewText = output || rawText || buildLocalAdministrativeDocument({ docType, docInfo, bodyText: SAMPLE_BODY_BY_TYPE[docType] });
  const rawDetected = useMemo(() => detectAdministrativeDocument(rawText), [rawText]);
  const detected = useMemo(() => detectAdministrativeDocument(previewText), [previewText]);
  const previewHtml = useMemo(() => buildAdministrativeHtml(previewText, toolTitle), [previewText, toolTitle]);
  const downloadName = librarySlugify(detected.typeLabel !== 'Chưa rõ' ? detected.typeLabel : docType || 'van-ban-hanh-chinh');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ rawText, aiRequest, docType, docInfo, output, sourceName, savedAt }));
        setLastSavedAt(savedAt);
      } catch {
        // Autosave is optional when browser storage is unavailable.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [rawText, aiRequest, docType, docInfo, output, sourceName]);

  const invalidatePreview = () => setPreviewAccepted(false);
  const setInfo = (key, value) => {
    setDocInfo((current) => ({ ...current, [key]: value }));
    invalidatePreview();
  };

  const chooseDocType = (type) => {
    setDocType(type);
    setAiRequest(DOC_TYPE_PROMPTS[type] || DOC_TYPE_PROMPTS['KẾ HOẠCH']);
    setOutput('');
    invalidatePreview();
  };

  const processFile = async (file) => {
    if (!file) return;
    setError('');
    setLoadingFile(true);
    setSourceName(file.name || 'document');
    try {
      const text = await readUploadedFile(file);
      setRawText(text);
      setOutput('');
      invalidatePreview();
      const fileDetected = detectAdministrativeDocument(text);
      if (fileDetected.typeLabel !== 'Chưa rõ') setDocType(fileDetected.typeLabel);
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

  const generateWithAi = async (mode = 'fix') => {
    setError('');
    if (!hasApiKey) {
      setError('AI chưa được kết nối. Hãy kiểm tra cấu hình OpenRouter trong Cài đặt.');
      return;
    }
    if (mode === 'fix' && !rawText.trim() && !aiRequest.trim()) {
      setError('Hãy dán văn bản, tải file hoặc nhập yêu cầu trước.');
      return;
    }
    setLoadingAi(true);
    try {
      const instruction = buildAiInstruction({ mode, aiRequest, rawText, detected: rawDetected, docType, docInfo });
      const result = await generateGenericToolOutput({
        apiKey,
        model: aiModel,
        slug: 'textcare',
        instruction,
        sourceText: rawText,
        level: 'Administrative document / Nghị định 30',
        itemCount: 0,
        language,
      });
      setOutput(result);
      setActiveStep('content');
      invalidatePreview();
      addHistoryEntry({
        kind: 'ai-output',
        toolSlug: 'textcare',
        toolTitle,
        title: `${docType} · ${(docInfo.titleSummary || aiRequest).slice(0, 72)}`,
        content: result,
        level: 'Nghị định 30/2020/NĐ-CP',
        tags: ['textcare', 'nghi-dinh-30', docType, rawDetected.typeLabel],
        model: aiModel,
      });
      showToast(mode === 'create' ? 'AI đã tạo văn bản.' : 'AI đã chuẩn hoá văn bản.');
    } catch (aiError) {
      setError(aiError.message || String(aiError));
    } finally {
      setLoadingAi(false);
    }
  };

  const applyLocalTemplate = () => {
    setOutput(buildLocalAdministrativeDocument({ docType, docInfo, bodyText: rawText || SAMPLE_BODY_BY_TYPE[docType] }));
    setActiveStep('content');
    invalidatePreview();
    showToast('Đã áp thể thức Nghị định 30 cục bộ.');
  };

  const resetAll = () => {
    setRawText('');
    setOutput('');
    setSourceName('');
    setDocType('KẾ HOẠCH');
    setAiRequest(DOC_TYPE_PROMPTS['KẾ HOẠCH']);
    setDocInfo({ ...SAMPLE_DOC_INFO });
    setPreviewAccepted(false);
    setError('');
    setActiveStep('source');
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* optional */ }
    showToast('Đã tạo bản nháp mới.');
  };

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      showToast('Đã sao chép văn bản.');
    } catch {
      setError('Trình duyệt không cho phép sao chép tự động.');
    }
  };

  const printPreview = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      setError('Trình duyệt đang chặn cửa sổ in.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(previewHtml);
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
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

  const zoomBy = (delta) => setPreviewZoom((current) => Math.min(140, Math.max(60, current + delta)));
  const savedLabel = lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'chưa lưu';
  const steps = [
    { id: 'source', label: 'Nguồn', icon: 'upload' },
    { id: 'format', label: 'Thể thức', icon: 'tune' },
    { id: 'content', label: 'Nội dung', icon: 'description' },
  ];

  return (
    <div className="page textcare-google-page">
      <header className="tcg-topbar">
        <button className="tcg-icon-button" onClick={() => window.history.back()} aria-label="Quay lại"><Icon name="back" /></button>
        <div className="tcg-brand-mark"><Icon name="description" size={22} /></div>
        <div className="tcg-title-block">
          <strong>TextCare</strong>
          <span>Chuẩn hoá văn bản hành chính</span>
        </div>
        <div className={`tcg-connection ${hasApiKey ? 'connected' : ''}`}><i />{hasApiKey ? 'OpenRouter đã kết nối' : 'AI chưa kết nối'}</div>
        <div className="tcg-autosave"><Icon name="save" size={17} /> Tự lưu lúc {savedLabel}</div>
        <button className="tcg-text-button" onClick={resetAll}><Icon name="refresh" size={18} /> Bản mới</button>
        <button className="tcg-filled-button" onClick={() => generateWithAi(rawText.trim() ? 'fix' : 'create')} disabled={loadingAi}>
          <Icon name="sparkle" size={19} />{loadingAi ? 'Đang xử lý…' : rawText.trim() ? 'Chuẩn hoá bằng AI' : 'Tạo bằng AI'}
        </button>
      </header>

      <section className="tcg-hero">
        <div>
          <span className="tcg-kicker">GOOGLE MATERIAL 3 WORKSPACE</span>
          <h1>Biến nội dung thô thành văn bản hành chính sẵn sàng ban hành.</h1>
          <p>Tải DOCX, PDF hoặc TXT; nhận diện thành phần; chuẩn hoá theo Nghị định 30/2020/NĐ-CP; chỉnh trực tiếp và xuất Word, HTML hoặc TXT.</p>
        </div>
        <div className="tcg-hero-metrics">
          <article><span>Mức đầy đủ</span><strong>{detected.score}%</strong><small>{detected.missing.length ? `Thiếu ${detected.missing.length} thành phần` : 'Đủ thành phần chính'}</small></article>
          <article><span>Loại văn bản</span><strong>{detected.typeLabel}</strong><small>{detected.wordCount.toLocaleString('vi-VN')} từ · {detected.charCount.toLocaleString('vi-VN')} ký tự</small></article>
          <article><span>Trạng thái</span><strong>{previewAccepted ? 'Đã duyệt' : 'Bản nháp'}</strong><small>{pageCount} trang A4 dự kiến</small></article>
        </div>
      </section>

      <main className="tcg-workbench">
        <section className="tcg-editor-card">
          <nav className="tcg-stepper" aria-label="Quy trình chỉnh sửa">
            {steps.map((step, index) => (
              <button key={step.id} className={activeStep === step.id ? 'active' : ''} onClick={() => setActiveStep(step.id)}>
                <span><Icon name={step.icon} size={18} /></span><b>{index + 1}</b>{step.label}
              </button>
            ))}
          </nav>

          {activeStep === 'source' && (
            <div className="tcg-panel tcg-source-panel">
              <div className="tcg-panel-heading"><div><span>BƯỚC 1</span><h2>Thêm nội dung nguồn</h2></div><small>DOCX · PDF · TXT · Dán văn bản</small></div>
              <div
                className={`tcg-dropzone ${dragging ? 'dragging' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
                onDrop={(event) => { event.preventDefault(); setDragging(false); processFile(event.dataTransfer.files?.[0]); }}
              >
                <input ref={fileInputRef} type="file" hidden accept=".txt,.md,.csv,.html,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileInput} />
                <div className="tcg-upload-icon"><Icon name="upload" size={28} /></div>
                <div><strong>{loadingFile ? 'Đang đọc nội dung…' : 'Thả file vào đây'}</strong><span>hoặc chọn file từ máy</span></div>
                <button className="tcg-outlined-button" onClick={() => fileInputRef.current?.click()} disabled={loadingFile}>Chọn file</button>
              </div>
              {sourceName && <div className="tcg-file-chip"><Icon name="description" size={18} /><span>{sourceName}</span><button onClick={() => { setSourceName(''); setRawText(''); setOutput(''); }} aria-label="Xoá file"><Icon name="delete" size={17} /></button></div>}

              <label className="tcg-field tcg-large-field"><span>Nội dung nguồn</span><textarea rows={11} value={rawText} onChange={(event) => { setRawText(event.target.value); setOutput(''); invalidatePreview(); }} placeholder="Dán nội dung cần chuẩn hoá tại đây…" /><small>{rawText.length.toLocaleString('vi-VN')} ký tự</small></label>
              <label className="tcg-field"><span>Yêu cầu dành cho AI</span><textarea rows={4} value={aiRequest} onChange={(event) => { setAiRequest(event.target.value); invalidatePreview(); }} placeholder="Ví dụ: chỉnh thành kế hoạch tổ chuyên môn, giữ nguyên thông tin đã có…" /></label>
              <div className="tcg-action-row">
                <button className="tcg-filled-button" onClick={() => generateWithAi('create')} disabled={loadingAi}><Icon name="sparkle" size={18} /> AI tạo văn bản</button>
                <button className="tcg-tonal-button" onClick={() => generateWithAi('fix')} disabled={loadingAi}><Icon name="tune" size={18} /> AI chuẩn hoá</button>
                <button className="tcg-outlined-button" onClick={applyLocalTemplate}><Icon name="description" size={18} /> Áp thể thức nhanh</button>
              </div>
            </div>
          )}

          {activeStep === 'format' && (
            <div className="tcg-panel">
              <div className="tcg-panel-heading"><div><span>BƯỚC 2</span><h2>Thiết lập thể thức</h2></div><small>Nghị định 30/2020/NĐ-CP</small></div>
              <div className="tcg-type-chips">{DOC_TYPES.map((type) => <button key={type} className={docType === type ? 'active' : ''} onClick={() => chooseDocType(type)}>{type}</button>)}</div>
              <div className="tcg-form-grid">
                <label className="tcg-field"><span>Cơ quan chủ quản</span><input value={docInfo.parentAgency} onChange={(event) => setInfo('parentAgency', event.target.value)} /></label>
                <label className="tcg-field"><span>Đơn vị ban hành</span><input value={docInfo.issuingUnit} onChange={(event) => setInfo('issuingUnit', event.target.value)} /></label>
                <label className="tcg-field"><span>Số / ký hiệu</span><input value={docInfo.numberSymbol} onChange={(event) => setInfo('numberSymbol', event.target.value)} /></label>
                <label className="tcg-field"><span>Địa danh, ngày tháng</span><input value={docInfo.placeDate} onChange={(event) => setInfo('placeDate', event.target.value)} /></label>
                <label className="tcg-field wide"><span>Trích yếu / tiêu đề</span><input value={docInfo.titleSummary} onChange={(event) => setInfo('titleSummary', event.target.value)} /></label>
                <label className="tcg-field wide"><span>Kính gửi / đối tượng nhận</span><input value={docInfo.recipient} onChange={(event) => setInfo('recipient', event.target.value)} /></label>
                <label className="tcg-field"><span>Chức vụ người ký</span><input value={docInfo.signerTitle} onChange={(event) => setInfo('signerTitle', event.target.value)} /></label>
                <label className="tcg-field"><span>Họ tên người ký</span><input value={docInfo.signerName} onChange={(event) => setInfo('signerName', event.target.value)} /></label>
                <label className="tcg-field wide"><span>Nơi nhận</span><textarea rows={4} value={docInfo.recipients} onChange={(event) => setInfo('recipients', event.target.value)} /></label>
              </div>
              <div className="tcg-validation-card">
                <div className="tcg-score-ring" style={{ '--score': `${detected.score * 3.6}deg` }}><strong>{detected.score}%</strong></div>
                <div><h3>Kiểm tra thành phần văn bản</h3><p>{detected.missing.length ? `Cần bổ sung: ${detected.missing.join(', ')}.` : 'Các thành phần chính đã được nhận diện đầy đủ.'}</p></div>
                <div className="tcg-check-grid">{detected.fields.map((field) => <span key={field.id} className={field.ok ? 'ok' : ''}><i>{field.ok ? '✓' : '!'}</i>{field.label}</span>)}</div>
              </div>
              <div className="tcg-action-row"><button className="tcg-filled-button" onClick={applyLocalTemplate}><Icon name="check" size={18} /> Cập nhật preview</button><button className="tcg-tonal-button" onClick={() => generateWithAi('fix')} disabled={loadingAi}><Icon name="sparkle" size={18} /> Chuẩn hoá lại bằng AI</button></div>
            </div>
          )}

          {activeStep === 'content' && (
            <div className="tcg-panel tcg-content-panel">
              <div className="tcg-panel-heading"><div><span>BƯỚC 3</span><h2>Chỉnh nội dung sau chuẩn hoá</h2></div><small>Mọi thay đổi được cập nhật ngay ở preview</small></div>
              {!output && <div className="tcg-empty-note"><Icon name="description" size={22} /><div><strong>Chưa có bản chuẩn hoá riêng</strong><span>Preview đang dùng nội dung nguồn hoặc mẫu cục bộ. Nhấn “Áp thể thức nhanh” hay dùng AI để tạo bản có thể chỉnh.</span></div></div>}
              <label className="tcg-field tcg-output-field"><span>Nội dung văn bản hoàn chỉnh</span><textarea rows={25} value={output} onChange={(event) => { setOutput(event.target.value); invalidatePreview(); }} placeholder="Kết quả chuẩn hoá sẽ xuất hiện tại đây…" /></label>
              <div className="tcg-action-row">
                <button className="tcg-filled-button" onClick={applyLocalTemplate}><Icon name="description" size={18} /> Tạo từ dữ liệu hiện có</button>
                <button className="tcg-tonal-button" onClick={() => generateWithAi('fix')} disabled={loadingAi}><Icon name="sparkle" size={18} /> AI viết lại</button>
                <button className="tcg-text-button" onClick={() => { setOutput(''); invalidatePreview(); }}><Icon name="delete" size={17} /> Xoá kết quả</button>
              </div>
            </div>
          )}

          {error && <div className="tcg-error" role="alert"><strong>Không thể hoàn tất thao tác</strong><span>{error}</span><button onClick={() => setError('')}>Đóng</button></div>}
        </section>

        <aside ref={previewCardRef} className="tcg-preview-card">
          <div className="tcg-preview-head">
            <div><span>PREVIEW TRỰC TIẾP</span><h2>Khổ A4</h2></div>
            <div className={`tcg-review-state ${previewAccepted ? 'accepted' : ''}`}><Icon name={previewAccepted ? 'check' : 'preview'} size={17} />{previewAccepted ? 'Đã duyệt' : 'Chờ duyệt'}</div>
          </div>
          <div className="tcg-preview-toolbar">
            <div className="tcg-zoom-control"><button onClick={() => zoomBy(-10)} aria-label="Thu nhỏ"><Icon name="minus" size={17} /></button><button onClick={() => setPreviewZoom(86)}>{previewZoom}%</button><button onClick={() => zoomBy(10)} aria-label="Phóng to"><Icon name="plus" size={17} /></button></div>
            <span>Trang {pageCount > 1 ? `1–${pageCount}` : '1'} / {pageCount}</span>
            <div className="tcg-toolbar-actions">
              <button onClick={copyPreview} title="Sao chép"><Icon name="copy" size={18} /></button>
              <button onClick={printPreview} title="In"><Icon name="print" size={18} /></button>
              <button onClick={fullscreenPreview} title="Toàn màn hình"><Icon name="fullscreen" size={18} /></button>
            </div>
          </div>
          <div className="tcg-a4-viewport">
            <div className="tcg-a4-stage" style={{ height: `${Math.ceil(frameHeight * previewZoom / 100) + 32}px` }}>
              <iframe ref={previewFrameRef} title="Preview văn bản hành chính" srcDoc={previewHtml} sandbox="allow-same-origin" onLoad={handlePreviewLoad} style={{ height: `${frameHeight}px`, transform: `scale(${previewZoom / 100})` }} />
            </div>
          </div>
          <div className="tcg-export-panel">
            <button className="tcg-filled-button" onClick={() => { setPreviewAccepted(true); showToast('Đã duyệt preview.'); }}><Icon name="check" size={18} /> Duyệt preview</button>
            <div className="tcg-export-menu">
              <button onClick={() => downloadFile(`${downloadName}-nghi-dinh-30.doc`, textToWordHtml(previewText, toolTitle), 'application/msword;charset=utf-8')}><Icon name="download" size={18} /><span><b>Word</b><small>.doc</small></span></button>
              <button onClick={() => downloadFile(`${downloadName}-preview.html`, previewHtml, 'text/html;charset=utf-8')}><Icon name="download" size={18} /><span><b>HTML</b><small>.html</small></span></button>
              <button onClick={() => downloadFile(`${downloadName}.txt`, previewText)}><Icon name="download" size={18} /><span><b>Văn bản</b><small>.txt</small></span></button>
            </div>
          </div>
        </aside>
      </main>

      {toast && <div className="tcg-toast" role="status"><Icon name="check" size={18} />{toast}</div>}
    </div>
  );
}
