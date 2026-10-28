import React from 'react';
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Eye, GraduationCap, LayoutGrid, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { APPS } from '../data/apps.js';
import './GuestPreview.css';

// No API calls, authenticated hooks, iframe, student lists, or user state.
// All numbers and labels below are explicitly illustrative.
const CATALOG_SLUGS = ['questatlas', 'lesson-check-studio', 'thpt-practice-hub', 'textlab-activities', 'textcare'];
const CATALOG = CATALOG_SLUGS.map((slug) => APPS.find((app) => app.slug === slug)).filter(Boolean);
const SAMPLE_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SAMPLE_WEEKS = [1, 2, 3, 4, 5, 6, 7];
const SAMPLE_BARS = [36, 64, 48, 84, 66, 93, 57];
const SAMPLE_CHECKS = [
  ['Vocabulary', 'Từ vựng', '12'],
  ['Grammar', 'Ngữ pháp', '16'],
  ['Speaking', 'Nói', '08'],
  ['Review', 'Ôn tập', '10'],
];

function GuestPill({ children }) {
  return <span className="brian-guest-preview__pill"><Eye size={14} aria-hidden="true" />{children}</span>;
}
function GuestSection({ title, subtitle, children }) {
  return <section className="brian-guest-preview__section"><div className="brian-guest-preview__section-head"><h2>{title}</h2><p>{subtitle}</p></div>{children}</section>;
}
function AppsDemo({ en }) {
  return <GuestSection title={en ? 'Explore teaching tools' : 'Khám phá kho ứng dụng'} subtitle={en ? 'An illustrative catalog. Tools launch only after sign-in and authorization.' : 'Xem mô tả ứng dụng công khai. Chỉ mở công cụ khi đăng nhập và được cấp quyền.'}>
    <div className="brian-guest-preview__app-grid">
      {CATALOG.map((app, index) => <article key={app.slug} className="brian-guest-preview__app-card">
        <div className={'brian-guest-preview__app-symbol brian-guest-preview__app-symbol--' + (index % 4)} aria-hidden="true">{app.icon || 'BE'}</div>
        <div><span className="brian-guest-preview__app-group">{en ? app.group : app.groupVi || app.group}</span><h3>{en ? app.title : app.titleVi || app.title}</h3><p>{en ? app.desc : app.descVi || app.desc}</p></div>
        <span className="brian-guest-preview__disabled"><LockKeyhole size={13} />{en ? 'Sign in to use' : 'Đăng nhập để dùng'}</span>
      </article>)}
    </div>
  </GuestSection>;
}
function DashboardDemo({ en }) {
  return <>
    <div className="brian-guest-preview__summary-grid">
      {[
        { icon: CalendarDays, value: '05', vi: 'Hoạt động mẫu', en: 'Sample activities', tone: 'blue' },
        { icon: GraduationCap, value: '02', vi: 'Buổi dạy mẫu', en: 'Sample lessons', tone: 'mint' },
        { icon: Users, value: '01', vi: 'Cuộc họp mẫu', en: 'Sample meetings', tone: 'violet' },
        { icon: CheckCircle2, value: '00', vi: 'Việc ưu tiên mẫu', en: 'Sample priorities', tone: 'orange' },
      ].map(({icon: Icon, value, vi, en: english, tone}) => <div className={'brian-guest-preview__metric is-' + tone} key={tone}><Icon size={22}/><strong>{value}</strong><span>{en ? english : vi}</span></div>)}
    </div>
    <div className="brian-guest-preview__dashboard-grid">
      <section className="brian-guest-preview__surface"><h2><CalendarDays size={20}/>{en ? 'Sample calendar' : 'Lịch minh họa'}</h2><div className="brian-guest-preview__calendar">{SAMPLE_DAYS.map((d,i)=><span key={d} className="is-label">{en ? ['M','T','W','T','F','S','S'][i] : d}</span>)}{SAMPLE_WEEKS.map((day)=><span key={day} className={day === 4 ? 'is-selected' : ''}>{day}</span>)}</div><p>{en ? 'This calendar contains no real schedules.' : 'Lịch không chứa công việc hoặc sự kiện thật.'}</p></section>
      <section className="brian-guest-preview__surface"><h2><BarChart3 size={20}/>{en ? 'Activity overview' : 'Tổng quan hoạt động'}</h2><div className="brian-guest-preview__chart" aria-label={en ? 'Illustrative bar chart' : 'Biểu đồ số liệu minh họa'}>{SAMPLE_BARS.map((height,i)=><div key={i}><span style={{height: height + '%'}}/><small>{SAMPLE_DAYS[i]}</small></div>)}</div><p>{en ? 'Demo metrics only. Personal reports require login.' : 'Chỉ sử dụng số liệu giả lập. Báo cáo cá nhân cần đăng nhập.'}</p></section>
    </div>
    <GuestSection title={en ? 'Today at a glance' : 'Tổng quan công việc hôm nay'} subtitle={en ? 'Example modules visible without opening protected records.' : 'Các thành phần minh họa, không mở hồ sơ nội bộ.'}><div className="brian-guest-preview__steps"><span>{en ? 'Teaching plan' : 'Kế hoạch giảng dạy'}</span><span>{en ? 'Monthly overview' : 'Tổng quan tháng'}</span><span>{en ? 'Upcoming events' : 'Sự kiện sắp tới'}</span></div></GuestSection>
  </>;
}
function AssessmentDemo({ en }) {
  return <><div className="brian-guest-preview__summary-grid"><div className="brian-guest-preview__metric is-mint"><ClipboardCheck size={22}/><strong>04</strong><span>{en ? 'Sample categories' : 'Danh mục minh họa'}</span></div><div className="brian-guest-preview__metric is-violet"><LayoutGrid size={22}/><strong>16</strong><span>{en ? 'Sample activities' : 'Hoạt động mẫu'}</span></div><div className="brian-guest-preview__metric is-blue"><Users size={22}/><strong>04</strong><span>{en ? 'Demo groups' : 'Nhóm minh họa'}</span></div></div>
    <GuestSection title={en ? 'Assessment activity preview' : 'Xem trước hoạt động kiểm tra'} subtitle={en ? 'Illustrative categories; no assessment can be opened, scored or saved.' : 'Danh mục minh họa; không thể chạy, chấm điểm hoặc lưu bài kiểm tra.'}><div className="brian-guest-preview__app-grid">{SAMPLE_CHECKS.map(([english,vietnamese,count],i)=><article key={english} className="brian-guest-preview__app-card"><div className={'brian-guest-preview__app-symbol brian-guest-preview__app-symbol--' + i}><ClipboardCheck size={24}/></div><div><span className="brian-guest-preview__app-group">{en ? 'Activity bank' : 'Kho hoạt động'}</span><h3>{en ? english : vietnamese}</h3><p>{en ? 'Practice, review and classroom assessment previews' : 'Xem mô phỏng hoạt động luyện tập và kiểm tra trên lớp'}</p></div><span className="brian-guest-preview__disabled">{count} {en ? 'sample cards' : 'thẻ mẫu'}</span></article>)}</div></GuestSection>
  </>;
}
function AttendanceDemo({ en }) {
  return <><div className="brian-guest-preview__summary-grid">
    <div className="brian-guest-preview__metric is-blue"><CalendarDays size={22}/><strong>03</strong><span>{en ? 'Sample sessions' : 'Buổi học mẫu'}</span></div>
    <div className="brian-guest-preview__metric is-mint"><CheckCircle2 size={22}/><strong>02</strong><span>{en ? 'Sample completed' : 'Buổi mẫu hoàn tất'}</span></div>
    <div className="brian-guest-preview__metric is-orange"><Users size={22}/><strong>01</strong><span>{en ? 'Sample upcoming' : 'Buổi mẫu sắp tới'}</span></div>
  </div>
  <GuestSection title={en ? 'Attendance workspace preview' : 'Xem trước giao diện điểm danh'} subtitle={en ? 'No real classes, students or attendance records are loaded.' : 'Không tải danh sách lớp, học sinh hoặc lịch sử điểm danh thật.'}><div className="brian-guest-preview__attendance-grid">{[
    {id:'01',vi:'Lịch điểm danh',en:'Attendance calendar'},
    {id:'02',vi:'Điểm danh nhanh',en:'Quick attendance'},
    {id:'03',vi:'Lịch sử minh họa',en:'Sample history'},
  ].map((item)=><div className="brian-guest-preview__attendance-card" key={item.id}><span>{item.id}</span><h3>{en ? item.en : item.vi}</h3><p>{en ? 'View only · demo data' : 'Chỉ xem · dữ liệu mẫu'}</p><LockKeyhole size={18}/></div>)}</div></GuestSection></>;
}

