import { createPortal } from 'react-dom';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, CalendarClock, ExternalLink, Globe2, RefreshCw, Settings2, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../utils/supabase.js';
import { isAdminRole } from '../../utils/roles.js';

function vnDateTime(value, language) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export default function WorldExplorerAdmin({ currentUser, language = 'vi', onClose }) {
  const vi = language !== 'en';
  const t = (vn, en) => vi ? vn : en;
  const admin = isAdminRole(currentUser?.role);
  const [enabled, setEnabled] = useState(true);
  const [autoHourly, setAutoHourly] = useState(true);
  const [published, setPublished] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('dashboard');
  const drawerRef = useRef(null);
  const closeRef = useRef(null);

  const refresh = useCallback(async () => {
    const [settings, articles] = await Promise.all([
      supabase.from('world_explorer_settings').select('enabled,auto_publish_hourly').eq('id', 1).single(),
      supabase.from('world_explorer_publications')
        .select('id,title_en,title_vi,published_at,image_url,source_url,source_kind,publication_date,is_visible')
        .order('published_at', { ascending: false }).limit(100),
    ]);
    if (settings.error || articles.error) {
      throw new Error(settings.error?.message || articles.error?.message || 'Database unavailable');
    }
    setEnabled(settings.data?.enabled === true);
    setAutoHourly(settings.data?.auto_publish_hourly === true);
    setPublished(articles.data || []);
  }, []);

  useEffect(() => {
    if (!admin) return undefined;
    refresh().catch((err) => setError(err.message));
  }, [admin, refresh]);

  useEffect(() => {
    if (!admin) return undefined;
    const lastFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(drawerRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || []).filter((node) => node.getClientRects().length);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault();
        focusable[0].focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (lastFocus?.isConnected) lastFocus.focus?.({ preventScroll: true });
    };
  }, [admin, onClose]);

  async function updateSetting(field, value) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: updateError } = await supabase.from('world_explorer_settings')
        .update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', 1);
      if (updateError) throw updateError;
      await refresh();
      setMessage(t('Đã lưu cài đặt.', 'Settings updated.'));
      window.dispatchEvent(new CustomEvent('bes-world-explorer-updated'));
    } catch (err) {
      setError(err?.message || 'Unable to update');
    } finally { setBusy(false); }
  }

  async function reload() {
    setBusy(true); setError(''); setMessage('');
    try { await refresh(); setMessage(t('Dữ liệu đã được cập nhật.', 'Data refreshed.')); }
    catch (err) { setError(err?.message || 'Unable to refresh'); }
    finally { setBusy(false); }
  }

  if (!admin) return null;
  const publishedToday = published.filter((item) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(item.published_at)) ===
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
  ).length;
  const latest = published[0];

  return createPortal(
    <div className="we-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-world-explorer-drawer-backdrop>
      <aside className="we-admin we-admin-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="we-admin-drawer-title" data-world-explorer-admin-drawer>
        <header className="we-admin-header">
          <div>
            <span>BRIAN ENGLISH · AUTO CONTENT STUDIO</span>
            <h2 id="we-admin-drawer-title"><Globe2 size={25} aria-hidden="true" /> World Explorer</h2>
            <p>{t('Tự động thu thập và xuất bản bài Anh–Việt theo giờ, không cần duyệt.', 'Automatically publishing bilingual illustrated articles every hour, no approval required.')}</p>
          </div>
          <button type="button" className="we-close" ref={closeRef} aria-label={t('Đóng bảng quản lý', 'Close management drawer')} onClick={onClose}><X size={20} /></button>
        </header>
        <nav className="we-tabs" aria-label="World Explorer management">
          <button type="button" className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}><Activity size={15} /> {t('Tổng quan', 'Overview')}</button>
          <button type="button" className={tab === 'published' ? 'active' : ''} onClick={() => setTab('published')}><CalendarClock size={15} /> {t('Bài đã đăng', 'Published stories')}</button>
          <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><Settings2 size={15} /> {t('Cài đặt', 'Settings')}</button>
        </nav>
        {error ? <p className="we-admin-message" role="alert">{error}</p> : null}
        {message ? <p className="we-admin-message" role="status">{message}</p> : null}
        <div className="we-admin-body">
          {tab === 'dashboard' ? <>
            <div className="we-dashboard-status">
              <div className="we-dashboard-status__icon"><Activity size={22} /></div>
              <div>
                <strong>{autoHourly && enabled ? t('Đang bật tự động đăng mỗi giờ', 'Hourly auto-publishing is enabled') : t('Tự động đăng đang tắt', 'Auto-publishing is paused')}</strong>
                <p>{t('Mỗi giờ tròn, hệ thống thử lấy bài song ngữ mới có ảnh hợp lệ và nguồn ghi công đầy đủ.', 'At every full hour, the system attempts to publish a new bilingual article with licensed imagery and source credits.')}</p>
              </div>
            </div>
            <div className="we-admin-metrics">
              <div><strong>{published.length}</strong><span>{t('Bài gần nhất', 'Recent posts')}</span></div>
              <div><strong>{publishedToday}</strong><span>{t('Đã đăng hôm nay', 'Published today')}</span></div>
              <div><strong>{autoHourly ? '24' : '—'}</strong><span>{t('Lượt dự kiến/ngày', 'Hourly checks/day')}</span></div>
            </div>
            <div className="we-admin-info">
              <strong><ShieldCheck size={16} /> {t('Quy tắc xuất bản tự động', 'Auto-publishing rules')}</strong>
              <p>{t('Không cần Admin duyệt. Chỉ đăng bài có nội dung Anh–Việt, ảnh Wikimedia Commons với giấy phép phù hợp, nguồn tác giả và liên kết tham khảo. Nếu không đủ dữ liệu, hệ thống bỏ lượt đó thay vì đăng bài rỗng.', 'No approval needed. Requires both language versions, reusable Wikimedia Commons imagery, attribution and article sources. Missing or unusable material causes the hour to be skipped.')}</p>
              <p>{t('Giờ hiển thị: Asia/Ho_Chi_Minh. Bài gần nhất vẫn được giữ trên trang chủ khi không có bài mới.', 'Time zone: Asia/Ho_Chi_Minh. The latest article remains visible if a scheduled run cannot publish.')}</p>
            </div>
            {latest ? <div className="we-admin-last"><small>{t('Bài mới nhất', 'Latest article')} · {vnDateTime(latest.published_at,language)}</small><strong>{latest.title_en}</strong><p>{latest.title_vi}</p></div> : null}
            <button type="button" className="we-admin-refresh" disabled={busy} onClick={reload}><RefreshCw size={16} /> {t('Làm mới trạng thái', 'Refresh status')}</button>
          </> : null}
          {tab === 'published' ? <>
            <div className="we-admin-toolbar"><strong>{t('Nhật ký bài đã xuất bản', 'Published articles')}</strong><button type="button" disabled={busy} onClick={reload}><RefreshCw size={16} /> {t('Làm mới', 'Refresh')}</button></div>
            {published.length ? <div className="we-admin-list">{published.map((article) => (
              <article key={article.id}>
                {article.image_url ? <img className="we-admin-post-thumb" alt="" src={article.image_url} loading="lazy" /> : null}
                <div className="we-admin-post-title">
                  <small>{vnDateTime(article.published_at, language)} · {article.source_kind === 'wikimedia' ? 'Wikimedia' : 'Editorial'}</small>
                  <h3>{article.title_en}</h3><p>{article.title_vi}</p>
                </div>
                {article.source_url ? <a href={article.source_url} target="_blank" rel="noopener noreferrer" aria-label={t('Mở nguồn bài viết', 'Open article source')}><ExternalLink size={18}/></a> : null}
              </article>
            ))}</div> : <p className="we-admin-hint">{t('Chưa có bài nào được công bố.', 'No published articles yet.')}</p>}
          </> : null}
          {tab === 'settings' ? <div className="we-admin-settings">
            <strong>{t('Cài đặt xuất bản', 'Publishing settings')}</strong>
            <div className="we-auto-setting">
              <div><b>{t('Tự động đăng bài mỗi giờ', 'Publish hourly automatically')}</b><p>{t('Tự thu thập và đăng khi đủ nội dung và ảnh có bản quyền phù hợp. Không cần Admin duyệt.', 'Fetches and publishes valid bilingual illustrated stories without admin approval.')}</p></div>
              <button type="button" className={autoHourly ? 'we-switch is-on' : 'we-switch'} role="switch" aria-checked={autoHourly} aria-label={t('Tự động đăng mỗi giờ', 'Auto publish hourly')} disabled={busy} onClick={() => updateSetting('auto_publish_hourly', !autoHourly)}><span /></button>
            </div>
            <div className="we-auto-setting">
              <div><b>{t('Hiển thị chuyên mục trên trang chủ', 'Show on public homepage')}</b><p>{t('Tắt để ẩn World Explorer với khách truy cập mà không xóa dữ liệu.', 'Hide the homepage section without removing published stories.')}</p></div>
              <button type="button" className={enabled ? 'we-switch is-on' : 'we-switch'} role="switch" aria-checked={enabled} aria-label={t('Hiển thị World Explorer', 'Show World Explorer')} disabled={busy} onClick={() => updateSetting('enabled', !enabled)}><span /></button>
            </div>
            <div className="we-admin-info"><strong>{t('Nguồn sử dụng', 'Sources')}</strong><p>English Wikipedia · Vietnamese Wikipedia · Wikimedia Commons</p><p>{t('Nội dung CC BY-SA 4.0; ảnh có giấy phép CC BY/CC BY-SA/CC0 hoặc thuộc phạm vi công cộng. Tác giả và giấy phép hiển thị trong từng bài.', 'Text CC BY-SA 4.0; imagery must have an applicable CC BY, CC BY-SA, CC0 or public-domain license. Credits are shown with every story.')}</p></div>
          </div> : null}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
