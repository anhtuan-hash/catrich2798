import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import TasksWorkspace from './TasksWorkspace.jsx';
import RecordsWorkspace from './RecordsWorkspace.jsx';
import PlansWorkspace from './PlansWorkspace.jsx';
import CalendarWorkspace, { createDefaultCalendarEvents } from './CalendarWorkspace.jsx';
import MeetingsWorkspace, { createDefaultMeetings } from './MeetingsWorkspace.jsx';
import EvidenceWorkspace, { createDefaultEvidence } from './EvidenceWorkspace.jsx';
import ReportsWorkspace from './ReportsWorkspace.jsx';
import GlobalNotificationDrawer, { readGlobalNotifications } from './GlobalNotificationDrawer.jsx';
import {
  collectionFromContext,
  createLocalDepartmentContext,
  initializeDepartmentCloud,
  scheduleDepartmentCollectionSave,
  shouldBlockReadOnlyMutation,
} from './department-cloud.js';
import './styles.css';
import './laptop-scale.css';
import './macbook-readable.css';
import './notification-toggle.css';
import './task-workspace-bridge.css';
import './shell-fixes.css';
import './department-cloud.css';

const TASK_STORAGE_KEY = 'department-v2-tasks';
const RECORD_STORAGE_KEY = 'department-v2-records';
const PLAN_STORAGE_KEY = 'department-v2-plans';
const CALENDAR_STORAGE_KEY = 'department-v2-calendar-events';
const MEETING_STORAGE_KEY = 'department-v2-meetings';
const EVIDENCE_STORAGE_KEY = 'department-v2-evidence';
const NOTIFICATION_STORAGE_KEY = 'department-v2-notifications';
const REPORT_HISTORY_KEY = 'department-v3-report-history';

const FALLBACK_TASKS = [
  { id: 1, title: 'Xây dựng ma trận đề kiểm tra học kỳ II môn Tiếng Anh 6', assignee: 'Chưa phân công', initials: 'NM', due: '20/05/2025', status: 'Đang thực hiện', progress: 60, tone: 'purple' },
  { id: 2, title: 'Dự giờ đồng nghiệp – Tháng 5', assignee: 'Chưa phân công', initials: 'TĐ', due: '15/05/2025', status: 'Đang thực hiện', progress: 40, tone: 'green' },
  { id: 3, title: 'Biên soạn chuyên đề: Dạy học phát triển năng lực giao tiếp', assignee: 'Chưa phân công', initials: 'PH', due: '25/05/2025', status: 'Chưa bắt đầu', progress: 0, tone: 'orange' },
  { id: 4, title: 'Tổng hợp minh chứng thi đua học kỳ II', assignee: 'Chưa phân công', initials: 'LN', due: '10/05/2025', status: 'Quá hạn', progress: 100, tone: 'red' },
  { id: 5, title: 'Hoàn thiện kế hoạch bồi dưỡng học sinh giỏi', assignee: 'Chưa phân công', initials: 'ĐH', due: '28/05/2025', status: 'Đã nộp', progress: 100, tone: 'blue' },
];

const FALLBACK_RECORDS = [
  { id: 1, title: 'Kế hoạch bài dạy Unit 8 – Lớp 6A1', owner: 'Chưa phân công', status: 'Đã duyệt', date: '06/05/2025', tone: 'green' },
  { id: 2, title: 'Sáng kiến kinh nghiệm: Ứng dụng AI', owner: 'Chưa phân công', status: 'Chờ duyệt', date: '05/05/2025', tone: 'orange' },
  { id: 3, title: 'Minh chứng thao giảng – 15/04/2025', owner: 'Chưa phân công', status: 'Đã duyệt', date: '16/04/2025', tone: 'green' },
  { id: 4, title: 'Báo cáo chuyên đề STEM', owner: 'Chưa phân công', status: 'Cần chỉnh sửa', date: '02/05/2025', tone: 'red' },
];

