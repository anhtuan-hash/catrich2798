import React,{useMemo,useRef,useState} from 'react';
import { Activity, AlertTriangle, ArrowRight, BookUser, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock3, Cloud, Database, Download, FileSearch, Filter, HardDrive,
  Info, LockKeyhole, MonitorSmartphone, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import {isAdminRole,isDepartmentLeaderRole} from '../utils/roles.js';
import {runSyncDoctorScan,serializeSyncDoctorReport} from '../utils/syncDoctorDiagnostics.js';
import {buildSyncReviewPlans,serializeSyncReviewDocket} from '../utils/syncDoctorPlanning.mjs';
import './SyncDoctor.css';

const viText={
  eyebrow:'BRIAN / DATA INTEGRITY CENTER',title:'Sync Doctor',
  sub:'Kiểm tra và đối soát dữ liệu liên thông trong một không gian an toàn.',
  safety:'GIAI ĐOẠN 1 · CHỈ ĐỌC',safetyText:'Không tạo, xóa, cập nhật hay tự gộp hồ sơ.',
  tabs:['Tổng quan','Vấn đề','Nguồn dữ liệu','Kế hoạch sửa','Nhật ký','Cài đặt'],
  run:'Quét dữ liệu',running:'Đang đối soát',export:'Xuất báo cáo',year:'Năm học',
  class:'Lớp cần kiểm tra',all:'Tất cả lớp có quyền xem',classHint:'Để trống để quét các lớp được phép đọc.',
  overview:'Tổng quan chẩn đoán',intro:'Thông tin lấy từ nguồn được cấp quyền. Không có dữ liệu không đồng nghĩa đã đồng bộ.',
  findings:'Phát hiện',critical:'Nghiêm trọng',classes:'Lớp đối chiếu',sources:'Nguồn xác minh',
  evidence:'Bằng chứng & hướng xử lý',attention:'Cần xem xét',limited:'Phạm vi kiểm tra chưa đầy đủ',
  empty:'Chưa có lần quét nào',emptyDesc:'Chọn phạm vi và nhấn Quét dữ liệu để nhận kết quả thật từ Brian.',
  emptyIssues:'Không phát hiện vấn đề trong phạm vi đã kiểm tra.',choose:'Chọn một vấn đề để xem bằng chứng.',
  status:'Trạng thái',records:'Bản ghi xem được',message:'Ghi chú',again:'Quét lại',
  planTitle:'Kế hoạch khắc phục',planDesc:'Chức năng sửa dữ liệu chưa được bật trong giai đoạn chỉ đọc.',
  planSteps:['Xác nhận định danh và nguồn gốc','Xem trước thay đổi và ảnh hưởng','Duyệt quyền độc lập','Thực hiện an toàn và quét xác minh'],
  auditTitle:'Nhật ký trong phiên',auditDesc:'Các lượt quét chỉ được lưu trong phiên màn hình hiện tại, không phải nhật ký máy chủ.',
  settingsTitle:'Chính sách an toàn',settingsLines:['Không ghi đè điểm, hồ sơ GVCN hay đánh giá.','Không ghép hai học sinh chỉ vì trùng họ tên.','Không suy diễn lỗi khi nguồn bị từ chối quyền đọc.','Hàng đợi cục bộ chỉ thuộc trình duyệt này.','Các thao tác sửa yêu cầu kiến trúc phê duyệt ở giai đoạn tiếp theo.'],
  noAccess:'Tài khoản chưa được cấp quyền quản trị Sync Doctor.',back:'Về ứng dụng',
  device:'Thiết bị hiện tại',pending:'Tác vụ đang chờ',scanHistory:'Lượt quét',review:'Cần người có quyền kiểm tra',
  severity:'Mức độ',filter:'Lọc theo mức',scope:'Phạm vi',sourceLimited:'Chưa xác minh toàn bộ hệ thống',
  view:'Xem chi tiết',closed:'Đóng',started:'Bắt đầu',finished:'Kết thúc',result:'Kết quả',
  report:'Báo cáo sẽ ẩn mã định danh học sinh và không có thông tin cá nhân.',
  docket:'Xuất phiếu rà soát',plansOverview:'Kế hoạch dự kiến được tạo từ lần quét gần nhất — không thực hiện thay đổi dữ liệu.',
  preview:'Xem trước phương án',constraints:'Điều kiện an toàn',steps:'Các bước rà soát',
  approval:'Cần người có thẩm quyền duyệt',reviewable:'Có thể rà soát',blocked:'Chưa đủ điều kiện',
  noPlan:'Chưa có kế hoạch; hãy quét dữ liệu trước.',sourceRevision:'Phiên bản nguồn',identity:'Học sinh liên quan',
  planCount:'Phương án đề xuất',viewPlan:'Xem kế hoạch',sourceIncomplete:'Dữ liệu đọc bị giới hạn; không cho phép tự áp dụng.',
  inactive:'Không hỗ trợ tự sửa trong giai đoạn này.',
};
const enText={
  eyebrow:'BRIAN / DATA INTEGRITY CENTER',title:'Sync Doctor',
  sub:'Diagnose data consistency safely across your connected Brian modules.',
  safety:'PHASE 1 · READ ONLY',safetyText:'No records are created, deleted, edited or merged.',
  tabs:['Overview','Issues','Sources','Repair plans','Audit','Settings'],
  run:'Run scan',running:'Scanning',export:'Export report',year:'School year',
  class:'Class scope',all:'All visible classes',classHint:'Leave blank to check classes your account can access.',
  overview:'Diagnostic overview',intro:'Results are limited to authorized sources. Missing data is not proof of success.',
  findings:'Findings',critical:'Critical',classes:'Classes checked',sources:'Verified sources',
  evidence:'Evidence & next step',attention:'Needs review',limited:'Incomplete coverage',
  empty:'No scans yet',emptyDesc:'Choose scope and run an authorized scan of real Brian data.',
  emptyIssues:'No findings in the checked scope.',choose:'Select an issue to inspect the evidence.',
  status:'Status',records:'Visible rows',message:'Notes',again:'Rescan',
  planTitle:'Repair plans',planDesc:'Data repair is not enabled in the read-only release.',
  planSteps:['Verify identity and authoritative source','Preview data changes and impact','Obtain independent approval','Apply safely and verify again'],
  auditTitle:'Session audit',auditDesc:'Scans are stored in this screen session only, not in a server-side audit trail.',
  settingsTitle:'Safety policy',settingsLines:['No overwriting scores, homeroom records or assessment results.','Never merge students using name alone.','Permission-denied data is not treated as empty.','Local queue covers this browser only.','Repair requires approval infrastructure in a later phase.'],
  noAccess:'This account does not have Sync Doctor administrative access.',back:'Back to Apps',
  device:'This device',pending:'Pending changes',scanHistory:'Scans',review:'Human review required',
  severity:'Severity',filter:'Filter by severity',scope:'Scope',sourceLimited:'Not a school-wide audit',
  view:'View details',closed:'Close',started:'Started',finished:'Finished',result:'Result',
  report:'Exported reports omit student identity keys and personal data.',
  docket:'Export review docket',plansOverview:'Proposals from the latest scan; no changes can be executed.',
  preview:'Review preview',constraints:'Safety requirements',steps:'Review steps',
  approval:'Independent approval required',reviewable:'Ready for review',blocked:'Blocked — investigate',
  noPlan:'No review plans yet. Run a scan first.',sourceRevision:'Source revision',identity:'Student in scope',
  planCount:'Review proposals',viewPlan:'View plan',sourceIncomplete:'Incomplete source coverage. No changes can be applied.',
  inactive:'Automatic repair is unavailable in this release.',
};
const tone={critical:'danger',high:'warning',medium:'medium',low:'info'};
const statuses={ok:['Có thể đọc','Readable'],empty:['Không có bản ghi','No visible rows'],limited:['Một phần','Partial'],error:['Lỗi','Error'],
  unauthorized:['Không có quyền','No permission'],unavailable:['Không khả dụng','Unavailable']};
const iconFor={canonical:Database,homeroom:BookUser,gradebook:ClipboardCheck,assessment:FileSearch,assignment:ShieldCheck};
const yearNow=()=>{const today=new Date(),start=today.getMonth()>=7?today.getFullYear():today.getFullYear()-1;return String(start)+'-'+String(start+1);};
const saveDocket=(report,plans)=>{
  if(!report || !plans.length)return;
  const blob=new Blob([serializeSyncReviewDocket(report,plans)],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=href;a.download='brian-sync-review-'+report.schoolYear+'.json';
  a.click();URL.revokeObjectURL(href);
};
const saveReport=(report)=>{const blob=new Blob([serializeSyncDoctorReport(report)],{type:'application/json;charset=utf-8'});
  const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='brian-sync-doctor-'+report.schoolYear+'.json';a.click();
  URL.revokeObjectURL(href);};
const datetime=value=>{if(!value)return '—';try{return new Date(value).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'medium'});}catch{return value;}};

