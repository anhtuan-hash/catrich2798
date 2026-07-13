import React, { useMemo, useRef, useState } from 'react';
import { generateGenericToolOutput } from '../utils/gemini.js';
import { addHistoryEntry, exportAsHtml, exportAsWord, slugify as librarySlugify } from '../utils/library.js';
import { loadMammoth, loadPdfjs } from '../utils/documentParsers.js';

const DOC_TYPES = [
  'THÔNG BÁO', 'KẾ HOẠCH', 'BÁO CÁO', 'BIÊN BẢN', 'TỜ TRÌNH',
  'CÔNG VĂN', 'QUYẾT ĐỊNH', 'GIẤY MỜI', 'PHIẾU', 'ĐƠN'
];

const DOC_TYPE_PROMPTS = {
  'THÔNG BÁO': 'Tạo/chỉnh THÔNG BÁO hành chính theo Nghị định 30/2020/NĐ-CP. Nội dung ngắn gọn, rõ đối tượng nhận, thời gian, địa điểm, nội dung thông báo và nơi nhận.',
  'KẾ HOẠCH': 'Tạo/chỉnh KẾ HOẠCH hành chính theo Nghị định 30/2020/NĐ-CP. Chia rõ: căn cứ, mục đích/yêu cầu, nội dung thực hiện, thời gian, phân công, tổ chức thực hiện, nơi nhận và ký tên.',
  'BÁO CÁO': 'Tạo/chỉnh BÁO CÁO hành chính theo Nghị định 30/2020/NĐ-CP. Bố cục gồm: tình hình chung, kết quả thực hiện, hạn chế/nguyên nhân, kiến nghị/đề xuất, nơi nhận và ký tên.',
  'BIÊN BẢN': 'Tạo/chỉnh BIÊN BẢN hành chính theo Nghị định 30/2020/NĐ-CP. Nêu thời gian, địa điểm, thành phần, nội dung diễn biến, kết luận, chữ ký các bên liên quan.',
  'TỜ TRÌNH': 'Tạo/chỉnh TỜ TRÌNH hành chính theo Nghị định 30/2020/NĐ-CP. Trình bày lý do, căn cứ, nội dung đề nghị, phương án thực hiện và kiến nghị cấp có thẩm quyền xem xét.',
  'CÔNG VĂN': 'Tạo/chỉnh CÔNG VĂN hành chính theo Nghị định 30/2020/NĐ-CP. Dùng thể thức công văn, có phần V/v, nội dung trao đổi/chỉ đạo/đề nghị rõ ràng, đúng văn phong hành chính.',
  'QUYẾT ĐỊNH': 'Tạo/chỉnh QUYẾT ĐỊNH hành chính theo Nghị định 30/2020/NĐ-CP. Có căn cứ ban hành, điều khoản quyết định, trách nhiệm thi hành, hiệu lực và chữ ký người có thẩm quyền.',
  'GIẤY MỜI': 'Tạo/chỉnh GIẤY MỜI hành chính theo Nghị định 30/2020/NĐ-CP. Nêu rõ kính mời, thời gian, địa điểm, nội dung, thành phần tham dự, yêu cầu chuẩn bị và liên hệ.',
  'PHIẾU': 'Tạo/chỉnh PHIẾU hành chính theo Nghị định 30/2020/NĐ-CP. Trình bày thông tin theo mục rõ ràng, dễ điền, đúng chính tả và đúng thể thức cần thiết.',
  'ĐƠN': 'Tạo/chỉnh ĐƠN theo thể thức hành chính phù hợp. Nêu kính gửi, thông tin người làm đơn, nội dung đề nghị, cam kết nếu có, ngày tháng và chữ ký.'
};

const SAMPLE_DOC_INFO = {
  parentAgency: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH',
  issuingUnit: 'TRƯỜNG THPT BRIAN ENGLISH',
  numberSymbol: '12/KH-THPTBE',
  placeDate: 'Thành phố Hồ Chí Minh, ngày 07 tháng 7 năm 2026',
  titleSummary: 'Tổ chức sinh hoạt chuyên môn môn Tiếng Anh tháng 7 năm 2026',
  recipient: 'Giáo viên Tổ Tiếng Anh',
  signerTitle: 'TỔ TRƯỞNG CHUYÊN MÔN',
  signerName: 'NGUYỄN ANH TUẤN',
  recipients: '- Ban Giám hiệu;\n- Tổ Tiếng Anh;\n- Lưu: VT, CM.',
};

const DEFAULT_DOC_INFO = { ...SAMPLE_DOC_INFO };

