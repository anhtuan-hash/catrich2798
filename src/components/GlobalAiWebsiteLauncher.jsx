import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalAiWebsiteLauncher.css';

const STORAGE_KEY = 'bes-ai-website-launcher-v1';
const CONFIG_EVENT = 'bes-ai-websites-updated';

const EMPTY_TOOL = {
  name: '',
  url: '',
  icon: 'AI',
  description: '',
  audience: 'all',
  enabled: true,
  pinned: false,
};

function normalizeTool(tool, index = 0) {
  const name = String(tool?.name || '').trim();
  return {
    id: String(tool?.id || `ai-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`),
    name,
    url: String(tool?.url || '').trim(),
    icon: String(tool?.icon || name.slice(0, 2) || 'AI').trim().slice(0, 3).toUpperCase(),
    description: String(tool?.description || '').trim(),
    audience: ['all', 'admin', 'leader', 'teacher'].includes(tool?.audience) ? tool.audience : 'all',
    enabled: tool?.enabled !== false,
    pinned: Boolean(tool?.pinned),
  };
}

function readTools() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map(normalizeTool).filter((tool) => tool.name && tool.url)
      : [];
  } catch {
    return [];
  }
}

function persistTools(tools) {
  const normalized = tools
    .map(normalizeTool)
    .filter((tool) => tool.name && safeWebsiteUrl(tool.url));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(CONFIG_EVENT, { detail: normalized }));
  return normalized;
}

function safeWebsiteUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function currentAudience(user) {
  const role = `${user?.role || ''} ${user?.position || ''}`.toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (role.includes('leader') || role.includes('ttcm') || role.includes('head')) return 'leader';
  return 'teacher';
}

function toolAvailableFor(tool, user) {
  if (!tool.enabled) return false;
  const audience = currentAudience(user);
  return tool.audience === 'all' || tool.audience === audience || audience === 'admin';
}

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

