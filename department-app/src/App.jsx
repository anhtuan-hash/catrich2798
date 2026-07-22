import React, { useEffect, useMemo, useState } from 'react';

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
  { id: 1, title: 'Xây dựng ma trận đề kiểm tra học kỳ II môn Tiếng Anh 6', assignee: 'Nguyễn Thị Mai', initials: 'NM', due: '20/05/2025', status: 'Đang thực hiện', progress: 60, tone: 'purple' },
  { id: 2, title: 'Dự giờ đồng nghiệp – Tháng 5', assignee: 'Trần Minh Đức', initials: 'TĐ', due: '15/05/2025', status: 'Đang thực hiện', progress: 40, tone: 'green' },
  { id: 3, title: 'Biên soạn chuyên đề: Dạy học phát triển năng lực giao tiếp', assignee: 'Phạm Thu Hà', initials: 'PH', due: '25/05/2025', status: 'Chưa bắt đầu', progress: 0, tone: 'orange' },
  { id: 4, title: 'Tổng hợp minh chứng thi đua học kỳ II', assignee: 'Lê Hoàng Nam', initials: 'LN', due: '10/05/2025', status: 'Quá hạn', progress: 100, tone: 'red' },
  { id: 5, title: 'Hoàn thiện kế hoạch bồi dưỡng học sinh giỏi', assignee: 'Đỗ Thị Hương', initials: 'ĐH', due: '28/05/2025', status: 'Đã nộp', progress: 100, tone: 'blue' },
];

const NOTIFICATIONS = [
  { id: 1, title: 'Có 2 công việc sắp đến hạn', detail: 'Ma trận đề kiểm tra học kỳ II, Minh chứng thi đua HKII', time: '5 phút trước', tone: 'purple', icon: 'clipboard', read: false },
  { id: 2, title: 'Cuộc họp tổ vào 15:30 hôm nay', detail: 'Nội dung: Đánh giá hoạt động tháng 5', time: '30 phút trước', tone: 'blue', icon: 'users', read: false },
  { id: 3, title: 'Hồ sơ của Nguyễn Thị Mai đã được phê duyệt', detail: 'Kế hoạch bài dạy Unit 8 – Lớp 6A1', time: '1 giờ trước', tone: 'green', icon: 'check', read: false },
  { id: 4, title: 'Minh chứng mới được cập nhật', detail: 'Thầy Nam đã thêm minh chứng mới cho chuyên đề STEM', time: '2 giờ trước', tone: 'orange', icon: 'folder', read: true },
  { id: 5, title: 'Báo cáo tháng 4/2025 đã hoàn thành', detail: 'Bạn có thể xem và xuất báo cáo', time: '3 giờ trước', tone: 'pink', icon: 'report', read: true },
];

const REPORTS = [
  ['Báo cáo hoạt động tháng 4/2025', '08/05/2025'],
  ['Báo cáo sinh hoạt tổ quý II', '05/05/2025'],
  ['Báo cáo chuyên đề STEM', '28/04/2025'],
];

const EVIDENCE = [
  { id: 'lesson', title: 'Giáo án Unit 8 – 6A1', date: '06/05/2025', type: 'W', tone: 'blue' },
  { id: 'class', title: 'Ảnh dự giờ 06/05', date: '06/05/2025', type: 'IMG', tone: 'green' },
  { id: 'video', title: 'Video thao giảng', date: '15/04/2025', type: '▶', tone: 'purple' },
  { id: 'paper', title: 'SKKN Ứng dụng AI', date: '05/05/2025', type: 'PDF', tone: 'red' },
];