export default function GuestPreview({ route, language = 'vi' }) {
  const en = language === 'en';
  const isCheck = route === 'tool';
  const title = route === 'apps' ? (en ? 'Applications' : 'Ứng dụng') : route === 'dashboard' ? 'Dashboard' : isCheck ? (en ? 'Assessment' : 'Kiểm tra') : (en ? 'Attendance' : 'Điểm danh');
  const Icon = route === 'apps' ? LayoutGrid : route === 'dashboard' ? BarChart3 : isCheck ? ClipboardCheck : CalendarDays;
  return <div className="brian-guest-preview" data-public-preview={route} data-demo-only="true">
    <header className="brian-guest-preview__hero"><div><GuestPill>{en ? 'Public preview · read only' : 'Xem trước công khai · chỉ đọc'}</GuestPill><h1><Icon size={32} aria-hidden="true"/>{title}</h1><p>{en ? 'Explore BRIAN without signing in. All information here is illustrative. Sign in to use features and see your authorized information.' : 'Khám phá BRIAN mà không cần đăng nhập. Toàn bộ số liệu bên dưới chỉ mang tính minh họa. Đăng nhập để sử dụng chức năng và xem dữ liệu được phân quyền.'}</p></div><div className="brian-guest-preview__hero-mark"><ShieldCheck size={40}/><span>{en ? 'Private data protected' : 'Dữ liệu được bảo vệ'}</span></div></header>
    {route === 'apps' ? <AppsDemo en={en}/> : route === 'dashboard' ? <DashboardDemo en={en}/> : isCheck ? <AssessmentDemo en={en}/> : <AttendanceDemo en={en}/>}
    <aside className="brian-guest-preview__cta"><div><LockKeyhole size={22}/><div><strong>{en ? 'Ready to use BRIAN?' : 'Bạn muốn sử dụng BRIAN?'}</strong><p>{en ? 'Sign in to access features assigned to your account.' : 'Đăng nhập để sử dụng những chức năng tài khoản của bạn được cấp quyền.'}</p></div></div><a href="#/login" data-guest-allow="true">{en ? 'Sign in' : 'Đăng nhập'}<ArrowRight size={17}/></a></aside>
  </div>;
}
