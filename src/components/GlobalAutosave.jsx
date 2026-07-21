import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deleteDraft, emitAutosaveState, readDraft, writeDraft } from '../utils/autosave.js';
import { addVersion, clearVersions, listVersions, removeVersion } from '../utils/versionHistory.js';

const MAX_VALUE_LENGTH = 120000;
const MAX_FIELDS = 240;
const RESTORE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function routeKey(route, selectedTool) {
  return route === 'tool' && selectedTool?.slug ? `tool/${selectedTool.slug}` : route;
}

function fieldSelector(el, index) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.getAttribute('data-autosave-key')) return `[data-autosave-key="${CSS.escape(el.getAttribute('data-autosave-key'))}"]`;
  if (el.name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
  return `[data-bes-autosave-index="${index}"]`;
}

function eligible(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[data-autosave-ignore="true"], .ai-messenger-window, .global-command-palette')) return false;
  if (el instanceof HTMLInputElement) {
    const type = String(el.type || 'text').toLowerCase();
    if (['password', 'file', 'hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return false;
  }
  return el.matches('textarea, select, input, [contenteditable="true"]');
}

function collectSnapshot(root) {
  if (!root) return null;
  const fields = [];
  const nodes = [...root.querySelectorAll('textarea, select, input, [contenteditable="true"]')].filter(eligible).slice(0, MAX_FIELDS);
  nodes.forEach((el, index) => {
    if (!el.id && !el.name && !el.getAttribute('data-autosave-key')) el.setAttribute('data-bes-autosave-index', String(index));
    let value = '';
    let checked = null;
    if (el instanceof HTMLInputElement && ['checkbox', 'radio'].includes(el.type)) checked = el.checked;
    else if (el.isContentEditable) value = el.innerHTML;
    else value = el.value;
    value = String(value ?? '').slice(0, MAX_VALUE_LENGTH);
    fields.push({ selector: fieldSelector(el, index), value, checked, tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '' });
  });
  return {
    savedAt: Date.now(),
    url: window.location.hash,
    title: document.title,
    scrollY: window.scrollY,
    fields,
  };
}

function hasMeaningfulData(snapshot) {
  return Boolean(snapshot?.fields?.some((field) => field.checked === true || String(field.value || '').trim().length > 0));
}

function restoreSnapshot(root, snapshot) {
  let restored = 0;
  (snapshot?.fields || []).forEach((field) => {
    let el = null;
    try { el = root.querySelector(field.selector); } catch { el = null; }
    if (!el || !eligible(el)) return;
    if (field.checked !== null && el instanceof HTMLInputElement) el.checked = Boolean(field.checked);
    else if (el.isContentEditable) el.innerHTML = field.value || '';
    else el.value = field.value || '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    restored += 1;
  });
  if (Number.isFinite(snapshot?.scrollY)) window.setTimeout(() => window.scrollTo({ top: snapshot.scrollY, behavior: 'smooth' }), 120);
  return restored;
}

export default function GlobalAutosave({ route, selectedTool, currentUser, language = 'vi' }) {
  const key = useMemo(() => routeKey(route, selectedTool), [route, selectedTool?.slug]);
  const [state, setState] = useState({ status: 'idle', savedAt: 0, message: '' });
  const [recoverable, setRecoverable] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState(() => listVersions(currentUser, key));
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef(null);
  const lastSnapshotRef = useRef('');

  const save = useCallback((reason = 'interval') => {
    const root = document.querySelector('main.wp8-page-stage');
    const snapshot = collectSnapshot(root);
    if (!hasMeaningfulData(snapshot)) {
      dirtyRef.current = false;
      return false;
    }
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSnapshotRef.current && reason !== 'beforeunload') {
      dirtyRef.current = false;
      return true;
    }
    setState((current) => ({ ...current, status: 'saving', message: language === 'vi' ? 'Đang lưu bản nháp…' : 'Saving draft…' }));
    const ok = writeDraft(currentUser, key, snapshot);
    if (ok) {
      lastSnapshotRef.current = serialized;
      dirtyRef.current = false;
      setState({ status: 'saved', savedAt: snapshot.savedAt, message: language === 'vi' ? 'Đã lưu bản nháp' : 'Draft saved' });
      const nextVersions = addVersion(currentUser, key, snapshot, reason);
      setVersions(nextVersions);
      emitAutosaveState({ status: 'saved', key, savedAt: snapshot.savedAt, versionCount: nextVersions.length });
    } else {
      setState({ status: 'error', savedAt: 0, message: language === 'vi' ? 'Không thể lưu cục bộ' : 'Local save failed' });
      emitAutosaveState({ status: 'error', key });
    }
    return ok;
  }, [currentUser?.id, currentUser?.email, key, language]);

  useEffect(() => {
    lastSnapshotRef.current = '';
    dirtyRef.current = false;
    setState({ status: 'idle', savedAt: 0, message: '' });
    setRecoverable(null);
    setHistoryOpen(false);
    setVersions(listVersions(currentUser, key));
    const saved = readDraft(currentUser, key);
    if (saved && Date.now() - Number(saved.savedAt || 0) < RESTORE_MAX_AGE && hasMeaningfulData(saved)) {
      window.setTimeout(() => setRecoverable(saved), 450);
    }
  }, [currentUser?.id, currentUser?.email, key]);

  useEffect(() => {
    const root = document.querySelector('main.wp8-page-stage');
    if (!root) return undefined;
    const onInput = (event) => {
      if (!eligible(event.target)) return;
      dirtyRef.current = true;
      setState((current) => ({ ...current, status: 'dirty', message: language === 'vi' ? 'Có thay đổi chưa lưu' : 'Unsaved changes' }));
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => save('debounce'), 1800);
    };
    const onBeforeUnload = () => { if (dirtyRef.current) save('beforeunload'); };
    root.addEventListener('input', onInput, true);
    root.addEventListener('change', onInput, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    const interval = window.setInterval(() => { if (dirtyRef.current) save('interval'); }, 15000);
    return () => {
      root.removeEventListener('input', onInput, true);
      root.removeEventListener('change', onInput, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.clearInterval(interval);
      window.clearTimeout(saveTimerRef.current);
      if (dirtyRef.current) save('cleanup');
    };
  }, [key, save, language]);

  const restore = () => {
    const root = document.querySelector('main.wp8-page-stage');
    const count = restoreSnapshot(root, recoverable);
    setRecoverable(null);
    setState({ status: 'restored', savedAt: recoverable?.savedAt || Date.now(), message: language === 'vi' ? `Đã khôi phục ${count} trường` : `Restored ${count} fields` });
  };

  const restoreVersion = (version) => {
    const root = document.querySelector('main.wp8-page-stage');
    const count = restoreSnapshot(root, version?.snapshot);
    setHistoryOpen(false);
    setState({ status: 'restored', savedAt: version?.savedAt || Date.now(), message: language === 'vi' ? `Đã khôi phục phiên bản (${count} trường)` : `Version restored (${count} fields)` });
  };

  const discard = () => {
    deleteDraft(currentUser, key);
    setRecoverable(null);
    setState({ status: 'idle', savedAt: 0, message: '' });
  };

  if (!currentUser) return null;

  return (
    <>
      {recoverable ? (
        <aside className="bes-draft-recovery" role="status">
          <div>
            <strong>{language === 'vi' ? 'Tìm thấy bản nháp chưa khôi phục' : 'Recoverable draft found'}</strong>
            <span>{new Date(recoverable.savedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</span>
          </div>
          <button type="button" className="primary" onClick={restore}>{language === 'vi' ? 'Khôi phục' : 'Restore'}</button>
          <button type="button" onClick={discard}>{language === 'vi' ? 'Bỏ bản nháp' : 'Discard'}</button>
        </aside>
      ) : null}
      {state.status !== 'idle' || versions.length > 0 ? (
        <div className="bes-autosave-cluster">
          <button type="button" className={`bes-autosave-status is-${state.status}`} onClick={() => save('manual')} title={language === 'vi' ? 'Bấm để lưu ngay' : 'Click to save now'}>
            <span aria-hidden="true">{state.status === 'saving' ? '↻' : state.status === 'error' ? '!' : state.status === 'dirty' ? '•' : '✓'}</span>
            <b>{state.message}</b>
            {state.savedAt ? <small>{new Date(state.savedAt).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</small> : null}
          </button>
          <button type="button" className="bes-version-history-toggle" onClick={() => { setVersions(listVersions(currentUser, key)); setHistoryOpen(true); }} title={language === 'vi' ? 'Lịch sử phiên bản' : 'Version history'}>↶ <b>{versions.length}</b></button>
        </div>
      ) : null}
      {historyOpen ? (
        <div className="bes-version-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false); }}>
          <section className="bes-version-panel" role="dialog" aria-modal="true">
            <header>
              <div><small>VERSION HISTORY</small><h2>{language === 'vi' ? 'Lịch sử bản nháp' : 'Draft version history'}</h2><p>{language === 'vi' ? 'Tối đa 20 phiên bản gần nhất trên thiết bị này.' : 'Up to 20 recent versions on this device.'}</p></div>
              <button type="button" onClick={() => setHistoryOpen(false)}>×</button>
            </header>
            <div className="bes-version-list">
              {versions.length ? versions.map((version, index) => (
                <article key={version.id}>
                  <span className="bes-version-number">v{versions.length - index}</span>
                  <div><strong>{new Date(version.savedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</strong><small>{version.fieldCount} {language === 'vi' ? 'trường' : 'fields'} · {version.reason}</small></div>
                  <button type="button" className="primary" onClick={() => restoreVersion(version)}>{language === 'vi' ? 'Khôi phục' : 'Restore'}</button>
                  <button type="button" onClick={() => setVersions(removeVersion(currentUser, key, version.id))} aria-label={language === 'vi' ? 'Xóa phiên bản' : 'Delete version'}>×</button>
                </article>
              )) : <p className="bes-version-empty">{language === 'vi' ? 'Chưa có phiên bản nào.' : 'No versions yet.'}</p>}
            </div>
            {versions.length ? <footer><button type="button" onClick={() => { clearVersions(currentUser, key); setVersions([]); }}>{language === 'vi' ? 'Xóa toàn bộ lịch sử' : 'Clear all history'}</button></footer> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
