import { useMemo, useState } from 'react';
import { analyzeGradebook, previewGradePaste, gradebookQualityReport } from '../../utils/gradebookProductivity.js';
import './GradebookProductivityPanel.css';

const TABS=[
  {id:'paste',label:'Nhập nhanh'},
  {id:'progress',label:'Tiến độ'},
  {id:'heatmap',label:'Bản đồ điểm'},
  {id:'alerts',label:'Cảnh báo & hỗ trợ'},
  {id:'quality',label:'Kiểm tra lỗi'},
  {id:'history',label:'Nhật ký'},
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
  onPaste,onSetAlertSettings,onSetIntervention,computeRoundScore,dirty
}){
  const [tab,setTab]=useState('paste');
  const [paste,setPaste]=useState('');
  const [startingStudent,setStartingStudent]=useState('0');
  const [startingColumn,setStartingColumn]=useState('0');
  const [preview,setPreview]=useState(false);
  const [notice,setNotice]=useState('');
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
  const selected=activeStudents.find(s=>s.id===interventionStudent)||activeStudents[0];
  const selectedKey=selected?subjectKey+':'+semesterId+':'+selected.id:'';
  const saved=notes[selectedKey]||{};

  const apply=()=>{
    if(!changes?.entries.length || changes.issues.length)return;
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
  const warnings=info.atRisk;
  const visibleRows=info.rows.filter(row=>filter==='all'||(filter==='missing'&&row.missing>0)||(filter==='risk'&&(row.low||row.dropping)));
  return <details className="gb-prod">
    <summary className="gb-prod-heading">
      <span><strong>Bộ công cụ Sổ điểm</strong><small>Nhập hàng loạt · Tiến độ · Phân tích · Cảnh báo · Nhật ký</small></span>
      <span className="gb-prod-count">{info.incomplete} học sinh chưa đủ 6 thành phần <span aria-hidden="true">⌄</span></span>
    </summary>
    <div className="gb-prod-body">
      <div className="gb-prod-tabs" role="tablist" aria-label="Công cụ mở rộng">
        {TABS.map(item=><button key={item.id} type="button" role="tab" aria-selected={tab===item.id}
          className={tab===item.id?'active':''} onClick={()=>{setTab(item.id);setNotice('');}}>{item.label}</button>)}
      </div>
      {tab==='paste'?<div className="gb-prod-pane" role="tabpanel">
        <h3>Nhập điểm nhanh từ Excel hoặc CSV</h3>
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
            <button type="button" onClick={()=>setPreview(true)} disabled={!paste.trim()}>Kiểm tra dữ liệu</button>
            {preview&&changes?.issues.length===0&&changes?.entries.length>0?<button className="primary" type="button" onClick={apply}>Áp dụng {changes.entries.length} ô vào bảng</button>:null}
          </div>
          {preview&&changes?<div className="gb-prod-preview" role="status">
            <strong>{changes.entries.length} ô hợp lệ · {changes.issues.length} lỗi · {changes.overwrites} ô sẽ thay thế điểm cũ</strong>
            {changes.issues.slice(0,8).map((item,i)=><p key={i} className="gb-prod-error">Hàng {item.row}, cột {item.col}: {item.reason}</p>)}
            <div className="gb-prod-preview-grid">
              {changes.entries.slice(0,12).map((item,i)=><span key={i}>{item.studentName} · {item.columnLabel}: <b>{item.value}</b>{item.overwritten?' (sửa)':''}</span>)}
            </div>
          </div>:null}
        </>}
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
        <div className="gb-prod-fields">
          <label>Ngưỡng điểm thấp<select value={lowLimit} onChange={e=>updateSetting('minimum',Number(e.target.value))}>{[4,5,6,7].map(n=><option key={n} value={n}>{n} điểm</option>)}</select></label>
          <label>Mức giảm TX cần cảnh báo<select value={declineLimit} onChange={e=>updateSetting('decline',Number(e.target.value))}>{[1,1.5,2,2.5,3].map(n=><option key={n} value={n}>{n} điểm</option>)}</select></label>
        </div>
        <div className="gb-prod-alert-list">{warnings.length?warnings.map(r=><div key={r.id}><strong>{r.name}</strong><span>{r.reasons.join(' · ')}</span></div>):<p>Chưa phát hiện trường hợp vượt ngưỡng đã thiết lập.</p>}</div>
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
        {history.length?<div className="gb-prod-history">{history.map((entry,i)=><details key={entry.id||i}><summary><strong>{new Date(entry.at).toLocaleString('vi-VN')}</strong> · {entry.author||'Giáo viên'} · {entry.count} thay đổi</summary><ul>{(entry.changes||[]).slice(0,60).map((change,j)=><li key={j}>{change.term} · {change.kind} · {activeStudents.find(s=>s.id===change.studentId)?.fullName||change.studentId}: {String(change.from||'—')} → {String(change.to||'—')}</li>)}</ul>{entry.count>60?<small>Đang hiển thị 60 thay đổi đầu tiên.</small>:null}</details>)}</div>:<p>Chưa có lần lưu thay đổi mới nào được ghi nhật ký.</p>}
      </div>:null}
    </div>
  </details>;
}
