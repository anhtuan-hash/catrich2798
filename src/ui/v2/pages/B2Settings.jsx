import React, { useState } from 'react';
import { B2Badge, B2PageHeader, B2SectionHeader, B2Surface } from '../components/B2UI.jsx';
import { B2Select, B2Switch } from '../components/B2Forms.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2Secondary.css';

export default function B2Settings() {
  const { resources, sources } = useBrianV2Data();
  const [compact, setCompact] = useState(true);
  const [motion, setMotion] = useState(true);
  const [language, setLanguage] = useState('Tiếng Việt');
  const driveConnected = Boolean(resources?.drive?.connected);

  return <>
    <B2PageHeader
      eyebrow="SYSTEM · SETTINGS"
      title="Cài đặt"
      description="Các điều khiển giao diện dưới đây chỉ áp dụng cho phiên Shadow preview. Trạng thái kết nối dữ liệu được đọc từ Data Bridge hiện tại, không dùng badge Connected cố định."
      aside={<B2Badge tone="blue">V2 PREVIEW</B2Badge>}
    />
    <div className="b2-settings-grid">
      <B2Surface>
        <B2SectionHeader eyebrow="APPEARANCE" title="Giao diện preview" />
        <div className="b2-setting-stack">
          <B2Select label="Ngôn ngữ hiển thị thử nghiệm" value={language} onChange={setLanguage} options={['Tiếng Việt', 'English']} />
          <B2Switch label="Mật độ compact" description="Điều khiển thử nghiệm trong phiên V2; chưa ghi vào production preferences." checked={compact} onChange={setCompact} />
          <B2Switch label="Chuyển động giao diện" description="Trình duyệt vẫn được ưu tiên khi bật prefers-reduced-motion." checked={motion} onChange={setMotion} />
        </div>
      </B2Surface>

      <B2Surface>
        <B2SectionHeader eyebrow="DATA" title="Nguồn & đồng bộ" />
        <div className="b2-setting-stack">
          <div className="b2-setting-row"><span><strong>Authentication</strong><small>Nguồn phiên đăng nhập hiện tại</small></span><B2Badge tone={dataSourceTone(sources?.auth)}>{dataSourceLabel(sources?.auth)}</B2Badge></div>
          <div className="b2-setting-row"><span><strong>Resource Library</strong><small>Nguồn học liệu hiện tại</small></span><B2Badge tone={dataSourceTone(sources?.resources)}>{dataSourceLabel(sources?.resources)}</B2Badge></div>
          <div className="b2-setting-row"><span><strong>Google Drive</strong><small>Trạng thái do Resource Store ghi nhận</small></span><B2Badge tone={driveConnected ? 'green' : 'neutral'}>{driveConnected ? 'CONNECTED' : 'NOT REPORTED'}</B2Badge></div>
        </div>
      </B2Surface>

      <B2Surface>
        <B2SectionHeader eyebrow="ACCESSIBILITY" title="Khả năng tiếp cận" />
        <div className="b2-setting-stack">
          <div className="b2-setting-row"><span><strong>Keyboard navigation</strong><small>Skip link, focus-visible và SPA focus restoration</small></span><B2Badge tone="green">V2 ENABLED</B2Badge></div>
          <div className="b2-setting-row"><span><strong>Reduced motion</strong><small>Tự động theo thiết lập hệ điều hành/trình duyệt</small></span><B2Badge tone="green">SUPPORTED</B2Badge></div>
        </div>
      </B2Surface>

      <B2Surface>
        <B2SectionHeader eyebrow="EXPERIMENTAL" title="Brian Metro Next" />
        <div className="b2-setting-stack"><div className="b2-setting-row"><span><strong>Shadow UI</strong><small>Chỉ có trong branch preview</small></span><B2Badge tone="violet">PRIVATE</B2Badge></div><p className="b2-setting-note">Production V1 không bị thay đổi cho đến khi hoàn tất QA và release gate.</p></div>
      </B2Surface>
    </div>
  </>;
}
