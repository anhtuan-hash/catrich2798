import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileBadge2,
  HelpCircle,
  Home,
  Landmark,
  Radio,
  Search,
  Settings,
  X,
} from 'lucide-react';
import CompetitionBanner from './CompetitionBanner.jsx';
import { NAV_ITEMS } from './SideNavigation.jsx';
import Footer from './Footer.jsx';

// ImmersiveShell — Swiss Editorial V3 horizontal topbar shell (full-width workspace).
// CONTRACT props: {activeNav, onNavigate(id), children, language, staff, data, query, onQueryChange, onRefresh, onHelp, pendingCount}.
// Renders horizontal <header className="igv2-topbar"> first, <CompetitionBanner /> below it at the top
// of module content, full-width <main className="igv2-main-full">, and 3-card <Footer /> last.
// Nothing leaks outside .igv2.

export const NAV_LABEL = Object.fromEntries(NAV_ITEMS.map((n) => [n.id, n.label]));

const tr = (lang, vi, en) => (lang === 'en' ? en : vi);

const PRIMARY_NAV = [
  { id: 'overview', icon: Home, vi: 'Tổng quan', en: 'Overview' },
  { id: 'lessons', icon: BookOpen, vi: 'Bài học', en: 'Lessons' },
  { id: 'submissions', icon: ClipboardCheck, vi: 'Bài nộp', en: 'Submissions' },
  { id: 'exhibitions', icon: Landmark, vi: 'Triển lãm', en: 'Exhibitions' },
  { id: 'teaching-plan', icon: CalendarDays, vi: 'Kế hoạch dạy', en: 'Teaching Plan' },
];

const SECONDARY_NAV = [
  {
    id: 'teacher-live',
    icon: Radio,
    vi: 'Trực tiếp',
    en: 'Live',
    titleVi: 'Giảng dạy trực tiếp',
    titleEn: 'Teacher Live',
  },
  {
    id: 'competition-dossier',
    icon: FileBadge2,
    vi: 'Hồ sơ',
    en: 'Dossier',
    titleVi: 'Hồ sơ dự thi',
    titleEn: 'Competition Dossier',
  },
];

function shortTeacherName(profile) {
  const full = String(profile?.full_name || profile?.display_name || profile?.name || '').trim();
  if (!full) return { fullName: 'Nguyễn Anh Tuấn', shortName: 'Tuấn', initial: 'N' };
  const parts = full.split(/\s+/).filter(Boolean);
  const shortName = parts[parts.length - 1] || full;
  const initial = (parts[0]?.[0] || full[0] || 'N').toUpperCase();
  return { fullName: full, shortName, initial };
}

