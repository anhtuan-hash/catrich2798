from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def patch_once(path, old, new, label):
    text = read(path)
    if new in text:
        return False
    if old not in text:
        raise SystemExit(f'Marker not found for {label}: {path}')
    write(path, text.replace(old, new, 1))
    print(f'patched: {label}')
    return True


GLOBAL_FONT_JS = r'''import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const STORAGE_KEY = 'bes-global-font-preset-v1';
const SETTINGS_TABLE = 'brian_global_font_settings';
const GLOBAL_EVENT = 'bes-global-font-updated';
const DEFAULT_PRESET = 'roboto';
const VALID_PRESETS = new Set(['roboto', 'be-vietnam-pro', 'inter', 'noto-sans', 'arial', 'system']);

export const GLOBAL_FONT_PRESETS = Object.freeze([
  {
    id: 'roboto',
    label: 'Roboto',
    descriptionVi: 'Chuẩn Google Material, cân bằng và quen thuộc trên giao diện web.',
    description: 'Google Material standard: balanced, familiar and highly readable.',
    family: "'Roboto', Arial, sans-serif",
    sample: 'Aa  Ă Â Ê Ô Ơ Ư  123',
    recommended: true,
  },
  {
    id: 'be-vietnam-pro',
    label: 'Be Vietnam Pro',
    descriptionVi: 'Tối ưu tiếng Việt, hiện đại và rõ nét cho môi trường giáo dục.',
    description: 'Vietnamese-first modern typeface with excellent diacritic support.',
    family: "'Be Vietnam Pro', Arial, sans-serif",
    sample: 'Aa  Trường học · Giáo viên',
  },
  {
    id: 'inter',
    label: 'Inter',
    descriptionVi: 'Gọn, hiện đại, phù hợp dashboard và bảng dữ liệu mật độ cao.',
    description: 'Clean modern UI font that works well for dashboards and dense tables.',
    family: "'Inter', Arial, sans-serif",
    sample: 'Aa  Dashboard · 2026–2027',
  },
  {
    id: 'noto-sans',
    label: 'Noto Sans',
    descriptionVi: 'Độ phủ ký tự rộng, ổn định với tiếng Việt và nội dung đa ngôn ngữ.',
    description: 'Wide language coverage and reliable Vietnamese rendering.',
    family: "'Noto Sans', Arial, sans-serif",
    sample: 'Aa  Thông báo · Tài liệu',
  },
  {
    id: 'arial',
    label: 'Arial',
    descriptionVi: 'Font hệ thống phổ biến, tải nhanh và tương thích cao.',
    description: 'Fast, broadly compatible system font.',
    family: 'Arial, Helvetica, sans-serif',
    sample: 'Aa  English · Tiếng Việt',
  },
  {
    id: 'system',
    label: 'System UI',
    descriptionVi: 'Dùng font giao diện mặc định của hệ điều hành trên từng thiết bị.',
    description: 'Use the native interface font supplied by each operating system.',
    family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    sample: 'Aa  Native UI · 123',
  },
]);

let installed = false;
let realtimeUnsubscribe = null;
let retryTimers = [];

function normalizePreset(value) {
  const preset = String(value || '').trim().toLowerCase();
  return VALID_PRESETS.has(preset) ? preset : DEFAULT_PRESET;
}

function storedPreset() {
  if (typeof window === 'undefined') return DEFAULT_PRESET;
  try { return normalizePreset(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return DEFAULT_PRESET; }
}

function writeStoredPreset(preset) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, normalizePreset(preset)); }
  catch { /* persistence is optional */ }
}

export function getGlobalFontPreset() {
  if (typeof document !== 'undefined') {
    const rootValue = document.documentElement?.dataset?.globalFont;
    if (rootValue) return normalizePreset(rootValue);
  }
  return storedPreset();
}

export function getGlobalFontPresetDefinition(preset = getGlobalFontPreset()) {
  const normalized = normalizePreset(preset);
  return GLOBAL_FONT_PRESETS.find((entry) => entry.id === normalized) || GLOBAL_FONT_PRESETS[0];
}

export function applyGlobalFontPreset(preset, options = {}) {
  const normalized = normalizePreset(preset);
  const definition = getGlobalFontPresetDefinition(normalized);
  const { persist = true, source = 'local', broadcast = true } = options;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.globalFont = normalized;
    root.dataset.globalFontSource = source;
    root.style.setProperty('--bes-global-font-family', definition.family);
  }
  if (persist) writeStoredPreset(normalized);

  if (broadcast && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GLOBAL_EVENT, {
      detail: { preset: normalized, source, at: Date.now() },
    }));
  }
  return normalized;
}

function isMissingTableError(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || /brian_global_font_settings|does not exist|schema cache/i.test(message);
}

export async function loadGlobalFontPresetFromServer({ silent = true } = {}) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, unavailable: true, preset: getGlobalFontPreset() };

  try {
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .select('font_preset,updated_at')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      if (!silent && !isMissingTableError(error)) console.warn('[FontSystem] server load failed', error);
      return { ok: false, unavailable: isMissingTableError(error), error, preset: getGlobalFontPreset() };
    }
    if (!data?.font_preset) return { ok: true, preset: getGlobalFontPreset(), empty: true };

    const preset = applyGlobalFontPreset(data.font_preset, { source: 'server' });
    return { ok: true, preset, updatedAt: data.updated_at || null };
  } catch (error) {
    if (!silent) console.warn('[FontSystem] server load failed', error);
    return { ok: false, error, preset: getGlobalFontPreset() };
  }
}

export async function saveGlobalFontPreset(preset, currentUser = null) {
  const normalized = applyGlobalFontPreset(preset, { source: 'admin-apply' });
  const client = getRuntimeClient();
  if (!client) {
    return {
      ok: false,
      localOnly: true,
      preset: normalized,
      message: 'Đã áp dụng trên thiết bị này; chưa có kết nối máy chủ để đồng bộ đến giáo viên.',
    };
  }

  try {
    const payload = {
      id: true,
      font_preset: normalized,
      updated_by: String(currentUser?.email || currentUser?.id || 'admin'),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('font_preset,updated_at')
      .single();

    if (error) {
      return {
        ok: false,
        localOnly: true,
        unavailable: isMissingTableError(error),
        preset: normalized,
        error,
        message: isMissingTableError(error)
          ? 'Đã áp dụng trên thiết bị Admin. Cần cài bảng brian_global_font_settings trong Supabase để đồng bộ đến toàn bộ tài khoản giáo viên.'
          : (error.message || 'Không thể đồng bộ font lên máy chủ.'),
      };
    }

    const saved = applyGlobalFontPreset(data?.font_preset || normalized, { source: 'admin-server' });
    return { ok: true, preset: saved, updatedAt: data?.updated_at || payload.updated_at };
  } catch (error) {
    return {
      ok: false,
      localOnly: true,
      preset: normalized,
      error,
      message: error?.message || 'Không thể đồng bộ font lên máy chủ.',
    };
  }
}

function installRealtimeSync() {
  if (realtimeUnsubscribe) return;
  try {
    realtimeUnsubscribe = subscribeTable({
      key: 'global-font-settings',
      table: SETTINGS_TABLE,
      onChange: (payload) => {
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
        if (row?.font_preset) applyGlobalFontPreset(row.font_preset, { source: 'realtime' });
        else loadGlobalFontPresetFromServer();
      },
    });
  } catch {
    realtimeUnsubscribe = null;
  }
}

function scheduleRuntimeSync() {
  const run = async () => {
    const result = await loadGlobalFontPresetFromServer();
    if (result.ok) installRealtimeSync();
  };
  [0, 900, 2800, 8000].forEach((delay) => {
    retryTimers.push(window.setTimeout(run, delay));
  });
}

export function installGlobalFontSystem() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  applyGlobalFontPreset(storedPreset(), { source: 'bootstrap', broadcast: false });

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      applyGlobalFontPreset(event.newValue, { persist: false, source: 'storage' });
    }
  };
  window.addEventListener('storage', onStorage);
  scheduleRuntimeSync();
}

export { GLOBAL_EVENT as GLOBAL_FONT_EVENT, SETTINGS_TABLE as GLOBAL_FONT_SETTINGS_TABLE };
'''

