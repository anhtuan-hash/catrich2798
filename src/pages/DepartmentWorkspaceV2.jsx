import React, { useEffect, useMemo, useState } from 'react';
import './DepartmentWorkspaceV2.css';

const TABS = [
  ['overview', 'Tổng quan', 'home'],
  ['calendar', 'Lịch', 'calendar'],
  ['tasks', 'Giao việc', 'clipboard'],
  ['plans', 'Kế hoạch', 'plan'],
  ['records', 'Hồ sơ', 'folder'],
  ['meetings', 'Sinh hoạt tổ', 'users'],
  ['evidence', 'Minh chứng', 'layers'],
  ['reports', 'Báo cáo', 'chart'],
];

const DEFAULT_TASKS = [
  { id: 1, title: 'Xây dựng ma trận đề kiểm tra học kỳ II môn Tiếng Anh 6', assignee: 'Nguyễn Thị Mai', initials: 'NM', due: '20/05/2025', status: 'Đang thực hiện', progress: 60, tone: 'violet' },
  { id: 2, title: 'Dự giờ đồng nghiệp – Tháng 5', assignee: 'Trần Minh Đức', initials: 'TD', due: '15/05/2025', status: 'Đang thực hiện', progress: 40, tone: 'green' },
  { id: 3, title: 'Biên soạn chuyên đề: Dạy học phát triển năng lực giao tiếp', assignee: 'Phạm Thu Hà', initials: 'PH', due: '25/05/2025', status: 'Chưa bắt đầu', progress: 0, tone: 'amber' },
  { id: 4, title: 'Tổng hợp minh chứng thi đua học kỳ II', assignee: 'Lê Hoàng Nam', initials: 'LN', due: '10/05/2025', status: 'Quá hạn', progress: 100, tone: 'rose' },
];

const DEFAULT_NOTIFICATIONS = [
  { id: 1, icon: 'clipboard', tone: 'violet', title: 'Có 2 công việc sắp đến hạn', detail: 'Ma trận đề kiểm tra học kỳ II, Minh chứng thi đua HKII', time: '5 phút trước', read: false },
  { id: 2, icon: 'users', tone: 'blue', title: 'Cuộc họp tổ vào 15:30 hôm nay', detail: 'Nội dung: Đánh giá hoạt động tháng 5', time: '30 phút trước', read: false },
  { id: 3, icon: 'check', tone: 'green', title: 'Hồ sơ của Nguyễn Thị Mai đã được phê duyệt', detail: 'Kế hoạch bài dạy Unit 8 – Lớp 6A1', time: '1 giờ trước', read: false },
  { id: 4, icon: 'folder', tone: 'amber', title: 'Minh chứng mới được cập nhật', detail: 'Thầy Nam đã thêm minh chứng mới cho chuyên đề STEM', time: '2 giờ trước', read: true },
  { id: 5, icon: 'document', tone: 'rose', title: 'Báo cáo tháng 4/2025 đã hoàn thành', detail: 'Bạn có thể xem và xuất báo cáo', time: '3 giờ trước', read: true },
];

const MEETING_ITEMS = [
  { id: 1, title: 'Hoàn thiện ma trận đề kiểm tra cuối kỳ II', owner: 'Cô Mai', due: '16/05' },
  { id: 2, title: 'Chuẩn bị minh chứng chuyên đề STEM', owner: 'Thầy Nam', due: '20/05' },
  { id: 3, title: 'Tổng hợp tài liệu ứng dụng AI trong dạy học', owner: 'Cô Hương', due: '18/05' },
];

const REPORTS = [
  ['Báo cáo hoạt động tháng 4/2025', 'Cập nhật: 08/05/2025'],
  ['Báo cáo sinh hoạt tổ quý II', 'Cập nhật: 05/05/2025'],
  ['Báo cáo chuyên đề STEM', 'Cập nhật: 28/04/2025'],
];

