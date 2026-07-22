import React, { useEffect, useMemo, useRef, useState } from 'react';

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

const PEOPLE = ['Toàn tổ', 'Nguyễn Thị Mai', 'Trần Minh Đức', 'Phạm Thu Hà', 'Lê Hoàng Nam', 'Đỗ Thị Hương'];
const TASK_STATUSES = ['Chưa bắt đầu', 'Đang thực hiện', 'Đã nộp', 'Hoàn thành', 'Quá hạn'];

const DEFAULT_TASKS = [
  { id: 1, title: 'Xây dựng ma trận đề kiểm tra học kỳ II môn Tiếng Anh 6', assignee: 'Nguyễn Thị Mai', initials: 'NM', due: '20/05/2025', status: 'Đang thực hiện', progress: 60, tone: 'purple' },
  { id: 2, title: 'Dự giờ đồng nghiệp – Tháng 5', assignee: 'Trần Minh Đức', initials: 'TĐ', due: '15/05/2025', status: 'Đang thực hiện', progress: 40, tone: 'green' },
  { id: 3, title: 'Biên soạn chuyên đề: Dạy học phát triển năng lực giao tiếp', assignee: 'Phạm Thu Hà', initials: 'PH', due: '25/05/2025', status: 'Chưa bắt đầu', progress: 0, tone: 'orange' },
  { id: 4, title: 'Tổng hợp minh chứng thi đua học kỳ II', assignee: 'Lê Hoàng Nam', initials: 'LN', due: '10/05/2025', status: 'Quá hạn', progress: 100, tone: 'red' },
  { id: 5, title: 'Hoàn thiện kế hoạch bồi dưỡng học sinh giỏi', assignee: 'Đỗ Thị Hương', initials: 'ĐH', due: '28/05/2025', status: 'Đã nộp', progress: 100, tone: 'blue' },
];

const DEFAULT_NOTIFICATIONS = [
  { id: 1, title: 'Có 2 công việc sắp đến hạn', detail: 'Ma trận đề kiểm tra học kỳ II, Minh chứng thi đua HKII', time: '5 phút trước', tone: 'purple', icon: 'clipboard', read: false },
  { id: 2, title: 'Cuộc họp tổ vào 15:30 hôm nay', detail: 'Nội dung: Đánh giá hoạt động tháng 5', time: '30 phút trước', tone: 'blue', icon: 'users', read: false },
  { id: 3, title: 'Hồ sơ của Nguyễn Thị Mai đã được phê duyệt', detail: 'Kế hoạch bài dạy Unit 8 – Lớp 6A1', time: '1 giờ trước', tone: 'green', icon: 'check', read: false },
  { id: 4, title: 'Minh chứng mới được cập nhật', detail: 'Thầy Nam đã thêm minh chứng mới cho chuyên đề STEM', time: '2 giờ trước', tone: 'orange', icon: 'folder', read: true },
  { id: 5, title: 'Báo cáo tháng 4/2025 đã hoàn thành', detail: 'Bạn có thể xem và xuất báo cáo', time: '3 giờ trước', tone: 'pink', icon: 'report', read: true },
];

const DEFAULT_EVENTS = [
  { id: 1, date: '2025-05-16', title: 'Họp tổ chuyên môn tháng 5', time: '14:00 – 15:30', place: 'Phòng họp 2', tone: 'purple' },
  { id: 2, date: '2025-05-19', title: 'Hạn nộp kế hoạch bài dạy tuần 33', time: '17:00', place: 'Nộp trực tuyến', tone: 'green' },
  { id: 3, date: '2025-05-21', title: 'Sinh hoạt chuyên đề phát triển năng lực', time: '14:00 – 16:00', place: 'Phòng học thông minh', tone: 'orange' },
  { id: 4, date: '2025-05-23', title: 'Dự giờ và rút kinh nghiệm', time: '08:00 – 09:30', place: 'Lớp 8A', tone: 'blue' },
];

const DEFAULT_PLANS = [
  { id: 1, title: 'Kế hoạch năm học', progress: 82, status: 'Đang thực hiện', tone: 'purple' },
  { id: 2, title: 'Kế hoạch học kỳ II', progress: 74, status: 'Đang thực hiện', tone: 'blue' },
  { id: 3, title: 'Kế hoạch tháng 5', progress: 68, status: 'Cần cập nhật', tone: 'orange' },
  { id: 4, title: 'Kế hoạch tuần 33', progress: 92, status: 'Gần hoàn thành', tone: 'green' },
];

const DEFAULT_RECORDS = [
  { id: 1, title: 'Kế hoạch bài dạy Unit 8 – Lớp 6A1', owner: 'Nguyễn Thị Mai', status: 'Đã duyệt', date: '06/05/2025', tone: 'green' },
  { id: 2, title: 'Sáng kiến kinh nghiệm: Ứng dụng AI', owner: 'Trần Minh Đức', status: 'Chờ duyệt', date: '05/05/2025', tone: 'orange' },
  { id: 3, title: 'Minh chứng thao giảng – 15/04/2025', owner: 'Phạm Thu Hà', status: 'Đã duyệt', date: '16/04/2025', tone: 'green' },
  { id: 4, title: 'Báo cáo chuyên đề STEM', owner: 'Lê Hoàng Nam', status: 'Cần chỉnh sửa', date: '02/05/2025', tone: 'red' },
];

