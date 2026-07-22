import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import TasksWorkspace from './TasksWorkspace.jsx';
import RecordsWorkspace from './RecordsWorkspace.jsx';
import './styles.css';
import './laptop-scale.css';
import './macbook-readable.css';
import './notification-toggle.css';
import './task-workspace-bridge.css';

const TASK_STORAGE_KEY = 'department-v2-tasks';
const RECORD_STORAGE_KEY = 'department-v2-records';

const FALLBACK_TASKS = [
  { id: 1, title: 'Xây dựng ma trận đề kiểm tra học kỳ II môn Tiếng Anh 6', assignee: 'Nguyễn Thị Mai', initials: 'NM', due: '20/05/2025', status: 'Đang thực hiện', progress: 60, tone: 'purple' },
  { id: 2, title: 'Dự giờ đồng nghiệp – Tháng 5', assignee: 'Trần Minh Đức', initials: 'TĐ', due: '15/05/2025', status: 'Đang thực hiện', progress: 40, tone: 'green' },
  { id: 3, title: 'Biên soạn chuyên đề: Dạy học phát triển năng lực giao tiếp', assignee: 'Phạm Thu Hà', initials: 'PH', due: '25/05/2025', status: 'Chưa bắt đầu', progress: 0, tone: 'orange' },
  { id: 4, title: 'Tổng hợp minh chứng thi đua học kỳ II', assignee: 'Lê Hoàng Nam', initials: 'LN', due: '10/05/2025', status: 'Quá hạn', progress: 100, tone: 'red' },
  { id: 5, title: 'Hoàn thiện kế hoạch bồi dưỡng học sinh giỏi', assignee: 'Đỗ Thị Hương', initials: 'ĐH', due: '28/05/2025', status: 'Đã nộp', progress: 100, tone: 'blue' },
];

const FALLBACK_RECORDS = [
  { id: 1, title: 'Kế hoạch bài dạy Unit 8 – Lớp 6A1', owner: 'Nguyễn Thị Mai', status: 'Đã duyệt', date: '06/05/2025', tone: 'green' },
  { id: 2, title: 'Sáng kiến kinh nghiệm: Ứng dụng AI', owner: 'Trần Minh Đức', status: 'Chờ duyệt', date: '05/05/2025', tone: 'orange' },
  { id: 3, title: 'Minh chứng thao giảng – 15/04/2025', owner: 'Phạm Thu Hà', status: 'Đã duyệt', date: '16/04/2025', tone: 'green' },
  { id: 4, title: 'Báo cáo chuyên đề STEM', owner: 'Lê Hoàng Nam', status: 'Cần chỉnh sửa', date: '02/05/2025', tone: 'red' },
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
    return {
      ...task,
      startISO: relativeDate(completed ? -12 : -3),
      dueISO: relativeDate(dueOffset),
      legacyDue: task.due,
    };
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

function readTasks() {
  return normalizeLegacyDates(readStored(TASK_STORAGE_KEY, FALLBACK_TASKS));
}

function readRecords() {
  return readStored(RECORD_STORAGE_KEY, FALLBACK_RECORDS);
}

function DepartmentRoot() {
  const [workspaceMode, setWorkspaceMode] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [records, setRecords] = useState([]);
  const [toast, setToast] = useState('');

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
      if (tab === 'tasks') {
        window.setTimeout(() => {
          setTasks(readTasks());
          setWorkspaceMode('tasks');
        }, 0);
        return;
      }
      if (tab === 'records') {
        window.setTimeout(() => {
          setRecords(readRecords());
          setWorkspaceMode('records');
        }, 0);
        return;
      }
      if (workspaceMode) {
        event.preventDefault();
        event.stopPropagation();
        sessionStorage.setItem('department-next-tab', tab);
        window.location.reload();
      }
    };
    document.addEventListener('click', handleNavigation, true);
    return () => document.removeEventListener('click', handleNavigation, true);
  }, [workspaceMode]);

  useEffect(() => {
    if (workspaceMode !== 'tasks') return;
    try { localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks)); } catch { /* local preview */ }
  }, [tasks, workspaceMode]);

  useEffect(() => {
    if (workspaceMode !== 'records') return;
    try { localStorage.setItem(RECORD_STORAGE_KEY, JSON.stringify(records)); } catch { /* local preview */ }
  }, [records, workspaceMode]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateTask = (id, patch) => setTasks((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deleteTask = (id) => {
    setTasks((items) => items.filter((item) => item.id !== id));
    setToast('Đã xóa nhiệm vụ.');
  };
  const updateRecord = (id, patch) => setRecords((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const deleteRecord = (id) => {
    setRecords((items) => items.filter((item) => item.id !== id));
    setToast('Đã xóa hồ sơ.');
  };

  return <>
    <App/>
    {workspaceMode === 'tasks' && <section className="task-workspace-bridge" aria-label="Không gian Giao việc hoàn chỉnh">
      <TasksWorkspace tasks={tasks} setTasks={setTasks} updateTask={updateTask} deleteTask={deleteTask} setToast={setToast}/>
    </section>}
    {workspaceMode === 'records' && <section className="task-workspace-bridge" aria-label="Không gian Hồ sơ hoàn chỉnh">
      <RecordsWorkspace records={records} setRecords={setRecords} updateRecord={updateRecord} deleteRecord={deleteRecord} setToast={setToast}/>
    </section>}
    {toast && <div className="bridge-toast" role="status">{toast}</div>}
  </>;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DepartmentRoot/>
  </React.StrictMode>,
);