const SAMPLE_BODY_BY_TYPE = {
  'KẾ HOẠCH': `I. MỤC ĐÍCH, YÊU CẦU
1. Nâng cao chất lượng sinh hoạt chuyên môn, tập trung vào đổi mới phương pháp dạy học, kiểm tra đánh giá và ứng dụng công nghệ trong dạy học tiếng Anh.
2. Thống nhất nội dung ôn tập, xây dựng học liệu dùng chung và chia sẻ kinh nghiệm tổ chức hoạt động học tập cho học sinh.
3. Việc triển khai phải thiết thực, đúng tiến độ, có minh chứng và sản phẩm lưu trữ sau khi thực hiện.

II. NỘI DUNG THỰC HIỆN
1. Rà soát kế hoạch dạy học, thống nhất nội dung trọng tâm trong tháng 7 năm 2026.
2. Xây dựng ngân hàng câu hỏi theo định hướng đánh giá năng lực học sinh.
3. Tổ chức góp ý chuyên môn đối với bài dạy minh họa và hồ sơ chuyên môn của giáo viên.
4. Cập nhật tài liệu, đề kiểm tra và minh chứng vào kho lưu trữ của tổ.

III. TỔ CHỨC THỰC HIỆN
1. Tổ trưởng chuyên môn chịu trách nhiệm điều phối, tổng hợp sản phẩm và báo cáo Ban Giám hiệu.
2. Giáo viên trong tổ thực hiện nhiệm vụ được phân công, nộp minh chứng đúng thời hạn.
3. Kết quả thực hiện được sử dụng làm căn cứ đánh giá hoạt động chuyên môn tháng 7 năm 2026.`,
  'THÔNG BÁO': `Nhà trường thông báo đến giáo viên Tổ Tiếng Anh về việc tham dự buổi sinh hoạt chuyên môn tháng 7 năm 2026.

1. Thời gian: 14 giờ 00, ngày 15 tháng 7 năm 2026.
2. Địa điểm: Phòng họp chuyên môn.
3. Nội dung: Rà soát kế hoạch dạy học, thống nhất học liệu, góp ý bài dạy minh họa và triển khai nhiệm vụ tháng 7 năm 2026.
4. Thành phần: Ban Giám hiệu phụ trách chuyên môn và toàn thể giáo viên Tổ Tiếng Anh.

Đề nghị các cá nhân có liên quan tham dự đầy đủ, đúng giờ và chuẩn bị nội dung theo phân công.`,
  'BÁO CÁO': `I. TÌNH HÌNH CHUNG
Trong tháng 7 năm 2026, Tổ Tiếng Anh đã triển khai các nhiệm vụ chuyên môn theo kế hoạch của nhà trường, tập trung vào xây dựng học liệu, rà soát đề kiểm tra và đổi mới hoạt động dạy học.

II. KẾT QUẢ THỰC HIỆN
1. Hoàn thành việc rà soát kế hoạch dạy học và thống nhất nội dung trọng tâm.
2. Xây dựng ngân hàng câu hỏi dùng chung phục vụ ôn tập và kiểm tra đánh giá.
3. Tổ chức góp ý chuyên môn đối với bài dạy minh họa theo định hướng phát triển năng lực học sinh.

III. HẠN CHẾ VÀ ĐỀ XUẤT
Một số minh chứng cần tiếp tục chuẩn hóa về định dạng lưu trữ. Đề nghị giáo viên hoàn thiện hồ sơ và nộp về tổ chuyên môn theo thời hạn quy định.`,
  'BIÊN BẢN': `Hôm nay, vào lúc 14 giờ 00 ngày 15 tháng 7 năm 2026, tại Phòng họp chuyên môn, Tổ Tiếng Anh tiến hành họp sinh hoạt chuyên môn tháng 7 năm 2026.

I. THÀNH PHẦN THAM DỰ
1. Đại diện Ban Giám hiệu phụ trách chuyên môn.
2. Toàn thể giáo viên Tổ Tiếng Anh.

II. NỘI DUNG CUỘC HỌP
1. Rà soát kế hoạch dạy học và phân công nhiệm vụ chuyên môn.
2. Góp ý bài dạy minh họa, thống nhất điều chỉnh hoạt động học tập.
3. Thống nhất thời hạn nộp minh chứng chuyên môn tháng 7 năm 2026.

III. KẾT LUẬN
Cuộc họp thống nhất triển khai các nhiệm vụ theo nội dung trên. Biên bản kết thúc vào lúc 16 giờ 00 cùng ngày.`,
  'CÔNG VĂN': `Kính gửi: Giáo viên Tổ Tiếng Anh

Nhằm triển khai nhiệm vụ chuyên môn tháng 7 năm 2026, Trường THPT Brian English đề nghị giáo viên Tổ Tiếng Anh thực hiện các nội dung sau:

1. Rà soát kế hoạch dạy học và cập nhật nội dung trọng tâm theo phân phối chương trình.
2. Hoàn thiện học liệu, ngân hàng câu hỏi và minh chứng chuyên môn theo phân công.
3. Gửi sản phẩm về tổ trưởng chuyên môn trước ngày 20 tháng 7 năm 2026 để tổng hợp báo cáo.

Nhà trường đề nghị các cá nhân có liên quan nghiêm túc thực hiện.`,
  'QUYẾT ĐỊNH': `Điều 1. Thành lập nhóm xây dựng học liệu môn Tiếng Anh tháng 7 năm 2026 gồm các giáo viên trong Tổ Tiếng Anh theo danh sách phân công của tổ chuyên môn.

Điều 2. Nhóm xây dựng học liệu có nhiệm vụ rà soát nội dung dạy học, biên soạn câu hỏi, hoàn thiện tài liệu ôn tập và lưu trữ minh chứng theo quy định.

Điều 3. Tổ trưởng chuyên môn, giáo viên Tổ Tiếng Anh và các cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này kể từ ngày ký.`,
  'TỜ TRÌNH': `Căn cứ kế hoạch hoạt động chuyên môn tháng 7 năm 2026, Tổ Tiếng Anh kính trình Ban Giám hiệu xem xét phê duyệt kế hoạch tổ chức sinh hoạt chuyên môn theo định hướng đổi mới phương pháp dạy học.

Nội dung đề nghị phê duyệt gồm: thời gian tổ chức, thành phần tham dự, nội dung sinh hoạt, phân công nhiệm vụ và hình thức lưu trữ minh chứng.

Kính đề nghị Ban Giám hiệu xem xét, phê duyệt để Tổ Tiếng Anh triển khai thực hiện đúng tiến độ.`,
  'GIẤY MỜI': `Trân trọng kính mời: Giáo viên Tổ Tiếng Anh

Đến tham dự buổi sinh hoạt chuyên môn tháng 7 năm 2026.

1. Thời gian: 14 giờ 00, ngày 15 tháng 7 năm 2026.
2. Địa điểm: Phòng họp chuyên môn.
3. Nội dung: Rà soát kế hoạch dạy học, thống nhất học liệu và góp ý bài dạy minh họa.

Đề nghị đại biểu tham dự đúng thời gian, địa điểm nêu trên.`,
  'PHIẾU': `1. Họ và tên giáo viên: ............................................................
2. Nội dung chuyên môn được phân công: ........................................
3. Sản phẩm/minh chứng cần nộp: ................................................
4. Thời hạn hoàn thành: ............................................................
5. Nhận xét của tổ chuyên môn: ...................................................

Người thực hiện cam kết hoàn thành nhiệm vụ đúng thời hạn và chịu trách nhiệm về nội dung sản phẩm được giao.`,
  'ĐƠN': `Kính gửi: Ban Giám hiệu Trường THPT Brian English

Tôi tên là: .................................................................
Chức vụ/Nhiệm vụ: ..........................................................

Nay tôi làm đơn này kính đề nghị Ban Giám hiệu xem xét hỗ trợ việc điều chỉnh lịch sinh hoạt chuyên môn tháng 7 năm 2026 để phù hợp với kế hoạch công tác của tổ.

Tôi cam kết thực hiện đúng các nhiệm vụ được phân công và chịu trách nhiệm về nội dung trình bày trong đơn.`,
};

