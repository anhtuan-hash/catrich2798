import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../utils/supabase.js';
import { logoutUser } from '../utils/auth.js';
import './AdminMfaSecurity.css';

// Deliberately opt-in: existing Admin accounts without enrolled factors are not locked out.
// Once a factor is verified, it must be presented again on future Admin logins.
export default function AdminMfaSecurity({ user, route, language = 'vi' }) {
  const vi = language === 'vi';
  const isAdmin = user?.role === 'admin' && user?.provider === 'supabase' && Boolean(supabase);
  const [state, setState] = useState({ loading: true, currentLevel: '', nextLevel: '', factors: [], error: '' });
  const [code, setCode] = useState('');
  const [selectedFactorId, setSelectedFactorId] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [setup, setSetup] = useState(null);
  const [settingsHost, setSettingsHost] = useState(null);

  useEffect(() => {
    if (!isAdmin || route !== 'settings') {
      setSettingsHost(null);
      return undefined;
    }
    // Settings is lazy-loaded. Find its actual security slot after it mounts.
    const sync = () => {
      const found = document.getElementById('bes-admin-mfa-settings-target');
      setSettingsHost((previous) => previous === found ? previous : found);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.getElementById('bes-main-content') || document.body, {
      childList: true, subtree: true,
    });
    return () => {
      observer.disconnect();
      setSettingsHost(null);
    };
  }, [route, isAdmin]);


  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [assurance, listed] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (assurance.error) throw assurance.error;
      if (listed.error) throw listed.error;
      const factors = (listed.data?.totp || []).filter((factor) => factor.status === 'verified');
      setState({
        loading: false,
        currentLevel: assurance.data?.currentLevel || 'aal1',
        nextLevel: assurance.data?.nextLevel || 'aal1',
        factors,
        error: '',
      });
    } catch (error) {
      setState((previous) => ({ ...previous, loading: false, error: error?.message || 'Cannot check two-factor authentication.' }));
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (!isAdmin) {
      setState({ loading: false, currentLevel: '', nextLevel: '', factors: [], error: '' });
      setSetup(null);
      return undefined;
    }
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'MFA_CHALLENGE_VERIFIED') {
        // Avoid calling another Supabase auth method synchronously inside auth callback.
        window.setTimeout(() => { void refresh(); }, 0);
      }
    });
    return () => data?.subscription?.unsubscribe();
  }, [isAdmin, user?.id, refresh]);

  if (!isAdmin) return null;

  const needsVerification = state.factors.length > 0 && state.currentLevel !== 'aal2';
  const verify = async (event) => {
    event?.preventDefault();
    if (busy || !/^\d{6}$/.test(code)) {
      setFeedback(vi ? 'Nhập mã gồm 6 chữ số.' : 'Enter the 6-digit code.');
      return;
    }
    // The user may enroll different secrets on their phone and Mac.
    // Verify against the explicitly selected credential, not always the first factor.
    const factor = state.factors.find((item) => item.id === selectedFactorId) || state.factors[0];
    if (!factor) return;
    setBusy(true);
    setFeedback('');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) throw error;
      setCode('');
      await refresh();
    } catch (error) {
      setFeedback(error?.message || (vi ? 'Mã xác thực không hợp lệ.' : 'Invalid authentication code.'));
    } finally {
      setBusy(false);
    }
  };

  const begin = async (target = 'app') => {
    if (busy || setup) return;
    setBusy(true);
    setFeedback('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: target === 'apple' ? 'Mac - Apple Passwords' : 'BRIAN Admin backup' });
      if (error) throw error;
      setSetup({ id: data.id, qr: data.totp?.qr_code || '', secret: data.totp?.secret || '', target });
      setCode('');
    } catch (error) {
      setFeedback(error?.message || 'Could not start MFA enrollment.');
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (event) => {
    event.preventDefault();
    if (!setup || !/^\d{6}$/.test(code)) {
      setFeedback(vi ? 'Nhập mã gồm 6 chữ số.' : 'Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: setup.id, code });
      if (error) throw error;
      setSetup(null);
      setCode('');
      await refresh();
      setFeedback(vi ? 'Đã bật xác thực hai lớp. Hãy thêm thiết bị dự phòng để tránh mất quyền truy cập.' : 'Two-factor authentication enabled. Add a backup device to avoid lockout.');
    } catch (error) {
      setFeedback(error?.message || 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = async () => {
    const previous = setup;
    setSetup(null);
    setCode('');
    setFeedback('');
    if (previous?.id) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: previous.id });
      if (error) setFeedback(error.message);
    }
    await refresh();
  };

  // A temporary Supabase MFA lookup error must not lock out an existing Admin
  // who has not yet enrolled a factor. Server-side sensitive actions remain protected.
  const dialog = needsVerification ? (
    <div className="bes-mfa-shield" role="presentation">
      <section className="bes-mfa-shield-card" role="dialog" aria-modal="true" aria-label={vi ? 'Xác thực bảo mật quản trị viên' : 'Administrator two-factor authentication'}>
        <div className="bes-mfa-shield-mark" aria-hidden="true">B</div>
        <h2>{vi ? 'Xác thực tài khoản quản trị viên' : 'Verify your administrator account'}</h2>
        <p>{state.loading ? (vi ? 'Đang kiểm tra phiên bảo mật…' : 'Checking security session…') : state.error || (vi ? 'Nhập mã từ ứng dụng xác thực để tiếp tục sử dụng BRIAN.' : 'Enter the code from your authenticator app to continue.')}</p>
        {needsVerification && !state.error ? (
          <form onSubmit={verify}>
            {state.factors.length > 1 ? (
              <label htmlFor="bes-mfa-login-factor">
                {vi ? 'Chọn thiết bị xác thực' : 'Choose authenticator'}
                <select
                  id="bes-mfa-login-factor"
                  value={state.factors.some((factor) => factor.id === selectedFactorId) ? selectedFactorId : state.factors[0].id}
                  onChange={(event) => { setSelectedFactorId(event.target.value); setCode(''); setFeedback(''); }}
                >
                  {state.factors.map((factor, index) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || (vi ? `Thiết bị ${index + 1}` : `Device ${index + 1}`)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label htmlFor="bes-mfa-login-code">{vi ? 'Mã xác thực (6 chữ số)' : 'Six-digit verification code'}</label>
            <input id="bes-mfa-login-code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
            <button type="submit" disabled={busy}>{busy ? (vi ? 'Đang xác minh…' : 'Verifying…') : (vi ? 'Xác minh' : 'Verify')}</button>
          </form>
        ) : null}
        <details className="bes-mfa-mac-help">
          <summary>{vi ? 'Không muốn dùng điện thoại mỗi lần?' : 'Don't want to use your phone every time?'}</summary>
          <p>{vi ? 'Sau lần xác minh này, vào Cài đặt → Xác thực hai lớp → Thêm Mac (Mật khẩu Apple). Mã sẽ được tạo trên Mac; bạn có thể mở Mật khẩu bằng Touch ID để tự điền hoặc sao chép mã.' : 'After this verification, open Settings → MFA → Add Mac (Apple Passwords). Codes can then be generated on your Mac, unlocked via Touch ID and filled or copied.'}</p>
        </details>
        {feedback ? <p role="alert" className="bes-mfa-error">{feedback}</p> : null}
        {state.error ? <button type="button" onClick={refresh}>{vi ? 'Thử lại' : 'Retry'}</button> : null}
        <button type="button" className="bes-mfa-text-action" onClick={() => { void logoutUser(); }}>{vi ? 'Đăng xuất' : 'Sign out'}</button>
      </section>
    </div>
  ) : null;

  const settings = route === 'settings' && settingsHost && !needsVerification ? (
    <section className="bes-mfa-settings" aria-label={vi ? 'Xác thực hai lớp' : 'Two-factor authentication'}>
      <div className="bes-mfa-settings-head">
        <div><span>{vi ? 'BẢO MẬT TÀI KHOẢN' : 'ACCOUNT SECURITY'}</span><h3>{vi ? 'Xác thực hai lớp (MFA)' : 'Two-factor authentication (MFA)'}</h3></div>
        <strong className={state.factors.length ? 'enabled' : 'disabled'}>{state.factors.length ? (vi ? 'Đã bật' : 'Enabled') : (vi ? 'Chưa bật' : 'Not enabled')}</strong>
      </div>
      <p>{vi ? 'Sử dụng Google Authenticator, Microsoft Authenticator hoặc ứng dụng tương thích để bảo vệ tài khoản quản trị.' : 'Use Google Authenticator, Microsoft Authenticator or a compatible app to protect your administrator account.'}</p>
      <p className="bes-mfa-warning">{vi ? 'Supabase không cấp mã khôi phục. Hãy chuẩn bị thêm một thiết bị xác thực dự phòng sau khi kích hoạt; nếu mất toàn bộ thiết bị, cần trợ giúp từ người quản trị Supabase.' : 'Supabase does not issue recovery codes. Add a backup device after setup; if all factors are lost, Supabase project administration is required.'}</p>
      {state.factors.length ? <small>{vi ? 'Số thiết bị đã xác minh: ' : 'Verified devices: '}{state.factors.length}</small> : null}
      {state.error ? <p className="bes-mfa-warning" role="alert">{state.error} <button type="button" className="secondary" onClick={refresh}>{vi ? 'Thử lại' : 'Retry'}</button></p> : null}
      {!setup ? (
        <div className="bes-mfa-actions">
          <button type="button" onClick={() => { void begin('apple'); }} disabled={busy || state.loading || Boolean(state.error)}>
            {busy ? '…' : (vi ? 'Thiết lập trên Mac (Mật khẩu Apple)' : 'Set up on Mac (Apple Passwords)')}
          </button>
          <button type="button" className="secondary" onClick={() => { void begin('app'); }} disabled={busy || state.loading || Boolean(state.error)}>
            {vi ? 'Thêm ứng dụng xác thực khác' : 'Add another authenticator'}
          </button>
        </div>
      ) : (
        <form onSubmit={confirmSetup} className="bes-mfa-enroll">
          <p>{setup.target === 'apple'
            ? (vi ? 'Mở ứng dụng Mật khẩu (Passwords) trên Mac → chọn tài khoản esl-brian.vercel.app (hoặc tạo mới) → Sửa → Thiết lập mã (Set Up Code). Dán khóa thiết lập bên dưới, sau đó nhập mã 6 số do Mac tạo để xác minh.' : 'Open the Passwords app on Mac → select or create the esl-brian.vercel.app account → Edit → Set Up Code. Paste the setup key below, then enter the code generated on your Mac.')
            : (vi ? 'Quét mã QR bằng ứng dụng xác thực rồi nhập mã 6 chữ số để kích hoạt.' : 'Scan the QR code with an authenticator app, then enter the six-digit code.')}</p>
          {setup.qr ? <img alt={vi ? 'Mã QR xác thực hai lớp' : 'Two-factor setup QR code'} src={setup.qr} /> : null}
          {setup.secret ? <details open={setup.target === 'apple'}><summary>{vi ? 'Khóa thiết lập (giữ bí mật)' : 'Setup key (keep private)'}</summary><code>{setup.secret}</code></details> : null}
          {setup.target === 'apple' ? <p className="bes-mfa-warning">{vi ? 'Touch ID mở khóa ứng dụng Mật khẩu; việc xác minh với BRIAN vẫn dùng mã được tạo trên Mac. Không lưu hoặc gửi khóa thiết lập này cho người khác.' : 'Touch ID unlocks Passwords; BRIAN still verifies the code generated on Mac. Never share this setup key.'}</p> : null}
          <label htmlFor="bes-mfa-setup-code">{vi ? 'Mã xác nhận' : 'Verification code'}</label>
          <input id="bes-mfa-setup-code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
          <div className="bes-mfa-actions"><button type="submit" disabled={busy}>{vi ? 'Xác minh và kích hoạt' : 'Verify and enable'}</button><button type="button" className="secondary" disabled={busy} onClick={() => { void cancelSetup(); }}>{vi ? 'Hủy' : 'Cancel'}</button></div>
        </form>
      )}
      {feedback ? <p role="status" className="bes-mfa-feedback">{feedback}</p> : null}
    </section>
  ) : null;

  return (
    <>
      {dialog ? createPortal(dialog, document.body) : null}
      {settings ? createPortal(settings, settingsHost) : null}
    </>
  );
}
