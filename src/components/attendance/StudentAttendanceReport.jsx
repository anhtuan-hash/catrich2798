import React, { useEffect, useMemo, useState } from 'react';
import { normalizeSupplementalReportData } from '../../utils/attendanceReport.js';
import { buildStudentAttendanceReport } from '../../utils/studentAttendanceReport.js';
import { downloadStudentAttendanceExcel, printStudentAttendancePdf } from '../../utils/studentAttendanceExport.js';
import './StudentAttendanceReport.css';

const SESSION_FIELDS = 'id,class_id,class_type,class_name,subject,teacher_name,attendance_date,session_status,lesson_periods,teaching_room,teaching_time_range';
const RECORD_FIELDS = 'id,session_id,class_id,member_id,member_key,student_code,student_full_name,school_class_name,status,recorded_at,absence_reason_code,absence_note';
const statusText = { present: 'Có mặt', late: 'Đi trễ', absent: 'Vắng' };
const categoryText = { good: 'Tốt', watch: 'Cần theo dõi', danger: 'Cần quan tâm', unknown: 'Chưa có dữ liệu' };
const activityText = { remedial: 'Phụ đạo', gifted: 'Bồi dưỡng', supplemental: 'Học bổ sung' };
const rate = (value) => value === null ? '—' : (value * 100).toFixed(1).replace('.', ',') + '%';
const localDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const monthStart = (month) => /^\d{4}-\d{2}$/.test(String(month || '')) ? month + '-01' : localDay().slice(0, 7) + '-01';
const monthEnd = (month) => /^\d{4}-\d{2}$/.test(String(month || '')) ? new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)).toISOString().slice(0,10) : localDay();
const split = (items, chunk = 75) => Array.from({length: Math.ceil(items.length / chunk)}, (_,i) => items.slice(i*chunk, (i+1)*chunk));

// PostgREST limits default responses to 1,000 rows. Paginate every query, including
// each group of attendance records, so a large school does not silently lose pupils.
async function allPages(queryFactory, pageSize = 700) {
  const rows = [];
  for (let offset = 0; offset < 150000; offset += pageSize) {
    const { data, error } = await queryFactory().range(offset, offset + pageSize - 1);
    if (error) throw error;
    const part = Array.isArray(data) ? data : [];
    rows.push(...part);
    if (part.length < pageSize) return rows;
  }
  throw new Error('Báo cáo quá lớn để tải toàn bộ an toàn. Hãy thu hẹp khoảng ngày.');
}

async function readHistory(client, from, to, includeSupplemental, activity) {
  const needExtra = activity !== 'supplemental';
  const needSupplemental = includeSupplemental && !['remedial', 'enrichment'].includes(activity);
  let sessions = [], records = [];
  if (needExtra) {
    sessions = await allPages(() => client.from('bes_extra_attendance_sessions')
      .select(SESSION_FIELDS).gte('attendance_date', from).lte('attendance_date', to)
      .order('attendance_date', {ascending:true}).order('id', {ascending:true}));
    const ids = sessions.filter(s=>s.session_status==='completed').map(s=>s.id);
    for (const idGroup of split(ids)) {
      const batch = await allPages(() => client.from('bes_extra_attendance_records')
        .select(RECORD_FIELDS).in('session_id',idGroup)
        .order('id', {ascending:true}));
      records.push(...batch);
    }
  }
  if (needSupplemental) {
    const {data, error} = await client.rpc('bes_list_supplemental_history', {p_from:from,p_to:to,p_query:''});
    if (error) throw error;
    // The existing normalizer marks every non-cancelled item completed.
    // Feed it only actually confirmed sessions to avoid false absences.
    const confirmed = (Array.isArray(data)?data:[]).filter(row=>row.status==='confirmed' || row.status==='completed');
    const normalized = normalizeSupplementalReportData(confirmed);
    sessions = sessions.concat(normalized.sessions);
    records = records.concat(normalized.records);
  }
  return {sessions,records};
}

function TrendChart({points}) {
  if (!points.length) return <p className="stud-att__muted">Chưa đủ dữ liệu tạo biểu đồ.</p>;
  return <div className="stud-att__chart" role="img" aria-label="Biểu đồ tỷ lệ chuyên cần theo tháng">
    {points.map((p)=><div className="stud-att__chart-column" key={p.month}>
      <b>{rate(p.total ? p.present/p.total : null)}</b>
      <div className="stud-att__chart-rail"><span style={{height:(p.total ? p.present/p.total*100 : 0)+'%'}} /></div>
      <small>{p.month.slice(5)}/{p.month.slice(0,4)}</small>
    </div>)}
  </div>;
}