const ADMIN_RULES = `Chuẩn hoá văn bản hành chính Việt Nam theo Nghị định số 30/2020/NĐ-CP về công tác văn thư, đặc biệt Phụ lục I về thể thức và kỹ thuật trình bày văn bản hành chính.

YÊU CẦU BẮT BUỘC:
1. Không bịa thông tin hành chính chưa có. Nếu thiếu cơ quan, số/ký hiệu, địa danh, ngày tháng, chức vụ hoặc người ký, để dạng [CẦN BỔ SUNG: ...].
2. Bảo toàn ý chính từ nội dung nguồn; chỉ chỉnh sửa, bổ sung phần thể thức/hành chính khi có căn cứ.
3. Dùng văn phong hành chính chuẩn, ngắn gọn, đúng chính tả, rõ trách nhiệm, thời gian, đối tượng và nội dung thực hiện.
4. Trình bày theo thứ tự thành phần: cơ quan ban hành, quốc hiệu/tiêu ngữ, số/ký hiệu, địa danh/ngày tháng, tên loại/trích yếu, nội dung, chức vụ/họ tên người ký, nơi nhận.
5. Không đưa lời xin lỗi, không nói rằng bạn là AI. Trả về duy nhất văn bản đã chuẩn hoá, không dùng bảng markdown.`;

function useToast() {
  const [message, setMessage] = useState('');
  const show = (text) => {
    setMessage(text);
    window.clearTimeout(show.timer);
    show.timer = window.setTimeout(() => setMessage(''), 2600);
  };
  return [message, show];
}

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const TIMES_FONT_FAMILY = "'Times New Roman', Times, serif";
const TIMES_FONT_INLINE = `font-family: ${TIMES_FONT_FAMILY} !important;`;
const TIMES_P_INLINE = `${TIMES_FONT_INLINE} font-size: 13pt !important; line-height: 1.35 !important; color: #000 !important;`;

function withTimesStyle(extra = '') {
  return ` style="${TIMES_P_INLINE}${extra ? ` ${extra}` : ''}"`;
}

function plainTextToHtml(text = '') {
  const cleanText = String(text || '').trim();
  if (!cleanText) return `<p class="empty-line"${withTimesStyle()}>[Chưa có nội dung preview]</p>`;
  const blocks = cleanText.split(/\n{2,}/);
  return blocks.map((block) => {
    const clean = block.trim();
    const html = escapeHtml(clean).replace(/\n/g, '<br/>');
    if (/^(CỘNG HÒA|CỘNG HOÀ|Độc lập|[-_]{5,})/i.test(clean)) return `<p class="center strong"${withTimesStyle('text-align: center !important; font-weight: bold !important;')}>${html}</p>`;
    if (/^(KẾ HOẠCH|QUYẾT ĐỊNH|THÔNG BÁO|TỜ TRÌNH|BÁO CÁO|BIÊN BẢN|CÔNG VĂN|GIẤY MỜI|PHIẾU|ĐƠN)\b/i.test(clean)) return `<p class="doc-title"${withTimesStyle('text-align: center !important; font-weight: bold !important; text-transform: uppercase !important; font-size: 14pt !important;')}>${html}</p>`;
    if (/^(Nơi nhận|NƠI NHẬN|TM\.|KT\.|HIỆU TRƯỞNG|TỔ TRƯỞNG|NGƯỜI KÝ|NGƯỜI LÀM ĐƠN|THỦ TRƯỞNG)/i.test(clean)) return `<p class="strong"${withTimesStyle('font-weight: bold !important;')}>${html}</p>`;
    return `<p${withTimesStyle('text-align: justify !important;')}>${html}</p>`;
  }).join('\n');
}

function isDocTypeLine(line = '') {
  return DOC_TYPES.includes(String(line || '').trim().toUpperCase());
}

