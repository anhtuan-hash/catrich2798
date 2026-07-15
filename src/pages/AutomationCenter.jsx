import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { diagnoseRuntime } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { downloadText, isLeader, uid } from './v1093/shared.js';
import {
  ACTION_TYPES, AUTOMATION_UPDATED, EVENT_TYPES, TRIGGER_TYPES,
  approveAutomationRun, deleteAutomationRule, emitAutomationEvent,
  installAutomationRunner, loadAutomationState, runAutomationRule, saveAutomationRule,
} from '../utils/automationEngine.js';

const TEMPLATES = [
  {
    id: 'tpl-work-due', name: 'Nhắc công việc sắp đến hạn', description: 'Tạo thông báo khi hệ thống nhận sự kiện công việc sắp đến hạn.',
    trigger_type: 'event', trigger_config: { event: 'work_due_soon' }, action_type: 'notification',
    action_config: { title: 'Công việc sắp đến hạn', message: 'Hãy kiểm tra công việc cần hoàn thành trong 72 giờ tới.', route: 'work-hub' }, requires_approval: false,
  },
  {
    id: 'tpl-resource', name: 'Theo dõi tài liệu được duyệt', description: 'Ghi lại ảnh chụp vận hành khi tài liệu mới được duyệt.',
    trigger_type: 'event', trigger_config: { event: 'resource_approved' }, action_type: 'snapshot',
    action_config: { title: 'Tài liệu mới được duyệt' }, requires_approval: false,
  },
  {
    id: 'tpl-risk', name: 'Tạo bài luyện cho học sinh cần hỗ trợ', description: 'Tạo bản nháp bài luyện khi hệ thống phát hiện học sinh cần hỗ trợ.',
    trigger_type: 'event', trigger_config: { event: 'learner_risk' }, action_type: 'practice_draft',
    action_config: { title: 'Bài luyện thích ứng', message: 'Tạo worksheet 15 câu tập trung vào điểm yếu mới phát hiện.', level: 'B2', item_count: 15 }, requires_approval: true,
  },
  {
    id: 'tpl-daily', name: 'Bản chụp vận hành cuối ngày', description: 'Lưu snapshot mỗi ngày khi ứng dụng đang mở.',
    trigger_type: 'schedule', trigger_config: { frequency: 'daily', time: '17:00' }, action_type: 'snapshot',
    action_config: { title: 'Báo cáo vận hành cuối ngày' }, requires_approval: false,
  },
];

function emptyRule(user) {
  return {
    id: '', owner_id: user?.id || '', name: '', description: '', enabled: true, scope: 'personal',
    trigger_type: 'manual', trigger_config: { frequency: 'daily', time: '08:00', weekday: 1, event: 'resource_approved' },
    action_type: 'notification', action_config: { title: '', message: '', route: 'work-hub', level: 'B2', item_count: 15 },
    requires_approval: true,
  };
}

function dateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function statusLabel(status) {
  return ({ success: 'Thành công', failed: 'Thất bại', pending_approval: 'Chờ duyệt', approved: 'Đã duyệt', running: 'Đang chạy', skipped: 'Bỏ qua' })[status] || status;
}

