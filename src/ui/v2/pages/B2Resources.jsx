import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2SectionHeader, B2Surface, B2Tabs } from '../components/B2UI.jsx';
import { B2DataState, B2DataToolbar, B2FilterChips, B2RowActions, B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2Secondary.css';

export default function B2Resources() {
  const { resources, loading, refreshing, sources, refresh } = useBrianV2Data();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('recent');
  const items = resources?.items || [];

  const counts = useMemo(() => ({
    all: items.length,
    docs: items.filter((item) => item.type === 'Tài liệu').length,
    slides: items.filter((item) => item.type === 'Bài trình chiếu').length,
    activities: items.filter((item) => item.type === 'Hoạt động').length,
    tests: items.filter((item) => item.type === 'Đề kiểm tra').length,
    approved: items.filter((item) => item.status === 'approved').length,
    pending: items.filter((item) => item.status === 'pending').length,
  }), [items]);

  const visible = useMemo(() => items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (q && !`${item.title} ${item.type} ${item.tag} ${item.category}`.toLowerCase().includes(q)) return false;
    if (filter === 'docs' && item.type !== 'Tài liệu') return false;
    if (filter === 'slides' && item.type !== 'Bài trình chiếu') return false;
    if (filter === 'activities' && item.type !== 'Hoạt động') return false;
    if (filter === 'tests' && item.type !== 'Đề kiểm tra') return false;
    if (tab === 'approved' && item.status !== 'approved') return false;
    if (tab === 'pending' && item.status !== 'pending') return false;
    return true;
  }), [items, query, filter, tab]);

  const collections = resources?.collections || [];
  const driveConnected = Boolean(resources?.drive?.connected);

  return <>
    <B2PageHeader
      eyebrow="TEACH · RESOURCE LIBRARY · LIVE DATA"
      title="Kho học liệu"
      description="Danh sách V2 đọc Resource Library store hiện tại và đồng bộ cloud theo cơ chế V1. Trong giai đoạn này Shadow UI chỉ đọc/mở tài nguyên, không tạo hay sửa metadata."
      actions={<><B2Button variant="ghost" onClick={() => refresh()} disabled={refreshing}>{refreshing ? 'Đang đồng bộ…' : '↻ Đồng bộ lại'}</B2Button><B2Button onClick={() => window.open('/#/resource-library', '_blank', 'noopener,noreferrer')}>Quản lý trong V1 ↗</B2Button></>}
      aside={<B2Badge tone={dataSourceTone(sources.resources)}>{dataSourceLabel(sources.resources)}</B2Badge>}
    />
    <B2DataToolbar
      left={<><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm tài liệu, bài trình chiếu, hoạt động…" /><B2FilterChips value={filter} onChange={setFilter} items={[{ id: 'all', label: 'Tất cả', count: counts.all }, { id: 'docs', label: 'Tài liệu', count: counts.docs }, { id: 'slides', label: 'Slides', count: counts.slides }, { id: 'activities', label: 'Hoạt động', count: counts.activities }, { id: 'tests', label: 'Đề kiểm tra', count: counts.tests }]} /></>}
      right={<B2Tabs value={tab} onChange={setTab} items={[{ id: 'recent', label: 'Gần đây' }, { id: 'approved', label: `Đã duyệt ${counts.approved}` }, { id: 'pending', label: `Chờ duyệt ${counts.pending}` }]} />}
    />
    <section className="b2-resource-layout">
      <div>
        <B2SectionHeader eyebrow="LIBRARY" title={tab === 'recent' ? 'Học liệu gần đây' : tab === 'approved' ? 'Học liệu đã duyệt' : 'Học liệu chờ duyệt'} description={`${visible.length} mục đang hiển thị`} />
        {loading ? <B2DataState type="loading" /> : visible.length ? (
          <div className="b2-resource-list">
            {visible.map((item) => <article key={item.id} className="b2-resource-row">
              <span className={`b2-resource-icon tone-${item.tone}`}>▤</span>
              <span className="b2-resource-copy"><small>{item.type}</small><strong>{item.title}</strong><em>{item.meta || item.description || item.category}</em></span>
              <B2Badge tone={item.tone === 'violet' ? 'violet' : item.tone === 'green' ? 'green' : 'blue'}>{item.tag}</B2Badge>
              <B2RowActions items={[
                ...(item.driveWebViewLink ? [{ label: 'Mở học liệu', icon: '↗', onClick: () => window.open(item.driveWebViewLink, '_blank', 'noopener,noreferrer') }] : [{ label: 'Mở Kho học liệu V1', icon: '↗', onClick: () => window.open('/#/resource-library', '_blank', 'noopener,noreferrer') }]),
                ...(item.allowDownload && item.driveDownloadLink ? [{ label: 'Tải xuống', icon: '⇩', onClick: () => window.open(item.driveDownloadLink, '_blank', 'noopener,noreferrer') }] : []),
              ]} />
            </article>)}
          </div>
        ) : <B2DataState title="Không có học liệu phù hợp" description={items.length ? 'Thử thay đổi bộ lọc hoặc trạng thái duyệt.' : 'Resource Library hiện chưa có item trong cache/cloud của tài khoản này.'} />}
      </div>
      <aside className="b2-resource-side">
        <B2Surface>
          <B2SectionHeader eyebrow="COLLECTIONS" title="Bộ sưu tập" />
          <div className="b2-simple-list">
            {collections.length ? collections.slice(0, 8).map((collection, index) => <button type="button" key={collection.id || collection.name || index}><strong>{collection.name || collection.title || 'Bộ sưu tập'}</strong><span>{Array.isArray(collection.items) ? `${collection.items.length} mục` : 'V1 data'}</span></button>) : <p className="b2-empty-copy">Chưa có collection trong Resource Store hiện tại.</p>}
          </div>
        </B2Surface>
        <B2Surface>
          <B2SectionHeader eyebrow="SYNC" title="Nguồn dữ liệu" />
          <div className="b2-health-compact"><B2Status tone={driveConnected ? 'green' : 'neutral'}>{driveConnected ? 'Google Drive đã kết nối' : 'Drive chưa ghi nhận kết nối'}</B2Status><p>{dataSourceLabel(sources.resources)} · {items.length} học liệu</p></div>
        </B2Surface>
      </aside>
    </section>
  </>;
}