const DEFAULT_MEETINGS = [
  { id: 1, title: 'Sinh hoạt tổ định kỳ', date: '2025-05-09', time: '14:00–15:30', place: 'Phòng họp 2', summary: 'Thống nhất phương án kiểm tra cuối kỳ II, tổ chức chuyên đề STEM và cập nhật tiến độ ứng dụng AI trong dạy học.', actions: [
    { id: 11, label: 'Hoàn thiện ma trận đề kiểm tra cuối kỳ II', owner: 'Cô Mai', due: '16/05', done: false },
    { id: 12, label: 'Chuẩn bị minh chứng chuyên đề STEM', owner: 'Thầy Nam', due: '20/05', done: false },
    { id: 13, label: 'Tổng hợp tài liệu ứng dụng AI trong dạy học', owner: 'Cô Hương', due: '18/05', done: false },
  ] },
  { id: 2, title: 'Rút kinh nghiệm thao giảng', date: '2025-04-28', time: '15:00–16:15', place: 'Phòng chuyên môn', summary: 'Đánh giá tiết thao giảng và thống nhất các điều chỉnh cho chuỗi hoạt động giao tiếp.', actions: [] },
];

const DEFAULT_EVIDENCE = [
  { id: 1, title: 'Giáo án Unit 8 – 6A1', date: '06/05/2025', type: 'Tài liệu', badge: 'W', tone: 'blue', preview: 'lesson' },
  { id: 2, title: 'Ảnh dự giờ 06/05', date: '06/05/2025', type: 'Hình ảnh', badge: 'IMG', tone: 'green', preview: 'class' },
  { id: 3, title: 'Video thao giảng', date: '15/04/2025', type: 'Video', badge: '▶', tone: 'purple', preview: 'video' },
  { id: 4, title: 'SKKN Ứng dụng AI', date: '05/05/2025', type: 'Báo cáo', badge: 'PDF', tone: 'red', preview: 'paper' },
];

const DEFAULT_REPORTS = [
  { id: 1, title: 'Báo cáo hoạt động tháng 4/2025', date: '08/05/2025', period: 'Tháng 4/2025' },
  { id: 2, title: 'Báo cáo sinh hoạt tổ quý II', date: '05/05/2025', period: 'Quý II' },
  { id: 3, title: 'Báo cáo chuyên đề STEM', date: '28/04/2025', period: 'Chuyên đề' },
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
    edit: <><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m14 6 3 3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.layers}</svg>;
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => {
    try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
    catch { return fallback; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* preview only */ } }, [key, value]);
  return [value, setValue];
}

