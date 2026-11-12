import React,{useMemo,useState} from 'react';
import {ArrowRight,Award,BookOpen,CheckCircle2,Circle,ClipboardCheck,Download,FileArchive,FileCheck2,FileDown,FileText,Info,Presentation,Printer,ShieldCheck,Star,UploadCloud} from 'lucide-react';
import {LESSON_KITS,RUBRIC,buildProgressCsv,scoreRubric} from './museumData.js';
import {saveTextFile,fmtDate} from './museumApi.js';
const tr=(l,vi,en)=>l==='en'?en:vi;
const html=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const docShell=(title,body)=>'<!doctype html><html><head><meta charset="utf-8"><title>'+html(title)+'</title><style>body{font-family:Arial,sans-serif;margin:35px;font-size:12pt;line-height:1.6;color:#111}h1{font-size:20pt;color:#174ea6}h2{font-size:14pt;margin-top:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:7px;text-align:left}em{color:#555}</style></head><body>'+body+'</body></html>';
function p1Document(fields,assignment){
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
function p2Document(fields,assignment){
 const topic=assignment?.title||fields.topic||'Climate Action Museum';
 const rows=[
  ['Tiết 1 · 5 phút','Đặt vấn đề thực tiễn, câu hỏi định hướng','Nhận diện vấn đề môi trường'],
  ['Tiết 1 · 8 phút','Tiếp nhận ngữ liệu tiếng Anh','Ghi nhận thông tin và từ vựng'],
  ['Tiết 1 · 10 phút','Phân tích nguồn, bằng chứng','Evidence cards có nguồn'],
  ['Tiết 1 · 15 phút','Lập phương án trưng bày','Bản thiết kế triển lãm'],
  ['Tiết 1 · 7 phút','Đánh giá thiết kế ban đầu','Bảng kiểm'],
  ['Tiết 2 · 15 phút','Chế tạo bảo tàng từ ba hiện vật tiếng Anh','Triển lãm số 2D/3D'],
  ['Tiết 2 · 10 phút','Thử nghiệm với bạn học','Phản hồi thực tế'],
  ['Tiết 2 · 10 phút','Chỉnh sửa theo phản hồi','Nhật ký cải tiến'],
  ['Tiết 2 · 8 phút','Báo cáo và thảo luận','Trình bày tiếng Anh'],
  ['Tiết 2 · 2 phút','Kết luận và exit ticket','Phản ánh học tập']
 ];
 const rubric=RUBRIC.map(c=>'<tr><td>'+html(c.label)+'</td><td>'+c.max+'</td><td>'+html(c.help)+'</td></tr>').join('');
 return docShell('Phần 2: Kế hoạch dạy học','<h1>PHẦN 2 — KẾ HOẠCH DẠY HỌC</h1><p><em>BẢN NHÁP · Cần đối chiếu CT GDPT 2018, SGK đang sử dụng và thực tế lớp học trước khi nộp.</em></p>'+
 '<h2>Chủ đề</h2><p>'+html(topic)+' · Tiếng Anh · THPT · 2 tiết</p>'+
 '<h2>Vấn đề cần giải quyết</h2><p>'+html(fields.drivingQuestion||'How can we make our school greener and explain the solution persuasively in English?')+'</p>'+
 '<h2>Kiến thức nền và yêu cầu cần đạt</h2><p>'+html(fields.foundation||'[Giáo viên bổ sung kiến thức nền được kiểm chứng]')+'</p>'+
 '<h2>Mục tiêu</h2><p>'+html(fields.objectives||'[Giáo viên bổ sung mục tiêu ngôn ngữ và năng lực]')+'</p>'+
 '<h2>Tiến trình dạy học (mẫu dự kiến)</h2><table><tr><th>Thời điểm</th><th>Hoạt động</th><th>Sản phẩm, minh chứng</th></tr>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+html(c)+'</td>').join('')+'</tr>').join('')+'</table>'+
 '<h2>Rubric đánh giá nội bộ (không phải rubric chính thức của hội thi)</h2><table><tr><th>Tiêu chí</th><th>Điểm</th><th>Mô tả</th></tr>'+rubric+'</table>'+
 '<h2>Minh chứng cần đính kèm</h2><ul><li>Nguồn dữ liệu/học liệu hợp pháp; phiếu học tập số</li><li>Bản thiết kế, ảnh/clip thao tác lớp học có sự cho phép</li><li>Triển lãm học sinh, phản hồi bạn học và nhật ký chỉnh sửa</li><li>Phiếu rubric thực tế và kết quả tự đánh giá</li></ul>'+
 '<p><b>Cảnh báo:</b> Chỉ sử dụng minh chứng có thật. Không tạo dữ liệu lớp học, hiệu quả hay phản hồi học sinh giả.</p>');
}
export default function MuseumEvidence({data,currentUser,onDemo,language='vi'}){
 const assignments=data?.assignments||[],reviews=data?.reviews||[],rubrics=data?.rubrics||[];
 const [assignmentId,setAssignmentId]=useState(assignments[0]?.id||'');
 const selected=assignments.find(a=>a.id===assignmentId)||assignments[0];
 const [fields,setFields]=useState({
  teacher:currentUser?.full_name||currentUser?.name||'',
  birthYear:'',gender:'',experience:'',school:data?.profile?.school||'',phone:'',
  topic:'Climate Action Museum',context:'',foundation:'',outcomes:'',
  competencies:'',space:'Trong lớp học',objectives:'',drivingQuestion:''
 });
 const localReviews=selected?reviews.filter(r=>data.groups?.some(g=>g.id===r.group_id&&g.assignment_id===selected.id)):[];
 const approved=localReviews.filter(r=>['approved_locked','published'].includes(r.state));
 const hasScore=localReviews.some(r=>rubrics.some(s=>s.review_id===r.id));
 const completeProfile=Boolean(fields.teacher&&fields.birthYear&&fields.gender&&fields.experience&&fields.school&&fields.phone);
 const checklist=[
  {label:'Phần 1: Thông tin giáo viên và bối cảnh',done:completeProfile,desc:'Kiểm tra tên, năm sinh, môn Tiếng Anh, đơn vị, liên hệ'},
  {label:'Phần 2: Kế hoạch hai tiết',done:Boolean(fields.objectives&&fields.foundation&&selected),desc:'Mục tiêu, yêu cầu cần đạt và tiến trình STEM/STEAM'},
  {label:'Học liệu số hỗ trợ',done:false,desc:'Đính kèm nguồn tư liệu được phép sử dụng; chưa có tệp thực tế trong hệ thống'},
  {label:'Sản phẩm học sinh được duyệt',done:approved.length>0,desc:approved.length+' bản được duyệt trong dữ liệu thật'},
  {label:'Rubric đã chấm',done:hasScore,desc:hasScore?'Có điểm rubric đã lưu':'Chưa có rubric của bản nộp thật'},
  {label:'Minh chứng lớp học thật',done:false,desc:'Cần bổ sung ảnh, video, phiếu học tập và bản sửa được phép chia sẻ'}
 ];
 const completed=checklist.filter(c=>c.done).length;
 const downloadDoc=(part)=>{
  const filename='TiengAnh_THPT_'+(fields.teacher.trim().replace(/\s+/g,'-')||'Giao-vien')+'_STEM_'+part+'.doc';
  const content=part==='P1'?p1Document(fields,selected):p2Document(fields,selected);
  saveTextFile(filename,'application/msword;charset=utf-8',content);
 };
 return <div className="bml-screen" data-testid="museum-evidence-studio">
  <div className="bml-heading-actions"><div><div className="bml-overline">{tr(language,'HỒ SƠ HỘI THI 2026–2027','COMPETITION DOSSIER')}</div>
   <h1>{tr(language,'Minh chứng dự thi','Competition evidence')}</h1><p>{tr(language,'Tạo bản nháp P1/P2 và tổng hợp dữ liệu thực tế từ các nhóm.','Draft P1/P2 and collect actual group evidence.')}</p></div>
   <button type="button" className="bml-outline" onClick={onDemo}><Presentation size={18}/>{tr(language,'Xem demo giám khảo','Judge demo')}</button></div>
  <div className="bml-evidence-layout">
   <section className="bml-surface"><div className="bml-section-head"><div><h2>{tr(language,'Kiểm tra hồ sơ','Submission readiness')}</h2>
     <p>{tr(language,'Theo hướng dẫn hội thi của Sở GDĐT TP.HCM','Aligned to HCMC Department of Education notice 12070')}</p></div>
     <span className="bml-class-tag">{completed}/{checklist.length} {tr(language,'mục','checks')}</span></div>
    <div className="bml-checklist">{checklist.map((item,i)=><div key={i} className={'bml-check-item '+(!item.done?'is-missing':'')}>
     {item.done?<CheckCircle2 size={22}/>:<Circle size={22}/>}
     <div><strong>{item.label}</strong><small>{item.desc}</small></div></div>)}</div>
    <div className="bml-banner bml-info-banner" style={{marginTop:18}}><Info size={19}/>
     {tr(language,'Ứng dụng chỉ lập bản nháp hồ sơ, không tự tạo thành tích, sản phẩm hay minh chứng học sinh. Giáo viên phải xác nhận trước khi nộp.','Drafts do not constitute official evidence. Verify curriculum alignment and attach only authentic teaching materials.')}</div>
   </section>
   <aside className="bml-evidence-exports"><span className="bml-overline">SUBMISSION PACK</span><h2>{tr(language,'Xuất hồ sơ','Export dossier')}</h2>
    <p>{tr(language,'Chọn bài học, nhập thông tin bắt buộc rồi tải hai tệp Word dạng .doc có thể chỉnh sửa.','Choose your lesson, complete required details and export editable Word-compatible .doc drafts.')}</p>
    <label className="bml-full-field">{tr(language,'Bài học được chọn','Selected lesson')}<select value={selected?.id||''} onChange={e=>setAssignmentId(e.target.value)}>
     {assignments.length?assignments.map(a=><option key={a.id} value={a.id}>{a.title} · {a.class_scope}</option>):<option value="">{tr(language,'Chưa có bài học thật','No real lessons yet')}</option>}
    </select></label>
    <button type="button" className="bml-primary" onClick={()=>downloadDoc('P1')}><FileDown size={19}/>{tr(language,'Xuất Phần 1 · Word','Export Part 1 · Word')}</button>
    <button type="button" className="bml-primary" onClick={()=>downloadDoc('P2')}><FileDown size={19}/>{tr(language,'Xuất Phần 2 · Word','Export Part 2 · Word')}</button>
    <button type="button" className="bml-outline" onClick={()=>saveTextFile('BRIAN_MuseumLab_TienDo.csv','text/csv;charset=utf-8',buildProgressCsv(data))}><Download size={18}/>{tr(language,'Tải bảng tiến độ CSV','Download progress CSV')}</button>
    <small>{tr(language,'Hồ sơ chính thức phải đáp ứng cấu trúc P1/P2 và học liệu P2 không quá 50 MB. Bản V3 chưa tự đóng ZIP hoặc xác nhận dung lượng học liệu.','The official dossier requires P1/P2 folders and supporting P2 assets under 50 MB. This screen does not yet package a final ZIP.')}</small>
   </aside>
  </div>
  <section className="bml-surface"><div className="bml-section-head"><h2>{tr(language,'Thông tin cần giáo viên xác nhận','Teacher-verified dossier details')}</h2></div>
   <div className="bml-field-grid">{[
    ['teacher','Họ và tên giáo viên','Teacher name'],['birthYear','Năm sinh','Birth year'],
    ['gender','Giới tính','Gender'],['experience','Thâm niên công tác','Years of experience'],
    ['school','Đơn vị','School'],['phone','Số điện thoại liên hệ','Contact number'],
    ['context','Bối cảnh thực hiện','Teaching context'],['space','Không gian thực hiện','Learning space'],
    ['foundation','Kiến thức nền','Prior knowledge'],['objectives','Mục tiêu cần đạt','Learning objectives'],
    ['outcomes','Kiến thức, kỹ năng hình thành','Expected knowledge and skills'],['competencies','Năng lực và phẩm chất','Competencies and values']
   ].map(([key,vi,en])=><label key={key}>{tr(language,vi,en)}<input value={fields[key]} maxLength={1200} onChange={e=>setFields(f=>({...f,[key]:e.target.value}))}/></label>)}</div>
  </section>
 </div>;
}
