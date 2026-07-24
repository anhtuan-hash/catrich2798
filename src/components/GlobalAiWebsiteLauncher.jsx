import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  aiWebsiteVisibleForUser,
  canManageAiWebsites,
  loadAiWebsiteSettings,
  normalizeAiWebsiteTool,
  readAiWebsiteSettingsLocal,
  safeAiWebsiteUrl,
  saveAiWebsiteSettings,
  subscribeAiWebsiteSettings,
} from '../utils/aiWebsiteSettings.js';
import './GlobalAiWebsiteLauncher.css';

const EMPTY_TOOL = {
  name: '',
  url: '',
  icon: 'AI',
  description: '',
  audience: 'all',
  enabled: true,
  pinned: false,
};

function moveItem(items, index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function AiToolGlyph({ tool }) {
  return <span className="brian-ai-workspace__tool-icon" aria-hidden="true">{tool?.icon || 'AI'}</span>;
}

function preferenceKey(user) {
  return `bes-ai-hide-active-name-${String(user?.id || user?.email || 'guest')}`;
}

export default function GlobalAiWebsiteLauncher({ currentUser, language = 'vi' }) {
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [snapshot, setSnapshot] = useState(readAiWebsiteSettingsLocal);
  const [draftTools, setDraftTools] = useState(() => readAiWebsiteSettingsLocal().tools);
  const [newTool, setNewTool] = useState(EMPTY_TOOL);
  const [activeToolId, setActiveToolId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [hideActiveName, setHideActiveName] = useState(false);
  const rootRef = useRef(null);

  const vi = language !== 'en';
  const isManager = canManageAiWebsites(currentUser);
  const tools = snapshot.tools || [];

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => {
      const nextHost = document.querySelector('.brian-nav__actions');
      setHost((current) => current === nextHost ? current : nextHost);
    };
    findHost();
    const frame = window.requestAnimationFrame(findHost);
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;
    let active = true;
    setLoading(true);
    loadAiWebsiteSettings(currentUser)
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setDraftTools(next.tools.map((tool) => ({ ...tool })));
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        setNotice(String(error?.message || error));
        setLoading(false);
      });
    const unsubscribe = subscribeAiWebsiteSettings(currentUser, (next) => {
      if (!active) return;
      setSnapshot(next);
      if (!manageMode) setDraftTools(next.tools.map((tool) => ({ ...tool })));
      setLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role, manageMode]);

  useEffect(() => {
    if (!currentUser) return;
    try { setHideActiveName(localStorage.getItem(preferenceKey(currentUser)) === '1'); } catch { setHideActiveName(false); }
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    if (!isManager && manageMode) setManageMode(false);
  }, [isManager, manageMode]);

  const availableTools = useMemo(() => [...tools]
    .filter((tool) => aiWebsiteVisibleForUser(tool, currentUser))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned)), [currentUser, tools]);

  useEffect(() => {
    if (!availableTools.length) {
      setActiveToolId('');
      return;
    }
    if (!availableTools.some((tool) => tool.id === activeToolId)) setActiveToolId(availableTools[0].id);
  }, [activeToolId, availableTools]);

  const activeTool = useMemo(
    () => availableTools.find((tool) => tool.id === activeToolId) || availableTools[0] || null,
    [activeToolId, availableTools],
  );

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-ai-workspace-open');
    const closeEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (expanded) setExpanded(false);
      else if (manageMode) setManageMode(false);
      else setOpen(false);
    };
    window.addEventListener('keydown', closeEscape);
    return () => {
      document.documentElement.classList.remove('bes-ai-workspace-open');
      window.removeEventListener('keydown', closeEscape);
    };
  }, [expanded, manageMode, open]);

  if (!host || !currentUser) return null;

  const refreshCloud = async () => {
    setLoading(true);
    setNotice('');
    try {
      const next = await loadAiWebsiteSettings(currentUser);
      setSnapshot(next);
      if (!manageMode) setDraftTools(next.tools.map((tool) => ({ ...tool })));
    } catch (error) {
      setNotice(String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const openWorkspace = async () => {
    if (open) {
      setOpen(false);
      setManageMode(false);
      setExpanded(false);
      return;
    }
    setOpen(true);
    setManageMode(false);
    await refreshCloud();
  };

  const beginManage = () => {
    if (!isManager) return;
    setDraftTools(tools.map((tool) => ({ ...tool })));
    setManageMode(true);
    setNotice('');
  };

  const buildNewTool = () => {
    const url = safeAiWebsiteUrl(newTool.url);
    if (!newTool.name.trim() || !url) return null;
    return normalizeAiWebsiteTool({
      ...newTool,
      url,
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
  };

  const hasPendingNewToolInput = () => (
    Boolean(String(newTool.name || '').trim())
    || Boolean(String(newTool.url || '').trim())
    || Boolean(String(newTool.description || '').trim())
    || String(newTool.icon || '').trim().toUpperCase() !== 'AI'
    || newTool.audience !== 'all'
  );

  const saveConfiguration = async () => {
    if (!isManager || saving) return;

    const pendingTool = buildNewTool();
    if (hasPendingNewToolInput() && !pendingTool) {
      setNotice(vi
        ? 'Website đang nhập chưa đủ tên hoặc URL hợp lệ.'
        : 'The website being entered needs a valid name and URL.');
      return;
    }

    const nextTools = pendingTool ? [...draftTools, pendingTool] : [...draftTools];
    const invalidTool = nextTools.find((tool) => !String(tool?.name || '').trim() || !safeAiWebsiteUrl(tool?.url));
    if (invalidTool) {
      setNotice(vi
        ? `Website “${invalidTool.name || 'chưa đặt tên'}” có tên hoặc URL chưa hợp lệ.`
        : `“${invalidTool.name || 'Untitled'}” has an invalid name or URL.`);
      return;
    }

    const normalizedTools = nextTools.map((tool, index) => normalizeAiWebsiteTool({
      ...tool,
      url: safeAiWebsiteUrl(tool.url),
    }, index));

    setSaving(true);
    setNotice('');
    try {
      const result = await saveAiWebsiteSettings(currentUser, normalizedTools);
      if (result.snapshot.tools.length !== normalizedTools.length) {
        throw new Error(vi
          ? 'Supabase chưa trả lại đầy đủ danh sách vừa lưu.'
          : 'Supabase did not return the complete saved list.');
      }

      setSnapshot(result.snapshot);
      setDraftTools(result.snapshot.tools.map((tool) => ({ ...tool })));
      setNewTool({ ...EMPTY_TOOL });
      setActiveToolId(pendingTool?.id || result.snapshot.tools[0]?.id || '');
      setRefreshKey((value) => value + 1);
      setManageMode(false);
      setNotice(vi
        ? `Đã lưu và đồng bộ ${result.snapshot.tools.length} website cho toàn bộ giáo viên.`
        : `Saved and synced ${result.snapshot.tools.length} website(s) for all teachers.`);
      window.setTimeout(() => setNotice(''), 3200);
    } catch (error) {
      setNotice(String(error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  const addTool = () => {
    const tool = buildNewTool();
    if (!isManager || !tool) {
      setNotice(vi
        ? 'Vui lòng nhập đủ tên và URL hợp lệ.'
        : 'Enter a valid name and URL.');
      return;
    }
    setDraftTools((current) => [...current, tool]);
    setNewTool({ ...EMPTY_TOOL });
    setNotice(vi
      ? 'Đã thêm vào danh sách. Nhấn “Lưu và đồng bộ” để áp dụng.'
      : 'Added to the list. Choose “Save and sync” to apply it.');
  };

  const updateDraftTool = (id, patch) => {
    if (!isManager) return;
    setDraftTools((current) => current.map((tool) => tool.id === id ? { ...tool, ...patch } : tool));
  };

  const toggleHideActiveName = () => {
    const next = !hideActiveName;
    setHideActiveName(next);
    try { localStorage.setItem(preferenceKey(currentUser), next ? '1' : '0'); } catch { /* optional preference */ }
  };

  const workspaceClass = [
    'brian-ai-workspace',
    expanded ? 'is-expanded' : '',
    hideActiveName ? 'is-name-hidden' : '',
    availableTools.length <= 1 ? 'has-single-tool' : '',
  ].filter(Boolean).join(' ');

  const workspace = open ? createPortal(
    <div
      className={`brian-ai-workspace-layer ${expanded ? 'is-expanded' : ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !expanded) setOpen(false);
      }}
    >
      <section ref={rootRef} className={workspaceClass} role="dialog" aria-modal="true" aria-label={vi ? 'Không gian AI' : 'AI workspace'}>
        <header className="brian-ai-workspace__header">
          <div className="brian-ai-workspace__identity">
            <span className="brian-ai-workspace__mark" aria-hidden="true">AI</span>
            <div>
              <strong>{vi ? 'Không gian AI' : 'AI workspace'}</strong>
              <small>{manageMode
                ? (vi ? 'Admin và TTCM quản lý website dùng chung' : 'Shared websites managed by Admin and department leaders')
                : (activeTool?.name || (loading ? (vi ? 'Đang đồng bộ…' : 'Syncing…') : (vi ? 'Chưa có website được cấu hình' : 'No website configured')))}</small>
            </div>
          </div>

          <div className="brian-ai-workspace__header-actions">
            {!manageMode ? (
              <button type="button" onClick={toggleHideActiveName} title={hideActiveName ? (vi ? 'Hiện tên AI' : 'Show AI name') : (vi ? 'Ẩn tên AI' : 'Hide AI name')} aria-label={hideActiveName ? (vi ? 'Hiện tên AI' : 'Show AI name') : (vi ? 'Ẩn tên AI' : 'Hide AI name')}>Aa</button>
            ) : null}
            {!manageMode && activeTool ? (
              <button type="button" onClick={() => setRefreshKey((value) => value + 1)} title={vi ? 'Tải lại website' : 'Reload website'} aria-label={vi ? 'Tải lại website' : 'Reload website'}>↻</button>
            ) : null}
            {!manageMode && activeTool ? (
              <button
                type="button"
                onClick={() => {
                  const url = safeAiWebsiteUrl(activeTool.url);
                  if (url) window.open(url, '_blank', 'noopener,noreferrer');
                }}
                title={vi ? 'Mở website trực tiếp trong tab mới' : 'Open website directly in a new tab'}
                aria-label={vi ? 'Mở website trực tiếp trong tab mới' : 'Open website directly in a new tab'}
              >↗</button>
            ) : null}
            {!manageMode ? (
              <button type="button" onClick={() => setExpanded((value) => !value)} title={vi ? 'Mở rộng bảng' : 'Expand panel'} aria-label={vi ? 'Mở rộng bảng' : 'Expand panel'}>{expanded ? '↙' : '⛶'}</button>
            ) : null}
            {isManager ? (
              <button type="button" className={manageMode ? 'is-active' : ''} onClick={() => manageMode ? setManageMode(false) : beginManage()}>
                {manageMode ? (vi ? 'Xem website' : 'View websites') : (vi ? 'Quản lý' : 'Manage')}
              </button>
            ) : null}
            <button type="button" className="is-close" onClick={() => setOpen(false)} aria-label={vi ? 'Đóng' : 'Close'}>×</button>
          </div>
        </header>

        {!manageMode ? (
          <>
            <nav className="brian-ai-workspace__switcher" aria-label={vi ? 'Chọn website AI' : 'Choose AI website'}>
              {availableTools.map((tool) => (
                <button
                  type="button"
                  key={tool.id}
                  className={tool.id === activeTool?.id ? 'is-active' : ''}
                  onClick={() => {
                    setActiveToolId(tool.id);
                    setRefreshKey((value) => value + 1);
                  }}
                  title={tool.name}
                >
                  <AiToolGlyph tool={tool} />
                  <span><b>{tool.name}</b>{tool.description ? <small>{tool.description}</small> : null}</span>
                  {tool.pinned ? <em aria-label={vi ? 'Đã ghim' : 'Pinned'}>★</em> : null}
                </button>
              ))}
              {!loading && !availableTools.length ? (
                <div className="brian-ai-workspace__switcher-empty">
                  <span>AI</span>
                  <b>{vi ? 'Chưa có website' : 'No websites'}</b>
                  <small>{isManager
                    ? (vi ? 'Nhấn “Quản lý” để nhập website AI đầu tiên.' : 'Choose Manage to add the first AI website.')
                    : (vi ? 'Admin hoặc TTCM chưa cấu hình website AI dùng chung.' : 'No shared AI website has been configured.')}</small>
                </div>
              ) : null}
            </nav>

            <main className="brian-ai-workspace__viewer">
              {loading ? (
                <div className="brian-ai-workspace__loading"><span /><strong>{vi ? 'Đang đồng bộ website AI…' : 'Syncing AI websites…'}</strong></div>
              ) : activeTool ? (
                <>
                  <div className="brian-ai-workspace__viewer-bar">
                    <div><AiToolGlyph tool={activeTool} /><span className="brian-ai-workspace__active-meta"><b>{activeTool.name}</b><small>{safeAiWebsiteUrl(activeTool.url)}</small></span></div>
                    <span>{vi ? 'Đã đồng bộ dùng chung' : 'Shared configuration'}</span>
                  </div>
                  <iframe
                    key={`${activeTool.id}-${refreshKey}`}
                    src={safeAiWebsiteUrl(activeTool.url)}
                    title={activeTool.name}
                    allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
                    sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads allow-top-navigation-by-user-activation"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </>
              ) : (
                <div className="brian-ai-workspace__blank">
                  <span aria-hidden="true">✦</span>
                  <strong>{vi ? 'Chưa có website AI dùng chung' : 'No shared AI website yet'}</strong>
                  <p>{isManager
                    ? (vi ? 'Mở Quản lý, nhập tên và URL rồi lưu. Website sẽ xuất hiện cho mọi giáo viên được cấp quyền.' : 'Add a name and URL, then save for all teachers.')
                    : (vi ? 'Vui lòng liên hệ Admin hoặc TTCM để cấu hình website AI.' : 'Please ask an Admin or department leader to configure one.')}</p>
                  {isManager ? <button type="button" onClick={beginManage}>{vi ? 'Nhập website AI' : 'Add AI website'}</button> : null}
                </div>
              )}
              {notice && !manageMode ? <div className="brian-ai-workspace__notice">{notice}</div> : null}
            </main>
          </>
        ) : (
          <div className="brian-ai-manager">
            <section className="brian-ai-manager__intro">
              <div>
                <span aria-hidden="true">＋</span>
                <div><strong>{vi ? 'Thêm website AI dùng chung' : 'Add shared AI website'}</strong><small>{vi ? 'Chỉ Admin và TTCM được thay đổi. Giáo viên chỉ sử dụng danh sách đã lưu.' : 'Only Admin and department leaders can edit. Teachers can only use saved websites.'}</small></div>
              </div>
              <div className="brian-ai-manager__new-form">
                <input value={newTool.name} onChange={(event) => setNewTool((current) => ({ ...current, name: event.target.value }))} placeholder={vi ? 'Tên website' : 'Website name'} />
                <input value={newTool.url} onChange={(event) => setNewTool((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" />
                <input value={newTool.icon} onChange={(event) => setNewTool((current) => ({ ...current, icon: event.target.value }))} placeholder={vi ? 'Biểu tượng' : 'Icon'} maxLength={3} />
                <input value={newTool.description} onChange={(event) => setNewTool((current) => ({ ...current, description: event.target.value }))} placeholder={vi ? 'Mô tả ngắn' : 'Short description'} />
                <select value={newTool.audience} onChange={(event) => setNewTool((current) => ({ ...current, audience: event.target.value }))}>
                  <option value="all">{vi ? 'Mọi tài khoản' : 'Everyone'}</option>
                  <option value="teacher">{vi ? 'Giáo viên' : 'Teachers'}</option>
                  <option value="leader">TTCM</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="button" onClick={addTool} disabled={!newTool.name.trim() || !safeAiWebsiteUrl(newTool.url)}>{vi ? 'Thêm' : 'Add'}</button>
              </div>
            </section>

            <div className="brian-ai-manager__list">
              {draftTools.map((tool, index) => (
                <article className="brian-ai-manager__item" key={tool.id}>
                  <div className="brian-ai-manager__item-head">
                    <AiToolGlyph tool={tool} />
                    <div><strong>{tool.name || (vi ? 'Chưa đặt tên' : 'Untitled')}</strong><small>{tool.url || 'https://…'}</small></div>
                    <div className="brian-ai-manager__order">
                      <button type="button" onClick={() => setDraftTools((current) => moveItem(current, index, -1))} disabled={index === 0}>↑</button>
                      <button type="button" onClick={() => setDraftTools((current) => moveItem(current, index, 1))} disabled={index === draftTools.length - 1}>↓</button>
                      <button type="button" className="is-delete" onClick={() => setDraftTools((current) => current.filter((item) => item.id !== tool.id))}>{vi ? 'Xóa' : 'Delete'}</button>
                    </div>
                  </div>
                  <div className="brian-ai-manager__fields">
                    <label><span>{vi ? 'Tên' : 'Name'}</span><input value={tool.name} onChange={(event) => updateDraftTool(tool.id, { name: event.target.value })} /></label>
                    <label><span>URL</span><input value={tool.url} onChange={(event) => updateDraftTool(tool.id, { url: event.target.value })} /></label>
                    <label><span>{vi ? 'Biểu tượng' : 'Icon'}</span><input value={tool.icon} maxLength={3} onChange={(event) => updateDraftTool(tool.id, { icon: event.target.value })} /></label>
                    <label><span>{vi ? 'Đối tượng' : 'Audience'}</span><select value={tool.audience} onChange={(event) => updateDraftTool(tool.id, { audience: event.target.value })}><option value="all">{vi ? 'Mọi tài khoản' : 'Everyone'}</option><option value="teacher">{vi ? 'Giáo viên' : 'Teachers'}</option><option value="leader">TTCM</option><option value="admin">Admin</option></select></label>
                    <label className="is-wide"><span>{vi ? 'Mô tả' : 'Description'}</span><input value={tool.description} onChange={(event) => updateDraftTool(tool.id, { description: event.target.value })} /></label>
                  </div>
                  <div className="brian-ai-manager__toggles">
                    <label><input type="checkbox" checked={tool.enabled} onChange={(event) => updateDraftTool(tool.id, { enabled: event.target.checked })} /><span>{vi ? 'Hiển thị' : 'Visible'}</span></label>
                    <label><input type="checkbox" checked={tool.pinned} onChange={(event) => updateDraftTool(tool.id, { pinned: event.target.checked })} /><span>{vi ? 'Ưu tiên mở trước' : 'Open first'}</span></label>
                  </div>
                </article>
              ))}
              {!draftTools.length ? <div className="brian-ai-manager__empty"><span>AI</span><strong>{vi ? 'Chưa có website nào' : 'No websites yet'}</strong><small>{vi ? 'Nhập thông tin ở phía trên để bắt đầu.' : 'Use the form above to begin.'}</small></div> : null}
            </div>

            <footer className="brian-ai-manager__footer">
              <span>{notice || (vi ? 'Sau khi lưu, giáo viên sẽ nhận danh sách này tự động.' : 'Teachers receive this list automatically after saving.')}</span>
              <button type="button" onClick={saveConfiguration} disabled={saving}>{saving ? (vi ? 'Đang đồng bộ…' : 'Syncing…') : (vi ? 'Lưu và đồng bộ' : 'Save and sync')}</button>
            </footer>
          </div>
        )}
      </section>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {createPortal(
        <div className="brian-nav__ai-wrap">
          <button
            type="button"
            className={`brian-nav__icon brian-nav__ai-button ${open ? 'is-open' : ''}`}
            aria-label={vi ? 'Mở không gian AI' : 'Open AI workspace'}
            title={vi ? 'Không gian AI' : 'AI workspace'}
            aria-expanded={open}
            onClick={openWorkspace}
          >
            <span aria-hidden="true">AI</span>
          </button>
        </div>,
        host,
      )}
      {workspace}
    </>
  );
}
