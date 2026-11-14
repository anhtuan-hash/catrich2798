import MuseumOfflineExport from './MuseumOfflineExport.jsx';
import React,{useMemo,useState} from 'react';
import {ArrowRight,Award,BookOpen,CheckCircle2,Circle,ClipboardCheck,Download,FileArchive,FileCheck2,FileDown,FileText,Info,Printer,ShieldCheck,Star,UploadCloud} from 'lucide-react';
import {buildProgressCsv} from './museumData.js';
import {p1Document,p2Document} from './museumDossier.js';
import {buildWordDraft,buildCompetitionZip,saveBlob} from './museumDocx.js';
import {liveStaff} from './museumLiveApi.js';
import {buildEvidenceZip} from './evidenceExport.js';
import {contestBasename} from './learningEvidence.js';
import {saveTextFile,fmtDate} from './museumApi.js';
const tr=(l,vi,en)=>l==='en'?en:vi;
export default function MuseumEvidence({data,currentUser,language='vi'}){
 const assignments=data?.assignments||[],reviews=data?.reviews||[],rubrics=data?.rubrics||[];
 const [assignmentId,setAssignmentId]=useState(assignments[0]?.id||'');
 const [exportBusy,setExportBusy]=useState(false),[exportError,setExportError]=useState('');
 const selected=assignments.find(a=>a.id===assignmentId)||assignments[0];
 const [fields,setFields]=useState({
  teacher:currentUser?.full_name||currentUser?.name||'',
  birthYear:'',gender:'',experience:'',school:data?.profile?.school||'',phone:'',
  topic:'Climate Action Museum',context:'',foundation:'',outcomes:'',
  competencies:'',space:'Classroom',objectives:'',drivingQuestion:''
 });
 const localReviews=selected?reviews.filter(r=>data.groups?.some(g=>g.id===r.group_id&&g.assignment_id===selected.id)):[];
 const approved=localReviews.filter(r=>['approved_locked','published'].includes(r.state));
 const hasScore=localReviews.some(r=>rubrics.some(s=>s.review_id===r.id));
 const completeProfile=Boolean(fields.teacher&&fields.birthYear&&fields.gender&&fields.experience&&fields.school&&fields.phone);
 const checklist=[
  {label:'Section 1: Teacher and school context',done:completeProfile,desc:'Check name, birth year, English subject, institution and contact details'},
  {label:'Section 2: Two-period teaching plan',done:Boolean(fields.objectives&&fields.foundation&&selected),desc:'Objectives, learning outcomes and STEM/STEAM sequence'},
  {label:'Digital learning resources',done:true,desc:'Four sourced language cards and a printable guide are included in the ZIP'},
  {label:'Approved student work',done:approved.length>0,desc:approved.length+' approved entries in authentic records'},
  {label:'Rubric scored',done:hasScore,desc:hasScore?'Saved rubric score available':'No scored rubric from an authentic submission yet'},
  {label:'Authentic classroom evidence',done:false,desc:'Add permitted classroom photos, videos, worksheets and revision evidence'}
 ];
 const completed=checklist.filter(c=>c.done).length;
 const downloadDoc=async(part)=>{
  setExportBusy(true);setExportError('');
  try{
   const filename=contestBasename(fields.teacher)+part+'.docx';
   const content=part==='P1'?p1Document(fields,selected):p2Document(fields,selected);
   const output=await buildWordDraft(content);
   saveBlob(output,filename);
  }catch(e){setExportError(e.message);}finally{setExportBusy(false);}
 };
 const downloadZip=async()=>{
  setExportBusy(true);setExportError('');
  try{
   const output=await buildCompetitionZip(p1Document(fields,selected),p2Document(fields,selected),checklist,fields.teacher);
   saveBlob(output,'BRIAN_MuseumLab_BAN_NHAP_HO_SO_HOI_THI.zip');
  }catch(e){setExportError(e.message);}finally{setExportBusy(false);}
 };
 const downloadEvidence=async()=>{setExportBusy(true);setExportError('');try{const bundle=await liveStaff('evidence',null,{assignmentId:selected.id});const ids=new Set(localReviews.map(r=>r.id));const out=await buildEvidenceZip(bundle,rubrics.filter(r=>ids.has(r.review_id)));saveBlob(out,'BRIAN_Museum_Class_Evidence.zip');}catch(e){setExportError(e.message);}finally{setExportBusy(false);}};
 return <div className="bml-screen" data-testid="museum-evidence-studio">
  <div className="bml-heading-actions"><div><div className="bml-overline">{tr(language,'HỒ SƠ HỘI THI 2026–2027','COMPETITION DOSSIER')}</div>
   <h1>{tr(language,'Minh chứng dự thi','Competition evidence')}</h1><p>{tr(language,'Tạo bản nháp P1/P2 và tổng hợp dữ liệu thực tế từ các nhóm.','Draft P1/P2 and collect actual group evidence.')}</p></div>
  </div>
  {!data?.offlineReadOnly?<MuseumOfflineExport language={language}/>:null}
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
    <p>{tr(language,'Chọn bài học, nhập thông tin bắt buộc rồi tải hai tệp Word dạng .docx có thể chỉnh sửa.','Choose your lesson, complete required details and export editable Word .docx drafts.')}</p>
    <label className="bml-full-field">{tr(language,'Bài học được chọn','Selected lesson')}<select value={selected?.id||''} onChange={e=>setAssignmentId(e.target.value)}>
     {assignments.length?assignments.map(a=><option key={a.id} value={a.id}>{a.title} · {a.class_scope}</option>):<option value="">{tr(language,'Chưa có bài học thật','No real lessons yet')}</option>}
    </select></label>
    <button type="button" className="bml-primary" disabled={exportBusy} onClick={()=>downloadDoc('P1')}><FileDown size={19}/>{tr(language,'Xuất Phần 1 · Word','Export Part 1 · Word')}</button>
    <button type="button" className="bml-primary" disabled={exportBusy} onClick={()=>downloadDoc('P2')}><FileDown size={19}/>{tr(language,'Xuất Phần 2 · Word','Export Part 2 · Word')}</button>
    <button type="button" className="bml-outline" disabled={exportBusy} onClick={downloadZip}><FileArchive size={18}/>{tr(language,'Tải ZIP hồ sơ nháp P1/P2','Download P1/P2 draft ZIP')}</button>
    <button type="button" className="bml-outline" disabled={exportBusy||!selected} onClick={downloadEvidence}><Download size={18}/>{tr(language,'Xuất khảo sát · góp ý · bản trước/sau · ảnh thật','Export survey · feedback · revisions · original images')}</button>
    {exportError?<div className="bml-banner bml-danger-banner" role="alert">{exportError}</div>:null}
    <button type="button" className="bml-outline" onClick={()=>saveTextFile('BRIAN_MuseumLab_Progress.csv','text/csv;charset=utf-8',buildProgressCsv(data,language))}><Download size={18}/>{tr(language,'Tải bảng tiến độ CSV','Download progress CSV')}</button>
    <a className="bml-outline" href="/museum-lesson-guide.html" download={data?.offlineReadOnly?'BRIAN_Lesson_Guide.html':undefined} target="_blank" rel="noreferrer">{tr(language,'Hướng dẫn bài dạy · không cần đăng nhập','Read-only lesson guide · no login')}</a>
    <small>{tr(language,'ZIP gồm P1/P2 đúng tên giáo viên, học liệu và bảng kiểm. Nút xuất minh chứng tải dữ liệu lớp đã lưu riêng; tổng P2 sau khi ghép phải không quá 50 MB. Giáo viên phải bổ sung học liệu thật, kiểm tra giới hạn dung lượng trước khi nộp.','ZIP includes two editable DOCX drafts and a missing-evidence checklist. Add authentic teaching materials and verify the official file-size limit before submission.')}</small>
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
   ].map(([key,vi,en])=><label key={key}>{tr(language,vi,en)}<input readOnly={!!data?.offlineReadOnly} value={fields[key]} maxLength={1200} onChange={e=>setFields(f=>({...f,[key]:e.target.value}))}/></label>)}</div>
  </section>
 </div>;
}
