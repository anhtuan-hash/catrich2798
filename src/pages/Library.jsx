import React, { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import LiveActivityPlayer from '../components/LiveActivityPlayer.jsx';
import AICopilotPanel from '../components/AICopilotPanel.jsx';
import {
  BANK_KEY,
  HISTORY_KEY,
  PROMPTS_KEY,
  addBankItems,
  addQuestionsFromTextToBank,
  bankToText,
  clearList,
  deleteFromList,
  downloadFile,
  exportAsHtml,
  exportAsWord,
  exportJson,
  getLibrarySyncState,
  syncLibraryFromCloud,
  LIBRARY_SYNC_EVENT,
  loadBank,
  loadHistory,
  loadPrompts,
  parseMcqFromText,
  readList,
  savePromptEntry,
  slugify,
  writeList,
} from '../utils/library.js';

function useLibraryData() {
  const [version, setVersion] = useState(0);
  const [syncState, setSyncState] = useState(() => getLibrarySyncState());
  const refresh = () => setVersion((value) => value + 1);
  useEffect(() => {
    const onUpdate = () => refresh();
    const onSync = (event) => setSyncState(event.detail || getLibrarySyncState());
    window.addEventListener('bet-library-updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    window.addEventListener(LIBRARY_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener('bet-library-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener(LIBRARY_SYNC_EVENT, onSync);
    };
  }, []);
  return {
    version,
    refresh,
    syncState,
    history: loadHistory(),
    prompts: loadPrompts(),
    bank: loadBank(),
  };
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso || '';
  }
}

function copyText(text, afterCopy) {
  navigator.clipboard.writeText(text || '').then(afterCopy).catch(afterCopy);
}

const LIBRARY_HERO_SPOTLIGHTS = [
  {
    id: 'prompts',
    icon: '💬',
    titleVi: 'Prompt mẫu',
    title: 'Prompt sets',
    descVi: 'Xây kho prompt tái sử dụng cho nhiều nhiệm vụ khác nhau.',
    desc: 'Build reusable prompt collections for multiple tasks.',
    tone: 'violet',
  },
  {
    id: 'history',
    icon: '🕘',
    titleVi: 'Lịch sử output',
    title: 'Output history',
    descVi: 'Xem lại và tái sử dụng các nội dung AI đã tạo bất cứ lúc nào.',
    desc: 'Review and reuse your AI-generated outputs anytime.',
    tone: 'mint',
  },
];

const LIBRARY_HERO_QUICK_ITEMS = [
  {
    id: 'prompts',
    icon: '💬',
    titleVi: 'Prompt mẫu',
    title: 'Prompt sets',
    descVi: 'Quản lý và tái sử dụng bộ prompt đã lưu.',
    desc: 'Manage and reuse prompt collections.',
    tone: 'violet',
  },
  {
    id: 'history',
    icon: '🕘',
    titleVi: 'Lịch sử output',
    title: 'Output history',
    descVi: 'Mở lại và dạy nhanh từ nội dung đã tạo.',
    desc: 'Open and reuse generated outputs quickly.',
    tone: 'mint',
  },
  {
    id: 'bank',
    icon: '📒',
    titleVi: 'Ngân hàng câu hỏi',
    title: 'Question bank',
    descVi: 'Lưu trữ và tổ chức câu hỏi để kiểm tra, luyện tập.',
    desc: 'Store and organize questions for tests and practice.',
    tone: 'gold',
  },
];

function LibraryHeroIllustration({ language }) {
  return (
    <div className="library-hero-illustration" aria-hidden="true">
      <span className="library-hero-cube cube-a" />
      <span className="library-hero-cube cube-b" />
      <span className="library-hero-cube cube-c" />
      <span className="library-hero-cube cube-d" />

      <div className="library-iso-center">
        <div className="library-screen-header">
          <img src="/logo-brian-english.png" alt="" />
          <strong>{language === 'vi' ? 'Thư viện giáo viên' : 'Teacher Library'}</strong>
          <span>×</span>
        </div>
        <div className="library-search-row" />
        <div className="library-screen-body">
          <div className="library-sidebar-col">
            <i /><i /><i /><i /><i /><i />
          </div>
          <div className="library-content-grid">
            <span className="folder blue" />
            <span className="folder purple" />
            <span className="folder yellow" />
            <span className="folder mint" />
            <span className="line long" />
            <span className="line short" />
            <span className="line med" />
            <span className="line med2" />
          </div>
        </div>
      </div>

      <div className="library-float-card prompt-card">
        <span className="soft-badge violet">💬</span>
        <strong>{language === 'vi' ? 'Prompt mẫu' : 'Prompt sets'}</strong>
      </div>
      <div className="library-float-card history-card">
        <span className="soft-badge mint">🕘</span>
        <strong>{language === 'vi' ? 'Lịch sử output' : 'Output history'}</strong>
      </div>
      <div className="library-float-card question-card">
        <span className="soft-badge gold">📒</span>
        <strong>{language === 'vi' ? 'Ngân hàng câu hỏi' : 'Question bank'}</strong>
      </div>
      <div className="library-float-card saved-card">
        <span className="soft-badge green">📁</span>
        <strong>{language === 'vi' ? 'Tài nguyên đã lưu' : 'Saved resources'}</strong>
      </div>
      <div className="library-float-card lesson-card">
        <span className="soft-badge sky">🎓</span>
        <strong>{language === 'vi' ? 'Học liệu' : 'Lesson assets'}</strong>
      </div>
      <div className="library-float-card notes-card">
        <span className="soft-badge plum">📝</span>
        <strong>{language === 'vi' ? 'Ghi chú AI' : 'AI notes'}</strong>
      </div>
      <span className="library-dash dash-a" />
      <span className="library-dash dash-b" />
      <span className="library-dash dash-c" />
      <span className="library-dash dash-d" />
      <span className="library-dash dash-e" />
      <span className="library-dash dash-f" />
    </div>
  );
}