const EVENTS = [
  { day: '16', month: 'TH5', title: 'Họp tổ chuyên môn tháng 5', time: '14:00 – 15:30', place: 'Phòng họp 2', tone: 'purple' },
  { day: '19', month: 'TH5', title: 'Hạn nộp kế hoạch bài dạy tuần 33', time: '17:00', place: 'Nộp trực tuyến', tone: 'green' },
  { day: '21', month: 'TH5', title: 'Sinh hoạt chuyên đề phát triển năng lực', time: '14:00 – 16:00', place: 'Phòng học thông minh', tone: 'orange' },
  { day: '23', month: 'TH5', title: 'Dự giờ và rút kinh nghiệm', time: '08:00 – 09:30', place: 'Lớp 8A', tone: 'blue' },
];

const PLAN_ITEMS = [
  ['Kế hoạch năm học', 82, 'Đang thực hiện', 'purple'],
  ['Kế hoạch học kỳ II', 74, 'Đang thực hiện', 'blue'],
  ['Kế hoạch tháng 5', 68, 'Cần cập nhật', 'orange'],
  ['Kế hoạch tuần 33', 92, 'Gần hoàn thành', 'green'],
];

const RECORDS = [
  ['Kế hoạch bài dạy Unit 8 – Lớp 6A1', 'Nguyễn Thị Mai', 'Đã duyệt', '06/05/2025', 'green'],
  ['Sáng kiến kinh nghiệm: Ứng dụng AI', 'Trần Minh Đức', 'Chờ duyệt', '05/05/2025', 'orange'],
  ['Minh chứng thao giảng – 15/04/2025', 'Phạm Thu Hà', 'Đã duyệt', '16/04/2025', 'green'],
  ['Báo cáo chuyên đề STEM', 'Lê Hoàng Nam', 'Cần chỉnh sửa', '02/05/2025', 'red'],
];

const MEETING_CHECKS = [
  ['Hoàn thiện ma trận đề kiểm tra cuối kỳ II', 'Cô Mai', '16/05'],
  ['Chuẩn bị minh chứng chuyên đề STEM', 'Thầy Nam', '20/05'],
  ['Tổng hợp tài liệu ứng dụng AI trong dạy học', 'Cô Hương', '18/05'],
];

function Icon({ name, size = 20 }) {
  const paths = {
    home: <><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6M9 10h6M9 14h6"/></>,
    plan: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 13h8M8 17h6"/></>,
    folder: <><path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.4-6 6-6s6 2 6 6M15 15c3.2 0 5 1.6 5 5"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    report: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    menu: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.layers}</svg>;
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local preview only */ }
  }, [key, value]);
  return [value, setValue];
}

function statusClass(status) {
  return String(status).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Brand() {
  return (
    <div className="brand-lockup">
      <svg viewBox="0 0 54 46" className="brand-mark" aria-hidden="true">
        <path d="M4 21 27 7l23 14-23 14z" fill="#5372e8" opacity=".16"/>
        <path d="m6 20 21-13 21 13-21 13z" fill="none" stroke="#5372e8" strokeWidth="3"/>
        <path d="M13 26v10M20 30v10M34 30v10M41 26v10" stroke="#3150b5" strokeWidth="3" strokeLinecap="round"/>
        <path d="M24 20h6v18h-6z" fill="#f0b945"/>
      </svg>
      <span><strong>brian</strong><small>ENGLISH</small></span>
    </div>
  );
}

function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 560 250" aria-hidden="true">
      <defs>
        <linearGradient id="screen" x1="0" x2="1"><stop stopColor="#eff2ff"/><stop offset="1" stopColor="#c9d0ff"/></linearGradient>
        <linearGradient id="book" x1="0" x2="1"><stop stopColor="#a591ff"/><stop offset="1" stopColor="#7663ec"/></linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
      </defs>
      <ellipse cx="260" cy="198" rx="205" ry="28" fill="#846df0" opacity=".16" filter="url(#blur)"/>
      <path d="M140 178h270l-18 25H155z" fill="url(#book)"/>
      <path d="M164 163h244l10 18H140z" fill="#d8dcff" stroke="#9fa8e8" strokeWidth="2"/>
      <path d="M185 41h178c16 0 29 13 29 29v90H156V70c0-16 13-29 29-29Z" fill="url(#screen)" stroke="#a6afe8" strokeWidth="3"/>
      <path d="M177 60h194v79H177z" fill="#fff" opacity=".57"/>
      <path d="m197 121 35-34 31 20 38-50 46 28" fill="none" stroke="#775ff0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="201" y="98" width="14" height="30" rx="4" fill="#7b68ef" opacity=".6"/>
      <rect x="228" y="82" width="14" height="46" rx="4" fill="#7b68ef" opacity=".73"/>
      <rect x="255" y="105" width="14" height="23" rx="4" fill="#7b68ef" opacity=".52"/>
      <rect x="282" y="71" width="14" height="57" rx="4" fill="#7b68ef" opacity=".87"/>
      <g transform="translate(432 95)">
        <path d="M32 63c-6-35-5-60 2-73 8 11 12 29 10 55 10-27 22-43 36-48-1 22-12 42-31 60 19-13 36-17 49-11-8 16-25 27-50 31z" fill="#4dc981"/>
        <path d="M38 68h49l-6 53H45z" fill="#d9e6ff" stroke="#8f9cd8" strokeWidth="2"/>
        <path d="M45 84h36" stroke="#8f9cd8" strokeWidth="2"/>
      </g>
    </svg>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action && <button type="button" onClick={onAction}>{action}<Icon name="arrow" size={16}/></button>}
    </div>
  );
}