GLOBAL_FONT_CSS = r'''@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap');

/* Brian Global Font System
   Loaded after all legacy styles so the Admin-selected family becomes the single UI font source. */

html[data-global-font="roboto"] { --bes-global-font-family: 'Roboto', Arial, sans-serif; }
html[data-global-font="be-vietnam-pro"] { --bes-global-font-family: 'Be Vietnam Pro', Arial, sans-serif; }
html[data-global-font="inter"] { --bes-global-font-family: 'Inter', Arial, sans-serif; }
html[data-global-font="noto-sans"] { --bes-global-font-family: 'Noto Sans', Arial, sans-serif; }
html[data-global-font="arial"] { --bes-global-font-family: Arial, Helvetica, sans-serif; }
html[data-global-font="system"] { --bes-global-font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

html[data-global-font] body,
html[data-global-font] body :is(
  div, section, article, main, aside, header, footer, nav,
  h1, h2, h3, h4, h5, h6, p, span, strong, b, em, i, small,
  label, legend, li, dt, dd, blockquote, figcaption,
  table, thead, tbody, tfoot, tr, th, td,
  button, a, input, textarea, select, option, summary
) {
  font-family: var(--bes-global-font-family) !important;
}

/* Preserve specialist glyph and code fonts. */
html[data-global-font] body :is(code, pre, kbd, samp) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace !important;
}

html[data-global-font] body :is(
  .material-symbols-outlined,
  .material-symbols-rounded,
  .material-symbols-sharp,
  .material-icons,
  .material-icons-outlined,
  .material-icons-round,
  .material-icons-sharp,
  .material-icons-two-tone
) {
  font-family: 'Material Symbols Outlined', 'Material Icons' !important;
}
'''

