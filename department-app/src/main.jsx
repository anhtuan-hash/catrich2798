import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import TasksWorkspace from './TasksWorkspace.jsx';
import './styles.css';
import './laptop-scale.css';
import './macbook-readable.css';
import './notification-toggle.css';
import './task-workspace-bridge.css';

const TASK_STORAGE_KEY = 'department-v2-tasks';

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

function readTasks() {
  try {
    const value = localStorage.getItem(TASK_STORAGE_KEY);
    return normalizeLegacyDates(value ? JSON.parse(value) : []);
  } catch {
    return [];
  }
}

function DepartmentRoot() {
  const [taskMode, setTaskMode] = useState(false);
  const [tasks, setTasks] = useState([]);
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
      const tab = button.dataset.testid?.replace('tab-', '') || button.getAttribute('data-testid')?.replace('tab-', '');
      if (tab === 'tasks') {
        window.setTimeout(() => {
          setTasks(readTasks());
          setTaskMode(true);
        }, 0);
        return;
      }
      if (taskMode) {
        event.preventDefault();
        event.stopPropagation();
        sessionStorage.setItem('department-next-tab', tab);
        window.location.reload();
      }
    };
    document.addEventListener('click', handleNavigation, true);
    return () => document.removeEventListener('click', handleNavigation, true);
  }, [taskMode]);

  useEffect(() => {
    if (!taskMode) return;
    try { localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks)); } catch { /* local preview */ }
  }, [tasks, taskMode]);

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

  return <>
    <App/>
    {taskMode && <section className="task-workspace-bridge" aria-label="Không gian Giao việc hoàn chỉnh">
      <TasksWorkspace tasks={tasks} setTasks={setTasks} updateTask={updateTask} deleteTask={deleteTask} setToast={setToast}/>
    </section>}
    {toast && <div className="bridge-toast" role="status">{toast}</div>}
  </>;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DepartmentRoot/>
  </React.StrictMode>,
);
