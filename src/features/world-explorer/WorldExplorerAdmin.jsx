import { createPortal } from 'react-dom';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Plus, RefreshCw, Save, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../utils/supabase.js';
import { isAdminRole } from '../../utils/roles.js';

const empty = {
  title_en: '', title_vi: '', intro_en: '', intro_vi: '', body_en: '', body_vi: '',
  fact_en: '', fact_vi: '', category: 'culture', image_url: '', image_alt_en: '',
  image_credit: '', source_title: '', source_url: '', scheduled_date: '',
  vocabulary: [], status: 'draft',
};
function toSlug(title) {
  return String(title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'discovery';
}
function serializeWords(items) {
  return Array.isArray(items) ? items.map((w) => (w.word || '') + ' | ' + (w.meaning || '')).join('\n') : '';
}
function parseWords(text) {
  return text.split('\n').map((line) => {
    const [word, ...meaning] = line.split('|');
    return { word: String(word || '').trim(), meaning: meaning.join('|').trim() };
  }).filter((v) => v.word && v.meaning).slice(0, 8);
}
function validate(a) {
  if (!a.title_en?.trim() || !a.title_vi?.trim() || !a.body_en?.trim() || !a.body_vi?.trim()) return 'Cần có tiêu đề và nội dung đầy đủ bằng cả tiếng Anh lẫn tiếng Việt.';
  if (!a.intro_en?.trim() || !a.intro_vi?.trim()) return 'Vui lòng bổ sung giới thiệu song ngữ.';
  if (!a.scheduled_date) return 'Hãy chọn ngày xuất bản.';
  try {
    if (new URL(a.source_url).protocol !== 'https:') throw new Error();
    if (a.image_url && new URL(a.image_url).protocol !== 'https:') throw new Error();
  } catch { return 'Đường dẫn nguồn và ảnh (nếu có) phải sử dụng HTTPS hợp lệ.'; }
  if (a.image_url && !a.image_credit?.trim()) return 'Ảnh minh họa phải ghi nguồn, tác giả hoặc thông tin giấy phép.';
  return '';
}

export default function WorldExplorerAdmin({ currentUser, onClose, language = 'vi' }) {
  const tr = (vi, en) => language === 'en' ? en : vi;
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState({ ...empty });
  const [words, setWords] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('queue');
  const canManage = isAdminRole(currentUser?.role);
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const refresh = useCallback(async () => {
    const [articles, settings] = await Promise.all([
      supabase.from('world_explorer_articles').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('world_explorer_settings').select('enabled').eq('id', 1).single(),
    ]);
    if (articles.error || settings.error) throw new Error(articles.error?.message || settings.error?.message);
    setList(articles.data || []);
    setEnabled(settings.data?.enabled !== false);
  }, []);
  useEffect(() => { if (canManage) refresh().catch((e) => setMessage(e.message)); }, [canManage, refresh]);
  useEffect(() => {
    if (!canManage) return undefined;
    const priorFocus = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onDrawerKeys = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(drawerRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || []).filter((element) => element.getClientRects().length > 0);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onDrawerKeys);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onDrawerKeys);
      if (priorFocus?.isConnected) priorFocus.focus?.({ preventScroll: true });
    };
  }, [canManage, onClose]);
  if (!canManage) return null;
  function edit(article) { setDraft({ ...empty, ...article }); setWords(serializeWords(article.vocabulary)); setTab('editor'); setMessage(''); }
  function reset() { setDraft({ ...empty }); setWords(''); setTab('editor'); setMessage(''); }
  function field(name) { return { value: draft[name] || '', onChange: (event) => setDraft((old) => ({ ...old, [name]: event.target.value })) }; }
  async function run(action) {
    setBusy(true); setMessage('');
    try {
      await action();
      await refresh();
    } catch (e) { setMessage('Không thể thực hiện: ' + (e?.message || 'Unknown error')); }
    finally { setBusy(false); }
  }
  function payload() {
    const { id, created_at, updated_at, approved_by, approved_at, published_at, ...rest } = draft;
    return {
      ...rest,
      slug: draft.id ? draft.slug : (toSlug(draft.title_en) + '-' + Date.now().toString(36)),
      vocabulary: parseWords(words),
      status: 'draft',
      approved_by: null,
      approved_at: null,
      image_url: draft.image_url || null,
      image_credit: draft.image_credit || null,
      image_alt_en: draft.image_alt_en || null,
      source_title: draft.source_title || null,
      scheduled_date: draft.scheduled_date || null,
    };
  }
  async function save(status = 'draft') {
    const next = payload();
    if (status === 'in_review' && (validate(next))) { setMessage(validate(next)); return; }
    next.status = status;
    await run(async () => {
      if (draft.id && draft.status === 'published') throw new Error('Không thể sửa bản đã xuất bản. Hãy tạo bài mới.');
      const query = draft.id
        ? supabase.from('world_explorer_articles').update(next).eq('id', draft.id)
        : supabase.from('world_explorer_articles').insert(next);
      const { error } = await query;
      if (error) throw error;
      setMessage(status === 'in_review' ? 'Đã chuyển vào hàng chờ duyệt.' : 'Đã lưu bản nháp.');
      setTab('queue');
      setDraft({ ...empty }); setWords('');
    });
  }
  async function approve(article) {
    const problem = validate(article);
    if (problem) { setMessage(problem); return; }
    await run(async () => {
      if (article.status === 'published') throw new Error('Bài này đã xuất bản.');
      const { error } = await supabase.from('world_explorer_articles').update({
        status: 'approved',
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString(),
      }).eq('id', article.id);
      if (error) throw error;
      setMessage('Bài đã được phê duyệt. Hệ thống sẽ xuất bản lúc 07:00 vào ngày đã chọn.');
    });
  }
  async function publishToday() {
    await run(async () => {
      const { data, error } = await supabase.rpc('world_explorer_publish_today');
      if (error) throw error;
      if (data?.published) {
        setMessage(tr('Đã công bố một bài đã duyệt cho hôm nay.', 'An approved story has been published for today.'));
        window.dispatchEvent(new CustomEvent('bes-world-explorer-updated'));
      } else if (data?.reason === 'already_published_today') {
        setMessage(tr('Hôm nay đã có bài được công bố.', 'A story has already been published today.'));
      } else {
        setMessage(tr('Chưa có bài đã duyệt đến hạn xuất bản.', 'No approved story is due for publication.'));
      }
    });
  }
  async function reject(article) {
    await run(async () => {
      const { error } = await supabase.from('world_explorer_articles')
        .update({ status: 'rejected', approved_by: null, approved_at: null }).eq('id', article.id);
      if (error) throw error;
      setMessage('Bài đã bị từ chối.');
    });
  }
  async function toggle() {
    await run(async () => {
      const { error } = await supabase.from('world_explorer_settings')
        .update({ enabled: !enabled, updated_at: new Date().toISOString() }).eq('id', 1);
      if (error) throw error;
      setMessage(!enabled ? 'Đã bật World Explorer công khai.' : 'Đã ẩn World Explorer khỏi khách truy cập.');
    });
  }
  return createPortal(
    <div className="we-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-world-explorer-drawer-backdrop>
      <aside className="we-admin we-admin-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="we-admin-drawer-title" data-world-explorer-admin-drawer>
        <header className="we-admin-header">
          <div><span>BRIAN ENGLISH · CONTENT MANAGEMENT</span><h2 id="we-admin-drawer-title"><ShieldCheck size={24}/> World Explorer Studio</h2><p>{tr("Biên tập · Kiểm duyệt · Lên lịch bài viết hằng ngày","Edit · Review · Schedule daily stories")}</p></div>
          <button type="button" className="we-close" ref={closeRef} aria-label={tr('Đóng bảng quản lý', 'Close management drawer')} onClick={onClose}><X size={20}/></button>
        </header>
        <nav className="we-tabs" aria-label="World Explorer management">
          <button type="button" className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>Danh sách ({list.length})</button>
          <button type="button" className={tab === 'editor' ? 'active' : ''} onClick={() => setTab('editor')}>{tr("Trình biên tập","Editor")}</button>
          <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Cài đặt</button>
        </nav>
        {message ? <p className="we-admin-message" role="status">{message}</p> : null}
        <div className="we-admin-body">
          {tab === 'queue' ? <>
            <div className="we-admin-toolbar"><strong>{tr("Hàng chờ nội dung","Editorial queue")}</strong><button type="button" onClick={reset}><Plus size={16}/> {tr('Tạo bài viết', 'New story')}</button>{list.some((a) => a.status === 'approved') ? <button type="button" disabled={busy} onClick={publishToday}><CheckCircle2 size={16} />{tr('Công bố bài đã duyệt', 'Publish approved story')}</button> : null}<button type="button" onClick={() => run(refresh)}><RefreshCw size={16}/> Làm mới</button></div>
            {list.length ? <div className="we-admin-list">{list.map((a) => <article key={a.id}><div><small>{a.scheduled_date || 'Chưa xếp lịch'} · <b>{a.status}</b></small><h3>{a.title_en || 'Untitled'}</h3><p>{a.title_vi}</p></div><div className="we-admin-actions"><button type="button" onClick={() => edit(a)}>{tr("Chi tiết / Sửa","View / Edit")}</button>{a.status !== 'approved' && a.status !== 'published' ? <button type="button" disabled={busy} onClick={() => approve(a)}><CheckCircle2 size={15}/> Duyệt</button> : null}{a.status !== 'rejected' && a.status !== 'published' ? <button type="button" disabled={busy} onClick={() => reject(a)}>Từ chối</button> : null}</div></article>)}</div> : <p className="we-admin-hint">{tr("Chưa có bài. Tạo bài đầu tiên và duyệt trước khi xuất bản.","No stories yet. Create and approve the first story before publishing.")}</p>}
          </> : null}
          {tab === 'editor' ? <form className="we-form" onSubmit={(event) => { event.preventDefault(); save('in_review'); }}>
            <div className="we-form-row"><label>{tr("Chuyên mục","Category")}<select {...field('category')}><option value="culture">Culture & Traditions</option><option value="history">World History</option><option value="places">Places & Wonders</option><option value="science">Science & Discovery</option><option value="language">Language & Society</option><option value="international">International Days</option></select></label><label>{tr("Ngày xuất bản (VN)","Publication date (Vietnam)")}<input type="date" {...field('scheduled_date')}/></label></div>
            <div className="we-form-row"><label>English title<input type="text" maxLength={90} {...field('title_en')}/></label><label>{tr("Tiêu đề tiếng Việt","Vietnamese title")}<input type="text" maxLength={110} {...field('title_vi')}/></label></div>
            <div className="we-form-row"><label>English introduction<textarea rows={2} {...field('intro_en')}/></label><label>{tr("Giới thiệu tiếng Việt","Vietnamese introduction")}<textarea rows={2} {...field('intro_vi')}/></label></div>
            <div className="we-form-row"><label>English article<textarea rows={7} {...field('body_en')}/></label><label>{tr("Bài viết tiếng Việt","Vietnamese article")}<textarea rows={7} {...field('body_vi')}/></label></div>
            <div className="we-form-row"><label>Did you know?<textarea rows={2} {...field('fact_en')}/></label><label>{tr("Bạn có biết?","Did you know?")}<textarea rows={2} {...field('fact_vi')}/></label></div>
            <label>{tr("Vocabulary (mỗi dòng: English | Nghĩa tiếng Việt)","Vocabulary (one per line: English | Vietnamese meaning)")}<textarea rows={3} value={words} onChange={(event) => setWords(event.target.value)} placeholder={'heritage | di sản\ntradition | truyền thống'} /></label>
            <div className="we-form-row"><label>{tr("Ảnh minh họa HTTPS","Featured image HTTPS")}<input type="url" {...field('image_url')}/></label><label>Alt text<input type="text" {...field('image_alt_en')}/></label></div>
            <label>{tr("Ghi công ảnh và giấy phép","Image attribution and licence")}<input type="text" {...field('image_credit')} placeholder="Photographer / Licence / Link"/></label>
            <div className="we-form-row"><label>{tr("Tiêu đề nguồn","Source title")}<input type="text" {...field('source_title')}/></label><label>{tr("Đường dẫn nguồn HTTPS","Source URL (HTTPS)")}<input type="url" {...field('source_url')}/></label></div>
            <div className="we-admin-toolbar"><button type="button" onClick={() => save('draft')} disabled={busy}><Save size={16}/> Lưu nháp</button><button type="submit" disabled={busy}><CalendarDays size={16}/> Gửi duyệt</button></div>
          </form> : null}
          {tab === 'settings' ? <div className="we-admin-settings"><strong>{tr("Hiển thị trên trang chủ","Homepage visibility")}</strong><p>{enabled ? 'Đang công khai World Explorer.' : 'Đang ẩn World Explorer đối với khách truy cập.'}</p><button type="button" disabled={busy} onClick={toggle}>{enabled ? 'Tắt chuyên mục' : 'Bật chuyên mục'}</button><p><b>{tr("Lịch xuất bản:","Publishing schedule:")}</b> 07:00 mỗi ngày (Asia/Ho_Chi_Minh). Chỉ bài được Admin duyệt trước và có ngày lên lịch phù hợp mới được xuất bản.</p><p>{tr("Để tránh lộ nội dung nháp, dữ liệu quản trị được bảo vệ bằng RLS ở Supabase.","Draft articles are protected by Supabase row-level security.")}</p></div> : null}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