function slug(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function formatDate(iso) { return iso ? iso.split('-').reverse().join('/') : ''; }
function initials(name) { return name === 'Toàn tổ' ? 'TT' : name.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase(); }
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function Brand() {
  return <div className="brand-lockup"><svg viewBox="0 0 54 46" className="brand-mark" aria-hidden="true"><path d="M4 21 27 7l23 14-23 14z" fill="#5372e8" opacity=".16"/><path d="m6 20 21-13 21 13-21 13z" fill="none" stroke="#5372e8" strokeWidth="3"/><path d="M13 26v10M20 30v10M34 30v10M41 26v10" stroke="#3150b5" strokeWidth="3" strokeLinecap="round"/><path d="M24 20h6v18h-6z" fill="#f0b945"/></svg><span><strong>brian</strong><small>ENGLISH</small></span></div>;
}

function HeroArt() {
  return <svg className="hero-art" viewBox="0 0 560 250" aria-hidden="true"><defs><linearGradient id="screen" x1="0" x2="1"><stop stopColor="#eff2ff"/><stop offset="1" stopColor="#c9d0ff"/></linearGradient><linearGradient id="book" x1="0" x2="1"><stop stopColor="#a591ff"/><stop offset="1" stopColor="#7663ec"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="14"/></filter></defs><ellipse cx="260" cy="198" rx="205" ry="28" fill="#846df0" opacity=".16" filter="url(#blur)"/><path d="M140 178h270l-18 25H155z" fill="url(#book)"/><path d="M164 163h244l10 18H140z" fill="#d8dcff" stroke="#9fa8e8" strokeWidth="2"/><path d="M185 41h178c16 0 29 13 29 29v90H156V70c0-16 13-29 29-29Z" fill="url(#screen)" stroke="#a6afe8" strokeWidth="3"/><path d="M177 60h194v79H177z" fill="#fff" opacity=".57"/><path d="m197 121 35-34 31 20 38-50 46 28" fill="none" stroke="#775ff0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><rect x="201" y="98" width="14" height="30" rx="4" fill="#7b68ef" opacity=".6"/><rect x="228" y="82" width="14" height="46" rx="4" fill="#7b68ef" opacity=".73"/><rect x="255" y="105" width="14" height="23" rx="4" fill="#7b68ef" opacity=".52"/><rect x="282" y="71" width="14" height="57" rx="4" fill="#7b68ef" opacity=".87"/><g transform="translate(432 95)"><path d="M32 63c-6-35-5-60 2-73 8 11 12 29 10 55 10-27 22-43 36-48-1 22-12 42-31 60 19-13 36-17 49-11-8 16-25 27-50 31z" fill="#4dc981"/><path d="M38 68h49l-6 53H45z" fill="#d9e6ff" stroke="#8f9cd8" strokeWidth="2"/></g></svg>;
}

function SectionHeader({ title, action, onAction }) {
  return <div className="section-head"><h2>{title}</h2>{action && <button type="button" onClick={onAction}>{action}<Icon name="arrow" size={16}/></button>}</div>;
}

function TaskRow({ task, onUpdate, onDelete, compact = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => { const close = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  const setStatus = (status) => { const progress = status === 'Hoàn thành' || status === 'Đã nộp' ? 100 : status === 'Chưa bắt đầu' ? 0 : Math.max(task.progress, 20); onUpdate(task.id, { status, progress }); setMenuOpen(false); };
  return <article className={`task-row ${compact ? 'is-compact' : ''}`} data-testid={`task-${task.id}`}>
    <span className={`avatar ${task.tone}`}>{task.initials}</span>
    <div className="task-copy"><strong>{task.title}</strong><small>{task.assignee}</small></div>
    <span className={`status ${slug(task.status)}`}>{task.status}</span>
    <div className="task-due"><small>Hạn hoàn thành</small><strong>{task.due}</strong></div>
    <div className="task-progress"><strong>{task.progress}%</strong><span><i style={{ width: `${task.progress}%` }}/></span></div>
    <div className="row-menu" ref={menuRef}><button className="icon-button compact" aria-label={`Tùy chọn ${task.title}`} onClick={() => setMenuOpen((open) => !open)}><Icon name="menu" size={18}/></button>{menuOpen && <div className="row-menu-popover"><button onClick={() => setStatus('Đang thực hiện')}>Bắt đầu</button><button onClick={() => setStatus('Đã nộp')}>Đánh dấu đã nộp</button><button onClick={() => setStatus('Hoàn thành')}>Hoàn thành</button><button className="danger" onClick={() => { onDelete(task.id); setMenuOpen(false); }}>Xóa nhiệm vụ</button></div>}</div>
  </article>;
}

function EvidenceCard({ item, onOpen }) {
  return <button className={`evidence-card evidence-${item.preview}`} onClick={() => onOpen?.(item)}><span className="evidence-preview"><b>{item.badge}</b>{item.preview === 'video' && <i>▶</i>}</span><strong>{item.title}</strong><small>{item.date}</small></button>;
}

function NotificationDrawer({ items, setItems, open, onClose, setToast }) {
  const unread = items.filter((item) => !item.read).length;
  if (!open) return null;
  return <aside className="notification-drawer" data-testid="notification-drawer"><header><div><h2>Thông báo</h2><small>{unread} thông báo chưa đọc</small></div><div className="drawer-head-actions"><button className="text-button" onClick={() => { setItems((list) => list.map((item) => ({ ...item, read: true }))); setToast('Đã đánh dấu tất cả thông báo là đã đọc.'); }}>Đánh dấu đã đọc</button><button className="icon-button compact drawer-close" onClick={onClose} aria-label="Đóng thông báo"><Icon name="close" size={17}/></button></div></header><div className="notification-list">{items.map((item) => <button key={item.id} className={item.read ? 'read' : ''} onClick={() => { setItems((list) => list.map((note) => note.id === item.id ? { ...note, read: true } : note)); setToast(item.title); }}><span className={`icon-box ${item.tone}`}><Icon name={item.icon}/></span><span><strong>{item.title}</strong><small>{item.detail}</small><time>{item.time}</time></span>{!item.read && <i/>}</button>)}</div><button className="notification-footer" onClick={() => setToast('Đã mở trung tâm thông báo.')}>Xem tất cả thông báo <Icon name="arrow" size={16}/></button></aside>;
}

function Overview({ state, actions }) {
  const { tasks, notifications, meetings, evidence, reports, overviewFilter, drawerOpen } = state;
  const { setOverviewFilter, setTab, updateTask, deleteTask, setNotifications, setDrawerOpen, setToast, exportReport, toggleMeetingAction } = actions;
  const filters = ['Tất cả', 'Chưa bắt đầu', 'Đang thực hiện', 'Quá hạn', 'Hoàn thành'];
  const filtered = overviewFilter === 'Tất cả' ? tasks : tasks.filter((task) => task.status.includes(overviewFilter));
  const doing = tasks.filter((task) => task.status === 'Đang thực hiện').length;
  const completed = tasks.filter((task) => ['Hoàn thành', 'Đã nộp'].includes(task.status)).length;
  const meeting = meetings[0];
  return <div className={`workspace-grid ${drawerOpen ? '' : 'notifications-hidden'}`}>
    <div className="content-column">
      <section className="summary-row">
        <article className="hero-card"><div className="hero-copy"><h1>Tổng quan tổ chuyên môn</h1><p>Cập nhật bức tranh tổng thể về hoạt động và hiệu quả của tổ chuyên môn.</p><button className="hero-action" onClick={() => setTab('plans')}>Xem kế hoạch tháng 5 <Icon name="arrow" size={17}/></button></div><HeroArt/></article>
        {[
          ['Công việc đang thực hiện', doing, 'clipboard', 'purple', '↑ 20%'],
          ['Công việc hoàn thành', completed, 'check', 'green', '↑ 25%'],
          ['Buổi sinh hoạt đã tổ chức', meetings.length, 'users', 'orange', '= ổn định'],
          ['Minh chứng đã cập nhật', evidence.length, 'layers', 'blue', '↑ 15%'],
        ].map(([label, value, icon, tone, delta]) => <article key={label} className="kpi-card"><span className={`icon-box ${tone}`}><Icon name={icon}/></span><p>{label}</p><strong>{value}</strong><small className={String(delta).startsWith('=') ? 'neutral' : ''}>{delta} so với tháng trước</small></article>)}
      </section>
      <section className="dashboard-row">
        <article className="panel task-panel"><SectionHeader title="Bảng giao việc" action="Xem tất cả" onAction={() => setTab('tasks')}/><div className="filter-row">{filters.map((item) => { const count = item === 'Tất cả' ? tasks.length : tasks.filter((task) => task.status.includes(item)).length; return <button key={item} className={overviewFilter === item ? 'active' : ''} onClick={() => setOverviewFilter(item)}>{item}<span>{count}</span></button>; })}</div><div className="task-list">{filtered.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} compact onUpdate={updateTask} onDelete={deleteTask}/>)}</div></article>
        <article className="panel meeting-panel"><div className="section-head"><h2>Ghi chú phiên họp tổ</h2><span className="date-chip">{formatDate(meeting.date)} · SH tổ định kỳ</span></div><h3>Nội dung chính</h3><p>{meeting.summary}</p><h3>Việc cần làm <small>(trích xuất tự động)</small></h3><div className="meeting-checklist">{meeting.actions.map((action) => <label key={action.id}><input type="checkbox" checked={action.done} onChange={() => toggleMeetingAction(meeting.id, action.id)}/><span>{action.label}</span><em>{action.owner}</em><time>{action.due}</time></label>)}</div><button className="link-button" onClick={() => setTab('meetings')}>Xem toàn bộ biên bản cuộc họp <Icon name="arrow" size={15}/></button></article>
        <article className="panel report-panel"><SectionHeader title="Báo cáo" action="Xem tất cả" onAction={() => setTab('reports')}/><div className="report-list">{reports.slice(0, 3).map((report) => <button key={report.id} onClick={() => setToast(`Đã mở ${report.title}.`)}><span className="icon-box blue"><Icon name="report" size={18}/></span><span><strong>{report.title}</strong><small>Cập nhật: {report.date}</small></span></button>)}</div><div className="export-row"><button onClick={() => exportReport('word')}>▣ Word</button><button onClick={() => exportReport('pdf')}>▣ PDF</button><button onClick={() => exportReport('html')}>&lt;/&gt; HTML</button></div></article>
      </section>
      <section className="panel profile-strip"><div className="teacher-profile"><span className="teacher-photo">NM</span><div><h2>Nguyễn Thị Mai</h2><span className="role-badge">Giáo viên</span><dl><div><dt>Tổ</dt><dd>Tiếng Anh</dd></div><div><dt>Trình độ</dt><dd>Thạc sĩ</dd></div><div><dt>Thâm niên</dt><dd>8 năm</dd></div></dl></div></div><div className="approval-history"><h2>Lịch sử phê duyệt</h2>{state.records.slice(0, 3).map((record) => <button key={record.id} onClick={() => setTab('records')}><span className={`icon-box ${record.tone}`}><Icon name={record.status === 'Chờ duyệt' ? 'calendar' : 'check'} size={18}/></span><span><strong>{record.title}</strong><small>{record.status} · {record.date}</small></span><em>Xem</em></button>)}</div><div className="featured-evidence"><h2>Minh chứng nổi bật</h2><div>{evidence.slice(0, 4).map((item) => <EvidenceCard key={item.id} item={item} onOpen={() => setTab('evidence')}/>)}</div></div></section>
    </div>
    <NotificationDrawer items={notifications} setItems={setNotifications} open={drawerOpen} onClose={() => setDrawerOpen(false)} setToast={setToast}/>
  </div>;
}

function PageHeading({ eyebrow, title, description, action, onAction }) {
  return <header className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <button className="primary-button" onClick={onAction}><Icon name="plus" size={18}/>{action}</button>}</header>;
}