export default function GlobalAiWebsiteLauncher({ currentUser, language = 'vi' }) {
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [tools, setTools] = useState(readTools);
  const [draftTools, setDraftTools] = useState(readTools);
  const [newTool, setNewTool] = useState(EMPTY_TOOL);
  const [activeToolId, setActiveToolId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef(null);

  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const vi = language !== 'en';

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
    const sync = (event) => {
      if (event.type === 'storage' && event.key !== STORAGE_KEY) return;
      const next = Array.isArray(event.detail) ? event.detail.map(normalizeTool) : readTools();
      setTools(next);
      if (!manageMode) setDraftTools(next);
    };
    window.addEventListener('storage', sync);
    window.addEventListener(CONFIG_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CONFIG_EVENT, sync);
    };
  }, [manageMode]);

  const availableTools = useMemo(() => tools
    .filter((tool) => toolAvailableFor(tool, currentUser))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned)), [currentUser, tools]);

  useEffect(() => {
    if (!availableTools.length) {
      setActiveToolId('');
      return;
    }
    if (!availableTools.some((tool) => tool.id === activeToolId)) {
      setActiveToolId(availableTools[0].id);
    }
  }, [activeToolId, availableTools]);

  const activeTool = useMemo(
    () => availableTools.find((tool) => tool.id === activeToolId) || availableTools[0] || null,
    [activeToolId, availableTools],
  );

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-ai-workspace-open');
    const closeEscape = (event) => {
      if (event.key === 'Escape') {
        if (expanded) setExpanded(false);
        else if (manageMode) setManageMode(false);
        else setOpen(false);
      }
    };
    window.addEventListener('keydown', closeEscape);
    return () => {
      document.documentElement.classList.remove('bes-ai-workspace-open');
      window.removeEventListener('keydown', closeEscape);
    };
  }, [expanded, manageMode, open]);

  if (!host || !currentUser) return null;

  const openWorkspace = () => {
    if (open) {
      setOpen(false);
      setManageMode(false);
      setExpanded(false);
      return;
    }
    const nextTools = readTools();
    setTools(nextTools);
    setDraftTools(nextTools.map((tool) => ({ ...tool })));
    const nextAvailable = nextTools
      .filter((tool) => toolAvailableFor(tool, currentUser))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
    setActiveToolId((current) => nextAvailable.some((tool) => tool.id === current)
      ? current
      : (nextAvailable[0]?.id || ''));
    setManageMode(isAdmin && !nextAvailable.length);
    setOpen(true);
  };

  const beginManage = () => {
    setDraftTools(tools.map((tool) => ({ ...tool })));
    setManageMode(true);
  };

  const saveConfiguration = () => {
    const next = persistTools(draftTools);
    setTools(next);
    setDraftTools(next.map((tool) => ({ ...tool })));
    const nextAvailable = next
      .filter((tool) => toolAvailableFor(tool, currentUser))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
    setActiveToolId((current) => nextAvailable.some((tool) => tool.id === current)
      ? current
      : (nextAvailable[0]?.id || ''));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const addTool = () => {
    const url = safeWebsiteUrl(newTool.url);
    if (!newTool.name.trim() || !url) return;
    setDraftTools((current) => [
      ...current,
      normalizeTool({ ...newTool, url, id: `ai-${Date.now()}` }),
    ]);
    setNewTool(EMPTY_TOOL);
  };

  const updateDraftTool = (id, patch) => {
    setDraftTools((current) => current.map((tool) => tool.id === id ? { ...tool, ...patch } : tool));
  };

  const workspace = open ? createPortal(
    <div
      className={`brian-ai-workspace-layer ${expanded ? 'is-expanded' : ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !expanded) setOpen(false);
      }}
    >
      <section ref={rootRef} className="brian-ai-workspace" role="dialog" aria-modal="true" aria-label={vi ? 'Không gian AI' : 'AI workspace'}>
        <header className="brian-ai-workspace__header">
          <div className="brian-ai-workspace__identity">
            <span className="brian-ai-workspace__mark" aria-hidden="true">AI</span>
            <div>
              <strong>{vi ? 'Không gian AI' : 'AI workspace'}</strong>
              <small>{manageMode
                ? (vi ? 'Quản lý các website hiển thị trong bảng AI' : 'Manage websites shown in the AI panel')
                : (activeTool?.name || (vi ? 'Chưa có website được cấu hình' : 'No website configured'))}</small>
            </div>
          </div>

          <div className="brian-ai-workspace__header-actions">
            {!manageMode && activeTool ? (
              <button type="button" onClick={() => setRefreshKey((value) => value + 1)} title={vi ? 'Tải lại website' : 'Reload website'} aria-label={vi ? 'Tải lại website' : 'Reload website'}>↻</button>
            ) : null}
            {!manageMode ? (
              <button type="button" onClick={() => setExpanded((value) => !value)} title={vi ? 'Mở rộng bảng' : 'Expand panel'} aria-label={vi ? 'Mở rộng bảng' : 'Expand panel'}>{expanded ? '↙' : '⛶'}</button>
            ) : null}
            {isAdmin ? (
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
                >
                  <AiToolGlyph tool={tool} />
                  <span><b>{tool.name}</b>{tool.description ? <small>{tool.description}</small> : null}</span>
                  {tool.pinned ? <em aria-label={vi ? 'Đã ghim' : 'Pinned'}>★</em> : null}
                </button>
              ))}
              {!availableTools.length ? (
                <div className="brian-ai-workspace__switcher-empty">
                  <span>AI</span>
                  <b>{vi ? 'Chưa có website' : 'No websites'}</b>
                  <small>{isAdmin
                    ? (vi ? 'Nhấn “Quản lý” để nhập website AI đầu tiên.' : 'Choose Manage to add the first AI website.')
                    : (vi ? 'Quản trị viên chưa cấu hình website AI.' : 'The administrator has not configured an AI website.')}</small>
                </div>
              ) : null}
            </nav>

            <main className="brian-ai-workspace__viewer">
              {activeTool ? (
                <>
                  <div className="brian-ai-workspace__viewer-bar">
                    <div><AiToolGlyph tool={activeTool} /><span><b>{activeTool.name}</b><small>{safeWebsiteUrl(activeTool.url)}</small></span></div>
                    <span>{vi ? 'Website chạy trực tiếp trong English Hub' : 'Website running inside English Hub'}</span>
                  </div>
                  <iframe
                    key={`${activeTool.id}-${refreshKey}`}
                    src={safeWebsiteUrl(activeTool.url)}
                    title={activeTool.name}
                    allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads"
                  />
                </>
              ) : (
                <div className="brian-ai-workspace__blank">
                  <span aria-hidden="true">✦</span>
                  <strong>{vi ? 'Sẵn sàng cho website AI của thầy' : 'Ready for your AI websites'}</strong>
                  <p>{isAdmin
                    ? (vi ? 'Mở Quản lý, nhập tên và URL. Sau khi lưu, nút AI sẽ mở website trực tiếp tại đây.' : 'Open Manage, enter a name and URL, then save.')
                    : (vi ? 'Chưa có website AI nào được quản trị viên thiết lập.' : 'No AI website has been configured yet.')}</p>
                  {isAdmin ? <button type="button" onClick={beginManage}>{vi ? 'Nhập website AI' : 'Add AI website'}</button> : null}
                </div>
              )}
            </main>
          </>
        ) : (
          <div className="brian-ai-manager">
            <section className="brian-ai-manager__intro">
              <div>
                <span aria-hidden="true">＋</span>
                <div><strong>{vi ? 'Thêm website AI' : 'Add AI website'}</strong><small>{vi ? 'Website sẽ được mở trực tiếp trong bảng AI, không mở tab mới.' : 'The website opens directly inside the AI panel.'}</small></div>
              </div>
              <div className="brian-ai-manager__new-form">
                <input value={newTool.name} onChange={(event) => setNewTool((current) => ({ ...current, name: event.target.value }))} placeholder={vi ? 'Tên website' : 'Website name'} />
                <input value={newTool.url} onChange={(event) => setNewTool((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" />
                <input value={newTool.icon} onChange={(event) => setNewTool((current) => ({ ...current, icon: event.target.value }))} placeholder={vi ? 'Biểu tượng, tối đa 3 ký tự' : 'Icon, up to 3 characters'} maxLength={3} />
                <input value={newTool.description} onChange={(event) => setNewTool((current) => ({ ...current, description: event.target.value }))} placeholder={vi ? 'Mô tả ngắn' : 'Short description'} />
                <select value={newTool.audience} onChange={(event) => setNewTool((current) => ({ ...current, audience: event.target.value }))}>
                  <option value="all">{vi ? 'Mọi tài khoản' : 'Everyone'}</option>
                  <option value="teacher">{vi ? 'Giáo viên' : 'Teachers'}</option>
                  <option value="leader">TTCM</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="button" onClick={addTool} disabled={!newTool.name.trim() || !safeWebsiteUrl(newTool.url)}>{vi ? 'Thêm website' : 'Add website'}</button>
              </div>
            </section>

            <div className="brian-ai-manager__list">
              {draftTools.map((tool, index) => (
                <article className="brian-ai-manager__item" key={tool.id}>
                  <div className="brian-ai-manager__item-head">
                    <AiToolGlyph tool={tool} />
                    <div><strong>{tool.name || (vi ? 'Chưa đặt tên' : 'Untitled')}</strong><small>{tool.url || 'https://…'}</small></div>
                    <div className="brian-ai-manager__order">
                      <button type="button" onClick={() => setDraftTools((current) => moveItem(current, index, -1))} disabled={index === 0} aria-label={vi ? 'Đưa lên' : 'Move up'}>↑</button>
                      <button type="button" onClick={() => setDraftTools((current) => moveItem(current, index, 1))} disabled={index === draftTools.length - 1} aria-label={vi ? 'Đưa xuống' : 'Move down'}>↓</button>
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

              {!draftTools.length ? (
                <div className="brian-ai-manager__empty"><span>AI</span><strong>{vi ? 'Chưa có website nào' : 'No websites yet'}</strong><small>{vi ? 'Nhập thông tin ở phía trên để bắt đầu.' : 'Use the form above to begin.'}</small></div>
              ) : null}
            </div>

            <footer className="brian-ai-manager__footer">
              <span>{vi ? 'Các website sau khi lưu sẽ xuất hiện ngay trong nút AI.' : 'Saved websites appear immediately in the AI button.'}</span>
              <button type="button" onClick={saveConfiguration}>{saved ? (vi ? 'Đã lưu ✓' : 'Saved ✓') : (vi ? 'Lưu cấu hình' : 'Save configuration')}</button>
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
