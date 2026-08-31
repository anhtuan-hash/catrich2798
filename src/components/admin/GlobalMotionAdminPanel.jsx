import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GLOBAL_MOTION_EASINGS,
  GLOBAL_MOTION_EVENT,
  GLOBAL_MOTION_PRESETS,
  GLOBAL_MOTION_SPEEDS,
  MOTION_LIBRARY,
  applyGlobalMotionConfig,
  configFromMotionPreset,
  getGlobalMotionConfig,
  getGlobalMotionDraft,
  listGlobalMotionHistory,
  loadGlobalMotionConfigFromServer,
  normalizeGlobalMotionConfig,
  restoreGlobalMotionHistory,
  saveGlobalMotionConfig,
  saveGlobalMotionDraft,
} from '../../utils/globalMotionSystem.js';
import './GlobalMotionAdminPanel.css';
import './Windows8MotionPreview.css';

const SLOT_ORDER = ['page', 'tab', 'modal', 'drawer', 'popover', 'list', 'indicator', 'loading', 'interaction'];

function sameConfig(a, b) {
  return JSON.stringify(normalizeGlobalMotionConfig(a)) === JSON.stringify(normalizeGlobalMotionConfig(b));
}

function formatTime(value, vi) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value));
  } catch { return String(value); }
}

function motionOptionLabel(entry, vi) {
  if (entry?.id === 'metro-sweep') return 'Windows 8 App Launch';
  return vi ? entry?.labelVi : entry?.label;
}

function motionOptionDescription(entry, vi) {
  if (entry?.id === 'metro-sweep') {
    return vi
      ? 'Bung từ đúng tile hoặc nút vừa bấm ra toàn màn hình, rồi mới mở trang đích theo nhịp Windows 8.'
      : 'Expands from the exact clicked tile or button to fullscreen before revealing the destination, inspired by Windows 8.';
  }
  return vi ? entry?.descriptionVi : entry?.description;
}

function motionPresetLabel(preset, vi) {
  if (preset?.id === 'metro') return 'Windows 8';
  return vi ? preset?.labelVi : preset?.label;
}

function motionPresetDescription(preset, vi) {
  if (preset?.id === 'metro') {
    return vi
      ? 'Bộ phối Windows 8 với App Launch toàn màn hình, indicator khối và loader chấm kiểu Metro.'
      : 'Windows 8 mix with fullscreen App Launch, block indicators and Metro dot loading.';
  }
  return preset?.descriptionVi || '';
}

function EffectGlyph({ slot, effect }) {
  return (
    <div className={`motion-effect-glyph slot-${slot} effect-${effect}`} aria-hidden="true">
      <span className="motion-effect-glyph__rail" />
      <span className="motion-effect-glyph__surface">
        <i /><i /><i />
        <b /><b />
      </span>
    </div>
  );
}