function CalendarPage({ events, onCreate, setToast }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date(2025, 4 + monthOffset, 1);
  const month = base.getMonth(); const year = base.getFullYear();
  const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const first = (new Date(year, month, 1).getDay() + 6) % 7; const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => index - first + 1);
  const eventDays = new Set(events.filter((event) => { const date = new Date(event.date); return date.getMonth() === month && date.getFullYear() === year; }).map((event) => Number(event.date.slice(-2))));
  return <div className="subpage"><PageHeading eyebrow="LỊCH CHUYÊN MÔN" title="Lịch và hoạt động" description="Theo dõi họp tổ, dự giờ, thao giảng, hạn hồ sơ và các mốc chuyên môn." action="Tạo lịch" onAction={onCreate}/><div className="two-column-page"><article className="panel calendar-card"><div className="calendar-title"><button onClick={() => setMonthOffset((value) => value - 1)}>‹</button><h2>{monthNames[month]} · {year}</h2><button onClick={() => setMonthOffset((value) => value + 1)}>›</button></div><div className="calendar-grid">{['T2','T3','T4','T5','T6','T7','CN'].map((day) => <b key={day}>{day}</b>)}{cells.map((day, index) => <button key={index} className={eventDays.has(day) ? 'event-day' : ''} disabled={day < 1 || day > days} onClick={() => day > 0 && day <= days && setToast(`${day}/${month + 1}/${year}`)}>{day > 0 && day <= days ? day : ''}</button>)}</div></article><article className="panel events-card"><SectionHeader title="14 ngày sắp tới" action="Thêm hoạt động" onAction={onCreate}/>{events.map((event) => { const date = new Date(event.date); return <div className="event-row" key={event.id}><span className={`event-date ${event.tone}`}><strong>{date.getDate()}</strong><small>TH{date.getMonth() + 1}</small></span><div><strong>{event.title}</strong><small>{event.time} · {event.place}</small></div><button onClick={() => setToast(`Chi tiết: ${event.title}`)}>Chi tiết</button></div>; })}</article></div></div>;
}

