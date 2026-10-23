import { useMemo, useState } from 'react';
import { analyzeGradebook, previewGradePaste, gradebookQualityReport } from '../../utils/gradebookProductivity.js';
import { readGradebookXlsx, previewGradebookExcelImport } from '../../utils/gradebookExcelImport.js';
import { gradebookFinalizationReadiness, exportGradebookAuditCsv } from '../../utils/gradebookFinalization.js';
import './GradebookProductivityPanel.css';
import GradebookPhase3Panel from './GradebookPhase3Panel.jsx';
import { ClipboardPenLine, ChartNoAxesCombined, Grid2X2, ShieldAlert, ShieldCheck, History, LockKeyhole, ClipboardList, FileChartColumn, RotateCcw } from 'lucide-react';

const TABS=[
  {id:'paste',icon:<ClipboardPenLine size={18} strokeWidth={2.2}/>,label:'Nhập nhanh'},
  {id:'progress',icon:<ChartNoAxesCombined size={18} strokeWidth={2.2}/>,label:'Tiến độ'},
  {id:'heatmap',icon:<Grid2X2 size={18} strokeWidth={2.2}/>,label:'Bản đồ điểm'},
  {id:'alerts',icon:<ShieldAlert size={18} strokeWidth={2.2}/>,label:'Cảnh báo & hỗ trợ'},
  {id:'quality',icon:<ShieldCheck size={18} strokeWidth={2.2}/>,label:'Kiểm tra lỗi'},
  {id:'history',icon:<History size={18} strokeWidth={2.2}/>,label:'Nhật ký'},
  {id:'finalize',icon:<LockKeyhole size={18} strokeWidth={2.2}/>,label:'Chốt điểm'},
  {id:'rubric',icon:<ClipboardList size={18} strokeWidth={2.2}/>,label:'Rubric'},
  {id:'report',icon:<FileChartColumn size={18} strokeWidth={2.2}/>,label:'Phiếu tiến bộ'},
  {id:'recovery',icon:<RotateCcw size={18} strokeWidth={2.2}/>,label:'Khôi phục'},
];
const DISPLAY=['TX 1','TX 2','TX 3','TX 4','Giữa kỳ','Cuối kỳ'];
function chipColor(score){
  if(score==null)return 'missing';
  if(score<5)return 'low';
  if(score<7)return 'middle';
  if(score<8)return 'good';
  return 'high';
}
export default function GradebookProductivityPanel({
  students,semester,activeRound,roundIndex,gradebook,subjectKey,semesterId,
  onPaste,onSetAlertSettings,onSetIntervention,onSetFinalization,onSaveRubric,onRestoreHistory,
  subjectName,workspace,currentUser,computeRoundScore,dirty,finalized=false,embedded=false
}){
  const [tab,setTab]=useState('paste');
  const [paste,setPaste]=useState('');
  const [startingStudent,setStartingStudent]=useState('0');
  const [startingColumn,setStartingColumn]=useState('0');
  const [preview,setPreview]=useState(false);
  const [notice,setNotice]=useState('');
  const [excelFile,setExcelFile]=useState(null);
  const [excelData,setExcelData]=useState(null);
  const [excelSheet,setExcelSheet]=useState('');
  const [excelBusy,setExcelBusy]=useState(false);
  const [excelError,setExcelError]=useState('');
  const [excelReview,setExcelReview]=useState(false);
  const [excelMatch,setExcelMatch]=useState('code');
  const [excelFirstRow,setExcelFirstRow]=useState('1');
  const [excelStudentCol,setExcelStudentCol]=useState('0');
  const [excelScoreCol,setExcelScoreCol]=useState('1');
  const [unlockReason,setUnlockReason]=useState('');
  const [filter,setFilter]=useState('all');
  const [interventionStudent,setInterventionStudent]=useState('');
  const [interventionNote,setInterventionNote]=useState('');
  const [interventionTarget,setInterventionTarget]=useState('7');
  const [interventionStatus,setInterventionStatus]=useState('planned');
  const activeStudents=useMemo(()=>students.filter(item=>item.active!==false),[students]);
  const alertSettings=gradebook.alertSettings||{minimum:5,decline:2};
  const lowLimit=Number(alertSettings.minimum??5);
  const declineLimit=Number(alertSettings.decline??2);
  const info=useMemo(()=>analyzeGradebook({
    students:activeStudents,semester,minimum:lowLimit,decline:declineLimit,
    computeRoundScore,
  }),[activeStudents,semester,lowLimit,declineLimit,computeRoundScore]);
  const changes=useMemo(()=>activeRound?previewGradePaste({
    text:paste,students:activeStudents,columns:activeRound.columns,
    startRow:Number(startingStudent),startColumn:Number(startingColumn),scores:activeRound.scores,
  }):null,[activeRound,activeStudents,paste,startingStudent,startingColumn]);
  const qualityIssues=useMemo(()=>gradebookQualityReport({students:activeStudents,semester}),[activeStudents,semester]);
  const notes=gradebook.interventions||{};
  const history=gradebook.auditHistory||[];
  const excelSummary=useMemo(()=>activeRound&&excelData?previewGradebookExcelImport({
    rows:excelData.rows,students:activeStudents,columns:activeRound.columns,
    scores:activeRound.scores,firstDataRow:Number(excelFirstRow),
    studentColumn:Number(excelStudentCol),scoreColumn:Number(excelScoreCol),
    matchBy:excelMatch,
  }):null,[activeRound,excelData,activeStudents,excelFirstRow,excelStudentCol,excelScoreCol,excelMatch]);
  const readiness=useMemo(()=>gradebookFinalizationReadiness({students:activeStudents,semester,computeRoundScore}),[activeStudents,semester,computeRoundScore]);
  const selected=activeStudents.find(s=>s.id===interventionStudent)||activeStudents[0];
  const selectedKey=selected?subjectKey+':'+semesterId+':'+selected.id:'';
  const saved=notes[selectedKey]||{};

  const apply=()=>{
    if(finalized||!changes?.entries.length || changes.issues.length)return;
    if(changes.overwrites>0&&!window.confirm('Sẽ thay '+changes.overwrites+' ô điểm đã có. Bạn có muốn tiếp tục?'))return;
    onPaste(changes.entries);
    setNotice('Đã đưa '+changes.entries.length+' điểm vào bảng. Nhấn Lưu bảng điểm để lưu chính thức.');
    setPreview(false);
    setPaste('');
  };
  const updateSetting=(key,value)=>{
    onSetAlertSettings({...alertSettings,[key]:value});
  };
  const commitIntervention=()=>{
    if(!selected)return;
    const note=interventionNote.trim();
    if(!note)return;
    onSetIntervention(selectedKey,{
      note:note.slice(0,1200),target:Number(interventionTarget),status:interventionStatus,
      updatedAt:new Date().toISOString(),
    });
    setInterventionNote('');
  };
  const loadExcel=async(file,sheet)=>{
    if(!file)return;
    setExcelBusy(true);setExcelError('');setExcelReview(false);
    try{
      const result=await readGradebookXlsx(file,{sheet});
      setExcelFile(file);setExcelData(result);setExcelSheet(result.selectedSheet);
    }catch(error){
      setExcelError(error?.message||'Không đọc được tệp Excel.');
      setExcelData(null);
    }finally{setExcelBusy(false);}
  };
  const applyExcel=()=>{
    if(!excelReview||finalized||!excelSummary?.entries.length||excelSummary.errors.length)return;
    if(excelSummary.overwrites>0 && !window.confirm('Bạn sắp ghi đè '+excelSummary.overwrites+' ô điểm đã nhập. Tiếp tục?'))return;
    onPaste(excelSummary.entries);
    setNotice('Đã thêm '+excelSummary.entries.length+' điểm từ Excel. Hãy bấm Lưu bảng điểm để ghi dữ liệu.');
    setExcelReview(false);setExcelData(null);setExcelFile(null);
  };
  const downloadAudit=()=>{
    const csv=exportGradebookAuditCsv(history);
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download='brian-gradebook-history.csv';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const warnings=info.atRisk;
  const visibleRows=info.rows.filter(row=>filter==='all'||(filter==='missing'&&row.missing>0)||(filter==='risk'&&(row.low||row.dropping)));
  const Container = embedded ? 'section' : 'details';
  return <Container className={embedded ? 'gb-prod gb-prod-embedded' : 'gb-prod'}>
    {!embedded ? <summary className="gb-prod-heading">
      <span><strong>Bộ công cụ Sổ điểm</strong><small>Nhập hàng loạt · Tiến độ · Phân tích · Cảnh báo · Nhật ký</small></span>
      <span className="gb-prod-count">{info.incomplete} học sinh chưa đủ 6 thành phần <span aria-hidden="true">⌄</span></span>
    </summary> : null}
    <div className="gb-prod-body">
      <div className="gb-prod-tabs" role="tablist" aria-label="Công cụ mở rộng">
        {TABS.map(item=><button key={item.id} type="button" role="tab" aria-selected={tab===item.id}
          className={tab===item.id?'active':''} data-tab={item.id} onClick={()=>{setTab(item.id);setNotice('');}}><span className="gb-prod-tab-art" aria-hidden="true">{item.icon}</span><span className="gb-prod-tab-label">{item.label}</span></button>)}
      </div>
      {tab==='paste'?<div className="gb-prod-pane" role="tabpanel">
        <h3>Nhập điểm nhanh từ Excel hoặc CSV</h3>
        {finalized?<p className="gb-prod-alert">Học kỳ này đã chốt; cần mở khóa trước khi nhập điểm.</p>:null}
        <p>Sao chép một vùng điểm từ Excel/Google Sheets rồi dán vào đây. Các ô trống sẽ được bỏ qua; không tự xóa điểm cũ. Chỉ cập nhật khi đã kiểm tra và xác nhận.</p>
        {!activeRound?<p className="gb-prod-alert">Hãy chọn một đợt điểm TX (1–4) để sử dụng nhập hàng loạt.</p>:<>
          <div className="gb-prod-fields">
            <label>Học sinh bắt đầu<select value={startingStudent} onChange={e=>{setStartingStudent(e.target.value);setPreview(false)}}>
              {activeStudents.map((s,i)=><option key={s.id} value={i}>{i+1}. {s.fullName}</option>)}
            </select></label>
            <label>Cột đầu tiên<select value={startingColumn} onChange={e=>{setStartingColumn(e.target.value);setPreview(false)}}>
              {activeRound.columns.map((c,i)=><option key={c.id} value={i}>{c.label}</option>)}
            </select></label>
            <label>Nhập từ tệp CSV / TSV
              <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={async e=>{
                const file=e.target.files?.[0];if(!file)return;
                if(file.size>300000){setNotice('Tệp vượt quá giới hạn 300 KB.');return;}
                setPaste((await file.text()).replace(/^\uFEFF/,''));setPreview(false);
                e.target.value='';
              }}/>
            </label>
          </div>
          <textarea className="gb-prod-paste" value={paste} onChange={e=>{setPaste(e.target.value);setPreview(false)}} rows={5}
            placeholder={'8.5\t9\t7\n6\t7\t8\n9\t9.5\t10'} aria-label="Dán dữ liệu điểm từ Excel"/>
          <div className="gb-prod-actions">
            <button type="button" onClick={()=>setPreview(true)} disabled={!paste.trim()||finalized}>Kiểm tra dữ liệu</button>
            {preview&&changes?.issues.length===0&&changes?.entries.length>0?<button className="primary" type="button" onClick={apply} disabled={finalized}>Áp dụng {changes.entries.length} ô vào bảng</button>:null}
          </div>
          {preview&&changes?<div className="gb-prod-preview" role="status">
            <strong>{changes.entries.length} ô hợp lệ · {changes.issues.length} lỗi · {changes.overwrites} ô sẽ thay thế điểm cũ</strong>
            {changes.issues.slice(0,8).map((item,i)=><p key={i} className="gb-prod-error">Hàng {item.row}, cột {item.col}: {item.reason}</p>)}
            <div className="gb-prod-preview-grid">
              {changes.entries.slice(0,12).map((item,i)=><span key={i}>{item.studentName} · {item.columnLabel}: <b>{item.value}</b>{item.overwritten?' (sửa)':''}</span>)}
            </div>
          </div>:null}
        </>}
        {activeRound?<details className="gb-prod-excel">
          <summary className="gb-prod-excel-trigger"><span aria-hidden="true">▤</span><strong>Nhập tệp Excel (.xlsx) có đối chiếu học sinh</strong><small>Mở khi cần nhập từ tệp thay vì sao chép và dán</small><span className="gb-prod-excel-chevron" aria-hidden="true">⌄</span></summary>
          <div className="gb-prod-excel-content">
          <p>Chọn file tối đa 2 MB. File phải có một cột chứa mã học sinh hoặc họ tên và các cột điểm. Việc ghép mã/tên được kiểm tra trước, không dựa vào thứ tự danh sách.</p>
          <div className="gb-prod-fields">
            <label>Tệp Excel
              <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={excelBusy||finalized} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)loadExcel(file);}}/>
            </label>
            {excelData?<label>Worksheet
              <select value={excelSheet} onChange={e=>loadExcel(excelFile,e.target.value)} disabled={excelBusy||finalized}>
                {excelData.sheetNames.map(name=><option key={name} value={name}>{name}</option>)}
              </select></label>:null}
          </div>
          {excelBusy?<p role="status">Đang đọc và kiểm tra file Excel…</p>:null}
          {excelError?<p className="gb-prod-error" role="alert">{excelError}</p>:null}
          {excelData?<><div className="gb-prod-fields">
            <label>Đối chiếu theo<select value={excelMatch} onChange={e=>{setExcelMatch(e.target.value);setExcelReview(false)}}>
              <option value="code">Mã học sinh</option><option value="name">Họ và tên</option></select></label>
            <label>Dòng bắt đầu có điểm (Excel)<input type="number" min="1" max={excelData.rows.length} value={Number(excelFirstRow)+1} onChange={e=>{setExcelFirstRow(String(Math.max(0,Number(e.target.value||1)-1)));setExcelReview(false)}}/></label>
            <label>Cột mã/tên (Excel)<input type="number" min="1" max="60" value={Number(excelStudentCol)+1} onChange={e=>{setExcelStudentCol(String(Math.max(0,Number(e.target.value||1)-1)));setExcelReview(false)}}/></label>
            <label>Cột điểm đầu tiên (Excel)<input type="number" min="1" max="60" value={Number(excelScoreCol)+1} onChange={e=>{setExcelScoreCol(String(Math.max(0,Number(e.target.value||1)-1)));setExcelReview(false)}}/></label>
          </div>
          <div className="gb-prod-actions">
            <button type="button" disabled={excelBusy||finalized} onClick={()=>setExcelReview(true)}>Đối chiếu & xem trước</button>
            {excelReview&&excelSummary?.entries.length>0&&excelSummary.errors.length===0?<button className="primary" type="button" disabled={finalized} onClick={applyExcel}>Áp dụng {excelSummary.entries.length} điểm</button>:null}
          </div>
          {excelReview&&excelSummary?<div className="gb-prod-preview" role="status">
            <strong>{excelSummary.matched} học sinh đối chiếu được · {excelSummary.entries.length} ô hợp lệ · {excelSummary.errors.length} lỗi · {excelSummary.overwrites} ô sẽ bị thay</strong>
            {excelSummary.errors.slice(0,12).map((item,i)=><p key={i} className="gb-prod-error">Dòng {item.row}: {item.reason}</p>)}
            <div className="gb-prod-preview-grid">
              {excelSummary.entries.slice(0,18).map((item,i)=><span key={i}>{item.studentName} · {item.columnLabel}: {item.previous!==''?String(item.previous)+' → ':''}<b>{item.value}</b></span>)}
            </div>
            {excelSummary.errors.length>0?<small>Cần sửa tệp hoặc thông số đối chiếu để áp dụng. Không tự bỏ qua dòng lỗi.</small>:null}
          </div>:null}
          </>:null}
          </div>
        </details>:null}
        {notice?<p className="gb-prod-notice" role="status">{notice}</p>:null}
        {dirty?<small>Đang có thay đổi chưa lưu trong Sổ điểm.</small>:null}
      </div>:null}
      {tab==='progress'?<div className="gb-prod-pane" role="tabpanel">
        <h3>Tiến độ hoàn thành điểm</h3>
        <div className="gb-prod-stats"><div><b>{info.students}</b><span>Học sinh</span></div><div><b>{info.complete}</b><span>Đủ 6 thành phần</span></div><div><b>{info.incomplete}</b><span>Còn thiếu</span></div><div><b>{info.missingCells}</b><span>Thành phần thiếu</span></div></div>
        <div className="gb-prod-progress"><div style={{width:(info.students?info.complete/info.students*100:0)+'%'}}/></div>
        <p>{info.students?Math.round(info.complete/info.students*100):0}% hoàn thành. Một đợt TX được tính đã nhập nếu học sinh có ít nhất một điểm hợp lệ trong đợt.</p>
        <div className="gb-prod-fields"><label>Bộ lọc<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả học sinh</option><option value="missing">Còn thiếu điểm</option><option value="risk">Có cảnh báo</option></select></label></div>
        <div className="gb-prod-scroll"><table><thead><tr><th>Học sinh</th>{DISPLAY.map(x=><th key={x}>{x}</th>)}<th>Đã đủ</th></tr></thead>
          <tbody>{visibleRows.map(r=><tr key={r.id}><th scope="row">{r.name}</th>{[...r.rounds,r.midterm,r.final].map((n,i)=><td key={i}>{n==null?'—':n.toFixed(1)}</td>)}<td>{r.completed}/6</td></tr>)}</tbody></table>
        </div>
      </div>:null}
      {tab==='heatmap'?<div className="gb-prod-pane" role="tabpanel">
        <h3>Bản đồ điểm lớp học</h3><p>Kết quả được tính theo dữ liệu hiện tại, không phải điểm dự đoán. Ô trống là thành phần chưa có kết quả.</p>
        <div className="gb-prod-scroll"><table className="gb-prod-heat"><thead><tr><th>Học sinh</th>{DISPLAY.map(x=><th key={x}>{x}</th>)}</tr></thead>
          <tbody>{info.rows.map(r=><tr key={r.id}><th scope="row">{r.name}</th>{[...r.rounds,r.midterm,r.final].map((n,i)=><td key={i} className={'tone-'+chipColor(n)} title={n==null?'Chưa nhập':n.toFixed(2)}>{n==null?'—':n.toFixed(1)}</td>)}</tr>)}</tbody></table></div>
        <p className="gb-prod-legend">Đỏ: dưới 5 · Vàng: 5–6.9 · Xanh nhạt: 7–7.9 · Xanh lá: 8–10 · Xám: chưa nhập</p>
      </div>:null}
      {tab==='alerts'?<div className="gb-prod-pane" role="tabpanel">
        <h3>Cảnh báo theo quy tắc & theo dõi hỗ trợ</h3>
        <p>Chỉ phát hiện điểm thấp và mức giảm theo ngưỡng giáo viên đặt ra. Đây không phải đánh giá năng lực hay hoàn cảnh học sinh.</p>
        <div className="gb-prod-alerts-layout">
          <section className="gb-prod-alerts-card" aria-label="Thiết lập cảnh báo điểm">
            <div className="gb-prod-alerts-card-heading"><strong>Thiết lập cảnh báo</strong><span>{warnings.length} trường hợp cần theo dõi</span></div>
            <div className="gb-prod-fields">
          <label>Ngưỡng điểm thấp<select value={lowLimit} onChange={e=>updateSetting('minimum',Number(e.target.value))}>{[4,5,6,7].map(n=><option key={n} value={n}>{n} điểm</option>)}</select></label>
          <label>Mức giảm TX cần cảnh báo<select value={declineLimit} onChange={e=>updateSetting('decline',Number(e.target.value))}>{[1,1.5,2,2.5,3].map(n=><option key={n} value={n}>{n} điểm</option>)}</select></label>
        </div>
        <div className="gb-prod-alert-list">{warnings.length?warnings.map(r=><div key={r.id}><strong>{r.name}</strong><span>{r.reasons.join(' · ')}</span></div>):<p>Chưa phát hiện trường hợp vượt ngưỡng đã thiết lập.</p>}</div>
          </section>
          <section className="gb-prod-alerts-card" aria-label="Ghi nhận hỗ trợ học sinh">
        <h4>Ghi nhận kế hoạch hỗ trợ</h4>
        <div className="gb-prod-fields">
          <label>Học sinh<select value={selected?.id||''} onChange={e=>{setInterventionStudent(e.target.value);setInterventionNote('')}}>
            {activeStudents.map(s=><option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select></label>
          <label>Mục tiêu<select value={interventionTarget} onChange={e=>setInterventionTarget(e.target.value)}>{[5,6,7,8,9,10].map(n=><option key={n} value={n}>{n} điểm</option>)}</select></label>
          <label>Trạng thái<select value={interventionStatus} onChange={e=>setInterventionStatus(e.target.value)}>
            <option value="planned">Đã lên kế hoạch</option><option value="in-progress">Đang hỗ trợ</option><option value="completed">Đã hoàn thành</option>
          </select></label>
        </div>
        {saved.note?<p className="gb-prod-existing">Ghi nhận gần nhất: {saved.note} · {saved.status==='completed'?'Đã hoàn thành':saved.status==='in-progress'?'Đang hỗ trợ':'Đã lên kế hoạch'} (mục tiêu {saved.target})</p>:null}
        <textarea rows={3} value={interventionNote} onChange={e=>setInterventionNote(e.target.value)} maxLength={1200} placeholder="Hoạt động hỗ trợ cụ thể, thời gian, kết quả cần đạt" aria-label="Nội dung kế hoạch hỗ trợ học sinh"/>
        <div className="gb-prod-actions"><button type="button" disabled={!interventionNote.trim()||!selected} onClick={commitIntervention}>Lưu kế hoạch vào Sổ điểm</button></div>
        <small>Cần bấm Lưu bảng điểm để đồng bộ các ghi nhận mới.</small>
          </section>
        </div>
      </div>:null}
      {tab==='quality'?<div className="gb-prod-pane" role="tabpanel">
        <h3>Kiểm tra chất lượng dữ liệu</h3>
        <p>Phát hiện mã học sinh bị trùng, thiếu tên, điểm ngoài thang 0–10 hoặc số dấu cộng không hợp lệ. Việc kiểm tra không thay đổi dữ liệu.</p>
        <div className="gb-prod-stats"><div><b>{qualityIssues.length}</b><span>Vấn đề cần kiểm tra</span></div>
          <div><b>{info.missingCells}</b><span>Thành phần còn thiếu</span></div>
          <div><b>{info.students}</b><span>Học sinh đang học</span></div>
          <div><b>{info.complete}</b><span>Đã đủ 6 thành phần</span></div></div>
        {qualityIssues.length?<div className="gb-prod-alert-list">{qualityIssues.slice(0,100).map((issue,i)=><div key={i}><strong>{activeStudents.find(x=>x.id===issue.studentId)?.fullName||'Dữ liệu điểm'}</strong><span>{issue.reason}</span></div>)}</div>
        :<p className="gb-prod-notice">Chưa phát hiện mã trùng hoặc điểm không hợp lệ trong dữ liệu đang mở.</p>}
        <small>Số thành phần còn thiếu không đồng nghĩa với điểm sai; vui lòng đối chiếu kế hoạch kiểm tra của lớp.</small>
      </div>:null}
      {tab==='history'?<div className="gb-prod-pane" role="tabpanel">
        <h3>Nhật ký lưu và chỉnh sửa điểm</h3><p>Hiển thị lịch sử các lần lưu từ sau khi bật tính năng. Chỉ ghi các điểm thực sự đổi; dữ liệu lịch sử cũ không thể tự khôi phục.</p>
        <div className="gb-prod-actions"><button type="button" disabled={!history.length} onClick={downloadAudit}>Xuất nhật ký CSV</button></div>
        {history.length?<div className="gb-prod-history">{history.map((entry,i)=><details key={entry.id||i}><summary><strong>{new Date(entry.at).toLocaleString('vi-VN')}</strong> · {entry.author||'Giáo viên'} · {entry.count} thay đổi</summary><ul>{(entry.changes||[]).slice(0,60).map((change,j)=><li key={j}>{change.term} · {change.kind} · {activeStudents.find(s=>s.id===change.studentId)?.fullName||change.studentId}: {String(change.from||'—')} → {String(change.to||'—')}</li>)}</ul>{entry.count>60?<small>Đang hiển thị 60 thay đổi đầu tiên.</small>:null}</details>)}</div>:<p>Chưa có lần lưu thay đổi mới nào được ghi nhật ký.</p>}
      </div>:null}
      {tab==='finalize'?<div className="gb-prod-pane" role="tabpanel">
        <h3>Chốt học kỳ (khóa thao tác nhập điểm)</h3>
        <p>Chốt học kỳ sẽ khóa chỉnh sửa điểm trong giao diện BRIAN cho môn và học kỳ đang mở. Đây là cơ chế quản lý quy trình, không phải khóa bảo mật cấp cơ sở dữ liệu.</p>
        <div className="gb-prod-stats"><div><b>{readiness.studentCount}</b><span>Học sinh</span></div>
          <div><b>{readiness.missing.length}</b><span>Thành phần chưa có điểm</span></div>
          <div><b>{finalized?'Đã chốt':'Chưa chốt'}</b><span>Trạng thái học kỳ</span></div>
        </div>
        {readiness.missing.length>0?<div className="gb-prod-alert-list">{readiness.missing.slice(0,12).map((row,i)=><div key={i}><strong>{row.name}</strong><span>Thiếu {row.part}</span></div>)}</div>:null}
        {dirty?<p className="gb-prod-alert">Hãy lưu hoặc hoàn tác những thay đổi hiện tại trước khi chốt/mở khóa.</p>:null}
        {!finalized&&qualityIssues.length>0?<p className="gb-prod-alert">Có {qualityIssues.length} lỗi dữ liệu. Hãy xử lý trong tab Kiểm tra lỗi trước khi chốt.</p>:null}
        {finalized?<div className="gb-prod-fields"><label>Lý do mở khóa (ít nhất 8 ký tự)
          <textarea rows={2} maxLength={300} value={unlockReason} onChange={e=>setUnlockReason(e.target.value)} placeholder="Ví dụ: Điều chỉnh điểm sau khi đối chiếu bài kiểm tra"/>
        </label></div>:null}
        <div className="gb-prod-actions">
          {finalized?<button type="button" disabled={dirty||unlockReason.trim().length<8}
            onClick={()=>{if(window.confirm('Mở khóa học kỳ này để tiếp tục chỉnh sửa điểm?')){onSetFinalization(false,unlockReason);setUnlockReason('');}}}>Xác nhận mở khóa</button>
          :<button className="primary" type="button" disabled={dirty||!readiness.ready||qualityIssues.length>0}
            onClick={()=>{if(window.confirm('Bạn xác nhận đã kiểm tra đầy đủ điểm và muốn chốt học kỳ?'))onSetFinalization(true,'');}}>Chốt điểm học kỳ</button>}
        </div>
        <small>Sau khi chốt hoặc mở khóa, bấm Lưu bảng điểm để đồng bộ trạng thái. Mọi lần chuyển trạng thái được ghi trong lịch sử.</small>
        {(gradebook.finalizationHistory||[]).length?<div className="gb-prod-history">
          {(gradebook.finalizationHistory||[]).slice(0,12).map((x,i)=><div className="gb-prod-existing" key={x.id||i}>{x.locked?'Chốt':'Mở khóa'} · {x.key} · {new Date(x.at).toLocaleString('vi-VN')} · {x.actor} {x.reason?'— '+x.reason:''}</div>)}
        </div>:null}
      </div>:null}
      <GradebookPhase3Panel
        mode={tab}
        gradebook={gradebook}
        students={students}
        semester={semester}
        semesterId={semesterId}
        subjectKey={subjectKey}
        subjectName={subjectName}
        workspace={workspace}
        currentUser={currentUser}
        dirty={dirty}
        finalized={finalized}
        onSaveRubric={onSaveRubric}
        onRestoreHistory={onRestoreHistory}
      />
    </div>
  </Container>;
}
