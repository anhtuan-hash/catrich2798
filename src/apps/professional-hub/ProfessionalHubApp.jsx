import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/homeroom-complete.css';
import './professional-hub.css';

const TABS = [
  { key: 'overview', icon: '⌂', vi: 'Tổng quan', en: 'Overview' },
  { key: 'calendar', icon: '▦', vi: 'Lịch', en: 'Calendar' },
  { key: 'tasks', icon: '✓', vi: 'Giao việc', en: 'Tasks' },
  { key: 'plans', icon: '▤', vi: 'Kế hoạch', en: 'Plans' },
  { key: 'records', icon: '▣', vi: 'Hồ sơ', en: 'Records' },
  { key: 'meetings', icon: '◉', vi: 'Sinh hoạt tổ', en: 'Meetings' },
  { key: 'evidence', icon: '◇', vi: 'Minh chứng', en: 'Evidence' },
  { key: 'reports', icon: '▥', vi: 'Báo cáo', en: 'Reports' },
];

const TAB_COPY = {
  overview: {
    vi: 'Tổng quan Hub Chuyên môn',
    en: 'Professional Hub overview',
    descriptionVi: 'Dữ liệu sẽ được hiển thị sau khi tài khoản được phân công vào Hub.',
    descriptionEn: 'Data will appear after the account is assigned to a Hub.',
  },
  calendar: {
    vi: 'Lịch chuyên môn',
    en: 'Professional calendar',
    descriptionVi: 'Lịch họp, hạn nhiệm vụ, hồ sơ và mốc kế hoạch sẽ được hợp nhất tại đây.',
    descriptionEn: 'Meetings, task deadlines, records and plan milestones will be unified here.',
  },
  tasks: {
    vi: 'Giao việc',
    en: 'Tasks',
    descriptionVi: 'TTCM sẽ giao nhiệm vụ cho tài khoản giáo viên thật trong Brian.',
    descriptionEn: 'Leaders will assign work to real Brian teacher accounts.',
  },
  plans: {
    vi: 'Kế hoạch',
    en: 'Plans',
    descriptionVi: 'Quản lý kế hoạch theo quy trình dự thảo, duyệt, triển khai và lưu trữ.',
    descriptionEn: 'Manage plans through drafting, approval, delivery and archive workflows.',
  },
  records: {
    vi: 'Hồ sơ chuyên môn',
    en: 'Professional records',
    descriptionVi: 'Nộp hồ sơ, nhận phản hồi, chỉnh sửa và theo dõi phê duyệt.',
    descriptionEn: 'Submit records, receive feedback, revise and track approval.',
  },
  meetings: {
    vi: 'Sinh hoạt tổ',
    en: 'Team meetings',
    descriptionVi: 'Quản lý chương trình, điểm danh, biên bản và nhiệm vụ phát sinh.',
    descriptionEn: 'Manage agendas, attendance, minutes and follow-up tasks.',
  },
  evidence: {
    vi: 'Minh chứng',
    en: 'Evidence',
    descriptionVi: 'Tải lên và xác minh minh chứng theo đúng quyền của từng thành viên.',
    descriptionEn: 'Upload and verify evidence under role-based access.',
  },
  reports: {
    vi: 'Báo cáo',
    en: 'Reports',
    descriptionVi: 'Tổng hợp theo thời gian, giáo viên và trạng thái; xuất Word, PDF hoặc HTML.',
    descriptionEn: 'Aggregate by period, teacher and status; export Word, PDF or HTML.',
  },
};

const METRICS = [
  { key: 'tasks', value: '0', vi: 'Nhiệm vụ', en: 'Tasks', noteVi: 'Chưa nối dữ liệu', noteEn: 'Data not connected', tone: 'tone-blue' },
  { key: 'records', value: '0', vi: 'Hồ sơ', en: 'Records', noteVi: 'Chưa có membership', noteEn: 'No membership yet', tone: 'tone-purple' },
  { key: 'plans', value: '0', vi: 'Kế hoạch', en: 'Plans', noteVi: 'Chờ dữ liệu thật', noteEn: 'Waiting for real data', tone: 'tone-green' },
  { key: 'evidence', value: '0', vi: 'Minh chứng', en: 'Evidence', noteVi: 'Không dữ liệu mẫu', noteEn: 'No mock data', tone: 'tone-orange' },
];

