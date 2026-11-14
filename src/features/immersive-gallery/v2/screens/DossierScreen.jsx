import React,{useMemo,useState} from 'react';
import {CheckCircle2,Circle,Info,AlertTriangle} from 'lucide-react';
import {buildProgressCsv} from '../../v3/museumData.js';
import {p1Document,p2Document} from '../../v3/museumDossier.js';
import {buildWordDraft,buildCompetitionZip,saveBlob} from '../../v3/museumDocx.js';
import {liveStaff} from '../../v3/museumLiveApi.js';
import {buildEvidenceZip} from '../../v3/evidenceExport.js';
import {contestBasename} from '../../v3/learningEvidence.js';
import {saveTextFile} from '../../v3/museumApi.js';
import DossierEditor from '../controls/DossierEditor.jsx';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import MetricStrip from '../shell/MetricStrip.jsx';
import '../advanced.css';
const t=(l,vi,en)=>l==='en'?en:vi;
/**
 * 06 Competition dossier — Swiss Editorial V2.
 * Readiness is computed from real evidence (assignments/reviews/rubrics in props.data);
 * "Authentic classroom evidence" is always false until the teacher attaches real materials
 * (never invented). Export buttons call the existing v3 integrations unchanged:
 * museumDocx (buildWordDraft/buildCompetitionZip/saveBlob), evidenceExport (buildEvidenceZip),
 * museumDossier (p1Document/p2Document), museumLiveApi (liveStaff evidence bundle),
 * museumData (buildProgressCsv), museumApi (saveTextFile).
 */
