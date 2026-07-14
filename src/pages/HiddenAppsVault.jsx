import React, { useMemo, useState } from 'react';
import FlatAppIcon from '../components/FlatAppIcon.jsx';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { getAppVisibilityCatalog } from '../data/appVisibilityRegistry.js';
import { getHiddenAppIds, readAppVisibilityLocal, restoreAllHiddenApps, setAppHidden } from '../utils/appVisibility.js';
import { isAdminRole } from '../utils/roles.js';

const copy = {
  vi: {
    kicker: 'ADMIN ONLY · APP VISIBILITY',
    title: 'Thư mục ứng dụng đã ẩn',
    subtitle: 'Tạm ẩn các ứng dụng chưa sử dụng khỏi toàn bộ tài khoản giáo viên. Ứng dụng đã ẩn biến mất khỏi trang Ứng dụng, Trang chủ, thanh điều hướng, tìm kiếm nhanh và bị chặn khi mở bằng đường dẫn trực tiếp.',
    hidden: 'Đang ẩn', visible: 'Đang hiển thị', all: 'Tất cả ứng dụng', search: 'Tìm theo tên, nhóm hoặc chức năng…',
    hide: 'Ẩn khỏi giáo viên', restore: 'Khôi phục hiển thị', restoreAll: 'Hiện lại tất cả', open: 'Mở thử', reason: 'Lý do tạm ẩn',
    reasonPlaceholder: 'Ví dụ: Chưa triển khai trong học kỳ này', empty: 'Chưa có ứng dụng nào trong nhóm này.',
    confirmRestoreAll: 'Hiện lại toàn bộ ứng dụng cho giáo viên?', adminOnly: 'Khu vực này chỉ dành cho Admin.',
    savedCloud: 'Đã đồng bộ trạng thái hiển thị trên toàn hệ thống.', savedLocal: 'Đã lưu cục bộ. Hãy chạy migration V11.3.2 để đồng bộ cho mọi tài khoản.',
    failed: 'Không thể lưu thay đổi', hiddenBadge: 'GIÁO VIÊN KHÔNG THẤY', visibleBadge: 'ĐANG HOẠT ĐỘNG',
    hiddenCount: 'ứng dụng đang ẩn', visibleCount: 'ứng dụng đang hiển thị', protection: 'Bảo vệ đa lớp',
    protectionText: 'Ẩn khỏi launcher, navigation, command palette, homepage và direct route.',
  },
  en: {
    kicker: 'ADMIN ONLY · APP VISIBILITY',
    title: 'Hidden Apps Vault',
    subtitle: 'Temporarily remove unused apps from every teacher account. Hidden apps disappear from Apps, Home, navigation, quick search and are blocked on direct URLs.',
    hidden: 'Hidden', visible: 'Visible', all: 'All apps', search: 'Search by name, group or feature…',
    hide: 'Hide from teachers', restore: 'Restore visibility', restoreAll: 'Restore all', open: 'Open preview', reason: 'Temporary reason',
    reasonPlaceholder: 'Example: Not used this semester', empty: 'No apps in this group.',
    confirmRestoreAll: 'Restore every app for teachers?', adminOnly: 'This area is available to Admin only.',
    savedCloud: 'Visibility settings synced across the system.', savedLocal: 'Saved locally. Run the V11.3.2 migration to sync all accounts.',
    failed: 'Could not save the change', hiddenBadge: 'HIDDEN FROM TEACHERS', visibleBadge: 'ACTIVE',
    hiddenCount: 'hidden apps', visibleCount: 'visible apps', protection: 'Multi-layer protection',
    protectionText: 'Filtered from launcher, navigation, command palette, homepage and direct routes.',
  },
};

