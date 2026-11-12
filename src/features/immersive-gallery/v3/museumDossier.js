import {LIVE_STAGES} from './liveLesson.js';
import {LESSON_RESOURCES,OFFLINE_GUIDE,CONCLUSION} from './lessonResources.js';
import {RUBRIC} from './museumData.js';
const html=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const docShell=(title,body)=>'<!doctype html><html><head><meta charset="utf-8"><title>'+html(title)+'</title><style>body{font-family:Arial,sans-serif;margin:35px;font-size:12pt;line-height:1.6;color:#111}h1{font-size:20pt;color:#174ea6}h2{font-size:14pt;margin-top:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:7px;text-align:left}em{color:#555}</style></head><body>'+body+'</body></html>';
export function p1Document(fields,assignment){
 const lines=[
 ['Họ và tên giáo viên',fields.teacher],
 ['Năm sinh',fields.birthYear],
 ['Giới tính',fields.gender],
 ['Môn dự thi','Tiếng Anh'],
 ['Cấp học','THPT'],
 ['Thâm niên công tác',fields.experience],
 ['Đơn vị',fields.school],
 ['Điện thoại liên hệ',fields.phone],
 ['Chủ đề',assignment?.title||fields.topic],
 ['Bối cảnh thực hiện',fields.context],
 ['Kiến thức, kỹ năng nền',fields.foundation],
 ['Kiến thức, kỹ năng được hình thành',fields.outcomes],
 ['Năng lực, phẩm chất',fields.competencies],
 ['Thời lượng', '2 tiết (dự kiến 45 phút/tiết)'],
 ['Không gian',fields.space],
 ['Mục tiêu cần đạt',fields.objectives]
 ];
 return docShell('Phần 1: Tổng quan', '<h1>PHẦN 1 — TỔNG QUAN</h1><p><em>Bản nháp cần giáo viên rà soát và xác nhận trước khi nộp.</em></p><table>'+
  lines.map(([k,v])=>'<tr><th width="37%">'+html(k)+'</th><td>'+html(v||'[Cần bổ sung]')+'</td></tr>').join('')+
  '</table><p><b>Lưu ý:</b> Bản này được tạo từ thông tin giáo viên cung cấp, không phải bản xác nhận của đơn vị.</p>');
}
export function p2Document(fields,assignment){
 const topic=assignment?.title||fields.topic||'Climate Action Museum';
 const rows=LIVE_STAGES.map(s=>['Tiết '+s.period+' · '+s.minutes+' phút',s.title+' / '+s.vi,s.teaching,s.question+' '+s.sentence,s.expected]);
 const rubric=RUBRIC.map(c=>'<tr><td>'+html(c.label)+'</td><td>'+c.max+'</td><td>'+html(c.help)+'</td></tr>').join('');
 return docShell('Phần 2: Kế hoạch dạy học','<h1>PHẦN 2 — KẾ HOẠCH DẠY HỌC</h1><p><em>BẢN NHÁP · Cần đối chiếu CT GDPT 2018, SGK đang sử dụng và thực tế lớp học trước khi nộp.</em></p>'+
 '<h2>Chủ đề</h2><p>'+html(topic)+' · Tiếng Anh · THPT · 2 tiết</p>'+
 '<h2>Vấn đề cần giải quyết</h2><p>'+html(fields.drivingQuestion||'How can we make our school greener and explain the solution persuasively in English?')+'</p>'+
 '<h2>Kiến thức nền và yêu cầu cần đạt</h2><p>'+html(fields.foundation||'[Giáo viên bổ sung kiến thức nền được kiểm chứng]')+'</p>'+
 '<h2>Mục tiêu</h2><p>'+html(fields.objectives||'[Giáo viên bổ sung mục tiêu ngôn ngữ và năng lực]')+'</p>'+
 '<h2>Tiến trình dạy học (mẫu dự kiến)</h2><table><tr><th>Thời điểm</th><th>Hoạt động</th><th>Giáo viên tổ chức</th><th>Học sinh thực hiện</th><th>Sản phẩm và đánh giá</th></tr>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+html(c)+'</td>').join('')+'</tr>').join('')+'</table>'+
 '<h2>Ngữ liệu và nhiệm vụ có nguồn</h2>'+LESSON_RESOURCES.map(c=>'<h3>'+html(c.title)+'</h3><p>'+html(c.text)+'</p><p>'+html(c.task)+'</p><p>'+html(c.source)+' '+html(c.url||'')+'</p>').join('')+
 '<h2>Kết luận và vận dụng</h2><p>'+html(CONCLUSION)+'</p><h2>Phương án khi mất mạng</h2><p>'+html(OFFLINE_GUIDE)+'</p>'+
 '<h2>Rubric đánh giá nội bộ (không phải rubric chính thức của hội thi)</h2><table><tr><th>Tiêu chí</th><th>Điểm</th><th>Mô tả</th></tr>'+rubric+'</table>'+
 '<h2>Minh chứng cần đính kèm</h2><ul><li>Nguồn dữ liệu/học liệu hợp pháp; phiếu học tập số</li><li>Bản thiết kế, ảnh/clip thao tác lớp học có sự cho phép</li><li>Triển lãm học sinh, phản hồi bạn học và nhật ký chỉnh sửa</li><li>Phiếu rubric thực tế và kết quả tự đánh giá</li></ul>'+
 '<p><b>Cảnh báo:</b> Chỉ sử dụng minh chứng có thật. Không tạo dữ liệu lớp học, hiệu quả hay phản hồi học sinh giả.</p>');
}
