import React, { useMemo, useState } from 'react';
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
    descriptionVi: 'Dữ liệu sẽ xuất hiện sau khi tài khoản được phân công vào một Hub.',
    descriptionEn: 'Data will appear after the account is assigned to a Hub.',
  },
  calendar: {
    vi: 'Lịch chuyên môn',
    en: 'Professional calendar',
    descriptionVi: 'Lịch họp, hạn nhiệm vụ, hồ sơ và các mốc kế hoạch.',
    descriptionEn: 'Meetings, task deadlines, records and plan milestones.',
  },
  tasks: {
    vi: 'Giao việc',
    en: 'Tasks',
    descriptionVi: 'Giao và theo dõi nhiệm vụ của các tài khoản giáo viên thật trong Brian.',
    descriptionEn: 'Assign and track work for real Brian teacher accounts.',
  },
  plans: {
    vi: 'Kế hoạch',
    en: 'Plans',
    descriptionVi: 'Quản lý dự thảo, phê duyệt, triển khai và lưu trữ kế hoạch.',
    descriptionEn: 'Manage drafting, approval, delivery and archiving.',
  },
  records: {
    vi: 'Hồ sơ chuyên môn',
    en: 'Professional records',
    descriptionVi: 'Nộp hồ sơ, nhận phản hồi và theo dõi trạng thái phê duyệt.',
    descriptionEn: 'Submit records, receive feedback and track approvals.',
  },
  meetings: {
    vi: 'Sinh hoạt tổ',
    en: 'Team meetings',
    descriptionVi: 'Quản lý chương trình, điểm danh, biên bản và kết luận cuộc họp.',
    descriptionEn: 'Manage agendas, attendance, minutes and conclusions.',
  },
  evidence: {
    vi: 'Minh chứng',
    en: 'Evidence',
    descriptionVi: 'Tải lên, phân loại và xác minh minh chứng theo quyền.',
    descriptionEn: 'Upload, classify and verify role-based evidence.',
  },
  reports: {
    vi: 'Báo cáo',
    en: 'Reports',
    descriptionVi: 'Tổng hợp dữ liệu và xuất Word, PDF hoặc HTML.',
    descriptionEn: 'Aggregate data and export Word, PDF or HTML.',
  },
};

const METRICS = [
  {
    key: 'tasks',
    value: '0',
    vi: 'Nhiệm vụ đang thực hiện',
    en: 'Active tasks',
    noteVi: 'Chưa có dữ liệu',
    noteEn: 'No data yet',
    tone: 'tone-blue',
  },
  {
    key: 'records',
    value: '0',
    vi: 'Hồ sơ chờ duyệt',
    en: 'Pending records',
    noteVi: 'Chưa có dữ liệu',
    noteEn: 'No data yet',
    tone: 'tone-purple',
  },
  {
    key: 'plans',
    value: '0',
    vi: 'Kế hoạch đang triển khai',
    en: 'Active plans',
    noteVi: 'Chưa có dữ liệu',
    noteEn: 'No data yet',
    tone: 'tone-green',
  },
  {
    key: 'evidence',
    value: '0',
    vi: 'Minh chứng cần xác minh',
    en: 'Evidence to verify',
    noteVi: 'Chưa có dữ liệu',
    noteEn: 'No data yet',
    tone: 'tone-orange',
  },
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
    <article className={`hr-stat professional-hub-metric ${metric.tone}`}>
      <strong>{metric.value}</strong>
      <b>{language === 'vi' ? metric.vi : metric.en}</b>
      <span>{language === 'vi' ? metric.noteVi : metric.noteEn}</span>
    </article>
  );
}