FONT_PANEL_JSX = r'''import React, { useEffect, useMemo, useState } from 'react';
import {
  GLOBAL_FONT_PRESETS,
  applyGlobalFontPreset,
  getGlobalFontPreset,
  loadGlobalFontPresetFromServer,
  saveGlobalFontPreset,
} from '../../utils/globalFontSystem.js';
import './GlobalFontAdminPanel.css';

export default function GlobalFontAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [selected, setSelected] = useState(getGlobalFontPreset());
  const [saved, setSaved] = useState(getGlobalFontPreset());
  const [syncReady, setSyncReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const current = useMemo(() => GLOBAL_FONT_PRESETS.find((item) => item.id === selected) || GLOBAL_FONT_PRESETS[0], [selected]);

  useEffect(() => {
    let alive = true;
    loadGlobalFontPresetFromServer({ silent: true }).then((result) => {
      if (!alive) return;
      const preset = result?.preset || getGlobalFontPreset();
      setSelected(preset);
      setSaved(preset);
      setSyncReady(Boolean(result?.ok));
    });
    return () => { alive = false; };
  }, []);

  const choose = (id) => {
    setSelected(id);
    setMessage('');
  };

  const apply = async () => {
    setBusy(true);
    setMessage('');
    const result = await saveGlobalFontPreset(selected, currentUser);
    setBusy(false);
    setSaved(result?.preset || selected);
    setSyncReady(Boolean(result?.ok));
    setMessage(result?.ok
      ? (vi ? 'Đã áp dụng font cho toàn hệ thống. Các tài khoản giáo viên đang mở Brian sẽ nhận thay đổi qua Realtime.' : 'Font applied site-wide. Open teacher sessions will receive the change through Realtime.')
      : (result?.message || (vi ? 'Đã áp dụng cục bộ nhưng chưa thể đồng bộ toàn hệ thống.' : 'Applied locally but server sync is not available.')));
  };

  const preview = () => {
    applyGlobalFontPreset(selected, { persist: false, source: 'admin-preview' });
    setMessage(vi ? 'Đang xem thử font trên giao diện Admin. Bấm “Áp dụng toàn hệ thống” để lưu.' : 'Previewing this font in Admin. Click “Apply site-wide” to save it.');
  };

  return (
    <section className="admin-global-font metro-panel" id="admin-global-font">
      <header className="admin-global-font__head">
        <div>
          <span className="eyebrow">{vi ? 'Giao diện toàn hệ thống' : 'Site-wide appearance'}</span>
          <h2>{vi ? 'Font chữ toàn hệ thống' : 'Global font'}</h2>
          <p>{vi
            ? 'Admin chọn một font duy nhất cho Brian. Sau khi áp dụng, font được dùng trên toàn site và đồng bộ đến mọi tài khoản giáo viên.'
            : 'Choose one font for Brian. Once applied, it is used site-wide and synced to every teacher account.'}</p>
        </div>
        <span className={`admin-global-font__status ${syncReady ? 'is-ready' : 'is-local'}`}>
          {syncReady ? (vi ? 'Đồng bộ toàn hệ thống' : 'Site-wide sync') : (vi ? 'Cần bật đồng bộ Supabase' : 'Supabase sync required')}
        </span>
      </header>

      <div className="admin-global-font__grid" role="radiogroup" aria-label={vi ? 'Chọn font chữ' : 'Choose font'}>
        {GLOBAL_FONT_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected === item.id}
            className={`admin-global-font__option ${selected === item.id ? 'is-selected' : ''}`}
            onClick={() => choose(item.id)}
            style={{ '--font-preview-family': item.family }}
          >
            <span className="admin-global-font__radio" aria-hidden="true" />
            <span className="admin-global-font__sample">{item.sample}</span>
            <strong>{item.label}{item.recommended ? <em>{vi ? 'Khuyên dùng' : 'Recommended'}</em> : null}</strong>
            <small>{vi ? item.descriptionVi : item.description}</small>
          </button>
        ))}
      </div>

      <div className="admin-global-font__preview" style={{ fontFamily: current.family }}>
        <span>{vi ? 'Xem trước' : 'Preview'}</span>
        <strong>Brian English · Giáo viên · Thông báo TTCM</strong>
        <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · Ă Â Ê Ô Ơ Ư Đ</p>
      </div>

      {message ? <div className={`admin-global-font__message ${syncReady ? 'is-success' : ''}`}>{message}</div> : null}

      <footer className="admin-global-font__actions">
        <div><span>{vi ? 'Đang chọn:' : 'Selected:'}</span><strong>{current.label}</strong>{saved === selected ? <small>✓ {vi ? 'đang áp dụng' : 'active'}</small> : null}</div>
        <button type="button" className="metro-small-btn" onClick={preview}>{vi ? 'Xem thử' : 'Preview'}</button>
        <button type="button" className="metro-small-btn active" disabled={busy} onClick={apply}>{busy ? (vi ? 'Đang áp dụng…' : 'Applying…') : (vi ? 'Áp dụng toàn hệ thống' : 'Apply site-wide')}</button>
      </footer>
    </section>
  );
}
'''

