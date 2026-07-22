import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import TasksWorkspace from './TasksWorkspace.jsx';
import RecordsWorkspace from './RecordsWorkspace.jsx';
import PlansWorkspace from './PlansWorkspace.jsx';
import CalendarWorkspace, { createDefaultCalendarEvents } from './CalendarWorkspace.jsx';
import MeetingsWorkspace, { createDefaultMeetings } from './MeetingsWorkspace.jsx';
import './styles.css';
import './laptop-scale.css';
import './macbook-readable.css';
import './notification-toggle.css';
import './task-workspace-bridge.css';

const TASK_STORAGE_KEY = 'department-v2-tasks';
const RECORD_STORAGE_KEY = 'department-v2-records';
const PLAN_STORAGE_KEY = 'department-v2-plans';
const CALENDAR_STORAGE_KEY = 'department-v2-calendar-events';
const MEETING_STORAGE_KEY = 'department-v2-meetings';

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

const FALLBACK_PLANS = [
  { id: 1, title: 'Kế hoạch năm học', progress: 82, status: 'Đang thực hiện', type: 'Năm học', owner: 'Nguyễn Thị Mai', description: 'Kế hoạch tổng thể hoạt động chuyên môn, bồi dưỡng giáo viên và nâng cao chất lượng học tập.', startISO: '2026-08-01', dueISO: '2027-05-31', milestones: [{ id: 11, label: 'Hoàn thiện chỉ tiêu năm học', done: true }, { id: 12, label: 'Phân công chuyên môn', done: true }, { id: 13, label: 'Rà soát tiến độ học kỳ I', done: false }] },
  { id: 2, title: 'Kế hoạch học kỳ I', progress: 64, status: 'Đang thực hiện', type: 'Học kỳ', owner: 'Trần Minh Đức', description: 'Kế hoạch triển khai chương trình, kiểm tra đánh giá và sinh hoạt chuyên đề học kỳ I.', startISO: '2026-08-15', dueISO: '2026-12-31', milestones: [{ id: 21, label: 'Thống nhất phân phối chương trình', done: true }, { id: 22, label: 'Xây dựng ma trận kiểm tra', done: false }] },
  { id: 3, title: 'Kế hoạch tháng 8', progress: 35, status: 'Cần cập nhật', type: 'Tháng', owner: 'Phạm Thu Hà', description: 'Chuẩn bị năm học mới, hoàn thiện hồ sơ tổ và tổ chức chuyên đề đầu năm.', startISO: '2026-08-01', dueISO: '2026-08-31', milestones: [{ id: 31, label: 'Họp tổ đầu năm', done: true }, { id: 32, label: 'Hoàn thiện hồ sơ chuyên môn', done: false }] },
  { id: 4, title: 'Kế hoạch chuyên đề ứng dụng AI', progress: 90, status: 'Gần hoàn thành', type: 'Chuyên đề', owner: 'Đỗ Thị Hương', description: 'Tổ chức chuỗi hoạt động ứng dụng AI an toàn và hiệu quả trong dạy học tiếng Anh.', startISO: '2026-07-15', dueISO: '2026-09-15', milestones: [{ id: 41, label: 'Xây dựng nội dung chuyên đề', done: true }, { id: 42, label: 'Chuẩn bị minh chứng', done: true }, { id: 43, label: 'Tổ chức báo cáo', done: false }] },
];

function relativeDate(days) { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()+days); return date.toISOString().slice(0,10); }
function normalizeLegacyDates(items) { return items.map((task,index)=>{ if(task.dueISO) return task; const completed=['Hoàn thành','Đã nộp'].includes(task.status); const overdue=task.status==='Quá hạn'; const dueOffset=overdue?-2:completed?-4:3+index*3; return {...task,startISO:relativeDate(completed?-12:-3),dueISO:relativeDate(dueOffset),legacyDue:task.due}; }); }
function readStored(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch{return fallback}}

