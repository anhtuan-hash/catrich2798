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
  ['worksheet-factory', '#/tool/worksheet-factory', 'Worksheet Factory'],
  ['reading-studio', '#/tool/reading-studio', 'Reading Studio'],
  ['speaking-studio', '#/tool/speaking-studio', 'Speaking Studio'],
  ['assessment-core', '#/assessment-core', 'Assessment Core'],
  ['exam-studio', '#/tool/exam-studio', 'Exam Studio'],
  ['student-practice', '#/practice', 'Learner Sprint'],
];

const LESSON_PACK_WORKFLOW = [
  { id: 1, icon: '◎', vi: 'Mục tiêu & lớp học', en: 'Goals & class', subVi: 'Xác định mục tiêu, lớp học', subEn: 'Set goals and learners' },
  { id: 2, icon: '▤', vi: 'Nguồn học liệu', en: 'Learning sources', subVi: 'Chọn & thêm học liệu', subEn: 'Choose and add resources' },
  { id: 3, icon: '▦', vi: 'Khung bài dạy', en: 'Lesson frame', subVi: 'Cấu trúc & thời lượng', subEn: 'Structure and timing' },
  { id: 4, icon: '✦', vi: 'Hoạt động & AI', en: 'Activities & AI', subVi: 'Tạo hoạt động & hỗ trợ AI', subEn: 'Build activities with AI' },
  { id: 5, icon: '▶', vi: 'Trình chiếu & giao bài', en: 'Deliver lesson', subVi: 'Trình chiếu & giao cho HS', subEn: 'Present and assign' },
  { id: 6, icon: '↥', vi: 'Xuất bản', en: 'Publish', subVi: 'Xuất bản & chia sẻ', subEn: 'Publish and share' },
];