export default function DossierScreen({language='vi',data,staff,onRefresh,transport=liveStaff}){
  const assignments=data?.assignments||[],reviews=data?.reviews||[],rubrics=data?.rubrics||[];
  const [assignmentId,setAssignmentId]=useState(assignments[0]?.id||'');
  const [exportBusy,setExportBusy]=useState(false),[exportError,setExportError]=useState('');
  const selected=assignments.find(a=>a.id===assignmentId)||assignments[0];
  const currentUser=staff||data?.profile||{};
  const [fields,setFields]=useState({
    teacher:currentUser?.full_name||currentUser?.name||'',
    birthYear:'',gender:'',experience:'',school:data?.profile?.school||'',phone:'',
    topic:'Climate Action Museum',context:'',foundation:'',outcomes:'',
    competencies:'',space:'Classroom',objectives:'',drivingQuestion:''
  });
  const localReviews=selected?(reviews||[]).filter(r=>(data?.groups||[]).some(g=>g.id===r.group_id&&g.assignment_id===selected.id)):[];
  const approved=localReviews.filter(r=>['approved_locked','published'].includes(r.state));
  const hasScore=localReviews.some(r=>(rubrics||[]).some(s=>s.review_id===r.id));
  const completeProfile=Boolean(fields.teacher&&fields.birthYear&&fields.gender&&fields.experience&&fields.school&&fields.phone);
  const checklist=useMemo(()=>[
    {label:t(language,'Mục 1: Thông tin giáo viên và nhà trường','Section 1: Teacher and school context'),done:completeProfile,desc:t(language,'Kiểm tra họ tên, năm sinh, môn tiếng Anh, đơn vị và liên hệ.','Check name, birth year, English subject, institution and contact details')},
    {label:t(language,'Mục 2: Kế hoạch bài dạy hai tiết','Section 2: Two-period teaching plan'),done:Boolean(fields.objectives&&fields.foundation&&selected),desc:t(language,'Mục tiêu, kết quả cần đạt và trình tự STEM/STEAM.','Objectives, learning outcomes and STEM/STEAM sequence')},
    {label:t(language,'Học liệu số','Digital learning resources'),done:true,desc:t(language,'Bốn thẻ ngôn ngữ có nguồn và hướng dẫn in được nằm trong ZIP.','Four sourced language cards and a printable guide are included in the ZIP')},
    {label:t(language,'Sản phẩm học sinh đã duyệt','Approved student work'),done:approved.length>0,desc:approved.length>0?approved.length+t(language,' bản đã duyệt trong hồ sơ thật.',' approved entries in authentic records.'):t(language,'Chưa có bản nào được duyệt trong hồ sơ thật.','No approved entries in authentic records yet.')},
    {label:t(language,'Đã chấm rubric','Rubric scored'),done:hasScore,desc:hasScore?t(language,'Đã có điểm rubric đã lưu.','Saved rubric score available.'):t(language,'Chưa có rubric được chấm từ bài nộp thật.','No scored rubric from an authentic submission yet.')},
    {label:t(language,'Minh chứng lớp học thật','Authentic classroom evidence'),done:false,desc:t(language,'Thêm ảnh, video, phiếu học tập và minh chứng cải tiến có sự cho phép.','Add permitted classroom photos, videos, worksheets and revision evidence')}
  ],[completeProfile,fields.objectives,fields.foundation,selected,approved.length,hasScore,language]);
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
  const downloadEvidence=async()=>{
    setExportBusy(true);setExportError('');
    try{
      const bundle=await transport('evidence',null,{assignmentId:selected.id});
      const ids=new Set(localReviews.map(r=>r.id));
      const out=await buildEvidenceZip(bundle,(rubrics||[]).filter(r=>ids.has(r.review_id)));
      saveBlob(out,'BRIAN_Museum_Class_Evidence.zip');
    }catch(e){setExportError(e.message);}finally{setExportBusy(false);}
  };
  const downloadCsv=()=>{try{saveTextFile('BRIAN_MuseumLab_Progress.csv','text/csv;charset=utf-8',buildProgressCsv(data,language));}catch(e){setExportError(e.message);}};
  const missing=checklist.filter(c=>!c.done);
  return (
    <div className="igv2 igv2-screen" data-testid="igv2-dossier-screen">
      <EditorialHeading
        kicker={t(language,'HỒ SƠ HỘI THI 2026–2027','COMPETITION DOSSIER')}
        title={t(language,'Minh chứng dự thi.','Competition evidence.')}
        description={t(language,'Soạn bản nháp P1/P2 và tổng hợp dữ liệu thực tế từ các nhóm.','Draft P1/P2 and collect actual group evidence.')}
        aside={t(language,'Độ sẵn sàng nộp · ','Submission readiness · ')+completed+'/'+checklist.length}/>
      <MetricStrip items={[
        {value:completed+'/'+checklist.length,label:t(language,'mục đã hoàn thành','checks complete'),highlight:true},
        {value:String(approved.length),label:t(language,'bản học sinh đã duyệt','approved student entries')},
        {value:hasScore?t(language,'Có','Yes'):t(language,'Chưa','No'),label:t(language,'rubric đã chấm','rubric scored')},
        {value:String(assignments.length),label:t(language,'bài học thật','real lessons')}
      ]}/>
      {missing.some(c=>c.label===t(language,'Minh chứng lớp học thật','Authentic classroom evidence'))?(
        <div className="adv-banner adv-banner--warn" role="alert"><AlertTriangle size={14}/> {t(language,'Cảnh báo thiếu minh chứng: ','Missing-evidence warning: ')}{t(language,'Minh chứng lớp học thật chưa được đính kèm. Ứng dụng chỉ lập bản nháp, không tự tạo thành tích hay minh chứng. Giáo viên phải bổ sung học liệu thật và xác nhận trước khi nộp.','Authentic classroom evidence is not attached. Drafts do not constitute official evidence. Verify curriculum alignment and attach only authentic teaching materials before submission.')}</div>
      ):null}
      <div className="dossier-layout" style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:16,marginTop:16}}>
        <div className="panel">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <h3 style={{margin:0}}>{t(language,'KIỂM TRA HỒ SƠ','SUBMISSION READINESS')}</h3>
            <span className="chip selected" style={{background:'var(--igv2-navy,#112339)',color:'#fff'}}>{completed}/{checklist.length} {t(language,'mục','checks')}</span>
          </div>
          <p style={{fontSize:12,color:'var(--igv2-muted,#6b7782)',marginTop:6}}>{t(language,'Theo hướng dẫn hội thi của Sở GDĐT TP.HCM (thông tư 12070).','Aligned to HCMC Department of Education notice 12070.')}</p>
          <div className="check-list" style={{marginTop:12}}>
            {checklist.map((item,i)=>(
              <div className={'check-row'+(item.done?' done':'')} key={i} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:'1px solid var(--igv2-divider,#dedbd5)',alignItems:'flex-start'}}>
                <span className="dot" aria-hidden="true" style={{width:22,height:22,borderRadius:'50%',flex:'0 0 auto',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,background:item.done?'var(--igv2-success,#218d58)':'transparent',border:'2px solid '+(item.done?'var(--igv2-success,#218d58)':'var(--igv2-divider,#dedbd5)'),color:'#fff'}}>{item.done?<CheckCircle2 size={14}/>:<Circle size={14} color="var(--igv2-divider,#dedbd5)"/>}</span>
                <div><b style={{fontSize:13}}>{item.label}</b><small style={{display:'block',color:'var(--igv2-muted,#6b7782)',fontSize:11,lineHeight:1.45,marginTop:2}}>{item.desc}</small></div>
              </div>
            ))}
          </div>
          <div className="info-strip mt16" style={{background:'#eff3f7',borderLeftColor:'#205b8a'}} role="note"><Info size={14}/> {t(language,'Bản nháp không phải minh chứng chính thức. Chỉ đính kèm tài liệu giảng dạy thật, có nguồn và sự cho phép.','Drafts do not constitute official evidence. Verify curriculum alignment and attach only authentic teaching materials.')}</div>
        </div>
        <DossierEditor language={language} fields={fields} onFieldsChange={setFields}
          assignments={assignments} selectedAssignmentId={selected?.id||''} onSelectAssignment={setAssignmentId}
          exportBusy={exportBusy} exportError={exportError}
          onExportDoc={downloadDoc} onExportZip={downloadZip} onExportEvidence={downloadEvidence} onExportCsv={downloadCsv}/>
      </div>
      <style>{`.igv2 .dossier-layout{grid-template-columns:1.3fr 1fr}@media(max-width:900px){.igv2 .dossier-layout{grid-template-columns:1fr}}`}</style>
    </div>
  );
}
export {DossierScreen};
