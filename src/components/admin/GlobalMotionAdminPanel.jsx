import React, { useEffect, useMemo, useState } from 'react';
import {
  GLOBAL_MOTION_EVENT,
  GLOBAL_MOTION_PRESETS,
  applyGlobalMotionPreset,
  getGlobalMotionPreset,
  loadGlobalMotionPresetFromServer,
  saveGlobalMotionPreset,
} from '../../utils/globalMotionSystem.js';
import './GlobalMotionAdminPanel.css';

function MotionPreview({ preset }) {
  return (
    <div className={`admin-motion-preview is-${preset}`} aria-hidden="true">
      <div className="admin-motion-preview-window">
        <span className="admin-motion-preview-dot" />
        <span className="admin-motion-preview-dot" />
        <span className="admin-motion-preview-dot" />
        <div className="admin-motion-preview-row">
          <i />
          <div><b /><small /></div>
        </div>
        <div className="admin-motion-preview-cards">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

export default function GlobalMotionAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [selected, setSelected] = useState(getGlobalMotionPreset);
  const [savedPreset, setSavedPreset] = useState(getGlobalMotionPreset);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let alive = true;
    loadGlobalMotionPresetFromServer().then((result) => {
      if (!alive) return;
      const preset = result.preset || getGlobalMotionPreset();
      setSelected(preset);
      setSavedPreset(preset);
      setStatus(result.ok ? 'synced' : (result.unavailable ? 'setup' : 'local'));
    });

    const onMotion = (event) => {
      const preset = event?.detail?.preset;
      if (preset) setSelected(preset);
    };
    window.addEventListener(GLOBAL_MOTION_EVENT, onMotion);
    return () => {
      alive = false;
      window.removeEventListener(GLOBAL_MOTION_EVENT, onMotion);
    };
  }, []);

  const selectedDefinition = useMemo(
    () => GLOBAL_MOTION_PRESETS.find((entry) => entry.id === selected) || GLOBAL_MOTION_PRESETS[2],
    [selected],
  );
  const dirty = selected !== savedPreset;

  function previewPreset(preset) {
    setSelected(preset);
    applyGlobalMotionPreset(preset, { source: 'admin-preview' });
    setNotice(vi ? 'Đang xem trước trên toàn giao diện. Bấm “Áp dụng toàn site” để lưu.' : 'Previewing across the interface. Apply to save globally.');
  }

  async function savePreset() {
    setSaving(true);
    setNotice('');
    try {
      const result = await saveGlobalMotionPreset(selected, currentUser);
      if (result.ok) {
        setSavedPreset(result.preset);
        setSelected(result.preset);
        setStatus('synced');
        setNotice(vi
          ? 'Đã áp dụng. Các tài khoản đang mở Brian sẽ tự nhận cấu hình mới qua realtime.'
          : 'Applied. Open Brian sessions will receive the new setting through realtime sync.');
      } else {
        setSavedPreset(result.preset);
        setStatus(result.unavailable ? 'setup' : 'local');
        setNotice(result.message || (vi ? 'Đã áp dụng trên thiết bị này.' : 'Applied on this device.'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-global-motion" id="admin-global-motion" aria-labelledby="admin-global-motion-title">
      <header className="admin-global-motion-head">
        <div className="admin-global-motion-heading">
          <span className="admin-global-motion-icon" aria-hidden="true">◉</span>
          <div>
            <span className="eyebrow">MOTION & NAVIGATION HUB</span>
            <h2 id="admin-global-motion-title">{vi ? 'Chuyển động & điều hướng' : 'Motion & navigation'}</h2>
            <p>{vi
              ? 'Admin chọn một trải nghiệm thống nhất cho hiệu ứng mở trang, tab, modal và indicator điều hướng. Cấu hình được áp dụng cho toàn Brian và đồng bộ tới tài khoản giáo viên.'
              : 'Choose one unified experience for page entrances, tabs, dialogs and navigation indicators, synchronized across Brian accounts.'}</p>
          </div>
        </div>
        <div className={`admin-global-motion-status is-${status}`}>
          <span />
          {status === 'synced'
            ? (vi ? 'Đồng bộ toàn hệ thống' : 'System-wide sync')
            : status === 'setup'
              ? (vi ? 'Cần bật đồng bộ Supabase' : 'Supabase sync setup needed')
              : status === 'checking'
                ? (vi ? 'Đang kiểm tra…' : 'Checking…')
                : (vi ? 'Đang dùng cấu hình cục bộ' : 'Using local setting')}
        </div>
      </header>

      <div className="admin-motion-hub-labels"><span>{vi ? 'HIỆU ỨNG MỞ TRANG' : 'PAGE TRANSITION'}</span><span>{vi ? 'INDICATOR ĐIỀU HƯỚNG' : 'NAVIGATION INDICATOR'}</span></div>
      <div className="admin-global-motion-presets" role="radiogroup" aria-label={vi ? 'Chọn trải nghiệm chuyển động' : 'Choose motion experience'}>
        {GLOBAL_MOTION_PRESETS.map((preset) => {
          const active = selected === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`admin-motion-preset ${active ? 'is-selected' : ''}`}
              onClick={() => previewPreset(preset.id)}
            >
              <MotionPreview preset={preset.id} />
              <div className="admin-motion-preset-copy">
                <div>
                  <strong>{vi ? preset.labelVi : preset.label}</strong>
                  {preset.recommended ? <em>{vi ? 'Khuyên dùng' : 'Recommended'}</em> : null}
                </div>
                <p>{vi ? preset.descriptionVi : preset.description}</p>
                <small>{preset.speedVi}</small>
              </div>
              <span className="admin-motion-radio" aria-hidden="true"><i /></span>
            </button>
          );
        })}
      </div>

      <div className="admin-global-motion-bottom">
        <div className="admin-global-motion-summary">
          <strong>{vi ? selectedDefinition.labelVi : selectedDefinition.label}</strong>
          <span>{vi
            ? 'Preset này điều khiển đồng thời chuyển trang và indicator, nên toàn hệ thống luôn đồng nhất thay vì mỗi trang một kiểu.'
            : 'This preset controls page transitions and indicators together so the whole system stays visually consistent.'}</span>
          <small>{vi
            ? 'Thiết bị bật “Reduce Motion” luôn được ưu tiên và tự tắt animation.'
            : 'The device Reduced Motion preference always takes priority and disables animation.'}</small>
        </div>
        <button type="button" className="admin-global-motion-apply" disabled={saving || (!dirty && status === 'synced')} onClick={savePreset}>
          {saving ? (vi ? 'Đang áp dụng…' : 'Applying…') : (vi ? 'Áp dụng toàn site' : 'Apply site-wide')}
        </button>
      </div>

      {notice ? <div className={`admin-global-motion-notice ${status === 'setup' ? 'is-warning' : ''}`}>{notice}</div> : null}
      {status === 'setup' ? (
        <div className="admin-global-motion-setup-note">
          <b>{vi ? 'Đồng bộ nhiều tài khoản chưa hoạt động' : 'Cross-account sync is not active yet'}</b>
          <span>{vi
            ? 'Source đã có sẵn file supabase/brian_global_motion_settings.sql. Sau khi chạy file này một lần trong Supabase Production, panel sẽ tự chuyển sang realtime mà không cần sửa code.'
            : 'The repository includes supabase/brian_global_motion_settings.sql. Run it once in Production Supabase; this panel will switch to realtime automatically without code changes.'}</span>
        </div>
      ) : null}
    </section>
  );
}
