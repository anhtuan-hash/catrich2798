import React, { useEffect, useState } from 'react';
import { DEFAULT_AI_GOVERNANCE, getAiGovernance, saveAiGovernance } from '../utils/aiGovernance.js';

export default function AIGovernanceCenter({ language = 'vi', currentUser }) {
  const vi = language === 'vi';
  const [config, setConfig] = useState(getAiGovernance);
  const [saved, setSaved] = useState(false);
  const isAdmin = ['admin'].includes(String(currentUser?.role || '').toLowerCase()) || currentUser?.isAdmin === true;
  useEffect(() => { setConfig(getAiGovernance()); }, []);
  if (!isAdmin) return <main className="bes-standard-page"><section className="ai-governance-denied"><h1>{vi ? 'Không có quyền truy cập' : 'Access denied'}</h1><p>{vi ? 'Chỉ Admin được cấu hình quản trị AI.' : 'Only Admin can configure AI governance.'}</p></section></main>;
  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }));
  const commit = () => { setConfig(saveAiGovernance(config)); setSaved(true); window.setTimeout(() => setSaved(false), 1600); };
  return <main className="bes-standard-page ai-governance-page"><header className="ai-governance-hero"><span>AI Governance</span><h1>{vi ? 'Trung tâm quản trị Brian AI' : 'Brian AI Governance Center'}</h1><p>{vi ? 'Kiểm soát hành động liên ứng dụng, xác nhận người dùng và giới hạn sử dụng.' : 'Control cross-app actions, confirmations and usage limits.'}</p></header><section className="ai-governance-grid">
    <article><h2>{vi ? 'An toàn hành động' : 'Action safety'}</h2>
      <label><span><b>{vi ? 'Luôn yêu cầu xác nhận' : 'Always require confirmation'}</b><small>{vi ? 'Hiện bước xác nhận trước khi thay đổi ứng dụng.' : 'Show confirmation before changing app data.'}</small></span><input type="checkbox" checked={config.requireConfirmation} onChange={(e) => update('requireConfirmation', e.target.checked)}/></label>
      <label><span><b>{vi ? 'Cho phép chuyển liên ứng dụng' : 'Allow cross-app transfer'}</b><small>{vi ? 'Cho phép Brian AI gửi nội dung tới Worksheet, Exam, WordGraph…' : 'Allow Brian AI to transfer content to other apps.'}</small></span><input type="checkbox" checked={config.allowCrossAppTransfer} onChange={(e) => update('allowCrossAppTransfer', e.target.checked)}/></label>
      <label><span><b>{vi ? 'Tự mở ứng dụng đích' : 'Auto-open target app'}</b><small>{vi ? 'Chỉ thực hiện sau khi người dùng xác nhận.' : 'Only after user confirmation.'}</small></span><input type="checkbox" checked={config.allowAutoOpenTarget} onChange={(e) => update('allowAutoOpenTarget', e.target.checked)}/></label>
      <label className="locked"><span><b>{vi ? 'Hành động phá hủy dữ liệu' : 'Destructive actions'}</b><small>{vi ? 'Luôn bị khóa trong phiên bản này.' : 'Always locked in this release.'}</small></span><input type="checkbox" checked={false} disabled/></label>
    </article>
    <article><h2>{vi ? 'Giới hạn và chế độ' : 'Limits and mode'}</h2>
      <div className="ai-governance-field"><label>{vi ? 'Số hành động tối đa trong một kế hoạch' : 'Maximum actions per plan'}</label><input type="number" min="2" max="6" value={config.maxActionsPerPlan} onChange={(e) => update('maxActionsPerPlan', Math.max(2, Math.min(6, Number(e.target.value) || 4)))}/></div>
      <div className="ai-governance-field"><label>{vi ? 'Giới hạn mềm mỗi ngày' : 'Daily soft limit'}</label><input type="number" min="10" max="1000" value={config.dailySoftLimit} onChange={(e) => update('dailySoftLimit', Math.max(10, Math.min(1000, Number(e.target.value) || 120)))}/></div>
      <div className="ai-governance-field"><label>{vi ? 'Chế độ ưu tiên' : 'Preferred mode'}</label><select value={config.preferredMode} onChange={(e) => update('preferredMode', e.target.value)}><option value="economy">{vi ? 'Tiết kiệm' : 'Economy'}</option><option value="balanced">{vi ? 'Cân bằng' : 'Balanced'}</option><option value="quality">{vi ? 'Chất lượng cao' : 'High quality'}</option></select></div>
    </article>
    <article className="ai-governance-audit"><h2>{vi ? 'Nguyên tắc bắt buộc' : 'Mandatory rules'}</h2><ul><li>{vi ? 'Không tự xóa dữ liệu.' : 'Never delete data automatically.'}</li><li>{vi ? 'Không tự gửi email hoặc thông báo.' : 'Never send email or notifications automatically.'}</li><li>{vi ? 'Không tự duyệt hồ sơ, thay đổi quyền hoặc xuất bản đề.' : 'Never approve records, change permissions or publish exams automatically.'}</li><li>{vi ? 'Mọi thao tác liên ứng dụng đều có dấu vết sự kiện.' : 'Every cross-app action emits an audit event.'}</li></ul></article>
  </section><div className="ai-governance-actions"><button type="button" onClick={() => setConfig({ ...DEFAULT_AI_GOVERNANCE })}>{vi ? 'Khôi phục mặc định' : 'Restore defaults'}</button><button type="button" className="primary" onClick={commit}>{saved ? (vi ? 'Đã lưu' : 'Saved') : (vi ? 'Lưu cấu hình' : 'Save settings')}</button></div></main>;
}