function MotionPlayground({ draft, tick, language }) {
  const vi = language !== 'en';
  const [launchPreviewTick, setLaunchPreviewTick] = useState(0);
  const windows8Selected = draft.slots.page === 'metro-sweep';
  const pageOption = MOTION_LIBRARY.page.options.find((item) => item.id === draft.slots.page);
  const tabOption = MOTION_LIBRARY.tab.options.find((item) => item.id === draft.slots.tab);
  const modalOption = MOTION_LIBRARY.modal.options.find((item) => item.id === draft.slots.modal);

  return (
    <div className="motion-playground">
      <div className="motion-playground__topline">
        <span>{vi ? 'LIVE PREVIEW' : 'LIVE PREVIEW'}</span>
        <small>{vi ? 'Chỉ áp dụng trên phiên Admin hiện tại' : 'Admin session only'}</small>
      </div>
      <div key={tick} className={`motion-playground__canvas preview-page-${draft.slots.page}`}>
        <aside>
          <span />
          <span />
          <span />
        </aside>
        <main>
          <header><i /><div><b /><small /></div></header>
          <div className={`motion-playground__tabs preview-tab-${draft.slots.tab}`}><span className="active" /><span /><span /></div>
          <div className={`motion-playground__cards preview-list-${draft.slots.list}`}>
            {[0, 1, 2].map((item) => <article key={item} style={{ '--preview-index': item }}><i /><b /><small /></article>)}
          </div>
          <div className={`motion-playground__modal preview-modal-${draft.slots.modal}`}><b /><small /><button type="button" tabIndex={-1}>OK</button></div>
        </main>
      </div>
      <div className="motion-playground__legend">
        <span>{motionOptionLabel(pageOption, vi)}</span>
        <span>{motionOptionLabel(tabOption, vi)}</span>
        <span>{motionOptionLabel(modalOption, vi)}</span>
      </div>

      {windows8Selected ? (
        <div className="motion-win8-preview">
          <div className="motion-win8-preview__head">
            <div>
              <span>WINDOWS 8 APP LAUNCH</span>
              <strong>{vi ? 'Xem đúng nhịp tile → fullscreen → reveal' : 'Preview the tile → fullscreen → reveal sequence'}</strong>
              <small>{vi ? 'Không đổi route thật và không ghi cấu hình public.' : 'No real navigation and no public config write.'}</small>
            </div>
            <button type="button" className="motion-win8-preview__play" onClick={() => setLaunchPreviewTick((value) => value + 1)}>
              {vi ? '▶ Xem thử' : '▶ Preview'}
            </button>
          </div>
          <div key={launchPreviewTick} className={`motion-win8-preview__stage ${launchPreviewTick > 0 ? 'is-running' : ''}`} aria-label={vi ? 'Mô phỏng hiệu ứng mở ứng dụng Windows 8' : 'Windows 8 app launch simulation'}>
            <div className="motion-win8-preview__caption">
              <strong>Brian Start</strong>
              <small>Motion sandbox</small>
            </div>
            <div className="motion-win8-preview__tiles" aria-hidden="true">
              <em className="motion-win8-preview__tile"><i>NF</i><b>News Feed</b></em>
              <em className="motion-win8-preview__tile"><i>WB</i><b>Work Hub</b></em>
              <em className="motion-win8-preview__tile"><i>CL</i><b>Classroom</b></em>
            </div>
            <div className="motion-win8-preview__surface" aria-hidden="true">
              <strong>News Feed</strong>
              <small>Brian English Studio</small>
            </div>
          </div>
          <div className="motion-win8-preview__note">
            {vi ? 'Preview này mô phỏng cùng logic thị giác với Global Windows 8 App Launch đang dùng trên Brian.' : 'This sandbox mirrors the visual logic of Brian’s global Windows 8 App Launch.'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PresetCard({ preset, active, language, onClick }) {
  const vi = language !== 'en';
  return (
    <button type="button" className={`motion-library-preset ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="motion-library-preset__mark">{preset.id === 'editorial-calm' ? 'E' : preset.id === 'material-clean' ? 'M' : preset.id === 'fluent' ? 'F' : preset.id === 'metro' ? 'W' : 'Ø'}</span>
      <span className="motion-library-preset__copy">
        <strong>{motionPresetLabel(preset, vi)}</strong>
        <small>{motionPresetDescription(preset, vi)}</small>
      </span>
      {preset.recommended ? <em>{vi ? 'MẶC ĐỊNH' : 'DEFAULT'}</em> : null}
    </button>
  );
}

function SlotRow({ slot, value, language, onChange, onPreview }) {
  const vi = language !== 'en';
  const definition = MOTION_LIBRARY[slot];
  const selected = definition.options.find((entry) => entry.id === value) || definition.options[0];
  return (
    <div className="motion-slot-row">
      <div className="motion-slot-row__identity">
        <span className="motion-slot-row__icon">{definition.icon}</span>
        <div>
          <strong>{vi ? definition.labelVi : definition.label}</strong>
          <small>{vi ? definition.descriptionVi : definition.descriptionVi}</small>
        </div>
      </div>
      <div className="motion-slot-row__preview"><EffectGlyph slot={slot} effect={value} /></div>
      <label className="motion-slot-row__select">
        <span>{vi ? 'Hiệu ứng' : 'Effect'}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {definition.options.map((entry) => <option key={entry.id} value={entry.id}>{motionOptionLabel(entry, vi)}</option>)}
        </select>
        <small>{motionOptionDescription(selected, vi)}</small>
      </label>
      <button type="button" className="motion-slot-row__test" onClick={onPreview}>{vi ? 'Xem thử' : 'Preview'}</button>
    </div>
  );
}

export default function GlobalMotionAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const initial = getGlobalMotionConfig();
  const [draft, setDraft] = useState(() => getGlobalMotionDraft() || initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState('checking');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewTick, setPreviewTick] = useState(1);
  const savedRef = useRef(initial);

  const dirty = useMemo(() => !sameConfig(draft, saved), [draft, saved]);
  const currentPreset = GLOBAL_MOTION_PRESETS.find((preset) => preset.id === draft.preset);

  useEffect(() => {
    let alive = true;
    Promise.all([loadGlobalMotionConfigFromServer(), listGlobalMotionHistory(8)]).then(([result, historyResult]) => {
      if (!alive) return;
      const config = result.config || getGlobalMotionConfig();
      savedRef.current = config;
      setSaved(config);
      const localDraft = getGlobalMotionDraft();
      setDraft(localDraft || config);
      if (localDraft) applyGlobalMotionConfig(localDraft, { persist: false, source: 'admin-draft', broadcast: false });
      setStatus(result.ok && !result.legacySchema ? 'synced' : (result.legacySchema || result.unavailable ? 'setup' : 'local'));
      setHistory(historyResult.items || []);
    });

    const onMotion = (event) => {
      const config = event?.detail?.config;
      const source = String(event?.detail?.source || '');
      if (!config || source.startsWith('admin-')) return;
      savedRef.current = config;
      setSaved(config);
      if (!dirty) setDraft(config);
    };
    window.addEventListener(GLOBAL_MOTION_EVENT, onMotion);
    return () => {
      alive = false;
      window.removeEventListener(GLOBAL_MOTION_EVENT, onMotion);
      applyGlobalMotionConfig(savedRef.current, { persist: false, source: 'admin-preview-cleanup', broadcast: false });
    };
  }, []);

  function preview(next, message = '') {
    const normalized = normalizeGlobalMotionConfig(next);
    setDraft(normalized);
    applyGlobalMotionConfig(normalized, { persist: false, source: 'admin-preview', broadcast: false });
    setPreviewTick((value) => value + 1);
    if (message) setNotice(message);
  }

  function choosePreset(id) {
    preview(configFromMotionPreset(id), vi ? 'Đang xem thử bộ phối trên phiên Admin. Chưa thay đổi site thật.' : 'Previewing this mix in the Admin session only.');
  }

  function updateSlot(slot, effect) {
    preview({ ...draft, preset: 'custom', slots: { ...draft.slots, [slot]: effect } });
  }

  function updateMeta(key, value) {
    preview({ ...draft, preset: 'custom', [key]: value });
  }

  function saveDraft() {
    const next = saveGlobalMotionDraft(draft);
    setDraft(next);
    setNotice(vi ? 'Đã lưu bản nháp trên thiết bị Admin. Giáo viên và khách chưa nhận thay đổi này.' : 'Draft saved on this Admin device. Teachers and guests are unchanged.');
  }

  function restorePublished() {
    preview(saved, vi ? 'Đã quay lại cấu hình đang xuất bản. Chưa ghi thay đổi mới lên máy chủ.' : 'Restored the currently published configuration locally.');
  }

  async function publish() {
    setBusy(true);
    setNotice('');
    try {
      const result = await saveGlobalMotionConfig(draft, currentUser);
      if (result.ok) {
        savedRef.current = result.config;
        setSaved(result.config);
        setDraft(result.config);
        setStatus('synced');
        setNotice(vi
          ? 'Đã xuất bản toàn hệ thống. Teacher đang mở Brian sẽ nhận qua Realtime; guest và người chưa có tài khoản cũng đọc cùng cấu hình public.'
          : 'Published site-wide. Open teacher sessions receive it via Realtime, and guests read the same public configuration.');
        const nextHistory = await listGlobalMotionHistory(8);
        setHistory(nextHistory.items || []);
      } else {
        setStatus(result.unavailable || result.legacySchema ? 'setup' : 'local');
        setNotice(result.message || (vi ? 'Chưa thể xuất bản toàn hệ thống.' : 'Could not publish site-wide.'));
      }
    } finally { setBusy(false); }
  }

  async function restoreHistory(entry) {
    setBusy(true);
    setNotice('');
    try {
      const result = await restoreGlobalMotionHistory(entry, currentUser);
      if (result.ok) {
        savedRef.current = result.config;
        setSaved(result.config);
        setDraft(result.config);
        setStatus('synced');
        setPreviewTick((value) => value + 1);
        setNotice(vi ? 'Đã khôi phục phiên bản và xuất bản lại toàn hệ thống.' : 'Version restored and republished site-wide.');
        const nextHistory = await listGlobalMotionHistory(8);
        setHistory(nextHistory.items || []);
      } else setNotice(result.message || (vi ? 'Không thể khôi phục phiên bản.' : 'Could not restore version.'));
    } finally { setBusy(false); }
  }

  return (
    <section className="motion-library" id="admin-global-motion" aria-labelledby="motion-library-title">
      <header className="motion-library__hero">
        <div className="motion-library__hero-copy">
          <span className="motion-library__kicker">MOTION LIBRARY · GLOBAL EXPERIENCE</span>
          <h2 id="motion-library-title">{vi ? 'Kho hiệu ứng toàn hệ thống' : 'System-wide motion library'}</h2>
          <p>{vi
            ? 'Phối riêng hiệu ứng cho từng thành phần giao diện. Preset chỉ là điểm bắt đầu; cấu hình xuất bản là một bộ motion duy nhất cho Admin, giáo viên và cả người chưa đăng nhập.'
            : 'Compose motion per interface component. Presets are starting points; the published configuration is shared by admins, teachers and signed-out visitors.'}</p>
        </div>
        <div className={`motion-library__status is-${status}`}>
          <span />
          {status === 'synced'
            ? (vi ? 'PUBLIC · ĐỒNG BỘ TOÀN SITE' : 'PUBLIC · SITE-WIDE')
            : status === 'setup'
              ? (vi ? 'CẦN MIGRATION V2' : 'V2 MIGRATION REQUIRED')
              : status === 'checking'
                ? (vi ? 'ĐANG KIỂM TRA' : 'CHECKING')
                : (vi ? 'CHỈ CỤC BỘ' : 'LOCAL ONLY')}
        </div>
      </header>

      <div className="motion-library__preset-section">
        <div className="motion-library__section-head">
          <div><span>01</span><strong>{vi ? 'Bộ phối nhanh' : 'Quick mixes'}</strong><small>{vi ? 'Chọn một phong cách rồi tinh chỉnh từng thành phần bên dưới.' : 'Choose a style, then refine each component below.'}</small></div>
          <b>{currentPreset ? motionPresetLabel(currentPreset, vi) : (vi ? 'Tùy chỉnh' : 'Custom')}</b>
        </div>
        <div className="motion-library__presets">
          {GLOBAL_MOTION_PRESETS.map((preset) => <PresetCard key={preset.id} preset={preset} active={draft.preset === preset.id} language={language} onClick={() => choosePreset(preset.id)} />)}
        </div>
      </div>

      <div className="motion-library__workspace">
        <div className="motion-library__composer">
          <div className="motion-library__section-head">
            <div><span>02</span><strong>{vi ? 'Phối theo thành phần' : 'Component composer'}</strong><small>{vi ? 'Mỗi slot hoạt động độc lập, không còn một preset ép toàn bộ website.' : 'Each slot is independent; no single preset forces the whole site.'}</small></div>
          </div>
          <div className="motion-library__slots">
            {SLOT_ORDER.map((slot) => (
              <SlotRow key={slot} slot={slot} value={draft.slots[slot]} language={language} onChange={(effect) => updateSlot(slot, effect)} onPreview={() => preview(draft, vi ? `Đang xem thử: ${MOTION_LIBRARY[slot].labelVi}.` : `Previewing ${MOTION_LIBRARY[slot].label}.`)} />
            ))}
          </div>
        </div>

        <aside className="motion-library__preview-column">
          <MotionPlayground draft={draft} tick={previewTick} language={language} />
          <div className="motion-library__timing">
            <div className="motion-library__section-head compact"><div><span>03</span><strong>{vi ? 'Nhịp chuyển động' : 'Motion timing'}</strong></div></div>
            <label><span>{vi ? 'Tốc độ toàn hệ thống' : 'Global speed'}</span><select value={draft.speed} onChange={(event) => updateMeta('speed', event.target.value)}>{Object.entries(GLOBAL_MOTION_SPEEDS).map(([id, item]) => <option key={id} value={id}>{vi ? item.labelVi : item.label} · {item.base} ms</option>)}</select></label>
            <label><span>Easing</span><select value={draft.easing} onChange={(event) => updateMeta('easing', event.target.value)}>{Object.entries(GLOBAL_MOTION_EASINGS).map(([id, item]) => <option key={id} value={id}>{vi ? item.labelVi : item.label}</option>)}</select></label>
            <div className="motion-library__reduce"><span>ACCESSIBILITY</span><strong>{vi ? 'Reduce Motion luôn được ưu tiên' : 'Reduce Motion always wins'}</strong><small>{vi ? 'Nếu thiết bị yêu cầu giảm chuyển động, Brian tự tắt animation mà không cần thay cấu hình đã xuất bản.' : 'When the device requests reduced motion, Brian disables animation without changing the published mix.'}</small></div>
          </div>
        </aside>
      </div>

      <footer className="motion-library__publish">
        <div className="motion-library__publish-copy">
          <span>{dirty ? (vi ? 'CHƯA XUẤT BẢN' : 'UNPUBLISHED CHANGES') : (vi ? 'ĐANG KHỚP BẢN PUBLIC' : 'MATCHES PUBLIC VERSION')}</span>
          <strong>{draft.preset === 'custom' ? (vi ? 'Bộ phối tùy chỉnh' : 'Custom mix') : (motionPresetLabel(currentPreset, vi) || 'Motion mix')}</strong>
          <small>{vi ? 'Preview không ghi vào local config public. Chỉ nút “Xuất bản toàn hệ thống” mới thay đổi trải nghiệm của người dùng.' : 'Preview does not modify the public config. Only Publish changes the user experience.'}</small>
        </div>
        <div className="motion-library__publish-actions">
          <button type="button" className="secondary" onClick={restorePublished} disabled={!dirty || busy}>{vi ? 'Hoàn tác preview' : 'Undo preview'}</button>
          <button type="button" className="secondary" onClick={saveDraft} disabled={busy}>{vi ? 'Lưu bản nháp' : 'Save draft'}</button>
          <button type="button" className="history" onClick={() => setHistoryOpen((value) => !value)}>{vi ? `Lịch sử (${history.length})` : `History (${history.length})`}</button>
          <button type="button" className="primary" onClick={publish} disabled={busy || (!dirty && status === 'synced')}>{busy ? (vi ? 'Đang xử lý…' : 'Working…') : (vi ? 'Xuất bản toàn hệ thống' : 'Publish site-wide')}</button>
        </div>
      </footer>

      {notice ? <div className={`motion-library__notice ${status === 'setup' ? 'is-warning' : ''}`}>{notice}</div> : null}

      {historyOpen ? (
        <section className="motion-library__history">
          <div className="motion-library__section-head"><div><span>04</span><strong>{vi ? 'Lịch sử phiên bản' : 'Version history'}</strong><small>{vi ? 'Khôi phục một cấu hình cũ sẽ đồng thời xuất bản nó thành phiên bản mới.' : 'Restoring an old configuration republishes it as the newest version.'}</small></div></div>
          {history.length ? history.map((entry) => {
            const historyPreset = GLOBAL_MOTION_PRESETS.find((preset) => preset.id === entry.config?.preset);
            return (
              <article key={entry.id}>
                <div><strong>{entry.config?.preset === 'custom' ? (vi ? 'Bộ phối tùy chỉnh' : 'Custom mix') : (motionPresetLabel(historyPreset, vi) || entry.config?.preset)}</strong><span>{formatTime(entry.created_at, vi)}</span><small>{entry.updated_by || 'Admin'}</small></div>
                <button type="button" onClick={() => restoreHistory(entry)} disabled={busy}>{vi ? 'Khôi phục' : 'Restore'}</button>
              </article>
            );
          }) : <p className="motion-library__history-empty">{vi ? 'Chưa có lịch sử hoặc migration v2 chưa được chạy.' : 'No history yet, or the v2 migration has not been installed.'}</p>}
        </section>
      ) : null}

      {status === 'setup' ? (
        <div className="motion-library__setup-note">
          <strong>{vi ? 'Cần nâng cấp Supabase Motion Library v2' : 'Supabase Motion Library v2 migration required'}</strong>
          <span>{vi
            ? 'Chạy lại file supabase/brian_global_motion_settings.sql. Migration mới thêm JSON config, lịch sử phiên bản và quyền SELECT cho anon để người chưa đăng nhập cũng nhận đúng motion toàn site.'
            : 'Run supabase/brian_global_motion_settings.sql again. The migration adds JSON config, version history and anon SELECT so signed-out visitors receive the same site-wide motion.'}</span>
        </div>
      ) : null}
    </section>
  );
}
