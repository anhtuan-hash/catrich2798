import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2CommandBar, B2PageHeader, B2SearchBox, B2SectionHeader, B2StatCard, B2Surface, B2Tabs } from '../components/B2UI.jsx';
import { B2Select, B2Switch, B2TextField, B2Textarea } from '../components/B2Forms.jsx';
import { B2Dialog, B2Drawer, B2Toast } from '../components/B2Overlay.jsx';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { V2_PREVIEW_ROLES, canPreviewTarget } from '../previewPermissions.js';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2UILab.css';

const PERMISSION_TARGETS = [
  { id: 'apps', label: 'Apps' },
  { id: 'homeroom', label: 'Chủ nhiệm' },
  { id: 'reports', label: 'Báo cáo' },
  { id: 'settings', label: 'Settings' },
  { id: 'admin', label: 'Admin' },
  { id: 'ui-lab', label: 'UI Lab' },
];

export default function B2UILab() {
  const data = useBrianV2Data();
  const [drawer, setDrawer] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState(false);
  const [name, setName] = useState('Bảng tương tác');
  const [url, setUrl] = useState('https://ladigitale.dev/digiscreen/');
  const [category, setCategory] = useState('Công cụ dạy học');
  const [description, setDescription] = useState('Website dùng để trình chiếu và tương tác trong tiết học.');
  const [enabled, setEnabled] = useState(true);
  const [tab, setTab] = useState('components');
  const [search, setSearch] = useState('');
  const migrationRows = useMemo(() => Object.entries(V2_TOOL_BRIDGE).map(([slug, meta]) => ({ slug, ...meta })), []);
  const level2Count = migrationRows.filter((item) => item.level >= 2).length;
  const sourceRows = Object.entries(data.sources || {}).map(([key, source]) => ({ key, source }));

  return (
    <>
      <B2PageHeader
        eyebrow="PRIVATE · DESIGN QA"
        title="Brian UI Lab"
        description="Phòng kiểm định component, permission, tool migration và nguồn dữ liệu của Metro Next trước khi bất kỳ phần nào được phát hành."
        actions={(
          <>
            <B2Button variant="primary" onClick={() => setDrawer(true)}>Mở drawer</B2Button>
            <B2Button onClick={() => setDialog(true)}>Mở dialog</B2Button>
            <B2Button variant="ghost" onClick={() => data.refresh()} disabled={data.refreshing}>{data.refreshing ? 'Đang đọc nguồn…' : '↻ Data bridge'}</B2Button>
          </>
        )}
        aside={<B2Badge tone="violet">SHADOW ONLY</B2Badge>}
      />

      <B2CommandBar>
        <B2SearchBox value={search} onChange={setSearch} placeholder="Kiểm tra search state…" />
        <B2Tabs items={[{ id: 'components', label: 'Components' }, { id: 'forms', label: 'Forms' }, { id: 'states', label: 'States' }]} value={tab} onChange={setTab} />
      </B2CommandBar>

      <section className="b2-lab-section">
        <B2SectionHeader eyebrow="FOUNDATIONS" title="Density & hierarchy" description="Các khối này kiểm tra spacing, màu và typography trên cùng một canvas." />
        <div className="b2-lab-stat-grid">
          <B2StatCard label="Component" value="22+" meta="primitive dùng chung" tone="blue" icon="▦" />
          <B2StatCard label="Surface" value="0" meta="nền kem" tone="green" icon="✓" />
          <B2StatCard label="Tool Level 2" value={String(level2Count).padStart(2, '0')} meta={`${migrationRows.length} bridge đã đăng ký`} tone="violet" icon="↗" />
          <B2StatCard label="Live classes" value={String(data.classes?.length || 0)} meta={`${data.students?.length || 0} roster`} tone="cyan" icon="◎" />
        </div>
      </section>

      <section className="b2-lab-section b2-lab-grid">
        <B2Surface>
          <B2SectionHeader eyebrow="FORMS" title="Field system" />
          <div className="b2-lab-form-grid">
            <B2TextField label="Tên website" value={name} onChange={setName} hint="Field chuẩn của Metro Next" />
            <B2TextField label="Địa chỉ website" value={url} onChange={setUrl} />
            <B2Select label="Danh mục" value={category} onChange={setCategory} options={['Công cụ dạy học', 'Từ vựng', 'Trò chơi', 'Kiểm tra']} />
            <B2TextField label="Trạng thái disabled" value="Không thể chỉnh sửa" disabled />
            <div className="b2-lab-form-span"><B2Textarea label="Mô tả ngắn" value={description} onChange={setDescription} rows={3} /></div>
            <div className="b2-lab-form-span"><B2Switch label="Hiển thị trong Hub" description="Giáo viên nhìn thấy website này trong launcher." checked={enabled} onChange={setEnabled} /></div>
          </div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="BUTTONS & STATUS" title="Interaction states" />
          <div className="b2-lab-button-stack">
            <B2Button variant="primary">Primary action</B2Button>
            <B2Button>Secondary action</B2Button>
            <B2Button variant="ghost">Ghost action</B2Button>
            <B2Button variant="danger">Destructive</B2Button>
          </div>
          <div className="b2-lab-badges">
            <B2Badge tone="blue">Nổi bật</B2Badge>
            <B2Badge tone="green">Hoạt động</B2Badge>
            <B2Badge tone="violet">Được chia sẻ</B2Badge>
            <B2Badge tone="amber">★ Ghim</B2Badge>
            <B2Badge>Trung tính</B2Badge>
          </div>
        </B2Surface>
      </section>

      <section className="b2-lab-section">
        <B2SectionHeader eyebrow="DATA BRIDGE" title="Production source diagnostics" description="V2 đọc các services hiện hữu. Badge cho biết nguồn thật đang đến từ cloud, local cache/workspace hay chưa có dữ liệu." />
        <div className="b2-lab-source-grid">
          {sourceRows.map((item) => (
            <article key={item.key}>
              <div><strong>{item.key}</strong><small>{item.source}</small></div>
              <B2Badge tone={dataSourceTone(item.source)}>{dataSourceLabel(item.source)}</B2Badge>
            </article>
          ))}
        </div>
        {data.errors?.length ? <div className="b2-lab-source-errors">{data.errors.map((error, index) => <p key={`${error.source}-${index}`}><strong>{error.source}:</strong> {error.message}</p>)}</div> : <p className="b2-lab-source-ok">✓ Không có lỗi nguồn trong snapshot hiện tại.</p>}
      </section>

      <section className="b2-lab-section">
        <B2SectionHeader eyebrow="TOOL MIGRATION" title="Adapter diagnostics" description="Theo dõi chính xác tool nào mới chỉ bridge runtime và tool nào đã dùng V2 Chrome Adapter." />
        <div className="b2-lab-migration-list">
          {migrationRows.map((item) => (
            <article key={item.slug}>
              <span className={`b2-lab-migration-mark tone-${item.tone || 'blue'}`}>{String(item.label || item.slug).slice(0, 2).toUpperCase()}</span>
              <div><strong>{item.label}</strong><small>{item.slug} · {item.family}</small></div>
              <B2Badge tone={item.level >= 2 ? 'violet' : 'blue'}>LEVEL {item.level || 1}</B2Badge>
              <B2Badge tone={item.tested ? 'green' : 'amber'}>{item.tested ? 'VERIFIED' : 'PREVIEW'}</B2Badge>
            </article>
          ))}
        </div>
      </section>

      <section className="b2-lab-section">
        <B2SectionHeader eyebrow="PERMISSION QA" title="Role matrix" description="Ma trận này chỉ kiểm thử trạng thái UI. Security thật vẫn do permission service hiện tại của Brian quyết định." />
        <div className="b2-lab-permission-grid">
          {Object.values(V2_PREVIEW_ROLES).map((role) => (
            <article key={role.id}>
              <header><span>{role.shortLabel}</span><div><strong>{role.label}</strong><small>{role.description}</small></div></header>
              <div className="b2-lab-permission-targets">
                {PERMISSION_TARGETS.map((target) => {
                  const allowed = canPreviewTarget(role.id, target.id);
                  return <span key={target.id} className={allowed ? 'is-allowed' : 'is-locked'}>{allowed ? '✓' : '×'} {target.label}</span>;
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <B2Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        eyebrow="TTCM · TEACHING TOOL HUB"
        title="Chỉnh sửa website"
        footer={<><B2Button onClick={() => setDrawer(false)}>Hủy</B2Button><B2Button variant="primary" onClick={() => { setDrawer(false); setToast(true); }}>Lưu thay đổi</B2Button></>}
      >
        <div className="b2-lab-drawer-form">
          <B2TextField label="Tên website" value={name} onChange={setName} />
          <B2TextField label="Địa chỉ website" value={url} onChange={setUrl} />
          <div className="b2-lab-drawer-two"><B2Select label="Danh mục" value={category} onChange={setCategory} options={['Công cụ dạy học', 'Từ vựng', 'Trò chơi', 'Kiểm tra']} /><B2TextField label="Biểu tượng" value="↗" onChange={() => {}} /></div>
          <B2Textarea label="Mô tả ngắn" value={description} onChange={setDescription} rows={3} />
          <B2Switch label="Hiển thị trong Hub" description="Tắt để ẩn khỏi giáo viên nhưng vẫn giữ dữ liệu." checked={enabled} onChange={setEnabled} />
        </div>
      </B2Drawer>

      <B2Dialog open={dialog} onClose={() => setDialog(false)} title="Xác nhận thay đổi" description="Dialog V2 dùng cho các hành động cần xác nhận nhưng không nên chiếm toàn màn hình." confirmLabel="Xác nhận" onConfirm={() => { setDialog(false); setToast(true); }} />
      <B2Toast visible={toast} title="Đã lưu thay đổi" message="Toast V2 tự tách khỏi drawer và không làm dịch chuyển layout." onClose={() => setToast(false)} />
    </>
  );
}