const FALLBACK_PLANS = [
  { id: 1, title: 'Kế hoạch năm học', progress: 82, status: 'Đang thực hiện', type: 'Năm học', owner: 'Chưa phân công', description: 'Kế hoạch tổng thể hoạt động chuyên môn, bồi dưỡng giáo viên và nâng cao chất lượng học tập.', startISO: '2026-08-01', dueISO: '2027-05-31', milestones: [{ id: 11, label: 'Hoàn thiện chỉ tiêu năm học', done: true }, { id: 12, label: 'Phân công chuyên môn', done: true }, { id: 13, label: 'Rà soát tiến độ học kỳ I', done: false }] },
  { id: 2, title: 'Kế hoạch học kỳ I', progress: 64, status: 'Đang thực hiện', type: 'Học kỳ', owner: 'Chưa phân công', description: 'Kế hoạch triển khai chương trình, kiểm tra đánh giá và sinh hoạt chuyên đề học kỳ I.', startISO: '2026-08-15', dueISO: '2026-12-31', milestones: [{ id: 21, label: 'Thống nhất phân phối chương trình', done: true }, { id: 22, label: 'Xây dựng ma trận kiểm tra', done: false }] },
  { id: 3, title: 'Kế hoạch tháng 8', progress: 35, status: 'Cần cập nhật', type: 'Tháng', owner: 'Chưa phân công', description: 'Chuẩn bị năm học mới, hoàn thiện hồ sơ tổ và tổ chức chuyên đề đầu năm.', startISO: '2026-08-01', dueISO: '2026-08-31', milestones: [{ id: 31, label: 'Họp tổ đầu năm', done: true }, { id: 32, label: 'Hoàn thiện hồ sơ chuyên môn', done: false }] },
  { id: 4, title: 'Kế hoạch chuyên đề ứng dụng AI', progress: 90, status: 'Gần hoàn thành', type: 'Chuyên đề', owner: 'Chưa phân công', description: 'Tổ chức chuỗi hoạt động ứng dụng AI an toàn và hiệu quả trong dạy học tiếng Anh.', startISO: '2026-07-15', dueISO: '2026-09-15', milestones: [{ id: 41, label: 'Xây dựng nội dung chuyên đề', done: true }, { id: 42, label: 'Chuẩn bị minh chứng', done: true }, { id: 43, label: 'Tổ chức báo cáo', done: false }] },
];

function relativeDate(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeLegacyDates(items) {
  return items.map((task, index) => {
    if (task.dueISO) return task;
    const completed = ['Hoàn thành', 'Đã nộp'].includes(task.status);
    const overdue = task.status === 'Quá hạn';
    const dueOffset = overdue ? -2 : completed ? -4 : 3 + index * 3;
    return { ...task, startISO: relativeDate(completed ? -12 : -3), dueISO: relativeDate(dueOffset), legacyDue: task.due };
  });
}

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local cache is best effort */ }
}

function readEvidence() {
  const stored = readStored(EVIDENCE_STORAGE_KEY, null);
  return Array.isArray(stored) && stored.every((item) => item && item.status && item.criterion && item.owner && Array.isArray(item.attachments))
    ? stored
    : createDefaultEvidence();
}