function TaskRow({ task }) {
  return (
    <article className="task-row">
      <span className={`avatar ${task.tone}`}>{task.initials}</span>
      <div className="task-copy"><strong>{task.title}</strong><small>{task.assignee}</small></div>
      <span className={`status ${statusClass(task.status)}`}>{task.status}</span>
      <div className="task-due"><small>Hạn hoàn thành</small><strong>{task.due}</strong></div>
      <div className="task-progress"><strong>{task.progress}%</strong><span><i style={{ width: `${task.progress}%` }}/></span></div>
      <button className="icon-button compact" aria-label="Tùy chọn"><Icon name="menu" size={18}/></button>
    </article>
  );
}

function NotificationDrawer({ items, setItems }) {
  const unread = items.filter((item) => !item.read).length;
  return (
    <aside className="notification-drawer">
      <header>
        <div><h2>Thông báo</h2><small>{unread} thông báo chưa đọc</small></div>
        <button className="text-button" onClick={() => setItems((list) => list.map((item) => ({ ...item, read: true })))}>Đánh dấu đã đọc</button>
      </header>
      <div className="notification-list">
        {items.map((item) => (
          <button key={item.id} className={item.read ? 'read' : ''} onClick={() => setItems((list) => list.map((note) => note.id === item.id ? { ...note, read: true } : note))}>
            <span className={`icon-box ${item.tone}`}><Icon name={item.icon}/></span>
            <span><strong>{item.title}</strong><small>{item.detail}</small><time>{item.time}</time></span>
            {!item.read && <i/>}
          </button>
        ))}
      </div>
      <button className="notification-footer">Xem tất cả thông báo <Icon name="arrow" size={16}/></button>
    </aside>
  );
}

