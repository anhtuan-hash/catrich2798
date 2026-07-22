import React, { useMemo, useState } from 'react';
import './calendar-workspace.css';

const TYPES = ['Họp tổ', 'Sinh hoạt chuyên môn', 'Dự giờ', 'Thao giảng', 'Kiểm tra hồ sơ', 'Nộp báo cáo', 'Ngoại khóa'];
const PEOPLE = ['Toàn tổ', 'Chưa phân công', 'Chưa phân công', 'Chưa phân công', 'Chưa phân công', 'Chưa phân công'];
const TYPE_TONE = {
  'Họp tổ': 'purple',
  'Sinh hoạt chuyên môn': 'blue',
  'Dự giờ': 'green',
  'Thao giảng': 'orange',
  'Kiểm tra hồ sơ': 'red',
  'Nộp báo cáo': 'pink',
  'Ngoại khóa': 'teal',
};

const pad = (value) => String(value).padStart(2, '0');
const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatDate = (value) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};
const monthLabel = (date) => `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
const sameDay = (a, b) => a === b;
const addDays = (value, days) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
};
const todayISO = () => isoDate(new Date());
const relativeDate = (days) => addDays(todayISO(), days);

function Icon({ name, size = 18 }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    left: <path d="m15 18-6-6 6-6"/>,
    right: <path d="m9 18 6-6-6-6"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z"/><circle cx="12" cy="10" r="2"/></>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/></>,
    file: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 13h8M8 17h6"/></>,
    edit: <><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m14 6 3 3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function normalizeEvent(event) {
  return {
    id: event.id,
    title: event.title || 'Hoạt động chuyên môn',
    type: TYPES.includes(event.type) ? event.type : 'Họp tổ',
    dateISO: event.dateISO || todayISO(),
    startTime: event.startTime || '08:00',
    endTime: event.endTime || '09:00',
    location: event.location || 'Phòng Hub Chuyên môn',
    attendees: Array.isArray(event.attendees) ? event.attendees : [event.attendees || 'Toàn tổ'],
    description: event.description || '',
    reminder: event.reminder ?? 30,
    attachments: Array.isArray(event.attachments) ? event.attachments : [],
    history: Array.isArray(event.history) ? event.history : [],
  };
}

function EventForm({ event, selectedDate, onClose, onSave }) {
  const item = event ? normalizeEvent(event) : null;
  const [form, setForm] = useState(() => ({
    title: item?.title || '',
    type: item?.type || TYPES[0],
    dateISO: item?.dateISO || selectedDate || todayISO(),
    startTime: item?.startTime || '08:00',
    endTime: item?.endTime || '09:00',
    location: item?.location || '',
    attendees: item?.attendees || ['Toàn tổ'],
    description: item?.description || '',
    reminder: item?.reminder ?? 30,
    attachments: item?.attachments || [],
  }));
  const [error, setError] = useState('');

  const toggleAttendee = (person) => {
    if (person === 'Toàn tổ') {
      setForm((current) => ({ ...current, attendees: ['Toàn tổ'] }));
      return;
    }
    setForm((current) => {
      const withoutAll = current.attendees.filter((item) => item !== 'Toàn tổ');
      const next = withoutAll.includes(person) ? withoutAll.filter((item) => item !== person) : [...withoutAll, person];
      return { ...current, attendees: next.length ? next : ['Toàn tổ'] };
    });
  };

  const submit = (eventObject) => {
    eventObject.preventDefault();
    if (!form.title.trim()) { setError('Vui lòng nhập tên hoạt động.'); return; }
    if (!form.dateISO) { setError('Vui lòng chọn ngày.'); return; }
    if (form.endTime <= form.startTime) { setError('Giờ kết thúc phải sau giờ bắt đầu.'); return; }
    onSave({
      ...item,
      ...form,
      title: form.title.trim(),
      location: form.location.trim() || 'Chưa xác định',
      description: form.description.trim(),
    });
  };

  return <div className="cw-modal-backdrop" onMouseDown={(eventObject) => eventObject.target === eventObject.currentTarget && onClose()}>
    <form className="cw-modal" onSubmit={submit} data-testid="calendar-event-modal">
      <header><div><span>LỊCH TỔ CHUYÊN MÔN</span><h2>{event ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động mới'}</h2><p>Thiết lập thời gian, thành phần tham dự, địa điểm và nhắc hạn.</p></div><button type="button" onClick={onClose} aria-label="Đóng biểu mẫu"><Icon name="close"/></button></header>
      <div className="cw-form-grid">
        <label className="cw-span-2">Tên hoạt động<input aria-label="Tên hoạt động" autoFocus value={form.title} onChange={(eventObject) => setForm({ ...form, title: eventObject.target.value })} placeholder="Ví dụ: Họp tổ chuyên môn tháng 8"/></label>
        <label>Loại hoạt động<select aria-label="Loại hoạt động" value={form.type} onChange={(eventObject) => setForm({ ...form, type: eventObject.target.value })}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Ngày tổ chức<input aria-label="Ngày tổ chức" type="date" value={form.dateISO} onChange={(eventObject) => setForm({ ...form, dateISO: eventObject.target.value })}/></label>
        <label>Giờ bắt đầu<input aria-label="Giờ bắt đầu" type="time" value={form.startTime} onChange={(eventObject) => setForm({ ...form, startTime: eventObject.target.value })}/></label>
        <label>Giờ kết thúc<input aria-label="Giờ kết thúc" type="time" value={form.endTime} onChange={(eventObject) => setForm({ ...form, endTime: eventObject.target.value })}/></label>
        <label className="cw-span-2">Địa điểm<input aria-label="Địa điểm" value={form.location} onChange={(eventObject) => setForm({ ...form, location: eventObject.target.value })} placeholder="Phòng họp, lớp học hoặc địa điểm trực tuyến"/></label>
        <fieldset className="cw-span-2"><legend>Thành phần tham dự</legend><div className="cw-people-grid">{PEOPLE.map((person) => <label key={person} className={form.attendees.includes(person) ? 'selected' : ''}><input type="checkbox" checked={form.attendees.includes(person)} onChange={() => toggleAttendee(person)}/><span>{person}</span></label>)}</div></fieldset>
        <label>Nhắc trước<select aria-label="Nhắc trước" value={form.reminder} onChange={(eventObject) => setForm({ ...form, reminder: Number(eventObject.target.value) })}><option value="0">Không nhắc</option><option value="15">15 phút</option><option value="30">30 phút</option><option value="60">1 giờ</option><option value="1440">1 ngày</option></select></label>
        <label className="cw-span-2">Nội dung<textarea aria-label="Nội dung hoạt động" rows="4" value={form.description} onChange={(eventObject) => setForm({ ...form, description: eventObject.target.value })} placeholder="Nội dung, mục tiêu và công việc cần chuẩn bị..."/></label>
        <label className="cw-span-2 cw-file-picker"><span><strong>Tài liệu đính kèm</strong><small>Tên tệp được lưu trong bản dùng thử.</small></span><input aria-label="Tài liệu đính kèm" type="file" multiple onChange={(eventObject) => setForm({ ...form, attachments: [...form.attachments, ...[...eventObject.target.files].map((file, index) => ({ id: `${Date.now()}-${index}`, name: file.name, size: file.size }))] })}/></label>
        {!!form.attachments.length && <div className="cw-span-2 cw-files">{form.attachments.map((file) => <span key={file.id}><Icon name="file" size={15}/>{file.name}<button type="button" onClick={() => setForm((current) => ({ ...current, attachments: current.attachments.filter((itemFile) => itemFile.id !== file.id) }))}>×</button></span>)}</div>}
      </div>
      {error && <p className="cw-error" role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Hủy</button><button className="cw-primary" type="submit">{event ? 'Lưu thay đổi' : 'Tạo hoạt động'}</button></footer>
    </form>
  </div>;
}

function EventDetail({ event, onClose, onEdit, onDelete, setToast }) {
  const item = normalizeEvent(event);
  return <div className="cw-detail-backdrop" onMouseDown={(eventObject) => eventObject.target === eventObject.currentTarget && onClose()}>
    <aside className="cw-detail" data-testid="calendar-event-detail">
      <header><div><span className={`cw-type cw-${TYPE_TONE[item.type]}`}>{item.type}</span><h2>{item.title}</h2><p>{item.description || 'Chưa có mô tả chi tiết.'}</p></div><button onClick={onClose} aria-label="Đóng chi tiết lịch"><Icon name="close"/></button></header>
      <div className="cw-detail-actions"><button onClick={() => onEdit(item)}><Icon name="edit"/> Chỉnh sửa</button><button className="danger" onClick={() => { if (window.confirm('Xóa hoạt động này?')) { onDelete(item.id); onClose(); } }}><Icon name="trash"/> Xóa</button></div>
      <section className="cw-detail-grid"><article><Icon name="calendar"/><span><small>Ngày tổ chức</small><strong>{formatDate(item.dateISO)}</strong></span></article><article><Icon name="clock"/><span><small>Thời gian</small><strong>{item.startTime} – {item.endTime}</strong></span></article><article><Icon name="pin"/><span><small>Địa điểm</small><strong>{item.location}</strong></span></article><article><Icon name="bell"/><span><small>Nhắc trước</small><strong>{item.reminder ? `${item.reminder} phút` : 'Không nhắc'}</strong></span></article></section>
      <section><h3>Thành phần tham dự</h3><div className="cw-attendee-list">{item.attendees.map((person) => <span key={person}><Icon name="people" size={15}/>{person}</span>)}</div></section>
      <section><h3>Tài liệu <small>{item.attachments.length}</small></h3>{item.attachments.length ? <div className="cw-attachment-list">{item.attachments.map((file) => <button key={file.id} onClick={() => setToast(`Tệp ${file.name} đang ở chế độ dữ liệu mẫu.`)}><Icon name="file"/><span><strong>{file.name}</strong><small>{Math.max(1, Math.round((file.size || 1000) / 1024))} KB</small></span></button>)}</div> : <p className="cw-empty-note">Chưa có tài liệu đính kèm.</p>}</section>
    </aside>
  </div>;
}

function buildMonthDays(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  const day = first.getDay() || 7;
  start.setDate(first.getDate() - (day - 1));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { dateISO: isoDate(date), date, currentMonth: date.getMonth() === cursor.getMonth() };
  });
}

export default function CalendarWorkspace({ events, setEvents, updateEvent, deleteEvent, setToast }) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [view, setView] = useState('Tháng');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('Tất cả');
  const [editor, setEditor] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const normalized = useMemo(() => events.map(normalizeEvent), [events]);
  const filtered = useMemo(() => normalized.filter((event) => {
    const text = `${event.title} ${event.type} ${event.location} ${event.description}`.toLowerCase();
    return (!query.trim() || text.includes(query.trim().toLowerCase())) && (type === 'Tất cả' || event.type === type);
  }), [normalized, query, type]);
  const monthDays = useMemo(() => buildMonthDays(cursor), [cursor]);
  const selectedEvents = filtered.filter((event) => event.dateISO === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const upcoming = filtered.filter((event) => event.dateISO >= todayISO()).sort((a, b) => `${a.dateISO}${a.startTime}`.localeCompare(`${b.dateISO}${b.startTime}`)).slice(0, 7);
  const detailEvent = normalized.find((event) => event.id === detailId);

  const saveEvent = (data) => {
    if (editor?.id) {
      updateEvent(editor.id, { ...data, history: [...(editor.history || []), { id: Date.now(), action: 'Đã chỉnh sửa hoạt động', time: new Date().toLocaleString('vi-VN') }] });
      setToast('Đã cập nhật hoạt động.');
    } else {
      const id = Date.now();
      setEvents((items) => [{ ...data, id, history: [{ id: `${id}-created`, action: 'Đã tạo hoạt động', time: new Date().toLocaleString('vi-VN') }] }, ...items]);
      setToast('Đã tạo hoạt động mới.');
    }
    setSelectedDate(data.dateISO);
    setCursor(new Date(`${data.dateISO}T12:00:00`));
    setEditor(null);
  };

  const moveCursor = (direction) => {
    const next = new Date(cursor);
    if (view === 'Tháng') next.setMonth(next.getMonth() + direction);
    else if (view === 'Tuần') next.setDate(next.getDate() + direction * 7);
    else next.setDate(next.getDate() + direction);
    setCursor(next);
    setSelectedDate(isoDate(next));
  };

  const visibleDays = view === 'Tháng' ? monthDays : view === 'Tuần'
    ? Array.from({ length: 7 }, (_, index) => {
      const date = new Date(cursor);
      const weekday = date.getDay() || 7;
      date.setDate(date.getDate() - weekday + 1 + index);
      return { dateISO: isoDate(date), date, currentMonth: true };
    })
    : [{ dateISO: isoDate(cursor), date: cursor, currentMonth: true }];

  return <div className="cw-page">
    <header className="cw-heading"><div><span>LỊCH TỔ CHUYÊN MÔN</span><h1>Lịch công tác và hoạt động</h1><p>Quản lý lịch họp, sinh hoạt chuyên môn, dự giờ, thao giảng, kiểm tra hồ sơ và các hạn công việc của tổ.</p></div><button className="cw-primary" onClick={() => setEditor({ mode: 'create' })}><Icon name="plus"/> Tạo hoạt động</button></header>

    <section className="cw-toolbar"><div className="cw-period-nav"><button aria-label="Kỳ trước" onClick={() => moveCursor(-1)}><Icon name="left"/></button><button className="cw-today" onClick={() => { const now = new Date(); setCursor(now); setSelectedDate(isoDate(now)); }}>Hôm nay</button><button aria-label="Kỳ sau" onClick={() => moveCursor(1)}><Icon name="right"/></button><strong>{view === 'Tháng' ? monthLabel(cursor) : formatDate(isoDate(cursor))}</strong></div><div className="cw-toolbar-right"><label className="cw-search"><Icon name="search"/><input aria-label="Tìm hoạt động" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm hoạt động..."/></label><select aria-label="Lọc loại hoạt động" value={type} onChange={(event) => setType(event.target.value)}><option>Tất cả</option>{TYPES.map((item) => <option key={item}>{item}</option>)}</select><div className="cw-view-switch">{['Tháng', 'Tuần', 'Ngày'].map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item}</button>)}</div></div></section>

    <div className="cw-layout">
      <section className={`cw-calendar cw-${view.toLowerCase()}`}>
        <div className="cw-weekdays">{(view === 'Ngày' ? ['Ngày đã chọn'] : ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']).map((day) => <span key={day}>{day}</span>)}</div>
        <div className="cw-day-grid">{visibleDays.map((day) => {
          const dayEvents = filtered.filter((event) => sameDay(event.dateISO, day.dateISO)).sort((a, b) => a.startTime.localeCompare(b.startTime));
          const selected = selectedDate === day.dateISO;
          const today = todayISO() === day.dateISO;
          return <article key={day.dateISO} className={`${day.currentMonth ? '' : 'muted'} ${selected ? 'selected' : ''}`} onClick={() => setSelectedDate(day.dateISO)}>
            <header><button className={today ? 'today' : ''} onClick={(eventObject) => { eventObject.stopPropagation(); setSelectedDate(day.dateISO); }}>{day.date.getDate()}</button><small>{dayEvents.length || ''}</small></header>
            <div>{dayEvents.slice(0, view === 'Tháng' ? 3 : 8).map((event) => <button key={event.id} className={`cw-event-chip cw-${TYPE_TONE[event.type]}`} onClick={(eventObject) => { eventObject.stopPropagation(); setDetailId(event.id); }}><time>{event.startTime}</time><span>{event.title}</span></button>)}{dayEvents.length > 3 && view === 'Tháng' && <button className="cw-more" onClick={(eventObject) => { eventObject.stopPropagation(); setSelectedDate(day.dateISO); }}>+{dayEvents.length - 3} hoạt động</button>}</div>
          </article>;
        })}</div>
      </section>

      <aside className="cw-side-panel">
        <header><div><span>{formatDate(selectedDate)}</span><h2>Hoạt động trong ngày</h2></div><button onClick={() => setEditor({ mode: 'create', dateISO: selectedDate })} aria-label="Thêm hoạt động ngày đã chọn"><Icon name="plus"/></button></header>
        <div className="cw-selected-list">{selectedEvents.length ? selectedEvents.map((event) => <button key={event.id} onClick={() => setDetailId(event.id)}><i className={`cw-${TYPE_TONE[event.type]}`}/><time>{event.startTime}</time><span><strong>{event.title}</strong><small>{event.location}</small></span></button>) : <div className="cw-empty-day"><Icon name="calendar" size={28}/><strong>Chưa có hoạt động</strong><small>Tạo một hoạt động mới cho ngày này.</small></div>}</div>
        <section className="cw-upcoming"><h3>7 hoạt động sắp tới</h3>{upcoming.map((event) => <button key={event.id} onClick={() => { setSelectedDate(event.dateISO); setCursor(new Date(`${event.dateISO}T12:00:00`)); setDetailId(event.id); }}><span><strong>{new Date(`${event.dateISO}T12:00:00`).getDate()}</strong><small>Th{new Date(`${event.dateISO}T12:00:00`).getMonth() + 1}</small></span><div><strong>{event.title}</strong><small>{event.startTime} · {event.type}</small></div></button>)}</section>
      </aside>
    </div>

    {editor && <EventForm event={editor.mode === 'create' ? null : editor} selectedDate={editor.dateISO || selectedDate} onClose={() => setEditor(null)} onSave={saveEvent}/>}
    {detailEvent && <EventDetail event={detailEvent} onClose={() => setDetailId(null)} onEdit={(item) => { setDetailId(null); setEditor(item); }} onDelete={deleteEvent} setToast={setToast}/>}
  </div>;
}

export const createDefaultCalendarEvents = () => [
  { id: 1, title: 'Họp tổ chuyên môn tháng 8', type: 'Họp tổ', dateISO: relativeDate(2), startTime: '08:00', endTime: '09:30', location: 'Phòng Hub Chuyên môn', attendees: ['Toàn tổ'], description: 'Thống nhất kế hoạch tháng và phân công nhiệm vụ.', reminder: 30, attachments: [] },
  { id: 2, title: 'Dự giờ lớp 11A1', type: 'Dự giờ', dateISO: relativeDate(4), startTime: '09:45', endTime: '10:30', location: 'Lớp 11A1', attendees: ['Chưa phân công', 'Chưa phân công'], description: 'Dự giờ tiết đọc hiểu và góp ý sau tiết dạy.', reminder: 60, attachments: [] },
  { id: 3, title: 'Sinh hoạt chuyên đề AI', type: 'Sinh hoạt chuyên môn', dateISO: relativeDate(7), startTime: '14:00', endTime: '16:00', location: 'Phòng đa năng', attendees: ['Toàn tổ'], description: 'Chia sẻ quy trình ứng dụng AI trong thiết kế hoạt động học.', reminder: 1440, attachments: [] },
  { id: 4, title: 'Hạn nộp báo cáo tháng', type: 'Nộp báo cáo', dateISO: relativeDate(10), startTime: '16:30', endTime: '17:00', location: 'Trực tuyến', attendees: ['Toàn tổ'], description: 'Nộp báo cáo tiến độ chuyên môn tháng.', reminder: 1440, attachments: [] },
];
