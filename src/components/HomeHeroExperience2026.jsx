import React, { useMemo, useRef } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Cloud,
  FileText,
  Grid2X2,
  Layers3,
  Library,
  MessageCircle,
  Play,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
} from 'lucide-react';

function displayNameFor(user, language) {
  const raw = user?.full_name
    || user?.display_name
    || user?.name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')?.[0]
    || '';
  const clean = String(raw).replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return language === 'en' ? 'Teacher' : 'Anh';
  return clean.split(' ').slice(-1)[0];
}

function dateLabel(language) {
  try {
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date());
  } catch {
    return language === 'en' ? 'Today' : 'Hôm nay';
  }
}

function TrustItem({ icon: Icon, title, text }) {
  return (
    <span className="bhero__trust-item">
      <i><Icon size={17} strokeWidth={2.15} /></i>
      <span><strong>{title}</strong><small>{text}</small></span>
    </span>
  );
}

function StatTile({ tone, icon: Icon, value, label }) {
  return (
    <span className={`bhero__stat bhero__stat--${tone}`}>
      <i><Icon size={15} strokeWidth={2.2} /></i>
      <span><strong>{value}</strong><small>{label}</small></span>
    </span>
  );
}

function ActivityRow({ tone, icon: Icon, title, meta }) {
  return (
    <span className="bhero__activity-row">
      <i className={`is-${tone}`}><Icon size={13} strokeWidth={2.2} /></i>
      <span><strong>{title}</strong><small>{meta}</small></span>
      <b>›</b>
    </span>
  );
}

function FloatingCard({ className, children, depth = 2 }) {
  return (
    <div className={`bhero__parallax bhero__depth-${depth} ${className || ''}`}>
      <div className="bhero__floating">{children}</div>
    </div>
  );
}

