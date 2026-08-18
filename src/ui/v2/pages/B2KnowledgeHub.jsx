import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataState, B2DataToolbar, B2FilterChips, B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2SystemWorkspaces.css';

const openV1 = () => window.open('/#/knowledge-hub', '_blank', 'noopener,noreferrer');

export default function B2KnowledgeHub() {
  const { resources, sources, loading, refreshing, refresh } = useBrianV2Data();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const items = resources.items || [];
  const categories = useMemo(() => {
    const counts = new Map();
    items.forEach((item) => counts.set(item.category || 'other', (counts.get(item.category || 'other') || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const visible = useMemo(() => items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (q && !`${item.title} ${item.description} ${item.tag} ${item.category}`.toLowerCase().includes(q)) return false;
    if (filter === 'approved') return item.status === 'approved';
    if (filter === 'interactive') return item.type === 'Hoạt động';
    if (filter === 'assessment') return item.type === 'Đề kiểm tra';
    return true;
  }), [items, query, filter]);
  const approved = items.filter((item) => item.status === 'approved').length;
  const interactive = items.filter((item) => item.type === 'Hoạt động').length;
  const assessment = items.filter((item) => item.type === 'Đề kiểm tra').length;

  return <>
    <B2PageHeader eyebrow="TEACH · KNOWLEDGE HUB" title="Kho học liệu thông minh" description="Lớp khám phá học liệu Metro Next dùng chính Resource Library hiện hữu. Không tạo chỉ mục V2 riêng; tìm kiếm và phân loại ở đây chỉ đọc snapshot đã đồng bộ." actions={<><B2Button variant="primary" onClick={openV1}>Mở Knowledge Hub V1 ↗</B2Button><B2Button onClick={() => refresh()}>{refreshing ? 'Đang làm mới…' : 'Đồng bộ lại'}</B2Button></>} aside={<B2Badge tone={dataSourceTone(sources.resources)}>{dataSourceLabel(sources.resources)}</B2Badge>} />
    <section className="b2-system-stats"><B2StatCard label="Học liệu" value={items.length} meta="đang khả dụng" tone="blue" icon="▤"/><B2StatCard label="Đã duyệt" value={approved} meta="status approved" tone="green" icon="✓"/><B2StatCard label="Tương tác" value={interactive} meta="HTML / activity" tone="violet" icon="▶"/><B2StatCard label="Đánh giá" value={assessment} meta="test / spreadsheet" tone="cyan" icon="◇"/></section>
    <B2DataToolbar left={<><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm trong kho học liệu thật…"/><B2FilterChips value={filter} onChange={setFilter} items={[{id:'all',label:'Tất cả',count:items.length},{id:'approved',label:'Đã duyệt',count:approved},{id:'interactive',label:'Tương tác',count:interactive},{id:'assessment',label:'Đánh giá',count:assessment}]}/></>} right={<B2Badge>{visible.length} kết quả</B2Badge>} />
    <section className="b2-system-grid">
      <div>{loading ? <B2DataState type="loading"/> : visible.length ? <div className="b2-system-list">{visible.slice(0,18).map((item)=><article key={item.id} className="b2-system-row"><div className="b2-system-row__copy"><strong>{item.title}</strong><small>{item.description || item.meta || 'Không có mô tả'}</small><em>{item.category} · {item.meta}</em></div><div className="b2-system-row__meta"><B2Badge tone={item.tone==='violet'?'violet':item.tone==='green'?'green':'blue'}>{item.type}</B2Badge><B2Status tone={item.status==='approved'?'green':item.status==='pending'?'amber':'blue'}>{item.status || 'local'}</B2Status></div></article>)}</div> : <div className="b2-system-empty"><div><strong>Không có học liệu phù hợp</strong><p>V2 không sinh dữ liệu mẫu khi Resource Library không có kết quả.</p></div></div>}</div>
      <aside className="b2-system-stack"><B2Surface><B2SectionHeader eyebrow="CATEGORIES" title="Nhóm đang có"/><div className="b2-system-action-list">{categories.slice(0,8).map(([name,count])=><button key={name} type="button" onClick={()=>setQuery(name)}><span>▤</span><strong>{name}</strong><em>{count}</em></button>)}{!categories.length?<div className="b2-system-empty"><div><strong>Chưa có danh mục</strong></div></div>:null}</div></B2Surface><B2Surface><B2SectionHeader eyebrow="STORAGE" title="Nguồn lưu trữ"/><div className="b2-system-source"><B2Badge tone={resources.drive?.connected?'green':'blue'}>{resources.drive?.connected?'DRIVE CONNECTED':'LOCAL / CLOUD CACHE'}</B2Badge><B2Badge tone={dataSourceTone(sources.resources)}>{dataSourceLabel(sources.resources)}</B2Badge></div></B2Surface></aside>
    </section>
  </>;
}