export default function AutomationCenter({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const leader = isLeader(currentUser);
  const [tab, setTab] = useState('overview');
  const [state, setState] = useState({ rules: [], runs: [], events: [], notifications: [], snapshots: [], mode: 'local' });
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(() => emptyRule(currentUser));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [runtimeReport, setRuntimeReport] = useState(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(async () => {
    setError('');
    try {
      const next = await loadAutomationState(currentUser);
      setState(next);
      setRuntimeReport(await diagnoseRuntime());
    } catch (loadError) {
      setError(loadError.message || String(loadError));
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onUpdate = () => load();
    window.addEventListener(AUTOMATION_UPDATED, onUpdate);
    return () => window.removeEventListener(AUTOMATION_UPDATED, onUpdate);
  }, [load]);
  useEffect(() => installAutomationRunner({ getUser: () => currentUser, getRules: () => stateRef.current.rules }), [currentUser]);

  const selected = state.rules.find((item) => item.id === selectedId) || null;
  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const todayRuns = state.runs.filter((item) => new Date(item.created_at || item.started_at).toDateString() === today);
    const success = todayRuns.filter((item) => item.status === 'success').length;
    return {
      active: state.rules.filter((item) => item.enabled).length,
      today: todayRuns.length,
      successRate: todayRuns.length ? Math.round(success / todayRuns.length * 100) : 100,
      approval: state.runs.filter((item) => item.status === 'pending_approval').length,
    };
  }, [state]);

  const saveRule = async (event) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await saveAutomationRule({ ...draft, scope: leader ? draft.scope : 'personal' }, currentUser);
      setSelectedId(saved.id);
      setDraft(emptyRule(currentUser));
      setNotice('Đã lưu quy tắc tự động hóa.');
      await load();
    } catch (saveError) { setError(saveError.message || String(saveError)); }
    finally { setBusy(false); }
  };

  const editRule = (rule) => { setDraft(JSON.parse(JSON.stringify(rule))); setTab('rules'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleRule = async (rule) => { await saveAutomationRule({ ...rule, enabled: !rule.enabled }, currentUser); await load(); };
  const runRule = async (rule, approved = false) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await runAutomationRule(rule, currentUser, { source: 'manual', summary: 'Chạy trực tiếp từ Automation Center.' }, { approved });
      setNotice(result.pending ? 'Đã đưa lượt chạy vào hàng chờ phê duyệt.' : 'Quy tắc đã chạy thành công.');
      await load();
    } catch (runError) { setError(runError.message || String(runError)); }
    finally { setBusy(false); }
  };

  const approve = async (run) => {
    setBusy(true);
    try { await approveAutomationRun(run, state.rules, currentUser); setNotice('Đã phê duyệt và thực thi hành động.'); await load(); }
    catch (approveError) { setError(approveError.message || String(approveError)); }
    finally { setBusy(false); }
  };

  const useTemplate = (template) => {
    setDraft({ ...emptyRule(currentUser), ...template, id: '', owner_id: currentUser?.id || '', name: template.name });
    setTab('rules');
  };

  const simulate = async (eventType) => {
    await emitAutomationEvent(eventType, { source: 'automation-center', summary: `Sự kiện mô phỏng: ${eventType}` }, currentUser);
    setNotice('Đã phát sự kiện mô phỏng. Các quy tắc phù hợp sẽ được đánh giá.');
  };

  const exportReport = () => downloadText(`automation-center-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), runtime: runtimeReport, ...state }, null, 2), 'application/json');

  const tabs = [
    ['overview', 'Tổng quan'], ['rules', 'Quy tắc'], ['runs', 'Lượt chạy'], ['templates', 'Mẫu tự động hóa'], ['operations', 'Vận hành'],
  ];

  return <section className="v1096-page">
    <header className="v1096-hero">
      <div><span>V10.96 · AUTOMATION & OPERATIONS</span><h1>Trung tâm tự động hóa</h1><p>Kết nối sự kiện, lịch chạy, hành động có phê duyệt và nhật ký vận hành trong một không gian.</p></div>
      <div className="v1096-hero-actions"><button className="secondary" onClick={exportReport}>Xuất báo cáo</button><button className="primary" onClick={() => { setDraft(emptyRule(currentUser)); setTab('rules'); }}>+ Quy tắc mới</button></div>
    </header>

    {error && <div className="v1096-alert error"><b>Không thể hoàn tất thao tác</b><span>{error}</span><button onClick={load}>Thử lại</button></div>}
    {notice && <div className="v1096-alert success">{notice}</div>}

    <section className="v1096-metrics">
      <article><strong>{metrics.active}</strong><span>Quy tắc đang bật</span></article>
      <article><strong>{metrics.today}</strong><span>Lượt chạy hôm nay</span></article>
      <article><strong>{metrics.successRate}%</strong><span>Tỷ lệ thành công</span></article>
      <article><strong>{metrics.approval}</strong><span>Đang chờ duyệt</span></article>
    </section>

    <nav className="v1096-tabs" role="tablist">{tabs.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>

    {tab === 'overview' && <div className="v1096-overview-grid">
      <section className="v1096-panel"><header><div><span>RULES</span><h2>Quy tắc gần đây</h2></div><button onClick={() => setTab('rules')}>Xem tất cả</button></header><div className="v1096-rule-list">{state.rules.slice(0, 6).map((rule) => <article key={rule.id} data-enabled={rule.enabled}><button className="rule-main" onClick={() => editRule(rule)}><b>{rule.name}</b><span>{TRIGGER_TYPES.find((item) => item.value === rule.trigger_type)?.label} → {ACTION_TYPES.find((item) => item.value === rule.action_type)?.label}</span></button><button className="mini" onClick={() => toggleRule(rule)}>{rule.enabled ? 'Tắt' : 'Bật'}</button><button className="mini primary" disabled={busy} onClick={() => runRule(rule)}>Chạy</button></article>)}</div>{!state.rules.length && <div className="v1096-empty"><strong>Chưa có quy tắc</strong><span>Dùng mẫu hoặc tạo quy tắc đầu tiên.</span></div>}</section>
      <section className="v1096-panel"><header><div><span>RUNS</span><h2>Hoạt động mới nhất</h2></div><button onClick={() => setTab('runs')}>Nhật ký</button></header><div className="v1096-run-list">{state.runs.slice(0, 8).map((run) => <article key={run.id} data-status={run.status}><span className="dot"/><div><b>{run.rule_name}</b><span>{dateTime(run.created_at || run.started_at)}</span></div><em>{statusLabel(run.status)}</em></article>)}</div>{!state.runs.length && <div className="v1096-empty"><strong>Chưa có lượt chạy</strong><span>Nhật ký sẽ xuất hiện sau khi thực thi quy tắc.</span></div>}</section>
    </div>}

    {tab === 'rules' && <div className="v1096-rules-layout">
      <form className="v1096-panel v1096-builder" onSubmit={saveRule}>
        <header><div><span>BUILDER</span><h2>{draft.id ? 'Chỉnh sửa quy tắc' : 'Tạo quy tắc mới'}</h2></div>{draft.id && <button type="button" onClick={() => setDraft(emptyRule(currentUser))}>Tạo mới</button>}</header>
        <label>Tên quy tắc<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ví dụ: Nhắc công việc trước hạn" /></label>
        <label>Mô tả<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Mục đích và phạm vi áp dụng" /></label>
        <div className="v1096-form-grid"><label>Kích hoạt<select value={draft.trigger_type} onChange={(e) => setDraft({ ...draft, trigger_type: e.target.value })}>{TRIGGER_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Hành động<select value={draft.action_type} onChange={(e) => setDraft({ ...draft, action_type: e.target.value })}>{ACTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
        {draft.trigger_type === 'schedule' && <div className="v1096-form-grid"><label>Tần suất<select value={draft.trigger_config.frequency} onChange={(e) => setDraft({ ...draft, trigger_config: { ...draft.trigger_config, frequency: e.target.value } })}><option value="hourly">Mỗi giờ</option><option value="daily">Hằng ngày</option><option value="weekly">Hằng tuần</option></select></label><label>Giờ chạy<input type="time" value={draft.trigger_config.time || '08:00'} onChange={(e) => setDraft({ ...draft, trigger_config: { ...draft.trigger_config, time: e.target.value } })} /></label></div>}
        {draft.trigger_type === 'event' && <label>Sự kiện<select value={draft.trigger_config.event} onChange={(e) => setDraft({ ...draft, trigger_config: { ...draft.trigger_config, event: e.target.value } })}>{EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        <div className="v1096-form-grid"><label>Tiêu đề hành động<input value={draft.action_config.title || ''} onChange={(e) => setDraft({ ...draft, action_config: { ...draft.action_config, title: e.target.value } })} /></label><label>Trang liên quan<input value={draft.action_config.route || ''} onChange={(e) => setDraft({ ...draft, action_config: { ...draft.action_config, route: e.target.value } })} placeholder="work-hub" /></label></div>
        <label>Nội dung / hướng dẫn<textarea value={draft.action_config.message || ''} onChange={(e) => setDraft({ ...draft, action_config: { ...draft.action_config, message: e.target.value } })} /></label>
        <div className="v1096-options"><label><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}/> Bật quy tắc</label><label><input type="checkbox" checked={draft.requires_approval} onChange={(e) => setDraft({ ...draft, requires_approval: e.target.checked })}/> Yêu cầu xác nhận trước hành động</label>{leader && <label>Phạm vi <select value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })}><option value="personal">Cá nhân</option><option value="department">Toàn tổ</option></select></label>}</div>
        <button className="primary large" type="submit" disabled={busy || !draft.name.trim()}>{busy ? 'Đang lưu…' : 'Lưu quy tắc'}</button>
      </form>
      <section className="v1096-panel"><header><div><span>REGISTRY</span><h2>{state.rules.length} quy tắc</h2></div></header><div className="v1096-rule-cards">{state.rules.map((rule) => <article key={rule.id} className={selected?.id === rule.id ? 'selected' : ''} data-enabled={rule.enabled}><div><span className="badge">{rule.scope === 'department' ? 'Tổ chuyên môn' : 'Cá nhân'}</span><h3>{rule.name}</h3><p>{rule.description || 'Không có mô tả.'}</p><small>{TRIGGER_TYPES.find((item) => item.value === rule.trigger_type)?.label} · {ACTION_TYPES.find((item) => item.value === rule.action_type)?.label}</small></div><footer><button onClick={() => editRule(rule)}>Sửa</button><button onClick={() => toggleRule(rule)}>{rule.enabled ? 'Tắt' : 'Bật'}</button><button onClick={() => runRule(rule)} disabled={busy}>Chạy</button><button className="danger" onClick={async () => { await deleteAutomationRule(rule.id, currentUser); await load(); }}>Xóa</button></footer></article>)}</div></section>
    </div>}

    {tab === 'runs' && <section className="v1096-panel"><header><div><span>AUDIT LOG</span><h2>Nhật ký thực thi</h2></div><button onClick={load}>Làm mới</button></header><div className="v1096-run-table"><header><span>Quy tắc</span><span>Trạng thái</span><span>Kích hoạt</span><span>Thời gian</span><span>Hành động</span></header>{state.runs.map((run) => <article key={run.id}><span><b>{run.rule_name}</b>{run.error_message && <small>{run.error_message}</small>}</span><span className={`status ${run.status}`}>{statusLabel(run.status)}</span><span>{run.trigger_type}</span><span>{dateTime(run.created_at || run.started_at)}</span><span>{run.status === 'pending_approval' && leader ? <button className="primary" disabled={busy} onClick={() => approve(run)}>Phê duyệt & chạy</button> : '—'}</span></article>)}</div>{!state.runs.length && <div className="v1096-empty"><strong>Chưa có dữ liệu</strong><span>Chạy một quy tắc để bắt đầu ghi nhật ký.</span></div>}</section>}

    {tab === 'templates' && <div className="v1096-template-grid">{TEMPLATES.map((template) => <article key={template.id}><span>{template.trigger_type === 'event' ? 'EVENT' : 'SCHEDULE'}</span><h2>{template.name}</h2><p>{template.description}</p><dl><div><dt>Kích hoạt</dt><dd>{TRIGGER_TYPES.find((item) => item.value === template.trigger_type)?.label}</dd></div><div><dt>Hành động</dt><dd>{ACTION_TYPES.find((item) => item.value === template.action_type)?.label}</dd></div></dl><button className="primary" onClick={() => useTemplate(template)}>Dùng mẫu này</button></article>)}</div>}

    {tab === 'operations' && <div className="v1096-ops-grid">
      <section className="v1096-panel"><header><div><span>RUNTIME</span><h2>Trạng thái nền tảng</h2></div><button onClick={load}>Kiểm tra lại</button></header><div className="v1096-ops-list"><article><b>Runtime Core</b><span>{runtimeReport?.runtimeVersion || runtime.phase}</span></article><article><b>Supabase</b><span>{runtimeReport?.configured ? (runtimeReport?.ready ? 'Sẵn sàng' : 'Đang kết nối') : 'Chế độ cục bộ'}</span></article><article><b>Vai trò</b><span>{runtimeReport?.role || runtime.role}</span></article><article><b>Realtime channels</b><span>{runtimeReport?.realtimeChannels ?? 0}</span></article><article><b>Kết nối mạng</b><span>{navigator.onLine ? 'Online' : 'Offline'}</span></article><article><b>Kho dữ liệu Automation</b><span>{state.mode === 'cloud' ? 'Supabase + local cache' : 'Local fallback'}</span></article></div></section>
      <section className="v1096-panel"><header><div><span>EVENT LAB</span><h2>Kiểm tra luồng sự kiện</h2></div></header><p className="v1096-note">Phát sự kiện mô phỏng để kiểm tra các quy tắc mà không thay đổi dữ liệu nghiệp vụ thật.</p><div className="v1096-event-grid">{EVENT_TYPES.map((event) => <button key={event.value} onClick={() => simulate(event.value)}><b>{event.label}</b><span>{event.value}</span></button>)}</div></section>
      <section className="v1096-panel"><header><div><span>GOVERNANCE</span><h2>Nguyên tắc an toàn</h2></div></header><ul className="v1096-checklist"><li>Hành động có tác động được đặt mặc định ở chế độ chờ phê duyệt.</li><li>Lịch tự động chỉ chạy khi website/PWA đang mở; không tuyên bố chạy nền 24/7.</li><li>Nhật ký không lưu API key hoặc access token.</li><li>Giáo viên chỉ quản lý quy tắc cá nhân; Admin/TTCM có thể tạo quy tắc toàn tổ.</li><li>Mọi lượt chạy đều có thời gian, trạng thái và lỗi để truy vết.</li></ul></section>
      <section className="v1096-panel"><header><div><span>SNAPSHOTS</span><h2>Ảnh chụp vận hành</h2></div></header><div className="v1096-snapshot-list">{state.snapshots.slice(0, 12).map((item) => <article key={item.id}><b>{item.title}</b><span>{dateTime(item.created_at)}</span><small>{item.location || 'Không có route'}</small></article>)}</div>{!state.snapshots.length && <div className="v1096-empty"><strong>Chưa có snapshot</strong><span>Dùng mẫu “Bản chụp vận hành cuối ngày”.</span></div>}</section>
    </div>}
  </section>;
}