function DepartmentRoot(){
  const [workspaceMode,setWorkspaceMode]=useState(null);
  const [tasks,setTasks]=useState([]);
  const [records,setRecords]=useState([]);
  const [plans,setPlans]=useState([]);
  const [events,setEvents]=useState([]);
  const [meetings,setMeetings]=useState([]);
  const [toast,setToast]=useState('');

  useEffect(()=>{const nextTab=sessionStorage.getItem('department-next-tab');if(!nextTab)return undefined;sessionStorage.removeItem('department-next-tab');const timer=window.setTimeout(()=>document.querySelector(`[data-testid="tab-${nextTab}"]`)?.click(),120);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{const handleNavigation=event=>{const button=event.target.closest?.('[data-testid^="tab-"]');if(!button)return;const tab=button.getAttribute('data-testid')?.replace('tab-','');if(tab==='tasks'){window.setTimeout(()=>{setTasks(normalizeLegacyDates(readStored(TASK_STORAGE_KEY,FALLBACK_TASKS)));setWorkspaceMode('tasks')},0);return}if(tab==='records'){window.setTimeout(()=>{setRecords(readStored(RECORD_STORAGE_KEY,FALLBACK_RECORDS));setWorkspaceMode('records')},0);return}if(tab==='plans'){window.setTimeout(()=>{setPlans(readStored(PLAN_STORAGE_KEY,FALLBACK_PLANS));setWorkspaceMode('plans')},0);return}if(tab==='calendar'){window.setTimeout(()=>{setEvents(readStored(CALENDAR_STORAGE_KEY,createDefaultCalendarEvents()));setWorkspaceMode('calendar')},0);return}if(tab==='meetings'){window.setTimeout(()=>{setMeetings(readStored(MEETING_STORAGE_KEY,createDefaultMeetings()));setTasks(normalizeLegacyDates(readStored(TASK_STORAGE_KEY,FALLBACK_TASKS)));setWorkspaceMode('meetings')},0);return}if(workspaceMode){event.preventDefault();event.stopPropagation();sessionStorage.setItem('department-next-tab',tab);window.location.reload()}};document.addEventListener('click',handleNavigation,true);return()=>document.removeEventListener('click',handleNavigation,true)},[workspaceMode]);

  useEffect(()=>{if(workspaceMode==='tasks'||workspaceMode==='meetings')try{localStorage.setItem(TASK_STORAGE_KEY,JSON.stringify(tasks))}catch{}},[tasks,workspaceMode]);
  useEffect(()=>{if(workspaceMode==='records')try{localStorage.setItem(RECORD_STORAGE_KEY,JSON.stringify(records))}catch{}},[records,workspaceMode]);
  useEffect(()=>{if(workspaceMode==='plans')try{localStorage.setItem(PLAN_STORAGE_KEY,JSON.stringify(plans))}catch{}},[plans,workspaceMode]);
  useEffect(()=>{if(workspaceMode==='calendar')try{localStorage.setItem(CALENDAR_STORAGE_KEY,JSON.stringify(events))}catch{}},[events,workspaceMode]);
  useEffect(()=>{if(workspaceMode==='meetings')try{localStorage.setItem(MEETING_STORAGE_KEY,JSON.stringify(meetings))}catch{}},[meetings,workspaceMode]);
  useEffect(()=>{if(!toast)return undefined;const timer=window.setTimeout(()=>setToast(''),2600);return()=>window.clearTimeout(timer)},[toast]);

  const updateTask=(id,patch)=>setTasks(items=>items.map(item=>item.id===id?{...item,...patch}:item));
  const deleteTask=id=>{setTasks(items=>items.filter(item=>item.id!==id));setToast('Đã xóa nhiệm vụ.')};
  const updateRecord=(id,patch)=>setRecords(items=>items.map(item=>item.id===id?{...item,...patch}:item));
  const deleteRecord=id=>{setRecords(items=>items.filter(item=>item.id!==id));setToast('Đã xóa hồ sơ.')};
  const updatePlan=(id,patch)=>setPlans(items=>items.map(item=>item.id===id?{...item,...patch}:item));
  const deletePlan=id=>{setPlans(items=>items.filter(item=>item.id!==id));setToast('Đã xóa kế hoạch.')};
  const updateEvent=(id,patch)=>setEvents(items=>items.map(item=>item.id===id?{...item,...patch}:item));
  const deleteEvent=id=>{setEvents(items=>items.filter(item=>item.id!==id));setToast('Đã xóa hoạt động.')};
  const updateMeeting=(id,patch)=>setMeetings(items=>items.map(item=>item.id===id?{...item,...patch}:item));
  const deleteMeeting=id=>{setMeetings(items=>items.filter(item=>item.id!==id));setToast('Đã xóa cuộc họp.')};

  return <><App/>
    {workspaceMode==='tasks'&&<section className="task-workspace-bridge" aria-label="Không gian Giao việc hoàn chỉnh"><TasksWorkspace tasks={tasks} setTasks={setTasks} updateTask={updateTask} deleteTask={deleteTask} setToast={setToast}/></section>}
    {workspaceMode==='records'&&<section className="task-workspace-bridge" aria-label="Không gian Hồ sơ hoàn chỉnh"><RecordsWorkspace records={records} setRecords={setRecords} updateRecord={updateRecord} deleteRecord={deleteRecord} setToast={setToast}/></section>}
    {workspaceMode==='plans'&&<section className="task-workspace-bridge" aria-label="Không gian Kế hoạch hoàn chỉnh"><PlansWorkspace plans={plans} setPlans={setPlans} updatePlan={updatePlan} deletePlan={deletePlan} setToast={setToast}/></section>}
    {workspaceMode==='calendar'&&<section className="task-workspace-bridge" aria-label="Không gian Lịch hoàn chỉnh"><CalendarWorkspace events={events} setEvents={setEvents} updateEvent={updateEvent} deleteEvent={deleteEvent} setToast={setToast}/></section>}
    {workspaceMode==='meetings'&&<section className="task-workspace-bridge" aria-label="Không gian Sinh hoạt tổ hoàn chỉnh"><MeetingsWorkspace meetings={meetings} setMeetings={setMeetings} updateMeeting={updateMeeting} deleteMeeting={deleteMeeting} setTasks={setTasks} setToast={setToast}/></section>}
    {toast&&<div className="bridge-toast" role="status">{toast}</div>}
  </>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><DepartmentRoot/></React.StrictMode>);
