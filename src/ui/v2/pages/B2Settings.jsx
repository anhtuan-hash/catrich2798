import React,{useState} from 'react';
import { B2Badge,B2Button,B2PageHeader,B2SectionHeader,B2Surface } from '../components/B2UI.jsx';
import { B2Select,B2Switch } from '../components/B2Forms.jsx';
import './B2Secondary.css';

export default function B2Settings(){
 const [compact,setCompact]=useState(true); const [motion,setMotion]=useState(true); const [autosave,setAutosave]=useState(true); const [language,setLanguage]=useState('Tiếng Việt');
 return <><B2PageHeader eyebrow="SYSTEM · SETTINGS" title="Cài đặt" description="Settings V2 được chia theo nhóm hành vi thật, không gom mọi tùy chọn vào một trang dài." aside={<B2Badge tone="blue">V2 Preferences</B2Badge>} />
 <div className="b2-settings-grid">
  <B2Surface><B2SectionHeader eyebrow="APPEARANCE" title="Giao diện"/><div className="b2-setting-stack"><B2Select label="Ngôn ngữ" value={language} onChange={setLanguage} options={['Tiếng Việt','English']}/><B2Switch label="Mật độ compact" description="Giảm khoảng trắng ở bảng, form và drawer." checked={compact} onChange={setCompact}/><B2Switch label="Chuyển động giao diện" description="Tắt khi cần phản hồi tức thời hơn." checked={motion} onChange={setMotion}/></div></B2Surface>
  <B2Surface><B2SectionHeader eyebrow="DATA" title="Lưu & đồng bộ"/><div className="b2-setting-stack"><B2Switch label="Autosave" description="Tự lưu thay đổi ở các workspace hỗ trợ." checked={autosave} onChange={setAutosave}/><div className="b2-setting-row"><span><strong>Supabase</strong><small>Kết nối dữ liệu chính</small></span><B2Badge tone="green">Connected</B2Badge></div><div className="b2-setting-row"><span><strong>Google Drive</strong><small>Kho học liệu dùng chung</small></span><B2Badge tone="green">Connected</B2Badge></div></div></B2Surface>
  <B2Surface><B2SectionHeader eyebrow="ACCESSIBILITY" title="Khả năng tiếp cận"/><div className="b2-setting-stack"><div className="b2-setting-row"><span><strong>Cỡ chữ</strong><small>100% mặc định</small></span><B2Button variant="ghost">Điều chỉnh</B2Button></div><div className="b2-setting-row"><span><strong>Keyboard navigation</strong><small>Focus order và shortcut</small></span><B2Badge tone="green">Bật</B2Badge></div></div></B2Surface>
  <B2Surface><B2SectionHeader eyebrow="EXPERIMENTAL" title="Brian Metro Next"/><div className="b2-setting-stack"><div className="b2-setting-row"><span><strong>Shadow UI</strong><small>Chỉ có trong branch preview</small></span><B2Badge tone="violet">PRIVATE</B2Badge></div><p className="b2-setting-note">Production V1 không bị thay đổi cho đến khi hoàn tất QA và release gate.</p></div></B2Surface>
 </div></>;
}