function LibrarySpotlightCard({ item, language, onOpen }) {
  return (
    <button type="button" className={`library-spotlight-card tone-${item.tone}`} onClick={() => onOpen(item.id)}>
      <span className="library-soft-icon">{item.icon}</span>
      <strong>{language === 'vi' ? item.titleVi : item.title}</strong>
      <small>{language === 'vi' ? item.descVi : item.desc}</small>
      <em>{language === 'vi' ? 'Xem ngay' : 'View now'}</em>
    </button>
  );
}

function LibraryQuickRow({ item, language, onOpen }) {
  return (
    <button type="button" className={`library-quick-row tone-${item.tone}`} onClick={() => onOpen(item.id)}>
      <span className="library-soft-icon">{item.icon}</span>
      <span>
        <strong>{language === 'vi' ? item.titleVi : item.title}</strong>
        <small>{language === 'vi' ? item.descVi : item.desc}</small>
      </span>
      <b>›</b>
    </button>
  );
}

function LibraryV46HeroArt({ language }) {
  return (
    <div className="library-v46-art" aria-hidden="true">
      <div className="library-v46-arch" />
      <div className="library-v46-floating-stack">
        <div className="library-v46-float-card prompt">
          <span>💬</span>
          <div><small>{language === 'vi' ? 'Bộ prompt' : 'Prompt set'}</small><strong>Lesson Planner Pack</strong><em>English</em></div>
          <b>›</b>
        </div>
        <div className="library-v46-float-card output">
          <span>📄</span>
          <div><small>{language === 'vi' ? 'Output AI' : 'AI output'}</small><strong>Story: The Smart Choice</strong><em>Short Story</em></div>
          <b>›</b>
        </div>
        <div className="library-v46-float-card bank">
          <span>❓</span>
          <div><small>{language === 'vi' ? 'Ngân hàng câu hỏi' : 'Question bank'}</small><strong>Speaking Starters A2</strong><em>Speaking</em></div>
          <b>›</b>
        </div>
      </div>
      <div className="library-v46-folder-set">
        <div className="library-v46-folder-back" />
        <div className="library-v46-folder-front">
          <small>Collections</small>
          <strong>{language === 'vi' ? 'Thư viện của tôi' : 'My Library'}</strong>
          <span>32 items</span>
        </div>
      </div>
      <div className="library-v46-archive"><span>Archive</span></div>
      <div className="library-v46-books">
        <i/><i/><i/><i/><i/><i/>
      </div>
      <div className="library-v46-brand-book">
        <img src="/logo-brian-english.png" alt="" />
        <strong>BRIAN ENGLISH</strong>
        <small>STUDIO</small>
      </div>
      <div className="library-v46-plant"><i/><i/><i/><b/></div>
      <div className="library-v46-platform" />
    </div>
  );
}

function LibraryShowcaseHero({ language, historyCount, promptCount, bankCount, onOpen }) {
  return (
    <section className="library-v46-hero" aria-label={language === 'vi' ? 'Hero thư viện giáo viên' : 'Teacher library hero'}>
      <div className="library-v46-hero-copy">
        <span className="library-v46-eyebrow">▣ {language === 'vi' ? 'Thư viện giáo viên' : 'Teacher library'}</span>
        <h1>{language === 'vi' ? 'Thư viện giáo viên' : 'Teacher Library'}</h1>
        <p>
          {language === 'vi'
            ? 'Lưu bộ prompt, output AI có thể tái sử dụng, ngân hàng câu hỏi và học liệu lớp học trong một không gian có tổ chức để dạy học thông minh hơn mỗi ngày.'
            : 'Save prompt sets, reusable AI outputs, question banks, and classroom resources in one organized place so you can teach smarter, every day.'}
        </p>
        <div className="library-v46-hero-actions">
          <button type="button" className="primary" onClick={() => onOpen('history')}>▤ {language === 'vi' ? 'Mở thư viện' : 'Open library'}</button>
          <button type="button" className="secondary" onClick={() => onOpen('prompts')}>＋ {language === 'vi' ? 'Tạo bộ sưu tập' : 'Create collection'}</button>
        </div>
        <div className="library-v46-stats">
          <button type="button" onClick={() => onOpen('prompts')}><span className="green">💬</span><b>{promptCount}</b><small>{language === 'vi' ? 'Bộ prompt' : 'Prompt sets'}</small></button>
          <button type="button" onClick={() => onOpen('history')}><span className="blue">📄</span><b>{historyCount}</b><small>{language === 'vi' ? 'Output đã lưu' : 'Saved outputs'}</small></button>
          <button type="button" onClick={() => onOpen('bank')}><span className="gold">❓</span><b>{bankCount}</b><small>{language === 'vi' ? 'Ngân hàng câu hỏi' : 'Question banks'}</small></button>
        </div>
      </div>
      <LibraryV46HeroArt language={language} />
    </section>
  );
}

