import React, { useMemo } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2SystemWorkspaces.css';
import './B2NewsCloud.css';

const openV1 = (target) => window.open(`/#/${target}`, '_blank', 'noopener,noreferrer');
const safeArray = (value) => Array.isArray(value) ? value : [];

function formatDateTime(value) {
  if (!value) return 'Chưa có snapshot';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
}

function sourceState(source, errors) {
  const value = String(source || 'empty');
  const failed = safeArray(errors).some((item) => String(item?.source || '').toLowerCase().includes(value.split('-')[0]));
  if (failed) return { tone: 'red', label: 'Có lỗi đọc' };
  if (/cloud|supabase|rpc/.test(value)) return { tone: 'green', label: 'Cloud' };
  if (/local|cache|workspace|history|assigned/.test(value)) return { tone: 'blue', label: 'Local/Fallback' };
  if (/empty|guest/.test(value)) return { tone: 'neutral', label: 'Chưa có dữ liệu' };
  return { tone: 'blue', label: 'Đã đọc' };
}

export default function B2Cloud() {
  const { user, classes, students, resources, reports, dashboard, sources, errors, generatedAt, loading, refreshing, refresh } = useBrianV2Data();
  const sourceRows = useMemo(() => Object.entries(sources || {}), [sources]);
  const errorRows = safeArray(errors);
  const cloudCount = sourceRows.filter(([, value]) => /cloud|supabase|rpc/.test(String(value || ''))).length;
  const fallbackCount = sourceRows.filter(([, value]) => /local|cache|workspace|history|assigned/.test(String(value || ''))).length;

  return <>
    <B2PageHeader
      eyebrow="SYSTEM · CLOUD OPERATIONS"
      title="Cloud & Data Operations"
      description="Bảng điều khiển read-first cho nguồn dữ liệu hiện tại của Brian. Metro Next không tự suy đoán trạng thái dịch vụ; các chỉ báo dưới đây phản ánh đúng snapshot mà Data Bridge đang đọc."
      actions={<>
        <B2Button variant="primary" onClick={() => openV1('cloud-operations')}>Mở Cloud Operations V1 ↗</B2Button>
        <B2Button onClick={() => refresh()} disabled={refreshing || loading}>{refreshing || loading ? 'Đang đồng bộ…' : 'Đồng bộ lại'}</B2Button>
      </>}
      aside={<B2Badge tone={errorRows.length ? 'amber' : cloudCount ? 'green' : 'blue'}>{errorRows.length ? `${errorRows.length} SOURCE ISSUE` : cloudCount ? 'LIVE SOURCES' : 'READ-FIRST'}</B2Badge>}
    />

    <section className="b2-system-stats">
      <B2StatCard label="Nguồn cloud" value={String(cloudCount).padStart(2, '0')} meta="theo snapshot" tone="green" icon="☁" />
      <B2StatCard label="Nguồn fallback" value={String(fallbackCount).padStart(2, '0')} meta="local/cache" tone="blue" icon="◇" />
      <B2StatCard label="Lỗi nguồn" value={String(errorRows.length).padStart(2, '0')} meta="không che lỗi" tone="violet" icon="!" />
      <B2StatCard label="Data domains" value={String(sourceRows.length).padStart(2, '0')} meta="đã khai báo" tone="cyan" icon="▦" />
    </section>

    <section className="b2-system-grid">
      <div className="b2-system-stack">
        <div>
          <B2SectionHeader eyebrow="SOURCE MAP" title="Bản đồ nguồn dữ liệu" description={`Snapshot gần nhất: ${formatDateTime(generatedAt)}`} />
          <div className="b2-cloud-source-grid">
            {sourceRows.map(([key, value]) => {
              const state = sourceState(value, errorRows);
              return <article key={key} className="b2-cloud-source-card">
                <div><span>{key}</span><strong>{dataSourceLabel(value)}</strong></div>
                <B2Status tone={state.tone}>{state.label}</B2Status>
                <small>{String(value || 'empty')}</small>
              </article>;
            })}
            {!sourceRows.length ? <div className="b2-system-empty"><div><strong>Chưa có source map</strong><p>Data Bridge chưa tạo snapshot cho phiên hiện tại.</p></div></div> : null}
          </div>
        </div>

        <div>
          <B2SectionHeader eyebrow="DATA ESTATE" title="Dữ liệu V2 đang nhìn thấy" description="Chỉ đếm dữ liệu đã đọc thành công; không dùng số liệu demo." />
          <div className="b2-cloud-estate">
            <div><span>Lớp học</span><strong>{safeArray(classes).length}</strong></div>
            <div><span>Học sinh</span><strong>{safeArray(students).length}</strong></div>
            <div><span>Học liệu</span><strong>{safeArray(resources?.items || resources).length}</strong></div>
            <div><span>Báo cáo</span><strong>{safeArray(reports).length}</strong></div>
            <div><span>Dashboard</span><strong>{dashboard ? 'READY' : 'EMPTY'}</strong></div>
            <div><span>Phiên người dùng</span><strong>{user?.id ? 'AUTH' : 'GUEST'}</strong></div>
          </div>
        </div>

        {errorRows.length ? <div>
          <B2SectionHeader eyebrow="SOURCE ERRORS" title="Lỗi đang được Data Bridge báo" description="Giữ nguyên thông tin lỗi để QA và vận hành truy vết." />
          <div className="b2-system-list">{errorRows.map((item, index) => <article className="b2-system-row" key={`${item?.source || 'source'}-${index}`}><div className="b2-system-row__copy"><strong>{item?.source || 'Data Bridge'}</strong><small>{item?.message || String(item)}</small></div><B2Status tone="red">ISSUE</B2Status></article>)}</div>
        </div> : null}
      </div>

      <aside className="b2-system-stack">
        <B2Surface>
          <B2SectionHeader eyebrow="OPERATIONS" title="Điều khiển hệ thống" description="Các thao tác ghi hoặc quản trị sâu vẫn dùng engine V1 trong giai đoạn Shadow." />
          <div className="b2-system-action-list">
            <button type="button" onClick={() => openV1('cloud-operations')}><span>☁</span><strong>Cloud Operations</strong><em>↗</em></button>
            <button type="button" onClick={() => openV1('platform-readiness')}><span>✓</span><strong>Platform Readiness</strong><em>↗</em></button>
            <button type="button" onClick={() => openV1('data-governance')}><span>◇</span><strong>Data Governance</strong><em>↗</em></button>
            <button type="button" onClick={() => openV1('app-vault')}><span>▦</span><strong>App Vault</strong><em>↗</em></button>
          </div>
        </B2Surface>
        <B2Surface>
          <B2SectionHeader eyebrow="AUTH" title="Phiên vận hành" />
          <div className="b2-cloud-operator">
            <strong>{user?.name || user?.email || 'Chưa đăng nhập'}</strong>
            <small>{user?.email || 'Không có email trong snapshot'}</small>
            <B2Badge tone={dataSourceTone(sources?.auth)}>{dataSourceLabel(sources?.auth)}</B2Badge>
          </div>
        </B2Surface>
      </aside>
    </section>
  </>;
}
