import React, { useEffect, useMemo, useState } from 'react';
import './SettingsAppearanceEngine.css';

const STORAGE_KEY = 'bes-appearance-v2';
const RETIRED_FIELDS = [
  'theme',
  'density',
  'contentWidth',
  'textScale',
  'projector',
  'touchTargets',
  'radius',
  'border',
  'depth',
  'motion',
  'transition',
  'cardEffect',
  'parallax',
  'reduceMotion',
  'effectIntensity',
];
const DEFAULTS = {
  accent: 'violet',
  accentCustom: '#7447E8',
  accentMode: 'global',
  background: 'mesh',
  adaptivePerformance: true,
  highContrast: false,
  batterySaver: false,
};
const PALETTES = {
  brian: { label: 'Brian Blue', value: '#3478F6' },
  cyan: { label: 'Ocean Cyan', value: '#10A7C8' },
  mint: { label: 'Mint', value: '#18A889' },
  emerald: { label: 'Emerald', value: '#20A55A' },
  amber: { label: 'Amber', value: '#D88B00' },
  tangerine: { label: 'Tangerine', value: '#F06E1A' },
  coral: { label: 'Coral', value: '#EE5B56' },
  rose: { label: 'Rose', value: '#E84B7A' },
  violet: { label: 'Violet', value: '#7447E8' },
  indigo: { label: 'Indigo', value: '#4D55D8' },
  graphite: { label: 'Graphite', value: '#546171' },
};

function cleanState(value = {}) {
  const next = { ...value };
  RETIRED_FIELDS.forEach((field) => delete next[field]);
  return next;
}

function stored() {
  try {
    return { ...DEFAULTS, ...cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function appAccent(value) {
  if (['violet', 'indigo', 'lavender', 'magenta'].includes(value)) return 'violet';
  if (['mint', 'emerald', 'lime', 'green'].includes(value)) return 'green';
  if (['amber', 'tangerine', 'orange'].includes(value)) return 'orange';
  if (['coral', 'rose'].includes(value)) return 'pink';
  if (value === 'cyan') return 'teal';
  return 'blue';
}

function applyStaticAppearance(next, setAccent, setPerformanceMode) {
  setAccent?.(appAccent(next.accent));
  setPerformanceMode?.(next.adaptivePerformance ? 'auto' : (next.batterySaver ? 'low' : 'high'));

  const root = document.documentElement;
  root.dataset.besBackground = next.batterySaver ? 'none' : next.background;
  root.dataset.besContrast = next.highContrast ? 'high' : 'normal';
  root.dataset.besBatterySaver = next.batterySaver ? 'true' : 'false';

  delete root.dataset.motion;
  delete root.dataset.besMotion;
  delete root.dataset.besTransition;
  delete root.dataset.besCardEffect;
  delete root.dataset.motionRuntime;
  delete root.dataset.motionRoute;

  try {
    localStorage.removeItem('bes-motion-mode');
  } catch { /* optional cleanup */ }
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`settings-engine-toggle ${checked ? 'is-on' : ''}`}
      aria-pressed={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export default function SettingsAppearanceEngine({ language = 'vi', setAccent, setPerformanceMode }) {
  const vi = language === 'vi';
  const [state, setState] = useState(stored);
  const palettes = useMemo(() => Object.entries(PALETTES), []);

  useEffect(() => {
    const next = stored();
    setState(next);
    applyStaticAppearance(next, setAccent, setPerformanceMode);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* optional storage */ }
  }, []);

  const update = (patch) => {
    const next = { ...state, ...cleanState(patch), updatedAt: Date.now() };
    setState(next);
    applyStaticAppearance(next, setAccent, setPerformanceMode);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* optional storage */ }
    window.dispatchEvent(new CustomEvent('bes:appearance-changed', { detail: { state: next } }));
  };

  return (
    <div className="settings-engine-integrated">
      <div className="settings-engine-banner">
        <div className="settings-engine-mark" aria-hidden="true"><i /><i /><i /><i /></div>
        <div>
          <strong>{vi ? 'Giao diện hệ thống' : 'System appearance'}</strong>
          <small>{vi ? 'Chỉ giữ các thiết lập tĩnh: màu nhấn, nền, tương phản và hiệu năng.' : 'Only static appearance settings remain: accent, background, contrast and performance.'}</small>
        </div>
        <span className="is-ready"><i />{vi ? 'Đang hoạt động' : 'Active'}</span>
      </div>

      <section>
        <header>
          <div>
            <strong>{vi ? 'Màu nhấn hệ thống' : 'System accent'}</strong>
            <small>{vi ? 'Nút, toggle, focus và badge dùng cùng màu nhấn.' : 'Buttons, toggles, focus and badges share the same accent.'}</small>
          </div>
          <div className="settings-engine-modes">
            {[
              ['global', vi ? 'Toàn hệ thống' : 'Global'],
              ['app', vi ? 'Theo ứng dụng' : 'Per app'],
              ['smart', vi ? 'Thông minh' : 'Smart'],
            ].map(([value, label]) => (
              <button type="button" key={value} className={state.accentMode === value ? 'is-selected' : ''} onClick={() => update({ accentMode: value })}>{label}</button>
            ))}
          </div>
        </header>
        <div className="settings-engine-palette">
          {palettes.map(([key, item]) => (
            <button
              type="button"
              key={key}
              className={state.accent === key ? 'is-selected' : ''}
              style={{ '--swatch': item.value }}
              title={item.label}
              aria-label={item.label}
              onClick={() => update({ accent: key })}
            >
              <span />
            </button>
          ))}
          <label className={state.accent === 'custom' ? 'is-selected' : ''}>
            <input type="color" value={state.accentCustom} onChange={(event) => update({ accent: 'custom', accentCustom: event.target.value, accentMode: 'global' })} />
            <span style={{ '--swatch': state.accentCustom }}>+</span>
          </label>
        </div>
      </section>

      <div className="settings-engine-fields">
        <label>
          <span>{vi ? 'Nền trang' : 'Background'}</span>
          <select value={state.background} onChange={(event) => update({ background: event.target.value })}>
            <option value="none">{vi ? 'Không' : 'None'}</option>
            <option value="gradient">Gradient</option>
            <option value="mesh">Mesh</option>
            <option value="paper">Paper</option>
          </select>
        </label>
      </div>

      <section className="settings-engine-adaptive">
        <header>
          <div>
            <strong>Adaptive UI</strong>
            <small>{vi ? 'Chỉ tối ưu hiệu năng và tương phản; không điều khiển chuyển động, cỡ chữ hoặc bố cục.' : 'Optimizes performance and contrast only; it does not control motion, text size or layout.'}</small>
          </div>
        </header>
        <div>
          {[
            ['adaptivePerformance', vi ? 'Tự tối ưu hiệu suất' : 'Adaptive performance'],
            ['highContrast', vi ? 'Tương phản cao' : 'High contrast'],
            ['batterySaver', vi ? 'Tiết kiệm pin' : 'Battery saver'],
          ].map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <Toggle checked={Boolean(state[key])} onChange={(value) => update({ [key]: value })} label={label} />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