function DepartmentRoot() {
  const [workspaceMode, setWorkspaceMode] = useState(null);
  const [tasks, setTasks] = useState(() => normalizeLegacyDates(readStored(TASK_STORAGE_KEY, FALLBACK_TASKS)));
  const [records, setRecords] = useState(() => readStored(RECORD_STORAGE_KEY, FALLBACK_RECORDS));
  const [plans, setPlans] = useState(() => readStored(PLAN_STORAGE_KEY, FALLBACK_PLANS));
  const [events, setEvents] = useState(() => readStored(CALENDAR_STORAGE_KEY, createDefaultCalendarEvents()));
  const [meetings, setMeetings] = useState(() => readStored(MEETING_STORAGE_KEY, createDefaultMeetings()));
  const [evidence, setEvidence] = useState(() => readEvidence());
  const [reportHistory, setReportHistory] = useState(() => readStored(REPORT_HISTORY_KEY, []));
  const [notifications, setNotifications] = useState(() => readGlobalNotifications());
  const [globalDrawerOpen, setGlobalDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [cloudContext, setCloudContext] = useState(() => createLocalDepartmentContext());
  const [appRevision, setAppRevision] = useState(0);
  const cloudHydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    initializeDepartmentCloud().then((context) => {
      if (cancelled) return;
      setCloudContext(context);

      if (context.mode === 'cloud') {
        const nextTasks = normalizeLegacyDates(collectionFromContext(context, 'tasks', tasks));
        const nextRecords = collectionFromContext(context, 'records', records);
        const nextPlans = collectionFromContext(context, 'plans', plans);
        const nextEvents = collectionFromContext(context, 'calendar', events);
        const nextMeetings = collectionFromContext(context, 'meetings', meetings);
        const nextEvidence = collectionFromContext(context, 'evidence', evidence);
        const nextReports = collectionFromContext(context, 'reportHistory', reportHistory);
        const nextNotifications = collectionFromContext(context, 'notifications', notifications);

        setTasks(nextTasks);
        setRecords(nextRecords);
        setPlans(nextPlans);
        setEvents(nextEvents);
        setMeetings(nextMeetings);
        setEvidence(nextEvidence);
        setReportHistory(nextReports);
        setNotifications(nextNotifications);

        writeStored(TASK_STORAGE_KEY, nextTasks);
        writeStored(RECORD_STORAGE_KEY, nextRecords);
        writeStored(PLAN_STORAGE_KEY, nextPlans);
        writeStored(CALENDAR_STORAGE_KEY, nextEvents);
        writeStored(MEETING_STORAGE_KEY, nextMeetings);
        writeStored(EVIDENCE_STORAGE_KEY, nextEvidence);
        writeStored(REPORT_HISTORY_KEY, nextReports);
        writeStored(NOTIFICATION_STORAGE_KEY, nextNotifications);
        setAppRevision((value) => value + 1);
      }

      cloudHydrated.current = true;
      if (context.mode === 'offline' || context.mode === 'forbidden' || context.mode === 'signed_out') setToast(context.message);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleCloudError = (event) => setToast(`Không thể đồng bộ ${event.detail?.entityType || 'dữ liệu'} lên Supabase.`);
    window.addEventListener('department-cloud-error', handleCloudError);
    return () => window.removeEventListener('department-cloud-error', handleCloudError);
  }, []);

  useEffect(() => {
    if (cloudContext.mode === 'local' || cloudContext.canManage) return undefined;
    const blockMutation = (event) => {
      if (!shouldBlockReadOnlyMutation(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      setToast('Vai trò Giáo viên hiện chỉ được xem, tìm kiếm và mở chi tiết dữ liệu.');
    };
    document.addEventListener('click', blockMutation, true);
    document.addEventListener('change', blockMutation, true);
    return () => {
      document.removeEventListener('click', blockMutation, true);
      document.removeEventListener('change', blockMutation, true);
    };
  }, [cloudContext.mode, cloudContext.canManage]);

  useEffect(() => {
    const nextTab = sessionStorage.getItem('department-next-tab');
    if (!nextTab) return undefined;
    sessionStorage.removeItem('department-next-tab');
    const timer = window.setTimeout(() => document.querySelector(`[data-testid="tab-${nextTab}"]`)?.click(), 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleNavigation = (event) => {
      const button = event.target.closest?.('[data-testid^="tab-"]');
      if (!button) return;
      const tab = button.getAttribute('data-testid')?.replace('tab-', '');
      if (tab === 'overview') { setWorkspaceMode(null); return; }
      if (tab === 'tasks') { window.setTimeout(() => { setTasks(normalizeLegacyDates(readStored(TASK_STORAGE_KEY, FALLBACK_TASKS))); setWorkspaceMode('tasks'); }, 0); return; }
      if (tab === 'records') { window.setTimeout(() => { setRecords(readStored(RECORD_STORAGE_KEY, FALLBACK_RECORDS)); setWorkspaceMode('records'); }, 0); return; }
      if (tab === 'plans') { window.setTimeout(() => { setPlans(readStored(PLAN_STORAGE_KEY, FALLBACK_PLANS)); setWorkspaceMode('plans'); }, 0); return; }
      if (tab === 'calendar') { window.setTimeout(() => { setEvents(readStored(CALENDAR_STORAGE_KEY, createDefaultCalendarEvents())); setWorkspaceMode('calendar'); }, 0); return; }
      if (tab === 'meetings') { window.setTimeout(() => { setMeetings(readStored(MEETING_STORAGE_KEY, createDefaultMeetings())); setTasks(normalizeLegacyDates(readStored(TASK_STORAGE_KEY, FALLBACK_TASKS))); setWorkspaceMode('meetings'); }, 0); return; }
      if (tab === 'evidence') { window.setTimeout(() => { setEvidence(readEvidence()); setWorkspaceMode('evidence'); }, 0); return; }
      if (tab === 'reports') {
        window.setTimeout(() => {
          setTasks(normalizeLegacyDates(readStored(TASK_STORAGE_KEY, FALLBACK_TASKS)));
          setRecords(readStored(RECORD_STORAGE_KEY, FALLBACK_RECORDS));
          setPlans(readStored(PLAN_STORAGE_KEY, FALLBACK_PLANS));
          setMeetings(readStored(MEETING_STORAGE_KEY, createDefaultMeetings()));
          setEvidence(readEvidence());
          setReportHistory(readStored(REPORT_HISTORY_KEY, []));
          setWorkspaceMode('reports');
        }, 0);
      }
    };
    document.addEventListener('click', handleNavigation, true);
    return () => document.removeEventListener('click', handleNavigation, true);
  }, []);

  useEffect(() => {
    const handleBell = (event) => {
      const button = event.target.closest?.('.bell-button');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      setGlobalDrawerOpen((open) => !open);
    };
    document.addEventListener('click', handleBell, true);
    return () => document.removeEventListener('click', handleBell, true);
  }, []);

  useEffect(() => {
    document.querySelectorAll('.bell-button').forEach((button) => button.setAttribute('aria-label', globalDrawerOpen ? 'Đóng thông báo' : 'Mở thông báo'));
  }, [globalDrawerOpen, workspaceMode]);

  useEffect(() => {
    writeStored(TASK_STORAGE_KEY, tasks);
    if (cloudHydrated.current) scheduleDepartmentCollectionSave(cloudContext, 'tasks', tasks);
  }, [tasks, cloudContext]);
  useEffect(() => {
    writeStored(RECORD_STORAGE_KEY, records);
    if (cloudHydrated.current) scheduleDepartmentCollectionSave(cloudContext, 'records', records);
  }, [records, cloudContext]);
  useEffect(() => {
    writeStored(PLAN_STORAGE_KEY, plans);
    if (cloudHydrated.current) scheduleDepartmentCollectionSave(cloudContext, 'plans', plans);
  }, [plans, cloudContext]);
  useEffect(() => {
    writeStored(CALENDAR_STORAGE_KEY, events);
    if (cloudHydrated.current) scheduleDepartmentCollectionSave(cloudContext, 'calendar', events);
  }, [events, cloudContext]);
  useEffect(() => {
    writeStored(MEETING_STORAGE_KEY, meetings);
    if (cloudHydrated.current) scheduleDepartmentCollectionSave(cloudContext, 'meetings', meetings);
  }, [meetings, cloudContext]);
  useEffect(() => {
    writeStored(EVIDENCE_STORAGE_KEY, evidence);
    if (cloudHydrated.current) scheduleDepartmentCollectionSave(cloudContext, 'evidence', evidence);
  }, [evidence, cloudContext]);
  useEffect(() => {
    writeStored(REPORT_HISTORY_KEY, reportHistory);
    if (cloudHydrated.current) scheduleDepartmentCollectionSave(cloudContext, 'reportHistory', reportHistory);
  }, [reportHistory, cloudContext]);
  useEffect(() => {
    writeStored(NOTIFICATION_STORAGE_KEY, notifications);
    if (cloudHydrated.current) scheduleDepartmentCollectionSave(cloudContext, 'notifications', notifications);
  }, [notifications, cloudContext]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateTask = (id, patch) => setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deleteTask = (id) => { setTasks((items) => items.filter((item) => item.id !== id)); setToast('Đã xóa nhiệm vụ.'); };
  const updateRecord = (id, patch) => setRecords((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deleteRecord = (id) => { setRecords((items) => items.filter((item) => item.id !== id)); setToast('Đã xóa hồ sơ.'); };
  const updatePlan = (id, patch) => setPlans((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deletePlan = (id) => { setPlans((items) => items.filter((item) => item.id !== id)); setToast('Đã xóa kế hoạch.'); };
  const updateEvent = (id, patch) => setEvents((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deleteEvent = (id) => { setEvents((items) => items.filter((item) => item.id !== id)); setToast('Đã xóa hoạt động.'); };
  const updateMeeting = (id, patch) => setMeetings((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deleteMeeting = (id) => { setMeetings((items) => items.filter((item) => item.id !== id)); setToast('Đã xóa cuộc họp.'); };
  const updateEvidence = (id, patch) => setEvidence((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deleteEvidence = (id) => { setEvidence((items) => items.filter((item) => item.id !== id)); setToast('Đã xóa minh chứng.'); };

  const modeLabel = cloudContext.mode === 'cloud' ? 'Supabase' : cloudContext.mode === 'local' ? 'Cục bộ' : 'Chỉ xem';

  return <div className={`department-root ${workspaceMode ? 'has-external-workspace' : ''} ${!cloudContext.canManage && cloudContext.mode !== 'local' ? 'is-read-only' : ''}`}>
    <App key={`app-${appRevision}`}/>
    <div className={`department-cloud-pill is-${cloudContext.status}`} title={cloudContext.message} data-testid="department-cloud-status">
      <i/><span><strong>{cloudContext.roleLabel}</strong><small>{modeLabel}</small></span>
    </div>
    {!cloudContext.canManage && cloudContext.mode !== 'local' && <div className="department-readonly-banner" role="status">Chế độ {cloudContext.roleLabel}: chỉ xem, tìm kiếm và mở chi tiết.</div>}
    {workspaceMode === 'tasks' && <section className="task-workspace-bridge" aria-label="Không gian Giao việc hoàn chỉnh"><TasksWorkspace tasks={tasks} setTasks={setTasks} updateTask={updateTask} deleteTask={deleteTask} setToast={setToast}/></section>}
    {workspaceMode === 'records' && <section className="task-workspace-bridge" aria-label="Không gian Hồ sơ hoàn chỉnh"><RecordsWorkspace records={records} setRecords={setRecords} updateRecord={updateRecord} deleteRecord={deleteRecord} setToast={setToast}/></section>}
    {workspaceMode === 'plans' && <section className="task-workspace-bridge" aria-label="Không gian Kế hoạch hoàn chỉnh"><PlansWorkspace plans={plans} setPlans={setPlans} updatePlan={updatePlan} deletePlan={deletePlan} setToast={setToast}/></section>}
    {workspaceMode === 'calendar' && <section className="task-workspace-bridge" aria-label="Không gian Lịch hoàn chỉnh"><CalendarWorkspace events={events} setEvents={setEvents} updateEvent={updateEvent} deleteEvent={deleteEvent} setToast={setToast}/></section>}
    {workspaceMode === 'meetings' && <section className="task-workspace-bridge" aria-label="Không gian Sinh hoạt tổ hoàn chỉnh"><MeetingsWorkspace meetings={meetings} setMeetings={setMeetings} updateMeeting={updateMeeting} deleteMeeting={deleteMeeting} setTasks={setTasks} setToast={setToast}/></section>}
    {workspaceMode === 'evidence' && <section className="task-workspace-bridge" aria-label="Không gian Minh chứng hoàn chỉnh"><EvidenceWorkspace evidence={evidence} setEvidence={setEvidence} updateEvidence={updateEvidence} deleteEvidence={deleteEvidence} setToast={setToast}/></section>}
    {workspaceMode === 'reports' && <section className="task-workspace-bridge" aria-label="Không gian Báo cáo hoàn chỉnh"><ReportsWorkspace tasks={tasks} records={records} plans={plans} meetings={meetings} evidence={evidence} reportHistory={reportHistory} setReportHistory={setReportHistory} setToast={setToast}/></section>}
    <GlobalNotificationDrawer open={globalDrawerOpen} notifications={notifications} setNotifications={setNotifications} onClose={() => setGlobalDrawerOpen(false)} setToast={setToast}/>
    {toast && <div className="bridge-toast" role="status">{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><DepartmentRoot/></React.StrictMode>);