function TasksPage({ tasks, onCreate, updateTask, deleteTask }) {
  const [filter, setFilter] = useState('Tất cả');
  const visible = filter === 'Tất cả' ? tasks : tasks.filter((task) => task.status === filter);
  return <div className="subpage"><PageHeading eyebrow="TRUNG TÂM CÔNG VIỆC" title="Giao việc và theo dõi" description="Giao nhiệm vụ, quản lý thời hạn, nhận sản phẩm và kiểm soát tiến độ theo từng giáo viên." action="Tạo nhiệm vụ" onAction={onCreate}/><article className="panel full-panel"><div className="filter-row page-filters">{['Tất cả', ...TASK_STATUSES].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}<span>{item === 'Tất cả' ? tasks.length : tasks.filter((task) => task.status === item).length}</span></button>)}</div><div className="task-list full">{visible.map((task) => <TaskRow key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask}/>)}</div>{!visible.length && <div className="empty-state">Chưa có nhiệm vụ trong trạng thái này.</div>}</article></div>;
}

function PlansPage({ plans, setPlans, onCreate, setToast }) {
  const updateProgress = (id, progress) => setPlans((items) => items.map((item) => item.id === id ? { ...item, progress, status: progress >= 100 ? 'Hoàn thành' : progress >= 85 ? 'Gần hoàn thành' : 'Đang thực hiện' } : item));
  return <div className="subpage"><PageHeading eyebrow="KẾ HOẠCH CHUYÊN MÔN" title="Kế hoạch và tiến độ" description="Quản lý kế hoạch năm học, học kỳ, tháng, tuần và các chuyên đề trọng tâm." action="Tạo kế hoạch" onAction={onCreate}/><div className="plan-grid">{plans.map((plan) => <article className="panel plan-card" key={plan.id}><span className={`icon-box ${plan.tone}`}><Icon name="plan"/></span><h2>{plan.title}</h2><strong>{plan.progress}%</strong><input aria-label={`Tiến độ ${plan.title}`} type="range" min="0" max="100" value={plan.progress} onChange={(event) => updateProgress(plan.id, Number(event.target.value))}/><small>{plan.status}</small><button onClick={() => setToast(`Đã mở ${plan.title}.`)}>Mở kế hoạch</button></article>)}</div><article className="panel full-panel"><SectionHeader title="Lộ trình thực hiện" action="Xem lịch" onAction={() => setToast('Đã mở lịch triển khai.')}/><div className="timeline">{['Khởi tạo mục tiêu','Phân công phụ trách','Triển khai hoạt động','Thu thập minh chứng','Đánh giá và báo cáo'].map((item,index) => <div className={index < 3 ? 'done' : ''} key={item}><span>{index < 3 ? '✓' : index + 1}</span><strong>{item}</strong><small>{index < 3 ? 'Đã hoàn thành' : 'Đang chờ'}</small></div>)}</div></article></div>;
}

function RecordsPage({ records, setRecords, onCreate, setToast }) {
  const updateStatus = (id, status, tone) => { setRecords((items) => items.map((item) => item.id === id ? { ...item, status, tone } : item)); setToast(`Đã cập nhật hồ sơ: ${status}.`); };
  const count = (status) => records.filter((record) => record.status === status).length;
  return <div className="subpage"><PageHeading eyebrow="HỒ SƠ CHUYÊN MÔN" title="Nộp và phê duyệt hồ sơ" description="Theo dõi toàn bộ vòng đời hồ sơ: đã giao, đã nộp, chỉnh sửa, duyệt và lưu kho." action="Nộp hồ sơ" onAction={onCreate}/><div className="pipeline">{[['Chờ duyệt', count('Chờ duyệt'), 'orange'],['Cần chỉnh sửa', count('Cần chỉnh sửa'), 'red'],['Đã duyệt', count('Đã duyệt'), 'green'],['Tổng hồ sơ', records.length, 'blue']].map(([label,value,tone]) => <article className="panel" key={label}><span className={`icon-box ${tone}`}><Icon name="folder"/></span><h2>{label}</h2><strong>{value}</strong><small>Hồ sơ</small></article>)}</div><article className="panel full-panel record-table"><SectionHeader title="Hồ sơ gần đây" action="Làm mới" onAction={() => setToast('Danh sách hồ sơ đã được làm mới.')}/>{records.map((record) => <div className="record-row" key={record.id}><span className={`icon-box ${record.tone}`}><Icon name="report"/></span><div><strong>{record.title}</strong><small>{record.owner}</small></div><span className={`status ${slug(record.status)}`}>{record.status}</span><time>{record.date}</time><div className="inline-actions"><button onClick={() => setToast(`Đang xem ${record.title}`)}>Xem</button>{record.status !== 'Đã duyệt' && <button className="success" onClick={() => updateStatus(record.id, 'Đã duyệt', 'green')}>Duyệt</button>}<button className="warning" onClick={() => updateStatus(record.id, 'Cần chỉnh sửa', 'red')}>Yêu cầu sửa</button></div></div>)}</article></div>;
}