function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function HiddenAppsVault({ currentUser, language = 'vi', appVisibility }) {
  const t = copy[language] || copy.vi;
  const snapshot = appVisibility?.snapshot || readAppVisibilityLocal();
  const loading = Boolean(appVisibility?.loading);
  const refresh = appVisibility?.refresh || (async () => snapshot);
  const catalog = useMemo(() => getAppVisibilityCatalog().filter((item) => item.hideable), []);
  const hiddenSet = useMemo(() => new Set(getHiddenAppIds(snapshot)), [snapshot]);
  const [tab, setTab] = useState('hidden');
  const [query, setQuery] = useState('');
  const [reasons, setReasons] = useState({});
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const visibleCount = catalog.length - catalog.filter((item) => hiddenSet.has(item.id)).length;
  const hiddenCount = catalog.length - visibleCount;

  const items = useMemo(() => {
    const needle = normalized(query.trim());
    return catalog.filter((item) => {
      const hidden = hiddenSet.has(item.id);
      if (tab === 'hidden' && !hidden) return false;
      if (tab === 'visible' && hidden) return false;
      if (!needle) return true;
      return normalized([item.title, item.titleVi, item.group, item.groupVi, item.desc, item.descVi, item.slug, item.route].join(' ')).includes(needle);
    });
  }, [catalog, hiddenSet, query, tab]);

  if (!isAdminRole(currentUser?.role)) {
    return <section className="hidden-apps-vault denied"><h1>{t.adminOnly}</h1></section>;
  }

  const changeVisibility = async (item, hidden) => {
    setBusyId(item.id); setError(''); setNotice('');
    try {
      const result = await setAppHidden(currentUser, item, hidden, reasons[item.id] || snapshot.records?.[item.id]?.reason || '');
      await refresh();
      setNotice(result.cloud ? t.savedCloud : t.savedLocal);
      window.setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      setError(`${t.failed}: ${String(err?.message || err)}`);
    } finally {
      setBusyId('');
    }
  };

  const restoreAll = async () => {
    if (!window.confirm(t.confirmRestoreAll)) return;
    setBusyId('__all__'); setError(''); setNotice('');
    try {
      const result = await restoreAllHiddenApps(currentUser);
      await refresh();
      setNotice(result.cloud ? t.savedCloud : t.savedLocal);
    } catch (err) {
      setError(`${t.failed}: ${String(err?.message || err)}`);
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="hidden-apps-vault">
      <header className="hidden-vault-hero">
        <div>
          <p>{t.kicker}</p>
          <h1>{t.title}</h1>
          <span>{t.subtitle}</span>
        </div>
        <div className="hidden-vault-stats">
          <article><strong>{hiddenCount}</strong><span>{t.hiddenCount}</span></article>
          <article><strong>{visibleCount}</strong><span>{t.visibleCount}</span></article>
        </div>
      </header>

      <section className="hidden-vault-protection">
        <span aria-hidden="true">⌾</span><div><strong>{t.protection}</strong><p>{t.protectionText}</p></div>
      </section>

      <section className="hidden-vault-toolbar">
        <div className="hidden-vault-tabs">
          <button className={tab === 'hidden' ? 'active' : ''} onClick={() => setTab('hidden')}>{t.hidden} <b>{hiddenCount}</b></button>
          <button className={tab === 'visible' ? 'active' : ''} onClick={() => setTab('visible')}>{t.visible} <b>{visibleCount}</b></button>
          <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>{t.all} <b>{catalog.length}</b></button>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
        <button className="hidden-vault-restore-all" disabled={!hiddenCount || busyId === '__all__'} onClick={restoreAll}>{t.restoreAll}</button>
      </section>

      {notice ? <div className="hidden-vault-notice success">{notice}</div> : null}
      {error ? <div className="hidden-vault-notice error">{error}</div> : null}
      {loading ? <div className="hidden-vault-loading">Loading visibility settings…</div> : null}

      <section className="hidden-vault-grid">
        {items.map((item) => {
          const hidden = hiddenSet.has(item.id);
          const profile = getAppDesignProfile(item.slug);
          const title = language === 'vi' ? item.titleVi || item.title : item.title;
          const desc = language === 'vi' ? item.descVi || item.desc : item.desc;
          const currentReason = reasons[item.id] ?? snapshot.records?.[item.id]?.reason ?? '';
          return (
            <article key={item.id} className={`hidden-vault-card ${hidden ? 'is-hidden' : 'is-visible'}`} style={{ '--vault-accent': profile.accent || '#6255D9', '--vault-soft': profile.soft || '#EEECFF' }}>
              <div className="hidden-vault-card-head">
                <span className="hidden-vault-icon"><FlatAppIcon type={profile.icon} slug={item.slug} /></span>
                <div><small>{language === 'vi' ? item.groupVi || item.group : item.group}</small><h2>{title}</h2></div>
                <em>{hidden ? t.hiddenBadge : t.visibleBadge}</em>
              </div>
              <p>{desc}</p>
              <label>
                <span>{t.reason}</span>
                <input value={currentReason} onChange={(event) => setReasons((state) => ({ ...state, [item.id]: event.target.value }))} placeholder={t.reasonPlaceholder} />
              </label>
              <footer>
                <button type="button" className="secondary" onClick={() => { window.location.hash = item.target; }}>{t.open}</button>
                <button type="button" className={hidden ? 'restore' : 'hide'} disabled={busyId === item.id} onClick={() => changeVisibility(item, !hidden)}>
                  {hidden ? t.restore : t.hide}
                </button>
              </footer>
            </article>
          );
        })}
        {!items.length ? <div className="hidden-vault-empty"><span>▣</span><strong>{t.empty}</strong></div> : null}
      </section>
    </main>
  );
}
