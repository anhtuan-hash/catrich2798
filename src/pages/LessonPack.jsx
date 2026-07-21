import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createLessonPack,
  createLessonPackItem,
  deleteLessonPack,
  duplicateLessonPackLocal,
  getActiveLessonPackId,
  itemFromTransfer,
  LESSON_PACK_ITEM_TYPES,
  loadLessonPacks,
  saveLessonPack,
  saveLessonPackLocal,
  setActiveLessonPackId,
  subscribeLessonPacks,
} from '../utils/lessonPack.js';
import { createTransfer, listTransfers, updateTransfer } from '../utils/contentTransfer.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';

const TYPE_LABELS = {
  'warm-up': ['Warm-up', 'Khởi động'], vocabulary: ['Vocabulary', 'Từ vựng'], reading: ['Reading', 'Đọc hiểu'],
  listening: ['Listening', 'Nghe'], grammar: ['Grammar', 'Ngữ pháp'], speaking: ['Speaking', 'Nói'],
  worksheet: ['Worksheet', 'Phiếu học tập'], interactive: ['Interactive', 'Tương tác'], assessment: ['Assessment', 'Đánh giá'],
  homework: ['Homework', 'Bài tập về nhà'], 'exit-ticket': ['Exit ticket', 'Phiếu cuối giờ'], resource: ['Resource', 'Tài nguyên'], other: ['Other', 'Khác'],
};
const MODES = [
  ['teacher-led', 'GV hướng dẫn'], ['individual', 'Cá nhân'], ['pair', 'Cặp đôi'], ['group', 'Nhóm'],
  ['whole-class', 'Cả lớp'], ['homework', 'Ở nhà'],
];
const TARGETS = [
  ['reading-studio', '#/tool/reading-studio', 'Reading Studio'],
  ['assessment-core', '#/assessment-core', 'Assessment Core'],
  ['exam-studio', '#/tool/exam-studio', 'Exam Studio'],
  ['student-practice', '#/practice', 'Learner Sprint'],
];

