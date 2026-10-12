/* Homeroom 4.0 — reporting/work tracking (read-only selectors).
 * Only workspace data already loaded for the signed-in teacher.
 * No synthetic participation percentages, no score recomputation.
 */
import { inspectStudentRecord } from './homeroom4RecordsReview.js';

const str = (v) => String(v ?? '').trim();
const list = (v) => Array.isArray(v) ? v : [];
const map = (v) => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_COUNTS = () => ({ recorded: 0, present: 0, late: 0, excused: 0, unexcused: 0, otherAbsence: 0, early: 0 });
export const HOMEROOM_TASK_STATUSES = Object.freeze(['Sắp tới', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy']);
export function localDateIso(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return '';
  return [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
}
function realIsoDay(value){
  if(!ISO_DATE.test(str(value)))return false;
  const timestamp=Date.parse(str(value)+'T00:00:00Z');
  return Number.isFinite(timestamp)&&new Date(timestamp).toISOString().slice(0,10)===str(value);
}
export function validReportRange(start,end){
  return realIsoDay(start)&&realIsoDay(end)&&str(start)<=str(end);
}
export function summarizeHomeroomTasks(workspace={},today=localDateIso()){
  const tasks=list(workspace.schedule).filter(x=>x&&str(x.title));
  const sorted=[...tasks].sort((a,b)=>{
    const aDone=a.status==='Hoàn thành'||a.status==='Đã hủy';
    const bDone=b.status==='Hoàn thành'||b.status==='Đã hủy';
    return Number(aDone)-Number(bDone) || str(a.date||'9999').localeCompare(str(b.date||'9999')) || str(a.title).localeCompare(str(b.title),'vi');
  });
  const active=tasks.filter(x=>!['Hoàn thành','Đã hủy'].includes(x.status));
  return {
    total:tasks.length,open:active.length,
    completed:tasks.filter(x=>x.status==='Hoàn thành').length,
    overdue:active.filter(x=>ISO_DATE.test(str(x.date))&&x.date<today).length,
    today:active.filter(x=>x.date===today).length,
    upcoming:active.filter(x=>ISO_DATE.test(str(x.date))&&x.date>today).length,
    tasks:sorted,
  };
}
function registerStatus(target,status){
  if(!status)return;
  target.recorded++;
  if(status==='present') target.present++;
  else if(status==='late')target.late++;
  else if(status==='excused')target.excused++;
  else if(status==='unexcused')target.unexcused++;
  else if(['absent_one_period','absent_two_periods'].includes(status))target.otherAbsence++;
  else if(status==='early')target.early++;
}
export function buildHomeroomReport(workspace={},start='',end=''){
  if(!validReportRange(start,end))throw new Error('Khoảng báo cáo không hợp lệ.');
  const students=list(workspace.students).filter(x=>x&&x.active!==false);
  const profiles=new Map(students.map(s=>[String(s.id),{student:s,attendance:EMPTY_COUNTS(),conductConfirmed:0,conductPending:0,rewardsConfirmed:0,documents:inspectStudentRecord(map(workspace.studentRecords)[s.id],workspace.classProfile?.grade)}]));
  const total=EMPTY_COUNTS();let sessions=0,lockedSessions=0;
  for(const [key,raw] of Object.entries(map(workspace.attendance))){
    const date=str(key).slice(0,10);
    if(!ISO_DATE.test(date)||date<start||date>end)continue;
    if(!/^\d{4}-\d{2}-\d{2}(?:::|$)/.test(key))continue;
    const statuses=map(raw);
    if(Object.keys(statuses).length===0)continue;
    sessions++;
    if(map(workspace.attendanceLocks)[key]?.locked===true)lockedSessions++;
    for(const [studentId,item] of Object.entries(statuses)){
      const entry=profiles.get(String(studentId));
      if(!entry)continue; // Do not report archived/other-class students.
      const status=str(item?.status);
      registerStatus(entry.attendance,status);
      registerStatus(total,status);
    }
  }
  const confirmed=[];
  for(const item of list(workspace.conductRecords)){
    const date=str(item?.date||item?.weekStart).slice(0,10);
    if(!ISO_DATE.test(date)||date<start||date>end)continue;
    const entry=profiles.get(String(item.studentId));
    if(!entry||item.status==='cancelled')continue;
    if(item.status==='confirmed'){
      entry.conductConfirmed++;
      if(item.entryType==='reward')entry.rewardsConfirmed++;
      confirmed.push(item);
    } else if(item.status==='pending')entry.conductPending++;
  }
  const paperReady=[...profiles.values()].filter(x=>x.documents.paperCompleted===x.documents.paperTotal).length;
  const sourceCoverage=[...profiles.values()].filter(x=>x.documents.sourcePresence.vnedu&&x.documents.sourcePresence.moet).length;
  const fullyVerified=[...profiles.values()].filter(x=>x.documents.complete).length;
  const pendingCorrections=list(workspace.correctionRequests).filter(x=>x?.status==='pending'&&str(x.sessionKey).slice(0,10)>=start&&str(x.sessionKey).slice(0,10)<=end).length;
  const rows=[...profiles.values()].sort((a,b)=>str(a.student.fullName).localeCompare(str(b.student.fullName),'vi'));
  return {
    meta:{className:str(workspace.classProfile?.className),schoolYear:str(workspace.classProfile?.schoolYear),start,end},
    totals:{students:students.length,sessions,lockedSessions,attendance:total,conductConfirmed:confirmed.length,
      conductPending:rows.reduce((n,x)=>n+x.conductPending,0),rewardsConfirmed:confirmed.filter(x=>x.entryType==='reward').length,
      paperReady,sourceCoverage,fullyVerified,pendingCorrections},
    rows,
  };
}
// Prevent formula execution when spreadsheets open exported CSV, even when
// user-provided names start with whitespace, =, +, -, @ or control characters.
export function safeSpreadsheetCell(value) {
  const cell=String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
  return /^[=+@\-]/.test(cell) ? '\''+cell : cell;
}
export function homeroomReportCsvRows(report){
  const t=report.totals,m=report.meta;
  const rows=[
    ['BÁO CÁO CÔNG TÁC CHỦ NHIỆM'],
    ['Lớp',m.className,'Năm học',m.schoolYear],
    ['Từ ngày',m.start,'Đến ngày',m.end],
    ['Học sinh đang học',t.students,'Phiên điểm danh đã lưu',t.sessions,'Phiên đã khóa',t.lockedSessions],
    ['Lượt có mặt',t.attendance.present,'Đi trễ',t.attendance.late,'Vắng phép',t.attendance.excused,'Vắng không phép',t.attendance.unexcused],
    ['Ghi nhận rèn luyện đã xác nhận',t.conductConfirmed,'Khen thưởng đã xác nhận',t.rewardsConfirmed,'Đang chờ xác nhận',t.conductPending],
    ['Hồ sơ giấy đủ',t.paperReady,'Có vnEdu & MOET',t.sourceCoverage,'Hồ sơ hoàn tất & xác nhận',t.fullyVerified],
    [],
    ['Mã học sinh','Họ và tên','Lượt có mặt','Đi trễ','Vắng phép','Vắng không phép','Vắng tiết','Về sớm','Rèn luyện xác nhận','Khen thưởng xác nhận','Giấy tờ đầy đủ','Có dữ liệu vnEdu & MOET','Đã xác nhận hoàn tất'],
    ...report.rows.map(({student,attendance:a,documents:d,conductConfirmed,rewardsConfirmed})=>[
      student.code||'',student.fullName||'',a.present,a.late,a.excused,a.unexcused,a.otherAbsence,a.early,
      conductConfirmed,rewardsConfirmed,
      d.paperCompleted===d.paperTotal?'Có':'Chưa',
      d.sourcePresence.vnedu&&d.sourcePresence.moet?'Có':'Chưa',d.complete?'Có':'Chưa',
    ]),
  ];
  return rows.map(row=>row.map(safeSpreadsheetCell));
}