function Overview({ tasks, filter, setFilter, meetingChecks, setMeetingChecks, notifications, setNotifications, setTab, exportReport }) {
  const filtered = useMemo(() => filter === 'Tất cả' ? tasks : tasks.filter((task) => task.status.includes(filter)), [tasks, filter]);
  const filters = ['Tất cả', 'Chưa bắt đầu', 'Đang thực hiện', 'Quá hạn', 'Hoàn thành'];
  return (
    <div className="workspace-grid">
      <div className="content-column">
        <section className="summary-row">
          <article className="hero-card">
            <div className="hero-copy">
              <h1>Tổng quan tổ chuyên môn</h1>
              <p>Cập nhật bức tranh tổng thể về hoạt động và hiệu quả của tổ chuyên môn.</p>
              <button className="hero-action" onClick={() => setTab('plans')}>Xem kế hoạch tháng 5 <Icon name="arrow" size={17}/></button>
            </div>
            <HeroArt/>
          </article>
          {[
            ['Công việc đang thực hiện', '12', 'clipboard', 'purple', '↑ 20%'],
            ['Công việc hoàn thành', '28', 'check', 'green', '↑ 25%'],
            ['Buổi sinh hoạt đã tổ chức', '4', 'users', 'orange', '= so với tháng trước'],
            ['Minh chứng đã cập nhật', '56', 'layers', 'blue', '↑ 15%'],
          ].map(([label, value, icon, tone, delta]) => (
            <article key={label} className="kpi-card">
              <span className={`icon-box ${tone}`}><Icon name={icon}/></span>
              <p>{label}</p>
              <strong>{value}</strong>
              <small className={delta.startsWith('=') ? 'neutral' : ''}>{delta} so với tháng trước</small>
            </article>
          ))}
        </section>

        <section className="dashboard-row">
          <article className="panel task-panel">
            <SectionHeader title="Bảng giao việc" action="Xem tất cả" onAction={() => setTab('tasks')}/>
            <div className="filter-row">
              {filters.map((item) => {
                const count = item === 'Tất cả' ? tasks.length : tasks.filter((task) => task.status.includes(item)).length;
                return <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}<span>{count}</span></button>;
              })}
            </div>
            <div className="task-list">{filtered.slice(0, 4).map((task) => <TaskRow key={task.id} task={task}/>)}</div>
          </article>

          <article className="panel meeting-panel">
            <div className="section-head"><h2>Ghi chú phiên họp tổ</h2><span className="date-chip">09/05/2025 · SH tổ định kỳ</span></div>
            <h3>Nội dung chính</h3>
            <p>Thống nhất phương án kiểm tra cuối kỳ II. Đẩy mạnh ứng dụng AI trong dạy học. Phân công giáo viên thực hiện chuyên đề STEM.</p>
            <h3>Việc cần làm <small>(trích xuất tự động)</small></h3>
            <div className="meeting-checklist">
              {MEETING_CHECKS.map(([label, owner, date], index) => (
                <label key={label}><input type="checkbox" checked={meetingChecks[index]} onChange={() => setMeetingChecks((values) => values.map((value, i) => i === index ? !value : value))}/><span>{label}</span><em>{owner}</em><time>{date}</time></label>
              ))}
            </div>
            <button className="link-button" onClick={() => setTab('meetings')}>Xem toàn bộ biên bản cuộc họp <Icon name="arrow" size={15}/></button>
          </article>

          <article className="panel report-panel">
            <SectionHeader title="Báo cáo" action="Xem tất cả" onAction={() => setTab('reports')}/>
            <div className="report-list">
              {REPORTS.map(([name, date]) => <button key={name}><span className="icon-box blue"><Icon name="report" size={18}/></span><span><strong>{name}</strong><small>Cập nhật: {date}</small></span></button>)}
            </div>
            <div className="export-row"><button onClick={() => exportReport('word')}>▣ Word</button><button onClick={() => exportReport('pdf')}>▣ PDF</button><button onClick={() => exportReport('html')}>&lt;/&gt; HTML</button></div>
          </article>
        </section>

        <section className="panel profile-strip">
          <div className="teacher-profile">
            <span className="teacher-photo">NM</span>
            <div><h2>Nguyễn Thị Mai</h2><span className="role-badge">Giáo viên</span><dl><div><dt>Tổ</dt><dd>Tiếng Anh</dd></div><div><dt>Trình độ</dt><dd>Thạc sĩ</dd></div><div><dt>Thâm niên</dt><dd>8 năm</dd></div></dl></div>
          </div>
          <div className="approval-history">
            <h2>Lịch sử phê duyệt</h2>
            {[
              ['Kế hoạch bài dạy Unit 8 – Lớp 6A1', 'Phê duyệt bởi TTCM · 06/05/2025 14:30', 'green'],
              ['Sáng kiến kinh nghiệm: Ứng dụng AI...', 'Đang chờ phê duyệt · 05/05/2025 09:10', 'orange'],
              ['Minh chứng thao giảng – 15/04/2025', 'Phê duyệt bởi TTCM · 16/04/2025 16:45', 'green'],
            ].map(([name, detail, tone]) => <button key={name}><span className={`icon-box ${tone}`}><Icon name={tone === 'orange' ? 'calendar' : 'check'} size={18}/></span><span><strong>{name}</strong><small>{detail}</small></span><em>Xem</em></button>)}
          </div>
          <div className="featured-evidence">
            <h2>Minh chứng nổi bật</h2>
            <div>{EVIDENCE.map((item) => <EvidenceCard key={item.id} item={item}/>)}</div>
          </div>
        </section>
      </div>
      <NotificationDrawer items={notifications} setItems={setNotifications}/>
    </div>
  );
}