function SubjectChart({rows}) {
  if (!rows.length) return <p className="stud-att__muted">Chưa có môn học.</p>;
  return <div className="stud-att__subjects">
    {rows.map(row=><div className="stud-att__subject" key={row.subject}>
      <div><strong>{row.subject}</strong><small>{row.present}/{row.total} tiết · {rate(row.total ? row.present/row.total : null)}</small></div>
      <div className="stud-att__bar"><span style={{width: (row.total ? row.present/row.total*100 : 0)+'%'}} /></div>
    </div>)}
  </div>;
}

export default function StudentAttendanceReport({client, month, onError, includeSupplemental=true, activityType='all'}) {
  const [from,setFrom] = useState(()=>monthStart(month));
  const [to,setTo] = useState(()=>monthEnd(month));
  const [category,setCategory] = useState(activityType);
  const [classId,setClassId] = useState('all');
  const [schoolClass,setSchoolClass] = useState('all');
  const [grade,setGrade] = useState('all');
  const [subject,setSubject] = useState('all');
  const [teacher,setTeacher] = useState('all');
  const [search,setSearch] = useState('');
  const [warning,setWarning] = useState('all');
  const [sorting,setSorting] = useState('rate-asc');
  const [thresholds,setThresholds] = useState({goodAt:90,warningAt:80,unexcusedAt:2,lateAt:3});
  const [dataset,setDataset] = useState({sessions:[],records:[]});
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [refreshKey,setRefreshKey] = useState(0);
  const [selectedStudent,setSelectedStudent] = useState('');
  const [checked,setChecked] = useState([]);
  useEffect(()=>{setCategory(activityType);},[activityType]);
  useEffect(()=>{setFrom(monthStart(month));setTo(monthEnd(month));},[month]);
  useEffect(()=>{
    if (!client || !from || !to || from > to) return;
    let stopped = false;
    setLoading(true);setError('');
    readHistory(client,from,to,includeSupplemental,category).then(data=>{
      if(stopped)return;
      setDataset(data);
    }).catch(err=>{if(stopped)return;setError(err.message||'Không tải được dữ liệu.');onError?.(err.message||'Không tải được dữ liệu.');})
      .finally(()=>{if(!stopped)setLoading(false);});
    return ()=>{stopped=true;};
  },[client,from,to,category,includeSupplemental,refreshKey]);

  const allClasses = useMemo(() => [...new Map(dataset.sessions.map(s=>[String(s.class_id),s])).values()]
    .sort((a,b)=>String(a.class_name).localeCompare(String(b.class_name),'vi')), [dataset.sessions]);
  const classes = useMemo(() => [...new Set(dataset.records.map(r=>String(r.school_class_name||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi')), [dataset.records]);
  const subjects = useMemo(() => [...new Set(dataset.sessions.map(s=>s.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi')), [dataset.sessions]);
  const teachers = useMemo(() => [...new Set(dataset.sessions.map(s=>s.teacher_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi')), [dataset.sessions]);
  const result = useMemo(()=>buildStudentAttendanceReport({
    ...dataset,activityType:category,classId,schoolClass,grade,subject,teacher,search,alert:warning,thresholds,
  }),[dataset,category,classId,schoolClass,grade,subject,teacher,search,warning,thresholds]);
  const students = useMemo(()=>{
    const values = [...result.students];
    if(sorting==='name')return values.sort((a,b)=>a.name.localeCompare(b.name,'vi'));
    if(sorting==='rate-desc')return values.sort((a,b)=>(b.rate??-1)-(a.rate??-1));
    if(sorting==='absent-desc')return values.sort((a,b)=>b.absentPeriods-a.absentPeriods);
    return values;
  },[result.students,sorting]);
  useEffect(()=>{setChecked([]);},[category,classId,schoolClass,grade,subject,teacher,search,warning,from,to,refreshKey]);
  const selected = students.find(s=>s.key===selectedStudent)||null;
  const exportStudents = checked.length ? students.filter(s=>checked.includes(s.key)) : students;
  const params = {from,to,activityType:category};
  const chooseAll = (checkedValue)=>setChecked(checkedValue?students.map(s=>s.key):[]);
  const doExcel = ()=>{try{downloadStudentAttendanceExcel(exportStudents,params);}catch(e){onError?.(e.message);}};
  const doPdf = ()=>{try{printStudentAttendancePdf(exportStudents,params);}catch(e){onError?.(e.message);}};
  const options = (data,selector)=>data.map(s=><option key={selector(s)} value={selector(s)}>{selector(s)}</option>);

  return <section className="stud-att">
    <header className="stud-att__intro">
      <div><span className="stud-att__eyebrow">THEO DÕI HỌC SINH</span><h3>Báo cáo tình hình tham gia học tập</h3><p>Tính theo số tiết của các buổi đã chốt; tách rõ có mặt, đi trễ và vắng học.</p></div>
      <div className="stud-att__actions"><button disabled={loading||!exportStudents.length} onClick={doExcel}>↓ Xuất Excel</button><button className="stud-att__primary" disabled={loading||!exportStudents.length} onClick={doPdf}>▣ In / Lưu PDF</button></div>
    </header>
    <div className="stud-att__filters">
      <label>Từ ngày<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>Đến ngày<input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label>
      <label>Loại học<select value={category} onChange={e=>{setCategory(e.target.value);setClassId('all');}}><option value="all">Tất cả</option><option value="remedial">Phụ đạo</option><option value="enrichment">Bồi dưỡng</option>{includeSupplemental?<option value="supplemental">Học bổ sung</option>:null}</select></label>
      <label>Lớp học<select value={classId} onChange={e=>setClassId(e.target.value)}><option value="all">Tất cả lớp học</option>{allClasses.filter(s=>category==='all'||s.class_type===(category==='enrichment'?'gifted':category)).map(s=><option key={s.class_id} value={s.class_id}>{s.class_name}</option>)}</select></label>
      <label>Khối<select value={grade} onChange={e=>setGrade(e.target.value)}><option value="all">Tất cả khối</option><option value="10">Khối 10</option><option value="11">Khối 11</option><option value="12">Khối 12</option></select></label>
      <label>Lớp hành chính<select value={schoolClass} onChange={e=>setSchoolClass(e.target.value)}><option value="all">Tất cả</option>{options(classes,x=>x)}</select></label>
      <label>Môn học<select value={subject} onChange={e=>setSubject(e.target.value)}><option value="all">Tất cả môn</option>{options(subjects,x=>x)}</select></label>
      <label>Giáo viên<select value={teacher} onChange={e=>setTeacher(e.target.value)}><option value="all">Tất cả giáo viên</option>{options(teachers,x=>x)}</select></label>
      <label>Tìm học sinh<input type="search" placeholder="Tên hoặc mã học sinh" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label>Cảnh báo<select value={warning} onChange={e=>setWarning(e.target.value)}><option value="all">Tất cả mức</option><option value="danger">Cần quan tâm</option><option value="watch">Cần theo dõi</option><option value="good">Tốt</option></select></label>
      <label>Sắp xếp<select value={sorting} onChange={e=>setSorting(e.target.value)}><option value="rate-asc">Chuyên cần thấp trước</option><option value="rate-desc">Chuyên cần cao trước</option><option value="absent-desc">Vắng nhiều trước</option><option value="name">Tên A–Z</option></select></label>
      <button className="stud-att__refresh" disabled={loading||from>to} onClick={()=>setRefreshKey(v=>v+1)}>↻ Cập nhật</button>
    </div>
    <details className="stud-att__configuration"><summary>Thiết lập ngưỡng cảnh báo</summary><div>
      <label>Tốt từ (%)<input type="number" min="1" max="100" value={thresholds.goodAt} onChange={e=>setThresholds(t=>({...t,goodAt:Number(e.target.value)}))}/></label>
      <label>Quan tâm dưới (%)<input type="number" min="0" max="99" value={thresholds.warningAt} onChange={e=>setThresholds(t=>({...t,warningAt:Number(e.target.value)}))}/></label>
      <label>Vắng không phép (buổi)<input type="number" min="1" max="100" value={thresholds.unexcusedAt} onChange={e=>setThresholds(t=>({...t,unexcusedAt:Number(e.target.value)}))}/></label>
      <label>Đi trễ (buổi)<input type="number" min="1" max="100" value={thresholds.lateAt} onChange={e=>setThresholds(t=>({...t,lateAt:Number(e.target.value)}))}/></label>
    </div></details>
    {from>to?<p className="stud-att__error">Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>:null}
    {error?<p role="alert" className="stud-att__error">{error} · Dữ liệu chưa được xác nhận là đầy đủ.</p>:null}
    {loading?<div className="stud-att__loading">Đang đọc dữ liệu và đối chiếu lịch sử điểm danh…</div>:null}
    {!loading&&!error&&from<=to?<React.Fragment>
      <div className="stud-att__metrics">
        <article><strong>{result.totals.students}</strong><span>Học sinh</span></article>
        <article><strong>{result.totals.totalPeriods}</strong><span>Lượt tiết theo danh sách</span></article>
        <article><strong>{rate(result.totals.rate)}</strong><span>Chuyên cần</span></article>
        <article><strong>{result.totals.atRisk}</strong><span>Cần theo dõi</span></article>
      </div>
      <div className="stud-att__table-wrap"><table><thead><tr>
        <th><input type="checkbox" checked={Boolean(students.length)&&students.every(s=>checked.includes(s.key))} onChange={e=>chooseAll(e.target.checked)} aria-label="Chọn tất cả học sinh"/></th>
        <th>Học sinh</th><th>Lớp</th><th>Số lớp</th><th>Buổi</th><th>Tổng tiết</th><th>Có mặt</th><th>Vắng</th><th>Đi trễ</th><th>Chuyên cần</th><th>Đánh giá</th><th>Chi tiết</th>
      </tr></thead><tbody>
        {students.map(s=><tr key={s.key}>
          <td><input type="checkbox" checked={checked.includes(s.key)} onChange={e=>setChecked(keys=>e.target.checked?[...new Set([...keys,s.key])]:keys.filter(x=>x!==s.key))} aria-label={'Chọn '+s.name}/></td>
          <td><b>{s.name}</b><small>{s.studentCode||'Chưa có mã'}</small></td><td>{s.schoolClass||'—'}</td><td>{s.classCount}</td><td>{s.sessionCount}</td><td>{s.totalPeriods}</td><td>{s.presentPeriods}</td><td>{s.absentPeriods}</td><td>{s.lateCount}</td>
          <td><div className="stud-att__rate"><b>{rate(s.rate)}</b><span><i style={{width:((s.rate||0)*100)+'%'}} /></span></div></td>
          <td><span className={'stud-att__level is-'+s.alert}>{categoryText[s.alert]}</span></td>
          <td><button className="stud-att__detail-btn" onClick={()=>setSelectedStudent(s.key)}>Xem</button></td>
        </tr>)}
        {!students.length?<tr><td colSpan={12} className="stud-att__empty">Chưa có học sinh có dữ liệu điểm danh đã chốt phù hợp bộ lọc.</td></tr>:null}
      </tbody></table></div>
      <p className="stud-att__footnote">Chỉ tổng hợp học sinh có bản ghi điểm danh hợp lệ. Buổi bị hủy hoặc chưa chốt không tính là vắng. Đi trễ vẫn tính là có mặt. Số liệu chỉ phản ánh mức độ tham gia, không đánh giá kết quả học tập. Học sinh thiếu mã được đối chiếu bằng họ tên và lớp hành chính; nên bổ sung mã HS để tránh nhầm lẫn. {checked.length?'Đang chọn '+checked.length+' học sinh để xuất.':'Không chọn riêng: xuất toàn bộ danh sách đang lọc.'}</p>
    </React.Fragment>:null}
    {selected?<div className="stud-att__overlay" role="presentation" onClick={()=>setSelectedStudent('')}>
      <section role="dialog" aria-modal="true" aria-label={'Báo cáo '+selected.name} className="stud-att__dialog" onClick={e=>e.stopPropagation()}>
        <header><div><span className="stud-att__eyebrow">HỒ SƠ CHUYÊN CẦN</span><h2>{selected.name}</h2><p>{selected.studentCode||'Chưa có mã'} · Lớp {selected.schoolClass||'—'}</p></div><button onClick={()=>setSelectedStudent('')} aria-label="Đóng báo cáo học sinh">✕</button></header>
        <div className="stud-att__metrics"><article><strong>{selected.totalPeriods}</strong><span>Tổng tiết</span></article><article><strong>{selected.presentPeriods}</strong><span>Có mặt</span></article><article><strong>{selected.absentPeriods}</strong><span>Vắng</span></article><article><strong>{rate(selected.rate)}</strong><span>Chuyên cần</span></article></div>
        <p><span className={'stud-att__level is-'+selected.alert}>{categoryText[selected.alert]}</span> · Vắng có phép: {selected.excusedCount} · Không phép: {selected.unexcusedCount} · Đi trễ: {selected.lateCount}</p>
        <div className="stud-att__charts"><div><h3>Xu hướng chuyên cần theo tháng</h3><TrendChart points={selected.monthRows}/></div><div><h3>Tham gia theo môn học</h3><SubjectChart rows={selected.subjectRows}/></div></div>
        <h3>Chi tiết buổi học</h3>
        <div className="stud-att__table-wrap"><table><thead><tr><th>Ngày</th><th>Lớp / môn</th><th>Giáo viên</th><th>Tiết</th><th>Trạng thái</th><th>Lý do / ghi chú</th></tr></thead><tbody>{selected.details.map(d=><tr key={d.sessionId}><td>{d.date}</td><td><b>{d.className}</b><small>{d.subject} · {activityText[d.activityType]}</small></td><td>{d.teacher||'—'}</td><td>{d.periods}</td><td>{statusText[d.status]}</td><td>{d.absenceReason||'—'} {d.absenceNote}</td></tr>)}</tbody></table></div>
        <footer><button onClick={()=>downloadStudentAttendanceExcel([selected],params)}>Xuất Excel cá nhân</button><button className="stud-att__primary" onClick={()=>{try{printStudentAttendancePdf([selected],params);}catch(e){onError?.(e.message);}}}>In / Lưu PDF cá nhân</button></footer>
      </section></div>:null}
  </section>;
}