function adminTextToHtml(text = '') {
  const cleanText = String(text || '').trim();
  if (!cleanText) return plainTextToHtml(text);
  const lines = cleanText.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const nationalIndex = lines.findIndex((line) => /CỘNG\s+H[ÒO]A\s+X[ÃA]\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(line));
  const titleIndex = lines.findIndex((line, index) => index > nationalIndex && isDocTypeLine(line));
  if (nationalIndex < 1 || titleIndex < 0) return plainTextToHtml(text);

  const leftLines = lines.slice(0, nationalIndex);
  const rightLines = lines.slice(nationalIndex, titleIndex);
  const titleLine = lines[titleIndex] || '';
  const summaryLine = lines[titleIndex + 1] || '';
  const contentLines = lines.slice(titleIndex + 2);
  const recipientsIndex = contentLines.findIndex((line) => /^Nơi\s+nhận/i.test(line));
  const bodyLines = recipientsIndex >= 0 ? contentLines.slice(0, recipientsIndex) : contentLines;
  const footerLines = recipientsIndex >= 0 ? contentLines.slice(recipientsIndex) : [];
  const signatureIndex = footerLines.findIndex((line, index) => index > 0 && /^(TM\.|KT\.|HIỆU TRƯỞNG|PHÓ HIỆU TRƯỞNG|TỔ TRƯỞNG|THỦ TRƯỞNG|NGƯỜI KÝ|NGƯỜI LÀM ĐƠN)/i.test(line));
  const recipientLines = signatureIndex > 0 ? footerLines.slice(0, signatureIndex) : footerLines.slice(0, 4);
  const signatureLines = signatureIndex > 0 ? footerLines.slice(signatureIndex) : footerLines.slice(4);

  const lineToP = (line, className = '', extraStyle = '') => `<p${className ? ` class="${className}"` : ''}${withTimesStyle(extraStyle)}>${escapeHtml(line)}</p>`;
  const lineHtmlToP = (innerHtml, className = '', extraStyle = '') => `<p${className ? ` class="${className}"` : ''}${withTimesStyle(extraStyle)}>${innerHtml}</p>`;
  const centerP = (line, className = '') => lineToP(line, className, 'text-align: center !important;');
  const isRomanHeading = (line = '') => {
    const value = String(line || '').trim();
    if (!/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/i.test(value)) return false;
    const label = value.replace(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/i, '').trim();
    return label.length > 0 && label === label.toUpperCase();
  };
  const bodyHtml = bodyLines.map((line) => {
    const value = String(line || '').trim();
    if (isRomanHeading(value)) {
      return lineToP(value, 'admin-section-heading', 'font-weight: bold !important; margin-top: 10pt !important; text-align: left !important;');
    }
    const articleMatch = value.match(/^(Điều\s+\d+[.:]?)(\s+.*)?$/i);
    if (articleMatch) {
      return lineHtmlToP(`<strong style="font-family: 'Times New Roman', Times, serif !important; font-weight: bold !important;">${escapeHtml(articleMatch[1])}</strong>${escapeHtml(articleMatch[2] || '')}`, 'admin-article-line', 'font-weight: normal !important; margin-top: 7pt !important; text-align: justify !important;');
    }
    return lineToP(value, '', 'font-weight: normal !important; text-align: justify !important;');
  }).join('\n');

  return `
    <div class="admin-preview-doc" style="font-family: 'Times New Roman', Times, serif !important; font-size: 13pt !important; line-height: 1.35 !important; color: #000 !important;">
      <div class="admin-preview-head" style="font-family: 'Times New Roman', Times, serif !important; display: grid; grid-template-columns: 1fr 1.08fr; gap: 18mm; align-items: start; margin-bottom: 10pt;">
        <div class="admin-preview-agency" style="font-family: 'Times New Roman', Times, serif !important;">${leftLines.map((line, index) => centerP(line, index < 2 ? 'strong center' : 'center')).join('\n')}</div>
        <div class="admin-preview-national" style="font-family: 'Times New Roman', Times, serif !important;">${rightLines.map((line, index) => centerP(line, index < 2 ? 'strong center' : index === rightLines.length - 1 ? 'center italic' : 'center')).join('\n')}</div>
      </div>
      <p class="admin-preview-title" style="font-family: 'Times New Roman', Times, serif !important; text-align: center !important; font-weight: bold !important; text-transform: uppercase !important; font-size: 14pt !important; margin: 14pt 0 2pt !important;">${escapeHtml(titleLine)}</p>
      ${summaryLine ? `<p class="admin-preview-summary" style="font-family: 'Times New Roman', Times, serif !important; text-align: center !important; font-weight: bold !important; margin: 0 0 12pt !important;">${escapeHtml(summaryLine)}</p>` : ''}
      <div class="admin-preview-body" style="font-family: 'Times New Roman', Times, serif !important;">${bodyHtml}</div>
      ${footerLines.length ? `<div class="admin-preview-footer" style="font-family: 'Times New Roman', Times, serif !important; display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 16pt; break-inside: avoid;">
        <div class="admin-preview-recipients" style="font-family: 'Times New Roman', Times, serif !important;">${recipientLines.map((line, index) => lineToP(line, index === 0 ? 'strong' : '', 'text-align: left !important;')).join('\n')}</div>
        <div class="admin-preview-signature" style="font-family: 'Times New Roman', Times, serif !important;">${signatureLines.map((line, index) => centerP(line, index === signatureLines.length - 1 ? 'strong' : index === signatureLines.length - 2 ? 'italic' : 'strong')).join('\n')}</div>
      </div>` : ''}
    </div>`;
}

function buildAdministrativeHtml(text = '', title = 'van-ban-hanh-chinh') {
  const body = adminTextToHtml(text);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 22mm 18mm 22mm 32mm; }
  html, body, body * { font-family: "Times New Roman", Times, serif !important; }
  body { margin: 0; background: #f4f4f4; color: #000; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 20mm 18mm 22mm 32mm; box-sizing: border-box; font-family: "Times New Roman", Times, serif !important; font-size: 13pt; line-height: 1.35; }
  p { margin: 0 0 8pt; text-align: justify; }
  .center { text-align: center; }
  .strong { font-weight: bold; }
  .doc-title { text-align: center; font-weight: bold; text-transform: uppercase; font-size: 14pt; margin: 12pt 0 8pt; }
  .admin-preview-head { display: grid; grid-template-columns: 1fr 1.08fr; gap: 18mm; align-items: start; margin-bottom: 10pt; }
  .admin-preview-head p { margin: 0 0 3pt; line-height: 1.2; }
  .admin-preview-title { text-align: center; font-weight: bold; text-transform: uppercase; font-size: 14pt; margin: 14pt 0 2pt; }
  .admin-preview-summary { text-align: center; font-weight: bold; margin: 0 0 12pt; }
  .admin-preview-body p { margin: 0 0 7pt; text-align: justify; }
  .admin-section-heading { font-weight: bold; margin-top: 10pt !important; text-align: left; }
  .admin-article-line { font-weight: normal; margin-top: 7pt !important; }
  .admin-preview-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 16pt; break-inside: avoid; }
  .admin-preview-signature p { text-align: center; }
  .admin-preview-recipients p { text-align: left; }
  .italic { font-style: italic; }
  @media print { body { background: #fff; } .page { width: auto; min-height: auto; padding: 0; } }
</style>
</head>
<body><main class="page">${body}</main></body>
</html>`;
}
function textToWordHtml(text = '', title = 'Văn bản hành chính') {
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page Section1 { size: 21cm 29.7cm; margin: 2.2cm 1.8cm 2.2cm 3.2cm; }
  div.Section1 { page: Section1; }
  body, p { font-family: "Times New Roman", Times, serif; font-size: 13pt; color: #000; line-height: 1.35; }
  p { margin: 0 0 8pt 0; text-align: justify; }
  .center { text-align: center; }
  .strong { font-weight: bold; }
  .doc-title { text-align: center; font-weight: bold; text-transform: uppercase; font-size: 14pt; margin: 12pt 0 8pt; }
  .admin-preview-head { display: grid; grid-template-columns: 1fr 1.08fr; gap: 18mm; align-items: start; margin-bottom: 10pt; }
  .admin-preview-head p { margin: 0 0 3pt; line-height: 1.2; }
  .admin-preview-title { text-align: center; font-weight: bold; text-transform: uppercase; font-size: 14pt; margin: 14pt 0 2pt; }
  .admin-preview-summary { text-align: center; font-weight: bold; margin: 0 0 12pt; }
  .admin-preview-body p { margin: 0 0 7pt; text-align: justify; }
  .admin-section-heading { font-weight: bold; margin-top: 10pt !important; text-align: left; }
  .admin-article-line { font-weight: normal; margin-top: 7pt !important; }
  .admin-preview-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 16pt; break-inside: avoid; }
  .admin-preview-signature p { text-align: center; }
  .admin-preview-recipients p { text-align: left; }
  .italic { font-style: italic; }
</style>
</head>
<body><div class="Section1">${adminTextToHtml(text)}</div></body></html>`;
}

function detectAdministrativeDocument(text = '') {
  const source = String(text || '').replace(/\u00a0/g, ' ').trim();
  const upper = source.toUpperCase();
  const foundType = DOC_TYPES.find((type) => upper.includes(type));
  const lines = source.split('\n').map((line) => line.trim()).filter(Boolean);
  const hasNationalTitle = /CỘNG\s+H[ÒO]A\s+X[ÃA]\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(source);
  const hasMotto = /Độc\s+lập\s*[-–]\s*Tự\s+do\s*[-–]\s*Hạnh\s+phúc/i.test(source);
  const hasAgency = lines.some((line) => line.length > 4 && line.length < 110 && line === line.toUpperCase() && !DOC_TYPES.some((type) => line.includes(type)) && !/CỘNG|ĐỘC LẬP|SỐ:/.test(line));
  const hasNumber = /Số\s*[:：]\s*\S+/i.test(source) || /\bSố\s+\d+\//i.test(source);
  const hasDate = /(ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})/i.test(source);
  const hasRecipients = /Nơi\s+nhận/i.test(source);
  const hasSignature = /(TM\.|KT\.|THỦ TRƯỞNG|HIỆU TRƯỞNG|TỔ TRƯỞNG|NGƯỜI KÝ|Ký tên|Đã ký)/i.test(source);
  const hasContent = source.length > 120;
  const fields = [
    { id: 'agency', label: 'Cơ quan ban hành', ok: hasAgency },
    { id: 'national', label: 'Quốc hiệu', ok: hasNationalTitle },
    { id: 'motto', label: 'Tiêu ngữ', ok: hasMotto },
    { id: 'number', label: 'Số/ký hiệu', ok: hasNumber },
    { id: 'date', label: 'Ngày tháng', ok: hasDate },
    { id: 'type', label: 'Tên loại/trích yếu', ok: Boolean(foundType) || /^V\/v\s+/im.test(source) },
    { id: 'content', label: 'Nội dung', ok: hasContent },
    { id: 'signature', label: 'Ký tên', ok: hasSignature },
    { id: 'recipients', label: 'Nơi nhận', ok: hasRecipients },
  ];
  const score = Math.round((fields.filter((field) => field.ok).length / fields.length) * 100);
  const typeLabel = foundType || (/V\/v\s+/i.test(source) ? 'CÔNG VĂN' : 'Chưa rõ');
  return {
    typeLabel,
    score,
    fields,
    missing: fields.filter((field) => !field.ok).map((field) => field.label),
    wordCount: source ? source.split(/\s+/).filter(Boolean).length : 0,
    charCount: source.length,
  };
}