function EmptyPanel({
  icon,
  eyebrow,
  title,
  description,
  compact = false,
}) {
  return (
    <section className={`hr-empty professional-hub-empty ${compact ? 'is-compact' : ''}`}>
      <span className="professional-hub-empty-mark" aria-hidden="true">{icon}</span>
      <div>
        <p className="professional-hub-kicker">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}

function AccountPanel({
  language,
  displayName,
  email,
}) {
  return (
    <aside className="hr-panel professional-hub-account-panel">
      <header className="professional-hub-panel-header">
        <div>
          <p className="professional-hub-kicker">
            {language === 'vi' ? 'TÀI KHOẢN & QUYỀN TRUY CẬP' : 'ACCOUNT & ACCESS'}
          </p>
          <h2>{language === 'vi' ? 'Chưa tham gia Hub' : 'Not assigned to a Hub'}</h2>
        </div>
        <span className="professional-hub-status-dot" aria-hidden="true" />
      </header>

      <dl className="professional-hub-account-list">
        <div>
          <dt>{language === 'vi' ? 'Tài khoản Brian' : 'Brian account'}</dt>
          <dd>{displayName}</dd>
        </div>

        {email ? (
          <div>
            <dt>Email</dt>
            <dd>{email}</dd>
          </div>
        ) : null}

        <div>
          <dt>{language === 'vi' ? 'Vai trò trong Hub' : 'Hub role'}</dt>
          <dd>{language === 'vi' ? 'Chưa xác định' : 'Not resolved'}</dd>
        </div>
      </dl>

      <p className="professional-hub-account-note">
        {language === 'vi'
          ? 'Khi được phân công, hệ thống sẽ tự đọc vai trò TTCM hoặc Giáo viên từ tài khoản Brian.'
          : 'Once assigned, Brian will resolve the leader or teacher role automatically.'}
      </p>
    </aside>
  );
}

function Overview({
  language,
  displayName,
  email,
}) {
  return (
    <div className="hr-tab-stack professional-hub-tab-stack">
      <section
        className="hr-stat-grid professional-hub-stat-grid"
        aria-label={language === 'vi' ? 'Chỉ số Hub Chuyên môn' : 'Professional Hub metrics'}
      >
        {METRICS.map((metric) => (
          <MetricCard
            key={metric.key}
            metric={metric}
            language={language}
          />
        ))}
      </section>

      <section className="hr-overview-grid professional-hub-overview-grid">
        <div className="professional-hub-main-column">
          <section className="hr-panel professional-hub-activity-panel">
            <header className="professional-hub-panel-header">
              <div>
                <p className="professional-hub-kicker">
                  {language === 'vi' ? 'HOẠT ĐỘNG GẦN ĐÂY' : 'RECENT ACTIVITY'}
                </p>
                <h2>{language === 'vi' ? 'Dòng công việc chuyên môn' : 'Professional workflow'}</h2>
              </div>
            </header>

            <EmptyPanel
              icon="✓"
              eyebrow={language === 'vi' ? 'CHƯA CÓ HOẠT ĐỘNG' : 'NO ACTIVITY YET'}
              title={language === 'vi' ? 'Mọi thứ đã sẵn sàng' : 'Everything is ready'}
              description={
                language === 'vi'
                  ? 'Nhiệm vụ, hồ sơ và thông báo mới sẽ xuất hiện tại đây sau khi tài khoản tham gia Hub.'
                  : 'Tasks, records and notifications will appear here after the account joins a Hub.'
              }
            />
          </section>

          <section className="hr-panel professional-hub-schedule-panel">
            <header className="professional-hub-panel-header">
              <div>
                <p className="professional-hub-kicker">
                  {language === 'vi' ? 'LỊCH SẮP TỚI' : 'UPCOMING'}
                </p>
                <h2>{language === 'vi' ? 'Các mốc chuyên môn' : 'Professional milestones'}</h2>
              </div>
            </header>

            <EmptyPanel
              compact
              icon="▦"
              eyebrow={language === 'vi' ? 'CHƯA CÓ LỊCH' : 'NO SCHEDULE'}
              title={language === 'vi' ? 'Không có sự kiện sắp tới' : 'No upcoming events'}
              description={
                language === 'vi'
                  ? 'Cuộc họp, hạn nộp và mốc kế hoạch sẽ được hiển thị theo thời gian.'
                  : 'Meetings, submission deadlines and plan milestones will be shown chronologically.'
              }
            />
          </section>
        </div>

        <AccountPanel
          language={language}
          displayName={displayName}
          email={email}
        />
      </section>
    </div>
  );
}

function SectionEmpty({
  activeTab,
  language,
}) {
  const copy = TAB_COPY[activeTab] || TAB_COPY.overview;

  return (
    <section className="hr-panel professional-hub-section-empty">
      <EmptyPanel
        icon={TABS.find((tab) => tab.key === activeTab)?.icon || 'PH'}
        eyebrow={language === 'vi' ? 'PHÂN HỆ ĐANG CHUẨN BỊ' : 'SECTION IN PREPARATION'}
        title={language === 'vi' ? copy.vi : copy.en}
        description={language === 'vi' ? copy.descriptionVi : copy.descriptionEn}
      />
    </section>
  );
}

export default function ProfessionalHubApp({
  language = 'vi',
  currentUser,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  const displayName = useMemo(
    () => currentUser?.name
      || currentUser?.full_name
      || currentUser?.email
      || (language === 'vi' ? 'Tài khoản Brian' : 'Brian account'),
    [currentUser, language],
  );

  return (
    <div
      className="page hr-page professional-hub-page"
      data-professional-hub-phase="1.4"
    >
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

        <aside className="hr-hero-meta professional-hub-hero-meta">
          <span className="hr-sync local">
            <i />
            {language === 'vi' ? 'Chưa tham gia Hub' : 'Not assigned'}
          </span>
          <b>{displayName}</b>
          <small>{currentUser?.email || ''}</small>
        </aside>
      </section>

      <HubTabs
        active={activeTab}
        onChange={setActiveTab}
        language={language}
      />

      <main className="hr-workspace-body professional-hub-workspace">
        {activeTab === 'overview' ? (
          <Overview
            language={language}
            displayName={displayName}
            email={currentUser?.email || ''}
          />
        ) : (
          <SectionEmpty
            activeTab={activeTab}
            language={language}
          />
        )}
      </main>
    </div>
  );
}