FONT_PANEL_CSS = r'''.admin-global-font {
  margin-top: 24px;
  padding: 28px;
  border-radius: 28px;
  background: #fff;
  border: 1px solid #e0e3e7;
}
.admin-global-font__head { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; margin-bottom:22px; }
.admin-global-font__head h2 { margin:4px 0 8px; font-size:24px; color:#1f1f1f; }
.admin-global-font__head p { margin:0; max-width:760px; color:#5f6368; line-height:1.6; }
.admin-global-font__status { flex:none; padding:8px 12px; border-radius:999px; background:#fef7e0; color:#7a4f01; font-size:12px; font-weight:700; }
.admin-global-font__status.is-ready { background:#e6f4ea; color:#137333; }
.admin-global-font__grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.admin-global-font__option { position:relative; min-height:178px; padding:18px; text-align:left; border:1px solid #dadce0; border-radius:20px; background:#fff; color:#202124; cursor:pointer; }
.admin-global-font__option:hover { background:#f8fafd; border-color:#a8c7fa; }
.admin-global-font__option.is-selected { background:#edf4ff; border-color:#0b57d0; box-shadow:0 0 0 1px #0b57d0 inset; }
.admin-global-font__radio { position:absolute; top:16px; right:16px; width:18px; height:18px; border:2px solid #747775; border-radius:50%; }
.admin-global-font__option.is-selected .admin-global-font__radio { border:5px solid #0b57d0; }
.admin-global-font__sample { display:block; padding-right:30px; margin-bottom:22px; font-family:var(--font-preview-family)!important; font-size:25px; font-weight:600; letter-spacing:-.02em; }
.admin-global-font__option strong { display:flex; align-items:center; gap:8px; font-size:15px; }
.admin-global-font__option strong em { padding:3px 7px; border-radius:999px; background:#d3e3fd; color:#0842a0; font-size:10px; font-style:normal; }
.admin-global-font__option small { display:block; margin-top:7px; color:#5f6368; line-height:1.45; }
.admin-global-font__preview { margin-top:16px; padding:18px 20px; border-radius:18px; background:#f8fafd; border:1px solid #e2e6eb; }
.admin-global-font__preview span { display:block; margin-bottom:7px; color:#5f6368; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
.admin-global-font__preview strong { display:block; font-family:inherit!important; font-size:20px; }
.admin-global-font__preview p { margin:7px 0 0; font-family:inherit!important; color:#5f6368; }
.admin-global-font__message { margin-top:14px; padding:12px 14px; border-radius:14px; background:#fef7e0; color:#7a4f01; font-size:13px; }
.admin-global-font__message.is-success { background:#e6f4ea; color:#137333; }
.admin-global-font__actions { display:flex; align-items:center; justify-content:flex-end; gap:10px; margin-top:18px; }
.admin-global-font__actions > div { margin-right:auto; display:flex; align-items:center; gap:7px; color:#5f6368; font-size:13px; }
.admin-global-font__actions > div strong { color:#1f1f1f; }
.admin-global-font__actions > div small { color:#137333; font-weight:700; }
@media (max-width:960px) { .admin-global-font__grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:640px) {
  .admin-global-font { padding:20px; border-radius:22px; }
  .admin-global-font__head { flex-direction:column; }
  .admin-global-font__grid { grid-template-columns:1fr; }
  .admin-global-font__actions { flex-wrap:wrap; justify-content:stretch; }
  .admin-global-font__actions > div { width:100%; }
  .admin-global-font__actions button { flex:1; }
}
'''