function MeetingsPage({ meetings, setMeetings, onCreate, setToast }) {
  const [selectedId, setSelectedId] = useState(meetings[0]?.id);
  const selected = meetings.find((meeting) => meeting.id === selectedId) || meetings[0];
  const toggle = (actionId) => setMeetings((items) => items.map((meeting) => meeting.id === selected.id ? { ...meeting, actions: meeting.actions.map((action) => action.id === actionId ? { ...action, done: !action.done } : action) } : meeting));
  return <div className="subpage"><PageHeading eyebrow="SINH HOẠT TỔ" title="Cuộc họp và hoạt động chuyên môn" description="Lưu biên bản, tài liệu cuộc họp và chuyển nội dung thành nhiệm vụ theo dõi." action="Tạo cuộc họp" onAction={onCreate}/><div className="two-column-page meeting-layout"><article className="panel meeting-detail">{selected ? <><div className="meeting-banner"><span>{selected.date.slice(-2)}</span><div><small>THÁNG {Number(selected.date.slice(5,7))} · {selected.date.slice(0,4)}</small><h2>{selected.title}</h2><p>{selected.place} · {selected.time}</p></div></div><h3>Nội dung chính</h3><p>{selected.summary}</p><h3>Việc cần làm</h3><div className="meeting-checklist expanded">{selected.actions.length ? selected.actions.map((action) => <label key={action.id}><input type="checkbox" checked={action.done} onChange={() => toggle(action.id)}/><span>{action.label}</span><em>{action.owner}</em><time>{action.due}</time></label>) : <div className="empty-state compact">Cuộc họp này chưa có việc cần làm.</div>}</div></> : <div className="empty-state">Chưa có cuộc họp.</div>}</article><article className="panel minutes-list"><SectionHeader title="Biên bản gần đây"/>{meetings.map((meeting) => <button className={selectedId === meeting.id ? 'active' : ''} key={meeting.id} onClick={() => setSelectedId(meeting.id)}><span className="icon-box blue"><Icon name="report"/></span><span><strong>{meeting.title}</strong><small>{formatDate(meeting.date)}</small></span><em>Xem</em></button>)}<button className="minutes-export" onClick={() => setToast('Đã chuẩn bị biên bản cuộc họp để xuất file.')}>Xuất biên bản</button></article></div></div>;
}

function EvidencePage({ evidence, onCreate, setToast }) {
  const [filter, setFilter] = useState('Tất cả');
  const types = ['Tất cả', 'Tài liệu', 'Hình ảnh', 'Video', 'Báo cáo'];
  const visible = filter === 'Tất cả' ? evidence : evidence.filter((item) => item.type === filter);
  return <div className="subpage"><PageHeading eyebrow="THƯ VIỆN MINH CHỨNG" title="Minh chứng và sản phẩm" description="Phân loại minh chứng theo năm học, học kỳ, giáo viên, hoạt động và trạng thái duyệt." action="Thêm minh chứng" onAction={onCreate}/><div className="evidence-stats">{types.slice(1).map((type, index) => { const tones = ['blue','green','purple','red']; return <article className="panel" key={type}><span className={`icon-box ${tones[index]}`}><Icon name="layers"/></span><h2>{type}</h2><strong>{evidence.filter((item) => item.type === type).length}</strong><small>Đã lưu</small></article>; })}</div><article className="panel evidence-library"><div className="section-head"><h2>Minh chứng nổi bật</h2><div className="filter-row library-filters">{types.map((type) => <button key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{type}</button>)}</div></div><div className="evidence-grid">{visible.map((item) => <EvidenceCard key={item.id} item={item} onOpen={() => setToast(`Đã mở ${item.title}.`)}/>)}</div>{!visible.length && <div className="empty-state">Chưa có minh chứng thuộc nhóm này.</div>}</article></div>;
}

function ReportsPage({ reports, onCreate, exportReport, setToast }) {
  return <div className="subpage"><PageHeading eyebrow="BÁO CÁO & PHÂN TÍCH" title="Báo cáo tổ chuyên môn" description="Tổng hợp tiến độ công việc, hồ sơ, hoạt động, tải việc và minh chứng còn thiếu." action="Tạo báo cáo" onAction={onCreate}/><div className="report-metrics">{[['Tỷ lệ hoàn thành','86%','green'],['Nhiệm vụ quá hạn','3','red'],['Thời gian duyệt TB','1,8 ngày','blue'],['Minh chứng còn thiếu','7','orange']].map(([label,value,tone]) => <article className="panel" key={label}><span className={`icon-box ${tone}`}><Icon name="chart"/></span><h2>{label}</h2><strong>{value}</strong></article>)}</div><article className="panel full-panel"><SectionHeader title="Báo cáo đã tạo" action="Làm mới" onAction={() => setToast('Đã cập nhật danh sách báo cáo.')}/><div className="report-list large">{reports.map((report) => <div className="report-export-row" key={report.id}><span className="icon-box blue"><Icon name="report"/></span><span><strong>{report.title}</strong><small>{report.period} · cập nhật {report.date}</small></span><div className="inline-actions"><button onClick={() => exportReport('word', report)}>Word</button><button onClick={() => exportReport('pdf', report)}>PDF</button><button onClick={() => exportReport('html', report)}>HTML</button></div></div>)}</div></article></div>;
}

