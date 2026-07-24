import { useEffect, useMemo, useState } from 'react';
import {
  getMotionCoreSettings,
  previewMotionCore,
  setMotionCoreSettings,
} from '../motion/englishHubMotionCore.js';
import { PRODUCTION_EFFECT_COUNT } from '../motion/motionCatalog.js';
import MotionLabDialog from './MotionLabDialog.jsx';
import './MotionCoreSettings.css';

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`motion-core-toggle ${checked ? 'is-on' : ''}`}
      aria-pressed={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export default function MotionCoreSettings({ language = 'vi' }) {
  const vi = language === 'vi';
  const [settings, setSettings] = useState(getMotionCoreSettings);
  const [ready, setReady] = useState(() => Boolean(window.EnglishHubMotion));
  const [labOpen, setLabOpen] = useState(false);

  useEffect(() => {
    const sync = (event) => {
      setReady(Boolean(window.EnglishHubMotion));
      setSettings(event?.detail?.settings || getMotionCoreSettings());
    };
    window.addEventListener('bes-motion-core-ready', sync);
    window.addEventListener('bes-motion-core-settings-changed', sync);
    sync();
    return () => {
      window.removeEventListener('bes-motion-core-ready', sync);
      window.removeEventListener('bes-motion-core-settings-changed', sync);
    };
  }, []);

  const update = (patch) => {
    const next = setMotionCoreSettings(patch);
    setSettings(next);
  };

  const features = useMemo(() => ([
    ['buttons', vi ? 'Nút & phản hồi chạm' : 'Buttons & touch feedback', vi ? 'Ripple và phản hồi nhấn dùng lớp overlay an toàn.' : 'Safe overlay ripple and press feedback.'],
    ['cards', vi ? 'Thẻ ứng dụng' : 'App cards', vi ? 'Nâng thẻ và xuất hiện tuần tự, không phá transform gốc.' : 'Lift and staggered entrance without replacing layout transforms.'],
    ['dialogs', vi ? 'Menu & hộp thoại' : 'Menus & dialogs', vi ? 'Mở bằng Material scale/fade có kiểm soát.' : 'Controlled Material scale/fade opening.'],
    ['notifications', vi ? 'Toast & thông báo' : 'Toasts & notifications', vi ? 'Snackbar, badge và chuông phản hồi khi có tin mới.' : 'Snackbar, badge and bell feedback for new items.'],
    ['celebrations', vi ? 'Hoàn thành tác vụ' : 'Task completion', vi ? 'Particle Burst chỉ chạy ở Full và thiết bị đủ mạnh.' : 'Particle Burst only runs in Full mode on capable devices.'],
    ['data', vi ? 'Số liệu & tiến độ' : 'Data & progress', vi ? 'Số đếm và chỉ báo cập nhật mượt, có cleanup.' : 'Smooth counters and progress feedback with cleanup.'],
  ]), [vi]);

  return (
    <>
      <section className="settings-motion-core">
        <header>
          <div>
            <small>ENGLISH HUB MOTION CORE</small>
            <strong>{vi ? 'Chuyển động dùng thật trong hệ thống' : 'Production motion system'}</strong>
            <p>{vi ? 'Được chắt lọc từ Motion Lab 100 hiệu ứng, tự tuân theo Lite / Full / Off, hiệu năng thiết bị và Giảm chuyển động.' : 'Curated from the 100-effect Motion Lab and governed by Lite / Full / Off, device performance and Reduce Motion.'}</p>
          </div>
          <span className={ready ? 'is-ready' : ''}><i />{ready ? (vi ? 'Đang hoạt động' : 'Active') : (vi ? 'Đang kết nối' : 'Connecting')}</span>
        </header>

        <div className="motion-core-summary">
          <span><b>100</b>{vi ? 'hiệu ứng trong Lab' : 'effects in Lab'}</span>
          <span><b>{PRODUCTION_EFFECT_COUNT}</b>{vi ? 'hiệu ứng production' : 'production effects'}</span>
          <span><b>0</b>{vi ? 'phụ thuộc CDN' : 'CDN dependencies'}</span>
        </div>

        <div className="motion-core-master">
          <div>
            <strong>{vi ? 'Bật Motion Core' : 'Enable Motion Core'}</strong>
            <small>{vi ? 'Tắt mục này sẽ vô hiệu hóa toàn bộ hiệu ứng bổ sung, nhưng không ảnh hưởng chức năng website.' : 'Disables all supplemental effects without changing website functionality.'}</small>
          </div>
          <Toggle checked={settings.enabled !== false} onChange={(value) => update({ enabled: value })} label={vi ? 'Bật Motion Core' : 'Enable Motion Core'} />
        </div>

        <div className="motion-core-feature-grid" aria-disabled={settings.enabled === false}>
          {features.map(([key, title, description]) => (
            <div key={key}>
              <span><strong>{title}</strong><small>{description}</small></span>
              <Toggle
                checked={settings.enabled !== false && settings[key] !== false}
                onChange={(value) => update({ [key]: value })}
                label={title}
              />
            </div>
          ))}
        </div>

        <footer>
          <div className="motion-core-preview" role="group" aria-label={vi ? 'Xem thử hiệu ứng' : 'Preview effects'}>
            <button type="button" onClick={(event) => previewMotionCore('notify', event.currentTarget)}>{vi ? 'Thông báo' : 'Notify'}</button>
            <button type="button" onClick={(event) => previewMotionCore('error', event.currentTarget)}>{vi ? 'Lỗi' : 'Error'}</button>
            <button type="button" onClick={(event) => previewMotionCore('success', event.currentTarget)}>{vi ? 'Hoàn thành' : 'Success'}</button>
            <button type="button" onClick={(event) => previewMotionCore('dialog', event.currentTarget)}>{vi ? 'Hộp thoại' : 'Dialog'}</button>
          </div>
          <button type="button" className="motion-core-open-lab" onClick={() => setLabOpen(true)}>
            {vi ? 'Mở Motion Lab · 100 hiệu ứng' : 'Open Motion Lab · 100 effects'} ↗
          </button>
        </footer>
      </section>
      <MotionLabDialog open={labOpen} onClose={() => setLabOpen(false)} language={language} />
    </>
  );
}