function HubTabs({ active, onChange, language }) {
  return (
    <nav
      className="hr-tabs professional-hub-tabs"
      aria-label={language === 'vi' ? 'Phân hệ Hub Chuyên môn' : 'Professional Hub sections'}
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={active === tab.key ? 'active' : ''}
          onClick={() => onChange(tab.key)}
          aria-current={active === tab.key ? 'page' : undefined}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <b>{language === 'vi' ? tab.vi : tab.en}</b>
        </button>
      ))}
    </nav>
  );
}

function MetricCard({ metric, language }) {
  return (
    <article className={`hr-stat ${metric.tone}`}>
      <strong>{metric.value}</strong>
      <b>{language === 'vi' ? metric.vi : metric.en}</b>
      <span>{language === 'vi' ? metric.noteVi : metric.noteEn}</span>
    </article>
  );
}

function EmptyState({ activeTab, language }) {
  const copy = TAB_COPY[activeTab] || TAB_COPY.overview;

  return (
    <section className="hr-empty professional-hub-empty" aria-live="polite">
      <span className="professional-hub-empty-mark" aria-hidden="true">PH</span>
      <div>
        <p className="professional-hub-kicker">
          {language === 'vi' ? 'CHƯA CÓ DỮ LIỆU THẬT' : 'NO REAL DATA YET'}
        </p>
        <h2>{language === 'vi' ? copy.vi : copy.en}</h2>
        <p>{language === 'vi' ? copy.descriptionVi : copy.descriptionEn}</p>
        <small>
          {language === 'vi'
            ? 'Không sử dụng danh sách giáo viên hoặc hồ sơ mẫu.'
            : 'No sample teacher roster or records are used.'}
        </small>
      </div>
    </section>
  );
}

function LoadingState({ language }) {
  return (
    <section className="hr-panel professional-hub-loading" aria-busy="true" aria-live="polite">
      <p className="professional-hub-kicker">
        {language === 'vi' ? 'TRẠNG THÁI LOADING THEO GVCN' : 'GVCN-ALIGNED LOADING STATE'}
      </p>
      {[1, 2, 3].map((item) => (
        <div className="professional-hub-skeleton-row" key={item}>
          <i />
          <span />
          <b />
        </div>
      ))}
    </section>
  );
}