FONT_SQL = r'''-- Brian English: global font preset shared across all authenticated users.
-- Run once in Production Supabase SQL Editor. Safe to run repeatedly.

create table if not exists public.brian_global_font_settings (
  id boolean primary key default true check (id),
  font_preset text not null default 'roboto'
    check (font_preset in ('roboto', 'be-vietnam-pro', 'inter', 'noto-sans', 'arial', 'system')),
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.brian_global_font_settings is
  'Singleton configuration for the Brian site-wide font selected by Admin.';

alter table public.brian_global_font_settings enable row level security;

drop policy if exists "Authenticated users can read global font settings" on public.brian_global_font_settings;
create policy "Authenticated users can read global font settings"
  on public.brian_global_font_settings
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert global font settings" on public.brian_global_font_settings;
create policy "Admins can insert global font settings"
  on public.brian_global_font_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

drop policy if exists "Admins can update global font settings" on public.brian_global_font_settings;
create policy "Admins can update global font settings"
  on public.brian_global_font_settings
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'administrator')
        and coalesce(p.approved, true) = true
    )
  );

grant select, insert, update on public.brian_global_font_settings to authenticated;

insert into public.brian_global_font_settings (id, font_preset, updated_by)
values (true, 'roboto', 'system-default')
on conflict (id) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.brian_global_font_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
'''

TTCM_PERSONNEL_CSS = r'''.ttcm-m3-personnel-view {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 18px 20px 26px;
  background: #f8fafd;
  overscroll-behavior: contain;
}
.ttcm-m3-personnel-view #dashboard-personnel-v2 {
  width: 100%;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.ttcm-m3-personnel-view #dashboard-personnel-v2 .pgt-shell,
.ttcm-m3-personnel-view #dashboard-personnel-v2 .pgt-table-shell {
  max-width: none !important;
}
@media (max-width: 760px) {
  .ttcm-m3-personnel-view { padding: 10px; }
}
'''

write('src/utils/globalFontSystem.js', GLOBAL_FONT_JS)
write('src/styles/GlobalFontSystem.css', GLOBAL_FONT_CSS)
write('src/components/admin/GlobalFontAdminPanel.jsx', FONT_PANEL_JSX)
write('src/components/admin/GlobalFontAdminPanel.css', FONT_PANEL_CSS)
write('supabase/brian_global_font_settings.sql', FONT_SQL)
write('src/components/GlobalTtcmPersonnel.css', TTCM_PERSONNEL_CSS)

patch_once(
    'src/main.jsx',
    "import './styles/GlobalMotionSystem.css';",
    "import './styles/GlobalMotionSystem.css';\nimport './styles/GlobalFontSystem.css';",
    'load global font CSS after legacy styles',
)
patch_once(
    'src/main.jsx',
    "import { installGlobalMotionSystem } from './utils/globalMotionSystem.js';",
    "import { installGlobalMotionSystem } from './utils/globalMotionSystem.js';\nimport { installGlobalFontSystem } from './utils/globalFontSystem.js';",
    'import global font runtime',
)
patch_once(
    'src/main.jsx',
    "installGlobalMotionSystem();\ninstallRetiredFeatureCleanup();",
    "installGlobalMotionSystem();\ninstallGlobalFontSystem();\ninstallRetiredFeatureCleanup();",
    'bootstrap global font runtime',
)

