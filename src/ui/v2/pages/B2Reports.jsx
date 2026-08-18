import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataState, B2DataTable, B2DataToolbar, B2FilterChips, B2RowActions, B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2Management.css';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function openReportSource(row) {
  const slug = row?.raw?.toolSlug || row?.raw?.sourceApp;
  if (slug && slug !== 'brian-english-studio') {
    window.open(`/#/tool/${encodeURIComponent(slug)}`, '_blank', 'noopener,noreferrer');
    return;
  }
  window.open('/#/library', '_blank', 'noopener,noreferrer');
}

export default function B2Reports() {
  const { reports, loading, refreshing, sources, refresh } = useBrianV2Data();
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => ({
    all: reports.length,
    pdf: reports.filter((item) => item.format.startsWith('PDF')).length,
    xlsx: reports.filter((item) => item.format === 'XLSX').length,
    docx: reports.filter((item) => item.format === 'DOCX').length,
    html: reports.filter((item) => item.format === 'HTML').length,
  }), [reports]);

  const rows = useMemo(() => reports.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'pdf') return item.format.startsWith('PDF');
    return item.format.toLowerCase() === filter;
  }), [reports, filter]);

  const columns = [
    { key: 'name', label: 'Báo cáo / dữ liệu xuất', width: '42%', render: (row) => <div className="b2-report-name"><strong>{row.name}</strong><small>{row.area}</small></div> },
    { key: 'created', label: 'Cập nhật', width: '23%', render: (row) => formatDate(row.created) },
    { key: 'format', label: 'Định dạng', width: '12%', render: (row) => <B2Badge>{row.format}</B2Badge> },
    { key: 'status', label: 'Trạng thái', width: '15%', render: () => <B2Status tone="green">Đã lưu</B2Status> },
    { key: 'actions', label: '', width: '8%', align: 'right', render: (row) => <B2RowActions items={[{ label: 'Mở nguồn tạo', icon: '↗', onClick: () => openReportSource(row) }, { label: 'Mở Library V1', icon: '▤', onClick: () => window.open('/#/library', '_blank', 'noopener,noreferrer') }]} /> },
  ];

  const filterItems = [
    { id: 'all', label: 'Tất cả', count: counts.all },
    ...(counts.pdf ? [{ id: 'pdf', label: 'PDF/View', count: counts.pdf }] : []),
    ...(counts.xlsx ? [{ id: 'xlsx', label: 'XLSX', count: counts.xlsx }] : []),
    ...(counts.docx ? [{ id: 'docx', label: 'DOCX', count: counts.docx }] : []),
    ...(counts.html ? [{ id: 'html', label: 'HTML', count: counts.html }] : []),
  ];

  return <>
    <B2PageHeader
      eyebrow="WORK · REPORTS · READ-FIRST"
      title="Báo cáo"
      description="Report Center V2 đọc các output/export liên quan đến báo cáo trong History của đúng tài khoản hiện tại. Nó chưa tạo một bảng báo cáo mới và không ghi ngược dữ liệu ở giai đoạn Shadow UI."
      actions={<><B2Button variant="ghost" onClick={() => refresh({ syncCloudResources: false })} disabled={refreshing}>{refreshing ? 'Đang làm mới…' : '↻ Làm mới lịch sử'}</B2Button><B2Button onClick={() => window.open('/#/library', '_blank', 'noopener,noreferrer')}>Mở Library V1 ↗</B2Button></>}
      aside={<B2Badge tone={dataSourceTone(sources.reports)}>{dataSourceLabel(sources.reports)}</B2Badge>}
    />

    <section className="b2-management-stats">
      <B2StatCard label="Đã nhận diện" value={String(counts.all)} meta="entry liên quan báo cáo" tone="blue" icon="▱" />
      <B2StatCard label="PDF / View" value={String(counts.pdf)} meta="trong history" tone="green" icon="◇" />
      <B2StatCard label="XLSX" value={String(counts.xlsx)} meta="trong history" tone="violet" icon="▦" />
      <B2StatCard label="DOCX / HTML" value={String(counts.docx + counts.html)} meta="trong history" tone="cyan" icon="↗" />
    </section>

    <section className="b2-report-templates">
      <B2SectionHeader eyebrow="CREATE IN V1" title="Tạo báo cáo bằng engine hiện tại" description="Các lối tắt dưới đây mở đúng workflow V1; Shadow UI chưa thay thế export engine để tránh làm lệch file đầu ra." />
      <div className="b2-report-template-grid">
        <B2Surface><span className="b2-report-template-icon">◎</span><strong>Chủ nhiệm / chuyên cần</strong><p>Dùng workspace chủ nhiệm và các exporter hiện tại.</p><B2Button variant="ghost" onClick={() => window.open('/#/homeroom', '_blank', 'noopener,noreferrer')}>Mở Chủ nhiệm V1 →</B2Button></B2Surface>
        <B2Surface><span className="b2-report-template-icon">▥</span><strong>Danh sách / điểm lớp</strong><p>Giữ nguyên logic xuất dữ liệu của V1.</p><B2Button variant="ghost" onClick={() => window.open('/#/homeroom', '_blank', 'noopener,noreferrer')}>Mở lớp V1 →</B2Button></B2Surface>
        <B2Surface><span className="b2-report-template-icon">▤</span><strong>Work / Dashboard</strong><p>Mở trung tâm công việc để xem dữ liệu nguồn.</p><B2Button variant="ghost" onClick={() => window.open('/#/dashboard', '_blank', 'noopener,noreferrer')}>Mở Dashboard V1 →</B2Button></B2Surface>
      </div>
    </section>

    <section className="b2-report-history">
      <B2SectionHeader eyebrow="HISTORY" title="Output gần đây" />
      <B2DataToolbar left={<B2FilterChips value={filter} onChange={setFilter} items={filterItems} />} right={<B2Badge>{rows.length} hiển thị</B2Badge>} />
      {loading ? <B2DataState type="loading" /> : <B2DataTable columns={columns} rows={rows} empty={<B2DataState title="Chưa có output báo cáo trong History" description="V2 không tạo dữ liệu mẫu. Sau khi bạn xuất/lưu báo cáo bằng workflow V1, các entry phù hợp sẽ xuất hiện tại đây khi bridge làm mới." />} />}
    </section>
  </>;
}
