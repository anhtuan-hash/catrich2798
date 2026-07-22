import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './DepartmentWorkspaceV2.css';

const TABS = [
  ['overview', 'Tổng quan', 'home'],
  ['calendar', 'Lịch', 'calendar'],
  ['tasks', 'Giao việc', 'task'],
  ['plans', 'Kế hoạch', 'plan'],
  ['records', 'Hồ sơ', 'folder'],
  ['meetings', 'Sinh hoạt tổ', 'users'],
  ['evidence', 'Minh chứng', 'layers'],
  ['reports', 'Báo cáo', 'chart'],
];

const DEFAULT_TASKS = [
  { id: 1, title: 'Xây dựng ma trận đề kiểm tra học kỳ II môn Tiếng Anh 6', assignee: 'Nguyễn Thị Mai', initials: 'NM', due: '20/05/2025', status: 'Đang thực hiện', progress: 60, tone: 'purple' },
  { id: 2, title: 'Dự giờ đồng nghiệp – Tháng 5', assignee: 'Trần Minh Đức', initials: 'TD', due: '15/05/2025', status: 'Đang thực hiện', progress: 40, tone: 'green' },
  { id: 3, title: 'Biên soạn chuyên đề: Dạy học phát triển năng lực giao tiếp', assignee: 'Phạm Thu Hà', initials: 'PH', due: '25/05/2025', status: 'Chưa bắt đầu', progress: 0, tone: 'orange' },
  { id: 4, title: 'Tổng hợp minh chứng thi đua học kỳ II', assignee: 'Lê Hoàng Nam', initials: 'LN', due: '10/05/2025', status: 'Quá hạn', progress: 100, tone: 'red' },
  { id: 5, title: 'Hoàn thiện kế hoạch bồi dưỡng học sinh giỏi', assignee: 'Đỗ Thị Hương', initials: 'DH', due: '28/05/2025', status: 'Đã nộp', progress: 100, tone: 'blue' },
];

const EVENTS = [
  { date: '16', month: 'Th5', title: 'Họp tổ chuyên môn tháng 5', time: '14:00 – 15:30', place: 'Phòng họp 2', tone: 'purple' },
  { date: '19', month: 'Th5', title: 'Hạn nộp kế hoạch bài dạy tuần 33', time: '17:00', place: 'Nộp trực tuyến', tone: 'green' },
  { date: '21', month: 'Th5', title: 'Sinh hoạt chuyên đề phát triển năng lực', time: '14:00 – 16:00', place: 'Phòng học thông minh', tone: 'orange' },
  { date: '23', month: 'Th5', title: 'Dự giờ và rút kinh nghiệm', time: '08:00 – 09:30', place: 'Lớp 8A', tone: 'blue' },
];

const PLAN_ITEMS = [
  { title: 'Kế hoạch chuyên môn', value: 75, count: '3/4', tone: 'purple' },
  { title: 'Bồi dưỡng chuyên môn', value: 60, count: '3/5', tone: 'blue' },
  { title: 'Sinh hoạt chuyên đề', value: 80, count: '4/5', tone: 'green' },
  { title: 'Kiểm tra – đánh giá', value: 50, count: '2/4', tone: 'orange' },
  { title: 'Ứng dụng CNTT', value: 70, count: '7/10', tone: 'cyan' },
];

const REPORTS = [
  ['Báo cáo hoạt động tháng 4/2025', '08/05/2025'],
  ['Báo cáo sinh hoạt tổ quý II', '05/05/2025'],
  ['Báo cáo chuyên đề STEM', '28/04/2025'],
];

const EVIDENCE = [
  { title: 'Giáo án Unit 8 – 6A1', meta: '06/05/2025', type: 'W', tone: 'blue', kind: 'document' },
  { title: 'Ảnh dự giờ 06/05', meta: '06/05/2025', type: 'IMG', tone: 'green', kind: 'classroom' },
  { title: 'Video thao giảng', meta: '15/04/2025', type: '▶', tone: 'purple', kind: 'video' },
  { title: 'SKKN Ứng dụng AI', meta: '05/05/2025', type: 'PDF', tone: 'red', kind: 'pdf' },
];

