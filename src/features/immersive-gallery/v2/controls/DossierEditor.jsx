import React from 'react';
import {FileDown,FileArchive,Download,BookOpen,AlertCircle} from 'lucide-react';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const FIELD_DEFS=[
  ['teacher','Họ và tên giáo viên','Teacher name'],
  ['birthYear','Năm sinh','Birth year'],
  ['gender','Giới tính','Gender'],
  ['experience','Thâm niên công tác','Years of experience'],
  ['school','Đơn vị','School'],
  ['phone','Số điện thoại liên hệ','Contact number'],
  ['context','Bối cảnh thực hiện','Teaching context'],
  ['space','Không gian thực hiện','Learning space'],
  ['foundation','Kiến thức nền','Prior knowledge'],
  ['objectives','Mục tiêu cần đạt','Learning objectives'],
  ['outcomes','Kiến thức, kỹ năng hình thành','Expected knowledge and skills'],
  ['competencies','Năng lực và phẩm chất','Competencies and values']
];
/**
 * DossierEditor — export panel + teacher-verified dossier detail form.
 * Export handlers are wired by the screen to v3 museumDocx/evidenceExport/museumDossier.
 * No evidence is invented: missing fields stay blank until the teacher fills them.
 */
export default function DossierEditor({
  language='vi',
  fields={},onFieldsChange=()=>{},
  assignments=[],selectedAssignmentId='',onSelectAssignment=()=>{},
  exportBusy=false,exportError='',
  onExportDoc=()=>{},onExportZip=()=>{},onExportEvidence=()=>{},onExportCsv=()=>{},
  guideHref='/museum-lesson-guide.html'
}){
  const set=(key,value)=>onFieldsChange({...fields,[key]:value});
  return (
    <>
      <div className="panel gray" style={{background:'#f4f1ea'}}>
        <h3 style={{marginTop:0}}>{t(language,'XUẤT HỒ SƠ','EXPORT DOSSIER')}</h3>
        <p className="page-desc" style={{fontSize:12}}>{t(language,'Chọn bài học, nhập thông tin bắt buộc rồi xuất hai tệp Word .docx có thể chỉnh sửa.','Choose your lesson, complete required details and export editable Word .docx drafts.')}</p>
        <label style={{fontSize:10,fontWeight:850,letterSpacing:'.08em',textTransform:'uppercase'}}>{t(language,'BÀI HỌC ĐƯỢC CHỌN','SELECTED LESSON')}</label>
        <select className="adv-assignment-select mt16" value={selectedAssignmentId} onChange={e=>onSelectAssignment(e.target.value)} aria-label={t(language,'Bài học được chọn','Selected lesson')}>
          {assignments.length?assignments.map(a=><option key={a.id} value={a.id}>{a.title} · {a.class_scope||''}</option>)
            :<option value="">{t(language,'Chưa có bài học thật','No real lessons yet')}</option>}
        </select>
        <div className="mt16">
          <button type="button" className="adv-export-btn adv-export-btn--major" disabled={exportBusy} onClick={()=>onExportDoc('P1')}><FileDown size={15}/>{t(language,'Xuất Phần 1 · Word','Export Part 1 · Word')}</button>
          <button type="button" className="adv-export-btn adv-export-btn--major" disabled={exportBusy} onClick={()=>onExportDoc('P2')}><FileDown size={15}/>{t(language,'Xuất Phần 2 · Word','Export Part 2 · Word')}</button>
          <button type="button" className="adv-export-btn" disabled={exportBusy} onClick={onExportZip}><FileArchive size={15}/>{t(language,'Tải ZIP hồ sơ nháp P1/P2','Download P1/P2 draft ZIP')}</button>
          <button type="button" className="adv-export-btn" disabled={exportBusy||!selectedAssignmentId} onClick={onExportEvidence}><Download size={15}/>{t(language,'Xuất khảo sát · góp ý · bản trước/sau · ảnh thật','Export survey · feedback · revisions · original images')}</button>
          <button type="button" className="adv-export-btn" onClick={onExportCsv}><Download size={15}/>{t(language,'Tải bảng tiến độ CSV','Download progress CSV')}</button>
          <a className="adv-export-link" href={guideHref} target="_blank" rel="noreferrer">{t(language,'Hướng dẫn bài dạy · không cần đăng nhập','Read-only lesson guide · no login')}</a>
        </div>
        {exportError?<div className="adv-banner adv-banner--danger" role="alert"><AlertCircle size={14}/> {exportError}</div>:null}
        <p className="page-desc" style={{fontSize:11,marginBottom:0}}>{t(language,'ZIP gồm hai bản nháp DOCX có thể chỉnh sửa và bảng kiểm tra thiếu minh chứng.','ZIP includes two editable DOCX drafts and a missing-evidence checklist.')}</p>
      </div>

      <div className="content-gap dossier-full-span" style={{gridColumn:'1 / -1'}}><div className="section-title"><span>{t(language,'THÔNG TIN HỒ SƠ CẦN GIÁO VIÊN XÁC NHẬN','TEACHER-VERIFIED DOSSIER DETAILS')}</span><span className="right">{t(language,'Hoàn thành trước khi xuất','Complete before exporting')}</span></div></div>
      <div className="panel warm dossier-full-span" style={{background:'#fff8ec',gridColumn:'1 / -1'}}>
        <div className="form-grid adv-form-grid">
          {FIELD_DEFS.map(([key,vi,en])=>(
            <div className="form-field adv-dossier-field" key={key}>
              <label htmlFor={`igv2-dossier-${key}`}>{t(language,vi,en)}</label>
              <input id={`igv2-dossier-${key}`} value={fields[key]||''} maxLength={1200}
                onChange={e=>set(key,e.target.value)}
                aria-required={['teacher','birthYear','gender','experience','school','phone'].includes(key)}
                placeholder={t(language,'[Giáo viên điền]','[Teacher to provide]')}/>
            </div>
          ))}
        </div>
      </div>
      <style>{`.igv2 .dossier-full-span{grid-column:1 / -1}.igv2 .adv-form-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}@media(max-width:960px){.igv2 .adv-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.igv2 .adv-form-grid{grid-template-columns:minmax(0,1fr)}}`}</style>
    </>
  );
}
export {DossierEditor};
