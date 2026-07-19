import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_SHARED_CHATBOTS,
  SHARED_CHATBOT_MAX,
  isSharedChatbotManager,
  loadSharedChatbots,
  normalizeChatbotUrl,
  normalizeSharedChatbots,
  readSharedChatbotPreference,
  saveSharedChatbotPreference,
  saveSharedChatbots,
  subscribeSharedChatbots,
} from '../utils/sharedChatbots.js';
import '../styles/shared-chatbot-drawer-v1167.css';

const SIZE_ORDER = ['compact', 'standard', 'wide'];

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '');
  }
}

function initials(name) {
  const words = String(name || 'AI').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 2) || 'AI').toUpperCase();
}

function blankDraft() {
  return {
    id: '',
    name: '',
    url: '',
    enabled: true,
    isDefault: false,
  };
}

function activeFrom(items, requestedId) {
  const enabled = items.filter((item) => item.enabled);
  return enabled.find((item) => item.id === requestedId)
    || enabled.find((item) => item.isDefault)
    || enabled[0]
    || items[0]
    || DEFAULT_SHARED_CHATBOTS[0];
}

export default function SharedChatbotDrawer({ currentUser, language = 'vi' }) {
  const vi = language === 'vi';
  const manager = isSharedChatbotManager(currentUser);
  const initialPreference = useMemo(() => readSharedChatbotPreference(currentUser), [currentUser?.id, currentUser?.email]);

  const [open, setOpen] = useState(initialPreference.open);
  const [size, setSize] = useState(initialPreference.size);
  const [activeId, setActiveId] = useState(initialPreference.activeId);
  const [chatbots, setChatbots] = useState(() => DEFAULT_SHARED_CHATBOTS.map((item) => ({ ...item })));
  const [loading, setLoading] = useState(true);
  const [cloudReady, setCloudReady] = useState(false);
  const [sourceMessage, setSourceMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [managerOpen, setManagerOpen] = useState(false);
  const [workingItems, setWorkingItems] = useState([]);
  const [draft, setDraft] = useState(blankDraft);
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => activeFrom(chatbots, activeId), [chatbots, activeId]);
  const visibleChatbots = useMemo(() => chatbots.filter((item) => item.enabled), [chatbots]);

  useEffect(() => {
    const preference = readSharedChatbotPreference(currentUser);
    setOpen(preference.open);
    setSize(preference.size);
    setActiveId(preference.activeId);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadSharedChatbots()
      .then((result) => {
        if (!alive) return;
        setChatbots(result.chatbots);
        setCloudReady(result.cloudReady);
        setSourceMessage(result.message || '');
      })
      .catch((error) => {
        if (!alive) return;
        setSourceMessage(error?.message || String(error));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    const unsubscribe = subscribeSharedChatbots((next, source) => {
      if (!alive) return;
      setChatbots(next);
      setCloudReady((previous) => source === 'cloud' || previous);
    });

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!active?.id) return;
    if (activeId !== active.id) setActiveId(active.id);
  }, [active?.id, activeId]);

  useEffect(() => {
    saveSharedChatbotPreference(currentUser, { activeId: active?.id || activeId, open, size });
  }, [currentUser?.id, currentUser?.email, active?.id, activeId, open, size]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onToggle = () => setOpen((value) => !value);
    window.addEventListener('bes-chatbot-drawer-open', onOpen);
    window.addEventListener('bes-chatbot-drawer-toggle', onToggle);
    return () => {
      window.removeEventListener('bes-chatbot-drawer-open', onOpen);
      window.removeEventListener('bes-chatbot-drawer-toggle', onToggle);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (managerOpen) {
        setManagerOpen(false);
        return;
      }
      if (open) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, managerOpen]);

  useEffect(() => {
    document.documentElement.dataset.chatbotDrawer = open ? 'open' : 'closed';
    return () => {
      delete document.documentElement.dataset.chatbotDrawer;
    };
  }, [open]);

  const selectChatbot = (id) => {
    const next = chatbots.find((item) => item.id === id && item.enabled);
    if (!next) return;
    setActiveId(id);
    setNotice('');
  };

  const cycleSize = () => {
    const index = SIZE_ORDER.indexOf(size);
    setSize(SIZE_ORDER[(index + 1) % SIZE_ORDER.length]);
  };

  const openSeparate = () => {
    if (!active?.url) return;
    const popup = window.open(active.url, '_blank', 'noopener,noreferrer');
    if (!popup) setNotice(vi ? 'Trình duyệt đang chặn cửa sổ mới.' : 'The browser blocked the new window.');
  };

  const beginManagement = () => {
    setWorkingItems(chatbots.map((item) => ({ ...item })));
    setDraft(blankDraft());
    setManagerOpen(true);
    setNotice('');
  };

  const editItem = (item) => {
    setDraft({ ...item });
  };

  const saveDraft = (event) => {
    event.preventDefault();
    try {
      const name = String(draft.name || '').trim();
      if (!name) throw new Error(vi ? 'Hãy nhập tên chatbot.' : 'Enter a chatbot name.');
      const url = normalizeChatbotUrl(draft.url);
      const existingIndex = workingItems.findIndex((item) => item.id === draft.id);
      const item = {
        id: draft.id || `chatbot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.slice(0, 80),
        url,
        enabled: draft.enabled !== false,
        isDefault: draft.isDefault === true,
        sortOrder: existingIndex >= 0 ? existingIndex : workingItems.length,
      };

      if (existingIndex < 0 && workingItems.length >= SHARED_CHATBOT_MAX) {
        throw new Error(vi ? `Chỉ được lưu tối đa ${SHARED_CHATBOT_MAX} chatbot.` : `Only ${SHARED_CHATBOT_MAX} chatbots can be saved.`);
      }

      setWorkingItems((previous) => {
        const next = [...previous];
        if (existingIndex >= 0) next[existingIndex] = item;
        else next.push(item);
        if (item.isDefault) {
          return next.map((entry) => ({ ...entry, isDefault: entry.id === item.id }));
        }
        return next;
      });
      setDraft(blankDraft());
    } catch (error) {
      setNotice(error?.message || String(error));
    }
  };

  const removeWorkingItem = (id) => {
    if (workingItems.length <= 1) {
      setNotice(vi ? 'Phải giữ lại ít nhất một chatbot.' : 'Keep at least one chatbot.');
      return;
    }
    setWorkingItems((previous) => normalizeSharedChatbots(previous.filter((item) => item.id !== id)));
    if (draft.id === id) setDraft(blankDraft());
  };

  const toggleWorkingItem = (id) => {
    setWorkingItems((previous) => normalizeSharedChatbots(previous.map((item) => (
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ))));
  };

  const defaultWorkingItem = (id) => {
    setWorkingItems((previous) => normalizeSharedChatbots(previous.map((item) => ({
      ...item,
      enabled: item.id === id ? true : item.enabled,
      isDefault: item.id === id,
    }))));
  };

  const moveWorkingItem = (id, direction) => {
    setWorkingItems((previous) => {
      const index = previous.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }));
    });
  };

  const saveManagement = async () => {
    setSaving(true);
    setNotice('');
    try {
      const result = await saveSharedChatbots(currentUser, workingItems);
      setChatbots(result.chatbots);
      setCloudReady(result.cloudReady);
      setSourceMessage(result.message || '');
      setManagerOpen(false);
      setNotice(result.cloudReady
        ? (vi ? 'Đã lưu cấu hình chatbot cho toàn tổ.' : 'Shared chatbot settings saved.')
        : (vi ? 'Đã lưu dự phòng trên máy này. Hãy chạy SQL Supabase để đồng bộ toàn tổ.' : 'Saved locally. Run the Supabase SQL to enable department sync.'));
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`shared-chatbot-layer ${open ? 'is-open' : ''}`}
      data-size={size}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="shared-chatbot-backdrop"
        aria-label={vi ? 'Đóng chatbot' : 'Close chatbot'}
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />

      <aside className="shared-chatbot-drawer" role="dialog" aria-modal="true" inert={open ? undefined : true} aria-label={vi ? 'Chatbot dùng chung' : 'Shared chatbot'}>
        <header className="shared-chatbot-header">
          <div className="shared-chatbot-brand">
            <span className="shared-chatbot-brand-icon">{initials(active?.name)}</span>
            <div>
              <small>{vi ? 'CHATBOT DÙNG CHUNG' : 'SHARED CHATBOT'}</small>
              <strong>{active?.name || 'NoTrack AI'}</strong>
              <span>{domainOf(active?.url)}</span>
            </div>
          </div>
          <div className="shared-chatbot-header-actions">
            <button type="button" onClick={cycleSize} title={vi ? 'Đổi kích thước drawer' : 'Change drawer size'}>↔</button>
            <button type="button" onClick={() => setOpen(false)} aria-label={vi ? 'Đóng' : 'Close'}>×</button>
          </div>
        </header>

        <section className="shared-chatbot-toolbar">
          <label>
            <span>{vi ? 'Đang sử dụng' : 'Using'}</span>
            <select value={active?.id || ''} onChange={(event) => selectChatbot(event.target.value)} disabled={loading || !visibleChatbots.length}>
              {visibleChatbots.map((item) => (
                <option key={item.id} value={item.id}>{item.name}{item.isDefault ? (vi ? ' · Mặc định' : ' · Default') : ''}</option>
              ))}
            </select>
          </label>
          <div className="shared-chatbot-toolbar-buttons">
            {manager ? <button type="button" onClick={beginManagement}>⚙ {vi ? 'Quản lý' : 'Manage'}</button> : null}
            <button type="button" onClick={() => setReloadToken((value) => value + 1)}>↻ {vi ? 'Tải lại' : 'Reload'}</button>
            <button type="button" onClick={openSeparate}>↗ {vi ? 'Mở riêng' : 'Open separately'}</button>
          </div>
        </section>

        <div className="shared-chatbot-status">
          <span className={cloudReady ? 'is-cloud' : 'is-local'} />
          <strong>{cloudReady ? (vi ? 'Đồng bộ TTCM' : 'TTCM cloud sync') : (vi ? 'Chế độ dự phòng' : 'Fallback mode')}</strong>
          <small>{cloudReady
            ? (vi ? 'Cấu hình chung được cập nhật theo thời gian thực.' : 'Shared settings update in real time.')
            : (sourceMessage || (vi ? 'Chưa có bảng cấu hình chatbot trên Supabase.' : 'Supabase chatbot settings are not ready.'))}</small>
        </div>

        {notice ? <div className="shared-chatbot-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')}>×</button></div> : null}

        <div className="shared-chatbot-frame-wrap">
          <iframe
            key={`${active?.id || 'default'}:${reloadToken}`}
            src={active?.url || DEFAULT_SHARED_CHATBOTS[0].url}
            title={active?.name || 'NoTrack AI'}
            allow="fullscreen; microphone; camera; clipboard-read; clipboard-write"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          {loading ? <div className="shared-chatbot-loading">{vi ? 'Đang tải cấu hình chatbot…' : 'Loading chatbot settings…'}</div> : null}
        </div>

        <footer className="shared-chatbot-footer">
          <span>🔒 {vi ? 'Chatbot hoạt động độc lập với API và lịch sử của Brian.' : 'This chatbot is independent from Brian AI keys and history.'}</span>
          <button type="button" onClick={() => setOpen(false)}>{vi ? 'Thu drawer' : 'Hide drawer'}</button>
        </footer>

        {managerOpen && manager ? (
          <section className="shared-chatbot-manager" aria-label={vi ? 'Quản lý chatbot' : 'Manage chatbots'}>
            <header>
              <div>
                <small>TTCM / ADMIN</small>
                <h2>{vi ? 'Quản lý chatbot dùng chung' : 'Manage shared chatbots'}</h2>
                <p>{vi ? 'Danh sách này được chia sẻ cho mọi tài khoản giáo viên đã đăng nhập.' : 'This list is shared with every signed-in teacher.'}</p>
              </div>
              <button type="button" onClick={() => setManagerOpen(false)}>×</button>
            </header>

            <div className="shared-chatbot-manager-body">
              <div className="shared-chatbot-manager-list">
                <div className="shared-chatbot-manager-list-title">
                  <strong>{vi ? 'Danh sách toàn tổ' : 'Department list'}</strong>
                  <span>{workingItems.length}/{SHARED_CHATBOT_MAX}</span>
                </div>
                {workingItems.map((item, index) => (
                  <article key={item.id} className={!item.enabled ? 'is-disabled' : ''}>
                    <span className="shared-chatbot-item-icon">{initials(item.name)}</span>
                    <div className="shared-chatbot-item-copy">
                      <strong>{item.name}</strong>
                      <small>{domainOf(item.url)}</small>
                      <div>
                        {item.isDefault ? <b>{vi ? 'Mặc định' : 'Default'}</b> : null}
                        {!item.enabled ? <b>{vi ? 'Đang ẩn' : 'Hidden'}</b> : null}
                      </div>
                    </div>
                    <div className="shared-chatbot-item-actions">
                      <button type="button" onClick={() => moveWorkingItem(item.id, -1)} disabled={index === 0}>↑</button>
                      <button type="button" onClick={() => moveWorkingItem(item.id, 1)} disabled={index === workingItems.length - 1}>↓</button>
                      <button type="button" onClick={() => defaultWorkingItem(item.id)}>★</button>
                      <button type="button" onClick={() => toggleWorkingItem(item.id)}>{item.enabled ? '◉' : '○'}</button>
                      <button type="button" onClick={() => editItem(item)}>✎</button>
                      <button type="button" className="danger" onClick={() => removeWorkingItem(item.id)}>×</button>
                    </div>
                  </article>
                ))}
              </div>

              <form className="shared-chatbot-form" onSubmit={saveDraft}>
                <div>
                  <small>{draft.id ? (vi ? 'CHỈNH SỬA CHATBOT' : 'EDIT CHATBOT') : (vi ? 'THÊM CHATBOT' : 'ADD CHATBOT')}</small>
                  <h3>{draft.id ? draft.name : (vi ? 'Website chatbot mới' : 'New chatbot website')}</h3>
                </div>
                <label>
                  <span>{vi ? 'Tên chatbot' : 'Chatbot name'}</span>
                  <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="NoTrack AI" />
                </label>
                <label>
                  <span>{vi ? 'Đường dẫn website' : 'Website URL'}</span>
                  <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://notrack.ai/" />
                </label>
                <label className="shared-chatbot-check">
                  <input type="checkbox" checked={draft.enabled !== false} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
                  <span>{vi ? 'Cho phép giáo viên sử dụng' : 'Available to teachers'}</span>
                </label>
                <label className="shared-chatbot-check">
                  <input type="checkbox" checked={draft.isDefault === true} onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })} />
                  <span>{vi ? 'Đặt làm chatbot mặc định' : 'Set as default chatbot'}</span>
                </label>
                <div className="shared-chatbot-form-actions">
                  {draft.id ? <button type="button" onClick={() => setDraft(blankDraft)}>{vi ? 'Huỷ sửa' : 'Cancel edit'}</button> : null}
                  <button type="submit" className="primary">{draft.id ? (vi ? 'Cập nhật' : 'Update') : (vi ? 'Thêm vào danh sách' : 'Add to list')}</button>
                </div>
                <p>ⓘ {vi ? 'Chỉ chấp nhận liên kết HTTP/HTTPS. Một số website có thể chặn iframe; khi đó dùng nút Mở riêng.' : 'Only HTTP/HTTPS URLs are accepted. Some websites block iframes; use Open separately in that case.'}</p>
              </form>
            </div>

            <footer>
              <button type="button" onClick={() => setManagerOpen(false)}>{vi ? 'Đóng' : 'Close'}</button>
              <button type="button" className="primary" disabled={saving} onClick={saveManagement}>
                {saving ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu cho toàn tổ' : 'Save for department')}
              </button>
            </footer>
          </section>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