function FormModal({ type, onClose, onSubmit }) {
  const configs = {
    task: { eyebrow: 'GIAO VIỆC', title: 'Tạo nhiệm vụ mới', fields: [['title','Tên nhiệm vụ','text'],['assignee','Người nhận','people'],['due','Hạn hoàn thành','date'],['status','Trạng thái','status']] },
    event: { eyebrow: 'LỊCH CHUYÊN MÔN', title: 'Tạo hoạt động mới', fields: [['title','Tên hoạt động','text'],['date','Ngày','date'],['time','Thời gian','text'],['place','Địa điểm','text']] },
    plan: { eyebrow: 'KẾ HOẠCH', title: 'Tạo kế hoạch mới', fields: [['title','Tên kế hoạch','text'],['progress','Tiến độ ban đầu','number']] },
    record: { eyebrow: 'HỒ SƠ', title: 'Nộp hồ sơ mới', fields: [['title','Tên hồ sơ','text'],['owner','Người nộp','people'],['date','Ngày nộp','date']] },
    meeting: { eyebrow: 'SINH HOẠT TỔ', title: 'Tạo cuộc họp mới', fields: [['title','Tên cuộc họp','text'],['date','Ngày','date'],['time','Thời gian','text'],['place','Địa điểm','text'],['summary','Nội dung chính','textarea']] },
    evidence: { eyebrow: 'MINH CHỨNG', title: 'Thêm minh chứng mới', fields: [['title','Tên minh chứng','text'],['date','Ngày cập nhật','date'],['evidenceType','Loại minh chứng','evidenceType']] },
    report: { eyebrow: 'BÁO CÁO', title: 'Tạo báo cáo mới', fields: [['title','Tên báo cáo','text'],['period','Kỳ báo cáo','text'],['date','Ngày cập nhật','date']] },
  };
  const config = configs[type];
  const initial = { title: '', assignee: 'Toàn tổ', owner: 'Nguyễn Thị Mai', due: '2025-05-30', date: '2025-05-30', status: 'Chưa bắt đầu', time: '14:00–15:30', place: 'Phòng họp 2', progress: 0, summary: '', evidenceType: 'Tài liệu', period: 'Tháng 5/2025' };
  const [form, setForm] = useState(initial);
  const submit = (event) => { event.preventDefault(); if (!form.title.trim()) return; onSubmit(form); };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal" onSubmit={submit} data-testid={`${type}-modal`}><header><div><span>{config.eyebrow}</span><h2>{config.title}</h2></div><button type="button" className="icon-button" onClick={onClose}><Icon name="close"/></button></header><div className="modal-fields">{config.fields.map(([key,label,fieldType]) => <label key={key}>{label}{fieldType === 'people' ? <select value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })}>{PEOPLE.map((person) => <option key={person}>{person}</option>)}</select> : fieldType === 'status' ? <select value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select> : fieldType === 'evidenceType' ? <select value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })}>{['Tài liệu','Hình ảnh','Video','Báo cáo'].map((item) => <option key={item}>{item}</option>)}</select> : fieldType === 'textarea' ? <textarea value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} rows="4"/> : <input autoFocus={key === 'title'} type={fieldType} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} min={fieldType === 'number' ? 0 : undefined} max={fieldType === 'number' ? 100 : undefined}/>}</label>)}</div><footer><button type="button" onClick={onClose}>Hủy</button><button className="primary-button" type="submit">Lưu</button></footer></form></div>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useStoredState('department-v2-tasks', DEFAULT_TASKS);
  const [notifications, setNotifications] = useStoredState('department-v2-notifications', DEFAULT_NOTIFICATIONS);
  const [events, setEvents] = useStoredState('department-v2-events', DEFAULT_EVENTS);
  const [plans, setPlans] = useStoredState('department-v2-plans', DEFAULT_PLANS);
  const [records, setRecords] = useStoredState('department-v2-records', DEFAULT_RECORDS);
  const [meetings, setMeetings] = useStoredState('department-v2-meetings', DEFAULT_MEETINGS);
  const [evidence, setEvidence] = useStoredState('department-v2-evidence', DEFAULT_EVIDENCE);
  const [reports, setReports] = useStoredState('department-v2-reports', DEFAULT_REPORTS);
  const [overviewFilter, setOverviewFilter] = useState('Tất cả');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [modalType, setModalType] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [role, setRole] = useState('TTCM');

  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer); }, [toast]);

  const updateTask = (id, patch) => setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deleteTask = (id) => { setTasks((items) => items.filter((item) => item.id !== id)); setToast('Đã xóa nhiệm vụ.'); };
  const toggleMeetingAction = (meetingId, actionId) => setMeetings((items) => items.map((meeting) => meeting.id === meetingId ? { ...meeting, actions: meeting.actions.map((action) => action.id === actionId ? { ...action, done: !action.done } : action) } : meeting));

  const createItem = (form) => {
    const id = Date.now();
    if (modalType === 'task') setTasks((items) => [{ id, title: form.title.trim(), assignee: form.assignee, initials: initials(form.assignee), due: formatDate(form.due), status: form.status, progress: form.status === 'Hoàn thành' || form.status === 'Đã nộp' ? 100 : 0, tone: 'purple' }, ...items]);
    if (modalType === 'event') setEvents((items) => [{ id, title: form.title.trim(), date: form.date, time: form.time, place: form.place, tone: 'purple' }, ...items]);
    if (modalType === 'plan') setPlans((items) => [{ id, title: form.title.trim(), progress: Number(form.progress) || 0, status: 'Đang thực hiện', tone: 'purple' }, ...items]);
    if (modalType === 'record') setRecords((items) => [{ id, title: form.title.trim(), owner: form.owner, status: 'Chờ duyệt', date: formatDate(form.date), tone: 'orange' }, ...items]);
    if (modalType === 'meeting') setMeetings((items) => [{ id, title: form.title.trim(), date: form.date, time: form.time, place: form.place, summary: form.summary || 'Chưa cập nhật nội dung.', actions: [] }, ...items]);
    if (modalType === 'evidence') { const mapping = { 'Tài liệu': ['W','blue','lesson'], 'Hình ảnh': ['IMG','green','class'], 'Video': ['▶','purple','video'], 'Báo cáo': ['PDF','red','paper'] }; const [badge,tone,preview] = mapping[form.evidenceType]; setEvidence((items) => [{ id, title: form.title.trim(), date: formatDate(form.date), type: form.evidenceType, badge, tone, preview }, ...items]); }
    if (modalType === 'report') setReports((items) => [{ id, title: form.title.trim(), date: formatDate(form.date), period: form.period }, ...items]);
    setModalType(null); setToast('Đã lưu dữ liệu mới.');
  };

  const exportReport = (format, report = reports[0]) => {
    const title = report?.title || 'Báo cáo hoạt động Hub Chuyên môn';
    const taskRows = tasks.map((task) => `<tr><td>${task.title}</td><td>${task.assignee}</td><td>${task.status}</td><td>${task.progress}%</td></tr>`).join('');
    const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>${title}</title><body style="font-family:Arial,sans-serif;padding:40px"><h1>${title}</h1><p>Kỳ báo cáo: ${report?.period || 'Hiện tại'} · cập nhật ${report?.date || new Date().toLocaleDateString('vi-VN')}</p><table border="1" cellspacing="0" cellpadding="8"><thead><tr><th>Nhiệm vụ</th><th>Phụ trách</th><th>Trạng thái</th><th>Tiến độ</th></tr></thead><tbody>${taskRows}</tbody></table></body></html>`;
    if (format === 'pdf') { window.print(); setToast('Đã mở hộp thoại in để lưu PDF.'); return; }
    if (format === 'word') downloadFile(`${slug(title)}.doc`, html, 'application/msword');
    if (format === 'html') downloadFile(`${slug(title)}.html`, html, 'text/html;charset=utf-8');
    setToast(`Đã xuất ${format.toUpperCase()}.`);
  };

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase(); if (query.length < 2) return [];
    return [
      ...tasks.map((item) => ({ tab: 'tasks', title: item.title, meta: item.assignee })),
      ...plans.map((item) => ({ tab: 'plans', title: item.title, meta: item.status })),
      ...records.map((item) => ({ tab: 'records', title: item.title, meta: item.owner })),
      ...evidence.map((item) => ({ tab: 'evidence', title: item.title, meta: item.type })),
      ...reports.map((item) => ({ tab: 'reports', title: item.title, meta: item.period })),
    ].filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(query)).slice(0, 6);
  }, [search, tasks, plans, records, evidence, reports]);

  const pageProps = { setToast };
  const pages = {
    overview: <Overview state={{ tasks, notifications, meetings, evidence, reports, records, overviewFilter, drawerOpen }} actions={{ setOverviewFilter, setTab: setActiveTab, updateTask, deleteTask, setNotifications, setDrawerOpen, setToast, exportReport, toggleMeetingAction }}/>,
    calendar: <CalendarPage events={events} onCreate={() => setModalType('event')} {...pageProps}/>,
    tasks: <TasksPage tasks={tasks} onCreate={() => setModalType('task')} updateTask={updateTask} deleteTask={deleteTask}/>,
    plans: <PlansPage plans={plans} setPlans={setPlans} onCreate={() => setModalType('plan')} {...pageProps}/>,
    records: <RecordsPage records={records} setRecords={setRecords} onCreate={() => setModalType('record')} {...pageProps}/>,
    meetings: <MeetingsPage meetings={meetings} setMeetings={setMeetings} onCreate={() => setModalType('meeting')} {...pageProps}/>,
    evidence: <EvidencePage evidence={evidence} onCreate={() => setModalType('evidence')} {...pageProps}/>,
    reports: <ReportsPage reports={reports} onCreate={() => setModalType('report')} exportReport={exportReport} {...pageProps}/>,
  };
  const unread = notifications.filter((item) => !item.read).length;

  return <div className="app-background"><div className="app-frame"><header className="app-header"><button className="brand-button" onClick={() => setActiveTab('overview')}><Brand/><span className="brand-divider"/><strong>Hub Chuyên môn</strong></button><nav aria-label="Điều hướng Hub Chuyên môn">{TABS.map(([id,label,icon]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)} data-testid={`tab-${id}`}><Icon name={icon} size={18}/><span>{label}</span></button>)}</nav><div className="header-actions"><div className="search-wrap"><label className="search-box"><Icon name="search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm nhanh..." aria-label="Tìm kiếm nhanh"/></label>{searchResults.length > 0 && <div className="search-results">{searchResults.map((result, index) => <button key={`${result.tab}-${index}`} onClick={() => { setActiveTab(result.tab); setSearch(''); }}><strong>{result.title}</strong><small>{result.meta}</small></button>)}</div>}</div><button className="icon-button bell-button" onClick={() => setDrawerOpen((open) => !open)} aria-label="Mở thông báo"><Icon name="bell"/>{unread > 0 && <span>{unread}</span>}</button><span className="user-avatar">AT</span><div className="role-menu"><button className="role-button" onClick={() => setRoleMenuOpen((open) => !open)}>{role}⌄</button>{roleMenuOpen && <div><button onClick={() => { setRole('TTCM'); setRoleMenuOpen(false); setToast('Đang sử dụng vai trò TTCM.'); }}>TTCM</button><button onClick={() => { setRole('Giáo viên'); setRoleMenuOpen(false); setToast('Đang xem thử giao diện Giáo viên.'); }}>Giáo viên</button></div>}</div></div></header><main>{pages[activeTab]}</main></div>{modalType && <FormModal type={modalType} onClose={() => setModalType(null)} onSubmit={createItem}/>} {toast && <div className="toast" role="status">{toast}</div>}</div>;
}