function relativeTime(value, language) {
  if (!value) return '—';
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const min = Math.round(diff / 60000);
  if (min < 60) return language === 'vi' ? `${Math.max(1,min)} phút trước` : `${Math.max(1,min)}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return language === 'vi' ? `${hours} giờ trước` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return language === 'vi' ? `${days} ngày trước` : `${days}d ago`;
}

function LibraryV46ListCard({ tone, icon, title, subtitle, items, onOpen, actionLabel, emptyLabel }) {
  return (
    <article className={`library-v46-card tone-${tone}`}>
      <header>
        <div><span>{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>
        <button type="button" onClick={onOpen}>{actionLabel}</button>
      </header>
      <div className="library-v46-list">
        {items.length ? items.map((item) => (
          <button type="button" key={item.id} onClick={onOpen}>
            <span className="item-icon">{item.icon || icon}</span>
            <span className="item-copy"><strong>{item.title}</strong><small>{item.meta}</small></span>
            {item.tag ? <em>{item.tag}</em> : null}
            <b>›</b>
          </button>
        )) : <div className="library-v46-empty">{emptyLabel}</div>}
      </div>
    </article>
  );
}

function LibraryV46Dashboard({ language, history, prompts, bank, onOpen }) {
  const promptItems = (prompts.length ? prompts.slice(0,3) : [
    { id:'p1', title:'Lesson Planner Pack', category:'18 prompts' },
    { id:'p2', title:'Writing Task Generator', category:'14 prompts' },
    { id:'p3', title:'ESL Warmers & Starters', category:'12 prompts' },
  ]).map((item, i) => ({ id:item.id || `p${i}`, icon:'▤', title:item.title || item.category || 'Prompt set', meta:item.category || relativeTime(item.createdAt, language), tag:item.category && /prompt/i.test(item.category) ? item.category : '' }));

  const outputItems = (history.length ? history.slice(0,3) : [
    { id:'h1', title:'Story: The Smart Choice', toolTitle:'Short Story', createdAt:new Date(Date.now()-7200000).toISOString() },
    { id:'h2', title:'Email: Parent Update', toolTitle:'Template', createdAt:new Date(Date.now()-86400000).toISOString() },
    { id:'h3', title:'Lesson: Food & Culture', toolTitle:'Lesson Plan', createdAt:new Date(Date.now()-172800000).toISOString() },
  ]).map((item, i) => ({ id:item.id || `h${i}`, icon:'▧', title:item.title || 'Saved output', meta:relativeTime(item.createdAt, language), tag:item.toolTitle || item.kind || '' }));

  const bankItems = (bank.length ? bank.slice(0,3) : [
    { id:'b1', question:'Speaking Starters A2', topic:'Speaking', options:Array(32) },
    { id:'b2', question:'Reading Comprehension B1', topic:'Reading', options:Array(28) },
    { id:'b3', question:'Grammar Practice Set', topic:'Grammar', options:Array(45) },
  ]).map((item, i) => ({ id:item.id || `b${i}`, icon:'?', title:item.question || 'Question set', meta:item.source || item.level || 'Question bank', tag:item.topic || `${item.options?.length || 1} qs` }));

  const resourceItems = [
    { id:'r1', icon:'📁', title:language === 'vi' ? 'Phiếu học tập' : 'Worksheets', meta:language === 'vi' ? '24 mục' : '24 items' },
    { id:'r2', icon:'📁', title:language === 'vi' ? 'Mẫu tài liệu' : 'Templates', meta:language === 'vi' ? '18 mục' : '18 items' },
    { id:'r3', icon:'📁', title:language === 'vi' ? 'Hướng dẫn giáo viên' : 'Teacher Guides', meta:language === 'vi' ? '12 mục' : '12 items' },
  ];

  const recentItems = [
    ...history.slice(0,2).map((x) => ({id:`rh-${x.id}`, icon:'📄', title:x.title, meta:relativeTime(x.createdAt, language), tag:language === 'vi' ? 'Output AI' : 'AI Output'})),
    ...prompts.slice(0,1).map((x) => ({id:`rp-${x.id}`, icon:'💬', title:x.title, meta:relativeTime(x.createdAt, language), tag:language === 'vi' ? 'Bộ prompt' : 'Prompt Set'})),
    ...bank.slice(0,1).map((x) => ({id:`rb-${x.id}`, icon:'❓', title:x.question, meta:x.level || 'B2-C1', tag:language === 'vi' ? 'Câu hỏi' : 'Question'})),
  ].slice(0,3);

  const fallbackRecent = recentItems.length ? recentItems : [
    {id:'f1',icon:'📄',title:'Vocabulary Builder Set',meta:'30m ago',tag:'Question Bank'},
    {id:'f2',icon:'💬',title:'Prompt: Debate Activity',meta:'1h ago',tag:'Prompt Set'},
    {id:'f3',icon:'▧',title:'Output: Email Template',meta:'3h ago',tag:'AI Output'},
  ];

  const total = prompts.length + history.length + bank.length + 54;
  const activity = [
    history[0] ? {icon:'📄',title:history[0].title,time:relativeTime(history[0].createdAt,language)} : {icon:'📄',title:'Story: The Smart Choice',time:'2h ago'},
    bank[0] ? {icon:'❓',title:bank[0].question,time:bank[0].level || 'B2-C1'} : {icon:'❓',title:'Speaking Starters A2',time:'3h ago'},
    prompts[0] ? {icon:'💬',title:prompts[0].title,time:relativeTime(prompts[0].createdAt,language)} : {icon:'💬',title:'Prompt: Debate Activity',time:'1d ago'},
    {icon:'📁',title:'Worksheet: Modal Verbs',time:'1d ago'},
  ];

  return (
    <section className="library-v46-dashboard" aria-label={language === 'vi' ? 'Tổng quan thư viện' : 'Library dashboard'}>
      <div className="library-v46-main-grid">
        <LibraryV46ListCard tone="mint" icon="▤" title={language === 'vi' ? 'Bộ prompt' : 'Prompt Sets'} subtitle={language === 'vi' ? 'Bộ prompt tái sử dụng cho mọi nhiệm vụ' : 'Reusable prompt collections for any task'} items={promptItems} onOpen={() => onOpen('prompts')} actionLabel={language === 'vi' ? 'Xem tất cả' : 'View all'} emptyLabel={language === 'vi' ? 'Chưa có prompt.' : 'No prompts yet.'} />
        <LibraryV46ListCard tone="blue" icon="▧" title={language === 'vi' ? 'Output AI' : 'AI Outputs'} subtitle={language === 'vi' ? 'Xem lại và tái sử dụng nội dung đã tạo' : 'Review and reuse your generated content'} items={outputItems} onOpen={() => onOpen('history')} actionLabel={language === 'vi' ? 'Xem tất cả' : 'View all'} emptyLabel={language === 'vi' ? 'Chưa có output.' : 'No outputs yet.'} />
        <LibraryV46ListCard tone="gold" icon="?" title={language === 'vi' ? 'Ngân hàng câu hỏi' : 'Question Bank'} subtitle={language === 'vi' ? 'Câu hỏi có tổ chức cho kiểm tra và hoạt động' : 'Organized questions for tests and activities'} items={bankItems} onOpen={() => onOpen('bank')} actionLabel={language === 'vi' ? 'Xem tất cả' : 'View all'} emptyLabel={language === 'vi' ? 'Chưa có câu hỏi.' : 'No questions yet.'} />
        <LibraryV46ListCard tone="green" icon="▱" title={language === 'vi' ? 'Học liệu giảng dạy' : 'Teaching Resources'} subtitle={language === 'vi' ? 'Phiếu học tập, hướng dẫn, mẫu tài liệu và nhiều hơn' : 'Worksheets, guides, templates and more'} items={resourceItems} onOpen={() => (window.location.hash = '#/resources')} actionLabel={language === 'vi' ? 'Xem tất cả' : 'View all'} emptyLabel="" />
        <LibraryV46ListCard tone="violet" icon="◷" title={language === 'vi' ? 'Lưu gần đây' : 'Recent Saves'} subtitle={language === 'vi' ? 'Các mục vừa được lưu trong thư viện' : 'Your latest saved items across the library'} items={fallbackRecent} onOpen={() => onOpen('history')} actionLabel={language === 'vi' ? 'Xem tất cả' : 'View all'} emptyLabel="" />
        <article className="library-v46-card tone-actions library-v46-actions-card">
          <header><div><span>⚡</span><div><h3>{language === 'vi' ? 'Thao tác nhanh' : 'Quick Actions'}</h3><p>{language === 'vi' ? 'Tạo, tổ chức và tăng tốc quy trình làm việc' : 'Create, organize and accelerate your workflow'}</p></div></div></header>
          <div className="library-v46-actions-grid">
            <button type="button" onClick={() => onOpen('prompts')}>＋ <span>{language === 'vi' ? 'Bộ prompt mới' : 'New prompt set'}</span></button>
            <button type="button" onClick={() => onOpen('bank')}>❓ <span>{language === 'vi' ? 'Ngân hàng mới' : 'New question bank'}</span></button>
            <button type="button" onClick={() => onOpen('ai')}>✦ <span>{language === 'vi' ? 'Tạo bằng AI' : 'Generate with AI'}</span></button>
            <button type="button" onClick={() => (window.location.hash = '#/resources')}>⇧ <span>{language === 'vi' ? 'Tải học liệu' : 'Upload resource'}</span></button>
            <button type="button" onClick={() => onOpen('backup')}>▰ <span>{language === 'vi' ? 'Tạo thư mục' : 'Create folder'}</span></button>
            <button type="button" onClick={() => (window.location.hash = '#/apps')}>▤ <span>{language === 'vi' ? 'Khám phá mẫu' : 'Explore templates'}</span></button>
          </div>
        </article>
      </div>

      <aside className="library-v46-overview">
        <div className="library-v46-overview-head"><span>▥</span><h3>{language === 'vi' ? 'Tổng quan thư viện' : 'Library Overview'}</h3></div>
        <div className="library-v46-overview-stats">
          <div><span>💬 {language === 'vi' ? 'Bộ prompt' : 'Prompt sets'}</span><b>{prompts.length}</b></div>
          <div><span>📄 {language === 'vi' ? 'Output AI' : 'AI outputs'}</span><b>{history.length}</b></div>
          <div><span>❓ {language === 'vi' ? 'Ngân hàng câu hỏi' : 'Question banks'}</span><b>{bank.length}</b></div>
          <div><span>▤ {language === 'vi' ? 'Tài nguyên' : 'Resources'}</span><b>54</b></div>
          <div className="total"><span>▱ {language === 'vi' ? 'Tổng số mục' : 'Total items'}</span><b>{total}</b></div>
        </div>
        <div className="library-v46-tag-block">
          <strong>{language === 'vi' ? 'Thẻ phổ biến' : 'Popular Tags'}</strong>
          <div><span>Lesson Plan <b>32</b></span><span>Speaking <b>27</b></span><span>Writing <b>24</b></span><span>Grammar <b>21</b></span><span>Reading <b>20</b></span><span>+8 more</span></div>
        </div>
        <div className="library-v46-activity">
          <strong>{language === 'vi' ? 'Hoạt động gần đây' : 'Recent Activity'}</strong>
          {activity.map((item, index) => <div key={`${item.title}-${index}`}><span>{item.icon}</span><b>{item.title}</b><small>{item.time}</small></div>)}
        </div>
      </aside>
    </section>
  );
}

function HistoryPanel({ language, data, refresh, setToast, setLivePayload }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => `${item.title} ${item.toolTitle} ${item.content}`.toLowerCase().includes(q));
  }, [data, query]);

  const clear = () => {
    if (confirm(language === 'vi' ? 'Xoá toàn bộ lịch sử?' : 'Clear all history?')) {
      clearList(HISTORY_KEY);
      refresh();
    }
  };

  const openLive = (item) => {
    if (item.activityData) {
      setLivePayload({ title: item.title, payload: item.activityData });
      return;
    }
    const questions = parseMcqFromText(item.content, { source: item.title, level: item.level || 'B2-C1', topic: item.toolTitle || '' });
    if (questions.length) setLivePayload({ title: item.title, payload: { questions } });
    else setToast(language === 'vi' ? 'Mục này chưa chuyển được thành hoạt động tương tác.' : 'This item cannot be converted into an interactive activity yet.');
  };

  return (
    <section className="library-section">
      <div className="library-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={language === 'vi' ? 'Tìm trong lịch sử...' : 'Search history...'} />
        <button onClick={() => exportJson('brian-history.json', data)} disabled={!data.length}>JSON</button>
        <button onClick={clear} disabled={!data.length}>{language === 'vi' ? 'Xoá hết' : 'Clear'}</button>
      </div>
      {!filtered.length ? (
        <div className="empty-state"><p>{language === 'vi' ? 'Chưa có lịch sử. Hãy tạo nội dung bằng AI hoặc lưu hoạt động trước.' : 'No history yet. Generate with AI or save an activity first.'}</p></div>
      ) : (
        <div className="library-list">
          {filtered.map((item) => (
            <article className="library-card" key={item.id}>
              <div className="library-card-head">
                <div>
                  <span className="eyebrow">{item.sourceAppTitle || item.toolTitle || item.kind}</span>
                  <h3>{item.title}{item.activityData ? <span className="playable-badge">{language === 'vi' ? 'Chơi lại đúng mẫu' : 'Exact replay'}</span> : null}</h3>
                  <small>{formatDate(item.createdAt)} · {item.templateId || item.level || ''} {item.itemCount ? `· ${item.itemCount} items` : ''}</small>
                </div>
                <button onClick={() => { deleteFromList(HISTORY_KEY, item.id); refresh(); }}>×</button>
              </div>
              <pre>{item.content}</pre>
              <div className="preview-actions wrap-actions">
                <button className="primary" onClick={() => openLive(item)}>{language === 'vi' ? 'Chơi trực tiếp' : 'Live play'}</button>
                <button onClick={() => copyText(item.content, () => setToast(language === 'vi' ? 'Đã copy.' : 'Copied.'))}>Copy</button>
                <button onClick={() => downloadFile(`${slugify(item.title)}.txt`, item.content)}>TXT</button>
                <button onClick={() => exportAsHtml(item.title, item.content)}>HTML</button>
                <button onClick={() => exportAsWord(item.title, item.content)}>Word .doc</button>
                <button onClick={() => { const added = addQuestionsFromTextToBank(item.content, { source: item.title, level: item.level || 'B2-C1', topic: item.toolTitle || '' }); refresh(); setToast(language === 'vi' ? `Đã thêm ${added.length} câu vào ngân hàng.` : `Added ${added.length} questions to bank.`); }}>{language === 'vi' ? 'Đưa vào ngân hàng' : 'To bank'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PromptPanel({ language, data, refresh, setToast }) {
  const [title, setTitle] = useState('B2-C1 Word Form Test');
  const [category, setCategory] = useState('Assessment');
  const [body, setBody] = useState('Create 50 B2-C1 word form multiple-choice questions. Do not repeat content words. Include answer key.');

  const save = () => {
    if (!body.trim()) return;
    savePromptEntry({ title: title || 'Untitled prompt', category, body });
    refresh();
    setToast(language === 'vi' ? 'Đã lưu prompt.' : 'Prompt saved.');
  };

  return (
    <section className="library-section prompt-layout">
      <article className="panel builder-panel mini-panel">
        <h2>{language === 'vi' ? 'Lưu prompt mẫu' : 'Save reusable prompt'}</h2>
        <label>{language === 'vi' ? 'Tên prompt' : 'Prompt title'}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>{language === 'vi' ? 'Nhóm' : 'Category'}</label>
        <input value={category} onChange={(e) => setCategory(e.target.value)} />
        <label>Prompt</label>
        <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="primary full" onClick={save}>{language === 'vi' ? 'Lưu prompt' : 'Save prompt'}</button>
      </article>
      <article className="panel builder-panel mini-panel">
        <div className="library-card-head">
          <h2>{language === 'vi' ? 'Prompt đã lưu' : 'Saved prompts'}</h2>
          <button onClick={() => exportJson('brian-prompts.json', data)} disabled={!data.length}>JSON</button>
        </div>
        <div className="prompt-list">
          {data.length ? data.map((item) => (
            <div className="prompt-item" key={item.id}>
              <strong>{item.title}</strong>
              <small>{item.category} · {formatDate(item.createdAt)}</small>
              <p>{item.body}</p>
              <div className="preview-actions wrap-actions">
                <button onClick={() => copyText(item.body, () => setToast(language === 'vi' ? 'Đã copy prompt.' : 'Prompt copied.'))}>Copy</button>
                <button onClick={() => { deleteFromList(PROMPTS_KEY, item.id); refresh(); }}>Delete</button>
              </div>
            </div>
          )) : <p className="muted-line">{language === 'vi' ? 'Chưa có prompt.' : 'No prompts yet.'}</p>}
        </div>
      </article>
    </section>
  );
}

function BankPanel({ language, data, refresh, setToast, setLivePayload }) {
  const [query, setQuery] = useState('');
  const [paste, setPaste] = useState('');
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => `${item.question} ${item.topic} ${item.level} ${item.source}`.toLowerCase().includes(q));
  }, [data, query]);
  const text = bankToText(filtered, includeAnswers);

  const importFromPaste = () => {
    const added = addQuestionsFromTextToBank(paste, { source: 'Manual import', level: 'B2-C1' });
    refresh();
    setToast(language === 'vi' ? `Đã nhận diện ${added.length} câu.` : `Detected ${added.length} questions.`);
  };

  const addManual = () => {
    addBankItems([{ question: language === 'vi' ? 'Nhập câu hỏi mẫu ở đây.' : 'Enter your sample question here.', options: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 'A', level: 'B2-C1', source: 'Manual' }]);
    refresh();
  };

  return (
    <section className="library-section">
      <div className="library-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={language === 'vi' ? 'Tìm câu hỏi / level / topic...' : 'Search question / level / topic...'} />
        <label className="check-line"><input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} /> {language === 'vi' ? 'Kèm đáp án' : 'Include answers'}</label>
        <button onClick={addManual}>{language === 'vi' ? 'Thêm mẫu' : 'Add sample'}</button>
      </div>

      <div className="bank-grid">
        <article className="panel builder-panel mini-panel">
          <h2>{language === 'vi' ? 'Nhập từ AI result' : 'Import from AI output'}</h2>
          <p className="muted-line">{language === 'vi' ? 'Dán nội dung có câu trắc nghiệm A-D, hệ thống sẽ cố gắng nhận diện và đưa vào ngân hàng.' : 'Paste text containing A-D multiple-choice questions; the app will try to detect them.'}</p>
          <textarea rows={8} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="1. Question...&#10;A. ...&#10;B. ...&#10;C. ...&#10;D. ...&#10;Answer: A" />
          <button className="primary full" onClick={importFromPaste} disabled={!paste.trim()}>{language === 'vi' ? 'Nhập vào ngân hàng' : 'Import to bank'}</button>
        </article>

        <article className="panel builder-panel mini-panel">
          <h2>{language === 'vi' ? 'Xuất ngân hàng câu hỏi' : 'Export question bank'}</h2>
          <p className="stat-big">{filtered.length}/{data.length}</p>
          <div className="preview-actions wrap-actions">
            <button className="primary" onClick={() => setLivePayload({ title: language === 'vi' ? 'Luyện tập từ ngân hàng câu hỏi' : 'Question Bank Live Practice', payload: { questions: filtered } })} disabled={!filtered.length}>{language === 'vi' ? 'Chơi trực tiếp' : 'Live play'}</button>
            <button onClick={() => copyText(text, () => setToast(language === 'vi' ? 'Đã copy đề.' : 'Copied.'))} disabled={!filtered.length}>Copy</button>
            <button onClick={() => downloadFile('question-bank.txt', text)} disabled={!filtered.length}>TXT</button>
            <button onClick={() => exportAsWord('Question Bank', text)} disabled={!filtered.length}>Word .doc</button>
            <button onClick={() => exportJson('question-bank.json', filtered)} disabled={!filtered.length}>JSON</button>
            <button onClick={() => { if (confirm(language === 'vi' ? 'Xoá toàn bộ ngân hàng câu hỏi?' : 'Clear question bank?')) { clearList(BANK_KEY); refresh(); } }} disabled={!data.length}>{language === 'vi' ? 'Xoá hết' : 'Clear'}</button>
          </div>
        </article>
      </div>

      <div className="library-list compact-list">
        {filtered.length ? filtered.map((item, index) => (
          <article className="question-row" key={item.id}>
            <div>
              <strong>{index + 1}. {item.question}</strong>
              <small>{item.level} · {item.source || item.topic || 'Question bank'}</small>
              <ol type="A">
                {(item.options || []).map((option) => <li key={option}>{option}</li>)}
              </ol>
              {includeAnswers && <p><b>Answer:</b> {item.answer || '—'} {item.explanation ? `· ${item.explanation}` : ''}</p>}
            </div>
            <button onClick={() => { deleteFromList(BANK_KEY, item.id); refresh(); }}>×</button>
          </article>
        )) : <div className="empty-state"><p>{language === 'vi' ? 'Chưa có câu hỏi phù hợp.' : 'No matching questions.'}</p></div>}
      </div>
    </section>
  );
}


function LibraryAIPanel({ language, apiKey, aiModel, hasApiKey, refresh, setToast }) {
  return (
    <section className="library-ai-grid">
      <AICopilotPanel
        language={language}
        apiKey={apiKey}
        aiModel={aiModel}
        hasApiKey={hasApiKey}
        title={language === 'vi' ? 'AI nhập nhanh ngân hàng câu hỏi' : 'AI Question Bank Importer'}
        description={language === 'vi' ? 'Sinh câu hỏi A-D và nhập thẳng vào ngân hàng câu hỏi.' : 'Generate A-D questions and import them directly into the question bank.'}
        task="Create multiple-choice questions for the local question bank."
        defaultInstruction="Create 30 B2-C1 multiple-choice questions about English grammar, vocabulary and word form. Include answer key and explanations."
        defaultCount={30}
        outputFormat="Use numbered MCQ format: 1. Question\nA. option\nB. option\nC. option\nD. option\nAnswer: A\nExplanation: short explanation."
        applyLabel={language === 'vi' ? 'Nhập vào ngân hàng' : 'Import to bank'}
        onApply={(text, meta) => { const added = addQuestionsFromTextToBank(text, { source: 'Teacher Vault AI', level: meta.level, topic: meta.instruction }); refresh(); setToast(language === 'vi' ? `Đã nhập ${added.length} câu vào ngân hàng.` : `Imported ${added.length} questions to the bank.`); }}
      />
      <AICopilotPanel
        language={language}
        apiKey={apiKey}
        aiModel={aiModel}
        hasApiKey={hasApiKey}
        title={language === 'vi' ? 'AI tạo prompt thư viện' : 'AI Prompt Library Builder'}
        description={language === 'vi' ? 'Tạo prompt mẫu và lưu vào kho prompt.' : 'Generate reusable prompts and save them to the prompt library.'}
        task="Create a reusable prompt for an English teacher."
        defaultInstruction="Create a reusable prompt for generating a complete THPT English test with answer key, matrix and explanations."
        defaultCount={1}
        outputFormat="Return one complete reusable prompt only. No markdown fence."
        applyLabel={language === 'vi' ? 'Lưu prompt' : 'Save prompt'}
        onApply={(text, meta) => { savePromptEntry({ title: 'AI Prompt', category: 'AI Generated', body: text }); refresh(); setToast(language === 'vi' ? 'Đã lưu prompt AI.' : 'AI prompt saved.'); }}
      />
    </section>
  );
}

function ImportExportPanel({ language, refresh, setToast }) {
  const [jsonText, setJsonText] = useState('');
  const importJson = () => {
    try {
      const data = JSON.parse(jsonText);
      if (data.history) writeList(HISTORY_KEY, data.history);
      if (data.prompts) writeList(PROMPTS_KEY, data.prompts);
      if (data.bank) writeList(BANK_KEY, data.bank);
      refresh();
      setToast(language === 'vi' ? 'Đã nhập dữ liệu.' : 'Data imported.');
    } catch {
      setToast(language === 'vi' ? 'JSON không hợp lệ.' : 'Invalid JSON.');
    }
  };
  const exportAll = () => {
    exportJson('brian-english-studio-v10-63-library.json', {
      history: readList(HISTORY_KEY),
      prompts: readList(PROMPTS_KEY),
      bank: readList(BANK_KEY),
      exportedAt: new Date().toISOString(),
    });
  };
  return (
    <section className="library-section">
      <article className="panel builder-panel">
        <h2>{language === 'vi' ? 'Sao lưu / khôi phục' : 'Backup / restore'}</h2>
        <p className="muted-line">{language === 'vi' ? 'Dữ liệu được lưu theo tài khoản và đồng bộ Supabase khi đã cấu hình. Bạn vẫn có thể xuất JSON để sao lưu thủ công.' : 'Data is stored per account and synced through Supabase when configured. You can still export JSON as a manual backup.'}</p>
        <div className="preview-actions wrap-actions"><button className="primary" onClick={exportAll}>{language === 'vi' ? 'Xuất toàn bộ JSON' : 'Export all JSON'}</button></div>
        <label>{language === 'vi' ? 'Dán file JSON đã sao lưu' : 'Paste backup JSON'}</label>
        <textarea rows={10} value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
        <button className="secondary" onClick={importJson} disabled={!jsonText.trim()}>{language === 'vi' ? 'Nhập dữ liệu' : 'Import data'}</button>
      </article>
    </section>
  );
}

export default function Library({ language, apiKey, aiModel, hasApiKey }) {
  const [tab, setTab] = useState('history');
  const [toast, setToast] = useState('');
  const [livePayload, setLivePayload] = useState(null);
  const { history, prompts, bank, refresh, syncState } = useLibraryData();
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2400);
  };
  const tabs = [
    ['history', language === 'vi' ? 'Lịch sử' : 'History', history.length],
    ['prompts', 'Prompt Studio', prompts.length],
    ['bank', language === 'vi' ? 'Ngân hàng câu hỏi' : 'Question Bank', bank.length],
    ['ai', language === 'vi' ? 'AI nhập liệu' : 'AI Importer', 0],
    ['backup', language === 'vi' ? 'Sao lưu' : 'Backup', 0],
  ];
  return (
    <div className="page narrow library-page library-page-v61 library-page-v46 bui-library" data-ui="library" data-library-app="teacher-library">
      <LibraryShowcaseHero
        language={language}
        historyCount={history.length}
        promptCount={prompts.length}
        bankCount={bank.length}
        onOpen={setTab}
      />
      <LibraryV46Dashboard
        language={language}
        history={history}
        prompts={prompts}
        bank={bank}
        onOpen={setTab}
      />
      <div className="library-tabs library-v46-tabs bui-library-navigation">
        {tabs.map(([id, label, count]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}{count ? ` · ${count}` : ''}</button>)}
        <button
          type="button"
          className={`library-sync-pill ${syncState.status || 'local'}`}
          onClick={async () => { const result = await syncLibraryFromCloud(); refresh(); showToast(result.ok ? (language === 'vi' ? 'Đã đồng bộ Thư viện theo tài khoản.' : 'Account library synced.') : (result.message || 'Sync failed')); }}
        >
          {syncState.status === 'syncing' ? '↻' : syncState.status === 'synced' ? '✓' : syncState.status === 'error' ? '!' : '◌'}
          {language === 'vi' ? (syncState.status === 'synced' ? 'Đã đồng bộ' : syncState.status === 'syncing' ? 'Đang đồng bộ' : syncState.status === 'error' ? 'Lỗi đồng bộ' : 'Lưu cục bộ') : (syncState.message || 'Local library')}
        </button>
      </div>
      {tab === 'history' && <HistoryPanel language={language} data={history} refresh={refresh} setToast={showToast} setLivePayload={setLivePayload} />}
      {tab === 'prompts' && <PromptPanel language={language} data={prompts} refresh={refresh} setToast={showToast} />}
      {tab === 'bank' && <BankPanel language={language} data={bank} refresh={refresh} setToast={showToast} setLivePayload={setLivePayload} />}
      {tab === 'ai' && <LibraryAIPanel language={language} apiKey={apiKey} aiModel={aiModel} hasApiKey={hasApiKey} refresh={refresh} setToast={showToast} />}
      {tab === 'backup' && <ImportExportPanel language={language} refresh={refresh} setToast={showToast} />}
      {livePayload && (
        <div className="live-fullscreen">
          <div className="live-fullscreen-head">
            <div><span className="eyebrow">Live Classroom Mode</span><h2>{livePayload.title}</h2></div>
            <button className="primary" onClick={() => setLivePayload(null)}>× {language === 'vi' ? 'Đóng' : 'Close'}</button>
          </div>
          <LiveActivityPlayer payload={livePayload.payload} language={language} title={livePayload.title} />
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