const DEFAULT_NOTIFICATIONS = [
  { id: 1, title: 'Có 2 công việc sắp đến hạn', detail: 'Ma trận đề kiểm tra học kỳ II, Minh chứng thi đua HKII', time: '5 phút trước', icon: 'task', tone: 'purple', read: false },
  { id: 2, title: 'Cuộc họp tổ vào 15:30 hôm nay', detail: 'Nội dung: Đánh giá hoạt động tháng 5', time: '30 phút trước', icon: 'users', tone: 'blue', read: false },
  { id: 3, title: 'Hồ sơ của Nguyễn Thị Mai đã được phê duyệt', detail: 'Kế hoạch bài dạy Unit 8 – Lớp 6A1', time: '1 giờ trước', icon: 'check', tone: 'green', read: false },
  { id: 4, title: 'Minh chứng mới được cập nhật', detail: 'Thầy Nam đã thêm minh chứng mới cho chuyên đề STEM', time: '2 giờ trước', icon: 'folder', tone: 'orange', read: true },
  { id: 5, title: 'Báo cáo tháng 4/2025 đã hoàn thành', detail: 'Bạn có thể xem và xuất báo cáo', time: '3 giờ trước', icon: 'report', tone: 'pink', read: true },
];

function Icon({ name, size = 20 }) {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    task: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5h6M9 9l1.5 1.5L14 7M9 15h6"/></>,
    plan: <><path d="M5 4h10l4 4v12H5z"/><path d="M15 4v5h5M8 13h8M8 17h6"/></>,
    folder: <><path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.4-6 6-6s6 2 6 6M15 15c3.2 0 5 1.6 5 5"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    report: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    menu: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    chevron: <path d="m8 10 4 4 4-4"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.layers}</svg>;
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional */ }
  }, [key, value]);
  return [value, setValue];
}

