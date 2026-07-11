import React, { useEffect, useMemo, useRef, useState } from 'react';
import { callAI, extractJson } from '../utils/gemini.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { canPublishDepartment } from '../utils/permissions.js';
import { getAccessToken, loadResourceLibrary, RESOURCE_EVENT, resourceId, saveResourceLibrary, sha256, syncResourcesFromCloud, updateResourceLibrary, upsertResourceCloud } from '../utils/resourceLibrary.js';

const SKILLS = ['Vocabulary', 'Grammar', 'Reading', 'Listening', 'Speaking', 'Writing', 'Pronunciation'];
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.html,.zip,.mp3,.wav,.m4a,.mp4,.mov,.png,.jpg,.jpeg';
const DEFAULT_FORM = { title: '', description: '', category: 'professional', grade: '', cefr: '', skills: [], tags: '', source: '', copyright: 'internal', visibility: 'department', allowDownload: true };

function formatSize(bytes = 0) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB']; let n = bytes; let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
}
function formatDate(value) { try { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); } catch { return value || ''; } }
function isLeader(user) { return canPublishDepartment(user) || ['admin', 'ttcm', 'department_leader', 'to_truong'].includes(String(user?.role || '').toLowerCase()); }

async function extractFileText(file) {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.pdf')) return readPdfTextFromBuffer(buffer, { maxPages: 25, maxChars: 50000 });
  if (name.endsWith('.docx')) return readDocxTextFromBuffer(buffer);
  if (/\.(txt|md|csv|html)$/i.test(name)) return new TextDecoder().decode(buffer).slice(0, 50000);
  return '';
}

