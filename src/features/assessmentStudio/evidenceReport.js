import { moduleFor, RUBRICS } from './catalogue.js';
import { summarizeResults } from './assessmentMath.js';

export const escapeEvidenceHtml = value => String(value ?? '')
 .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const dateString = iso => iso ? new Date(iso).toLocaleDateString('vi-VN') : 'Chưa ghi nhận';
const tr = (...cols) => '<tr>'+cols.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>';
const labelStatus = value => ({planned:'Đã lập kế hoạch',implemented:'Giáo viên xác nhận đã thực hiện',reviewed:'Giáo viên xác nhận đã đánh giá lại'})[value]||value;

function assessmentInstrument(assessment){
  const kind=assessment.kind, config=assessment.config||{};
  let instrument='';
  if(RUBRICS[kind]) {
    instrument='<p>Bảng rubric: 0–4 điểm cho mỗi tiêu chí (giáo viên/nguồn đánh giá nhập trực tiếp).</p>'+
      '<table><thead><tr><th>Tiêu chí</th><th>Điểm tối đa</th></tr></thead><tbody>'+
      RUBRICS[kind].map(c=>tr(escapeEvidenceHtml(c),'4')).join('')+'</tbody></table>';
  } else if(kind==='self'){
    instrument='<p>Tự đánh giá theo thang 1–4. Đây là dữ liệu tự nhận thức, KHÔNG phải điểm kiểm tra năng lực khách quan.</p>'+
      '<ol>'+(config.statements||[]).map(s=>'<li>'+escapeEvidenceHtml(s)+'</li>').join('')+'</ol>';
  } else if(kind==='error'||kind==='rewrite'){
    instrument='<table><thead><tr><th>#</th><th>Yêu cầu</th><th>Đáp án tham khảo</th><th>Chủ điểm</th></tr></thead><tbody>'+
      (config.questions||[]).map((q,i)=>tr(i+1,escapeEvidenceHtml(q.prompt),escapeEvidenceHtml(q.sampleAnswer),escapeEvidenceHtml(q.topic))).join('')+'</tbody></table>'+
      '<p>Giáo viên quyết định Đạt hoặc Chưa đạt với từng bài làm; không tự chấm ngữ nghĩa.</p>';
  } else {
    if(kind==='reading'){
      instrument+='<h3>Đoạn văn</h3>'+(config.paragraphs||[]).map((p,i)=>'<p><b>P'+(i+1)+'.</b> '+escapeEvidenceHtml(p)+'</p>').join('');
    }
    if(kind==='listening') instrument+='<p><b>Đường dẫn tài liệu nghe:</b> '+escapeEvidenceHtml(config.audioUrl||'Chưa gắn')+'</p>';
    instrument+='<table><thead><tr><th>#</th><th>Câu hỏi và lựa chọn</th><th>Đáp án</th><th>Chủ điểm</th></tr></thead><tbody>'+
      (config.questions||[]).map((q,i)=>tr(i+1,
        escapeEvidenceHtml(q.stem)+'<br/>'+(q.options||[]).map((v,j)=>'ABCD'[j]+'. '+escapeEvidenceHtml(v)).join('<br/>'),
        escapeEvidenceHtml(q.correct)+(kind==='reading'?' / '+escapeEvidenceHtml(q.evidence):''),
        escapeEvidenceHtml(q.topic))).join('')+'</tbody></table>';
  }
  return instrument;
}

