import { moduleFor, RUBRICS } from './catalogue.js';
import { escapeEvidenceHtml as h } from './evidenceReport.js';

function header(assessment) {
  const m=moduleFor(assessment.kind);
  return '<header><p class="eyebrow">BRIAN ENGLISH · '+h(m?.name||'Assessment')+'</p>'+
    '<h1>'+h(assessment.title)+'</h1>'+
    '<p><b>Lớp:</b> '+h(assessment.class_label||'________')+
    ' &nbsp; <b>Mục tiêu:</b> '+h(assessment.objective||'________')+'</p>'+
    '<div class="identity"><b>Họ và tên:</b> ____________________________________ &nbsp; <b>Mã học sinh:</b> ______________</div></header>';
}

function body(assessment) {
  const kind=assessment.kind, config=assessment.config||{};
  if (RUBRICS[kind]) {
    const criteria=RUBRICS[kind];
    return '<p class="intro">Rubric đánh giá. Giáo viên hoặc người được phân công ghi nhận kết quả sau hoạt động.</p>'+
      (kind==='peer'?'<p>Người đánh giá: ______________________________</p>':'')+
      (kind==='writing'?'<p>Nhiệm vụ viết: '+h(assessment.objective||'Theo yêu cầu giáo viên')+'</p>':'')+
      '<table><thead><tr><th>Tiêu chí</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead><tbody>'+
      criteria.map(c=>'<tr><td>'+h(c)+'</td>'+[0,1,2,3,4].map(()=>'<td>○</td>').join('')+'</tr>').join('')+'</tbody></table>'+
      (kind==='writing'?'<p>Không gian bài viết:</p><div class="writing-lines"></div>':'')+
      '<p>Nhận xét: ___________________________________________________________________________</p>';
  }
  if (kind==='self') {
    return '<p>Đánh dấu một mức độ phù hợp với khả năng của em: 1 = chưa tự tin; 4 = có thể thực hiện độc lập.</p>'+
      (config.statements||[]).map((s,i)=>'<p class="statement"><b>'+(i+1)+'.</b> '+h(s)+
        '<span class="levels"> □ 1 &nbsp; □ 2 &nbsp; □ 3 &nbsp; □ 4</span></p>').join('');
  }
  if (kind==='error'||kind==='rewrite') {
    return (config.questions||[]).map((q,i)=>'<div class="question"><b>Câu '+(i+1)+'.</b> '+h(q.prompt)+
      '<div class="answerline">Trả lời: ____________________________________________________________________________</div></div>').join('');
  }
  const paragraphs=kind==='reading' ? '<section class="passage"><h2>Reading passage</h2>'+
      (config.paragraphs||[]).map((p,i)=>'<p><b>P'+(i+1)+'.</b> '+h(p)+'</p>').join('')+'</section>' : '';
  const note=kind==='listening'?'<p><b>Listening:</b> Giáo viên phát nội dung nghe theo kế hoạch kiểm tra.</p>':'';
  return note+paragraphs+(config.questions||[]).map((q,i)=>'<div class="question">'+
    '<p><b>Câu '+(i+1)+'.</b> '+h(q.stem)+'</p>'+
    '<div class="options">'+(q.options||[]).map((option,index)=>
      '<div>□ <b>'+('ABCD'[index])+'.</b> '+h(option)+'</div>').join('')+'</div>'+
    (kind==='reading'?'<p>Vị trí dẫn chứng em chọn: ________ (P1, P2, ...)</p>':'')+'</div>').join('')+
    (kind==='exit'?'<p><b>Em còn chưa hiểu nội dung nào?</b> ________________________________________________________</p>':'');
}

/** A blank, printable handout. Deliberately excludes correct answers,
 *  answer keys, sample answers, and grading decisions. */
export function buildBlankStudentHandout(assessment) {
  if (!assessment || !moduleFor(assessment.kind)) throw new Error('Không tìm thấy công cụ đánh giá.');
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"/><title>BRIAN · Phiếu đánh giá học sinh</title>'+
    '<style>body{font:15px/1.55 Arial,sans-serif;max-width:810px;margin:30px auto;color:#25354b;padding:0 22px}'+
    'h1{font-size:23px;margin:5px 0}h2{font-size:17px}.eyebrow{font-size:11px;letter-spacing:.1em;color:#315fc4;font-weight:bold}'+
    '.identity{border:1px solid #d5dce8;padding:12px 10px;margin:20px 0;border-radius:7px}'+
    '.question{margin:18px 0;break-inside:avoid}.options{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin:10px 0 13px}'+
    '.passage p{line-height:1.75}.answerline{margin-top:20px}.statement{padding:8px;border-bottom:1px solid #eee}'+
    '.levels{display:block;padding:8px 0 0}table{border-collapse:collapse;width:100%}th,td{padding:10px;border:1px solid #bcc9da;text-align:center}'+
    'td:first-child{text-align:left}.writing-lines{height:340px;background:repeating-linear-gradient(white 0px,white 34px,#aebed2 35px);margin-bottom:24px}'+
    '.actions{margin:22px 0}button{padding:10px 16px}@media print{.actions{display:none}body{margin:0;padding:0}}</style></head>'+
    '<body>'+header(assessment)+body(assessment)+
    '<p style="margin-top:32px;font-size:11px;color:#64748b">BRIAN Assessment Studio · Phiếu sử dụng trong lớp · Không sử dụng AI</p>'+
    '<div class="actions"><button onclick="window.print()">In / Lưu PDF</button></div></body></html>';
}