patch_once(
    'src/pages/AdminPage.jsx',
    "import GlobalMotionAdminPanel from '../components/admin/GlobalMotionAdminPanel.jsx';",
    "import GlobalMotionAdminPanel from '../components/admin/GlobalMotionAdminPanel.jsx';\nimport GlobalFontAdminPanel from '../components/admin/GlobalFontAdminPanel.jsx';",
    'import font admin panel',
)
patch_once(
    'src/pages/AdminPage.jsx',
    "          <GlobalMotionAdminPanel currentUser={currentUser} language={language} />\n\n          <section className=\"metro-admin-header metro-panel admin-sync-panel\">",
    "          <GlobalMotionAdminPanel currentUser={currentUser} language={language} />\n          <GlobalFontAdminPanel currentUser={currentUser} language={language} />\n\n          <section className=\"metro-admin-header metro-panel admin-sync-panel\">",
    'mount font admin panel',
)

patch_once(
    'src/pages/WorkDashboard.jsx',
    "import PersonnelLookup from '../components/PersonnelLookupGoogleV2.jsx';\n",
    '',
    'remove personnel import from Dashboard',
)
patch_once(
    'src/pages/WorkDashboard.jsx',
    "      <PersonnelLookup currentUser={currentUser} language={language} />\n",
    '',
    'remove personnel table from Dashboard',
)

patch_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "import GlobalWorkScheduleCompatibleCenter from './GlobalWorkScheduleCompatibleCenter.jsx';",
    "import GlobalWorkScheduleCompatibleCenter from './GlobalWorkScheduleCompatibleCenter.jsx';\nimport PersonnelLookup from './PersonnelLookupGoogleV2.jsx';",
    'import personnel into TTCM',
)
patch_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "import './GlobalTtcmNavigationTab.css';",
    "import './GlobalTtcmNavigationTab.css';\nimport './GlobalTtcmPersonnel.css';",
    'load TTCM personnel styles',
)
patch_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "      const nextView = event?.detail?.view === 'schedule' ? 'schedule' : 'feed';",
    "      const requestedView = event?.detail?.view;\n      const nextView = ['schedule', 'personnel'].includes(requestedView) ? requestedView : 'feed';",
    'support TTCM personnel deep-open',
)
patch_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "            <button type=\"button\" className={workspaceView === 'schedule' ? 'is-selected' : ''} onClick={() => setWorkspaceView('schedule')}><Icon name=\"calendar\" size={18} />Lịch làm việc</button>",
    "            <button type=\"button\" className={workspaceView === 'schedule' ? 'is-selected' : ''} onClick={() => setWorkspaceView('schedule')}><Icon name=\"calendar\" size={18} />Lịch làm việc</button>\n            <button type=\"button\" className={workspaceView === 'personnel' ? 'is-selected' : ''} onClick={() => setWorkspaceView('personnel')}><Icon name=\"people\" size={18} />Nhân sự</button>",
    'add Personnel tab to TTCM',
)
patch_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "          </> : <span className=\"ttcm-m3-schedule-caption\">Lịch dùng chung của tổ chuyên môn</span>}",
    "          </> : workspaceView === 'schedule' ? <span className=\"ttcm-m3-schedule-caption\">Lịch dùng chung của tổ chuyên môn</span> : <span className=\"ttcm-m3-schedule-caption\">Hồ sơ, chuyên môn và phân công tổ viên</span>}",
    'add Personnel toolbar caption',
)
patch_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "        </main> : <main className=\"ttcm-m3-schedule-view\">\n          <div className=\"ttcm-m3-schedule-host v1093-work-hub\" data-ttcm-schedule-host=\"true\" />\n          <GlobalWorkScheduleCompatibleCenter currentUser={currentUser} language={language} route=\"ttcm\" embedded mountSelector='[data-ttcm-schedule-host=\"true\"]' />\n        </main>}",
    "        </main> : workspaceView === 'schedule' ? <main className=\"ttcm-m3-schedule-view\">\n          <div className=\"ttcm-m3-schedule-host v1093-work-hub\" data-ttcm-schedule-host=\"true\" />\n          <GlobalWorkScheduleCompatibleCenter currentUser={currentUser} language={language} route=\"ttcm\" embedded mountSelector='[data-ttcm-schedule-host=\"true\"]' />\n        </main> : <main className=\"ttcm-m3-personnel-view\" role=\"tabpanel\" aria-label=\"Nhân sự tổ chuyên môn\">\n          <PersonnelLookup currentUser={currentUser} language={language} />\n        </main>}",
    'render Personnel inside TTCM',
)

print('Global font system and TTCM personnel integration prepared.')
