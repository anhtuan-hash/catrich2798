import React, { useEffect, useMemo, useRef, useState } from 'react';
import './tasks-workspace.css';
import { useBrianUsers } from './BrianUsersContext.jsx';

const PEOPLE = ['Toàn tổ', 'Chưa phân công', 'Chưa phân công', 'Chưa phân công', 'Chưa phân công', 'Chưa phân công'];
const STATUSES = ['Chưa bắt đầu', 'Đang thực hiện', 'Đã nộp', 'Cần chỉnh sửa', 'Hoàn thành', 'Quá hạn'];
const PRIORITIES = ['Khẩn cấp', 'Cao', 'Trung bình', 'Thấp'];

const statusClass = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const initials = (name = '') => name === 'Toàn tổ' ? 'TT' : name.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase();
const toISODate = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};
const formatDate = (value) => {
  const iso = toISODate(value);
  if (!iso) return value || 'Chưa đặt';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const isOverdue = (task) => {
  const due = toISODate(task.dueISO || task.due);
  return due && due < todayISO() && !['Hoàn thành', 'Đã nộp'].includes(task.status);
};
const daysUntil = (task) => {
  const due = toISODate(task.dueISO || task.due);
  if (!due) return Number.POSITIVE_INFINITY;
  const start = new Date(`${todayISO()}T00:00:00`);
  const end = new Date(`${due}T00:00:00`);
  return Math.ceil((end - start) / 86400000);
};
const priorityWeight = { 'Khẩn cấp': 4, 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };

function normalizeTask(task) {
  const { people: brianPeople } = useBrianUsers();
  const assignees = Array.isArray(task.assignees) && task.assignees.length ? task.assignees : [task.assignee || 'Toàn tổ'];
  const dueISO = toISODate(task.dueISO || task.due) || addDaysISO(7);
  const startISO = toISODate(task.startISO) || todayISO();
  const criteria = Array.isArray(task.criteria) ? task.criteria : [
    { id: `${task.id}-criterion-1`, label: 'Hoàn thành đúng nội dung được giao', done: Number(task.progress) >= 100 },
    { id: `${task.id}-criterion-2`, label: 'Nộp đủ tệp và minh chứng liên quan', done: false },
  ];
  return {
    ...task,
    assignees,
    assignee: assignees.length === 1 ? assignees[0] : `${assignees.length} người nhận`,
    initials: task.initials || initials(assignees[0]),
    dueISO,
    due: formatDate(dueISO),
    startISO,
    priority: task.priority || 'Trung bình',
    description: task.description || 'Chưa có mô tả chi tiết.',
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    criteria,
    feedback: Array.isArray(task.feedback) ? task.feedback : [],
    history: Array.isArray(task.history) ? task.history : [{ id: `${task.id}-history`, text: 'Nhiệm vụ được khởi tạo', time: 'Dữ liệu ban đầu' }],
  };
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    filter: <><path d="M4 5h16M7 12h10M10 19h4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.4-6 6-6s6 2 6 6M15 15c3.2 0 5 1.6 5 5"/></>,
    paperclip: <path d="m8 12 6-6a4 4 0 0 1 6 6l-8 8a6 6 0 0 1-8-8l8-8"/>,
    message: <><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 13h5"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    edit: <><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m14 6 3 3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Metric({ label, value, note, tone }) {
  return <article className={`tw-metric tw-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function TaskForm({ task, onClose, onSave }) {
  const normalized = task ? normalizeTask(task) : null;
  const [form, setForm] = useState(() => ({
    title: normalized?.title || '',
    description: normalized?.description === 'Chưa có mô tả chi tiết.' ? '' : normalized?.description || '',
    assignees: normalized?.assignees || ['Toàn tổ'],
    startISO: normalized?.startISO || todayISO(),
    dueISO: normalized?.dueISO || addDaysISO(7),
    priority: normalized?.priority || 'Trung bình',
    status: normalized?.status || 'Chưa bắt đầu',
    progress: normalized?.progress || 0,
    criteriaText: normalized?.criteria.map((item) => item.label).join('\n') || 'Hoàn thành đúng nội dung được giao\nNộp đủ tệp và minh chứng liên quan',
    attachments: normalized?.attachments || [],
  }));
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const toggleAssignee = (person) => {
    setForm((current) => {
      let next = current.assignees.includes(person) ? current.assignees.filter((item) => item !== person) : [...current.assignees, person];
      if (person === 'Toàn tổ' && !current.assignees.includes(person)) next = ['Toàn tổ'];
      if (person !== 'Toàn tổ') next = next.filter((item) => item !== 'Toàn tổ');
      return { ...current, assignees: next.length ? next : ['Toàn tổ'] };
    });
  };

  const addFiles = (files) => {
    const incoming = [...files].map((file, index) => ({ id: `${Date.now()}-${index}`, name: file.name, size: file.size, type: file.type || 'Tệp đính kèm' }));
    setForm((current) => ({ ...current, attachments: [...current.attachments, ...incoming] }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) { setError('Vui lòng nhập tên nhiệm vụ.'); return; }
    if (!form.assignees.length) { setError('Vui lòng chọn ít nhất một người nhận.'); return; }
    if (form.dueISO < form.startISO) { setError('Hạn hoàn thành phải sau ngày bắt đầu.'); return; }
    const oldCriteria = normalized?.criteria || [];
    const criteria = form.criteriaText.split('\n').map((line) => line.trim()).filter(Boolean).map((label, index) => ({
      id: oldCriteria[index]?.id || `${Date.now()}-criterion-${index}`,
      label,
      done: oldCriteria[index]?.done || false,
    }));
    onSave({
      ...normalized,
      title: form.title.trim(),
      description: form.description.trim() || 'Chưa có mô tả chi tiết.',
      assignees: form.assignees,
      assignee: form.assignees.length === 1 ? form.assignees[0] : `${form.assignees.length} người nhận`,
      initials: initials(form.assignees[0]),
      startISO: form.startISO,
      dueISO: form.dueISO,
      due: formatDate(form.dueISO),
      priority: form.priority,
      status: form.status,
      progress: Number(form.progress),
      criteria,
      attachments: form.attachments,
    });
  };

  return <div className="tw-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="tw-modal" onSubmit={submit} data-testid="task-editor-modal">
      <header><div><span>GIAO VIỆC</span><h2>{task ? 'Chỉnh sửa nhiệm vụ' : 'Tạo nhiệm vụ mới'}</h2><p>Thiết lập người nhận, thời hạn, tiêu chí hoàn thành và tệp kèm theo.</p></div><button type="button" className="tw-icon-button" onClick={onClose} aria-label="Đóng biểu mẫu"><Icon name="close"/></button></header>
      <div className="tw-form-grid">
        <label className="tw-span-2">Tên nhiệm vụ<input autoFocus aria-label="Tên nhiệm vụ" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Hoàn thiện ma trận đề kiểm tra học kỳ II"/></label>
        <label className="tw-span-2">Mô tả chi tiết<textarea aria-label="Mô tả chi tiết" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Nêu yêu cầu, phạm vi công việc và sản phẩm cần nộp..."/></label>
        <fieldset className="tw-span-2"><legend>Người nhận</legend><div className="tw-people-grid">{PEOPLE.map((person) => <label key={person} className={form.assignees.includes(person) ? 'selected' : ''}><input type="checkbox" checked={form.assignees.includes(person)} onChange={() => toggleAssignee(person)}/><span>{initials(person)}</span><b>{person}</b></label>)}</div></fieldset>
        <label>Ngày bắt đầu<input aria-label="Ngày bắt đầu" type="date" value={form.startISO} onChange={(event) => setForm({ ...form, startISO: event.target.value })}/></label>
        <label>Hạn hoàn thành<input aria-label="Hạn hoàn thành" type="date" value={form.dueISO} onChange={(event) => setForm({ ...form, dueISO: event.target.value })}/></label>
        <label>Mức độ ưu tiên<select aria-label="Mức độ ưu tiên" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Trạng thái<select aria-label="Trạng thái" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="tw-span-2">Tiến độ: <b>{form.progress}%</b><input aria-label="Tiến độ nhiệm vụ" className="tw-range" type="range" min="0" max="100" step="5" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })}/></label>
        <label className="tw-span-2">Tiêu chí hoàn thành<textarea aria-label="Tiêu chí hoàn thành" rows="3" value={form.criteriaText} onChange={(event) => setForm({ ...form, criteriaText: event.target.value })}/><small>Mỗi dòng là một tiêu chí.</small></label>
        <div className="tw-span-2 tw-file-field"><div><strong>Tệp đính kèm</strong><small>Lưu tên và thông tin tệp trong bản thử nghiệm cục bộ.</small></div><button type="button" onClick={() => fileRef.current?.click()}><Icon name="paperclip"/> Chọn tệp</button><input ref={fileRef} hidden type="file" multiple onChange={(event) => addFiles(event.target.files)}/></div>
        {form.attachments.length > 0 && <div className="tw-span-2 tw-file-list">{form.attachments.map((file) => <span key={file.id}><Icon name="paperclip" size={15}/>{file.name}<button type="button" aria-label={`Xóa tệp ${file.name}`} onClick={() => setForm((current) => ({ ...current, attachments: current.attachments.filter((item) => item.id !== file.id) }))}>×</button></span>)}</div>}
      </div>
      {error && <p className="tw-form-error" role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Hủy</button><button className="tw-primary" type="submit">{task ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}</button></footer>
    </form>
  </div>;
}

function TaskDetail({ task, onClose, onEdit, onUpdate, onDelete, setToast }) {
  const item = normalizeTask(task);
  const [feedback, setFeedback] = useState('');
  const addFeedback = () => {
    if (!feedback.trim()) return;
    const entry = { id: Date.now(), author: 'Demo Teacher Admin', text: feedback.trim(), time: new Date().toLocaleString('vi-VN') };
    onUpdate(item.id, { feedback: [...item.feedback, entry], history: [...item.history, { id: `${entry.id}-history`, text: 'Đã thêm phản hồi mới', time: entry.time }] });
    setFeedback('');
    setToast('Đã lưu phản hồi.');
  };
  const toggleCriterion = (criterionId) => onUpdate(item.id, { criteria: item.criteria.map((criterion) => criterion.id === criterionId ? { ...criterion, done: !criterion.done } : criterion) });
  return <div className="tw-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="tw-detail" data-testid="task-detail-panel">
      <header><div><span className={`tw-priority tw-${statusClass(item.priority)}`}>{item.priority}</span><h2>{item.title}</h2><p>{item.description}</p></div><button className="tw-icon-button" onClick={onClose} aria-label="Đóng chi tiết nhiệm vụ"><Icon name="close"/></button></header>
      <div className="tw-detail-actions"><button onClick={() => onEdit(item)}><Icon name="edit"/> Chỉnh sửa</button><select aria-label="Cập nhật trạng thái" value={item.status} onChange={(event) => { const status = event.target.value; onUpdate(item.id, { status, progress: ['Hoàn thành', 'Đã nộp'].includes(status) ? 100 : item.progress }); setToast(`Đã chuyển sang trạng thái ${status}.`); }}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><button className="danger" onClick={() => { if (window.confirm('Xóa nhiệm vụ này?')) { onDelete(item.id); onClose(); } }}><Icon name="trash"/> Xóa</button></div>
      <section className="tw-detail-summary"><article><span>Người nhận</span><strong>{item.assignees.join(', ')}</strong></article><article><span>Thời gian</span><strong>{formatDate(item.startISO)} → {formatDate(item.dueISO)}</strong></article><article><span>Tiến độ</span><strong>{item.progress}%</strong><i><b style={{ width: `${item.progress}%` }}/></i></article><article><span>Trạng thái</span><strong className={`tw-status tw-${statusClass(item.status)}`}>{isOverdue(item) ? 'Quá hạn' : item.status}</strong></article></section>
      <section><h3>Tiêu chí hoàn thành</h3><div className="tw-criteria">{item.criteria.map((criterion) => <label key={criterion.id}><input type="checkbox" checked={criterion.done} onChange={() => toggleCriterion(criterion.id)}/><span>{criterion.label}</span></label>)}</div></section>
      <section><h3>Tệp đính kèm <small>{item.attachments.length}</small></h3>{item.attachments.length ? <div className="tw-attachments">{item.attachments.map((file) => <button key={file.id} onClick={() => setToast(`Tệp ${file.name} đang ở chế độ dữ liệu mẫu.`)}><Icon name="paperclip"/><span><strong>{file.name}</strong><small>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : file.type}</small></span><Icon name="arrow"/></button>)}</div> : <p className="tw-empty-small">Chưa có tệp đính kèm.</p>}</section>
      <section><h3>Phản hồi và trao đổi <small>{item.feedback.length}</small></h3><div className="tw-feedback-list">{item.feedback.length ? item.feedback.map((entry) => <article key={entry.id}><span>AT</span><div><strong>{entry.author}</strong><time>{entry.time}</time><p>{entry.text}</p></div></article>) : <p className="tw-empty-small">Chưa có phản hồi.</p>}</div><div className="tw-feedback-compose"><textarea aria-label="Nội dung phản hồi" rows="3" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Nhập nhận xét hoặc yêu cầu chỉnh sửa..."/><button onClick={addFeedback}>Gửi phản hồi</button></div></section>
      <section><h3>Lịch sử hoạt động</h3><div className="tw-history">{item.history.slice().reverse().map((entry) => <article key={entry.id}><i/><div><strong>{entry.text}</strong><small>{entry.time}</small></div></article>)}</div></section>
    </aside>
  </div>;
}

function TaskRow({ task, selected, onSelect, onOpen, onUpdate, onEdit, onDelete, setToast, menuOpen, onToggleMenu }) {
  const item = normalizeTask(task);
  const [menuDirection, setMenuDirection] = useState('down');
  const effectiveStatus = isOverdue(item) ? 'Quá hạn' : item.status;
  const setStatus = (status) => {
    onUpdate(item.id, { status, progress: ['Hoàn thành', 'Đã nộp'].includes(status) ? 100 : status === 'Chưa bắt đầu' ? 0 : Math.max(item.progress, 20), history: [...item.history, { id: Date.now(), text: `Chuyển trạng thái sang ${status}`, time: new Date().toLocaleString('vi-VN') }] });
    setToast(`Đã cập nhật ${item.title}.`);
    onToggleMenu(null);
  };
  return <article className={`tw-task-row ${selected ? 'selected' : ''}`} data-testid={`task-${item.id}`}>
    <label className="tw-row-check"><input aria-label={`Chọn ${item.title}`} type="checkbox" checked={selected} onChange={() => onSelect(item.id)}/></label>
    <button className="tw-task-main" onClick={() => onOpen(item)}><span className="tw-avatar">{item.initials}</span><span><strong>{item.title}</strong><small>{item.assignees.join(', ')}</small></span></button>
    <span className={`tw-priority tw-${statusClass(item.priority)}`}>{item.priority}</span>
    <span className={`tw-status tw-${statusClass(effectiveStatus)}`}>{effectiveStatus}</span>
    <span className="tw-due"><small>Hạn hoàn thành</small><strong>{formatDate(item.dueISO)}</strong></span>
    <span className="tw-progress"><strong>{item.progress}%</strong><i><b style={{ width: `${item.progress}%` }}/></i></span>
    <span className="tw-row-meta"><b><Icon name="paperclip" size={15}/>{item.attachments.length}</b><b><Icon name="message" size={15}/>{item.feedback.length}</b></span>
    <div className="tw-row-menu"><button aria-label={`Tùy chọn ${item.title}`} aria-expanded={menuOpen} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setMenuDirection(window.innerHeight - rect.bottom < 270 ? 'up' : 'down'); onToggleMenu(menuOpen ? null : item.id); }}><Icon name="more"/></button>{menuOpen && <div className={menuDirection === 'up' ? 'opens-up' : 'opens-down'}><button onClick={() => { onOpen(item); onToggleMenu(null); }}>Xem chi tiết</button><button onClick={() => { onEdit(item); onToggleMenu(null); }}>Chỉnh sửa</button><button onClick={() => setStatus('Đang thực hiện')}>Bắt đầu</button><button onClick={() => setStatus('Đã nộp')}>Đánh dấu đã nộp</button><button onClick={() => setStatus('Hoàn thành')}>Hoàn thành</button><button className="danger" onClick={() => { if (window.confirm('Xóa nhiệm vụ này?')) onDelete(item.id); onToggleMenu(null); }}>Xóa nhiệm vụ</button></div>}</div>
  </article>;
}

export default function TasksWorkspace({ tasks, setTasks, updateTask, deleteTask, setToast }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Tất cả');
  const [assignee, setAssignee] = useState('Tất cả');
  const [priority, setPriority] = useState('Tất cả');
  const [sort, setSort] = useState('Hạn gần nhất');
  const [editor, setEditor] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!event.target.closest?.('.tw-row-menu')) setOpenMenuId(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const normalized = useMemo(() => tasks.map(normalizeTask), [tasks]);
  const visible = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const list = normalized.filter((task) => {
      const effectiveStatus = isOverdue(task) ? 'Quá hạn' : task.status;
      return (!lowered || `${task.title} ${task.description} ${task.assignees.join(' ')}`.toLowerCase().includes(lowered))
        && (status === 'Tất cả' || effectiveStatus === status)
        && (assignee === 'Tất cả' || task.assignees.includes(assignee) || (assignee === 'Toàn tổ' && task.assignees.includes('Toàn tổ')))
        && (priority === 'Tất cả' || task.priority === priority);
    });
    return list.sort((a, b) => {
      if (sort === 'Tiến độ cao') return b.progress - a.progress;
      if (sort === 'Ưu tiên cao') return priorityWeight[b.priority] - priorityWeight[a.priority];
      if (sort === 'Mới cập nhật') return Number(b.id) - Number(a.id);
      return (toISODate(a.dueISO) || '9999').localeCompare(toISODate(b.dueISO) || '9999');
    });
  }, [normalized, query, status, assignee, priority, sort]);

  const detailTask = normalized.find((task) => task.id === detailId);
  const overdueCount = normalized.filter(isOverdue).length;
  const dueSoonCount = normalized.filter((task) => { const days = daysUntil(task); return days >= 0 && days <= 7 && !['Hoàn thành', 'Đã nộp'].includes(task.status); }).length;
  const submittedCount = normalized.filter((task) => task.status === 'Đã nộp').length;
  const completionRate = normalized.length ? Math.round(normalized.filter((task) => ['Hoàn thành', 'Đã nộp'].includes(task.status)).length / normalized.length * 100) : 0;

  const saveTask = (data) => {
    if (editor?.id) {
      updateTask(editor.id, { ...data, history: [...(editor.history || []), { id: Date.now(), text: 'Đã chỉnh sửa thông tin nhiệm vụ', time: new Date().toLocaleString('vi-VN') }] });
      setToast('Đã lưu thay đổi nhiệm vụ.');
    } else {
      const id = Date.now();
      const task = normalizeTask({ ...data, id, tone: 'purple', feedback: [], history: [{ id: `${id}-created`, text: 'Nhiệm vụ được tạo bởi TTCM', time: new Date().toLocaleString('vi-VN') }] });
      setTasks((items) => [task, ...items]);
      setToast('Đã tạo nhiệm vụ mới.');
    }
    setEditor(null);
  };

  const bulkStatus = (nextStatus) => {
    if (!selected.length) return;
    setTasks((items) => items.map((task) => selected.includes(task.id) ? { ...task, status: nextStatus, progress: ['Hoàn thành', 'Đã nộp'].includes(nextStatus) ? 100 : task.progress } : task));
    setSelected([]);
    setToast(`Đã cập nhật ${selected.length} nhiệm vụ.`);
  };
  const clearFilters = () => { setQuery(''); setStatus('Tất cả'); setAssignee('Tất cả'); setPriority('Tất cả'); setSort('Hạn gần nhất'); };

  return <div className="tw-page">
    <header className="tw-heading"><div><span>TRUNG TÂM CÔNG VIỆC</span><h1>Giao việc và theo dõi</h1><p>Phân công một người, nhiều giáo viên hoặc toàn tổ; theo dõi thời hạn, sản phẩm, tiến độ và phản hồi trong một luồng thống nhất.</p></div><button className="tw-primary" onClick={() => setEditor({ mode: 'create' })}><Icon name="plus"/> Tạo nhiệm vụ</button></header>
    <section className="tw-metrics"><Metric label="Tổng nhiệm vụ" value={normalized.length} note={`${normalized.filter((task) => task.status === 'Đang thực hiện').length} đang thực hiện`} tone="purple"/><Metric label="Sắp đến hạn" value={dueSoonCount} note="Trong 7 ngày tới" tone="orange"/><Metric label="Quá hạn" value={overdueCount} note="Cần xử lý ngay" tone="red"/><Metric label="Tỷ lệ hoàn thành" value={`${completionRate}%`} note={`${submittedCount} hồ sơ đã nộp`} tone="green"/></section>
    <section className="tw-panel">
      <div className="tw-toolbar"><label className="tw-search"><Icon name="search"/><input aria-label="Tìm nhiệm vụ" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên nhiệm vụ, nội dung hoặc giáo viên..."/></label><div className="tw-toolbar-selects"><label><span>Trạng thái</span><select aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}>{['Tất cả', ...STATUSES].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Người nhận</span><select aria-label="Lọc người nhận" value={assignee} onChange={(event) => setAssignee(event.target.value)}>{['Tất cả', ...PEOPLE].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Ưu tiên</span><select aria-label="Lọc ưu tiên" value={priority} onChange={(event) => setPriority(event.target.value)}>{['Tất cả', ...PRIORITIES].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Sắp xếp</span><select aria-label="Sắp xếp nhiệm vụ" value={sort} onChange={(event) => setSort(event.target.value)}>{['Hạn gần nhất', 'Ưu tiên cao', 'Tiến độ cao', 'Mới cập nhật'].map((item) => <option key={item}>{item}</option>)}</select></label></div></div>
      <div className="tw-list-head"><div><strong>{visible.length} nhiệm vụ</strong><small>Hiển thị theo bộ lọc hiện tại</small></div><div>{selected.length > 0 && <><span>Đã chọn {selected.length}</span><button onClick={() => bulkStatus('Đang thực hiện')}>Bắt đầu</button><button onClick={() => bulkStatus('Đã nộp')}>Đã nộp</button><button onClick={() => bulkStatus('Hoàn thành')}>Hoàn thành</button></>}<button className="tw-clear" onClick={clearFilters}><Icon name="filter"/> Xóa bộ lọc</button></div></div>
      <div className="tw-columns"><span/><span>Nhiệm vụ & người nhận</span><span>Ưu tiên</span><span>Trạng thái</span><span>Thời hạn</span><span>Tiến độ</span><span>Tương tác</span><span/></div>
      <div className="tw-task-list">{visible.map((task) => <TaskRow key={task.id} task={task} selected={selected.includes(task.id)} onSelect={(id) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])} onOpen={(item) => setDetailId(item.id)} onUpdate={updateTask} onEdit={(item) => setEditor(item)} onDelete={deleteTask} setToast={setToast} menuOpen={openMenuId === task.id} onToggleMenu={setOpenMenuId}/>)}</div>
      {!visible.length && <div className="tw-empty"><Icon name="search" size={30}/><h3>Không tìm thấy nhiệm vụ phù hợp</h3><p>Thử thay đổi từ khóa hoặc xóa bớt bộ lọc.</p><button onClick={clearFilters}>Xóa bộ lọc</button></div>}
    </section>
    {editor && <TaskForm task={editor.id ? editor : null} onClose={() => setEditor(null)} onSave={saveTask}/>}
    {detailTask && <TaskDetail task={detailTask} onClose={() => setDetailId(null)} onEdit={(item) => { setDetailId(null); setEditor(item); }} onUpdate={updateTask} onDelete={deleteTask} setToast={setToast}/>}
  </div>;
}
