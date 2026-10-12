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
  const [state, setState] = useState({ loading: true, currentLevel: '', nextLevel: '', factors: [], webauthnFactors: [], error: '' });
  const [touchIdAvailable, setTouchIdAvailable] = useState(false);
  const webauthnApi = supabase?.auth?.mfa?.webauthn;

  useEffect(() => {
    let active = true;
    const available = typeof window !== 'undefined'
      && typeof window.PublicKeyCredential !== 'undefined'
      && typeof navigator?.credentials?.get === 'function'
      && typeof navigator?.credentials?.create === 'function';
    if (!available) return undefined;
    const test = window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
    if (typeof test === 'function') {
      Promise.resolve(test.call(window.PublicKeyCredential))
        .then((supported) => { if (active) setTouchIdAvailable(Boolean(supported)); })
        .catch(() => { if (active) setTouchIdAvailable(false); });
    } else {
      setTouchIdAvailable(true);
    }
    return () => { active = false; };
  }, []);
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
      const allFactors = Array.isArray(listed.data?.all)
        ? listed.data.all
        : [...(listed.data?.totp || []), ...(listed.data?.webauthn || [])];
      const verifiedFactors = allFactors.filter((factor) => factor.status === 'verified');
      const factors = verifiedFactors.filter((factor) => factor.factor_type === 'totp');
      const webauthnFactors = verifiedFactors.filter((factor) => factor.factor_type === 'webauthn');
      setState({
        loading: false,
        currentLevel: assurance.data?.currentLevel || 'aal1',
        nextLevel: assurance.data?.nextLevel || 'aal1',
        factors,
        webauthnFactors,
        error: '',
      });
    } catch (error) {
      setState((previous) => ({ ...previous, loading: false, error: error?.message || 'Cannot check two-factor authentication.' }));
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (!isAdmin) {
      setState({ loading: false, currentLevel: '', nextLevel: '', factors: [], webauthnFactors: [], error: '' });
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

  const needsVerification = (state.factors.length > 0 || state.webauthnFactors.length > 0) && state.currentLevel !== 'aal2';
  const canonicalOrigin = typeof window !== 'undefined' && window.location.hostname === 'esl-brian.vercel.app';

  const explainWebauthnError = (error) => {
    const code = String(error?.code || error?.error_code || '').toLowerCase();
    if (/mfa_web_authn_(enroll|verify)_not_enabled/.test(code)) {
      return vi
        ? 'Supabase chưa bật WebAuthn MFA cho dự án. Cần bật WebAuthn enrollment và verification trong cấu hình Auth trước khi dùng Touch ID.'
        : 'WebAuthn MFA enrollment/verification must be enabled for this Supabase project.';
    }
    return error?.message || (vi ? 'Không thể xác thực Touch ID. Bạn vẫn có thể dùng mã 6 số.' : 'Touch ID failed. You can still use your six-digit code.');
  };

  const verifyTouchId = async () => {
    if (busy || !touchIdAvailable || !webauthnApi || typeof webauthnApi.authenticate !== 'function') return;
    const factor = state.webauthnFactors[0];
    if (!factor) return;
    setBusy(true);
    setFeedback('');
    try {
      const { error } = await webauthnApi.authenticate({
        factorId: factor.id,
        webauthn: { rpId: window.location.hostname, rpOrigins: [window.location.origin] },
      });
      if (error) throw error;
      const result = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (result.error) throw result.error;
      if (result.data?.currentLevel !== 'aal2') {
        throw new Error(vi ? 'Phiên chưa đạt mức xác thực MFA an toàn. Hãy dùng mã 6 số.' : 'Session did not reach AAL2; use your six-digit code.');
      }
      await refresh();
    } catch (error) {
      setFeedback(explainWebauthnError(error));
    } finally {
      setBusy(false);
    }
  };

  const registerTouchId = async () => {
    if (busy) return;
    setFeedback('');
    if (!canonicalOrigin) {
      setFeedback(vi ? 'Đăng ký Touch ID tại tên miền chính esl-brian.vercel.app, không dùng địa chỉ preview.' : 'Enroll Touch ID only on esl-brian.vercel.app, not a preview deployment.');
      return;
    }
    if (!touchIdAvailable || !webauthnApi || typeof webauthnApi.register !== 'function') {
      setFeedback(vi ? 'Trình duyệt hoặc phiên bản Supabase hiện tại chưa hỗ trợ Touch ID cho MFA.' : 'Touch ID MFA is not available in this browser or Supabase client.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await webauthnApi.register({
        friendlyName: 'BRIAN - Mac Touch ID',
        webauthn: { rpId: window.location.hostname, rpOrigins: [window.location.origin] },
      });
      if (error) throw error;
      await refresh();
      setFeedback(vi ? 'Đã đăng ký Touch ID. Ở lần đăng nhập tiếp theo, hãy chọn xác thực bằng vân tay.' : 'Touch ID factor enrolled. Choose biometric verification at your next sign-in.');
    } catch (error) {
      setFeedback(explainWebauthnError(error));
    } finally {
      setBusy(false);
    }
  };

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
        <p>{state.loading ? (vi ? 'Đang kiểm tra phiên bảo mật…' : 'Checking security session…') : state.error || (state.webauthnFactors.length ? (vi ? 'Dùng Touch ID để xác thực mà không nhập mã, hoặc dùng mã 6 số dự phòng.' : 'Use Touch ID without typing a code, or fall back to a six-digit code.') : (vi ? 'Nhập mã từ ứng dụng xác thực để tiếp tục sử dụng BRIAN.' : 'Enter the code from your authenticator app to continue.'))}</p>
        {needsVerification && !state.error ? (
          <>
          {state.webauthnFactors.length > 0 && touchIdAvailable && typeof webauthnApi?.authenticate === 'function' ? (
            <button type="button" className="bes-mfa-touchid-action" onClick={() => { void verifyTouchId(); }} disabled={busy}>
              {busy ? (vi ? 'Đang xác thực…' : 'Verifying…') : (vi ? 'Xác thực bằng Touch ID' : 'Verify with Touch ID')}
            </button>
          ) : null}
          {state.factors.length ? (
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
          </>
        ) : null}
        <details className="bes-mfa-mac-help">
          <summary>{vi ? 'Cách xác thực không cần nhập mã 6 số' : 'Sign in without six-digit codes'}</summary>
          <p>{vi ? 'Vào Cài đặt → Xác thực hai lớp → Thiết lập Touch ID để đăng ký vân tay trực tiếp. Nếu tính năng WebAuthn chưa bật ở Supabase, tiếp tục dùng mã 6 số dự phòng.' : 'Open Settings → MFA → Set up Touch ID to register a biometric factor. If WebAuthn is not enabled on Supabase, use the backup six-digit code.'}</p>
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
      <p>{vi ? 'Đăng ký Touch ID để xác minh trực tiếp bằng vân tay trên Mac, không phải nhập mã 6 số. Mã từ ứng dụng xác thực vẫn là phương án dự phòng.' : 'Register Touch ID to verify directly with your Mac fingerprint, without typing a six-digit code. Your authenticator remains a backup.'}</p>
      <div className="bes-mfa-touchid-settings">
        <strong>{vi ? 'Touch ID / WebAuthn' : 'Touch ID / WebAuthn'}</strong>
        <span>{state.webauthnFactors.length
          ? (vi ? 'Đã đăng ký thiết bị sinh trắc học' : 'Biometric authenticator enrolled')
          : (vi ? 'Chưa đăng ký' : 'Not enrolled')}</span>
        <button type="button" disabled={busy || state.loading || Boolean(state.error) || !touchIdAvailable || !canonicalOrigin} onClick={() => { void registerTouchId(); }}>
          {busy ? (vi ? 'Đang thiết lập…' : 'Working…') : (vi ? 'Thiết lập Touch ID' : 'Set up Touch ID')}
        </button>
        {!canonicalOrigin ? <small>{vi ? 'Hãy dùng https://esl-brian.vercel.app để đăng ký thiết bị.' : 'Use https://esl-brian.vercel.app to enroll.'}</small> : null}
        {!touchIdAvailable ? <small>{vi ? 'Trình duyệt hoặc thiết bị này không báo hỗ trợ Touch ID. Hãy thử Safari trên Mac có Touch ID.' : 'Touch ID is not available here. Try Safari on a compatible Mac.'}</small> : null}
        <small>{vi ? 'WebAuthn MFA đang ở giai đoạn thử nghiệm. Nếu Supabase chưa bật chức năng này, hệ thống sẽ giữ nguyên xác thực mã 6 số.' : 'WebAuthn MFA is experimental. If Supabase has not enabled it, six-digit verification remains available.'}</small>
      </div>
      <p className="bes-mfa-warning">{vi ? 'Supabase không cấp mã khôi phục. Hãy chuẩn bị thêm một thiết bị xác thực dự phòng sau khi kích hoạt; nếu mất toàn bộ thiết bị, cần trợ giúp từ người quản trị Supabase.' : 'Supabase does not issue recovery codes. Add a backup device after setup; if all factors are lost, Supabase project administration is required.'}</p>
      {state.factors.length || state.webauthnFactors.length ? <small>{vi ? 'Thiết bị đã xác minh: ' : 'Verified authenticators: '}{state.factors.length + state.webauthnFactors.length}</small> : null}
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
