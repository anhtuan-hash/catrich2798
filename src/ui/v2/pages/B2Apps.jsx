import React, { useMemo, useState } from 'react';
import { APPS } from '../../../data/apps.js';
import { B2AppCard, B2Badge, B2Button, B2CommandBar, B2PageHeader, B2SearchBox, B2SectionHeader, B2Tabs } from '../components/B2UI.jsx';
import './B2Apps.css';

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'teach', label: 'Dạy học' },
  { id: 'manage', label: 'Quản lý' },
  { id: 'assess', label: 'Đánh giá' },
  { id: 'resource', label: 'Học liệu' },
];

function bucket(app) {
  const haystack = `${app.groupVi || ''} ${app.group || ''} ${app.titleVi || ''}`.toLowerCase();
  if (/đánh giá|assessment|exam|thi|luyện thi/.test(haystack)) return 'assess';
  if (/quản lý|management|work|governance|platform|operations|công việc/.test(haystack)) return 'manage';
  if (/học liệu|resource|knowledge|reading|news/.test(haystack)) return 'resource';
  return 'teach';
}

export default function B2Apps({ navigate }) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState(null);

  const apps = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return APPS.filter((app) => {
      if (tab !== 'all' && bucket(app) !== tab) return false;
      if (!needle) return true;
      return [app.titleVi, app.title, app.groupVi, app.group, app.descVi, app.statusVi]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [query, tab]);

  const counts = useMemo(() => FILTERS.reduce((acc, item) => {
    acc[item.id] = item.id === 'all' ? APPS.length : APPS.filter((app) => bucket(app) === item.id).length;
    return acc;
  }, {}), []);

  return (
    <>
      <B2PageHeader
        eyebrow="BRIAN APPS · METRO NEXT"
        title="Ứng dụng, được tổ chức theo công việc."
        description="Không còn một bức tường card giống nhau. V2 ưu tiên nhóm nhiệm vụ, tìm nhanh và nội dung thật sự cần thiết cho giáo viên."
        actions={(
          <>
            <B2Button variant="primary" icon="＋">Tạo nội dung</B2Button>
            <B2Button onClick={() => navigate?.('teaching-tools')}>Teaching tools</B2Button>
          </>
        )}
        aside={(
          <div className="b2-apps-summary">
            <strong>{APPS.length}</strong>
            <span>ứng dụng đang hoạt động</span>
            <B2Badge tone="green">Shadow UI</B2Badge>
          </div>
        )}
      />

      <B2CommandBar className="b2-apps-commandbar">
        <B2SearchBox value={query} onChange={setQuery} placeholder="Tìm ứng dụng, nhóm chức năng…" />
        <B2Tabs
          items={FILTERS.map((item) => ({ ...item, count: counts[item.id] }))}
          value={tab}
          onChange={setTab}
        />
      </B2CommandBar>

      {selected ? (
        <div className="b2-apps-selection" role="status">
          <div>
            <B2Badge tone="blue">PREVIEW</B2Badge>
            <strong>{selected.titleVi || selected.title}</strong>
            <span>UI V2 chưa thay thế hành vi production. App thật vẫn chạy bằng UI V1.</span>
          </div>
          <B2Button variant="ghost" onClick={() => setSelected(null)}>Đóng</B2Button>
        </div>
      ) : null}

      <section className="b2-apps-section">
        <B2SectionHeader
          eyebrow={tab === 'all' ? 'DANH MỤC' : FILTERS.find((item) => item.id === tab)?.label}
          title={query ? `Kết quả cho “${query}”` : 'Không gian ứng dụng'}
          description={`${apps.length} ứng dụng phù hợp với bộ lọc hiện tại`}
        />

        <div className="b2-app-grid">
          {apps.map((app) => (
            <B2AppCard
              key={app.slug}
              icon={app.icon}
              title={app.titleVi || app.title}
              group={app.groupVi || app.group}
              description={app.descVi || app.desc}
              status={app.statusVi || app.status}
              tone={app.tone || 'blue'}
              featured={Boolean(app.featured)}
              onOpen={() => setSelected(app)}
            />
          ))}
        </div>
      </section>
    </>
  );
}