function statusKey(status) {
  return String(status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
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

function Panel({ className = '', children }) {
  return <section className={`dw2-panel ${className}`.trim()}>{children}</section>;
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div className="dw2-section-head">
      <h2>{title}</h2>
      {action ? <button type="button" onClick={onAction}>{action}<Icon name="arrow" size={16}/></button> : null}
    </div>
  );
}

function BrianLogo() {
  return (
    <div className="dw2-brand-lockup" aria-label="Brian English">
      <svg className="dw2-brand-symbol" viewBox="0 0 38 38" aria-hidden="true">
        <path d="M4 17 19 7l15 10-15 10z" fill="#6957f5"/>
        <path d="M8 18.5 19 11l11 7.5-11 7.3z" fill="#f2c84b" opacity=".95"/>
        <path d="M10 21v8M28 21v8" stroke="#5e50d8" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M8 29h22" stroke="#5e50d8" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
      <span><strong>brian</strong><small>ENGLISH</small></span>
    </div>
  );
}

function HeroIllustration() {
  return (
    <svg className="dw2-hero-illustration" viewBox="0 0 430 220" aria-hidden="true">
      <defs>
        <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f8fbff" stopOpacity=".9"/><stop offset="1" stopColor="#a8b2ff" stopOpacity=".58"/></linearGradient>
        <linearGradient id="book1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#93a7ff"/><stop offset="1" stopColor="#5f61e9"/></linearGradient>
        <linearGradient id="book2" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fde5a6"/><stop offset="1" stopColor="#c7a650"/></linearGradient>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#6555c8" floodOpacity=".24"/></filter>
      </defs>
      <ellipse cx="210" cy="187" rx="148" ry="19" fill="#8b7df2" opacity=".12"/>
      <g filter="url(#shadow)" transform="translate(98 25) rotate(5 115 70)">
        <rect x="35" y="0" width="205" height="118" rx="15" fill="url(#screen)" stroke="#fff" strokeWidth="3"/>
        <rect x="49" y="13" width="177" height="91" rx="9" fill="#edf1ff" opacity=".88"/>
        <path d="M60 83c25-20 42-5 65-31 19-20 36 13 57-10 14-15 25-5 35-25" fill="none" stroke="#6c5af2" strokeWidth="5" strokeLinecap="round"/>
        <g fill="#8b78f6" opacity=".82"><rect x="69" y="70" width="15" height="23" rx="3"/><rect x="92" y="57" width="15" height="36" rx="3"/><rect x="115" y="65" width="15" height="28" rx="3"/><rect x="138" y="45" width="15" height="48" rx="3"/></g>
        <path d="M25 118h225l-23 23H48z" fill="#c5cafa" stroke="#fff" strokeWidth="2"/>
        <path d="M82 124h112l-7 8H89z" fill="#9ca6e9" opacity=".7"/>
      </g>
      <g filter="url(#shadow)"><path d="M88 161h246l-17 21H72z" fill="url(#book1)"/><path d="M102 178h225l-13 17H88z" fill="url(#book2)"/><path d="M105 178h220" stroke="#fff" strokeOpacity=".65" strokeWidth="3"/></g>
      <g transform="translate(330 92)" filter="url(#shadow)"><path d="M27 50h60l-7 54H34z" fill="#d9e8ff" stroke="#fff" strokeWidth="3"/><path d="M55 58v39" stroke="#97a7d8" strokeWidth="2" opacity=".5"/><path d="M55 56C27 39 23 20 31 7c18 7 29 23 24 49Z" fill="#40b985"/><path d="M58 56C77 34 92 29 101 35c-5 19-20 28-43 21Z" fill="#63c991"/><path d="M54 55C49 24 57 6 70 1c10 17 5 37-16 54Z" fill="#2fa674"/></g>
    </svg>
  );
}

export default function DepartmentWorkspaceV2({ currentUser }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [taskFilter, setTaskFilter] = useState('Tất cả');
  const [tasks, setTasks] = useStoredState('bes-department-v2-tasks', DEFAULT_TASKS);
  const [notifications, setNotifications] = useStoredState('bes-department-v2-notifications', DEFAULT_NOTIFICATIONS);
  const [meetingChecks, setMeetingChecks] = useStoredState('bes-department-v2-meeting-checks', [false, false, false]);
  const [showComposer, setShowComposer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);
  const [toast, setToast] = useState('');
  const [draft, setDraft] = useState({ title: '', assignee: 'Toàn tổ', due: '2025-05-30' });

  const userName = currentUser?.name || currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Nguyễn Anh Tuấn';
  const roleLabel = ['ttcm', 'department_leader', 'head', 'admin'].includes(String(currentUser?.role || '').toLowerCase()) ? 'TTCM' : 'Giáo viên';
  const unread = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    document.documentElement.classList.add('dw2-lock-scroll');
    document.body.classList.add('dw2-lock-scroll');
    return () => {
      document.documentElement.classList.remove('dw2-lock-scroll');
      document.body.classList.remove('dw2-lock-scroll');
    };
  }, []);

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'Tất cả') return tasks;
    if (taskFilter === 'Hoàn thành') return tasks.filter((task) => ['Hoàn thành', 'Đã hoàn thành', 'Đã nộp'].includes(task.status));
    return tasks.filter((task) => task.status === taskFilter);
  }, [tasks, taskFilter]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const addTask = (event) => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    setTasks((items) => [{ id: Date.now(), title, assignee: draft.assignee, initials: draft.assignee === 'Toàn tổ' ? 'TT' : draft.assignee.split(' ').slice(-2).map((part) => part[0]).join(''), due: draft.due.split('-').reverse().join('/'), status: 'Chưa bắt đầu', progress: 0, tone: 'purple' }, ...items]);
    setDraft({ title: '', assignee: 'Toàn tổ', due: '2025-05-30' });
    setShowComposer(false);
    setToast('Đã tạo nhiệm vụ mới trong bản thử nghiệm.');
  };

  const markAllRead = () => setNotifications((items) => items.map((item) => ({ ...item, read: true })));

  const exportReport = (format) => {
    const title = 'Báo cáo hoạt động Tổ chuyên môn';
    const rows = REPORTS.map(([name, date]) => `<li><strong>${name}</strong> – cập nhật ${date}</li>`).join('');
    const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><title>${title}</title><body style="font-family:Arial,sans-serif;padding:40px"><h1>${title}</h1><p>Người xuất: ${userName}</p><ul>${rows}</ul></body></html>`;
    if (format === 'pdf') {
      window.print();
      setToast('Đã mở hộp thoại in để lưu PDF.');
      return;
    }
    if (format === 'word') downloadFile('bao-cao-to-chuyen-mon.doc', html, 'application/msword');
    if (format === 'html') downloadFile('bao-cao-to-chuyen-mon.html', html, 'text/html;charset=utf-8');
    setToast(`Đã xuất bản ${format.toUpperCase()}.`);
  };

  const overview = (
    <div className="dw2-overview">
      <div className="dw2-summary-row">
        <Panel className="dw2-hero">
          <div className="dw2-hero-copy">
            <h1>Tổng quan tổ chuyên môn</h1>
            <p>Cập nhật bức tranh tổng thể về hoạt động và hiệu quả của tổ chuyên môn.</p>
            <button type="button" onClick={() => setActiveTab('plans')}>Xem kế hoạch tháng 5 <Icon name="arrow" size={17}/></button>
          </div>
          <HeroIllustration/>
        </Panel>
        {[
          ['Công việc đang thực hiện', '12', 'task', 'purple', '20%'],
          ['Công việc hoàn thành', '28', 'check', 'green', '25%'],
          ['Buổi sinh hoạt đã tổ chức', '4', 'users', 'orange', '0%'],
          ['Minh chứng đã cập nhật', '56', 'layers', 'blue', '15%'],
        ].map(([label, value, icon, tone, delta]) => (
          <article key={label} className="dw2-kpi">
            <span className={`dw2-icon-box ${tone}`}><Icon name={icon}/></span>
            <p>{label}</p><strong>{value}</strong>
            <small className={delta === '0%' ? 'neutral' : ''}>{delta === '0%' ? '＝ so với tháng trước' : `↑ ${delta} so với tháng trước`}</small>
          </article>
        ))}
      </div>

      <div className="dw2-dashboard-row">
        <Panel className="dw2-task-panel">
          <SectionHeader title="Bảng giao việc" action="Xem tất cả" onAction={() => setActiveTab('tasks')}/>
          <div className="dw2-filter-tabs">
            {['Tất cả', 'Chưa bắt đầu', 'Đang thực hiện', 'Quá hạn', 'Hoàn thành'].map((filter) => (
              <button key={filter} className={taskFilter === filter ? 'active' : ''} onClick={() => setTaskFilter(filter)}>{filter}<span>{filter === 'Tất cả' ? tasks.length : tasks.filter((task) => filter === 'Hoàn thành' ? ['Hoàn thành', 'Đã hoàn thành', 'Đã nộp'].includes(task.status) : task.status === filter).length}</span></button>
            ))}
          </div>
          <div className="dw2-task-list">
            {filteredTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task}/>) }
          </div>
        </Panel>

        <Panel className="dw2-meeting-panel">
          <div className="dw2-section-head"><h2>Ghi chú phiên họp tổ</h2><span className="dw2-date-chip">09/05/2025 · SH tổ định kỳ</span></div>
          <h3>Nội dung chính</h3>
          <p>Thống nhất phương án kiểm tra cuối kỳ II. Đẩy mạnh ứng dụng AI trong dạy học. Phân công giáo viên thực hiện chuyên đề STEM.</p>
          <h3>Việc cần làm <small>(trích xuất tự động)</small></h3>
          <div className="dw2-checklist">
            {[
              ['Hoàn thiện ma trận đề kiểm tra cuối kỳ II', 'Cô Mai', '16/05'],
              ['Chuẩn bị minh chứng chuyên đề STEM', 'Thầy Nam', '20/05'],
              ['Tổng hợp tài liệu ứng dụng AI trong dạy học', 'Cô Hương', '18/05'],
            ].map((item, index) => (
              <label key={item[0]}><input type="checkbox" checked={meetingChecks[index]} onChange={() => setMeetingChecks((values) => values.map((value, idx) => idx === index ? !value : value))}/><span>{item[0]}</span><em>{item[1]}</em><time>{item[2]}</time></label>
            ))}
          </div>
          <button className="dw2-link-btn" onClick={() => setActiveTab('meetings')}>Xem toàn bộ biên bản cuộc họp <Icon name="arrow" size={15}/></button>
        </Panel>

        <Panel className="dw2-report-panel">
          <SectionHeader title="Báo cáo" action="Xem tất cả" onAction={() => setActiveTab('reports')}/>
          <div className="dw2-report-list">
            {REPORTS.map(([title, date]) => <button key={title} type="button"><span className="dw2-icon-box blue"><Icon name="report" size={18}/></span><span><strong>{title}</strong><small>Cập nhật: {date}</small></span></button>)}
          </div>
          <div className="dw2-export-row"><button onClick={() => exportReport('word')}>▣ Word</button><button onClick={() => exportReport('pdf')}>▣ PDF</button><button onClick={() => exportReport('html')}>&lt;&gt; HTML</button></div>
        </Panel>
      </div>

      <Panel className="dw2-profile-panel">
        <div className="dw2-profile-card">
          <span className="dw2-profile-avatar">NM</span>
          <div><h2>Nguyễn Thị Mai</h2><span className="dw2-role-chip">Giáo viên</span><dl><div><dt>Tổ</dt><dd>Tiếng Anh</dd></div><div><dt>Trình độ</dt><dd>Thạc sĩ</dd></div><div><dt>Thâm niên</dt><dd>8 năm</dd></div></dl></div>
        </div>
        <div className="dw2-history">
          <h2>Lịch sử phê duyệt</h2>
          {[
            ['Kế hoạch bài dạy Unit 8 – Lớp 6A1', 'Phê duyệt bởi TTCM · 06/05/2025 14:30', 'check', 'green'],
            ['Sáng kiến kinh nghiệm: Ứng dụng AI...', 'Đang chờ phê duyệt · 05/05/2025 09:10', 'calendar', 'orange'],
            ['Minh chứng thao giảng – 15/04/2025', 'Phê duyệt bởi TTCM · 16/04/2025 16:45', 'check', 'green'],
          ].map(([title, detail, icon, tone]) => <button key={title}><span className={`dw2-icon-box ${tone}`}><Icon name={icon} size={17}/></span><span><strong>{title}</strong><small>{detail}</small></span><em>Xem</em></button>)}
        </div>
        <div className="dw2-featured-evidence"><h2>Minh chứng nổi bật</h2><div>{EVIDENCE.map((item) => <EvidenceCard key={item.title} item={item}/>)}</div></div>
      </Panel>
    </div>
  );

  const pageContent = {
    overview,
    calendar: <CalendarView/>,
    tasks: <TasksView tasks={tasks} filters={['Tất cả', 'Chưa bắt đầu', 'Đang thực hiện', 'Đã nộp', 'Quá hạn']} active={taskFilter} setActive={setTaskFilter} onCreate={() => setShowComposer(true)}/>,
    plans: <PlansView/>,
    records: <RecordsView/>,
    meetings: <MeetingsView checks={meetingChecks} setChecks={setMeetingChecks}/>,
    evidence: <EvidenceView/>,
    reports: <ReportsView onExport={exportReport}/>,
  }[activeTab];

  const portal = (
    <div className="dw2-portal">
      <div className="dw2-app-frame">
        <header className="dw2-app-header">
          <button className="dw2-brand" type="button" onClick={() => setActiveTab('overview')}><BrianLogo/><span className="dw2-brand-divider"/><strong>Tổ chuyên môn</strong></button>
          <nav className="dw2-nav" aria-label="Điều hướng Tổ chuyên môn">
            {TABS.map(([id, label, icon]) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><Icon name={icon} size={18}/><span>{label}</span></button>)}
          </nav>
          <div className="dw2-header-actions">
            <label className="dw2-search"><Icon name="search" size={18}/><input aria-label="Tìm kiếm" placeholder="Tìm kiếm nhanh..."/></label>
            <button className="dw2-bell" onClick={() => setShowNotifications((value) => !value)} aria-label="Thông báo"><Icon name="bell" size={19}/>{unread ? <span>{unread}</span> : null}</button>
            <span className="dw2-mini-avatar">{userName.slice(0, 1).toUpperCase()}</span>
            <button className="dw2-role-menu">{roleLabel}<Icon name="chevron" size={15}/></button>
          </div>
        </header>

        <main className={`dw2-workspace ${showNotifications ? 'with-notifications' : ''}`}>
          <div className="dw2-content">{pageContent}</div>
          {showNotifications ? <NotificationDrawer notifications={notifications} setNotifications={setNotifications} unread={unread} onClose={() => setShowNotifications(false)} onMarkAll={markAllRead}/> : null}
        </main>
      </div>
      {showComposer ? <TaskComposer draft={draft} setDraft={setDraft} onClose={() => setShowComposer(false)} onSubmit={addTask}/> : null}
      {toast ? <div className="dw2-toast">{toast}</div> : null}
    </div>
  );

  return createPortal(portal, document.body);
}

function TaskRow({ task }) {
  return <article className="dw2-task-row"><span className={`dw2-avatar ${task.tone}`}>{task.initials}</span><div className="dw2-task-title"><strong>{task.title}</strong><small>{task.assignee}</small></div><span className={`dw2-status ${statusKey(task.status)}`}>{task.status}</span><div className="dw2-due"><small>Hạn hoàn thành</small><strong>{task.due}</strong></div><div className="dw2-progress"><strong>{task.progress}%</strong><span><i style={{ width: `${task.progress}%` }}/></span></div><button className="dw2-menu" aria-label="Thêm tùy chọn"><Icon name="menu"/></button></article>;
}

function EvidencePreview({ kind, type }) {
  return <div className={`dw2-evidence-preview ${kind}`}><span>{type}</span>{kind === 'video' ? <i className="dw2-play">▶</i> : null}<b/><b/><b/></div>;
}

function EvidenceCard({ item }) {
  return <button className={`dw2-evidence ${item.tone}`}><EvidencePreview kind={item.kind} type={item.type}/><strong>{item.title}</strong><small>{item.meta}</small></button>;
}

function NotificationDrawer({ notifications, setNotifications, unread, onClose, onMarkAll }) {
  return <aside className="dw2-notifications"><div className="dw2-notify-head"><div><h2>Thông báo</h2></div><button onClick={onMarkAll}>Đánh dấu đã đọc</button><button className="dw2-close" onClick={onClose} aria-label="Đóng"><Icon name="close" size={18}/></button></div><div className="dw2-notify-list">{notifications.map((item) => <button key={item.id} className={item.read ? 'read' : ''} onClick={() => setNotifications((items) => items.map((note) => note.id === item.id ? { ...note, read: true } : note))}><span className={`dw2-icon-box ${item.tone}`}><Icon name={item.icon}/></span><span><strong>{item.title}</strong><small>{item.detail}</small><time>{item.time}</time></span>{!item.read ? <i/> : null}</button>)}</div><button className="dw2-all-notifications">Xem tất cả thông báo <Icon name="arrow" size={16}/></button></aside>;
}

function TaskComposer({ draft, setDraft, onClose, onSubmit }) {
  return <div className="dw2-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="dw2-modal" onSubmit={onSubmit}><div className="dw2-modal-head"><div><span className="dw2-eyebrow">GIAO VIỆC</span><h2>Tạo nhiệm vụ mới</h2></div><button type="button" onClick={onClose}><Icon name="close"/></button></div><label>Tên nhiệm vụ<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Nhập nội dung công việc..."/></label><label>Người nhận<select value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })}><option>Toàn tổ</option><option>Nguyễn Thị Mai</option><option>Trần Minh Đức</option><option>Phạm Thu Hà</option></select></label><label>Hạn hoàn thành<input type="date" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })}/></label><div className="dw2-modal-actions"><button type="button" onClick={onClose}>Hủy</button><button type="submit"><Icon name="plus" size={17}/> Tạo nhiệm vụ</button></div></form></div>;
}

function PageHeading({ eyebrow, title, description, action, icon = 'plus' }) {
  return <div className="dw2-page-heading"><div><span className="dw2-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action ? <button><Icon name={icon}/>{action}</button> : null}</div>;
}

function CalendarView() {
  return <div className="dw2-page-view"><PageHeading eyebrow="LỊCH CÔNG TÁC" title="Lịch và thời hạn sắp tới" description="Theo dõi cuộc họp, dự giờ, sinh hoạt chuyên đề và các mốc nộp hồ sơ." action="Thêm lịch"/><div className="dw2-calendar-layout"><Panel className="dw2-month-card"><div className="dw2-month-head"><button>‹</button><h2>Tháng 5, 2025</h2><button>›</button></div><div className="dw2-month-grid">{['T2','T3','T4','T5','T6','T7','CN'].map((day) => <b key={day}>{day}</b>)}{Array.from({length:35},(_,index) => index - 2).map((day,index) => <span key={index} className={day === 16 ? 'selected' : day < 1 || day > 31 ? 'muted' : ''}>{day < 1 ? 28 + day : day > 31 ? day - 31 : day}</span>)}</div></Panel><Panel><SectionHeader title="Lịch 14 ngày tới" action="Đồng bộ lịch"/>{EVENTS.map((event) => <article className="dw2-event" key={event.title}><span className={`dw2-event-date ${event.tone}`}><strong>{event.date}</strong><small>{event.month}</small></span><div><strong>{event.title}</strong><small>{event.time} · {event.place}</small></div><button>Chi tiết</button></article>)}</Panel></div></div>;
}

function TasksView({ tasks, filters, active, setActive, onCreate }) {
  const shown = active === 'Tất cả' ? tasks : tasks.filter((task) => task.status === active);
  return <div className="dw2-page-view"><PageHeading eyebrow="PHÂN CÔNG" title="Bảng giao việc" description="Giao nhiệm vụ, theo dõi tiến độ và kiểm soát thời hạn theo từng giáo viên." action="Tạo nhiệm vụ"/><Panel><div className="dw2-filter-tabs large">{filters.map((filter) => <button key={filter} className={active === filter ? 'active' : ''} onClick={() => setActive(filter)}>{filter}<span>{filter === 'Tất cả' ? tasks.length : tasks.filter((task) => task.status === filter).length}</span></button>)}</div><div className="dw2-task-list full">{shown.map((task) => <TaskRow key={task.id} task={task}/>)}</div><button className="dw2-primary-action" onClick={onCreate}><Icon name="plus"/> Tạo nhiệm vụ mới</button></Panel></div>;
}

function PlansView() {
  return <div className="dw2-page-view"><PageHeading eyebrow="KẾ HOẠCH" title="Tiến độ kế hoạch tổ chuyên môn" description="Quản lý kế hoạch năm học, học kỳ, tháng, tuần và chuyên đề." action="Tạo kế hoạch"/><div className="dw2-plan-summary"><Panel><strong>68%</strong><span>Tiến độ năm học</span><small>17/25 đầu việc đã hoàn thành</small></Panel><Panel><strong>92%</strong><span>Đúng hạn</span><small>Tăng 4% so với tháng trước</small></Panel><Panel><strong>6%</strong><span>Quá hạn</span><small>2 đầu việc cần xử lý</small></Panel></div><Panel><SectionHeader title="Các nhóm kế hoạch" action="Năm học 2024 – 2025"/><div className="dw2-plan-list">{PLAN_ITEMS.map((item) => <article key={item.title}><span className={`dw2-icon-box ${item.tone}`}><Icon name="plan"/></span><div><strong>{item.title}</strong><span><i className={item.tone} style={{ width: `${item.value}%` }}/></span></div><b>{item.value}%</b><small>{item.count}</small></article>)}</div></Panel></div>;
}

function RecordsView() {
  return <div className="dw2-page-view"><PageHeading eyebrow="HỒ SƠ" title="Quy trình duyệt hồ sơ" description="Kiểm tra, nhận xét, yêu cầu chỉnh sửa và lưu kho hồ sơ chuyên môn." action="Mở thư viện hồ sơ" icon="folder"/><div className="dw2-pipeline">{[['Đã giao','32','purple'],['Đã nộp','18','blue'],['Cần chỉnh sửa','5','orange'],['Đã duyệt','24','green']].map(([label,value,tone],index) => <React.Fragment key={label}><Panel><span className={`dw2-icon-box ${tone}`}><Icon name={index === 3 ? 'check' : 'folder'}/></span><strong>{value}</strong><h2>{label}</h2><small>Hồ sơ</small></Panel>{index < 3 ? <span>→</span> : null}</React.Fragment>)}</div><Panel><SectionHeader title="Hồ sơ cần xử lý" action="Lọc hồ sơ"/>{DEFAULT_TASKS.slice(0,4).map((task,index) => <article className="dw2-record-row" key={task.id}><span className={`dw2-avatar ${task.tone}`}>{task.initials}</span><div><strong>{index % 2 ? 'Minh chứng sinh hoạt chuyên đề' : 'Kế hoạch bài dạy tuần 33'}</strong><small>{task.assignee} · Nộp ngày {task.due}</small></div><span className={`dw2-status ${index === 2 ? 'can-chinh-sua' : 'da-nop'}`}>{index === 2 ? 'Cần chỉnh sửa' : 'Chờ duyệt'}</span><button>Xem hồ sơ</button></article>)}</Panel></div>;
}

function MeetingsView({ checks, setChecks }) {
  return <div className="dw2-page-view"><PageHeading eyebrow="SINH HOẠT TỔ" title="Phiên họp và chuyên đề" description="Lưu biên bản, tài liệu, thành phần tham dự và công việc phát sinh sau họp." action="Tạo phiên họp"/><div className="dw2-meeting-layout"><Panel><SectionHeader title="Phiên họp gần nhất" action="09/05/2025"/><h3>Đánh giá hoạt động tháng 5 và triển khai kiểm tra cuối kỳ II</h3><p>Thống nhất ma trận đề, phân công giáo viên hoàn thiện chuyên đề và chuẩn bị minh chứng.</p><div className="dw2-checklist expanded">{['Hoàn thiện ma trận đề kiểm tra cuối kỳ II','Chuẩn bị minh chứng chuyên đề STEM','Tổng hợp tài liệu ứng dụng AI trong dạy học'].map((label,index) => <label key={label}><input type="checkbox" checked={checks[index]} onChange={() => setChecks((values) => values.map((value,idx) => idx === index ? !value : value))}/><span>{label}</span><em>{['Cô Mai','Thầy Nam','Cô Hương'][index]}</em><time>{['16/05','20/05','18/05'][index]}</time></label>)}</div></Panel><Panel><SectionHeader title="Các phiên sắp tới" action="Xem lịch"/>{EVENTS.slice(0,3).map((event) => <article className="dw2-event" key={event.title}><span className={`dw2-event-date ${event.tone}`}><strong>{event.date}</strong><small>{event.month}</small></span><div><strong>{event.title}</strong><small>{event.time} · {event.place}</small></div><button>Mở</button></article>)}</Panel></div></div>;
}

function EvidenceView() {
  return <div className="dw2-page-view"><PageHeading eyebrow="MINH CHỨNG" title="Thư viện minh chứng" description="Phân loại theo năm học, học kỳ, giáo viên, hoạt động và trạng thái duyệt." action="Tải minh chứng" icon="download"/><div className="dw2-evidence-categories">{[['Năm học','2024 – 2025','56'],['Học kỳ','Học kỳ II','38'],['Giáo viên','05 người','92'],['Loại hồ sơ','08 loại','74'],['Chuyên đề','06 chuyên đề','21'],['Chờ duyệt','Cần xử lý','5']].map(([title,detail,value],index) => <Panel key={title}><span className={`dw2-icon-box ${['purple','blue','green','orange','cyan','red'][index]}`}><Icon name="layers"/></span><strong>{value}</strong><h2>{title}</h2><small>{detail}</small></Panel>)}</div><Panel><SectionHeader title="Minh chứng mới nhất" action="Bộ lọc"/><div className="dw2-evidence-grid">{EVIDENCE.concat(EVIDENCE).map((item,index) => <EvidenceCard key={`${item.title}-${index}`} item={item}/>)}</div></Panel></div>;
}

function ReportsView({ onExport }) {
  return <div className="dw2-page-view"><PageHeading eyebrow="BÁO CÁO" title="Báo cáo và chỉ số vận hành" description="Theo dõi tiến độ, tỷ lệ đúng hạn, hồ sơ và tải việc theo giáo viên." action="Tạo báo cáo" icon="report"/><div className="dw2-report-cards">{[['92%','Công việc đúng hạn','green'],['5','Hồ sơ chờ duyệt','orange'],['1,8 ngày','Thời gian duyệt TB','blue'],['68%','Kế hoạch năm học','purple']].map(([value,label,tone]) => <Panel key={label}><span className={`dw2-icon-box ${tone}`}><Icon name="chart"/></span><strong>{value}</strong><h2>{label}</h2></Panel>)}</div><Panel><SectionHeader title="Báo cáo gần đây" action="Tháng 5/2025"/>{REPORTS.map(([title,date]) => <article className="dw2-report-row" key={title}><span className="dw2-icon-box blue"><Icon name="report"/></span><div><strong>{title}</strong><small>Cập nhật {date} · Sẵn sàng xuất file</small></div><button onClick={() => onExport('html')}><Icon name="download" size={15}/> Xuất</button></article>)}<div className="dw2-export-row large"><button onClick={() => onExport('word')}>▣ Word</button><button onClick={() => onExport('pdf')}>▣ PDF</button><button onClick={() => onExport('html')}>&lt;&gt; HTML</button></div></Panel></div>;
}