export default function ImmersiveShell({
  activeNav,
  onNavigate,
  children,
  language = 'en',
  staff,
  data,
  query = '',
  onQueryChange,
  onHelp,
  pendingCount = 0,
}) {
  const payload = data || staff || {};
  const profile = payload?.profile || {};
  const teacher = shortTeacherName(profile);
  const [searchOpen, setSearchOpen] = useState(Boolean(query));
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (query && !searchOpen) setSearchOpen(true);
  }, [query, searchOpen]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (activeNav === 'overview' && onNavigate) {
      onNavigate('lessons');
    }
  };

  return (
    <div
      className="igv2"
      data-testid="immersive-gallery-v2"
      data-ui-locale={language === 'en' ? 'en-US' : 'vi-VN'}
    >
      <header className="igv2-topbar" data-testid="igv2-topbar">
        <div className="igv2-topbar-inner">
          <button
            type="button"
            className="igv2-topbar-brand"
            onClick={() => onNavigate?.('overview')}
            aria-label={tr(language, 'Brian English · Về tổng quan', 'Brian English · Go to overview')}
          >
            <img
              src="/brian-english-brand-mark.png"
              alt="Brian English"
              width={30}
              height={30}
              className="igv2-topbar-logo"
            />
            <span className="igv2-topbar-wordmark">Brian English</span>
          </button>

          <span className="igv2-topbar-sep" aria-hidden="true" />

          <nav
            className="igv2-topbar-nav"
            aria-label={tr(language, 'Điều hướng không gian Museum Lab', 'Museum Lab workspace navigation')}
          >
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`igv2-nav-${item.id}`}
                  className={`igv2-nav-pill${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onNavigate?.(item.id)}
                >
                  <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                  <span>{tr(language, item.vi, item.en)}</span>
                </button>
              );
            })}
          </nav>

          <div className="igv2-topbar-utils">
            {SECONDARY_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`igv2-nav-${item.id}`}
                  className={`igv2-util-btn igv2-util-nav${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={tr(language, item.titleVi, item.titleEn)}
                  title={tr(language, item.titleVi, item.titleEn)}
                  onClick={() => onNavigate?.(item.id)}
                >
                  <Icon size={17} strokeWidth={1.85} aria-hidden="true" />
                </button>
              );
            })}
            {onQueryChange ? (
              <div className={`igv2-search-wrap${searchOpen ? ' is-open' : ''}`} data-bes-keep-search="true">
                {searchOpen ? (
                  <form className="igv2-search-form" data-bes-keep-search="true" onSubmit={handleSearchSubmit} role="search">
                    <Search size={15} className="igv2-search-inline-icon" aria-hidden="true" />
                    <input
                      ref={searchInputRef}
                      data-testid="igv2-search-input"
                      data-bes-keep-search="true"
                      type="search"
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' && !query) setSearchOpen(false);
                      }}
                      placeholder={tr(language, 'Tìm bài học, nhóm…', 'Search lessons, groups…')}
                      aria-label={tr(language, 'Tìm kiếm bài học hoặc bài nộp', 'Search lessons or submissions')}
                    />
                    <button
                      type="button"
                      className="igv2-search-clear"
                      aria-label={tr(language, 'Đóng tìm kiếm', 'Close search')}
                      onClick={() => {
                        if (query) {
                          onQueryChange('');
                        } else {
                          setSearchOpen(false);
                        }
                      }}
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="igv2-util-btn"
                    data-testid="igv2-search-toggle"
                    aria-label={tr(language, 'Tìm kiếm', 'Search')}
                    title={tr(language, 'Tìm kiếm bài học & bài nộp', 'Search lessons & submissions')}
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search size={17} strokeWidth={1.85} aria-hidden="true" />
                  </button>
                )}
              </div>
            ) : null}

            <button
              type="button"
              className="igv2-util-btn has-badge"
              data-testid="igv2-bell-btn"
              aria-label={tr(
                language,
                `Bài nộp chờ duyệt (${pendingCount})`,
                `Pending submissions (${pendingCount})`
              )}
              title={tr(language, 'Xem bài nộp cần duyệt', 'Review pending submissions')}
              onClick={() => onNavigate?.('submissions')}
            >
              <Bell size={17} strokeWidth={1.85} aria-hidden="true" />
              {pendingCount > 0 ? (
                <span className="igv2-badge-count">{pendingCount > 99 ? '99+' : pendingCount}</span>
              ) : null}
            </button>

            <button
              type="button"
              className={`igv2-util-btn${activeNav === 'settings' ? ' is-active' : ''}`}
              data-testid="igv2-nav-settings"
              aria-label={tr(language, 'Cài đặt hệ thống', 'Settings')}
              aria-current={activeNav === 'settings' ? 'page' : undefined}
              title={tr(language, 'Cài đặt Museum Lab', 'Museum Lab settings')}
              onClick={() => onNavigate?.('settings')}
            >
              <Settings size={17} strokeWidth={1.85} aria-hidden="true" />
            </button>

            {onHelp ? (
              <button
                type="button"
                className="igv2-util-btn"
                data-testid="igv2-help-btn"
                aria-label={tr(language, 'Hướng dẫn sử dụng', 'Help guide')}
                title={tr(language, 'Hướng dẫn nhanh', 'Quick help')}
                onClick={onHelp}
              >
                <HelpCircle size={17} strokeWidth={1.85} aria-hidden="true" />
              </button>
            ) : null}

            <div className="igv2-user-menu" ref={menuRef}>
              <button
                type="button"
                className="igv2-user-trigger"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="igv2-avatar" aria-hidden="true">{teacher.initial}</span>
                <span className="igv2-user-name">{teacher.shortName}</span>
                <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
              </button>

              {menuOpen ? (
                <div className="igv2-user-dropdown" role="menu">
                  <div className="igv2-user-dropdown-head">
                    <strong>{teacher.fullName}</strong>
                    <span>{profile?.school || 'Petrus Ky School'}</span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate?.('teacher-live');
                    }}
                  >
                    <Radio size={14} aria-hidden="true" />
                    <span>{tr(language, 'Điều phối lớp trực tiếp', 'Teacher Live')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate?.('competition-dossier');
                    }}
                  >
                    <FileBadge2 size={14} aria-hidden="true" />
                    <span>{tr(language, 'Hồ sơ dự thi', 'Competition Dossier')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate?.('settings');
                    }}
                  >
                    <Settings size={14} aria-hidden="true" />
                    <span>{tr(language, 'Cài đặt', 'Settings')}</span>
                  </button>
                  {onHelp ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onHelp();
                      }}
                    >
                      <HelpCircle size={14} aria-hidden="true" />
                      <span>{tr(language, 'Hướng dẫn sử dụng', 'Help guide')}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="igv2-banner-wrap">
        <CompetitionBanner />
      </div>

      <main className="igv2-main-full" id="igv2-main" aria-label={NAV_LABEL[activeNav] || 'Overview'}>
        {children}
      </main>

      <Footer staff={payload} language={language} />
    </div>
  );
}
