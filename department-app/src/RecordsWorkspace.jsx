import React, { useMemo, useRef, useState } from 'react';
import './records-workspace.css';

const PEOPLE = ['Nguyễn Thị Mai', 'Trần Minh Đức', 'Phạm Thu Hà', 'Lê Hoàng Nam', 'Đỗ Thị Hương'];
const STATUSES = ['Chờ duyệt', 'Cần chỉnh sửa', 'Đã duyệt', 'Đã lưu kho'];
const TYPES = ['Kế hoạch bài dạy', 'Báo cáo', 'Sáng kiến', 'Minh chứng', 'Khác'];

const statusClass = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const initials = (name = '') => name.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase();
const todayISO = () => new Date().toISOString().slice(0, 10);
const toISODate = (value) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
};
const formatDate = (value) => {
  const iso = toISODate(value);
  if (!iso) return value || 'Chưa cập nhật';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};
const inferType = (title = '') => {
  const text = title.toLowerCase();
  if (text.includes('kế hoạch') || text.includes('giáo án')) return 'Kế hoạch bài dạy';
  if (text.includes('báo cáo')) return 'Báo cáo';
  if (text.includes('sáng kiến')) return 'Sáng kiến';
  if (text.includes('minh chứng')) return 'Minh chứng';
  return 'Khác';
};

function normalizeRecord(record) {
  const submittedISO = toISODate(record.submittedISO || record.date) || todayISO();
  const type = record.type || inferType(record.title);
  const attachments = Array.isArray(record.attachments) ? record.attachments : [{
    id: `${record.id}-file`,
    name: `${String(record.title || 'ho-so').replace(/[\\/:*?"<>|]/g, '-').slice(0, 52)}.pdf`,
    size: 168000,
    type: 'application/pdf',
  }];
  return {
    ...record,
    owner: record.owner || 'Nguyễn Thị Mai',
    status: STATUSES.includes(record.status) ? record.status : 'Chờ duyệt',
    type,
    description: record.description || 'Hồ sơ chuyên môn được nộp để tổ trưởng kiểm tra, phản hồi và phê duyệt.',
    submittedISO,
    date: formatDate(submittedISO),
    updatedISO: toISODate(record.updatedISO) || submittedISO,
    reviewer: record.reviewer || (record.status === 'Đã duyệt' ? 'Demo Teacher Admin' : 'Chưa phân công'),
    attachments,
    comments: Array.isArray(record.comments) ? record.comments : [],
    history: Array.isArray(record.history) ? record.history : [{
      id: `${record.id}-submitted`,
      action: 'Hồ sơ được nộp',
      actor: record.owner || 'Giáo viên',
      time: formatDate(submittedISO),
    }],
  };
}