export default function HomeHeroExperience2026({
  currentUser,
  language = 'vi',
  t,
  practiceCount = 0,
  onStart,
  onGuide,
}) {
  const rootRef = useRef(null);
  const frameRef = useRef(0);
  const vi = language !== 'en';
  const name = useMemo(() => displayNameFor(currentUser, language), [currentUser, language]);
  const today = useMemo(() => dateLabel(language), [language]);

  const copy = vi ? {
    lines: ['Không gian', 'dạy học', 'thông minh'],
    highlight: '& sáng tạo',
    greeting: `Xin chào, ${name}!`,
    greetingSub: 'Hôm nay là một ngày tuyệt vời để dạy và học.',
    grade: 'Khối lớp',
    practices: 'Bài tuần',
    workspace: 'Không gian',
    recent: 'Hoạt động gần đây',
    progress: 'Tiến độ lớp học',
    newTask: 'Bài tập mới',
    taskMeta: 'Unit 6 · Environment',
    schedule: 'Lịch giảng dạy',
    performance: 'Hiệu suất học tập',
    className: 'Khối 10',
    classMeta: 'Bài mới đã mở',
    notification: 'Thông báo mới',
    notificationMeta: 'Bài tập đã sẵn sàng',
    safe: 'Phân quyền an toàn',
    safeSub: 'Dữ liệu được bảo vệ',
    sync: 'Đồng bộ ổn định',
    syncSub: 'Cập nhật theo thời gian thực',
    unified: 'Không gian thống nhất',
    unifiedSub: 'Dạy học và quản lý',
  } : {
    lines: ['A smart', 'teaching', 'workspace'],
    highlight: '& creative learning',
    greeting: `Hello, ${name}!`,
    greetingSub: 'A great day to teach, learn and create.',
    grade: 'Grade levels',
    practices: 'Weekly tasks',
    workspace: 'Workspace',
    recent: 'Recent activity',
    progress: 'Class progress',
    newTask: 'New assignment',
    taskMeta: 'Unit 6 · Environment',
    schedule: 'Teaching schedule',
    performance: 'Learning performance',
    className: 'Grade 10',
    classMeta: 'New task is open',
    notification: 'New update',
    notificationMeta: 'Assignment is ready',
    safe: 'Secure access',
    safeSub: 'Protected by permissions',
    sync: 'Stable sync',
    syncSub: 'Updates in real time',
    unified: 'One workspace',
    unifiedSub: 'Teaching and management',
  };

  const resetParallax = () => {
    const node = rootRef.current;
    if (!node) return;
    ['1', '2', '3', '4'].forEach((level) => {
      node.style.setProperty(`--bhero-x-${level}`, '0px');
      node.style.setProperty(`--bhero-y-${level}`, '0px');
    });
  };

  const handlePointerMove = (event) => {
    const node = rootRef.current;
    if (!node || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    const clientX = event.clientX;
    const clientY = event.clientY;
    frameRef.current = window.requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width - 0.5) * 2));
      const y = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height - 0.5) * 2));
      [3, 6, 10, 15].forEach((amount, index) => {
        const level = index + 1;
        node.style.setProperty(`--bhero-x-${level}`, `${(x * amount).toFixed(2)}px`);
        node.style.setProperty(`--bhero-y-${level}`, `${(y * amount).toFixed(2)}px`);
      });
    });
  };

  return (
    <section
      ref={rootRef}
      className="bha-hero bhero"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
      aria-label={vi ? 'Không gian dạy học thông minh và sáng tạo' : 'Smart and creative teaching workspace'}
    >
      <div className="bhero__wash" aria-hidden="true" />
      <div className="bhero__drum" aria-hidden="true" />
      <div className="bhero__copy">
        <span className="bhero__badge">
          <i><span>B</span><b /></i>
          <strong>{t.badge}</strong>
        </span>
        <h1>{copy.lines.map((line) => <span key={line}>{line}</span>)}</h1>
        <h2>{copy.highlight}</h2>
        <p>{t.subtitle}</p>
        <div className="bhero__actions">
          <button className="is-primary" type="button" onClick={onStart}>
            <Rocket size={19} strokeWidth={2.2} />
            <span>{t.start}</span>
            <ArrowRight size={18} />
          </button>
          <button className="is-secondary" type="button" onClick={onGuide}>
            <Play size={18} fill="currentColor" />
            <span>{t.guide}</span>
          </button>
        </div>
        <div className="bhero__trust" aria-label={vi ? 'Lợi ích nổi bật' : 'Key benefits'}>
          <TrustItem icon={ShieldCheck} title={copy.safe} text={copy.safeSub} />
          <TrustItem icon={Cloud} title={copy.sync} text={copy.syncSub} />
          <TrustItem icon={UsersRound} title={copy.unified} text={copy.unifiedSub} />
        </div>
      </div>

      <div className="bhero__scene" aria-hidden="true">
        <div className="bhero__sky-orb bhero__depth-1" />
        <div className="bhero__cloud bhero__cloud--one bhero__depth-2" />
        <div className="bhero__cloud bhero__cloud--two bhero__depth-1" />
        <div className="bhero__birds bhero__depth-2"><i /><i /><i /></div>
        <div className="bhero__gate bhero__depth-1"><i /><b /><span /></div>
        <div className="bhero__hills bhero__depth-1"><i /><i /><i /><b /></div>
        <div className="bhero__orbit bhero__orbit--outer"><i /><i /><i /></div>
        <div className="bhero__orbit bhero__orbit--inner"><i /><i /></div>
        <div className="bhero__spark bhero__spark--one" />
        <div className="bhero__spark bhero__spark--two" />
        <div className="bhero__spark bhero__spark--three" />

        <div className="bhero__parallax bhero__depth-2 bhero__flag-wrap">
          <div className="bhero__flag"><i /><span>★</span><b /></div>
        </div>

        <div className="bhero__parallax bhero__depth-2 bhero__monitor-wrap">
          <div className="bhero__monitor">
            <div className="bhero__monitor-camera" />
            <div className="bhero__screen">
              <header className="bhero__screen-topbar">
                <span className="bhero__mini-brand"><i>B</i><b>English Hub</b></span>
                <nav><Bell size={12} /><MessageCircle size={12} /><span className="bhero__avatar">{name.slice(0, 1).toUpperCase()}</span></nav>
              </header>
              <div className="bhero__dashboard">
                <aside>
                  <span className="is-active"><Grid2X2 size={12} />{vi ? 'Tổng quan' : 'Overview'}</span>
                  <span><UsersRound size={12} />{vi ? 'Lớp học' : 'Classes'}</span>
                  <span><BookOpenCheck size={12} />{vi ? 'Bài tập' : 'Tasks'}</span>
                  <span><Library size={12} />{vi ? 'Thư viện' : 'Library'}</span>
                  <span><BarChart3 size={12} />{vi ? 'Báo cáo' : 'Reports'}</span>
                  <span><Settings size={12} />{vi ? 'Cài đặt' : 'Settings'}</span>
                </aside>
                <main>
                  <div className="bhero__dashboard-title"><strong>{copy.greeting} <em>👋</em></strong><small>{copy.greetingSub}</small></div>
                  <div className="bhero__stats">
                    <StatTile tone="blue" icon={Layers3} value="3" label={copy.grade} />
                    <StatTile tone="green" icon={BookOpenCheck} value={String(practiceCount || 0)} label={copy.practices} />
                    <StatTile tone="gold" icon={Sparkles} value="1" label={copy.workspace} />
                  </div>
                  <div className="bhero__dashboard-panels">
                    <section className="bhero__activity">
                      <header><strong>{copy.recent}</strong><small>{today}</small></header>
                      <ActivityRow tone="blue" icon={FileText} title={vi ? 'Bài tập mới được giao' : 'New task assigned'} meta={vi ? 'Khối 10 · Unit 6' : 'Grade 10 · Unit 6'} />
                      <ActivityRow tone="green" icon={CheckCircle2} title={vi ? 'Bài kiểm tra đã hoàn thành' : 'Quiz completed'} meta={vi ? 'Khối 11 · Test 4' : 'Grade 11 · Test 4'} />
                      <ActivityRow tone="purple" icon={Library} title={vi ? 'Học liệu vừa cập nhật' : 'Resource updated'} meta={vi ? 'Thư viện dùng chung' : 'Shared library'} />
                    </section>
                    <section className="bhero__progress-panel">
                      <strong>{copy.progress}</strong>
                      <div className="bhero__ring"><i /><span><b>LIVE</b><small>{vi ? 'Đang hoạt động' : 'Active'}</small></span></div>
                      <div className="bhero__mini-chart"><i /><i /><i /><i /><i /><i /></div>
                    </section>
                  </div>
                </main>
              </div>
            </div>
            <div className="bhero__monitor-neck" />
            <div className="bhero__monitor-foot" />
          </div>
        </div>

        <FloatingCard className="bhero__notice-card" depth={3}>
          <span className="bhero__glass-icon is-gold"><Sparkles size={14} /></span>
          <span><strong>{copy.notification}</strong><small>{copy.notificationMeta}</small></span>
          <CheckCircle2 className="bhero__glass-check" size={18} />
        </FloatingCard>

        <FloatingCard className="bhero__class-card" depth={4}>
          <span className="bhero__glass-icon is-blue"><UsersRound size={15} /></span>
          <span><strong>{copy.className}</strong><small>{copy.classMeta}</small></span>
          <div className="bhero__wave"><i /><i /></div>
        </FloatingCard>

        <FloatingCard className="bhero__task-card" depth={4}>
          <span className="bhero__glass-icon is-green"><BookOpenCheck size={15} /></span>
          <span><strong>{copy.newTask}</strong><small>{copy.taskMeta}</small></span>
          <div className="bhero__task-progress"><i /></div>
          <b>75%</b>
        </FloatingCard>

        <FloatingCard className="bhero__performance-card" depth={3}>
          <header><strong>{copy.performance}</strong><TrendingUp size={14} /></header>
          <div className="bhero__performance-chart"><i /><i /><i /><i /><i /><i /><b /></div>
        </FloatingCard>

        <FloatingCard className="bhero__schedule-card" depth={4}>
          <header><CalendarDays size={15} /><span><strong>{copy.schedule}</strong><small>{today}</small></span></header>
          <div><b>08:00</b><span>{vi ? 'Tiếng Anh 10A' : 'English 10A'}</span></div>
          <div><b>10:00</b><span>{vi ? 'Tiếng Anh 11C' : 'English 11C'}</span></div>
        </FloatingCard>

        <div className="bhero__parallax bhero__depth-3 bhero__dock-wrap">
          <div className="bhero__dock">
            <span className="is-active"><Grid2X2 size={18} /></span>
            <span><UserRound size={18} /></span>
            <span><FileText size={18} /></span>
            <span><Cloud size={18} /></span>
          </div>
        </div>

        <div className="bhero__desk bhero__depth-1">
          <div className="bhero__keyboard"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="bhero__mouse" />
          <div className="bhero__cup"><i /><i /><i /><b /></div>
          <div className="bhero__books"><span>ENGLISH HUB</span><i /><i /></div>
          <div className="bhero__plant"><b /><i /><i /><i /><i /><span /></div>
        </div>
        <div className="bhero__cube bhero__cube--one bhero__depth-4" />
        <div className="bhero__cube bhero__cube--two bhero__depth-3" />
      </div>
    </section>
  );
}
