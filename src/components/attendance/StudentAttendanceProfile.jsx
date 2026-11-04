import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ChevronRight,
  ClipboardList, Download, FileSpreadsheet, GraduationCap, Lightbulb,
  Printer, Share2, ShieldAlert, Sparkles, TrendingUp, UserRound,
  UsersRound, XCircle, Clock3, Info, BadgeCheck, School,
} from 'lucide-react';
import { absenceReasonLabel } from '../../utils/attendanceReport.js';
import './StudentAttendanceProfile.css';

const activityNames = {remedial:'Phụ đạo',gifted:'Bồi dưỡng',supplemental:'Học bổ sung'};
const statusNames = {present:'Có mặt',late:'Đi trễ',absent:'Vắng'};
const statusNamesEn = {present:'Present',late:'Late',absent:'Absent'};
const alertNames = {good:'Tốt',watch:'Cần theo dõi',danger:'Cần quan tâm',unknown:'Chưa có dữ liệu'};
const alertNamesEn = {good:'Excellent',watch:'Keep an eye on',danger:'Needs attention',unknown:'No data'};
const num = (value,language='vi') => Number(value || 0).toLocaleString(language==='en'?'en-US':'vi-VN',{maximumFractionDigits:2});
const pct = (value,language='vi') => value == null ? '—' : (100 * value).toFixed(1).replace('.',language==='en'?'.':',') + '%';
const humanDate = (value,language='vi') => {
  const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (language==='en'?value:m[3]+'/'+m[2]+'/'+m[1]) : (value || '—');
};
const monthLabel = (value,language='vi') => {
  const m=String(value||'').match(/^(\d{4})-(\d{2})$/);
  if(!m)return language==='en'?'Reporting period':'Kỳ báo cáo';
  if(language==='en')return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(Number(m[1]),Number(m[2])-1,1)));
  return 'Tháng '+Number(m[2])+'/'+m[1];
};
function initials(value) {
  const words=String(value||'').trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(-2).map(w=>w[0]).join('').toLocaleUpperCase('vi') : 'HS';
}

