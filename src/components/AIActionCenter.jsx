import React, { useEffect, useMemo, useState } from 'react';
import { buildSafeActionPlan, getAiGovernance } from '../utils/aiGovernance.js';

function targetHash(target) {
  if (target === 'library') return '#/library';
  return `#/tool/${target}`;
}

export default function AIActionCenter({ language = 'vi' }) {
  const [request, setRequest] = useState(null);
  const [plan, setPlan] = useState(null);
  const [running, setRunning] = useState('');
  const [notice, setNotice] = useState('');
  const vi = language === 'vi';

  useEffect(() => {
    const open = (event) => {
      const detail = event.detail || {};
      const next = buildSafeActionPlan({ text: detail.text, route: detail.route, toolSlug: detail.toolSlug, language });
      setRequest(detail); setPlan(next); setNotice(''); setRunning('');
    };
    window.addEventListener('bes-ai-action-plan-open', open);
    return () => window.removeEventListener('bes-ai-action-plan-open', open);
  }, [language]);

  useEffect(() => {
    if (!plan) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') { setPlan(null); setRequest(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plan]);

  const governance = useMemo(() => getAiGovernance(), [plan]);
  if (!plan) return null;

  const execute = async (action) => {
    if (action.kind === 'transfer' && !governance.allowCrossAppTransfer) {
      setNotice(vi ? 'Admin đã tắt chuyển nội dung liên ứng dụng.' : 'Cross-app transfer is disabled by Admin.'); return;
    }
    if (governance.requireConfirmation && !window.confirm(vi ? `Thực hiện: ${action.title}?` : `Run: ${action.title}?`)) return;
    setRunning(action.id); setNotice('');
    try {
      if (action.kind === 'copy') {
        await navigator.clipboard.writeText(plan.source);
      } else if (action.kind === 'apply') {
        const detail = { text: plan.source, route: plan.route, toolSlug: plan.toolSlug, handled: false, markHandled() { this.handled = true; } };
        window.dispatchEvent(new CustomEvent('bes-ai-use-result', { detail }));
        if (!detail.handled) await navigator.clipboard.writeText(plan.source);
      } else if (action.kind === 'transfer') {
        window.dispatchEvent(new CustomEvent('bes-content-transfer-create', { detail: {
          type: 'ai-action-result', title: vi ? 'Kết quả từ Brian AI' : 'Brian AI result', sourceApp: 'brian-ai', sourceTitle: 'Brian AI', targetApp: action.target, content: plan.source,
          metadata: { actionPlanId: plan.id, route: plan.route, toolSlug: plan.toolSlug },
        } }));
        if (governance.allowAutoOpenTarget) window.location.hash = targetHash(action.target);
      }
      setNotice(vi ? 'Đã thực hiện hành động an toàn.' : 'Safe action completed.');
      window.dispatchEvent(new CustomEvent('bes-ai-action-completed', { detail: { planId: plan.id, actionId: action.id, at: Date.now() } }));
    } catch (error) {
      setNotice(error?.message || (vi ? 'Không thể thực hiện hành động.' : 'Unable to execute the action.'));
    } finally { setRunning(''); }
  };

  return (
    <div className="ai-action-center-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlan(null); }}>
      <section className="ai-action-center" role="dialog" aria-modal="true" aria-label={vi ? 'Kế hoạch hành động AI' : 'AI action plan'}>
        <header><div><span>✦</span><div><strong>{vi ? 'Kế hoạch hành động có kiểm soát' : 'Controlled AI action plan'}</strong><small>{vi ? 'Brian AI chỉ chuẩn bị thao tác an toàn; mọi thay đổi đều cần xác nhận.' : 'Brian AI only prepares safe actions; changes require confirmation.'}</small></div></div><button type="button" onClick={() => setPlan(null)}>×</button></header>
        <div className="ai-action-source"><b>{vi ? 'Nội dung nguồn' : 'Source content'}</b><p>{plan.source.slice(0, 900)}</p></div>
        <div className="ai-action-list">
          {plan.actions.map((action, index) => <article key={action.id}><span>{index + 1}</span><div><strong>{action.title}</strong><p>{action.description}</p></div><button type="button" disabled={Boolean(running)} onClick={() => execute(action)}>{running === action.id ? (vi ? 'Đang làm…' : 'Working…') : (vi ? 'Thực hiện' : 'Run')}</button></article>)}
        </div>
        <footer><span>🛡 {vi ? 'Không có quyền xóa, gửi email, duyệt hồ sơ hoặc thay đổi quyền.' : 'No delete, email, approval or permission-changing actions.'}</span><button type="button" onClick={() => setPlan(null)}>{vi ? 'Đóng' : 'Close'}</button></footer>
        {notice && <div className="ai-action-notice">{notice}</div>}
      </section>
    </div>
  );
}
