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
    title: 'Tổng quan Hub Chuyên môn',
    description: 'Bức tranh tổng hợp sẽ xuất hiện sau khi tài khoản được phân công vào một Hub.',
  },
  calendar: {
    title: 'Lịch chuyên môn',
    description: 'Lịch họp, hạn nhiệm vụ, hồ sơ và các mốc kế hoạch sẽ được hợp nhất tại đây.',
  },
  tasks: {
    title: 'Giao việc',
    description: 'TTCM sẽ giao nhiệm vụ cho tài khoản giáo viên thật trong Brian.',
  },
  plans: {
    title: 'Kế hoạch',
    description: 'Quản lý kế hoạch năm học, học kỳ, tháng và chuyên đề theo quy trình phê duyệt.',
  },
  records: {
    title: 'Hồ sơ chuyên môn',
    description: 'Giáo viên nộp hồ sơ, nhận phản hồi, chỉnh sửa và theo dõi trạng thái duyệt.',
  },
  meetings: {
    title: 'Sinh hoạt tổ',
    description: 'Quản lý chương trình, điểm danh, biên bản, kết luận và nhiệm vụ phát sinh.',
  },
  evidence: {
    title: 'Minh chứng',
    description: 'Tải lên, mô tả và xác minh minh chứng theo đúng quyền của từng thành viên.',
  },
  reports: {
    title: 'Báo cáo',
    description: 'Tổng hợp dữ liệu theo thời gian, giáo viên và trạng thái; xuất Word, PDF hoặc HTML.',
  },
};

function ProfessionalHubTabs({ active, onChange, language }) {
  return (
    <nav
      className="hr-tabs professional-hub-tabs"
      aria-label={language === 'vi' ? 'Chức năng Hub Chuyên môn' : 'Professional Hub tools'}
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

function EmptySkeleton({ activeTab, language }) {
  const copy = TAB_COPY[activeTab] || TAB_COPY.overview;

  return (
    <section className="hr-panel professional-hub-empty" aria-live="polite">
      <div className="professional-hub-empty-icon" aria-hidden="true">PH</div>
      <div>
        <p className="professional-hub-kicker">
          {language === 'vi' ? 'PHASE 1 · KHUNG GIAO DIỆN' : 'PHASE 1 · UI SKELETON'}
        </p>
        <h2>{language === 'vi' ? copy.title : TABS.find((tab) => tab.key === activeTab)?.en}</h2>
        <p>{language === 'vi' ? copy.description : 'This area will be connected to real Brian accounts and Supabase data in the next phase.'}</p>
        <div className="professional-hub-empty-note">
          <strong>{language === 'vi' ? 'Chưa có dữ liệu giả.' : 'No mock data.'}</strong>
          <span>
            {language === 'vi'
              ? 'Danh sách giáo viên sẽ chỉ lấy từ tài khoản Brian thật sau khi hoàn thành membership và RLS.'
              : 'Teachers will only come from real Brian accounts after membership and RLS are implemented.'}
          </span>
        </div>
      </div>
    </section>
  );
}

export default function ProfessionalHubApp({
  language = 'vi',
  currentUser,
}) {
  const [activeTab, setActiveTab] = useState('overview');

  const displayName = useMemo(
    () => currentUser?.name || currentUser?.full_name || currentUser?.email || (language === 'vi' ? 'Tài khoản Brian' : 'Brian account'),
    [currentUser, language],
  );

  return (
    <div className="page hr-page professional-hub-page" data-professional-hub-phase="1">
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
            {language === 'vi' ? 'Phase 1 · Chưa nối dữ liệu' : 'Phase 1 · Data not connected'}
          </span>
          <b>{displayName}</b>
          <small>{currentUser?.email || ''}</small>
          <span className="hrc-offline-badge professional-hub-phase-badge">
            {language === 'vi' ? 'Không dữ liệu mẫu · Không đăng nhập riêng' : 'No mock data · No separate login'}
          </span>
        </aside>
      </section>

      <ProfessionalHubTabs
        active={activeTab}
        onChange={setActiveTab}
        language={language}
      />

      <main className="hr-workspace-body professional-hub-workspace">
        {activeTab === 'overview' ? (
          <>
            <section className="professional-hub-stat-grid" aria-label={language === 'vi' ? 'Chỉ số Hub Chuyên môn' : 'Professional Hub metrics'}>
              {[
                ['0', 'Nhiệm vụ', 'Chờ kết nối Supabase'],
                ['0', 'Hồ sơ', 'Chờ membership'],
                ['0', 'Kế hoạch', 'Chờ dữ liệu thật'],
                ['0', 'Minh chứng', 'Không dùng dữ liệu mẫu'],
              ].map(([value, label, detail]) => (
                <article className="hr-panel professional-hub-stat-card" key={label}>
                  <strong>{value}</strong>
                  <b>{language === 'vi' ? label : label}</b>
                  <span>{language === 'vi' ? detail : 'Pending real data connection'}</span>
                </article>
              ))}
            </section>

            <section className="professional-hub-overview-grid">
              <EmptySkeleton activeTab={activeTab} language={language} />
              <aside className="hr-panel professional-hub-access-card">
                <p className="professional-hub-kicker">
                  {language === 'vi' ? 'TRẠNG THÁI TÀI KHOẢN' : 'ACCOUNT STATUS'}
                </p>
                <h2>{language === 'vi' ? 'Chưa được phân công Hub' : 'No Hub assignment yet'}</h2>
                <p>
                  {language === 'vi'
                    ? 'Ở Phase 2, hệ thống sẽ đọc tài khoản Brian, membership và vai trò TTCM/Giáo viên từ Supabase.'
                    : 'Phase 2 will resolve Brian account membership and leader/teacher roles from Supabase.'}
                </p>
              </aside>
            </section>
          </>
        ) : (
          <EmptySkeleton activeTab={activeTab} language={language} />
        )}
      </main>
    </div>
  );
}