const DEFAULT_SEQUENCE = [
  ['warm-up', 'Mở đầu', 'Gợi mở – Kích hoạt kiến thức nền', 5],
  ['worksheet', 'Luyện tập', 'Thực hành – Củng cố kiến thức', 20],
  ['interactive', 'Vận dụng', 'Vận dụng – Giải quyết vấn đề', 15],
  ['assessment', 'Đánh giá', 'Đánh giá – Phản hồi – Tổng kết', 5],
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
  const [step, setStep] = useState(3);
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
    setSelectedId(next.id); setStep(1);
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

  const selectPack = (id) => {
    setSelectedId(id);
    setActiveLessonPackId(currentUser, id);
  };
  const issues = useMemo(() => {
    if (!pack) return [];
    const next = [];
    if (!String(pack.title || '').trim()) next.push(language === 'vi' ? 'Chưa có tên gói bài dạy.' : 'Lesson pack title is missing.');
    if (!String(pack.className || '').trim()) next.push(language === 'vi' ? 'Chưa chọn lớp học.' : 'Class is missing.');
    if (!String(pack.objectives || '').trim()) next.push(language === 'vi' ? 'Chưa mô tả mục tiêu bài học.' : 'Lesson objectives are missing.');
    if (!pack.items.length) next.push(language === 'vi' ? 'Chưa có hoạt động.' : 'No activities yet.');
    if (pack.items.some((item) => !String(item.content || '').trim())) next.push(language === 'vi' ? 'Một số hoạt động chưa có nội dung.' : 'Some activities have no content.');
    if (totalMinutes !== Number(pack.duration || 0)) next.push(language === 'vi' ? `Tổng hoạt động ${totalMinutes} phút, khác thời lượng mục tiêu ${pack.duration} phút.` : `Activities total ${totalMinutes} minutes, target is ${pack.duration}.`);
    return next;
  }, [pack, totalMinutes, language]);
  const resourceCounts = useMemo(() => {
    const items = pack?.items || [];
    return {
      docs: items.filter((item) => ['resource', 'worksheet', 'reading', 'grammar'].includes(item.type)).length,
      images: items.reduce((sum, item) => sum + Number(item.metadata?.imageCount || 0), 0),
      videos: items.reduce((sum, item) => sum + Number(item.metadata?.videoCount || 0), 0),
      audio: items.filter((item) => item.type === 'listening').length,
      links: items.filter((item) => item.route).length,
    };
  }, [pack?.items]);
  const completion = useMemo(() => {
    if (!pack) return 0;
    const checks = [
      Boolean(pack.title && pack.className && pack.objectives),
      Boolean(pack.items.some((item) => item.sourceApp !== 'manual') || pending.length),
      Boolean(pack.items.length && totalMinutes > 0),
      Boolean(pack.items.length && pack.items.every((item) => item.content || item.objective)),
      Boolean(pack.items.length),
      pack.status === 'published',
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [pack, pending.length, totalMinutes]);
  const addSuggestedActivity = () => {
    if (!pack) return;
    const used = new Set(pack.items.map((item) => item.type));
    const suggestion = DEFAULT_SEQUENCE.find(([type]) => !used.has(type)) || ['interactive', language === 'vi' ? 'Hoạt động mở rộng' : 'Extension activity', language === 'vi' ? 'Hoạt động do trợ lý đề xuất' : 'Suggested activity', 10];
    const item = createLessonPackItem({ type: suggestion[0], title: language === 'vi' ? suggestion[1] : `Suggested ${suggestion[0]}`, objective: language === 'vi' ? suggestion[2] : 'Suggested learning objective', minutes: suggestion[3], mode: suggestion[0] === 'warm-up' ? 'whole-class' : 'group' });
    updatePack({ items: [...pack.items, item] });
    setEditingId(item.id);
    flash(language === 'vi' ? 'Đã thêm một hoạt động gợi ý. Hãy hoàn thiện nội dung.' : 'Suggested activity added.');
  };
  const addQuestionActivity = () => {
    if (!pack) return;
    const item = createLessonPackItem({ type: 'assessment', title: language === 'vi' ? 'Câu hỏi kiểm tra nhanh' : 'Quick check questions', objective: language === 'vi' ? 'Kiểm tra mức độ đạt mục tiêu bài học.' : 'Check lesson objective attainment.', minutes: 5, mode: 'individual' });
    updatePack({ items: [...pack.items, item] });
    setEditingId(item.id);
  };
  const balanceDuration = () => {
    if (!pack?.items.length) { flash(language === 'vi' ? 'Hãy thêm hoạt động trước khi cân chỉnh thời lượng.' : 'Add activities before balancing time.'); return; }
    const target = Math.max(pack.items.length, Number(pack.duration || 45));
    const current = Math.max(1, totalMinutes);
    let allocated = 0;
    const items = pack.items.map((item, index) => {
      const minutes = index === pack.items.length - 1 ? Math.max(1, target - allocated) : Math.max(1, Math.round((item.minutes / current) * target));
      allocated += minutes;
      return createLessonPackItem({ ...item, minutes });
    });
    updatePack({ items });
    flash(language === 'vi' ? `Đã cân chỉnh chuỗi hoạt động về khoảng ${target} phút.` : `Timeline balanced to about ${target} minutes.`);
  };
  const publishPack = async () => {
    if (!pack) return;
    const next = { ...pack, status: 'published', updatedAt: new Date().toISOString() };
    saveLessonPackLocal(currentUser, next);
    setSaving(true);
    const result = await saveLessonPack(currentUser, next);
    setSaving(false);
    flash(result.mode === 'cloud' ? (language === 'vi' ? 'Đã xuất bản và lưu lên Cloud.' : 'Published and saved to cloud.') : (language === 'vi' ? 'Đã xuất bản cục bộ.' : 'Published locally.'));
  };

  if (live && pack) return <LiveMode pack={pack} language={language} onExit={() => setLive(false)} />;

  return <div className="page lesson-pack-page lp29-page" data-workflow-step={step}>
    <section className="lp29-workspace">
      <header className="lp29-hero">
        <div className="lp29-hero-copy">
          <div className="lp29-title-line"><span className="lp29-app-badge">LP</span><h1>Lesson Pack</h1><span className="lp29-suite">Connected Teaching Suite</span></div>
          <p>{language === 'vi' ? 'Thiết kế gói bài dạy hiện đại, kết nối mục tiêu – hoạt động – trình chiếu – giao bài.' : 'Design connected lesson packs from goals and activities to presentation and delivery.'}</p>
          <div className="lp29-hero-actions">
            <button type="button" className="primary" onClick={newPack}>＋ {language === 'vi' ? 'Tạo gói bài dạy' : 'Create lesson pack'}</button>
            <label className="lp29-draft-picker"><span>▣</span><select value={pack?.id || ''} onChange={(event) => selectPack(event.target.value)}>{packs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <button type="button" className="secondary" disabled={!pack?.items.length} onClick={() => setLive(true)}>▶ {language === 'vi' ? 'Xem demo' : 'View demo'}</button>
          </div>
          <div className="lp29-pack-tools">
            <button type="button" disabled={!pack} onClick={() => { const copy = duplicateLessonPackLocal(currentUser, pack); setSelectedId(copy.id); }}>⧉ {language === 'vi' ? 'Nhân bản' : 'Duplicate'}</button>
            <button type="button" className="danger" disabled={!pack} onClick={() => { if (window.confirm(language === 'vi' ? 'Xóa gói bài dạy này?' : 'Delete this lesson pack?')) deleteLessonPack(currentUser, pack.id); }}>⌫ {language === 'vi' ? 'Xóa' : 'Delete'}</button>
          </div>
        </div>
        <div className="lp29-hero-art" aria-hidden="true">
          <div className="lp29-art-orbit orbit-one" /><div className="lp29-art-orbit orbit-two" />
          <div className="lp29-art-board"><div className="lp29-art-toolbar"><i /><i /><i /></div><div className="lp29-art-icons"><span>▤</span><span>▧</span><span>▶</span></div><div className="lp29-art-lines"><i /><i /><i /></div></div>
          <span className="lp29-art-cube cube-a">LP</span><span className="lp29-art-cube cube-b">AI</span><span className="lp29-art-spark spark-a">✦</span><span className="lp29-art-spark spark-b">✧</span>
        </div>
        <div className="lp29-hero-status">
          <span className={runtime.ready ? 'ready' : ''}>☁ <b>{runtime.ready ? 'Cloud ready' : 'Local mode'}</b></span>
          <button type="button" onClick={saveCloud} disabled={saving}>↻ <b>{saving ? (language === 'vi' ? 'Đang lưu' : 'Saving') : (language === 'vi' ? 'Tự động lưu' : 'Auto save')}</b></button>
          <span>◷ <b>{pack?.duration || 45} {language === 'vi' ? 'phút' : 'min'}</b></span>
          <span>♙ <b>{pack?.className || (language === 'vi' ? 'Chưa chọn lớp' : 'No class')}</b></span>
          <span>▦ <b>{pack?.items.length || 0} {language === 'vi' ? 'hoạt động' : 'activities'}</b></span>
        </div>
      </header>

      <nav className="lp29-workflow" aria-label={language === 'vi' ? 'Quy trình gói bài dạy' : 'Lesson pack workflow'}>
        {LESSON_PACK_WORKFLOW.map((workflow) => {
          const completed = workflow.id < step;
          const active = workflow.id === step;
          return <button type="button" key={workflow.id} className={`${active ? 'active' : ''} ${completed ? 'completed' : ''}`} onClick={() => setStep(workflow.id)}>
            <span className="lp29-step-number">{completed ? '✓' : workflow.id}</span>
            <span><b>{language === 'vi' ? workflow.vi : workflow.en}</b><small>{language === 'vi' ? workflow.subVi : workflow.subEn}</small></span>
          </button>;
        })}
      </nav>

      {notice ? <div className="lp29-notice">✓ {notice}</div> : null}
      {!pack ? <div className="lp29-empty">{language === 'vi' ? 'Chưa có gói bài dạy.' : 'No lesson pack selected.'}</div> : null}

      {pack && step === 1 ? <div className="lp29-stage lp29-stage-goals">
        <section className="lp29-card lp29-primary-card">
          <header className="lp29-section-head"><span>1</span><div><h2>{language === 'vi' ? 'Mục tiêu & lớp học' : 'Goals & class'}</h2><p>{language === 'vi' ? 'Xác định bối cảnh, đối tượng và kết quả học tập mong đợi.' : 'Define context, learners and intended outcomes.'}</p></div></header>
          <div className="lp29-form-grid">
            <label className="wide"><span>{language === 'vi' ? 'Tên gói bài dạy' : 'Lesson pack title'}</span><input value={pack.title} onChange={(event) => updatePack({ title: event.target.value })} /></label>
            <label><span>{language === 'vi' ? 'Lớp' : 'Class'}</span><input value={pack.className} onChange={(event) => updatePack({ className: event.target.value })} placeholder="12A1" /></label>
            <label><span>Unit</span><input value={pack.unit} onChange={(event) => updatePack({ unit: event.target.value })} /></label>
            <label><span>CEFR</span><select value={pack.level} onChange={(event) => updatePack({ level: event.target.value })}>{['A1-A2','B1','B1-B2','B2','B2-C1','C1'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label><span>{language === 'vi' ? 'Phiên bản' : 'Variant'}</span><select value={pack.variant} onChange={(event) => updatePack({ variant: event.target.value })}><option value="support">{language === 'vi' ? 'Hỗ trợ' : 'Support'}</option><option value="standard">{language === 'vi' ? 'Chuẩn' : 'Standard'}</option><option value="advanced">{language === 'vi' ? 'Nâng cao' : 'Advanced'}</option></select></label>
            <label><span>{language === 'vi' ? 'Thời lượng mục tiêu' : 'Target duration'}</span><input type="number" min="5" max="600" value={pack.duration} onChange={(event) => updatePack({ duration: Number(event.target.value) || 45 })} /></label>
            <label className="wide"><span>{language === 'vi' ? 'Mục tiêu bài học' : 'Lesson objectives'}</span><textarea rows="6" value={pack.objectives} onChange={(event) => updatePack({ objectives: event.target.value })} placeholder={language === 'vi' ? 'Sau bài học, học sinh có thể…' : 'By the end of the lesson, students can…'} /></label>
          </div>
          <footer className="lp29-card-actions"><button type="button" className="primary" onClick={() => setStep(2)}>{language === 'vi' ? 'Tiếp tục: Nguồn học liệu' : 'Continue: Learning sources'} →</button></footer>
        </section>
        <aside className="lp29-support-stack"><ProgressCard completion={completion} language={language} /><QuickCheckCard issues={issues} language={language} onFix={() => setStep(1)} /></aside>
      </div> : null}

      {pack && step === 2 ? <div className="lp29-stage lp29-stage-sources">
        <section className="lp29-card lp29-primary-card">
          <header className="lp29-section-head"><span>2</span><div><h2>{language === 'vi' ? 'Nguồn học liệu' : 'Learning sources'}</h2><p>{language === 'vi' ? 'Nhận nội dung từ các ứng dụng Brian và sắp xếp thành nguồn cho bài dạy.' : 'Collect content from Brian apps and organize lesson sources.'}</p></div></header>
          {pending.length ? <button type="button" className="lp29-import-banner" onClick={importTransfers}>＋ {language === 'vi' ? `Thêm ${pending.length} nội dung đang chờ` : `Add ${pending.length} incoming items`}</button> : <div className="lp29-source-empty"><span>☁</span><b>{language === 'vi' ? 'Chưa có nội dung chờ thêm' : 'No incoming content'}</b><p>{language === 'vi' ? 'Mở một ứng dụng bên dưới, tạo học liệu rồi chọn “Gửi sang → Lesson Pack”.' : 'Create content in an app below, then use Send to → Lesson Pack.'}</p></div>}
          <div className="lp29-app-grid">{TARGETS.map(([target, route, name]) => <button type="button" key={target} onClick={() => { window.location.hash = route; }}><span>{name.split(' ').map((word) => word[0]).join('').slice(0,2)}</span><b>{name}</b><small>{language === 'vi' ? 'Mở ứng dụng' : 'Open app'} →</small></button>)}</div>
          <footer className="lp29-card-actions"><button type="button" className="secondary" onClick={() => setStep(1)}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button><button type="button" className="primary" onClick={() => setStep(3)}>{language === 'vi' ? 'Tiếp tục: Khung bài dạy' : 'Continue: Lesson frame'} →</button></footer>
        </section>
        <aside className="lp29-support-stack"><ResourceCard counts={resourceCounts} language={language} /><OutputCard language={language} onPreview={() => setStep(5)} /></aside>
      </div> : null}

      {pack && step === 3 ? <div className="lp29-stage lp29-stage-frame">
        <section className="lp29-card lp29-primary-card">
          <header className="lp29-section-head lp29-frame-head"><span>3</span><div><h2>{language === 'vi' ? 'Khung bài dạy' : 'Lesson frame'}</h2><p>{language === 'vi' ? 'Xây dựng cấu trúc bài học với các phần học và thời lượng phù hợp.' : 'Build a coherent lesson structure and timing.'}</p></div><div className="lp29-add-menu"><select id="lp29-add-type" defaultValue="warm-up">{LESSON_PACK_ITEM_TYPES.map((type) => <option key={type} value={type}>{label(type, language)}</option>)}</select><button type="button" onClick={() => addItem(document.getElementById('lp29-add-type')?.value || 'other')}>＋ {language === 'vi' ? 'Thêm' : 'Add'}</button></div></header>
          <div className="lp29-frame-grid">
            <div className="lp29-sequence-list">
              {pack.items.map((item, index) => <article key={item.id} className={`lp29-sequence-row type-${item.type}`} draggable onDragStart={() => setDragId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(dragId, item.id)}>
                <button type="button" className="lp29-drag" title={language === 'vi' ? 'Kéo để sắp xếp' : 'Drag to reorder'}>⋮⋮</button><span className="lp29-type-icon">{item.type === 'warm-up' ? '▶' : item.type === 'assessment' ? '✓' : item.type === 'interactive' ? '↗' : '✎'}</span><button type="button" className="lp29-row-copy" onClick={() => setEditingId(item.id)}><b>{item.title}</b><small>{item.objective || label(item.type, language)}</small></button><span className="lp29-duration">{item.minutes} {language === 'vi' ? 'phút' : 'min'}</span><button type="button" className="lp29-more" onClick={() => setEditingId(item.id)}>•••</button>
              </article>)}
              {!pack.items.length ? <button type="button" className="lp29-empty-sequence" onClick={() => addItem('warm-up')}><span>＋</span><b>{language === 'vi' ? 'Tạo hoạt động đầu tiên' : 'Create first activity'}</b><small>{language === 'vi' ? 'Hoặc dùng trợ lý gợi ý một cấu trúc khởi đầu.' : 'Or ask the assistant for a starter structure.'}</small></button> : null}
            </div>
            <aside className="lp29-ai-card"><span className="lp29-ai-icon">✦</span><h3>{language === 'vi' ? 'Trợ lý AI gợi ý' : 'AI suggestions'}</h3><p>{language === 'vi' ? 'Tối ưu cấu trúc và thời lượng dựa trên mục tiêu bài học.' : 'Optimize structure and timing from your lesson goals.'}</p><button type="button" onClick={addSuggestedActivity}>⌘ {language === 'vi' ? 'AI gợi ý hoạt động' : 'Suggest activity'}</button><button type="button" onClick={addQuestionActivity}>? {language === 'vi' ? 'Tạo câu hỏi' : 'Create questions'}</button><button type="button" onClick={balanceDuration}>◷ {language === 'vi' ? 'Cân chỉnh thời lượng' : 'Balance timing'}</button><button type="button" className="link" onClick={() => { window.location.hash = '#/ai-workspace'; }}>{language === 'vi' ? 'Mở AI Workspace' : 'Open AI Workspace'} →</button></aside>
          </div>
          <footer className="lp29-card-actions"><button type="button" className="secondary" onClick={() => setStep(2)}>← {language === 'vi' ? 'Nguồn học liệu' : 'Sources'}</button><button type="button" className="primary" onClick={() => setStep(4)}>{language === 'vi' ? 'Tiếp tục: Hoạt động & AI' : 'Continue: Activities & AI'} →</button></footer>
        </section>
        <aside className="lp29-support-stack"><ProgressCard completion={completion} language={language} /><ResourceCard counts={resourceCounts} language={language} /><OutputCard language={language} onPreview={() => setStep(5)} /><QuickCheckCard issues={issues} language={language} onFix={() => setStep(4)} /></aside>
      </div> : null}

      {pack && step === 4 ? <div className="lp29-stage lp29-stage-activities">
        <section className="lp29-card lp29-primary-card">
          <header className="lp29-section-head"><span>4</span><div><h2>{language === 'vi' ? 'Hoạt động & AI' : 'Activities & AI'}</h2><p>{language === 'vi' ? 'Hoàn thiện nội dung, hình thức tổ chức, hỗ trợ và phần mở rộng cho từng hoạt động.' : 'Complete content, delivery, support and extensions for every activity.'}</p></div></header>
          <div className="lp29-activity-grid">{pack.items.map((item,index) => <article key={item.id} className="lp29-activity-card"><header><span>{String(index+1).padStart(2,'0')}</span><div><b>{item.title}</b><small>{label(item.type,language)} · {item.minutes} min · {language === 'vi' ? MODES.find(([value]) => value === item.mode)?.[1] : item.mode}</small></div></header><p>{item.content || item.objective || (language === 'vi' ? 'Chưa có nội dung. Nhấn Biên tập để hoàn thiện.' : 'No content yet. Edit to complete.')}</p><footer><button type="button" onClick={() => setEditingId(item.id)}>✎ {language === 'vi' ? 'Biên tập' : 'Edit'}</button>{item.route ? <button type="button" onClick={() => { window.location.href=item.route; }}>↗ {language === 'vi' ? 'Mở nguồn' : 'Open source'}</button> : null}<button type="button" className="danger" onClick={() => removeItem(item.id)}>×</button></footer></article>)}</div>
          <button type="button" className="lp29-add-activity" onClick={addSuggestedActivity}>＋ {language === 'vi' ? 'Thêm hoạt động gợi ý' : 'Add suggested activity'}</button>
          <footer className="lp29-card-actions"><button type="button" className="secondary" onClick={() => setStep(3)}>← {language === 'vi' ? 'Khung bài dạy' : 'Lesson frame'}</button><button type="button" className="primary" onClick={() => setStep(5)}>{language === 'vi' ? 'Tiếp tục: Trình chiếu & giao bài' : 'Continue: Delivery'} →</button></footer>
        </section>
        <aside className="lp29-support-stack"><div className="lp29-card lp29-mini-card lp29-ai-tools"><h3>✦ {language === 'vi' ? 'Công cụ AI nhanh' : 'Quick AI tools'}</h3><button type="button" onClick={addSuggestedActivity}>{language === 'vi' ? 'Gợi ý hoạt động tiếp theo' : 'Suggest next activity'}</button><button type="button" onClick={addQuestionActivity}>{language === 'vi' ? 'Tạo hoạt động đánh giá' : 'Create assessment activity'}</button><button type="button" onClick={balanceDuration}>{language === 'vi' ? 'Cân chỉnh thời lượng' : 'Balance timing'}</button></div><QuickCheckCard issues={issues} language={language} onFix={() => setStep(4)} /></aside>
      </div> : null}

      {pack && step === 5 ? <div className="lp29-stage lp29-stage-delivery">
        <section className="lp29-card lp29-primary-card"><header className="lp29-section-head"><span>5</span><div><h2>{language === 'vi' ? 'Trình chiếu & giao bài' : 'Present & deliver'}</h2><p>{language === 'vi' ? 'Xem trước trải nghiệm học tập, trình chiếu trực tiếp hoặc mở phòng học.' : 'Preview the learner experience, present live or open a classroom.'}</p></div></header>
          <div className="lp29-preview-sheet"><header><div><small>{pack.unit || 'LESSON PACK'}</small><h3>{pack.title}</h3><p>{pack.objectives}</p></div><div><span>{pack.className || 'Class'}</span><span>{pack.level}</span><span>{totalMinutes} min</span></div></header>{pack.items.slice(0,4).map((item,index)=><div key={item.id} className="lp29-preview-row"><span>{index+1}</span><div><b>{item.title}</b><small>{label(item.type,language)} · {item.minutes} min</small></div></div>)}</div>
          <div className="lp29-delivery-actions"><button type="button" className="primary" disabled={!pack.items.length} onClick={() => setLive(true)}>▶ {language === 'vi' ? 'Trình chiếu nhanh' : 'Quick presentation'}</button><button type="button" onClick={() => { window.location.hash=`#/classroom-delivery?pack=${encodeURIComponent(pack.id)}`; }}>⌁ {language === 'vi' ? 'Mở phòng học' : 'Open classroom'}</button><button type="button" onClick={() => window.print()}>⌘P {language === 'vi' ? 'In bản xem trước' : 'Print preview'}</button></div>
          <footer className="lp29-card-actions"><button type="button" className="secondary" onClick={() => setStep(4)}>← {language === 'vi' ? 'Hoạt động & AI' : 'Activities & AI'}</button><button type="button" className="primary" onClick={() => setStep(6)}>{language === 'vi' ? 'Tiếp tục: Xuất bản' : 'Continue: Publish'} →</button></footer>
        </section>
        <aside className="lp29-support-stack"><ProgressCard completion={completion} language={language} /><OutputCard language={language} onPreview={() => setStep(6)} /></aside>
      </div> : null}

      {pack && step === 6 ? <div className="lp29-stage lp29-stage-publish">
        <section className="lp29-card lp29-primary-card"><header className="lp29-section-head"><span>6</span><div><h2>{language === 'vi' ? 'Xuất bản & chia sẻ' : 'Publish & share'}</h2><p>{language === 'vi' ? 'Kiểm tra lần cuối, lưu phiên bản và xuất gói bài dạy theo định dạng phù hợp.' : 'Run final checks, save a version and export the lesson pack.'}</p></div></header>
          <div className="lp29-publish-grid"><button type="button" onClick={() => download(`${fileName(pack.title)}.json`,JSON.stringify(pack,null,2))}><span>JSON</span><b>{language === 'vi' ? 'Bản sao dữ liệu' : 'Data backup'}</b><small>{language === 'vi' ? 'Lưu toàn bộ cấu trúc và nội dung' : 'Save structure and content'}</small></button><button type="button" onClick={() => download(`${fileName(pack.title)}.html`,exportHtml(pack,language),'text/html')}><span>HTML</span><b>{language === 'vi' ? 'Gói tương tác' : 'Interactive pack'}</b><small>{language === 'vi' ? 'Mở trên trình duyệt hoặc LMS' : 'Open in browser or LMS'}</small></button><button type="button" onClick={() => window.print()}><span>PDF</span><b>{language === 'vi' ? 'Bản in / PDF' : 'Print / PDF'}</b><small>{language === 'vi' ? 'Dành cho giáo viên và học sinh' : 'For teachers and students'}</small></button><button type="button" onClick={() => { window.location.hash=`#/classroom-delivery?pack=${encodeURIComponent(pack.id)}`; }}><span>LIVE</span><b>{language === 'vi' ? 'Lớp học trực tiếp' : 'Live classroom'}</b><small>{language === 'vi' ? 'Mã tham gia, đội và kết quả' : 'Join code, teams and results'}</small></button></div>
          <div className={`lp29-publish-status ${issues.length ? 'warning' : 'ready'}`}><span>{issues.length ? '!' : '✓'}</span><div><b>{issues.length ? (language === 'vi' ? `${issues.length} mục cần xem lại` : `${issues.length} items need review`) : (language === 'vi' ? 'Gói bài dạy đã sẵn sàng' : 'Lesson pack is ready')}</b><p>{issues[0] || (language === 'vi' ? 'Không phát hiện vấn đề nghiêm trọng trước khi xuất bản.' : 'No critical issues detected before publishing.')}</p></div></div>
          <footer className="lp29-card-actions"><button type="button" className="secondary" onClick={() => setStep(5)}>← {language === 'vi' ? 'Trình chiếu & giao bài' : 'Delivery'}</button><button type="button" className="primary" disabled={saving} onClick={publishPack}>↥ {saving ? (language === 'vi' ? 'Đang xuất bản…' : 'Publishing…') : (language === 'vi' ? 'Xuất bản gói bài dạy' : 'Publish lesson pack')}</button></footer>
        </section>
        <aside className="lp29-support-stack"><QuickCheckCard issues={issues} language={language} onFix={() => setStep(issues.some((item)=>item.includes('lớp')||item.includes('mục tiêu')) ? 1 : 4)} /><ResourceCard counts={resourceCounts} language={language} /></aside>
      </div> : null}

      <section className="lp29-workflow-preview"><h2>{language === 'vi' ? 'Bản xem nhanh workflow' : 'Workflow overview'}</h2><div className="lp29-preview-cards"><article className="teacher"><span>♙</span><div><h3>Teacher flow</h3><p>{language === 'vi' ? 'Quy trình thiết kế từ mục tiêu đến xuất bản.' : 'Design workflow from goals to publishing.'}</p><div className="lp29-mini-steps">{LESSON_PACK_WORKFLOW.map((item)=><i key={item.id} className={item.id <= step ? 'done' : ''}>{item.id}</i>)}</div></div><button type="button" onClick={() => setStep(Math.min(6,step+1))}>{language === 'vi' ? 'Tiếp tục' : 'Continue'}</button></article><article className="student"><span>♧</span><div><h3>Student delivery</h3><p>{language === 'vi' ? 'Trải nghiệm học tập theo tuần tự hoạt động.' : 'Sequential learner experience.'}</p><div className="lp29-mini-steps blue">{[1,2,3,4].map((item)=><i key={item} className={item <= Math.min(4,pack?.items.length || 0) ? 'done' : ''}>{item}</i>)}</div></div><button type="button" onClick={() => setStep(5)}>{language === 'vi' ? 'Xem trước' : 'Preview'}</button></article><article className="export"><span>↥</span><div><h3>Export outputs</h3><p>{language === 'vi' ? 'Các định dạng xuất bản và chia sẻ.' : 'Publishing and sharing formats.'}</p><div className="lp29-format-chips"><i>PPTX</i><i>PDF</i><i>HTML</i><i>JSON</i></div></div><button type="button" onClick={() => setStep(6)}>{language === 'vi' ? 'Xem tất cả' : 'View all'}</button></article></div></section>
    </section>
    {editingItem ? <ItemEditor item={editingItem} language={language} onChange={(patch) => updateItem(editingItem.id, patch)} onClose={() => setEditingId('')} /> : null}
  </div>;
}

function ProgressCard({ completion, language }) {
  return <section className="lp29-card lp29-mini-card lp29-progress-card"><header><h3>{language === 'vi' ? 'Tiến độ gói bài dạy' : 'Lesson pack progress'}</h3><button type="button">{language === 'vi' ? 'Xem chi tiết' : 'Details'}</button></header><div className="lp29-progress-content"><span style={{ '--progress': `${completion * 3.6}deg` }}><b>{completion}%</b></span><div><i style={{ width: `${completion}%` }} /><small>{language === 'vi' ? `Đã hoàn thành khoảng ${Math.round(completion / 100 * 6)}/6 bước` : `About ${Math.round(completion / 100 * 6)}/6 steps complete`}</small></div></div></section>;
}
function ResourceCard({ counts, language }) {
  const entries = [['▤',language === 'vi' ? 'Tài liệu' : 'Docs',counts.docs],['▧',language === 'vi' ? 'Hình ảnh' : 'Images',counts.images],['▶','Video',counts.videos],['♫','Audio',counts.audio],['↗',language === 'vi' ? 'Liên kết' : 'Links',counts.links]];
  return <section className="lp29-card lp29-mini-card"><header><h3>{language === 'vi' ? 'Tài nguyên đính kèm' : 'Attached resources'}</h3><button type="button">{language === 'vi' ? 'Quản lý' : 'Manage'}</button></header><div className="lp29-resource-grid">{entries.map(([icon,title,value])=><div key={title}><span>{icon}</span><b>{title}</b><small>{value}</small></div>)}</div></section>;
}
function OutputCard({ language, onPreview }) {
  return <section className="lp29-card lp29-mini-card"><header><h3>{language === 'vi' ? 'Chuỗi đầu ra' : 'Output chain'}</h3><button type="button" onClick={onPreview}>{language === 'vi' ? 'Xem tất cả' : 'View all'}</button></header><div className="lp29-output-chips"><span>{language === 'vi' ? 'Slide trình chiếu' : 'Presentation'}</span><span>{language === 'vi' ? 'Phiếu học tập' : 'Worksheet'}</span><span>{language === 'vi' ? 'Bài tập online' : 'Online task'}</span><span>{language === 'vi' ? 'Bảng tiêu chí' : 'Rubric'}</span></div></section>;
}
function QuickCheckCard({ issues, language, onFix }) {
  return <section className={`lp29-card lp29-mini-card lp29-check-card ${issues.length ? 'warning' : 'ready'}`}><header><h3>{language === 'vi' ? 'Kiểm tra nhanh' : 'Quick check'}</h3><button type="button" onClick={onFix}>↻ {language === 'vi' ? 'Kiểm tra lại' : 'Check again'}</button></header><div><span>{issues.length ? '!' : '✓'}</span><p>{issues[0] || (language === 'vi' ? 'Chưa phát hiện vấn đề. Gói bài của bạn đã sẵn sàng tiếp tục.' : 'No issues found. Your lesson pack is ready to continue.')}</p></div></section>;
}