async function readUploadedFile(file) {
  const name = file.name || 'document';
  const lower = name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (lower.endsWith('.docx')) {
    const mammoth = await loadMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  }
  if (lower.endsWith('.pdf')) {
    const pdfjsLib = await loadPdfjs();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const parts = [];
    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      parts.push(content.items.map((item) => item.str).join(' '));
    }
    return parts.join('\n\n');
  }
  return await file.text();
}

function compact(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function buildLocalAdministrativeDocument({ docType, docInfo, bodyText }) {
  const sampleInfo = { ...SAMPLE_DOC_INFO, titleSummary: SAMPLE_DOC_INFO.titleSummary };
  const info = { ...sampleInfo, ...(docInfo || {}) };
  const effectiveType = docType || 'KẾ HOẠCH';
  const content = String(bodyText || '').trim() || SAMPLE_BODY_BY_TYPE[effectiveType] || SAMPLE_BODY_BY_TYPE['KẾ HOẠCH'];
  const titleSummary = compact(info.titleSummary, SAMPLE_DOC_INFO.titleSummary);
  const numberSymbol = compact(info.numberSymbol, SAMPLE_DOC_INFO.numberSymbol);
  const placeDate = compact(info.placeDate, SAMPLE_DOC_INFO.placeDate);
  const parentAgency = compact(info.parentAgency, SAMPLE_DOC_INFO.parentAgency);
  const issuingUnit = compact(info.issuingUnit, SAMPLE_DOC_INFO.issuingUnit);
  const signerTitle = compact(info.signerTitle, SAMPLE_DOC_INFO.signerTitle);
  const signerName = compact(info.signerName, SAMPLE_DOC_INFO.signerName);
  const recipients = compact(info.recipients, SAMPLE_DOC_INFO.recipients);
  const recipientLine = (effectiveType === 'CÔNG VĂN' || effectiveType === 'GIẤY MỜI' || effectiveType === 'ĐƠN') && info.recipient ? `Kính gửi: ${info.recipient}\n\n` : '';

  return `${parentAgency}\n${issuingUnit}\nSố: ${numberSymbol}\n\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n________________________\n\n${placeDate}\n\n${effectiveType}\n${titleSummary}\n\n${recipientLine}${content}\n\nNơi nhận:\n${recipients}\n\n${signerTitle}\n(Ký, ghi rõ họ tên)\n\n\n${signerName}`;
}

function getSamplePreviewText(docType, docInfo) {
  return buildLocalAdministrativeDocument({
    docType: docType || 'KẾ HOẠCH',
    docInfo: { ...SAMPLE_DOC_INFO, ...(docInfo || {}) },
    bodyText: SAMPLE_BODY_BY_TYPE[docType] || SAMPLE_BODY_BY_TYPE['KẾ HOẠCH'],
  });
}

function buildAiInstruction({ mode, aiRequest, rawText, detected, docType, docInfo }) {
  const target = mode === 'create'
    ? 'TẠO MỚI văn bản hành chính từ yêu cầu nhập liệu và các trường thể thức.'
    : 'CHỈNH SỬA/CHUẨN HOÁ văn bản hành chính từ nội dung nguồn.';
  const missing = detected?.missing?.length ? detected.missing.join('; ') : 'Không rõ hoặc chưa nhận diện.';
  return `${ADMIN_RULES}

NHIỆM VỤ HIỆN TẠI: ${target}

Loại văn bản giáo viên chọn: ${docType}
Thông tin thể thức giáo viên đã nhập:
- Cơ quan chủ quản: ${docInfo.parentAgency || '[CẦN BỔ SUNG]'}
- Đơn vị ban hành: ${docInfo.issuingUnit || '[CẦN BỔ SUNG]'}
- Số/ký hiệu: ${docInfo.numberSymbol || '[CẦN BỔ SUNG]'}
- Địa danh/ngày tháng: ${docInfo.placeDate || '[CẦN BỔ SUNG]'}
- Trích yếu/tiêu đề: ${docInfo.titleSummary || '[CẦN BỔ SUNG]'}
- Kính gửi/đối tượng nhận: ${docInfo.recipient || '[Nếu có]'}
- Chức vụ người ký: ${docInfo.signerTitle || '[CẦN BỔ SUNG]'}
- Họ tên người ký: ${docInfo.signerName || '[CẦN BỔ SUNG]'}
- Nơi nhận: ${docInfo.recipients || '[CẦN BỔ SUNG]'}

Yêu cầu của giáo viên:
${aiRequest || '(Không có yêu cầu riêng)'}

Hệ thống nhận diện sơ bộ:
- Loại văn bản: ${detected?.typeLabel || 'Chưa rõ'}
- Mức đầy đủ thể thức: ${detected?.score ?? 0}%
- Thành phần còn thiếu: ${missing}

Nội dung nguồn:
${rawText || '(Không có nội dung nguồn; hãy tạo theo yêu cầu của giáo viên, nhưng trường thông tin chưa chắc chắn phải để [CẦN BỔ SUNG].)'}

TRẢ VỀ DUY NHẤT VĂN BẢN ĐÃ CHUẨN HOÁ, đúng thể thức hành chính, không dùng bảng markdown.`;
}

export default function TextCareStudio({ tool, language, apiKey, aiModel, hasApiKey }) {
  const [rawText, setRawText] = useState('');
  const [aiRequest, setAiRequest] = useState(DOC_TYPE_PROMPTS['KẾ HOẠCH']);
  const [docType, setDocType] = useState('KẾ HOẠCH');
  const [docInfo, setDocInfo] = useState(() => ({ ...DEFAULT_DOC_INFO }));
  const [output, setOutput] = useState('');
  const [previewAccepted, setPreviewAccepted] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [sourceMode, setSourceMode] = useState('paste');
  const [loadingFile, setLoadingFile] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState('');
  const [toast, showToast] = useToast();
  const [activeWorkflow, setActiveWorkflow] = useState('source');
  const sourceRef = useRef(null);
  const outputRef = useRef(null);
  const previewRef = useRef(null);

  const toolTitle = language === 'vi' ? tool.titleVi || tool.title : tool.title;
  const previewText = output || rawText || getSamplePreviewText(docType, docInfo);
  const rawDetected = useMemo(() => detectAdministrativeDocument(rawText), [rawText]);
  const detected = useMemo(() => detectAdministrativeDocument(previewText), [previewText]);
  const previewHtml = useMemo(() => buildAdministrativeHtml(previewText, toolTitle), [previewText, toolTitle]);
  const downloadableName = librarySlugify(detected.typeLabel !== 'Chưa rõ' ? detected.typeLabel : docType || toolTitle);

  const scrollToRef = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const workflowCards = [
    { id: 'source', icon: '📥', tone: 'rose', badge: language === 'vi' ? 'Đầu vào' : 'Source', title: language === 'vi' ? 'Nguồn nội dung' : 'Content source', desc: language === 'vi' ? 'Tải file, dán text hoặc mô tả để AI tạo.' : 'Upload a file, paste raw text, or describe the document.', cta: language === 'vi' ? 'Nhập nguồn' : 'Add source', action: () => { setActiveWorkflow('source'); scrollToRef(sourceRef); } },
    { id: 'format', icon: '🧾', tone: 'peach', badge: language === 'vi' ? 'Chuẩn hoá' : 'Normalize', title: language === 'vi' ? 'Nội dung sau AI' : 'AI-normalized content', desc: language === 'vi' ? 'Sửa kết quả chuẩn hoá trước khi preview.' : 'Review and edit the normalized content.', cta: language === 'vi' ? 'Xem kết quả' : 'View result', action: () => { setActiveWorkflow('format'); scrollToRef(outputRef); } },
    { id: 'preview', icon: '🖨️', tone: 'mint', badge: language === 'vi' ? 'Preview' : 'Preview', title: language === 'vi' ? 'Preview & tải xuống' : 'Preview & export', desc: language === 'vi' ? 'Kiểm tra A4 rồi tải Word, HTML hoặc TXT.' : 'Check the A4 preview before exporting Word/HTML/TXT.', cta: language === 'vi' ? 'Mở preview' : 'Open preview', action: () => { setActiveWorkflow('preview'); scrollToRef(previewRef); } },
  ];

  const setInfo = (key, value) => {
    setDocInfo((prev) => ({ ...prev, [key]: value }));
    setPreviewAccepted(false);
  };

  const chooseDocType = (type) => {
    setDocType(type);
    setAiRequest(DOC_TYPE_PROMPTS[type] || DOC_TYPE_PROMPTS['KẾ HOẠCH']);
    setOutput('');
    setPreviewAccepted(false);
    showToast(`Đã chọn mẫu ${type.toLowerCase()}.`);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setLoadingFile(true);
    setSourceName(file.name);
    setSourceMode('file');
    try {
      const text = await readUploadedFile(file);
      setRawText(text);
      setOutput('');
      setPreviewAccepted(false);
      const fileDetected = detectAdministrativeDocument(text);
      if (fileDetected.typeLabel !== 'Chưa rõ') setDocType(fileDetected.typeLabel);
      showToast(`Đã đọc file: ${file.name}`);
    } catch (err) {
      setError(`Không đọc được file này: ${err.message || err}`);
    } finally {
      setLoadingFile(false);
      event.target.value = '';
    }
  };

  const generateWithAi = async (mode = 'fix') => {
    setError('');
    if (!hasApiKey) {
      setError('Chưa có AI provider/API key. Vào Cài đặt để cấu hình trước.');
      return;
    }
    if (mode === 'fix' && !rawText.trim() && !aiRequest.trim()) {
      setError('Dán văn bản, tải file hoặc nhập yêu cầu AI trước.');
      return;
    }
    setLoadingAi(true);
    try {
      const activeDetected = rawDetected;
      const instruction = buildAiInstruction({ mode, aiRequest, rawText, detected: activeDetected, docType, docInfo });
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
      setPreviewAccepted(false);
      addHistoryEntry({
        kind: 'ai-output',
        toolSlug: 'textcare',
        toolTitle,
        title: `${docType} · ${(docInfo.titleSummary || aiRequest).slice(0, 70)}`,
        content: result,
        level: 'Nghị định 30/2020/NĐ-CP',
        tags: ['textcare', 'nghi-dinh-30', docType, activeDetected.typeLabel],
        model: aiModel,
      });
      showToast(mode === 'create' ? 'AI đã tạo dữ liệu và hệ thống đã nhận diện lại.' : 'AI đã chuẩn hoá văn bản và tạo preview.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoadingAi(false);
    }
  };

  const applyLocalTemplate = () => {
    const content = rawText || SAMPLE_BODY_BY_TYPE[docType] || SAMPLE_BODY_BY_TYPE['KẾ HOẠCH'];
    const formatted = buildLocalAdministrativeDocument({ docType, docInfo, bodyText: content });
    setOutput(formatted);
    setPreviewAccepted(false);
    showToast('Đã áp thể thức cục bộ để xem preview.');
  };

  const resetAll = () => {
    setRawText('');
    setOutput('');
    setSourceName('');
    setPreviewAccepted(false);
    setDocInfo({ ...DEFAULT_DOC_INFO });
    setError('');
  };

  const acceptPreview = () => {
    if (!previewText.trim()) {
      setError('Chưa có nội dung preview để duyệt.');
      return;
    }
    setPreviewAccepted(true);
    showToast('Đã duyệt preview. Có thể tải xuống.');
  };

  const downloadDoc = () => {
    if (!previewText.trim()) return;
    downloadFile(`${downloadableName}-nghi-dinh-30.doc`, textToWordHtml(previewText, toolTitle), 'application/msword;charset=utf-8');
  };

  const downloadHtml = () => {
    if (!previewText.trim()) return;
    downloadFile(`${downloadableName}-preview.html`, previewHtml, 'text/html;charset=utf-8');
  };

  const downloadTxt = () => {
    if (!previewText.trim()) return;
    downloadFile(`${downloadableName}.txt`, previewText, 'text/plain;charset=utf-8');
  };

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      showToast('Đã copy văn bản preview.');
    } catch {
      showToast('Trình duyệt không cho copy tự động.');
    }
  };

  const printPreview = () => {
    if (!previewText.trim()) return;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      setError('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up hoặc tải HTML để in.');
      return;
    }
    win.document.open();
    win.document.write(previewHtml);
    win.document.close();
    window.setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        // Nếu trình duyệt chặn lệnh in tự động, người dùng vẫn có tab preview để in thủ công.
      }
    }, 300);
  };

  const fullscreenPreview = async () => {
    const previewCard = previewRef.current;
    if (!previewCard) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (previewCard.requestFullscreen) {
        await previewCard.requestFullscreen();
      }
    } catch {
      setError('Trình duyệt không thể mở preview toàn màn hình.');
    }
  };

  return (
    <div className="page textcare-page textcare-v23 textcare-v29-page textcare-v37-page">
      <button className="back-btn textcare-v29-back textcare-v37-back" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>

      <section className="textcare-v37-shell">

        <main className="textcare-v37-main">
          <section className="textcare-v37-hero panel">
            <div className="textcare-v37-hero-art" aria-hidden="true">
              <div className="textcare-v37-platform" />
              <div className="textcare-v37-shield">✓</div>
              <div className="textcare-v37-document">
                <div className="textcare-v37-a4">A4</div>
                <i /><i /><i /><i />
                <div className="textcare-v37-signature">Brian English</div>
              </div>
              <div className="textcare-v37-checklist"><b>✓</b><b>✓</b><b>✓</b></div>
              <div className="textcare-v37-stamp">✓</div>
              <div className="textcare-v37-flow flow-one">Nhận diện</div>
              <div className="textcare-v37-flow flow-two">Chuẩn hoá</div>
              <div className="textcare-v37-flow flow-three">Xuất file</div>
            </div>

            <div className="textcare-v37-hero-copy">
              <span className="textcare-v37-tag">V2.3 • TextCare Administrative Workflow</span>
              <h1>Chuẩn hoá<br />văn bản hành chính</h1>
              <p>Tải file, dán text hoặc nhập yêu cầu AI. Hệ thống nhận diện, chuẩn hoá theo Nghị định 30/2020/NĐ-CP, preview A4 và xuất file theo chuẩn.</p>
              <div className="textcare-v37-hero-actions">
                <button className="primary" onClick={() => { setActiveWorkflow('format'); scrollToRef(outputRef); }}>Chuẩn Nghị định 30</button>
                <button onClick={() => { setActiveWorkflow('preview'); scrollToRef(previewRef); }}>Preview A4</button>
                <button onClick={downloadDoc} disabled={!previewText.trim()}>Tải Word</button>
                <button className="icon-only" onClick={() => generateWithAi('fix')} disabled={loadingAi}>AI</button>
              </div>
            </div>
          </section>

          <section className="textcare-v37-status-strip">
            <article>
              <div className="textcare-v37-status-icon green">AI</div>
              <div><strong>AI sẵn sàng</strong><span>{hasApiKey ? 'API connected • Mô hình hoạt động tốt' : 'Cần API key để chạy AI'}</span></div>
            </article>
            <article>
              <div className="textcare-v37-status-icon purple">DOC</div>
              <div><strong>Loại nhận diện</strong><span>{detected.typeLabel} • Nghị định 30/2020/NĐ-CP</span></div>
            </article>
            <article>
              <div className="textcare-v37-status-icon blue">A4</div>
              <div><strong>Preview A4</strong><span>{previewAccepted ? 'Đã duyệt • Sẵn sàng tải xuống' : 'Khổ giấy A4 • Lề chuẩn • Chờ duyệt'}</span></div>
            </article>
          </section>

          <section className="textcare-v37-workspace">
            <article ref={sourceRef} className="panel textcare-v37-card textcare-v37-source-card">
              <div className="textcare-v37-card-head">
                <div><span>01</span><h2>Nguồn dữ liệu đầu vào</h2></div>
                <small>Tải file, dán văn bản hoặc nhập yêu cầu AI</small>
              </div>

              <div className="textcare-v37-source-grid">
                <label className={`textcare-v37-dropzone ${sourceMode === 'file' ? 'active' : ''}`}>
                  <input type="file" accept=".txt,.md,.csv,.html,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFile} />
                  <span className="textcare-v37-upload-icon">↑</span>
                  <strong>{loadingFile ? 'Đang đọc file...' : 'Kéo thả file vào đây hoặc chọn file'}</strong>
                  <small>Hỗ trợ DOCX, PDF, TXT và văn bản thuần</small>
                </label>

                <div className="textcare-v37-source-fields">
                  <label>Nội dung nguồn</label>
                  <textarea
                    value={rawText}
                    onChange={(e) => { setRawText(e.target.value); setOutput(''); setPreviewAccepted(false); setSourceMode('paste'); }}
                    rows={7}
                    placeholder="Dán nội dung văn bản tại đây..."
                  />
                  <div className="textcare-v37-mini-meta"><span>{sourceName || 'Chưa chọn file'}</span><b>{rawText.length.toLocaleString('vi-VN')} ký tự</b></div>
                </div>
              </div>

              <label>Yêu cầu AI / mô tả văn bản cần tạo</label>
              <textarea
                className="textcare-v37-ai-request"
                value={aiRequest}
                onChange={(e) => { setAiRequest(e.target.value); setSourceMode('ai'); setPreviewAccepted(false); }}
                rows={3}
                placeholder="Mô tả văn bản cần tạo hoặc yêu cầu chỉnh sửa..."
              />

              <div className="textcare-v37-card-actions">
                <button className="primary" onClick={() => generateWithAi('create')} disabled={loadingAi}>{loadingAi ? 'Đang xử lý...' : 'AI tạo dữ liệu'}</button>
                <button onClick={() => generateWithAi('fix')} disabled={loadingAi}>{loadingAi ? 'Đang chuẩn hoá...' : 'AI chuẩn hoá NĐ30'}</button>
                <button onClick={applyLocalTemplate}>Áp thể thức nhanh</button>
                <button onClick={resetAll}>Làm mới</button>
              </div>
              {error && <p className="error-box">⚠️ {error}</p>}
            </article>

            <article ref={outputRef} className="panel textcare-v37-card textcare-v37-rules-card">
              <div className="textcare-v37-card-head">
                <div><span>02</span><h2>Điều khiển AI & Quy tắc chuẩn hoá</h2></div>
                <small>Thiết lập mẫu, thể thức và thông tin văn bản</small>
              </div>

              <div className="textcare-v37-control-grid">
                <label>Loại văn bản
                  <select value={docType} onChange={(e) => chooseDocType(e.target.value)}>
                    {DOC_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label>Chuẩn áp dụng
                  <select defaultValue="nd30"><option value="nd30">Nghị định 30/2020/NĐ-CP</option></select>
                </label>
                <label>Cơ quan chủ quản<input value={docInfo.parentAgency} onChange={(e) => setInfo('parentAgency', e.target.value)} placeholder="SỞ GIÁO DỤC VÀ ĐÀO TẠO..." /></label>
                <label>Đơn vị ban hành<input value={docInfo.issuingUnit} onChange={(e) => setInfo('issuingUnit', e.target.value)} placeholder="TRƯỜNG THPT..." /></label>
                <label>Số / ký hiệu<input value={docInfo.numberSymbol} onChange={(e) => setInfo('numberSymbol', e.target.value)} placeholder="12/KH-THPT" /></label>
                <label>Địa danh, ngày tháng<input value={docInfo.placeDate} onChange={(e) => setInfo('placeDate', e.target.value)} placeholder="TP. Hồ Chí Minh, ngày..." /></label>
                <label className="wide">Trích yếu / tiêu đề<input value={docInfo.titleSummary} onChange={(e) => setInfo('titleSummary', e.target.value)} placeholder="Tên hoặc trích yếu văn bản" /></label>
                <label>Chức vụ người ký<input value={docInfo.signerTitle} onChange={(e) => setInfo('signerTitle', e.target.value)} placeholder="TỔ TRƯỞNG CHUYÊN MÔN" /></label>
                <label>Họ tên người ký<input value={docInfo.signerName} onChange={(e) => setInfo('signerName', e.target.value)} placeholder="NGUYỄN VĂN A" /></label>
              </div>

              <div className="textcare-v37-detection-summary">
                <div><span>Mức đầy đủ</span><strong>{detected.score}%</strong></div>
                <div><span>Dung lượng</span><strong>{detected.wordCount} từ</strong></div>
                <div><span>Trạng thái</span><strong>{previewAccepted ? 'Đã duyệt' : 'Chờ duyệt'}</strong></div>
              </div>
              <div className="textcare-v37-checks">
                {detected.fields.slice(0, 6).map((field) => <span key={field.id} className={field.ok ? 'ok' : ''}>{field.ok ? '✓' : '○'} {field.label}</span>)}
              </div>
            </article>

            <article ref={previewRef} className="panel textcare-v37-card textcare-v37-preview-card">
              <div className="textcare-v37-card-head preview-headline">
                <div><span>03</span><h2>Preview A4</h2></div>
                <div className="textcare-v37-preview-actions">
                  <button onClick={copyPreview} disabled={!previewText.trim()}>Sao chép</button>
                  <button onClick={printPreview} disabled={!previewText.trim()}>In</button>
                  <button onClick={downloadDoc} disabled={!previewText.trim()}>Tải xuống</button>
                  <button onClick={fullscreenPreview} disabled={!previewText.trim()}>Toàn màn hình</button>
                  <button className="primary" onClick={acceptPreview} disabled={!previewText.trim()}>Duyệt preview</button>
                </div>
              </div>
              <div className="textcare-v37-preview-toolbar">
                <span>−</span><b>100%</b><span>+</span><i />
                <b>Trang 1 / 1</b>
                <span>↗</span>
              </div>
              <div className="textcare-v37-a4-wrap isolated-times-preview">
                <iframe className="textcare-a4-frame textcare-v37-a4-frame" title="Preview văn bản hành chính Times New Roman" srcDoc={previewHtml} sandbox="allow-same-origin" />
              </div>
            </article>

          </section>
        </main>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