function EvidenceCard({ item }) {
  return (
    <button className={`evidence-card evidence-${item.id}`}>
      <span className="evidence-preview"><b>{item.type}</b>{item.id === 'video' && <i>▶</i>}</span>
      <strong>{item.title}</strong><small>{item.date}</small>
    </button>
  );
}

function PageHeading({ eyebrow, title, description, action, onAction }) {
  return (
    <header className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <button className="primary-button" onClick={onAction}><Icon name="plus" size={18}/>{action}</button>}</header>
  );
}

function CalendarPage() {
  return (
    <div className="subpage"><PageHeading eyebrow="LỊCH CHUYÊN MÔN" title="Lịch và hoạt động" description="Theo dõi họp tổ, dự giờ, thao giảng, hạn hồ sơ và các mốc chuyên môn."/>
      <div className="two-column-page">
        <article className="panel calendar-card"><div className="calendar-title"><button>‹</button><h2>Tháng 5 · 2025</h2><button>›</button></div><div className="calendar-grid">{['T2','T3','T4','T5','T6','T7','CN'].map((d)=><b key={d}>{d}</b>)}{Array.from({length:35},(_,i)=>{const day=i-2; return <span key={i} className={[16,19,21,23].includes(day)?'event-day':''}>{day>0&&day<32?day:''}</span>;})}</div></article>
        <article className="panel events-card"><SectionHeader title="14 ngày sắp tới"/>{EVENTS.map((event)=><div className="event-row" key={event.title}><span className={`event-date ${event.tone}`}><strong>{event.day}</strong><small>{event.month}</small></span><div><strong>{event.title}</strong><small>{event.time} · {event.place}</small></div><button>Chi tiết</button></div>)}</article>
      </div>
    </div>
  );
}

function TasksPage({ tasks, setTasks, onCreate }) {
  const [filter, setFilter] = useState('Tất cả');
  const visible = filter === 'Tất cả' ? tasks : tasks.filter((task) => task.status === filter);
  return (
    <div className="subpage"><PageHeading eyebrow="TRUNG TÂM CÔNG VIỆC" title="Giao việc và theo dõi" description="Giao nhiệm vụ, quản lý thời hạn, nhận sản phẩm và kiểm soát tiến độ theo từng giáo viên." action="Tạo nhiệm vụ" onAction={onCreate}/>
      <article className="panel full-panel"><div className="filter-row page-filters">{['Tất cả','Chưa bắt đầu','Đang thực hiện','Đã nộp','Quá hạn'].map((item)=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}<span>{item==='Tất cả'?tasks.length:tasks.filter((t)=>t.status===item).length}</span></button>)}</div><div className="task-list full">{visible.map((task)=><TaskRow key={task.id} task={task}/>)}</div>{!visible.length&&<div className="empty-state">Chưa có nhiệm vụ trong trạng thái này.</div>}</article>
    </div>
  );
}

