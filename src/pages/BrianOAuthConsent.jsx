import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase.js';
import './BrianOAuthConsent.css';

const RESUME_KEY = 'brian-oauth-authorization-id';

function scopeLabel(scope) {
  const labels = {
    openid: 'Xác nhận danh tính tài khoản Brian',
    email: 'Đọc địa chỉ email tài khoản Brian',
    profile: 'Đọc thông tin hồ sơ cơ bản',
  };
  return labels[scope] || scope;
}

export default function BrianOAuthConsent({ currentUser }) {
  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id') || '';
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(Boolean(currentUser && authorizationId));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!authorizationId) {
        setError('Yêu cầu kết nối không hợp lệ: thiếu authorization_id.');
        setLoading(false);
        return;
      }
      try { window.sessionStorage.setItem(RESUME_KEY, authorizationId); } catch { /* optional */ }
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const { data, error: detailError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (!alive) return;
      if (detailError) {
        setError(detailError.message || 'Không thể đọc yêu cầu cấp quyền.');
        setDetails(null);
      } else {
        setDetails(data || null);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [authorizationId, currentUser?.id]);

  function goLogin() {
    try { window.sessionStorage.setItem(RESUME_KEY, authorizationId); } catch { /* optional */ }
    window.location.assign('/#/login');
  }

  async function decide(decision) {
    if (!authorizationId || busy) return;
    setBusy(decision);
    setError('');
    try {
      const action = decision === 'approve'
        ? supabase.auth.oauth.approveAuthorization(authorizationId)
        : supabase.auth.oauth.denyAuthorization(authorizationId);
      const { data, error: decisionError } = await action;
      if (decisionError) throw decisionError;
      if (!data?.redirect_url) throw new Error('Supabase không trả về redirect_url.');
      try { window.sessionStorage.removeItem(RESUME_KEY); } catch { /* optional */ }
      window.location.assign(data.redirect_url);
    } catch (decisionError) {
      setError(decisionError?.message || 'Không thể hoàn tất yêu cầu cấp quyền.');
      setBusy('');
    }
  }

  const scopes = String(details?.scope || '').split(/\s+/).filter(Boolean);
  const clientName = details?.client?.name || 'ChatGPT / Brian Plugin';

  return (
    <main className="brian-oauth-page">
      <section className="brian-oauth-card" aria-live="polite">
        <div className="brian-oauth-brand">
          <span className="brian-oauth-mark">B</span>
          <div><b>BRIAN ENGLISH</b><small>Secure Plugin Authorization</small></div>
        </div>

        {loading ? (
          <div className="brian-oauth-state"><span className="brian-oauth-spinner" /><h1>Đang kiểm tra yêu cầu kết nối…</h1></div>
        ) : !currentUser ? (
          <>
            <div className="brian-oauth-eyebrow">PLUGIN / MCP</div>
            <h1>Đăng nhập Brian để kết nối</h1>
            <p>ChatGPT đang yêu cầu kết nối với Ngân hàng câu hỏi Brian. Hãy đăng nhập đúng tài khoản chứa ngân hàng câu hỏi của anh.</p>
            {error ? <div className="brian-oauth-error">{error}</div> : null}
            <button type="button" className="brian-oauth-primary" onClick={goLogin} disabled={!authorizationId}>Đăng nhập Brian</button>
          </>
        ) : error && !details ? (
          <>
            <div className="brian-oauth-eyebrow">PLUGIN / MCP</div>
            <h1>Không thể mở yêu cầu cấp quyền</h1>
            <div className="brian-oauth-error">{error}</div>
            <button type="button" className="brian-oauth-secondary" onClick={() => window.location.assign('/#/assessment-core')}>Về Ngân hàng câu hỏi</button>
          </>
        ) : (
          <>
            <div className="brian-oauth-eyebrow">PLUGIN / MCP</div>
            <h1>Cho phép {clientName} truy cập Brian?</h1>
            <p className="brian-oauth-intro">Anh đang cấp quyền cho Plugin dùng chính tài khoản Brian hiện tại. Mật khẩu Brian không được gửi cho ChatGPT.</p>

            <div className="brian-oauth-client">
              <div><span>Ứng dụng yêu cầu</span><strong>{clientName}</strong></div>
              <div><span>Tài khoản Brian</span><strong>{currentUser.email || currentUser.id}</strong></div>
              {details?.redirect_uri ? <div><span>Callback</span><strong className="mono">{details.redirect_uri}</strong></div> : null}
            </div>

            <div className="brian-oauth-permissions">
              <b>Quyền danh tính được yêu cầu</b>
              {scopes.length ? scopes.map((scope) => (
                <div key={scope}><span>✓</span><p><strong>{scope}</strong><small>{scopeLabel(scope)}</small></p></div>
              )) : <div><span>✓</span><p><strong>Brian account</strong><small>Xác nhận tài khoản để Plugin truy cập dữ liệu thuộc tài khoản này.</small></p></div>}
            </div>

            <div className="brian-oauth-tool-note">
              <b>Brian Plugin có thể làm gì sau khi kết nối?</b>
              <p>Tìm câu hỏi, mở đề đã lưu, lưu câu/chùm bài mới và lưu đề thi khi anh yêu cầu. Các thao tác ghi vẫn được ChatGPT áp dụng cơ chế xác nhận phù hợp.</p>
            </div>

            {error ? <div className="brian-oauth-error">{error}</div> : null}
            <div className="brian-oauth-actions">
              <button type="button" className="brian-oauth-secondary" onClick={() => decide('deny')} disabled={Boolean(busy)}>{busy === 'deny' ? 'Đang từ chối…' : 'Không cho phép'}</button>
              <button type="button" className="brian-oauth-primary" onClick={() => decide('approve')} disabled={Boolean(busy)}>{busy === 'approve' ? 'Đang kết nối…' : 'Cho phép & kết nối'}</button>
            </div>
            <small className="brian-oauth-foot">Anh có thể ngắt Plugin trong ChatGPT hoặc vô hiệu hóa quyền truy cập sau này.</small>
          </>
        )}
      </section>
    </main>
  );
}