const EVENTS = [
  ['16', 'THÁNG 5', 'Họp tổ chuyên môn', '15:30 – 17:00', 'Phòng họp 2', 'violet'],
  ['18', 'THÁNG 5', 'Dự giờ lớp 11A2', '07:00 – 07:45', 'Phòng 11A2', 'green'],
  ['20', 'THÁNG 5', 'Hạn nộp ma trận kiểm tra', '17:00', 'Trực tuyến', 'amber'],
  ['23', 'THÁNG 5', 'Chuyên đề ứng dụng AI', '14:00 – 16:30', 'Phòng đa năng', 'blue'],
];

const PLANS = [
  ['Kế hoạch năm học', 68, '17/25 đầu việc', 'violet'],
  ['Kế hoạch học kỳ II', 82, '14/17 đầu việc', 'blue'],
  ['Kế hoạch tháng 5', 73, '8/11 đầu việc', 'green'],
  ['Kế hoạch chuyên đề', 55, '5/9 đầu việc', 'amber'],
];

const EVIDENCE = [
  { type: 'document', badge: 'W', title: 'Giáo án Unit 8 – 6A1', date: '06/05/2025' },
  { type: 'classroom', badge: 'IMG', title: 'Ảnh dự giờ 06/05', date: '06/05/2025' },
  { type: 'video', badge: '▶', title: 'Video thao giảng', date: '15/04/2025' },
  { type: 'pdf', badge: 'PDF', title: 'SKKN Ứng dụng AI', date: '05/05/2025' },
];

function statusClass(status) {
  return status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '-');
}

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
  }, [key, value]);
  return [value, setValue];
}

