import React from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2Secondary.css';

const safeArray = (value) => Array.isArray(value) ? value : [];
const openV1 = (target = 'admin') => window.open(`/#/${target}`, '_blank', 'noopener,noreferrer');

function formatDateTime(value) {
  if (!value) return 'Chưa có snapshot';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function B2Admin({ navigate, permissionMode = 'preview', roleMeta = null, canOpen = () => false }) {
  const { user, classes, students, resources, reports, sources, errors, generatedAt, loading, refreshing, refresh } = useBrianV2Data();
  const resourceItems = safeArray(resources?.items);
  const errorRows = safeArray(errors);
  const sourceRows = Object.entries(sources || {});

  return <>
    <B2PageHeader
      eyebrow="SYSTEM · ADMIN · READ-FIRST"
      title="Quản trị"
      description="Admin V2 không hiển thị tài khoản, session, audit event hay chỉ số sức khỏe giả. Trang này chỉ tổng hợp dữ liệu và quyền mà Brian hiện đang đọc; tác vụ quản trị ghi dữ liệu tiếp tục chạy trong V1."
      actions={<>
        <B2Button variant="primary" onClick={() => openV1('admin')}>Mở Admin V1 ↗</B2Button>
        {canOpen('cloud') ? <B2Button onClick={() => navigate?.('cloud')}>Cloud & Data</B2Button> : null}
        <B2Button variant="ghost" onClick={() => refresh()} disabled={loading || refreshing}>{loading || refreshing ? 'Đang đồng bộ…' : 'Làm mới snapshot'}</B2Button>
      </>}
      aside={<B2Badge tone={permissionMode === 'real' ? 'green' : 'violet'}>{permissionMode === 'real' ? 'LIVE PERMISSIONS' : 'SHADOW SIMULATOR'}</B2Badge>}
    />

    <section className="b2-admin-stats">
      <B2StatCard label="Lớp nhìn thấy" value={String(safeArray(classes).length).padStart(2, '0')} meta={dataSourceLabel(sources?.classes)} tone="blue" icon="♙" />
      <B2StatCard label="Học sinh" value={String(safeArray(students).length).padStart(2, '0')} meta={dataSourceLabel(sources?.students)} tone="violet" icon="◎" />
      <B2StatCard label="Học liệu" value={String(resourceItems.length).padStart(2, '0')} meta={dataSourceLabel(sources?.resources)} tone="green" icon="▤" />
      <B2StatCard label="Lỗi nguồn" value={String(errorRows.length).padStart(2, '0')} meta="Data Bridge" tone="cyan" icon="!" />
    </section>

    <section className="b2-admin-layout">
      <div className="b2-system-stack">
        <B2Surface>
          <B2SectionHeader eyebrow="OPERATOR" title="Phiên quản trị hiện tại" description="Thông tin lấy từ auth/profile đang hoạt động, không phải danh sách user mẫu." />
          <div className="b2-admin-live-operator">
            <div className="b2-admin-user"><strong>{user?.name || user?.email || 'Shadow Preview'}</strong><small>{user?.email || 'Chưa có tài khoản thật trong preview'}</small></div>
            <B2Badge tone={permissionMode === 'real' ? 'green' : 'violet'}>{roleMeta?.label || user?.role || 'Preview role'}</B2Badge>
            <B2Status tone={dataSourceTone(sources?.auth)}>{dataSourceLabel(sources?.auth)}</B2Status>
          </div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="DATA BRIDGE" title="Nguồn dữ liệu quản trị đang đọc" description={`Snapshot: ${formatDateTime(generatedAt)}`} />
          <div className="b2-admin-health">
            {sourceRows.map(([key, value]) => <div key={key}><B2Status tone={dataSourceTone(value)}>{key}</B2Status><small>{dataSourceLabel(value)}</small></div>)}
            {!sourceRows.length ? <p className="b2-empty-copy">Chưa có source map trong phiên hiện tại.</p> : null}
          </div>
        </B2Surface>

        {errorRows.length ? <B2Surface>
          <B2SectionHeader eyebrow="ISSUES" title="Lỗi nguồn hiện tại" description="Không chuyển lỗi thật thành trạng thái xanh giả." />
          <div className="b2-simple-list">{errorRows.map((item, index) => <button type="button" key={`${item?.source || 'bridge'}-${index}`}><strong>{item?.source || 'Data Bridge'}</strong><span>{item?.message || String(item)}</span></button>)}</div>
        </B2Surface> : null}
      </div>

      <aside className="b2-system-stack">
        <B2Surface>
          <B2SectionHeader eyebrow="ESTATE" title="Dữ liệu hiện hữu" />
          <div className="b2-system-mini-grid">
            <div className="b2-system-mini"><span>Lớp</span><strong>{safeArray(classes).length}</strong><small>assigned/workspace</small></div>
            <div className="b2-system-mini"><span>Học sinh</span><strong>{safeArray(students).length}</strong><small>visible records</small></div>
            <div className="b2-system-mini"><span>Học liệu</span><strong>{resourceItems.length}</strong><small>resource store</small></div>
            <div className="b2-system-mini"><span>Báo cáo</span><strong>{safeArray(reports).length}</strong><small>history-derived</small></div>
          </div>
        </B2Surface>
        <B2Surface>
          <B2SectionHeader eyebrow="GOVERNANCE" title="Quản trị chuyên sâu" description="Mở workflow V1 để tránh tạo write-path song song trước release." />
          <div className="b2-system-action-list">
            <button type="button" onClick={() => openV1('admin')}><span>◎</span><strong>Tài khoản & quyền</strong><em>↗</em></button>
            <button type="button" onClick={() => openV1('cloud-operations')}><span>☁</span><strong>Cloud Operations</strong><em>↗</em></button>
            <button type="button" onClick={() => openV1('data-governance')}><span>◇</span><strong>Data Governance</strong><em>↗</em></button>
            <button type="button" onClick={() => openV1('platform-readiness')}><span>✓</span><strong>Platform Readiness</strong><em>↗</em></button>
          </div>
        </B2Surface>
      </aside>
    </section>
  </>;
}