function ResourceCard({ item, language, manager, currentUser, onPreview, onApprove, onReject, onFavorite, onOpenApp }) {
  const mine = item.uploaderId === currentUser?.id || item.uploaderName === currentUser?.email;
  return <article className="resource-library-card">
    <div className="resource-file-icon">{item.mimeType?.includes('pdf') ? 'PDF' : item.fileName?.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE'}</div>
    <div className="resource-card-main">
      <div className="resource-card-top"><span className={`resource-status status-${item.status}`}>{item.status === 'approved' ? 'Đã duyệt' : item.status === 'rejected' ? 'Từ chối' : item.status === 'revision' ? 'Cần sửa' : 'Chờ duyệt'}</span><span>{formatSize(item.size)}</span></div>
      <h3>{item.title || item.fileName}</h3>
      <p>{item.aiSummary || item.description || 'Chưa có mô tả.'}</p>
      <div className="resource-meta-row"><span>{item.category}</span>{item.grade && <span>Khối {item.grade}</span>}{item.cefr && <span>{item.cefr}</span>}<span>{item.uploaderName || 'Giáo viên'}</span></div>
      <div className="resource-tags">{(item.tags || []).slice(0, 5).map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="resource-card-actions">
        <button onClick={() => onPreview(item)}>Xem trước</button>
        {item.driveWebViewLink && <a href={item.driveWebViewLink} target="_blank" rel="noreferrer">Mở Drive ↗</a>}
        {item.allowDownload && item.driveDownloadLink && <a href={item.driveDownloadLink} target="_blank" rel="noreferrer">Tải xuống</a>}
        <button onClick={() => onFavorite(item)}>☆ Yêu thích</button>
        <button onClick={() => onOpenApp(item)}>Mở bằng app</button>
        {manager && item.status === 'pending' && <><button className="approve" onClick={() => onApprove(item)}>Duyệt</button><button className="reject" onClick={() => onReject(item)}>Yêu cầu sửa</button></>}
        {(manager || mine) && item.status === 'revision' && <span className="resource-inline-note">Có thể chỉnh metadata và gửi lại</span>}
      </div>
    </div>
  </article>;
}

export default function ResourceLibrary({ language = 'vi', currentUser, hasApiKey }) {
  const manager = isLeader(currentUser);
  const [store, setStore] = useState(loadResourceLibrary);
  const [tab, setTab] = useState('explore');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [driveMessage, setDriveMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const refresh = () => setStore(loadResourceLibrary());
    window.addEventListener(RESOURCE_EVENT, refresh);
    syncResourcesFromCloud().then(refresh).catch(() => {});
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    if (params.get('drive') === 'connected') setDriveMessage('Google Drive đã kết nối thành công.');
    return () => window.removeEventListener(RESOURCE_EVENT, refresh);
  }, []);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.items.filter((item) => {
      const access = item.status === 'approved' || manager || item.uploaderId === currentUser?.id || item.uploaderName === currentUser?.email;
      const tabOk = tab === 'mine' ? (item.uploaderId === currentUser?.id || item.uploaderName === currentUser?.email) : tab === 'pending' ? item.status !== 'approved' : true;
      const catOk = category === 'all' || item.category === category;
      const text = `${item.title} ${item.description} ${item.aiSummary} ${(item.tags || []).join(' ')} ${item.extractedText || ''}`.toLowerCase();
      return access && tabOk && catOk && (!q || text.includes(q));
    });
  }, [store.items, query, category, tab, manager, currentUser]);

  const stats = useMemo(() => ({ total: store.items.filter((i) => i.status === 'approved').length, pending: store.items.filter((i) => i.status === 'pending').length, contributors: new Set(store.items.map((i) => i.uploaderName).filter(Boolean)).size, size: store.items.reduce((s, i) => s + Number(i.size || 0), 0) }), [store.items]);

  const connectDrive = async () => {
    setDriveMessage('Đang tạo liên kết Google Drive…');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/google-drive-connect', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể kết nối');
      window.location.href = data.url;
    } catch (error) { setDriveMessage(`${error.message}. Hãy cấu hình Google OAuth theo tài liệu SETUP.`); }
  };

  const analyzeFiles = async () => {
    if (!files.length) return;
    setBusy('AI đang đọc và phân loại tài liệu…'); setProgress(12);
    try {
      const text = await extractFileText(files[0]); setProgress(40);
      const raw = await callAI({
        prompt: `Phân loại tài nguyên dạy học tiếng Anh. Trả JSON gồm title, description, category (books|lesson-plans|worksheets|tests|slides|media|professional|games|forms|internal), grade, cefr, skills[], tags[], source, aiUses[]. Không bịa nguồn.\nTên file: ${files[0].name}\nNội dung:\n${text.slice(0, 18000)}`,
        responseMimeType: 'application/json', temperature: 0.15, maxOutputTokens: 700, loadingLabel: 'AI đang phân loại học liệu…',
      });
      const data = extractJson(raw) || {};
      setForm((old) => ({ ...old, title: data.title || files[0].name.replace(/\.[^.]+$/, ''), description: data.description || '', category: data.category || old.category, grade: data.grade || '', cefr: data.cefr || '', skills: Array.isArray(data.skills) ? data.skills : [], tags: Array.isArray(data.tags) ? data.tags.join(', ') : '', source: data.source || '', aiUses: data.aiUses || [], extractedText: text }));
      setProgress(100);
    } catch (error) { setDriveMessage(`AI chưa phân loại được: ${error.message}`); }
    finally { setBusy(''); setTimeout(() => setProgress(0), 800); }
  };

  const uploadOne = async (file, metadata) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Cần đăng nhập Supabase để tải lên Drive');
    const response = await fetch('/api/google-drive-upload', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), 'X-Resource-Metadata': btoa(unescape(encodeURIComponent(JSON.stringify(metadata)))) }, body: file,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Drive upload failed');
    return data;
  };

  const saveUpload = async () => {
    if (!files.length || !form.title.trim()) return;
    setBusy('Đang lưu tài liệu vào thư mục chờ duyệt…'); setProgress(5);
    const created = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const checksum = await sha256(file);
        const duplicate = store.items.find((item) => item.checksum === checksum);
        const base = { id: resourceId(), title: files.length === 1 ? form.title : `${form.title} – ${file.name}`, description: form.description, category: form.category, grade: form.grade, cefr: form.cefr, skills: form.skills, tags: form.tags.split(',').map((v) => v.trim()).filter(Boolean), source: form.source, copyright: form.copyright, visibility: form.visibility, allowDownload: form.allowDownload, status: 'pending', uploaderId: currentUser?.id, uploaderName: currentUser?.name || currentUser?.email || 'Giáo viên', mimeType: file.type, fileName: file.name, size: file.size, checksum, aiSummary: form.description, aiUses: form.aiUses || [], extractedText: form.extractedText || '', version: duplicate ? Number(duplicate.version || 1) + 1 : 1, parentResourceId: duplicate?.id || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), storageMode: 'local' };
        let uploaded = {};
        try { uploaded = await uploadOne(file, base); base.storageMode = 'cloud'; }
        catch (error) { base.uploadWarning = error.message; }
        Object.assign(base, { driveFileId: uploaded.fileId || '', driveWebViewLink: uploaded.webViewLink || '', driveDownloadLink: uploaded.downloadLink || '' });
        const cloud = await upsertResourceCloud(base);
        if (cloud.ok) Object.assign(base, cloud.item);
        created.push(base); setProgress(Math.round(((index + 1) / files.length) * 100));
      }
      updateResourceLibrary((draft) => { draft.items.unshift(...created); draft.activity.unshift({ id: resourceId('log'), type: 'upload', actor: currentUser?.email, at: new Date().toISOString(), count: created.length }); });
      setShowUpload(false); setFiles([]); setForm(DEFAULT_FORM); setDriveMessage(`${created.length} tài liệu đã được lưu${created.some((x) => x.uploadWarning) ? ' cục bộ; Drive chưa hoàn tất' : ' vào Drive và gửi TTCM duyệt'}.`);
    } finally { setBusy(''); setTimeout(() => setProgress(0), 700); }
  };

  const changeStatus = async (item, status) => {
    const updated = { ...item, status, approvedAt: status === 'approved' ? new Date().toISOString() : null, approvedBy: currentUser?.email, updatedAt: new Date().toISOString() };
    updateResourceLibrary((draft) => { const i = draft.items.findIndex((x) => x.id === item.id); if (i >= 0) draft.items[i] = updated; draft.activity.unshift({ id: resourceId('log'), type: status, resourceId: item.id, actor: currentUser?.email, at: new Date().toISOString() }); });
    await upsertResourceCloud(updated);
    if (item.driveFileId) {
      const token = await getAccessToken();
      fetch('/api/google-drive-move', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: item.driveFileId, category: item.category, status }) }).catch(() => {});
    }
  };

  const toggleFavorite = (item) => updateResourceLibrary((draft) => { const key = `${currentUser?.id || currentUser?.email}:${item.id}`; const i = draft.favorites.indexOf(key); if (i >= 0) draft.favorites.splice(i, 1); else draft.favorites.push(key); });

  const askLibrary = async () => {
    if (!aiQuery.trim()) return;
    setBusy('AI đang tìm trong kho học liệu…');
    try {
      const context = visibleItems.slice(0, 25).map((item, i) => `[${i + 1}] ${item.title}\n${item.aiSummary || item.description}\nTags: ${(item.tags || []).join(', ')}\n${String(item.extractedText || '').slice(0, 1200)}`).join('\n\n');
      const answer = await callAI({ prompt: `Bạn là thủ thư chuyên môn tiếng Anh. Chỉ trả lời dựa trên danh mục dưới đây; nêu rõ tên tài liệu phù hợp. Nếu thiếu dữ liệu thì nói rõ.\nCâu hỏi: ${aiQuery}\n\nKHO:\n${context}`, temperature: 0.2, maxOutputTokens: 700, loadingLabel: 'AI đang tìm kiếm kho học liệu…' });
      setAiAnswer(answer);
    } catch (error) { setAiAnswer(error.message); } finally { setBusy(''); }
  };

  const openWithApp = (item) => {
    const map = { tests: 'exam-studio', worksheets: 'textlab-activities', books: 'reading-studio', 'lesson-plans': 'lesson-plan-ai', professional: 'lesson-plan-ai', games: 'game-hub' };
    const slug = map[item.category] || 'textlab-activities';
    try { sessionStorage.setItem('bes-resource-open-item', JSON.stringify(item)); } catch {}
    window.location.hash = `#/tool/${slug}`;
  };

  return <div className="resource-library-page">
    {busy && <div className="resource-busy-overlay"><div className="resource-spinner"/><strong>{busy}</strong>{progress > 0 && <div className="resource-progress"><i style={{ width: `${progress}%` }}/><span>{progress}%</span></div>}</div>}
    <section className="resource-library-hero">
      <div><span className="resource-eyebrow">BRIAN RESOURCE LIBRARY</span><h1>Kho học liệu Tổ Tiếng Anh</h1><p>Giáo viên cùng xây dựng kho sách, giáo án, worksheet, đề kiểm tra và tài nguyên chuyên môn. File gốc được lưu trên Google Drive của TTCM.</p>
        <div className="resource-hero-actions"><button className="primary" onClick={() => setShowUpload(true)}>＋ Tải tài liệu</button>{manager && <button onClick={connectDrive}>⌁ Kết nối Google Drive</button>}<button onClick={() => syncResourcesFromCloud().then(() => setStore(loadResourceLibrary()))}>↻ Đồng bộ</button></div>{driveMessage && <div className="resource-drive-message">{driveMessage}</div>}
      </div>
      <div className="resource-drive-art"><div className="drive-folder back"/><div className="drive-folder front"><b>ENGLISH<br/>RESOURCES</b><span>Google Drive</span></div><div className="resource-floating-file f1">PDF</div><div className="resource-floating-file f2">DOCX</div><div className="resource-floating-file f3">PPTX</div></div>
    </section>

    <section className="resource-stat-grid"><div><b>{stats.total}</b><span>Tài liệu đã duyệt</span></div><div><b>{stats.pending}</b><span>Chờ TTCM duyệt</span></div><div><b>{stats.contributors}</b><span>Giáo viên đóng góp</span></div><div><b>{formatSize(stats.size)}</b><span>Dung lượng quản lý</span></div></section>

    <section className="resource-toolbar"><div className="resource-tabs"><button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>Khám phá</button><button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>Tài liệu của tôi</button>{manager && <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>Chờ duyệt ({stats.pending})</button>}</div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên, chủ đề, kỹ năng hoặc nội dung…"/><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">Tất cả danh mục</option>{store.categories.map((c) => <option key={c.id} value={c.id}>{c.nameVi}</option>)}</select></section>

    <section className="resource-ai-search"><div><span>✦ AI KNOWLEDGE SEARCH</span><h2>Hỏi kho học liệu</h2><p>Tìm tài liệu bằng ngôn ngữ tự nhiên, hỏi nội dung hoặc xin gợi ý cách sử dụng.</p></div><div className="resource-ai-input"><textarea value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} placeholder="Ví dụ: Tìm worksheet Reading B2 cho lớp 12 về multiculturalism…"/><button disabled={!hasApiKey} onClick={askLibrary}>AI tìm kiếm</button></div>{aiAnswer && <div className="resource-ai-answer">{aiAnswer}</div>}</section>

    <section className="resource-library-list">{visibleItems.length ? visibleItems.map((item) => <ResourceCard key={item.id} item={item} language={language} manager={manager} currentUser={currentUser} onPreview={setPreview} onApprove={(x) => changeStatus(x, 'approved')} onReject={(x) => changeStatus(x, 'revision')} onFavorite={toggleFavorite} onOpenApp={openWithApp}/>) : <div className="resource-empty"><b>Chưa có tài liệu phù hợp</b><p>Tải tài liệu đầu tiên hoặc thay đổi bộ lọc.</p></div>}</section>

    {showUpload && <div className="resource-modal-backdrop"><section className="resource-upload-modal"><header><div><span>UPLOAD TO TTCM DRIVE</span><h2>Tải tài liệu vào kho dùng chung</h2></div><button onClick={() => setShowUpload(false)}>×</button></header><div className="resource-upload-grid"><div className="resource-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFiles([...e.dataTransfer.files]); }}><input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => setFiles([...e.target.files])}/><b>⇧ Kéo thả tài liệu vào đây</b><span>PDF, Word, PowerPoint, Excel, audio, video, ảnh, HTML, ZIP</span>{files.map((f) => <em key={f.name}>{f.name} · {formatSize(f.size)}</em>)}</div><div className="resource-form"><label>Tên tài liệu<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}/></label><label>Mô tả<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></label><div className="resource-form-row"><label>Danh mục<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{store.categories.map((c) => <option key={c.id} value={c.id}>{c.nameVi}</option>)}</select></label><label>Khối<input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="10, 11, 12…"/></label><label>CEFR<input value={form.cefr} onChange={(e) => setForm({ ...form, cefr: e.target.value })} placeholder="B1–C1"/></label></div><label>Kỹ năng<div className="resource-skill-options">{SKILLS.map((s) => <button type="button" className={form.skills.includes(s) ? 'active' : ''} onClick={() => setForm({ ...form, skills: form.skills.includes(s) ? form.skills.filter((x) => x !== s) : [...form.skills, s] })} key={s}>{s}</button>)}</div></label><label>Từ khóa<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="reading, environment, THPT…"/></label><label>Nguồn / tác giả<input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}/></label><div className="resource-form-row"><label>Bản quyền<select value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })}><option value="self">Tự soạn</option><option value="school">Nhà trường cấp</option><option value="free">Miễn phí / được phép</option><option value="internal">Chỉ dùng nội bộ</option><option value="unknown">Chưa xác định</option></select></label><label>Phạm vi<select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option value="department">Toàn tổ</option><option value="leader">Chỉ TTCM</option><option value="internal">Nội bộ</option></select></label></div></div></div><footer><button onClick={analyzeFiles} disabled={!files.length || !hasApiKey}>✦ AI nhận diện</button><button className="primary" onClick={saveUpload} disabled={!files.length || !form.title.trim()}>Lưu Drive & gửi TTCM duyệt</button></footer></section></div>}

    {preview && <div className="resource-modal-backdrop"><section className="resource-preview-modal"><header><div><span>RESOURCE PREVIEW</span><h2>{preview.title}</h2></div><button onClick={() => setPreview(null)}>×</button></header><div className="resource-preview-body"><aside><div className="resource-file-icon big">{preview.fileName?.split('.').pop()?.toUpperCase()}</div><p>{preview.fileName}</p><small>{formatSize(preview.size)} · {formatDate(preview.createdAt)}</small><dl><dt>Người đóng góp</dt><dd>{preview.uploaderName}</dd><dt>Danh mục</dt><dd>{preview.category}</dd><dt>Khối / CEFR</dt><dd>{preview.grade || '—'} / {preview.cefr || '—'}</dd><dt>Nguồn</dt><dd>{preview.source || 'Chưa khai báo'}</dd></dl></aside><main><h3>Tóm tắt</h3><p>{preview.aiSummary || preview.description}</p><h3>Gợi ý sử dụng</h3><ul>{(preview.aiUses || []).map((x) => <li key={x}>{x}</li>)}</ul>{preview.extractedText && <><h3>Nội dung được lập chỉ mục</h3><pre>{preview.extractedText.slice(0, 8000)}</pre></>}</main></div></section></div>}
  </div>;
}