export function buildEvidenceHtml({assessment,results=[],adjustments=[],paired=null,includeNames=false,readiness=null,preparedAt=new Date()}){
  if(!assessment)throw new Error('Chưa chọn bài đánh giá.');
  const safe=escapeEvidenceHtml;
  const stats=summarizeResults(results);
  const module=moduleFor(assessment.kind);
  const resultsTable='<table><thead><tr><th>STT</th><th>Học sinh</th><th>Điểm</th><th>Ngày</th></tr></thead><tbody>'+
    results.map((r,i)=>tr(i+1,includeNames?safe(r.student_name):'HS '+String(i+1).padStart(2,'0'),
      safe(r.score)+' / '+safe(r.max_score),safe(dateString(r.assessed_at)))).join('')+'</tbody></table>';
  const topics=Object.entries(stats.topics).map(([t,v])=>tr(safe(t),safe(v.achieved)+' / '+safe(v.total),
    v.total?(v.achieved/v.total*100).toFixed(1)+'%':'—')).join('');
  const criteria=assessment.config?.criteria||assessment.config?.statements||RUBRICS[assessment.kind]||[];
  const criterionRows=criteria.map(name=>{
    const scores=results.map(r=>Number(r.breakdown?.criteria?.[name])).filter(Number.isFinite);
    const average=scores.length?(scores.reduce((sum,n)=>sum+n,0)/scores.length).toFixed(2):'—';
    return tr(safe(name),safe(average)+' / 4',safe(scores.length));
  }).join('');
  const analysis=topics?'<table><thead><tr><th>Chủ điểm</th><th>Lượt đạt</th><th>Tỷ lệ</th></tr></thead><tbody>'+topics+'</tbody></table>':
    criterionRows?'<table><thead><tr><th>Tiêu chí</th><th>Trung bình</th><th>Số lượt có điểm</th></tr></thead><tbody>'+criterionRows+'</tbody></table>':
    '<p>Chưa có dữ liệu theo chủ điểm hoặc tiêu chí.</p>';
  const adj=adjustments.length?adjustments.map((a,i)=>
    '<article><b>Ghi nhận '+(i+1)+': '+safe(labelStatus(a.status))+'</b>'+
    '<p><b>Vấn đề phát hiện:</b> '+safe(a.finding)+'</p>'+
    '<p><b>Biện pháp giáo viên ghi nhận:</b> '+safe(a.action_taken)+'</p>'+
    '<p><b>Ngày triển khai:</b> '+safe(a.implementation_date||'Chưa thực hiện')+'</p>'+
    '<p><b>Mô tả minh chứng:</b> '+safe(a.evidence_note||'Chưa đính kèm minh chứng gốc')+'</p>'+
    '<p><b>Nhận xét sau can thiệp:</b> '+safe(a.followup_result||'Chưa có')+'</p></article>').join(''):
    '<p>Chưa có nhật ký điều chỉnh dạy học.</p>';
  const comparison=paired?.pairs?
    '<p>Ghép theo mã học sinh: <b>'+paired.pairs+'</b> em; bình quân trước: <b>'+
    paired.beforeAverage.toFixed(1)+'%</b>; sau: <b>'+paired.afterAverage.toFixed(1)+'%</b>; thay đổi: <b>'+
    (paired.change>=0?'+':'')+paired.change.toFixed(1)+' điểm phần trăm</b>.</p>':
    '<p>Chưa đủ kết quả trước–sau có cùng mã học sinh để đối chiếu.</p>';
  const completeness=readiness
    ? '<h2>Tình trạng hoàn thiện hồ sơ (kiểm tra kỹ thuật)</h2><p><b>'+readiness.count+'/'+readiness.total+
      ' thành phần được ghi nhận.</b> Không thay thế kết luận của hội đồng thi đua.</p><ul>'+
      readiness.checks.map(check=>'<li>'+(check.ok?'Đã có':'Chưa đủ')+': '+safe(check.label)+'</li>').join('')+'</ul>'
    : '';
  const footer='Sản phẩm học liệu số BRIAN · Báo cáo tự động từ dữ liệu giáo viên nhập, không tích hợp AI. Chỉ xem đây là hồ sơ minh chứng sau khi đối chiếu tài liệu gốc.';
  return '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/><title>BRIAN · Minh chứng đánh giá</title>'+
    '<style>body{font:14px/1.55 Arial,sans-serif;color:#25344a;max-width:850px;margin:35px auto;padding:0 20px}'+
    'h1{font-size:24px;margin-bottom:8px}h2{font-size:18px;margin-top:26px;border-bottom:1px solid #d5dfea;padding-bottom:7px}'+
    'h3{font-size:15px}p{margin:8px 0}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #c9d3df;padding:7px;vertical-align:top;text-align:left}'+
    'th{background:#eef4fc}article{padding:12px;border:1px solid #ddd;border-radius:8px;margin:10px 0}'+
    '.meta{background:#eef4fc;padding:15px;border-radius:10px}.foot{font-size:11px;color:#526078;margin:40px 0 10px}'+
    '.warning{color:#744921}.actions{margin:20px 0}button{padding:10px 16px}@media print{body{margin:0;padding:0}button{display:none}table,article{break-inside:avoid}}'+
    '</style></head><body><h1>HỒ SƠ MINH CHỨNG ĐỔI MỚI KIỂM TRA, ĐÁNH GIÁ</h1>'+
    '<div class="meta"><b>BRIAN Assessment Studio — '+safe(module?.name||assessment.kind)+'</b>'+
    '<p><b>Đợt:</b> '+safe(assessment.title)+'</p><p><b>Lớp:</b> '+safe(assessment.class_label||'Chưa khai báo')+
    ' · <b>Mục tiêu:</b> '+safe(assessment.objective||'Chưa khai báo')+'</p>'+
    '<p><b>Ngày tạo bài:</b> '+safe(dateString(assessment.created_at))+' · <b>Ngày xuất:</b> '+safe(preparedAt.toLocaleDateString('vi-VN'))+'</p></div>'+
    completeness+'<h2>1. Công cụ và phương pháp đánh giá</h2><p>'+safe(module?.description||'')+'</p>'+assessmentInstrument(assessment)+
    '<h2>2. Kết quả đánh giá ban đầu</h2><p>Tổng số lượt đánh giá: <b>'+stats.count+
    '</b> · Trung bình theo phần trăm tối đa: <b>'+stats.average.toFixed(1)+'%</b>.</p>'+
    (assessment.kind==='self'?'<p class="warning">Lưu ý: chỉ số CanDo là mức tự đánh giá, không chứng minh chuẩn năng lực.</p>':'')+
    resultsTable+'<h3>Phân tích theo chủ điểm / tiêu chí</h3>'+analysis+
    '<h2>3. Điều chỉnh hoạt động dạy học</h2>'+adj+
    '<h2>4. Đánh giá lại và nhận xét</h2>'+comparison+
    '<p>Chênh lệch điểm không tự chứng minh quan hệ nhân quả. Giáo viên cần đối chiếu tính tương đương của hai bài và xác nhận việc thực hiện can thiệp.</p>'+
    '<h2>5. Kiểm tra tài liệu gốc</h2><p class="warning">Báo cáo chỉ chứa dữ liệu đã nhập; các tệp giáo án, bài làm, ảnh hoạt động và bản rubric gốc phải được lưu kèm bên ngoài nếu cần thẩm định.</p>'+
    '<div class="foot">'+safe(footer)+'</div><div class="actions"><button onclick="window.print()">In / Lưu PDF</button></div></body></html>';
}
