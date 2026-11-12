import React,{useMemo,useState} from 'react';
import {ArrowRight,Award,BookOpen,CheckCircle2,Circle,ClipboardCheck,Download,FileArchive,FileCheck2,FileDown,FileText,Info,Presentation,Printer,ShieldCheck,Star,UploadCloud} from 'lucide-react';
import {buildProgressCsv} from './museumData.js';
import {p1Document,p2Document} from './museumDossier.js';
import {saveTextFile,fmtDate} from './museumApi.js';
const tr=(l,vi,en)=>l==='en'?en:vi;
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
