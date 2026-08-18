import React, { useState } from 'react';
import { B2Badge, B2Button, B2CommandBar, B2PageHeader, B2SearchBox, B2SectionHeader, B2StatCard, B2Surface, B2Tabs } from '../components/B2UI.jsx';
import { B2Select, B2Switch, B2TextField, B2Textarea } from '../components/B2Forms.jsx';
import { B2Dialog, B2Drawer, B2Toast } from '../components/B2Overlay.jsx';
import './B2UILab.css';

export default function B2UILab() {
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

  return (
    <>
      <B2PageHeader
        eyebrow="PRIVATE · DESIGN QA"
        title="Brian UI Lab"
        description="Phòng kiểm định component của Metro Next. Component chỉ được dùng rộng rãi sau khi trạng thái, responsive và mật độ hiển thị ổn định tại đây."
        actions={(
          <>
            <B2Button variant="primary" onClick={() => setDrawer(true)}>Mở drawer</B2Button>
            <B2Button onClick={() => setDialog(true)}>Mở dialog</B2Button>
            <B2Button variant="ghost" onClick={() => setToast(true)}>Test toast</B2Button>
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
          <B2StatCard label="Component" value="18" meta="đã có primitive" tone="blue" icon="▦" />
          <B2StatCard label="Surface" value="0" meta="nền kem" tone="green" icon="✓" />
          <B2StatCard label="Drawer" value="520" meta="px tối đa" tone="violet" icon="▥" />
          <B2StatCard label="Input" value="42" meta="px chiều cao" tone="cyan" icon="⌨" />
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
