import React, { useEffect, useMemo, useState } from 'react';
import { callAI } from '../utils/gemini.js';
import { supabase } from '../utils/supabase.js';

const FALLBACK_SETTINGS = {
  enabled: true,
  model: 'openrouter/free',
  perMinuteLimit: 12,
  dailyRequestLimit: 160,
  dailyTokenBudget: 180000,
  maxOutputTokens: 2800,
  profiles: { chat: 2400, worksheet: 2800, document: 2600, administration: 1800, 'teaching-content': 3200, default: 2200 },
};

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

async function token() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn.');
  return data.session.access_token;
}

async function gateway(method = 'GET', body) {
  const accessToken = await token();
  const response = await fetch('/api/ai-governance', {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    const error = new Error(data.error || `Không thể tải AI Governance (${response.status}).`);
    error.code = data.code || '';
    throw error;
  }
  return data;
}

export default function AIGovernanceCenter({ language = 'vi', currentUser = null }) {
  const vi = language === 'vi';
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setBusy(true);
    try {
      const next = await gateway('GET');
      setData(next);
      setSettings({ ...FALLBACK_SETTINGS, ...(next.settings || {}) });
      setMessage('');
    } catch (error) {
      setMessage(`⚠ ${error.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const next = await gateway('PUT', { settings });
      setData(next);
      setSettings({ ...FALLBACK_SETTINGS, ...(next.settings || {}) });
      setMessage(vi ? '✓ Đã lưu cấu hình OpenRouter dùng chung trên máy chủ.' : '✓ Shared OpenRouter settings saved on the server.');
    } catch (error) {
      setMessage(`⚠ ${error.message || error}`);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const text = await callAI({ prompt: 'Reply exactly: Brian OpenRouter Gateway OK', temperature: 0, maxOutputTokens: 80, governanceProfile: 'administration', loadingLabel: 'Đang kiểm tra OpenRouter Gateway…' });
      setMessage(`✓ ${text}`);
      await load();
    } catch (error) {
      setMessage(`⚠ ${error.message || error}`);
      setBusy(false);
    }
  };

  const totals = data?.totals || {};
  const audits = useMemo(() => Array.isArray(data?.audit) ? data.audit : [], [data?.audit]);

  if (currentUser?.role !== 'admin') {
    return <div className="page narrow"><section className="metro-panel empty-state"><h1>{vi ? 'Chỉ Admin được truy cập' : 'Admin access only'}</h1><p>{vi ? 'Model, hạn mức và nhật ký AI được quản lý tập trung trên máy chủ.' : 'Model, quotas and audit logs are managed centrally on the server.'}</p></section></div>;
  }

  return <div className="ai-governance-page">
    <section className="ai-gov-hero">
      <div className="ai-gov-hero-copy">
        <span className="ai-gov-eyebrow">OPENROUTER ONLY · SERVER GATEWAY</span>
        <h1>{vi ? 'Trung tâm quản trị Brian AI' : 'Brian AI Governance Center'}</h1>
        <p>{vi ? 'Một API key trên Vercel, một gateway cho toàn website, quota và nhật ký được kiểm tra trên server.' : 'One Vercel API key, one gateway for the whole website, with server-side quotas and audit.'}</p>
        <div className="ai-gov-hero-actions">
          <button type="button" className="primary" disabled={busy} onClick={save}>{busy ? (vi ? 'Đang xử lý…' : 'Working…') : (vi ? 'Lưu cấu hình dùng chung' : 'Save shared settings')}</button>
          <button type="button" className="secondary" disabled={busy} onClick={test}>{vi ? 'Kiểm tra Gateway' : 'Test gateway'}</button>
          <button type="button" className="secondary" disabled={busy} onClick={load}>{vi ? 'Làm mới' : 'Refresh'}</button>
        </div>
        {message ? <div className="ai-gov-empty">{message}</div> : null}
      </div>
      <div className="ai-gov-orbit" aria-hidden="true"><span>OR</span><i/><i/><i/></div>
    </section>

    <section className="ai-gov-stats">
      <article><small>Provider</small><strong>OpenRouter</strong><p>{data?.configured ? (vi ? 'API key đã có trên Vercel' : 'Vercel key configured') : (vi ? 'Thiếu OPENROUTER_API_KEY' : 'OPENROUTER_API_KEY missing')}</p></article>
      <article><small>{vi ? 'Yêu cầu hôm nay' : 'Requests today'}</small><strong>{number(totals.requests)}<em>/ {number(settings.dailyRequestLimit)}</em></strong></article>
      <article><small>{vi ? 'Token hôm nay' : 'Tokens today'}</small><strong>{number((totals.inputTokens || 0) + (totals.outputTokens || 0))}<em>/ {number(settings.dailyTokenBudget)}</em></strong></article>
      <article><small>{vi ? 'Thành công / lỗi' : 'Success / errors'}</small><strong>{number(totals.successes)}<em>/ {number(totals.errors)}</em></strong></article>
    </section>

    <div className="ai-gov-layout">
      <section className="ai-gov-card ai-gov-controls">
        <header><div><span>01</span><div><h2>{vi ? 'Cấu hình OpenRouter dùng chung' : 'Shared OpenRouter configuration'}</h2><p>{vi ? 'Giáo viên không thể nhập key, đổi provider hoặc vượt giới hạn này.' : 'Teachers cannot enter keys, change providers, or bypass these limits.'}</p></div></div></header>
        <div className="ai-gov-switch-grid">
          <label><div><strong>{vi ? 'Bật Brian AI' : 'Enable Brian AI'}</strong><small>{vi ? 'Tắt khẩn cấp cho toàn website.' : 'Emergency stop for the whole website.'}</small></div><input type="checkbox" checked={settings.enabled !== false} onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}/><span/></label>
        </div>
        <div className="ai-gov-number-grid">
          <label><span>OpenRouter model</span><input value={settings.model || ''} onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))} placeholder="openrouter/free" /></label>
          <label><span>{vi ? 'Yêu cầu/phút/người' : 'Requests/minute/user'}</span><input type="number" min="1" max="120" value={settings.perMinuteLimit} onChange={(event) => setSettings((current) => ({ ...current, perMinuteLimit: event.target.value }))}/></label>
          <label><span>{vi ? 'Yêu cầu/ngày/người' : 'Requests/day/user'}</span><input type="number" min="1" max="10000" value={settings.dailyRequestLimit} onChange={(event) => setSettings((current) => ({ ...current, dailyRequestLimit: event.target.value }))}/></label>
          <label><span>{vi ? 'Token/ngày/người' : 'Tokens/day/user'}</span><input type="number" min="1000" max="100000000" step="1000" value={settings.dailyTokenBudget} onChange={(event) => setSettings((current) => ({ ...current, dailyTokenBudget: event.target.value }))}/></label>
          <label><span>{vi ? 'Output tối đa/yêu cầu' : 'Max output/request'}</span><input type="number" min="128" max="8192" step="128" value={settings.maxOutputTokens} onChange={(event) => setSettings((current) => ({ ...current, maxOutputTokens: event.target.value }))}/></label>
        </div>
      </section>

      <section className="ai-gov-card ai-gov-profiles">
        <header><div><span>02</span><div><h2>{vi ? 'Giới hạn theo loại tác vụ' : 'Task profile limits'}</h2><p>{vi ? 'Server luôn lấy mức thấp hơn giữa yêu cầu của app và mức Admin đặt.' : 'The server always applies the lower of app request and Admin limit.'}</p></div></div></header>
        <div className="ai-gov-profile-list">
          {Object.entries(settings.profiles || {}).map(([id, value]) => <label key={id}><div><strong>{id}</strong><small>OpenRouter</small></div><input type="number" min="128" max="8192" step="128" value={typeof value === 'object' ? value.maxOutputTokens : value} onChange={(event) => setSettings((current) => ({ ...current, profiles: { ...current.profiles, [id]: event.target.value } }))}/><span>tokens</span></label>)}
        </div>
      </section>
    </div>

    <section className="ai-gov-card ai-gov-history">
      <header><div><span>03</span><div><h2>{vi ? 'Sử dụng theo tài khoản hôm nay' : 'Usage by account today'}</h2><p>{vi ? 'Dữ liệu thật từ Supabase, không còn bộ đếm localStorage.' : 'Real Supabase data; localStorage counters are no longer used.'}</p></div></div></header>
      <div className="ai-gov-table-wrap"><table><thead><tr><th>User ID</th><th>Requests</th><th>Success</th><th>Errors</th><th>Input</th><th>Output</th></tr></thead><tbody>{(data?.users || []).map((row) => <tr key={`${row.day}-${row.user_id}`}><td>{String(row.user_id || '').slice(0, 12)}…</td><td>{number(row.requests)}</td><td>{number(row.successes)}</td><td>{number(row.errors)}</td><td>{number(row.input_tokens)}</td><td>{number(row.output_tokens)}</td></tr>)}{!(data?.users || []).length ? <tr><td colSpan="6">{vi ? 'Chưa có dữ liệu hoặc migration chưa được chạy.' : 'No data or migration not installed.'}</td></tr> : null}</tbody></table></div>
    </section>

    <section className="ai-gov-card ai-gov-audit">
      <header><div><span>04</span><div><h2>{vi ? 'Nhật ký server AI' : 'Server AI audit'}</h2><p>{vi ? 'Mỗi yêu cầu ghi actor, model, token, trạng thái và request ID.' : 'Each request records actor, model, tokens, status, and request ID.'}</p></div></div></header>
      <div className="ai-gov-audit-list">{audits.map((item) => <article key={item.id} data-status={item.status}><span>{item.status === 'ok' ? 'AI' : '!'}</span><div><strong>{item.action}</strong><p>{item.details?.model || 'OpenRouter'} · {item.request_id || '—'}</p><small>{new Date(item.created_at).toLocaleString(vi ? 'vi-VN' : 'en-US')} · {item.actor_role}</small></div><b>{item.status}</b></article>)}{!audits.length ? <p className="ai-gov-empty">{vi ? 'Chưa có nhật ký AI trên server.' : 'No server AI audit yet.'}</p> : null}</div>
    </section>
  </div>;
}