function Icon({ name, size = 18 }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    folder: <><path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2"/></>,
    file: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 13h8M8 17h6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    edit: <><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m14 6 3 3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    archive: <><path d="M4 7h16v13H4zM3 4h18v3H3z"/><path d="M9 11h6"/></>,
    message: <><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 13h5"/></>,
    paperclip: <path d="m8 12 6-6a4 4 0 0 1 6 6l-8 8a6 6 0 0 1-8-8l8-8"/>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Metric({ label, value, note, tone }) {
  return <article className={`rw-metric rw-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function RecordForm({ record, onClose, onSave }) {
  const normalized = record ? normalizeRecord(record) : null;
  const [form, setForm] = useState(() => ({
    title: normalized?.title || '',
    owner: normalized?.owner || PEOPLE[0],
    type: normalized?.type || TYPES[0],
    submittedISO: normalized?.submittedISO || todayISO(),
    description: normalized?.description || '',
    attachments: normalized?.attachments || [],
  }));
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const addFiles = (files) => {
    const incoming = [...files].map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type || 'Tệp đính kèm',
    }));
    setForm((current) => ({ ...current, attachments: [...current.attachments, ...incoming] }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) { setError('Vui lòng nhập tên hồ sơ.'); return; }
    if (!form.attachments.length) { setError('Vui lòng đính kèm ít nhất một tệp.'); return; }
    onSave({
      ...normalized,
      title: form.title.trim(),
      owner: form.owner,
      type: form.type,
      submittedISO: form.submittedISO,
      date: formatDate(form.submittedISO),
      updatedISO: todayISO(),
      description: form.description.trim() || 'Chưa có mô tả chi tiết.',
      attachments: form.attachments,
    });
  };

  return <div className="rw-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="rw-modal" onSubmit={submit} data-testid="record-editor-modal">
      <header><div><span>HỒ SƠ CHUYÊN MÔN</span><h2>{record ? 'Chỉnh sửa hồ sơ' : 'Nộp hồ sơ mới'}</h2><p>Thông tin hồ sơ và tệp đính kèm sẽ được lưu trong bản thử nghiệm cục bộ.</p></div><button type="button" className="rw-icon-button" onClick={onClose} aria-label="Đóng biểu mẫu"><Icon name="close"/></button></header>
      <div className="rw-form-grid">
        <label className="rw-span-2">Tên hồ sơ<input autoFocus aria-label="Tên hồ sơ" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Kế hoạch bài dạy Unit 3 – Lớp 11A1"/></label>
        <label>Người nộp<select aria-label="Người nộp" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })}>{PEOPLE.map((person) => <option key={person}>{person}</option>)}</select></label>
        <label>Loại hồ sơ<select aria-label="Loại hồ sơ" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Ngày nộp<input aria-label="Ngày nộp" type="date" value={form.submittedISO} onChange={(event) => setForm({ ...form, submittedISO: event.target.value })}/></label>
        <label className="rw-span-2">Mô tả hồ sơ<textarea aria-label="Mô tả hồ sơ" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Nêu nội dung, phạm vi và lưu ý khi phê duyệt..."/></label>
        <div className="rw-span-2 rw-file-field"><div><strong>Tệp đính kèm</strong><small>PDF, Word, hình ảnh hoặc tệp minh chứng.</small></div><button type="button" onClick={() => fileRef.current?.click()}><Icon name="paperclip"/> Chọn tệp</button><input ref={fileRef} hidden type="file" multiple onChange={(event) => addFiles(event.target.files)}/></div>
        {form.attachments.length > 0 && <div className="rw-span-2 rw-file-list">{form.attachments.map((file) => <span key={file.id}><Icon name="paperclip" size={15}/>{file.name}<button type="button" aria-label={`Xóa tệp ${file.name}`} onClick={() => setForm((current) => ({ ...current, attachments: current.attachments.filter((item) => item.id !== file.id) }))}>×</button></span>)}</div>}
      </div>
      {error && <p className="rw-form-error" role="alert">{error}</p>}
      <footer><button type="button" onClick={onClose}>Hủy</button><button className="rw-primary" type="submit">{record ? 'Lưu thay đổi' : 'Nộp hồ sơ'}</button></footer>
    </form>
  </div>;
}

function RecordDetail({ record, onClose, onEdit, onUpdate, onDelete, setToast }) {
  const item = normalizeRecord(record);
  const [comment, setComment] = useState('');

  const setStatus = (status, action) => {
    const now = new Date().toLocaleString('vi-VN');
    onUpdate(item.id, {
      status,
      reviewer: 'Demo Teacher Admin',
      updatedISO: todayISO(),
      history: [...item.history, { id: Date.now(), action, actor: 'Demo Teacher Admin', time: now }],
    });
    setToast(action);
  };

  const addComment = () => {
    if (!comment.trim()) return;
    const now = new Date().toLocaleString('vi-VN');
    const entry = { id: Date.now(), author: 'Demo Teacher Admin', text: comment.trim(), time: now };
    onUpdate(item.id, {
      comments: [...item.comments, entry],
      history: [...item.history, { id: `${entry.id}-history`, action: 'Đã thêm nhận xét', actor: entry.author, time: now }],
    });
    setComment('');
    setToast('Đã lưu nhận xét hồ sơ.');
  };

  return <div className="rw-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="rw-detail" data-testid="record-detail-panel">
      <header><div><span className={`rw-status rw-${statusClass(item.status)}`}>{item.status}</span><h2>{item.title}</h2><p>{item.description}</p></div><button className="rw-icon-button" onClick={onClose} aria-label="Đóng chi tiết hồ sơ"><Icon name="close"/></button></header>
      <div className="rw-detail-actions"><button onClick={() => onEdit(item)}><Icon name="edit"/> Chỉnh sửa</button>{item.status !== 'Đã duyệt' && item.status !== 'Đã lưu kho' && <button className="success" onClick={() => setStatus('Đã duyệt', 'Đã phê duyệt hồ sơ') }><Icon name="check"/> Duyệt</button>}<button className="warning" onClick={() => setStatus('Cần chỉnh sửa', 'Đã yêu cầu giáo viên chỉnh sửa hồ sơ')}>Yêu cầu sửa</button>{item.status === 'Đã duyệt' && <button onClick={() => setStatus('Đã lưu kho', 'Đã lưu hồ sơ vào kho chuyên môn')}><Icon name="archive"/> Lưu kho</button>}<button className="danger" onClick={() => { if (window.confirm('Xóa hồ sơ này?')) { onDelete(item.id); onClose(); } }}><Icon name="trash"/> Xóa</button></div>
      <section className="rw-detail-summary"><article><span>Người nộp</span><strong>{item.owner}</strong></article><article><span>Loại hồ sơ</span><strong>{item.type}</strong></article><article><span>Ngày nộp</span><strong>{formatDate(item.submittedISO)}</strong></article><article><span>Người duyệt</span><strong>{item.reviewer}</strong></article></section>
      <section><h3>Tệp đính kèm <small>{item.attachments.length}</small></h3><div className="rw-attachments">{item.attachments.map((file) => <button key={file.id} onClick={() => setToast(`Tệp ${file.name} đang ở chế độ dữ liệu mẫu.`)}><Icon name="file"/><span><strong>{file.name}</strong><small>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : file.type}</small></span><Icon name="arrow"/></button>)}</div></section>
      <section><h3>Nhận xét và phản hồi <small>{item.comments.length}</small></h3><div className="rw-comment-list">{item.comments.length ? item.comments.map((entry) => <article key={entry.id}><span>AT</span><div><strong>{entry.author}</strong><time>{entry.time}</time><p>{entry.text}</p></div></article>) : <p className="rw-empty-small">Chưa có nhận xét.</p>}</div><div className="rw-comment-compose"><textarea aria-label="Nhận xét hồ sơ" rows="3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Nhập nhận xét hoặc nội dung cần chỉnh sửa..."/><button onClick={addComment}>Gửi nhận xét</button></div></section>
      <section><h3>Lịch sử xử lý</h3><div className="rw-history">{item.history.slice().reverse().map((entry) => <article key={entry.id}><i/><div><strong>{entry.action}</strong><small>{entry.actor} · {entry.time}</small></div></article>)}</div></section>
    </aside>
  </div>;
}

function RecordRow({ record, selected, onSelect, onOpen, onEdit, onUpdate, onDelete, setToast }) {
  const item = normalizeRecord(record);
  const [menuOpen, setMenuOpen] = useState(false);
  const approve = () => {
    onUpdate(item.id, {
      status: 'Đã duyệt',
      reviewer: 'Demo Teacher Admin',
      updatedISO: todayISO(),
      history: [...item.history, { id: Date.now(), action: 'Đã phê duyệt hồ sơ', actor: 'Demo Teacher Admin', time: new Date().toLocaleString('vi-VN') }],
    });
    setToast(`Đã duyệt ${item.title}.`);
    setMenuOpen(false);
  };
  return <article className={`rw-record-row ${selected ? 'selected' : ''}`} data-testid={`record-${item.id}`}>
    <label className="rw-row-check"><input aria-label={`Chọn ${item.title}`} type="checkbox" checked={selected} onChange={() => onSelect(item.id)}/></label>
    <button className="rw-record-main" onClick={() => onOpen(item)}><span className="rw-avatar">{initials(item.owner)}</span><span><strong>{item.title}</strong><small>{item.owner}</small></span></button>
    <span className="rw-type">{item.type}</span>
    <span className={`rw-status rw-${statusClass(item.status)}`}>{item.status}</span>
    <span className="rw-date"><small>Ngày nộp</small><strong>{formatDate(item.submittedISO)}</strong></span>
    <span className="rw-file-count"><Icon name="paperclip" size={16}/>{item.attachments.length}</span>
    <div className="rw-row-menu"><button aria-label={`Tùy chọn ${item.title}`} onClick={() => setMenuOpen((value) => !value)}><Icon name="more"/></button>{menuOpen && <div><button onClick={() => onOpen(item)}>Xem chi tiết</button><button onClick={() => { onEdit(item); setMenuOpen(false); }}>Chỉnh sửa</button>{item.status !== 'Đã duyệt' && item.status !== 'Đã lưu kho' && <button onClick={approve}>Duyệt hồ sơ</button>}<button onClick={() => { onUpdate(item.id, { status: 'Cần chỉnh sửa' }); setToast('Đã yêu cầu chỉnh sửa.'); setMenuOpen(false); }}>Yêu cầu sửa</button><button className="danger" onClick={() => { if (window.confirm('Xóa hồ sơ này?')) onDelete(item.id); setMenuOpen(false); }}>Xóa hồ sơ</button></div>}</div>
  </article>;
}

export default function RecordsWorkspace({ records, setRecords, updateRecord, deleteRecord, setToast }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Tất cả');
  const [owner, setOwner] = useState('Tất cả');
  const [type, setType] = useState('Tất cả');
  const [sort, setSort] = useState('Mới nộp nhất');
  const [editor, setEditor] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [selected, setSelected] = useState([]);

  const normalized = useMemo(() => records.map(normalizeRecord), [records]);
  const visible = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return normalized.filter((record) => (!lowered || `${record.title} ${record.owner} ${record.type} ${record.description}`.toLowerCase().includes(lowered))
      && (status === 'Tất cả' || record.status === status)
      && (owner === 'Tất cả' || record.owner === owner)
      && (type === 'Tất cả' || record.type === type))
      .sort((a, b) => {
        if (sort === 'Tên A–Z') return a.title.localeCompare(b.title, 'vi');
        if (sort === 'Người nộp') return a.owner.localeCompare(b.owner, 'vi');
        if (sort === 'Cũ nhất') return a.submittedISO.localeCompare(b.submittedISO);
        return b.submittedISO.localeCompare(a.submittedISO);
      });
  }, [normalized, query, status, owner, type, sort]);

  const detailRecord = normalized.find((record) => record.id === detailId);
  const pendingCount = normalized.filter((record) => record.status === 'Chờ duyệt').length;
  const revisionCount = normalized.filter((record) => record.status === 'Cần chỉnh sửa').length;
  const approvedCount = normalized.filter((record) => record.status === 'Đã duyệt').length;
  const archivedCount = normalized.filter((record) => record.status === 'Đã lưu kho').length;

  const saveRecord = (data) => {
    if (editor?.id) {
      updateRecord(editor.id, {
        ...data,
        history: [...(editor.history || []), { id: Date.now(), action: 'Đã chỉnh sửa thông tin hồ sơ', actor: 'Demo Teacher Admin', time: new Date().toLocaleString('vi-VN') }],
      });
      setToast('Đã lưu thay đổi hồ sơ.');
    } else {
      const id = Date.now();
      const record = normalizeRecord({
        ...data,
        id,
        status: 'Chờ duyệt',
        reviewer: 'Chưa phân công',
        comments: [],
        history: [{ id: `${id}-submitted`, action: 'Hồ sơ được nộp', actor: data.owner, time: new Date().toLocaleString('vi-VN') }],
      });
      setRecords((items) => [record, ...items]);
      setToast('Đã nộp hồ sơ mới.');
    }
    setEditor(null);
  };

  const bulkStatus = (nextStatus) => {
    if (!selected.length) return;
    const now = new Date().toLocaleString('vi-VN');
    setRecords((items) => items.map((record) => selected.includes(record.id) ? {
      ...record,
      status: nextStatus,
      reviewer: 'Demo Teacher Admin',
      updatedISO: todayISO(),
      history: [...(record.history || []), { id: `${Date.now()}-${record.id}`, action: `Đã chuyển hồ sơ sang ${nextStatus}`, actor: 'Demo Teacher Admin', time: now }],
    } : record));
    const count = selected.length;
    setSelected([]);
    setToast(`Đã cập nhật ${count} hồ sơ.`);
  };

  const clearFilters = () => { setQuery(''); setStatus('Tất cả'); setOwner('Tất cả'); setType('Tất cả'); setSort('Mới nộp nhất'); };

  return <div className="rw-page">
    <header className="rw-heading"><div><span>TRUNG TÂM HỒ SƠ</span><h1>Nộp và phê duyệt hồ sơ</h1><p>Theo dõi trọn quy trình từ khi giáo viên nộp tệp, TTCM kiểm tra, yêu cầu chỉnh sửa, phê duyệt đến lưu kho chuyên môn.</p></div><button className="rw-primary" onClick={() => setEditor({ mode: 'create' })}><Icon name="plus"/> Nộp hồ sơ</button></header>
    <section className="rw-metrics"><Metric label="Chờ duyệt" value={pendingCount} note="Cần TTCM xử lý" tone="orange"/><Metric label="Cần chỉnh sửa" value={revisionCount} note="Đang chờ giáo viên" tone="red"/><Metric label="Đã duyệt" value={approvedCount} note="Sẵn sàng lưu kho" tone="green"/><Metric label="Đã lưu kho" value={archivedCount} note={`${normalized.length} hồ sơ tổng cộng`} tone="blue"/></section>
    <section className="rw-panel">
      <div className="rw-toolbar"><label className="rw-search"><Icon name="search"/><input aria-label="Tìm hồ sơ" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hồ sơ, giáo viên, loại..."/></label><select aria-label="Lọc trạng thái hồ sơ" value={status} onChange={(event) => setStatus(event.target.value)}><option>Tất cả</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Lọc người nộp" value={owner} onChange={(event) => setOwner(event.target.value)}><option>Tất cả</option>{PEOPLE.map((person) => <option key={person}>{person}</option>)}</select><select aria-label="Lọc loại hồ sơ" value={type} onChange={(event) => setType(event.target.value)}><option>Tất cả</option>{TYPES.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Sắp xếp hồ sơ" value={sort} onChange={(event) => setSort(event.target.value)}>{['Mới nộp nhất', 'Cũ nhất', 'Tên A–Z', 'Người nộp'].map((item) => <option key={item}>{item}</option>)}</select><button className="rw-clear" onClick={clearFilters}>Đặt lại</button></div>
      {selected.length > 0 && <div className="rw-bulk"><strong>Đã chọn {selected.length} hồ sơ</strong><button onClick={() => bulkStatus('Đã duyệt')}>Duyệt</button><button onClick={() => bulkStatus('Cần chỉnh sửa')}>Yêu cầu sửa</button><button onClick={() => bulkStatus('Đã lưu kho')}>Lưu kho</button><button onClick={() => setSelected([])}>Bỏ chọn</button></div>}
      <div className="rw-table-head"><span/><span>Hồ sơ / Người nộp</span><span>Loại hồ sơ</span><span>Trạng thái</span><span>Ngày nộp</span><span>Tệp</span><span/></div>
      <div className="rw-record-list">{visible.map((record) => <RecordRow key={record.id} record={record} selected={selected.includes(record.id)} onSelect={(id) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])} onOpen={(item) => setDetailId(item.id)} onEdit={(item) => setEditor(item)} onUpdate={updateRecord} onDelete={deleteRecord} setToast={setToast}/>)}</div>
      {!visible.length && <div className="rw-empty"><span><Icon name="folder" size={30}/></span><h2>Không tìm thấy hồ sơ</h2><p>Điều chỉnh bộ lọc hoặc nộp một hồ sơ mới.</p><button onClick={clearFilters}>Xóa bộ lọc</button></div>}
      <footer className="rw-panel-footer"><span>Hiển thị <strong>{visible.length}</strong> trong tổng số <strong>{normalized.length}</strong> hồ sơ</span><span>Quy trình: Nộp → Kiểm tra → Chỉnh sửa/Duyệt → Lưu kho</span></footer>
    </section>
    {editor && <RecordForm record={editor.mode === 'create' ? null : editor} onClose={() => setEditor(null)} onSave={saveRecord}/>} 
    {detailRecord && <RecordDetail record={detailRecord} onClose={() => setDetailId(null)} onEdit={(item) => { setDetailId(null); setEditor(item); }} onUpdate={updateRecord} onDelete={deleteRecord} setToast={setToast}/>} 
  </div>;
}