function Icon({ name, size = 18, strokeWidth = 1.9 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 14h7M8.5 18h4"/></>,
    plan: <><path d="M4 19.5V6.5A2.5 2.5 0 0 1 6.5 4H20v15.5H6.5A2.5 2.5 0 0 0 4 22"/><path d="M8 8h8M8 12h8"/></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    document: <><path d="M6 2h9l3 3v17H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    menu: <><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return <svg {...props}>{paths[name] || paths.document}</svg>;
}

function Portrait({ initials = 'NM', tone = 'violet', size = 42 }) {
  return (
    <span className={`dwD-portrait ${tone}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64"><circle cx="32" cy="25" r="13" className="skin"/><path d="M18 26c0-12 7-19 15-19 10 0 16 7 16 18-4-5-7-8-14-9-4 4-9 7-17 10Z" className="hair"/><path d="M11 64c1-17 10-25 21-25s20 8 21 25" className="shirt"/></svg>
      <b>{initials}</b>
    </span>
  );
}

function HeroArt() {
  return (
    <svg className="dwD-hero-art" viewBox="0 0 420 210" role="img" aria-label="Minh họa dữ liệu chuyên môn">
      <defs>
        <linearGradient id="glass" x1="0" x2="1"><stop stopColor="#fff" stopOpacity=".82"/><stop offset="1" stopColor="#d8d2ff" stopOpacity=".4"/></linearGradient>
        <linearGradient id="book1" x1="0" x2="1"><stop stopColor="#917eff"/><stop offset="1" stopColor="#6651e5"/></linearGradient>
        <linearGradient id="book2" x1="0" x2="1"><stop stopColor="#d9d3ff"/><stop offset="1" stopColor="#a294ff"/></linearGradient>
        <linearGradient id="leaf" x1="0" x2="1"><stop stopColor="#33c57d"/><stop offset="1" stopColor="#159c65"/></linearGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#7065b8" floodOpacity=".2"/></filter>
      </defs>
      <ellipse cx="218" cy="181" rx="148" ry="16" fill="#7363c8" opacity=".12"/>
      <g filter="url(#soft)" transform="translate(88 115)">
        <path d="M0 35h235l-8 24H8z" fill="url(#book1)"/>
        <path d="M13 17h220l-5 22H7z" fill="url(#book2)"/>
        <path d="M22 0h205l7 21H15z" fill="#fff" opacity=".9"/>
      </g>
      <g filter="url(#soft)" transform="translate(132 22) rotate(-4 88 55)">
        <rect width="184" height="112" rx="18" fill="url(#glass)" stroke="#fff" strokeWidth="2"/>
        <rect x="18" y="18" width="148" height="76" rx="12" fill="#fff" opacity=".5"/>
        <g transform="translate(34 44)"><rect x="0" y="27" width="16" height="24" rx="3" fill="#8a74ff"/><rect x="26" y="14" width="16" height="37" rx="3" fill="#6f59ea"/><rect x="52" y="22" width="16" height="29" rx="3" fill="#9f8fff"/><rect x="78" y="4" width="16" height="47" rx="3" fill="#725be9"/></g>
        <path d="M30 70c22-11 30-3 47-18 16-14 28 5 46-12 10-9 20-4 31-15" fill="none" stroke="#5944db" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="30" cy="70" r="4" fill="#5944db"/><circle cx="77" cy="52" r="4" fill="#5944db"/><circle cx="123" cy="40" r="4" fill="#5944db"/><circle cx="154" cy="25" r="4" fill="#5944db"/>
      </g>
      <g transform="translate(330 96)"><path d="M34 74h42l-4 35H38z" fill="#98c987"/><path d="M55 76C25 53 33 26 50 7c10 20 15 39 5 69Z" fill="url(#leaf)"/><path d="M57 79C67 47 83 33 101 31c-3 21-14 40-44 48Z" fill="#43bd7c"/><path d="M51 78C25 70 12 54 9 37c20 4 36 17 42 41Z" fill="#2eaf72"/></g>
    </svg>
  );
}

function MetricCard({ icon, tone, label, value, trend, neutral }) {
  return <article className="dwD-metric"><span className={`dwD-icon ${tone}`}><Icon name={icon}/></span><p>{label}</p><strong>{value}</strong><small className={neutral ? 'neutral' : ''}>{neutral ? '＝' : '↑'} {trend}</small></article>;
}

function Status({ value }) {
  return <span className={`dwD-status ${statusClass(value)}`}>{value}</span>;
}

function TaskRow({ task }) {
  return <article className="dwD-task-row"><Portrait initials={task.initials} tone={task.tone}/><div className="dwD-task-copy"><strong>{task.title}</strong><small>{task.assignee}</small></div><Status value={task.status}/><div className="dwD-due"><small>Hạn hoàn thành</small><strong>{task.due}</strong></div><div className="dwD-progress"><b>{task.progress}%</b><span><i style={{ width: `${task.progress}%` }}/></span></div><button className="dwD-icon-button" aria-label="Tùy chọn"><Icon name="menu"/></button></article>;
}

function PanelTitle({ title, action, onAction }) {
  return <div className="dwD-panel-title"><h2>{title}</h2>{action ? <button onClick={onAction}>{action} <Icon name="arrow" size={15}/></button> : null}</div>;
}

function NotificationPanel({ notifications, setNotifications, onClose }) {
  const unread = notifications.filter((item) => !item.read).length;
  const markAll = () => setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  return <aside className="dwD-notifications"><header><div><h2>Thông báo</h2><small>{unread} thông báo chưa đọc</small></div><button onClick={markAll}>Đánh dấu đã đọc</button><button className="dwD-close" onClick={onClose}><Icon name="close" size={16}/></button></header><div className="dwD-notification-list">{notifications.map((item) => <button key={item.id} className={item.read ? 'read' : ''} onClick={() => setNotifications((items) => items.map((note) => note.id === item.id ? { ...note, read: true } : note))}><span className={`dwD-icon ${item.tone}`}><Icon name={item.icon}/></span><span><strong>{item.title}</strong><small>{item.detail}</small><time>{item.time}</time></span>{!item.read ? <i/> : null}</button>)}</div><button className="dwD-notification-footer">Xem tất cả thông báo <Icon name="arrow" size={15}/></button></aside>;
}

function EvidenceVisual({ type, badge }) {
  return <div className={`dwD-evidence-visual ${type}`}><span>{badge}</span>{type === 'document' && <div className="sheet"><b/><b/><b/><b/></div>}{type === 'classroom' && <div className="scene"><i/><i/><i/><i/><em/></div>}{type === 'video' && <div className="scene video"><i/><i/><i/><em/><b>▶</b></div>}{type === 'pdf' && <div className="pdf-sheet"><b/><b/><b/><b/></div>}</div>;
}

function Overview({ tasks, setTasks, meetingChecks, setMeetingChecks, onCreate }) {
  const [filter, setFilter] = useState('Tất cả');
  const filters = ['Tất cả', 'Chưa bắt đầu', 'Đang thực hiện', 'Quá hạn', 'Hoàn thành'];
  const shown = filter === 'Tất cả' ? tasks : tasks.filter((task) => task.status === filter || (filter === 'Hoàn thành' && task.progress === 100 && task.status !== 'Quá hạn'));
  return <div className="dwD-overview">
    <div className="dwD-top-grid">
      <section className="dwD-hero"><div><h1>Tổng quan tổ chuyên môn</h1><p>Cập nhật bức tranh tổng thể về hoạt động và hiệu quả của tổ chuyên môn.</p><button onClick={() => window.location.hash = '#/tool/department-workspace'}>Xem kế hoạch tháng 5 <Icon name="arrow" size={16}/></button></div><HeroArt/></section>
      <div className="dwD-metrics"><MetricCard icon="clipboard" tone="violet" label="Công việc đang thực hiện" value="12" trend="20% so với tháng trước"/><MetricCard icon="check" tone="green" label="Công việc hoàn thành" value="28" trend="25% so với tháng trước"/><MetricCard icon="users" tone="amber" label="Buổi sinh hoạt đã tổ chức" value="4" trend="so với tháng trước" neutral/><MetricCard icon="layers" tone="blue" label="Minh chứng đã cập nhật" value="56" trend="15% so với tháng trước"/></div>
    </div>

    <div className="dwD-middle-grid">
      <section className="dwD-panel dwD-tasks"><PanelTitle title="Bảng giao việc" action="Xem tất cả" onAction={() => {}}/><div className="dwD-filter-tabs">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}<span>{item === 'Tất cả' ? tasks.length : tasks.filter((task) => task.status === item || (item === 'Hoàn thành' && task.progress === 100 && task.status !== 'Quá hạn')).length}</span></button>)}</div><div>{shown.slice(0, 4).map((task) => <TaskRow key={task.id} task={task}/>)}</div><button className="dwD-create-task" onClick={onCreate}><Icon name="plus" size={16}/> Tạo nhiệm vụ mới</button></section>
      <section className="dwD-panel dwD-meeting"><div className="dwD-panel-title"><h2>Ghi chú phiên họp tổ</h2><span>09/05/2025 · SH tổ định kỳ</span></div><h3>Nội dung chính</h3><p>Thống nhất phương án kiểm tra cuối kỳ II. Đẩy mạnh ứng dụng AI trong dạy học. Phân công giáo viên thực hiện chuyên đề STEM.</p><h3>Việc cần làm <small>(trích xuất tự động)</small></h3><div className="dwD-checklist">{MEETING_ITEMS.map((item) => <label key={item.id}><input type="checkbox" checked={meetingChecks.includes(item.id)} onChange={() => setMeetingChecks((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}/><span>{item.title}</span><em>{item.owner}</em><time>{item.due}</time></label>)}</div><button className="dwD-link">Xem toàn bộ biên bản cuộc họp <Icon name="arrow" size={15}/></button></section>
      <section className="dwD-panel dwD-reports"><PanelTitle title="Báo cáo" action="Xem tất cả"/><div className="dwD-report-list">{REPORTS.map(([title, meta]) => <button key={title}><span className="dwD-icon blue"><Icon name="document"/></span><span><strong>{title}</strong><small>{meta}</small></span></button>)}</div><div className="dwD-export"><button onClick={() => exportReport('Word')}>▣ Word</button><button className="pdf" onClick={() => exportReport('PDF')}>▣ PDF</button><button onClick={() => exportReport('HTML')}>&lt;&gt; HTML</button></div></section>
    </div>

    <section className="dwD-panel dwD-profile-strip"><div className="dwD-profile"><h2>Hồ sơ giáo viên</h2><div className="dwD-profile-main"><Portrait initials="NM" tone="violet" size={70}/><div><strong>Nguyễn Thị Mai</strong><span>Giáo viên</span></div></div><dl><div><dt>Tổ:</dt><dd>Tiếng Anh</dd></div><div><dt>Trình độ:</dt><dd>Thạc sĩ</dd></div><div><dt>Thâm niên:</dt><dd>8 năm</dd></div></dl></div><div className="dwD-approval"><h2>Lịch sử phê duyệt</h2>{[['Kế hoạch bài dạy Unit 8 – Lớp 6A1','Phê duyệt bởi TTCM · 06/05/2025 14:30','green','check'],['Sáng kiến kinh nghiệm: Ứng dụng AI...','Đang chờ phê duyệt · 05/05/2025 09:10','amber','clock'],['Minh chứng thao giảng – 15/04/2025','Phê duyệt bởi TTCM · 16/04/2025 16:45','green','check']].map(([title,meta,tone,icon]) => <button key={title}><span className={`dwD-icon ${tone}`}><Icon name={icon}/></span><span><strong>{title}</strong><small>{meta}</small></span><em>Xem</em></button>)}</div><div className="dwD-evidence"><h2>Minh chứng nổi bật</h2><div>{EVIDENCE.map((item) => <button key={item.title}><EvidenceVisual type={item.type} badge={item.badge}/><strong>{item.title}</strong><small>{item.date}</small></button>)}</div></div></section>
  </div>;
}

function SimplePage({ eyebrow, title, description, action, children }) {
  return <div className="dwD-page"><header><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action ? <button><Icon name="plus"/> {action}</button> : null}</header>{children}</div>;
}

function CalendarPage() {
  return <SimplePage eyebrow="LỊCH CÔNG TÁC" title="Lịch và thời hạn sắp tới" description="Theo dõi cuộc họp, dự giờ, sinh hoạt chuyên đề và các mốc nộp hồ sơ." action="Thêm lịch"><div className="dwD-page-grid"><section className="dwD-panel dwD-calendar-card"><div className="dwD-month-head"><button>‹</button><h2>Tháng 5, 2025</h2><button>›</button></div><div className="dwD-calendar">{['T2','T3','T4','T5','T6','T7','CN'].map((day) => <b key={day}>{day}</b>)}{Array.from({ length: 35 }, (_, index) => index - 2).map((day, index) => <span key={index} className={day === 16 ? 'selected' : day < 1 || day > 31 ? 'muted' : ''}>{day < 1 ? 28 + day : day > 31 ? day - 31 : day}</span>)}</div></section><section className="dwD-panel dwD-event-list"><PanelTitle title="Lịch 14 ngày tới" action="Đồng bộ lịch"/>{EVENTS.map(([date, month, title, time, place, tone]) => <article key={title}><span className={`dwD-date ${tone}`}><strong>{date}</strong><small>{month}</small></span><div><strong>{title}</strong><small>{time} · {place}</small></div><button>Chi tiết</button></article>)}</section></div></SimplePage>;
}

function TasksPage({ tasks, onCreate }) {
  const [filter, setFilter] = useState('Tất cả');
  const filters = ['Tất cả','Chưa bắt đầu','Đang thực hiện','Đã nộp','Quá hạn'];
  const shown = filter === 'Tất cả' ? tasks : tasks.filter((task) => task.status === filter);
  return <SimplePage eyebrow="PHÂN CÔNG" title="Bảng giao việc" description="Giao nhiệm vụ, theo dõi tiến độ và kiểm soát thời hạn theo từng giáo viên." action="Tạo nhiệm vụ"><section className="dwD-panel dwD-page-panel"><div className="dwD-filter-tabs large">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}<span>{item === 'Tất cả' ? tasks.length : tasks.filter((task) => task.status === item).length}</span></button>)}</div>{shown.map((task) => <TaskRow key={task.id} task={task}/>) }<button className="dwD-create-task" onClick={onCreate}><Icon name="plus"/> Tạo nhiệm vụ mới</button></section></SimplePage>;
}

function PlansPage() {
  return <SimplePage eyebrow="KẾ HOẠCH" title="Tiến độ kế hoạch tổ chuyên môn" description="Quản lý kế hoạch năm học, học kỳ, tháng, tuần và chuyên đề." action="Tạo kế hoạch"><div className="dwD-summary-cards"><article><strong>68%</strong><span>Tiến độ năm học</span><small>17/25 đầu việc đã hoàn thành</small></article><article><strong>92%</strong><span>Đúng hạn</span><small>Tăng 4% so với tháng trước</small></article><article><strong>6%</strong><span>Quá hạn</span><small>2 đầu việc cần xử lý</small></article></div><section className="dwD-panel dwD-page-panel"><PanelTitle title="Các nhóm kế hoạch" action="Năm học 2024 – 2025"/>{PLANS.map(([title,value,count,tone]) => <article className="dwD-plan-row" key={title}><span className={`dwD-icon ${tone}`}><Icon name="plan"/></span><div><strong>{title}</strong><span><i className={tone} style={{ width: `${value}%` }}/></span></div><b>{value}%</b><small>{count}</small></article>)}</section></SimplePage>;
}

function RecordsPage() {
  return <SimplePage eyebrow="HỒ SƠ" title="Quy trình duyệt hồ sơ" description="Kiểm tra, nhận xét, yêu cầu chỉnh sửa và lưu kho hồ sơ chuyên môn." action="Mở thư viện hồ sơ"><div className="dwD-pipeline">{[['Đã giao','32','violet'],['Đã nộp','18','blue'],['Cần chỉnh sửa','5','amber'],['Đã duyệt','24','green']].map(([label,value,tone]) => <article key={label}><span className={`dwD-icon ${tone}`}><Icon name={tone === 'green' ? 'check' : 'folder'}/></span><strong>{value}</strong><h2>{label}</h2><small>Hồ sơ</small></article>)}</div><section className="dwD-panel dwD-page-panel"><PanelTitle title="Hồ sơ cần xử lý" action="Lọc hồ sơ"/>{DEFAULT_TASKS.map((task,index) => <article className="dwD-record-row" key={task.id}><Portrait initials={task.initials} tone={task.tone}/><div><strong>{index % 2 ? 'Minh chứng sinh hoạt chuyên đề' : 'Kế hoạch bài dạy tuần 33'}</strong><small>{task.assignee} · Nộp ngày {task.due}</small></div><Status value={index === 2 ? 'Cần chỉnh sửa' : 'Đã nộp'}/><button>Xem hồ sơ</button></article>)}</section></SimplePage>;
}

function MeetingsPage({ checks, setChecks }) {
  return <SimplePage eyebrow="SINH HOẠT TỔ" title="Phiên họp và chuyên đề" description="Lưu biên bản, tài liệu, thành phần tham dự và công việc phát sinh sau họp." action="Tạo phiên họp"><div className="dwD-page-grid"><section className="dwD-panel dwD-page-panel"><PanelTitle title="Phiên họp gần nhất" action="09/05/2025"/><h3>Đánh giá hoạt động tháng 5 và triển khai kiểm tra cuối kỳ II</h3><p>Thống nhất ma trận đề, phân công giáo viên hoàn thiện chuyên đề STEM và kế hoạch ứng dụng AI trong dạy học.</p><div className="dwD-checklist expanded">{MEETING_ITEMS.map((item) => <label key={item.id}><input type="checkbox" checked={checks.includes(item.id)} onChange={() => setChecks((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}/><span>{item.title}</span><em>{item.owner}</em><time>{item.due}</time></label>)}</div></section><section className="dwD-panel dwD-page-panel"><PanelTitle title="Các phiên sắp tới" action="Xem lịch"/>{EVENTS.slice(0,3).map(([date,month,title,time,place,tone]) => <article className="dwD-event-mini" key={title}><span className={`dwD-date ${tone}`}><strong>{date}</strong><small>{month}</small></span><div><strong>{title}</strong><small>{time} · {place}</small></div></article>)}</section></div></SimplePage>;
}

function EvidencePage() {
  return <SimplePage eyebrow="MINH CHỨNG" title="Thư viện minh chứng" description="Phân loại theo năm học, học kỳ, giáo viên, hoạt động và trạng thái duyệt." action="Tải minh chứng"><div className="dwD-summary-cards four"><article><strong>56</strong><span>Tổng minh chứng</span><small>Năm học 2024 – 2025</small></article><article><strong>18</strong><span>Đã duyệt</span><small>Trong học kỳ II</small></article><article><strong>7</strong><span>Chờ duyệt</span><small>Cần TTCM xử lý</small></article><article><strong>4</strong><span>Cần bổ sung</span><small>Đã gửi phản hồi</small></article></div><section className="dwD-panel dwD-page-panel"><div className="dwD-evidence-grid">{[...EVIDENCE, ...EVIDENCE].map((item,index) => <button key={`${item.title}-${index}`}><EvidenceVisual type={item.type} badge={item.badge}/><strong>{item.title}</strong><small>{item.date}</small></button>)}</div></section></SimplePage>;
}

function ReportsPage() {
  return <SimplePage eyebrow="BÁO CÁO" title="Báo cáo vận hành tổ chuyên môn" description="Theo dõi tiến độ, thời gian xử lý, tải việc và mức độ hoàn thành kế hoạch." action="Tạo báo cáo"><div className="dwD-summary-cards four"><article><strong>89%</strong><span>Hoàn thành đúng hạn</span><small>Tăng 6% so với tháng trước</small></article><article><strong>2.4 ngày</strong><span>Thời gian duyệt TB</span><small>Giảm 0.7 ngày</small></article><article><strong>12</strong><span>Nhiệm vụ đang mở</span><small>4 việc ưu tiên cao</small></article><article><strong>5</strong><span>Hồ sơ cần xử lý</span><small>2 hồ sơ quá SLA</small></article></div><section className="dwD-panel dwD-page-panel"><PanelTitle title="Bộ báo cáo" action="Tháng 5/2025"/>{REPORTS.map(([title,meta]) => <article className="dwD-report-row" key={title}><span className="dwD-icon blue"><Icon name="document"/></span><div><strong>{title}</strong><small>{meta}</small></div><button><Icon name="download" size={15}/> Xuất báo cáo</button></article>)}</section></SimplePage>;
}

function TaskComposer({ draft, setDraft, onClose, onSubmit }) {
  return <div className="dwD-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="dwD-modal" onSubmit={onSubmit}><header><div><span>GIAO VIỆC</span><h2>Tạo nhiệm vụ mới</h2></div><button type="button" onClick={onClose}><Icon name="close"/></button></header><label>Tên nhiệm vụ<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Nhập nội dung công việc..."/></label><label>Người nhận<select value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })}><option>Toàn tổ</option><option>Nguyễn Thị Mai</option><option>Trần Minh Đức</option><option>Phạm Thu Hà</option></select></label><label>Hạn hoàn thành<input type="date" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })}/></label><footer><button type="button" onClick={onClose}>Hủy</button><button type="submit"><Icon name="plus"/> Tạo nhiệm vụ</button></footer></form></div>;
}

function exportReport(type) {
  if (type === 'PDF') { window.print(); return; }
  const html = `<!doctype html><meta charset="utf-8"><title>Báo cáo Tổ chuyên môn</title><h1>Báo cáo Tổ chuyên môn</h1><p>Tháng 5/2025</p><ul>${REPORTS.map(([title]) => `<li>${title}</li>`).join('')}</ul>`;
  const blob = new Blob([type === 'Word' ? `<html><body>${html}</body></html>` : html], { type: type === 'Word' ? 'application/msword' : 'text/html' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `bao-cao-to-chuyen-mon.${type === 'Word' ? 'doc' : 'html'}`; anchor.click(); URL.revokeObjectURL(url);
}

export default function DepartmentWorkspaceV2({ user }) {
  const userName = user?.name || user?.display_name || 'Nguyễn Anh Tuấn';
  const roleLabel = 'TTCM';
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useStoredState('department-v2-option-d-tasks', DEFAULT_TASKS);
  const [notifications, setNotifications] = useStoredState('department-v2-option-d-notifications', DEFAULT_NOTIFICATIONS);
  const [meetingChecks, setMeetingChecks] = useStoredState('department-v2-option-d-meeting-checks', []);
  const [showNotifications, setShowNotifications] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [toast, setToast] = useState('');
  const [draft, setDraft] = useState({ title: '', assignee: 'Toàn tổ', due: '2025-05-30' });
  const unread = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(timer); }, [toast]);

  const addTask = (event) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const assignee = draft.assignee === 'Toàn tổ' ? 'Toàn tổ Tiếng Anh' : draft.assignee;
    const initials = assignee.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase();
    setTasks((items) => [{ id: Date.now(), title: draft.title.trim(), assignee, initials, due: draft.due.split('-').reverse().join('/'), status: 'Chưa bắt đầu', progress: 0, tone: 'violet' }, ...items]);
    setDraft({ title: '', assignee: 'Toàn tổ', due: '2025-05-30' });
    setShowComposer(false);
    setToast('Đã tạo nhiệm vụ mới');
  };

  const page = {
    overview: <Overview tasks={tasks} setTasks={setTasks} meetingChecks={meetingChecks} setMeetingChecks={setMeetingChecks} onCreate={() => setShowComposer(true)}/>,
    calendar: <CalendarPage/>,
    tasks: <TasksPage tasks={tasks} onCreate={() => setShowComposer(true)}/>,
    plans: <PlansPage/>,
    records: <RecordsPage/>,
    meetings: <MeetingsPage checks={meetingChecks} setChecks={setMeetingChecks}/>,
    evidence: <EvidencePage/>,
    reports: <ReportsPage/>,
  }[activeTab];

  return <div className="dwD-shell"><div className="dwD-glow"/><div className="dwD-workspace"><header className="dwD-header"><button className="dwD-brand" onClick={() => window.history.back()}><span className="dwD-logo-mark">⌂</span><strong>brian<small>ENGLISH</small></strong></button><div className="dwD-product-title">Tổ chuyên môn</div><nav>{TABS.map(([id,label,icon]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><Icon name={icon}/><span>{label}</span></button>)}</nav><div className="dwD-actions"><label><Icon name="search" size={17}/><input placeholder="Tìm kiếm nhanh..."/></label><button className="dwD-bell" onClick={() => setShowNotifications((value) => !value)}><Icon name="bell"/>{unread ? <span>{unread}</span> : null}</button><Portrait initials={userName.slice(0,2).toUpperCase()} tone="violet" size={36}/><strong>{roleLabel}<span>⌄</span></strong></div></header><main className={showNotifications ? 'with-notifications' : ''}><div className="dwD-content">{page}</div>{showNotifications ? <NotificationPanel notifications={notifications} setNotifications={setNotifications} onClose={() => setShowNotifications(false)}/> : null}</main></div>{showComposer ? <TaskComposer draft={draft} setDraft={setDraft} onClose={() => setShowComposer(false)} onSubmit={addTask}/> : null}{toast ? <div className="dwD-toast">{toast}</div> : null}</div>;
}