function label(type, language) { return TYPE_LABELS[type]?.[language === 'vi' ? 1 : 0] || type; }
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function download(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function fileName(value) {
  return String(value || 'lesson-pack').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'lesson-pack';
}
function exportHtml(pack, language) {
  const items = pack.items.map((item, index) => `
    <section class="activity">
      <div class="number">${index + 1}</div>
      <div class="content">
        <div class="meta"><span>${escapeHtml(label(item.type, language))}</span><span>${item.minutes} min</span><span>${escapeHtml(item.mode)}</span></div>
        <h2>${escapeHtml(item.title)}</h2>
        ${item.objective ? `<p><b>${language === 'vi' ? 'Mục tiêu' : 'Objective'}:</b> ${escapeHtml(item.objective)}</p>` : ''}
        <div class="body">${escapeHtml(item.content).replace(/\n/g, '<br>')}</div>
        ${item.support ? `<aside><b>${language === 'vi' ? 'Hỗ trợ' : 'Support'}:</b> ${escapeHtml(item.support)}</aside>` : ''}
        ${item.extension ? `<aside><b>${language === 'vi' ? 'Nâng cao' : 'Extension'}:</b> ${escapeHtml(item.extension)}</aside>` : ''}
      </div>
    </section>`).join('');
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(pack.title)}</title><style>
  *{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#10264a;background:#eef5ff}.page{max-width:1050px;margin:auto;padding:38px}.hero{background:#173f76;color:white;padding:34px;border-radius:24px}.hero h1{font-size:38px;margin:0 0 12px}.hero p{opacity:.86}.summary{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.summary span,.meta span{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.15);font-size:13px}.activity{display:grid;grid-template-columns:48px 1fr;gap:18px;background:white;border:1px solid #c9daf0;border-radius:20px;padding:24px;margin:18px 0}.number{width:42px;height:42px;display:grid;place-items:center;background:#dff7f3;border-radius:14px;font-weight:800}.meta{display:flex;gap:8px;flex-wrap:wrap}.meta span{background:#edf3fc}.activity h2{margin:12px 0}.body{line-height:1.65;white-space:normal}aside{margin-top:14px;padding:12px;background:#fff7e6;border-left:4px solid #ef9b30}@media print{body{background:white}.page{padding:0}.hero{border-radius:0}.activity{break-inside:avoid}}
  </style></head><body><main class="page"><header class="hero"><h1>${escapeHtml(pack.title)}</h1><p>${escapeHtml(pack.objectives)}</p><div class="summary"><span>${escapeHtml(pack.className || 'Class')}</span><span>${escapeHtml(pack.level)}</span><span>${pack.duration} min</span><span>${pack.items.length} activities</span></div></header>${items}</main></body></html>`;
}

function PackList({ packs, selectedId, onSelect, onNew, onDuplicate, onDelete, language }) {
  return <aside className="lp-sidebar">
    <div className="lp-brand"><span>LP</span><div><b>Lesson Pack</b><small>Connected Teaching Suite</small></div></div>
    <button className="lp-new" onClick={onNew}>＋ {language === 'vi' ? 'Gói bài dạy mới' : 'New lesson pack'}</button>
    <div className="lp-pack-list">
      {packs.map((pack) => <button key={pack.id} className={selectedId === pack.id ? 'active' : ''} onClick={() => onSelect(pack.id)}>
        <span>{pack.status === 'published' ? '✓' : pack.status === 'ready' ? '●' : '○'}</span>
        <div><b>{pack.title}</b><small>{pack.items.length} {language === 'vi' ? 'hoạt động' : 'activities'} · {pack.duration} min</small></div>
      </button>)}
      {!packs.length ? <div className="lp-empty-side">{language === 'vi' ? 'Chưa có gói bài dạy.' : 'No lesson packs yet.'}</div> : null}
    </div>
    {selectedId ? <div className="lp-side-actions"><button onClick={onDuplicate}>⧉ {language === 'vi' ? 'Nhân bản' : 'Duplicate'}</button><button className="danger" onClick={onDelete}>⌫ {language === 'vi' ? 'Xóa' : 'Delete'}</button></div> : null}
  </aside>;
}

function ItemEditor({ item, language, onChange, onClose }) {
  return <div className="lp-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="lp-drawer" role="dialog" aria-modal="true">
      <header><div><small>ACTIVITY EDITOR</small><h2>{item.title}</h2></div><button onClick={onClose}>×</button></header>
      <div className="lp-form-grid">
        <label><span>{language === 'vi' ? 'Tên hoạt động' : 'Activity title'}</span><input value={item.title} onChange={(e) => onChange({ title: e.target.value })} /></label>
        <label><span>{language === 'vi' ? 'Loại' : 'Type'}</span><select value={item.type} onChange={(e) => onChange({ type: e.target.value })}>{LESSON_PACK_ITEM_TYPES.map((type) => <option key={type} value={type}>{label(type, language)}</option>)}</select></label>
        <label><span>{language === 'vi' ? 'Thời lượng' : 'Minutes'}</span><input type="number" min="1" max="180" value={item.minutes} onChange={(e) => onChange({ minutes: Number(e.target.value) || 1 })} /></label>
        <label><span>{language === 'vi' ? 'Hình thức' : 'Delivery'}</span><select value={item.mode} onChange={(e) => onChange({ mode: e.target.value })}>{MODES.map(([value, vi]) => <option key={value} value={value}>{language === 'vi' ? vi : value}</option>)}</select></label>
        <label className="wide"><span>{language === 'vi' ? 'Mục tiêu' : 'Objective'}</span><input value={item.objective} onChange={(e) => onChange({ objective: e.target.value })} /></label>
        <label className="wide"><span>{language === 'vi' ? 'Nội dung' : 'Content'}</span><textarea rows="10" value={item.content} onChange={(e) => onChange({ content: e.target.value })} /></label>
        <label className="wide"><span>{language === 'vi' ? 'Hỗ trợ học sinh' : 'Support version'}</span><textarea rows="4" value={item.support} onChange={(e) => onChange({ support: e.target.value })} /></label>
        <label className="wide"><span>{language === 'vi' ? 'Mở rộng nâng cao' : 'Advanced extension'}</span><textarea rows="4" value={item.extension} onChange={(e) => onChange({ extension: e.target.value })} /></label>
        <label className="wide"><span>{language === 'vi' ? 'Đáp án / tiêu chí' : 'Answer key / rubric'}</span><textarea rows="4" value={item.answerKey} onChange={(e) => onChange({ answerKey: e.target.value })} /></label>
      </div>
      <footer><button className="primary" onClick={onClose}>{language === 'vi' ? 'Hoàn tất' : 'Done'}</button></footer>
    </section>
  </div>;
}

function LiveMode({ pack, language, onExit }) {
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState((pack.items[0]?.minutes || 10) * 60);
  const [running, setRunning] = useState(false);
  const item = pack.items[index];
  useEffect(() => { setSeconds((item?.minutes || 10) * 60); setRunning(false); }, [index, item?.id]);
  useEffect(() => {
    if (!running || seconds <= 0) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);
  if (!item) return <div className="lp-live"><button onClick={onExit}>←</button><h1>{language === 'vi' ? 'Chưa có hoạt động' : 'No activities'}</h1></div>;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return <div className="lp-live">
    <header><button onClick={onExit}>← {language === 'vi' ? 'Thoát trình chiếu' : 'Exit live mode'}</button><span>{index + 1}/{pack.items.length}</span><b>{pack.title}</b></header>
    <main>
      <div className="lp-live-meta"><span>{label(item.type, language)}</span><span>{item.mode}</span></div>
      <h1>{item.title}</h1>
      {item.objective ? <p className="objective">{item.objective}</p> : null}
      <div className="lp-live-content">{item.content || (language === 'vi' ? 'Mở ứng dụng nguồn để trình bày hoạt động này.' : 'Open the source app to deliver this activity.')}</div>
      {item.route ? <button className="lp-open-source" onClick={() => { window.location.href = item.route; }}>{language === 'vi' ? 'Mở nguồn hoạt động' : 'Open source activity'} ↗</button> : null}
    </main>
    <footer>
      <button disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>←</button>
      <div className={seconds <= 60 ? 'timer warning' : 'timer'}><b>{mm}:{ss}</b><button onClick={() => setRunning((value) => !value)}>{running ? 'Ⅱ' : '▶'}</button><button onClick={() => setSeconds(item.minutes * 60)}>↺</button></div>
      <button disabled={index >= pack.items.length - 1} onClick={() => setIndex((value) => value + 1)}>→</button>
    </footer>
  </div>;
}

export default function LessonPack({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const [packs, setPacks] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('builder');
  const [editingId, setEditingId] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState('');
  const [live, setLive] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let mounted = true;
    loadLessonPacks(currentUser).then((rows) => {
      if (!mounted) return;
      const next = rows.length ? rows : [saveLessonPackLocal(currentUser, createLessonPack({ title: language === 'vi' ? 'Gói bài dạy mới' : 'New Lesson Pack' }, currentUser))];
      setPacks(next);
      const active = getActiveLessonPackId(currentUser);
      setSelectedId(next.some((pack) => pack.id === active) ? active : next[0]?.id || '');
    });
    const unsubscribe = subscribeLessonPacks(currentUser, setPacks);
    return () => { mounted = false; unsubscribe(); window.clearTimeout(saveTimer.current); };
  }, [currentUser?.id, currentUser?.email]);

  const pack = useMemo(() => packs.find((item) => item.id === selectedId) || packs[0] || null, [packs, selectedId]);
  const editingItem = pack?.items.find((item) => item.id === editingId) || null;
  const pending = useMemo(() => listTransfers(currentUser, 'lesson-pack').filter((item) => item.status === 'pending'), [currentUser, packs, notice]);
  const totalMinutes = useMemo(() => pack?.items.reduce((sum, item) => sum + Number(item.minutes || 0), 0) || 0, [pack?.items]);

  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };
  const updatePack = (patch, autoSave = true) => {
    if (!pack) return;
    const next = { ...pack, ...patch, updatedAt: new Date().toISOString() };
    saveLessonPackLocal(currentUser, next);
    if (autoSave) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => saveLessonPack(currentUser, next), 900);
    }
  };
  const updateItem = (id, patch) => updatePack({ items: pack.items.map((item) => item.id === id ? createLessonPackItem({ ...item, ...patch }) : item) });
  const newPack = () => {
    const next = saveLessonPackLocal(currentUser, createLessonPack({ title: language === 'vi' ? 'Gói bài dạy mới' : 'New Lesson Pack' }, currentUser));
    setSelectedId(next.id); setTab('builder');
  };
  const addItem = (type = 'other') => {
    const item = createLessonPackItem({ type, title: language === 'vi' ? `Hoạt động ${pack.items.length + 1}` : `Activity ${pack.items.length + 1}` });
    updatePack({ items: [...pack.items, item] }); setEditingId(item.id);
  };
  const removeItem = (id) => updatePack({ items: pack.items.filter((item) => item.id !== id) });
  const reorder = (fromId, toId) => {
    if (!fromId || fromId === toId) return;
    const items = [...pack.items];
    const from = items.findIndex((item) => item.id === fromId);
    const to = items.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = items.splice(from, 1); items.splice(to, 0, moved);
    updatePack({ items }); setDragId('');
  };
  const importTransfers = () => {
    if (!pending.length) return;
    const imported = pending.map(itemFromTransfer);
    updatePack({ items: [...pack.items, ...imported] });
    pending.forEach((item) => updateTransfer(currentUser, item.id, { status: 'applied', appliedAt: Date.now() }));
    flash(language === 'vi' ? `Đã thêm ${imported.length} nội dung vào Lesson Pack.` : `Added ${imported.length} items to the Lesson Pack.`);
  };
  const saveCloud = async () => {
    if (!pack) return;
    setSaving(true);
    const result = await saveLessonPack(currentUser, pack);
    setSaving(false);
    flash(result.mode === 'cloud' ? (language === 'vi' ? 'Đã lưu lên đám mây.' : 'Saved to cloud.') : (language === 'vi' ? 'Đã lưu cục bộ; Supabase chưa sẵn sàng.' : 'Saved locally; Supabase is unavailable.'));
  };
  const sendItem = (item, target, route) => {
    createTransfer(currentUser, { target, type: 'lesson-pack-item', title: item.title, sourceApp: 'lesson-pack', sourceTitle: pack.title, content: item.content, metadata: { packId: pack.id, itemId: item.id, itemType: item.type, minutes: item.minutes, objective: item.objective } });
    flash(language === 'vi' ? `Đã gửi sang ${target}.` : `Sent to ${target}.`);
    window.setTimeout(() => { window.location.hash = route; }, 260);
  };

  if (live && pack) return <LiveMode pack={pack} language={language} onExit={() => setLive(false)} />;

  return <div className="page lesson-pack-page">
    <PackList packs={packs} selectedId={pack?.id} onSelect={(id) => { setSelectedId(id); setActiveLessonPackId(currentUser, id); }} onNew={newPack}
      onDuplicate={() => { const copy = duplicateLessonPackLocal(currentUser, pack); setSelectedId(copy.id); }}
      onDelete={() => { if (window.confirm(language === 'vi' ? 'Xóa gói bài dạy này?' : 'Delete this lesson pack?')) deleteLessonPack(currentUser, pack.id); }} language={language} />
    <section className="lp-workspace">
      <header className="lp-topbar">
        <div><small>V11.1 · CONNECTED TEACHING SUITE</small><h1>{pack?.title || 'Lesson Pack'}</h1></div>
      </header>
      <nav className="lp-tabs">
        {[['builder', '▦', 'Thiết kế', 'Builder'], ['timeline', '≡', 'Tiến trình', 'Timeline'], ['preview', '◉', 'Xem trước', 'Preview'], ['connections', '↗', 'Liên thông', 'Connections']].map(([id, icon, vi, en]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{icon} {language === 'vi' ? vi : en}</button>)}
        {pending.length ? <button className="lp-import" onClick={importTransfers}>＋ {pending.length} {language === 'vi' ? 'nội dung chờ thêm' : 'incoming items'}</button> : null}
      </nav>
      {notice ? <div className="lp-notice">✓ {notice}</div> : null}
      {!pack ? <div className="lp-empty">No pack selected</div> : null}

      {pack && tab === 'builder' ? <div className="lp-builder">
        <section className="lp-pack-meta">
          <label className="title"><span>{language === 'vi' ? 'Tên gói bài dạy' : 'Lesson pack title'}</span><input value={pack.title} onChange={(e) => updatePack({ title: e.target.value })} /></label>
          <label><span>{language === 'vi' ? 'Lớp' : 'Class'}</span><input value={pack.className} onChange={(e) => updatePack({ className: e.target.value })} placeholder="12A1" /></label>
          <label><span>Unit</span><input value={pack.unit} onChange={(e) => updatePack({ unit: e.target.value })} /></label>
          <label><span>CEFR</span><select value={pack.level} onChange={(e) => updatePack({ level: e.target.value })}>{['A1-A2', 'B1', 'B1-B2', 'B2', 'B2-C1', 'C1'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>{language === 'vi' ? 'Phiên bản' : 'Variant'}</span><select value={pack.variant} onChange={(e) => updatePack({ variant: e.target.value })}><option value="support">{language === 'vi' ? 'Hỗ trợ' : 'Support'}</option><option value="standard">{language === 'vi' ? 'Chuẩn' : 'Standard'}</option><option value="advanced">{language === 'vi' ? 'Nâng cao' : 'Advanced'}</option></select></label>
          <label className="wide"><span>{language === 'vi' ? 'Mục tiêu bài học' : 'Lesson objectives'}</span><textarea rows="3" value={pack.objectives} onChange={(e) => updatePack({ objectives: e.target.value })} /></label>
        </section>
        <section className="lp-sequence-head"><div><h2>{language === 'vi' ? 'Chuỗi hoạt động' : 'Activity sequence'}</h2><p>{pack.items.length} {language === 'vi' ? 'hoạt động' : 'activities'} · {totalMinutes} min</p></div><div className="lp-add-menu"><select id="lp-add-type" defaultValue="warm-up">{LESSON_PACK_ITEM_TYPES.map((type) => <option key={type} value={type}>{label(type, language)}</option>)}</select><button onClick={() => addItem(document.getElementById('lp-add-type')?.value || 'other')}>＋ {language === 'vi' ? 'Thêm' : 'Add'}</button></div></section>
        <div className="lp-items">
          {pack.items.map((item, index) => <article key={item.id} className={`lp-item type-${item.type}`} draggable onDragStart={() => setDragId(item.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => reorder(dragId, item.id)}>
            <button className="lp-drag" title={language === 'vi' ? 'Kéo để sắp xếp' : 'Drag to reorder'}>⋮⋮</button><div className="lp-index">{index + 1}</div>
            <div className="lp-item-main" onClick={() => setEditingId(item.id)}><div className="lp-item-meta"><span>{label(item.type, language)}</span><span>{item.minutes} min</span><span>{language === 'vi' ? MODES.find(([v]) => v === item.mode)?.[1] : item.mode}</span>{item.sourceApp !== 'manual' ? <span className="source">{item.sourceApp}</span> : null}</div><h3>{item.title}</h3><p>{item.objective || item.content.slice(0, 150) || (language === 'vi' ? 'Nhấn để thêm nội dung.' : 'Click to add content.')}</p></div>
            <div className="lp-item-actions"><button onClick={() => setEditingId(item.id)}>✎</button>{item.route ? <button onClick={() => { window.location.href = item.route; }}>↗</button> : null}<button className="danger" onClick={() => removeItem(item.id)}>×</button></div>
          </article>)}
          {!pack.items.length ? <button className="lp-empty-sequence" onClick={() => addItem('warm-up')}>＋<b>{language === 'vi' ? 'Bắt đầu bằng hoạt động đầu tiên' : 'Start with your first activity'}</b><span>{language === 'vi' ? 'Hoặc dùng nút “Gửi sang” ở bất kỳ ứng dụng nào để thêm sản phẩm.' : 'Or use “Send to” in any app to add its output.'}</span></button> : null}
        </div>
      </div> : null}

      {pack && tab === 'timeline' ? <div className="lp-timeline-view"><header><h2>{language === 'vi' ? 'Tiến trình bài dạy' : 'Lesson timeline'}</h2><div><b>{totalMinutes}</b><span>min</span></div></header><div className="lp-timeline-bar">{pack.items.map((item) => <div key={item.id} style={{ flex: Math.max(1, item.minutes) }} title={`${item.title}: ${item.minutes} min`}><span>{item.minutes}</span></div>)}</div><div className="lp-timeline-list">{pack.items.map((item, index) => <div key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.title}</b><small>{label(item.type, language)} · {item.mode}</small><strong>{item.minutes} min</strong></div>)}</div><label className="lp-notes"><span>{language === 'vi' ? 'Ghi chú giáo viên' : 'Teacher notes'}</span><textarea rows="8" value={pack.teacherNotes} onChange={(e) => updatePack({ teacherNotes: e.target.value })} /></label></div> : null}

      {pack && tab === 'preview' ? <div className="lp-preview"><header><div><small>{pack.unit || 'LESSON PACK'}</small><h2>{pack.title}</h2><p>{pack.objectives}</p></div><div><span>{pack.className || 'Class'}</span><span>{pack.level}</span><span>{totalMinutes} min</span></div></header>{pack.items.map((item, index) => <section key={item.id}><i>{index + 1}</i><div><small>{label(item.type, language)} · {item.minutes} min</small><h3>{item.title}</h3><p>{item.content}</p>{pack.variant === 'support' && item.support ? <aside>💡 {item.support}</aside> : null}{pack.variant === 'advanced' && item.extension ? <aside>★ {item.extension}</aside> : null}</div></section>)}<footer><button onClick={() => download(`${fileName(pack.title)}.json`, JSON.stringify(pack, null, 2))}>JSON</button><button onClick={() => download(`${fileName(pack.title)}.html`, exportHtml(pack, language), 'text/html')}>HTML</button><button onClick={() => window.print()}>⌘P {language === 'vi' ? 'In / PDF' : 'Print / PDF'}</button></footer></div> : null}

      {pack && tab === 'connections' ? <div className="lp-connections"><section className="lp-connection-hero"><div><small>CONNECTED WORKFLOW</small><h2>{language === 'vi' ? 'Một gói bài dạy, nhiều ứng dụng' : 'One lesson pack, many apps'}</h2><p>{language === 'vi' ? 'Mở ứng dụng để tạo sản phẩm, dùng “Gửi sang → Lesson Pack”, rồi quay lại đây sắp xếp thành một bài dạy hoàn chỉnh.' : 'Create in any app, use “Send to → Lesson Pack”, then arrange everything into a complete lesson.'}</p></div><span>↗</span></section><div className="lp-app-grid">{TARGETS.map(([target, route, name]) => <button key={target} onClick={() => { window.location.hash = route; }}><span>{name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><b>{name}</b><small>{language === 'vi' ? 'Mở ứng dụng' : 'Open app'} →</small></button>)}</div><section className="lp-send-items"><h3>{language === 'vi' ? 'Gửi hoạt động hiện có sang ứng dụng khác' : 'Send existing activities to another app'}</h3>{pack.items.map((item) => <div key={item.id}><b>{item.title}</b><select defaultValue="" onChange={(e) => { const selected = TARGETS.find(([id]) => id === e.target.value); if (selected) sendItem(item, selected[0], selected[1]); e.target.value = ''; }}><option value="">{language === 'vi' ? 'Chọn ứng dụng…' : 'Choose app…'}</option>{TARGETS.map(([id,, name]) => <option key={id} value={id}>{name}</option>)}</select></div>)}</section></div> : null}
    </section>
    {editingItem ? <ItemEditor item={editingItem} language={language} onChange={(patch) => updateItem(editingItem.id, patch)} onClose={() => setEditingId('')} /> : null}
  </div>;
}