function PlansPage() {
  return (
    <div className="subpage"><PageHeading eyebrow="KẾ HOẠCH CHUYÊN MÔN" title="Kế hoạch và tiến độ" description="Quản lý kế hoạch năm học, học kỳ, tháng, tuần và các chuyên đề trọng tâm." action="Tạo kế hoạch"/>
      <div className="plan-grid">{PLAN_ITEMS.map(([title,value,status,tone])=><article className="panel plan-card" key={title}><span className={`icon-box ${tone}`}><Icon name="plan"/></span><h2>{title}</h2><strong>{value}%</strong><div className="progress-line"><i style={{width:`${value}%`}}/></div><small>{status}</small></article>)}</div>
      <article className="panel full-panel"><SectionHeader title="Lộ trình thực hiện" action="Xem lịch"/><div className="timeline">{['Khởi tạo mục tiêu','Phân công phụ trách','Triển khai hoạt động','Thu thập minh chứng','Đánh giá và báo cáo'].map((item,index)=><div className={index<3?'done':''} key={item}><span>{index<3?'✓':index+1}</span><strong>{item}</strong><small>{index<3?'Đã hoàn thành':'Đang chờ'}</small></div>)}</div></article>
    </div>
  );
}

function RecordsPage() {
  return (
    <div className="subpage"><PageHeading eyebrow="HỒ SƠ CHUYÊN MÔN" title="Nộp và phê duyệt hồ sơ" description="Theo dõi toàn bộ vòng đời hồ sơ: đã giao, đã nộp, chỉnh sửa, duyệt và lưu kho."/>
      <div className="pipeline">{[['Đã giao','18','purple'],['Đã nộp','11','blue'],['Cần chỉnh sửa','3','orange'],['Đã duyệt','42','green']].map(([label,value,tone])=><article className="panel" key={label}><span className={`icon-box ${tone}`}><Icon name="folder"/></span><h2>{label}</h2><strong>{value}</strong><small>Hồ sơ</small></article>)}</div>
      <article className="panel full-panel record-table"><SectionHeader title="Hồ sơ gần đây" action="Bộ lọc"/>{RECORDS.map(([title,owner,status,date,tone])=><div className="record-row" key={title}><span className={`icon-box ${tone}`}><Icon name="report"/></span><div><strong>{title}</strong><small>{owner}</small></div><span className={`status ${statusClass(status)}`}>{status}</span><time>{date}</time><button>Xem</button></div>)}</article>
    </div>
  );
}

function MeetingsPage({ checks, setChecks }) {
  return (
    <div className="subpage"><PageHeading eyebrow="SINH HOẠT TỔ" title="Cuộc họp và hoạt động chuyên môn" description="Lưu biên bản, tài liệu cuộc họp và tự động chuyển nội dung thành nhiệm vụ theo dõi." action="Tạo cuộc họp"/>
      <div className="two-column-page"><article className="panel meeting-detail"><div className="meeting-banner"><span>09</span><div><small>THÁNG 5 · 2025</small><h2>Sinh hoạt tổ định kỳ</h2><p>Phòng họp 2 · 14:00–15:30</p></div></div><h3>Nội dung chính</h3><p>Thống nhất phương án kiểm tra cuối kỳ II, tổ chức chuyên đề STEM và cập nhật tiến độ ứng dụng AI trong dạy học.</p><h3>Việc cần làm</h3><div className="meeting-checklist expanded">{MEETING_CHECKS.map(([label,owner,date],index)=><label key={label}><input type="checkbox" checked={checks[index]} onChange={()=>setChecks((values)=>values.map((v,i)=>i===index?!v:v))}/><span>{label}</span><em>{owner}</em><time>{date}</time></label>)}</div></article><article className="panel minutes-list"><SectionHeader title="Biên bản gần đây"/>{['Biên bản họp tháng 4','Rút kinh nghiệm thao giảng','Họp triển khai kiểm tra cuối kỳ','Sinh hoạt chuyên đề AI'].map((item,index)=><button key={item}><span className="icon-box blue"><Icon name="report"/></span><span><strong>{item}</strong><small>{28-index*5}/04/2025</small></span><em>Xem</em></button>)}</article></div>
    </div>
  );
}