function ActivityPreview({ language, onOpenDrawer, onOpenModal, onShowToast, onShowLoading }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  return (
    <section className="hr-panel professional-hub-parity-panel">
      <header className="professional-hub-section-heading">
        <div>
          <p className="professional-hub-kicker">
            {language === 'vi' ? 'KIỂM TRA VISUAL PARITY' : 'VISUAL PARITY REVIEW'}
          </p>
          <h2>{language === 'vi' ? 'Các trạng thái tương tác GVCN' : 'GVCN interaction states'}</h2>
        </div>
        <span>{language === 'vi' ? 'Chỉ dùng trong Phase 1' : 'Phase 1 only'}</span>
      </header>

      <div className="hr-quick-grid professional-hub-quick-grid">
        <button type="button" onClick={onOpenDrawer}>
          <b>{language === 'vi' ? 'Mở Drawer' : 'Open drawer'}</b>
          <span>{language === 'vi' ? 'Bảng chi tiết bên phải' : 'Right-side detail panel'}</span>
        </button>
        <button type="button" onClick={onOpenModal}>
          <b>{language === 'vi' ? 'Mở Modal' : 'Open modal'}</b>
          <span>{language === 'vi' ? 'Hộp thoại tạo/chỉnh sửa' : 'Create/edit dialog'}</span>
        </button>
        <button type="button" onClick={onShowToast}>
          <b>{language === 'vi' ? 'Hiện Toast' : 'Show toast'}</b>
          <span>{language === 'vi' ? 'Phản hồi thao tác' : 'Action feedback'}</span>
        </button>
        <button type="button" onClick={onShowLoading}>
          <b>{language === 'vi' ? 'Kiểm tra Loading' : 'Test loading'}</b>
          <span>{language === 'vi' ? 'Skeleton và trạng thái chờ' : 'Skeleton waiting state'}</span>
        </button>
      </div>

      <div className="hr-compact-list professional-hub-compact-list">
        <div className="professional-hub-compact-row">
          <span className="professional-hub-row-icon" aria-hidden="true">◇</span>
          <div>
            <b>{language === 'vi' ? 'Hàng kiểm tra menu cuối danh sách' : 'Last-row menu review'}</b>
            <small>{language === 'vi' ? 'Không phải dữ liệu nghiệp vụ' : 'Not business data'}</small>
          </div>
          <div className="professional-hub-menu-anchor" ref={menuRef}>
            <button
              type="button"
              className="professional-hub-more-button"
              aria-label={language === 'vi' ? 'Mở menu kiểm tra hàng cuối' : 'Open last-row review menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="professional-hub-action-menu" role="menu">
                <button type="button" role="menuitem" onClick={onOpenDrawer}>
                  {language === 'vi' ? 'Xem chi tiết' : 'View details'}
                </button>
                <button type="button" role="menuitem" onClick={onOpenModal}>
                  {language === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                </button>
                <button type="button" role="menuitem" onClick={onShowToast}>
                  {language === 'vi' ? 'Đánh dấu đã xử lý' : 'Mark resolved'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AccountPanel({ language, displayName, email }) {
  return (
    <aside className="hr-panel professional-hub-account-panel">
      <p className="professional-hub-kicker">
        {language === 'vi' ? 'TRẠNG THÁI TÀI KHOẢN' : 'ACCOUNT STATUS'}
      </p>
      <h2>{language === 'vi' ? 'Chưa được phân công Hub' : 'No Hub assignment yet'}</h2>
      <div className="professional-hub-account-row">
        <span>{language === 'vi' ? 'Tài khoản Brian' : 'Brian account'}</span>
        <b>{displayName}</b>
      </div>
      {email ? (
        <div className="professional-hub-account-row">
          <span>Email</span>
          <b>{email}</b>
        </div>
      ) : null}
      <div className="professional-hub-account-row">
        <span>{language === 'vi' ? 'Vai trò Hub' : 'Hub role'}</span>
        <b>{language === 'vi' ? 'Chưa xác định' : 'Not resolved'}</b>
      </div>
      <p>
        {language === 'vi'
          ? 'Phase 2 sẽ đọc membership và vai trò TTCM/Giáo viên từ Supabase.'
          : 'Phase 2 will resolve membership and leader/teacher roles from Supabase.'}
      </p>
    </aside>
  );
}

function HubDrawer({ language, onClose }) {
  return (
    <div className="professional-hub-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="professional-hub-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="professional-hub-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="professional-hub-kicker">
              {language === 'vi' ? 'DRAWER THAM CHIẾU GVCN' : 'GVCN-ALIGNED DRAWER'}
            </p>
            <h2 id="professional-hub-drawer-title">
              {language === 'vi' ? 'Chi tiết nghiệp vụ' : 'Business detail'}
            </h2>
          </div>
          <button type="button" aria-label={language === 'vi' ? 'Đóng drawer chi tiết' : 'Close detail drawer'} onClick={onClose}>
            ×
          </button>
        </header>
        <div className="professional-hub-drawer-body">
          <EmptyState activeTab="overview" language={language} />
        </div>
        <footer>
          <button type="button" onClick={onClose}>
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function HubModal({ language, onClose, onSave }) {
  return (
    <div className="professional-hub-overlay professional-hub-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="professional-hub-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="professional-hub-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="professional-hub-kicker">
              {language === 'vi' ? 'MODAL THAM CHIẾU GVCN' : 'GVCN-ALIGNED MODAL'}
            </p>
            <h2 id="professional-hub-modal-title">
              {language === 'vi' ? 'Biểu mẫu nghiệp vụ' : 'Business form'}
            </h2>
          </div>
          <button type="button" aria-label={language === 'vi' ? 'Đóng modal biểu mẫu' : 'Close form modal'} onClick={onClose}>
            ×
          </button>
        </header>
        <div className="professional-hub-modal-body">
          <label>
            <span>{language === 'vi' ? 'Tên nội dung' : 'Title'}</span>
            <input disabled value="" placeholder={language === 'vi' ? 'Sẽ sử dụng dữ liệu thật ở Phase 2' : 'Real data will be used in Phase 2'} readOnly />
          </label>
          <label>
            <span>{language === 'vi' ? 'Ghi chú' : 'Notes'}</span>
            <textarea disabled value="" placeholder={language === 'vi' ? 'Không lưu dữ liệu mẫu' : 'No mock data is stored'} readOnly />
          </label>
        </div>
        <footer>
          <button type="button" onClick={onClose}>
            {language === 'vi' ? 'Hủy' : 'Cancel'}
          </button>
          <button type="button" className="primary" onClick={onSave}>
            {language === 'vi' ? 'Kiểm tra phản hồi' : 'Test feedback'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function ProfessionalHubApp({
  language = 'vi',
  currentUser,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const loadingTimer = useRef(null);

  const displayName = useMemo(
    () => currentUser?.name
      || currentUser?.full_name
      || currentUser?.email
      || (language === 'vi' ? 'Tài khoản Brian' : 'Brian account'),
    [currentUser, language],
  );

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const previewLoading = () => {
    if (loadingTimer.current) window.clearTimeout(loadingTimer.current);
    setLoading(true);
    loadingTimer.current = window.setTimeout(() => setLoading(false), 1500);
  };

  useEffect(() => () => {
    if (loadingTimer.current) window.clearTimeout(loadingTimer.current);
  }, []);

  useEffect(() => {
    if (!drawerOpen && !modalOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, modalOpen]);

  return (
    <div className="page hr-page professional-hub-page" data-professional-hub-phase="1.1">
      <section className="hr-hero professional-hub-hero">
        <div className="hr-hero-copy">
          <p>PROFESSIONAL HUB · BRIAN NATIVE</p>
          <h1>{language === 'vi' ? 'Hub Chuyên môn' : 'Professional Hub'}</h1>
          <span>
            {language === 'vi'
              ? 'Không gian quản lý tổ chuyên môn theo tài khoản và vai trò'
              : 'Role-aware professional team workspace'}
          </span>
        </div>

        <div className="hr-hero-art professional-hub-hero-art" aria-hidden="true">
          <div className="hr-board professional-hub-board">
            <i />
            <i />
            <i />
            <b>HUB</b>
          </div>
          <span className="hr-person p1" />
          <span className="hr-person p2" />
          <span className="hr-person p3" />
        </div>

        <aside className="hr-hero-meta">
          <span className="hr-sync local">
            <i />
            {language === 'vi' ? 'Phase 1.1 · Visual parity' : 'Phase 1.1 · Visual parity'}
          </span>
          <b>{displayName}</b>
          <small>{currentUser?.email || ''}</small>
          <span className="hrc-offline-badge professional-hub-phase-badge">
            {language === 'vi' ? 'Không dữ liệu mẫu · Không đăng nhập riêng' : 'No mock data · No separate login'}
          </span>
        </aside>
      </section>

      <HubTabs active={activeTab} onChange={setActiveTab} language={language} />

      <main className="hr-workspace-body professional-hub-workspace">
        {activeTab === 'overview' ? (
          <div className="hr-tab-stack professional-hub-tab-stack">
            <section
              className="hr-stat-grid professional-hub-stat-grid"
              aria-label={language === 'vi' ? 'Chỉ số Hub Chuyên môn' : 'Professional Hub metrics'}
            >
              {METRICS.map((metric) => (
                <MetricCard key={metric.key} metric={metric} language={language} />
              ))}
            </section>

            {loading ? (
              <LoadingState language={language} />
            ) : (
              <section className="hr-overview-grid professional-hub-overview-grid">
                <ActivityPreview
                  language={language}
                  onOpenDrawer={() => setDrawerOpen(true)}
                  onOpenModal={() => setModalOpen(true)}
                  onShowToast={() => showToast(language === 'vi' ? 'Đã kiểm tra phản hồi theo giao diện GVCN.' : 'GVCN-aligned feedback checked.')}
                  onShowLoading={previewLoading}
                />
                <AccountPanel
                  language={language}
                  displayName={displayName}
                  email={currentUser?.email || ''}
                />
              </section>
            )}
          </div>
        ) : (
          <EmptyState activeTab={activeTab} language={language} />
        )}
      </main>

      {drawerOpen ? <HubDrawer language={language} onClose={() => setDrawerOpen(false)} /> : null}

      {modalOpen ? (
        <HubModal
          language={language}
          onClose={() => setModalOpen(false)}
          onSave={() => {
            setModalOpen(false);
            showToast(language === 'vi' ? 'Modal đã phản hồi đúng cấu trúc.' : 'Modal feedback structure verified.');
          }}
        />
      ) : null}

      {toast ? (
        <div className="professional-hub-toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <b>{toast}</b>
        </div>
      ) : null}
    </div>
  );
}