function TrendPaperChart({points=[],language='vi'}) {
  if (!points.length) return <div className="sap-empty"><TrendingUp size={24}/><p>Chưa có dữ liệu chuyên cần để hiển thị xu hướng.</p></div>;
  const ticks=[100,80,60,40,20,0];
  return <div className="sap-trend" role="img"
    aria-label={(language==='en'?'Attendance trend: ':'Xu hướng chuyên cần: ')+points.map(p=>monthLabel(p.month,language)+': '+pct(p.total?p.present/p.total:null,language)).join('; ')}>
    <div className="sap-trend__ticks">{ticks.map(t=><span key={t}>{t}%</span>)}</div>
    <div className="sap-trend__plot">
      <div className="sap-trend__grid" aria-hidden="true">{ticks.map(t=><span key={t}/>)}</div>
      <div className="sap-trend__columns">
        {points.map(point=>{
          const ratio=point.total?Math.max(0,Math.min(100,point.present/point.total*100)):0;
          return <div className="sap-trend__column" key={point.month}>
            <b style={{bottom:`calc(${ratio}% + 7px)`}}>{pct(point.total ? point.present/point.total : null,language)}</b>
            <div className="sap-trend__bar" style={{height:ratio+'%'}}/>
            {ratio===0 ? <i className="sap-trend__zero" aria-hidden="true"/>:null}
            <small>{point.month.slice(5)}/{point.month.slice(0,4)}</small>
          </div>;
        })}
      </div>
    </div>
  </div>;
}
function SubjectPaperChart({rows=[],language='vi'}) {
  if (!rows.length) return <div className="sap-empty"><BookOpen size={24}/><p>Chưa có môn học trong kỳ được chọn.</p></div>;
  return <div className="sap-subject-list">{rows.map(row=>{
    const percentage=row.total ? Math.max(0,Math.min(100,row.present/row.total*100)) : 0;
    return <div className="sap-subject" key={row.subject}>
      <div className="sap-subject__heading"><strong>{row.subject}</strong><span>{num(row.present,language)}/{num(row.total,language)} {language==='en'?'periods':'tiết'} · {pct(row.total?row.present/row.total:null,language)}</span></div>
      <div className="sap-subject__track" role="progressbar" aria-label={(language==='en'?'Attendance in ':'Chuyên cần môn ')+row.subject} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{width:percentage+'%'}}/></div>
    </div>;
  })}</div>;
}
function Metric({tone,icon:Icon,value,label}) {
  return <article className={'sap-metric is-'+tone}>
    <span className="sap-metric__perforation" aria-hidden="true"/>
    <span className="sap-metric__icon"><Icon size={26} strokeWidth={1.9}/></span>
    <div><strong>{value}</strong><span>{label}</span></div>
  </article>;
}
export default function StudentAttendanceProfile({
  student, from, to, loading=false, onBack, onMonthChange, onExcel, onPdf, language='vi',
}) {
  const headingRef=useRef(null);
  const [shareStatus,setShareStatus]=useState('');
  const month=String(from||'').slice(0,7);
  const en=language==='en';
  useEffect(()=>{headingRef.current?.focus({preventScroll:true});},[]);
  const total=Number(student.totalPeriods||0), present=Number(student.presentPeriods||0);
  const absent=Number(student.absentPeriods||0),percent=student.rate;
  const description=total
    ? (absent>0
        ? (en
          ? 'The student missed '+num(absent,language)+' of '+num(total,language)+' periods in this period. Review the recorded reason and follow up where appropriate.'
          : 'Trong kỳ, học sinh vắng '+num(absent)+'/'+num(total)+' tiết. Hãy kiểm tra lý do và phối hợp hỗ trợ việc tham gia học tập.')
        : (en ? 'The student attended every confirmed period in this reporting period.' : 'Học sinh có mặt đủ số tiết được ghi nhận trong kỳ báo cáo.'))
    : (en ? 'No confirmed attendance periods have been recorded for this student in the selected period.' : 'Chưa ghi nhận tiết học đã chốt cho học sinh trong kỳ báo cáo này.');
  const shareText=(en?'STUDENT ATTENDANCE REPORT':'BÁO CÁO CHUYÊN CẦN CÁ NHÂN')+'\n'+student.name+
    '\n'+(en?'Class: ':'Lớp: ')+(student.schoolClass||'—')+'\n'+(en?'Period: ':'Kỳ: ')+monthLabel(month,language)+
    '\n'+(en?'Total periods: ':'Tổng tiết: ')+num(total,language)+'\n'+(en?'Present: ':'Có mặt: ')+num(present,language)+
    '\n'+(en?'Absent: ':'Vắng: ')+num(absent,language)+'\n'+(en?'Attendance rate: ':'Chuyên cần: ')+pct(percent,language);
  async function share() {
    setShareStatus('');
    try {
      if (navigator.share) {
        await navigator.share({title:en?'Student attendance report':'Báo cáo chuyên cần cá nhân',text:shareText});
        return;
      }
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(shareText);
      setShareStatus(en?'Summary copied. No public link was created.':'Đã sao chép bản tóm tắt vào bộ nhớ tạm. Chưa tạo liên kết công khai.');
    } catch(error) {
      if (error?.name!=='AbortError') setShareStatus(en?'Sharing is unavailable in this browser. You can export to Excel or PDF.':'Không thể chia sẻ trên trình duyệt này. Bạn có thể xuất Excel hoặc PDF.');
    }
  }
  return <main className="stud-att-profile" data-student-attendance-profile aria-label={'Hồ sơ chuyên cần '+student.name}>
    <div className="sap-backline">
      <button type="button" className="sap-back" onClick={onBack}><ArrowLeft size={17}/> Quay lại báo cáo điểm danh</button>
      <span className="sap-backline__crumb">BRIAN ENGLISH <ChevronRight size={12}/> ĐIỂM DANH <ChevronRight size={12}/> HỒ SƠ HỌC SINH</span>
    </div>

    <div className="sap-paper-head">
      <span className="sap-head-tape" aria-hidden="true"/>
      <div className="sap-avatar" aria-label={'Ảnh đại diện ký tự '+initials(student.name)}>
        <span className="sap-avatar__ring"><GraduationCap size={27}/><b>{initials(student.name)}</b></span>
      </div>
      <div className="sap-identity">
        <div className="sap-eyebrow"><Sparkles size={14}/> STUDENT ATTENDANCE PROFILE</div>
        <h1 tabIndex={-1} ref={headingRef}>{student.name}</h1>
        <div className="sap-identity__meta">
          <span><School size={17}/> Lớp: <strong>{student.schoolClass||'—'}</strong></span>
          <span><ClipboardList size={17}/> Mã học sinh: <strong>{student.studentCode||'Chưa có mã'}</strong></span>
        </div>
      </div>
      <div className="sap-head-actions">
        <label className="sap-month"><CalendarDays size={17}/><span>Kỳ báo cáo</span><input aria-label="Chọn tháng báo cáo cá nhân" type="month" value={month} onChange={event=>onMonthChange?.(event.target.value)}/></label>
        <span className={'sap-status is-'+student.alert}>{student.alert==='good'?<BadgeCheck size={19}/>:<ShieldAlert size={19}/>} {(en?alertNamesEn:alertNames)[student.alert]||(en?'No data':'Chưa có dữ liệu')}</span>
      </div>
      <span className="sap-head-clip" aria-hidden="true"/>
    </div>

    <div className="sap-layout">
      <div className="sap-primary">
        <section className="sap-metrics" aria-label="Thống kê chuyên cần của học sinh">
          <Metric tone="blue" icon={CalendarDays} value={num(total,language)} label={en?'Total periods':'Tổng tiết'}/>
          <Metric tone="green" icon={CheckCircle2} value={num(present,language)} label={en?'Present':'Có mặt'}/>
          <Metric tone="peach" icon={XCircle} value={num(absent,language)} label={en?'Absent':'Vắng'}/>
          <Metric tone="purple" icon={TrendingUp} value={pct(percent,language)} label={en?'Attendance rate':'Tỷ lệ chuyên cần'}/>
        </section>
        <div className="sap-charts">
          <section className="sap-paper-card"><h2 className="sap-ribbon is-blue"><TrendingUp size={20}/> Xu hướng chuyên cần theo tháng</h2><TrendPaperChart points={student.monthRows} language={language}/></section>
          <section className="sap-paper-card"><h2 className="sap-ribbon is-purple"><BookOpen size={20}/> Chuyên cần theo môn học</h2><SubjectPaperChart rows={student.subjectRows} language={language}/></section>
        </div>
        <section className="sap-absence" aria-label="Phân loại vắng học">
          <ShieldAlert size={20}/>
          <strong>Phân loại vắng:</strong>
          <span>Có phép: <b>{num(student.excusedCount||0,language)}</b> lượt</span>
          <span>Không phép: <b>{num(student.unexcusedCount||0,language)}</b> lượt</span>
          <span>Đi trễ: <b>{num(student.lateCount||0,language)}</b> lượt</span>
        </section>
        <section className="sap-paper-card sap-history" aria-labelledby="sap-history-title">
          <h2 className="sap-ribbon is-blue" id="sap-history-title"><CalendarDays size={20}/> Chi tiết buổi học</h2>
          {student.details?.length ? <div className="sap-history__scroll">
            <table>
              <thead><tr><th>Ngày</th><th>Lớp / Môn học</th><th>Giáo viên</th><th>Tiết</th><th>Trạng thái</th><th>Lý do / Ghi chú</th></tr></thead>
              <tbody>{student.details.map((row,index)=><tr key={row.sessionId+'-'+index}>
                <td><time dateTime={row.date}>{humanDate(row.date,language)}</time></td>
                <td><strong>{row.className||'—'}</strong><small>{row.subject||'—'} · {activityNames[row.activityType]||'Lớp học'}</small></td>
                <td>{row.teacher||'—'}</td>
                <td>{num(row.periods,language)}</td>
                <td><span className={'sap-att-status is-'+row.status}>{row.status==='absent'?<XCircle size={14}/>:row.status==='late'?<Clock3 size={14}/>:<CheckCircle2 size={14}/>} {(en?statusNamesEn:statusNames)[row.status]||'—'}</span></td>
                <td>{row.status==='absent'?(absenceReasonLabel(row.absenceReason)||'Chưa rõ lý do'):'—'}{row.absenceNote ? <small>{row.absenceNote}</small>:null}</td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="sap-empty sap-history__empty"><Info size={22}/><p>Chưa có buổi học đã chốt thuộc kỳ báo cáo này.</p></div>}
        </section>
      </div>
      <aside className="sap-aside">
        <section className="sap-note">
          <span className="sap-note__pin" aria-hidden="true"/>
          <h2><Lightbulb size={22}/> Tổng quan</h2>
          <p>{description}</p>
          <div className="sap-note__meta"><UsersRound size={16}/> {num(student.sessionCount||0,language)} {en?'confirmed sessions':'buổi đã ghi nhận'}</div>
        </section>
        <section className="sap-export" aria-label="Xuất báo cáo cá nhân">
          <h2><Download size={17}/> Công cụ báo cáo</h2>
          <button type="button" onClick={onExcel}><FileSpreadsheet size={19}/> Xuất Excel cá nhân</button>
          <button type="button" className="sap-export__primary" onClick={onPdf}><Printer size={19}/> In / Lưu PDF cá nhân</button>
          <button type="button" onClick={share}><Share2 size={19}/> Chia sẻ bản tóm tắt</button>
          {shareStatus?<p role="status" className="sap-share-status">{shareStatus}</p>:null}
          <p className="sap-export__privacy">Báo cáo chứa dữ liệu học sinh. Chỉ chia sẻ với người có quyền tiếp nhận.</p>
        </section>
        <div className="sap-decoration" aria-hidden="true"><span className="sap-decoration__leaf"/><BookOpen size={58}/><span className="sap-decoration__paper"/></div>
      </aside>
    </div>
    {loading?<div className="sap-updating" role="status">Đang cập nhật số liệu theo kỳ báo cáo…</div>:null}
  </main>;
}