function EvidencePage() {
  return (
    <div className="subpage"><PageHeading eyebrow="THƯ VIỆN MINH CHỨNG" title="Minh chứng và sản phẩm" description="Phân loại minh chứng theo năm học, học kỳ, giáo viên, hoạt động và trạng thái duyệt." action="Thêm minh chứng"/>
      <div className="evidence-stats">{[['Tài liệu','38','blue'],['Hình ảnh','24','green'],['Video','9','purple'],['Báo cáo','17','red']].map(([label,value,tone])=><article className="panel" key={label}><span className={`icon-box ${tone}`}><Icon name="layers"/></span><h2>{label}</h2><strong>{value}</strong><small>Đã lưu</small></article>)}</div>
      <article className="panel evidence-library"><SectionHeader title="Minh chứng nổi bật" action="Tất cả thư mục"/><div className="evidence-grid">{[...EVIDENCE,...EVIDENCE.map((item,index)=>({...item,id:`${item.id}-${index}`,title:`${item.title} · Bản ${index+2}`}))].map((item)=><EvidenceCard key={item.id} item={{...item,id:item.id.split('-')[0]}}/>)}</div></article>
    </div>
  );
}

function ReportsPage({ exportReport }) {
  return (
    <div className="subpage"><PageHeading eyebrow="BÁO CÁO & PHÂN TÍCH" title="Báo cáo tổ chuyên môn" description="Tổng hợp tiến độ công việc, hồ sơ, hoạt động, tải việc và minh chứng còn thiếu."/>
      <div className="report-metrics">{[['Tỷ lệ hoàn thành','86%','green'],['Nhiệm vụ quá hạn','3','red'],['Thời gian duyệt TB','1,8 ngày','blue'],['Minh chứng còn thiếu','7','orange']].map(([label,value,tone])=><article className="panel" key={label}><span className={`icon-box ${tone}`}><Icon name="chart"/></span><h2>{label}</h2><strong>{value}</strong></article>)}</div>
      <article className="panel full-panel"><SectionHeader title="Báo cáo đã tạo" action="Tạo báo cáo"/><div className="report-list large">{REPORTS.concat([['Báo cáo tiến độ học kỳ II','15/04/2025'],['Tổng hợp minh chứng thi đua','10/04/2025']]).map(([name,date])=><div className="report-export-row" key={name}><span className="icon-box blue"><Icon name="report"/></span><span><strong>{name}</strong><small>Cập nhật: {date}</small></span><div className="inline-actions"><button onClick={()=>exportReport('word')}>Word</button><button onClick={()=>exportReport('pdf')}>PDF</button><button onClick={()=>exportReport('html')}>HTML</button></div></div>)}</div></article>
    </div>
  );
}