export default function SyncDoctor({currentUser,language='vi'}){
  const t=language==='en'?enText:viText,vi=language!=='en';
  const authorized=!!currentUser&&(isAdminRole(currentUser.role)||isDepartmentLeaderRole(currentUser.role));
  const [tab,setTab]=useState(0),[schoolYear,setSchoolYear]=useState(yearNow),
    [className,setClassName]=useState(''),[filter,setFilter]=useState('all'),
    [query,setQuery]=useState(''),[report,setReport]=useState(null),
    [history,setHistory]=useState([]),[progress,setProgress]=useState(null),
    [error,setError]=useState(''),[selected,setSelected]=useState(null);
  const controller=useRef(null);
  const busy=!!progress;
  const run=async()=>{
    if(busy||!authorized)return;
    controller.current?.abort();
    const ctrl=new AbortController();controller.current=ctrl;
    setProgress({done:0,total:5});setError('');setSelected(null);
    try{
      const result=await runSyncDoctorScan({user:currentUser,schoolYear,className:className.trim(),
        signal:ctrl.signal,onProgress:setProgress});
      if(!ctrl.signal.aborted){
        setReport(result);
        setHistory(old=>[{
          startedAt:result.startedAt,schoolYear:result.schoolYear,className:result.className,
          count:result.issues.length,coverage:result.completeness,
        },...old].slice(0,12));
      }
    }catch(err){if(!ctrl.signal.aborted)setError(String(err?.message||err));}
    finally{if(controller.current===ctrl){controller.current=null;setProgress(null);}}
  };
  const reviewPlans=useMemo(()=>buildSyncReviewPlans(report),[report]);
  const selectedPlan=reviewPlans.find(p=>p.id===selected?.id)||reviewPlans[0]||null;
  const staleScope=Boolean(report&&(report.schoolYear!==schoolYear||report.className!==className.trim()));
  const issues=useMemo(()=>report?.issues.filter(item=>(filter==='all'||item.severity===filter)&&
    (!query||[item.description,item.className,item.code].join(' ').toLowerCase().includes(query.toLowerCase())))||[],[report,filter,query]);
  const totals={issues:report?.issues.length||0,critical:report?.issues.filter(i=>i.severity==='critical'||i.severity==='high').length||0,
    sources:report?.sources.filter(s=>s.status==='ok').length||0};
  if(!authorized)return <section className="bsd-root bsd-denied"><LockKeyhole size={36}/><h1>Sync Doctor</h1><p>{t.noAccess}</p>
    <button type="button" onClick={()=>window.location.hash='#/apps'}>{t.back}</button></section>;
  return <div className="bsd-root">
    <section className="bsd-hero">
      <div className="bsd-hero-copy"><span className="bsd-overline"><Activity size={16}/>{t.eyebrow}</span>
        <h1>{t.title}<span className="bsd-hero-dot">.</span></h1><p>{t.sub}</p>
        <div className="bsd-safety"><ShieldCheck size={17}/><strong>{t.safety}</strong><span>{t.safetyText}</span></div>
      </div>
      <div className="bsd-hero-mark" aria-hidden="true"><div className="bsd-hero-mark-inner"><Database size={53}/><CheckCircle2 size={29}/></div></div>
    </section>
    <section className="bsd-controls">
      <div className="bsd-field"><label htmlFor="bsd-year">{t.year}</label><input id="bsd-year" value={schoolYear} onChange={e=>setSchoolYear(e.target.value)} disabled={busy} placeholder="2026-2027"/></div>
      <div className="bsd-field bsd-grow"><label htmlFor="bsd-class">{t.class}</label><input id="bsd-class" value={className} onChange={e=>setClassName(e.target.value)} disabled={busy} placeholder={t.all}/><small>{t.classHint}</small></div>
      <button className="bsd-primary" disabled={busy} type="button" onClick={run}><RefreshCw size={17} className={busy?'bsd-spin':''}/>{busy?t.running:t.run}</button>
      <button className="bsd-outline" disabled={!report||busy} type="button" title={t.report} onClick={()=>saveReport(report)}><Download size={16}/>{t.export}</button>
    </section>
    {progress&&<div className="bsd-progress" role="status"><div style={{width:Math.round(progress.done/progress.total*100)+'%'}} /><span>{t.running} · {progress.done}/{progress.total}</span></div>}
    {error&&<div className="bsd-alert" role="alert"><AlertTriangle size={18}/>{error}</div>}
    {staleScope&&<div className="bsd-banner" role="status"><Info size={17}/><div><strong>{vi?'Bạn đã đổi phạm vi quét':'Scan scope changed'}</strong><p>{vi?'Kết quả bên dưới thuộc lần quét trước. Hãy quét lại để cập nhật kế hoạch.':'The displayed results are from the previous scan; rescan before reviewing plans.'}</p></div></div>}
    <nav className="bsd-tabs" aria-label={vi?'Khu vực Sync Doctor':'Sync Doctor sections'}>
      {t.tabs.map((label,i)=><button key={label} type="button" aria-current={tab===i?'page':undefined} className={tab===i?'active':''} onClick={()=>setTab(i)}>{label}</button>)}
    </nav>
    {tab===0&&<div className="bsd-stack">
      <div className="bsd-heading"><div><span className="bsd-overline bsd-dark">SYSTEM OVERVIEW</span><h2>{t.overview}</h2><p>{t.intro}</p></div>
        {report&&<span className="bsd-timestamp"><Clock3 size={15}/>{datetime(report.finishedAt)}</span>}</div>
      <div className="bsd-metrics">
        {[[t.findings,report?totals.issues:'—',FileSearch],[t.critical,report?totals.critical:'—',AlertTriangle],[t.classes,report?report.classesChecked:'—',BookUser],[t.sources,report?totals.sources+'/5':'—',Cloud]].map(([label,n,Icon])=>
          <article className="bsd-metric" key={label}><div><span>{label}</span><strong>{n}</strong></div><span className="bsd-metric-icon"><Icon size={23}/></span></article>)}
      </div>
      {!report?<Empty t={t}/>:<>
        {report.completeness!=='complete'&&<div className="bsd-banner"><Info size={19}/><div><strong>{t.limited}</strong><p>{report.scopeNotice}</p></div></div>}
        <div className="bsd-two">
          <section className="bsd-panel"><div className="bsd-panel-head"><h3>{t.sources}</h3><button type="button" onClick={()=>setTab(2)}>{t.view}<ArrowRight size={15}/></button></div>
            {report.sources.map(s=><SourceRow key={s.id} src={s} vi={vi}/>)}</section>
          <section className="bsd-panel"><div className="bsd-panel-head"><h3>{t.attention}</h3><button type="button" onClick={()=>setTab(1)}>{t.view}<ArrowRight size={15}/></button></div>
            {report.issues.slice(0,5).map(i=><button className="bsd-issue-preview" key={i.id} onClick={()=>{setSelected(i);setTab(1)}}><span className={'bsd-severity '+(tone[i.severity]||'info')}></span><span><strong>{i.description}</strong><small>{i.className||'—'} · {i.code}</small></span><ChevronRight size={17}/></button>)}
            {!report.issues.length&&<div className="bsd-subempty"><CheckCircle2/>{t.emptyIssues}</div>}
          </section>
        </div>
        <div className="bsd-device"><MonitorSmartphone size={20}/><div><strong>{t.device}</strong><span>{t.pending}: {report.localQueue?.pending??'—'} · {t.sourceLimited}</span></div></div>
      </>}
    </div>}
    {tab===1&&<div className="bsd-stack">
      <div className="bsd-heading"><div><span className="bsd-overline bsd-dark">ISSUE CENTER</span><h2>{t.tabs[1]}</h2><p>{t.review}</p></div></div>
      {!report?<Empty t={t}/>:<>
        <div className="bsd-issue-filters"><div className="bsd-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={vi?'Tìm theo lớp, loại lỗi...':'Search class or rule...'}/></div>
          <label><Filter size={16}/>{t.filter}<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{vi?'Tất cả':'All'}</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label></div>
        <div className="bsd-two bsd-issues-layout"><section className="bsd-panel bsd-issues-list">
          {issues.length?issues.map(i=><button key={i.id} className={'bsd-issue-line '+(selected?.id===i.id?'selected':'')} onClick={()=>setSelected(i)}>
            <span className={'bsd-severity '+(tone[i.severity]||'info')}></span><span><strong>{i.description}</strong><small>{i.className||'—'} · {i.code}</small></span><ChevronRight size={16}/></button>):<div className="bsd-subempty">{t.emptyIssues}</div>}
        </section><section className="bsd-panel bsd-evidence">
          <div className="bsd-panel-head"><h3>{t.evidence}</h3>{selected&&<button type="button" aria-label={t.closed} onClick={()=>setSelected(null)}><X size={17}/></button>}</div>
          {selected?<><div className="bsd-case-label"><span className={'bsd-severity '+(tone[selected.severity]||'info')}></span>{selected.severity.toUpperCase()} · {selected.code}</div>
            <h3>{selected.description}</h3><p>{selected.detail}</p>
            <dl><dt>{t.scope}</dt><dd>{selected.year} · {selected.className||'—'}</dd><dt>{t.sourceLimited}</dt><dd>{selected.evidence?.source||'—'}</dd></dl>
            {selected.evidence?.studentName&&<div className="bsd-student-evidence"><BookUser size={17}/><span><strong>{t.identity}:</strong> {selected.evidence.studentName}{selected.evidence.studentCode?' · '+selected.evidence.studentCode:''}</span></div>}
            <div className="bsd-advice"><LockKeyhole size={17}/>{t.review}. {t.planDesc}</div>
            <button className="bsd-outline bsd-review-link" type="button" onClick={()=>setTab(3)}>{t.viewPlan}<ArrowRight size={16}/></button>
          </>:<div className="bsd-subempty"><FileSearch size={28}/>{t.choose}</div>}
        </section></div>
      </>}
    </div>}
    {tab===2&&<div className="bsd-stack"><div className="bsd-heading"><div><span className="bsd-overline bsd-dark">SOURCE HEALTH</span><h2>{t.tabs[2]}</h2><p>{t.sourceLimited}</p></div><button className="bsd-outline" onClick={run} disabled={busy}>{t.again}</button></div>
      {!report?<Empty t={t}/>:<section className="bsd-panel">{report.sources.map(s=><SourceRow key={s.id} src={s} vi={vi} expanded/>)}</section>}
    </div>}
    {tab===3&&<div className="bsd-stack">
      <div className="bsd-heading"><div><span className="bsd-overline bsd-dark">REPAIR PREFLIGHT · NO MUTATION</span><h2>{t.planTitle}</h2><p>{t.plansOverview}</p></div>
        <button type="button" className="bsd-outline" disabled={!reviewPlans.length||busy||staleScope} onClick={()=>saveDocket(report,reviewPlans)}><Download size={16}/>{t.docket}</button></div>
      {!report?<Empty t={t}/>:!reviewPlans.length?<div className="bsd-empty">{t.noPlan}</div>:<>
        <div className="bsd-review-summary"><ShieldCheck size={19}/><div><strong>{t.safety}</strong><span>{t.planCount}: {reviewPlans.length} · {t.inactive}</span></div></div>
        {staleScope&&<div className="bsd-banner"><AlertTriangle size={18}/><div><strong>{t.sourceIncomplete}</strong><p>{vi?'Phạm vi quét đã thay đổi. Hãy quét lại trước khi lập hồ sơ rà soát.':'Scope has changed. Rescan before preparing a review docket.'}</p></div></div>}
        <div className="bsd-two bsd-review-layout"><section className="bsd-panel bsd-issues-list">
          {reviewPlans.map(p=><button key={p.id} className={'bsd-issue-line '+(selectedPlan?.id===p.id?'selected':'')} type="button"
            onClick={()=>setSelected(report.issues.find(item=>item.id===p.id)||null)}>
            <span className={'bsd-severity '+(tone[p.severity]||'info')}></span>
            <span><strong>{vi?p.viTitle:p.enTitle}</strong><small>{p.className||'—'} · {p.code} · {p.eligibility==='blocked'?t.blocked:t.reviewable}</small></span>
            <ChevronRight size={16}/></button>)}
        </section><section className="bsd-panel bsd-plan-detail">
          <div className="bsd-panel-head"><h3>{t.preview}</h3><span className={'bsd-status '+(selectedPlan?.eligibility==='blocked'?'warn':'ok')}>{selectedPlan?.eligibility==='blocked'?t.blocked:t.reviewable}</span></div>
          {selectedPlan&&<><h3>{vi?selectedPlan.viTitle:selectedPlan.enTitle}</h3><p>{vi?selectedPlan.viSummary:selectedPlan.enSummary}</p>
            <div className="bsd-plan-meta"><span>{t.scope}: <strong>{selectedPlan.year} · {selectedPlan.className||'—'}</strong></span>
            <span>{vi?'Nguồn':'Source'}: <strong>{selectedPlan.source}</strong></span>
            <span>{t.sourceRevision}: <strong>{selectedPlan.sourceRevision?selectedPlan.sourceRevision.slice(0,19):'—'}</strong></span>
            <span>{vi?'Thời điểm quét':'Scanned'}: <strong>{datetime(selectedPlan.scanAt)}</strong></span></div>
            {selectedPlan.blockers.length>0&&<div className="bsd-plan-blockers"><strong><AlertTriangle size={15}/>{t.constraints}</strong>
              {selectedPlan.blockers.map((item,i)=><div key={i}>{item}</div>)}</div>}
            <h4>{t.steps}</h4><ol>{(vi?selectedPlan.viSteps:selectedPlan.enSteps).map(step=><li key={step}>{step}</li>)}</ol>
            <div className="bsd-advice"><LockKeyhole size={17}/><div><strong>{t.approval}</strong><p>{t.inactive}</p></div></div>
            {selected?.id===selectedPlan.id&&selected.evidence?.studentName&&
              <div className="bsd-student-evidence"><BookUser size={17}/><span><strong>{t.identity}:</strong> {selected.evidence.studentName}{selected.evidence.studentCode?' · '+selected.evidence.studentCode:''}</span></div>}
            <button type="button" className="bsd-outline bsd-review-link" disabled={busy||staleScope} onClick={()=>saveDocket(report,[selectedPlan])}>
              <Download size={16}/>{t.docket}</button>
          </>}
        </section></div></>}
    </div>}
    {tab===4&&<section className="bsd-panel bsd-simple"><span className="bsd-overline bsd-dark">SESSION OBSERVABILITY</span><h2>{t.auditTitle}</h2><p>{t.auditDesc}</p>{history.length?history.map((h,i)=><div className="bsd-history-line" key={h.startedAt+i}><Clock3 size={17}/><div><strong>{datetime(h.startedAt)}</strong><span>{h.schoolYear} · {h.className||t.all} · {h.count} {t.findings} · {h.coverage}</span></div></div>):<Empty t={t}/>}</section>}
    {tab===5&&<section className="bsd-panel bsd-simple"><span className="bsd-overline bsd-dark">GOVERNANCE POLICY</span><h2>{t.settingsTitle}</h2><p>{t.safetyText}</p>{t.settingsLines.map(line=><div className="bsd-policy" key={line}><ShieldCheck size={18}/>{line}</div>)}</section>}
  </div>;
}
function Empty({t}){return <section className="bsd-empty"><div><FileSearch size={32}/></div><h3>{t.empty}</h3><p>{t.emptyDesc}</p></section>;}
function SourceRow({src,vi,expanded=false}){const Icon=iconFor[src.id]||HardDrive;const label=statuses[src.status]?.[vi?0:1]||(vi?'Chưa xác định':'Unknown');
  return <div className="bsd-source-row"><span className="bsd-source-icon"><Icon size={20}/></span><div><strong>{src.label}</strong>{expanded&&<p>{src.message||(vi?'Dữ liệu được phân quyền theo tài khoản hiện tại.':'Visible under the active account only.')}</p>}</div>
    <span className={'bsd-status '+(src.status==='ok'?'ok':src.status==='limited'?'warn':'error')}>{label}</span><span className="bsd-count">{src.count??'—'}</span></div>;}