function TaskComposer({ draft, setDraft, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&onClose()}>
      <form className="modal" onSubmit={onSubmit}>
        <header><div><span>GIAO VIỆC</span><h2>Tạo nhiệm vụ mới</h2></div><button type="button" className="icon-button" onClick={onClose}><Icon name="close"/></button></header>
        <label>Tên nhiệm vụ<input autoFocus value={draft.title} onChange={(event)=>setDraft({...draft,title:event.target.value})} placeholder="Nhập nội dung công việc..."/></label>
        <label>Người nhận<select value={draft.assignee} onChange={(event)=>setDraft({...draft,assignee:event.target.value})}><option>Toàn tổ</option><option>Nguyễn Thị Mai</option><option>Trần Minh Đức</option><option>Phạm Thu Hà</option></select></label>
        <label>Hạn hoàn thành<input type="date" value={draft.due} onChange={(event)=>setDraft({...draft,due:event.target.value})}/></label>
        <footer><button type="button" onClick={onClose}>Hủy</button><button className="primary-button" type="submit">Tạo nhiệm vụ</button></footer>
      </form>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useStoredState('department-standalone-tasks', DEFAULT_TASKS);
  const [notifications, setNotifications] = useStoredState('department-standalone-notifications', NOTIFICATIONS);
  const [meetingChecks, setMeetingChecks] = useStoredState('department-standalone-meeting-checks', [false, false, false]);
  const [overviewFilter, setOverviewFilter] = useState('Tất cả');
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({ title: '', assignee: 'Toàn tổ', due: '2025-05-30' });
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const addTask = (event) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const initials = draft.assignee === 'Toàn tổ' ? 'TT' : draft.assignee.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase();
    setTasks((items) => [{ id: Date.now(), title: draft.title.trim(), assignee: draft.assignee, initials, due: draft.due.split('-').reverse().join('/'), status: 'Chưa bắt đầu', progress: 0, tone: 'purple' }, ...items]);
    setDraft({ title: '', assignee: 'Toàn tổ', due: '2025-05-30' });
    setComposerOpen(false);
    setToast('Đã tạo nhiệm vụ mới.');
  };

  const exportReport = (format) => {
    const title = 'Báo cáo hoạt động Tổ chuyên môn';
    const rows = REPORTS.map(([name, date]) => `<li><strong>${name}</strong> – cập nhật ${date}</li>`).join('');
    const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>${title}</title><body style="font-family:Arial,sans-serif;padding:40px"><h1>${title}</h1><p>Người xuất: Nguyễn Anh Tuấn · TTCM</p><ul>${rows}</ul></body></html>`;
    if (format === 'pdf') { window.print(); setToast('Đã mở hộp thoại in để lưu PDF.'); return; }
    if (format === 'word') downloadFile('bao-cao-to-chuyen-mon.doc', html, 'application/msword');
    if (format === 'html') downloadFile('bao-cao-to-chuyen-mon.html', html, 'text/html;charset=utf-8');
    setToast(`Đã xuất bản ${format.toUpperCase()}.`);
  };

  const pages = {
    overview: <Overview tasks={tasks} filter={overviewFilter} setFilter={setOverviewFilter} meetingChecks={meetingChecks} setMeetingChecks={setMeetingChecks} notifications={notifications} setNotifications={setNotifications} setTab={setActiveTab} exportReport={exportReport}/>,
    calendar: <CalendarPage/>,
    tasks: <TasksPage tasks={tasks} setTasks={setTasks} onCreate={()=>setComposerOpen(true)}/>,
    plans: <PlansPage/>,
    records: <RecordsPage/>,
    meetings: <MeetingsPage checks={meetingChecks} setChecks={setMeetingChecks}/>,
    evidence: <EvidencePage/>,
    reports: <ReportsPage exportReport={exportReport}/>,
  };

  const unread = notifications.filter((item) => !item.read).length;

  return (
    <div className="app-background">
      <div className="app-frame">
        <header className="app-header">
          <button className="brand-button" onClick={()=>setActiveTab('overview')}><Brand/><span className="brand-divider"/><strong>Tổ chuyên môn</strong></button>
          <nav>{TABS.map(([id,label,icon])=><button key={id} className={activeTab===id?'active':''} onClick={()=>setActiveTab(id)}><Icon name={icon} size={18}/><span>{label}</span></button>)}</nav>
          <div className="header-actions">
            <label className="search-box"><Icon name="search" size={18}/><input placeholder="Tìm kiếm nhanh..."/></label>
            <button className="icon-button bell-button"><Icon name="bell"/>{unread>0&&<span>{unread}</span>}</button>
            <span className="user-avatar">AT</span>
            <button className="role-button">TTCM⌄</button>
          </div>
        </header>
        <main>{pages[activeTab]}</main>
      </div>
      {composerOpen&&<TaskComposer draft={draft} setDraft={setDraft} onClose={()=>setComposerOpen(false)} onSubmit={addTask}/>} 
      {toast&&<div className="toast">{toast}</div>}
    </div>
  );
}
