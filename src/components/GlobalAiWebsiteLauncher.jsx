import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalAiWebsiteLauncher.css';

const STORAGE_KEY = 'bes-ai-website-launcher-v1';
const CONFIG_EVENT = 'bes-ai-websites-updated';

const DEFAULT_TOOLS = [
  {
    id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/', icon: 'C',
    description: 'Trao đổi, soạn thảo và hỗ trợ công việc tổng quát.', category: 'Chatbot',
    audience: 'all', enabled: true, pinned: true, openMode: 'new-tab',
  },
  {
    id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/', icon: 'G',
    description: 'Trợ lý AI trong hệ sinh thái Google.', category: 'Chatbot',
    audience: 'all', enabled: true, pinned: true, openMode: 'new-tab',
  },
  {
    id: 'claude', name: 'Claude', url: 'https://claude.ai/', icon: 'A',
    description: 'Đọc, phân tích và biên tập nội dung dài.', category: 'Soạn thảo',
    audience: 'all', enabled: true, pinned: false, openMode: 'new-tab',
  },
  {
    id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai/', icon: 'P',
    description: 'Tìm kiếm và nghiên cứu thông tin có nguồn dẫn.', category: 'Nghiên cứu',
    audience: 'all', enabled: true, pinned: false, openMode: 'new-tab',
  },
  {
    id: 'gemini-notebook', name: 'Gemini Notebook', url: 'https://notebooklm.google.com/', icon: 'N',
    description: 'Học và tổng hợp kiến thức từ tài liệu riêng.', category: 'Tài liệu',
    audience: 'all', enabled: true, pinned: false, openMode: 'new-tab',
  },
  {
    id: 'copilot', name: 'Microsoft Copilot', url: 'https://copilot.microsoft.com/', icon: 'M',
    description: 'Hỗ trợ tìm kiếm, viết và làm việc với Microsoft.', category: 'Chatbot',
    audience: 'all', enabled: true, pinned: false, openMode: 'new-tab',
  },
];

const EMPTY_TOOL = {
  name: '', url: '', icon: 'AI', description: '', category: 'Chatbot', audience: 'all',
  enabled: true, pinned: false, openMode: 'new-tab',
};

function normalizeTool(tool, index = 0) {
  const name = String(tool?.name || '').trim();
  return {
    id: String(tool?.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`),
    name,
    url: String(tool?.url || '').trim(),
    icon: String(tool?.icon || name.slice(0, 2) || 'AI').trim().slice(0, 3).toUpperCase(),
    description: String(tool?.description || '').trim(),
    category: String(tool?.category || 'Khác').trim() || 'Khác',
    audience: ['all', 'admin', 'leader', 'teacher'].includes(tool?.audience) ? tool.audience : 'all',
    enabled: tool?.enabled !== false,
    pinned: Boolean(tool?.pinned),
    openMode: tool?.openMode === 'embed' ? 'embed' : 'new-tab',
  };
}

function readTools() {
  if (typeof window === 'undefined') return DEFAULT_TOOLS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_TOOLS;
    return parsed.map(normalizeTool);
  } catch {
    return DEFAULT_TOOLS;
  }
}

function persistTools(tools) {
  const normalized = tools.map(normalizeTool).filter((tool) => tool.name && tool.url);
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

export default function GlobalAiWebsiteLauncher({ currentUser, language = 'vi' }) {
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [tools, setTools] = useState(readTools);
  const [draftTools, setDraftTools] = useState(readTools);
  const [newTool, setNewTool] = useState(EMPTY_TOOL);
  const [embeddedTool, setEmbeddedTool] = useState(null);
  const [saved, setSaved] = useState(false);
  const rootRef = useRef(null);
  const searchRef = useRef(null);

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
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const sync = (event) => {
      if (event.type === 'storage' && event.key !== STORAGE_KEY) return;
      const next = event.detail || readTools();
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

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setManageMode(false);
      }
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setManageMode(false);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!embeddedTool) return undefined;
    document.documentElement.classList.add('bes-ai-site-open');
    const close = (event) => { if (event.key === 'Escape') setEmbeddedTool(null); };
    window.addEventListener('keydown', close);
    return () => {
      document.documentElement.classList.remove('bes-ai-site-open');
      window.removeEventListener('keydown', close);
    };
  }, [embeddedTool]);

  const availableTools = useMemo(() => tools
    .filter((tool) => toolAvailableFor(tool, currentUser))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned)), [currentUser, tools]);

  const categories = useMemo(() => [...new Set(availableTools.map((tool) => tool.category))], [availableTools]);

  const visibleTools = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return availableTools.filter((tool) => {
      if (category !== 'all' && tool.category !== category) return false;
      if (!needle) return true;
      return `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(needle);
    });
  }, [availableTools, category, query]);

  if (!host || !currentUser) return null;

  const openWebsite = (tool) => {
    const url = safeWebsiteUrl(tool.url);
    if (!url) return;
    if (tool.openMode === 'embed') {
      setEmbeddedTool({ ...tool, url });
      setOpen(false);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const beginManage = () => {
    setDraftTools(tools.map((tool) => ({ ...tool })));
    setManageMode(true);
    setQuery('');
    setCategory('all');
  };

  const saveConfiguration = () => {
    const next = persistTools(draftTools);
    setTools(next);
    setDraftTools(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const addTool = () => {
    if (!newTool.name.trim() || !safeWebsiteUrl(newTool.url)) return;
    setDraftTools((current) => [...current, normalizeTool({ ...newTool, id: `ai-${Date.now()}` })]);
    setNewTool(EMPTY_TOOL);
  };

  const launcher = (
    <div ref={rootRef} className="brian-nav__popover-wrap brian-nav__ai-wrap">
      <button
        type="button"
        className={`brian-nav__icon brian-nav__ai-button ${open ? 'is-open' : ''}`}
        aria-label={vi ? 'Công cụ AI' : 'AI tools'}
        title={vi ? 'Công cụ AI' : 'AI tools'}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setManageMode(false);
        }}
      >
        <span aria-hidden="true">AI</span>
      </button>

      {open ? (
        <section className={`brian-ai-launcher ${manageMode ? 'is-managing' : ''}`} aria-label={vi ? 'Công cụ AI' : 'AI tools'}>
          <header className="brian-ai-launcher__header">
            <div>
              <span className="brian-ai-launcher__mark" aria-hidden="true">✦</span>
              <div><strong>{vi ? 'Công cụ AI' : 'AI tools'}</strong><small>{vi ? 'Mở nhanh các website do quản trị viên thiết lập' : 'Open websites configured by the administrator'}</small></div>
            </div>
            <div className="brian-ai-launcher__header-actions">
              {isAdmin ? <button type="button" className={manageMode ? 'is-active' : ''} onClick={() => manageMode ? setManageMode(false) : beginManage()}>{manageMode ? (vi ? 'Xem launcher' : 'View launcher') : (vi ? 'Quản lý' : 'Manage')}</button> : null}
              <button type="button" className="brian-ai-launcher__close" onClick={() => setOpen(false)} aria-label={vi ? 'Đóng' : 'Close'}>×</button>
            </div>
          </header>

          {!manageMode ? (
            <>
              <div className="brian-ai-launcher__search-row">
                <label className="brian-ai-launcher__search"><span aria-hidden="true">⌕</span><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={vi ? 'Tìm công cụ AI…' : 'Find an AI tool…'} /></label>
              </div>
              <div className="brian-ai-launcher__categories">
                <button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>{vi ? 'Tất cả' : 'All'}</button>
                {categories.map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
              <div className="brian-ai-launcher__grid">
                {visibleTools.map((tool) => (
                  <button type="button" className="brian-ai-tool" key={tool.id} onClick={() => openWebsite(tool)}>
                    <span className="brian-ai-tool__icon" aria-hidden="true">{tool.icon}</span>
                    <span className="brian-ai-tool__copy"><b>{tool.name}</b><small>{tool.description || tool.category}</small></span>
                    <span className="brian-ai-tool__meta">{tool.pinned ? <em>{vi ? 'Đã ghim' : 'Pinned'}</em> : null}<i aria-hidden="true">↗</i></span>
                  </button>
                ))}
                {!visibleTools.length ? <div className="brian-ai-launcher__empty"><span>⌕</span><strong>{vi ? 'Không tìm thấy công cụ' : 'No tools found'}</strong><small>{vi ? 'Hãy thử từ khóa hoặc nhóm khác.' : 'Try another search or category.'}</small></div> : null}
              </div>
              <footer className="brian-ai-launcher__footer"><span>{availableTools.length} {vi ? 'công cụ đang hoạt động' : 'active tools'}</span><small>{vi ? 'Website bên ngoài có thể yêu cầu đăng nhập riêng.' : 'External websites may require a separate sign-in.'}</small></footer>
            </>
          ) : (
            <div className="brian-ai-manager">
              <section className="brian-ai-manager__new">
                <div><strong>{vi ? 'Thêm website AI' : 'Add AI website'}</strong><small>{vi ? 'Nhập website sẽ xuất hiện với giáo viên.' : 'Enter a website to show teachers.'}</small></div>
                <div className="brian-ai-manager__form">
                  <input value={newTool.name} onChange={(event) => setNewTool((current) => ({ ...current, name: event.target.value }))} placeholder={vi ? 'Tên công cụ' : 'Tool name'} />
                  <input value={newTool.url} onChange={(event) => setNewTool((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" />
                  <input value={newTool.description} onChange={(event) => setNewTool((current) => ({ ...current, description: event.target.value }))} placeholder={vi ? 'Mô tả ngắn' : 'Short description'} />
                  <input value={newTool.category} onChange={(event) => setNewTool((current) => ({ ...current, category: event.target.value }))} placeholder={vi ? 'Nhóm' : 'Category'} />
                  <button type="button" onClick={addTool} disabled={!newTool.name.trim() || !safeWebsiteUrl(newTool.url)}>{vi ? 'Thêm' : 'Add'}</button>
                </div>
              </section>

              <div className="brian-ai-manager__list">
                {draftTools.map((tool, index) => (
                  <article className="brian-ai-manager__item" key={tool.id}>
                    <div className="brian-ai-manager__item-top">
                      <span>{tool.icon}</span>
                      <div><strong>{tool.name || (vi ? 'Chưa đặt tên' : 'Untitled')}</strong><small>{tool.url}</small></div>
                      <div className="brian-ai-manager__order">
                        <button type="button" onClick={() => setDraftTools((current) => moveItem(current, index, -1))} disabled={index === 0} aria-label={vi ? 'Đưa lên' : 'Move up'}>↑</button>
                        <button type="button" onClick={() => setDraftTools((current) => moveItem(current, index, 1))} disabled={index === draftTools.length - 1} aria-label={vi ? 'Đưa xuống' : 'Move down'}>↓</button>
                        <button type="button" className="is-delete" onClick={() => setDraftTools((current) => current.filter((item) => item.id !== tool.id))}>{vi ? 'Xóa' : 'Delete'}</button>
                      </div>
                    </div>
                    <div className="brian-ai-manager__fields">
                      <label><span>{vi ? 'Tên' : 'Name'}</span><input value={tool.name} onChange={(event) => setDraftTools((current) => current.map((item) => item.id === tool.id ? { ...item, name: event.target.value } : item))} /></label>
                      <label><span>URL</span><input value={tool.url} onChange={(event) => setDraftTools((current) => current.map((item) => item.id === tool.id ? { ...item, url: event.target.value } : item))} /></label>
                      <label className="is-wide"><span>{vi ? 'Mô tả' : 'Description'}</span><input value={tool.description} onChange={(event) => setDraftTools((current) => current.map((item) => item.id === tool.id ? { ...item, description: event.target.value } : item))} /></label>
                      <label><span>{vi ? 'Nhóm' : 'Category'}</span><input value={tool.category} onChange={(event) => setDraftTools((current) => current.map((item) => item.id === tool.id ? { ...item, category: event.target.value } : item))} /></label>
                      <label><span>{vi ? 'Đối tượng' : 'Audience'}</span><select value={tool.audience} onChange={(event) => setDraftTools((current) => current.map((item) => item.id === tool.id ? { ...item, audience: event.target.value } : item))}><option value="all">{vi ? 'Tất cả' : 'Everyone'}</option><option value="teacher">{vi ? 'Giáo viên' : 'Teachers'}</option><option value="leader">TTCM</option><option value="admin">Admin</option></select></label>
                      <label><span>{vi ? 'Cách mở' : 'Open mode'}</span><select value={tool.openMode} onChange={(event) => setDraftTools((current) => current.map((item) => item.id === tool.id ? { ...item, openMode: event.target.value } : item))}><option value="new-tab">{vi ? 'Tab mới' : 'New tab'}</option><option value="embed">{vi ? 'Panel trong Hub' : 'In-Hub panel'}</option></select></label>
                    </div>
                    <div className="brian-ai-manager__toggles">
                      <label><input type="checkbox" checked={tool.enabled} onChange={(event) => setDraftTools((current) => current.map((item) => item.id === tool.id ? { ...item, enabled: event.target.checked } : item))} /><span>{vi ? 'Hiển thị' : 'Visible'}</span></label>
                      <label><input type="checkbox" checked={tool.pinned} onChange={(event) => setDraftTools((current) => current.map((item) => item.id === tool.id ? { ...item, pinned: event.target.checked } : item))} /><span>{vi ? 'Ghim nổi bật' : 'Pin'}</span></label>
                    </div>
                  </article>
                ))}
              </div>
              <footer className="brian-ai-manager__footer"><span>{vi ? 'Cấu hình được lưu cho English Hub trên trình duyệt này.' : 'Configuration is saved for English Hub in this browser.'}</span><button type="button" onClick={saveConfiguration}>{saved ? (vi ? 'Đã lưu ✓' : 'Saved ✓') : (vi ? 'Lưu cấu hình' : 'Save configuration')}</button></footer>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );

  return (
    <>
      {createPortal(launcher, host)}
      {embeddedTool ? createPortal(
        <div className="brian-ai-site-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEmbeddedTool(null); }}>
          <section className="brian-ai-site-panel" role="dialog" aria-modal="true" aria-label={embeddedTool.name}>
            <header><div><span>{embeddedTool.icon}</span><div><strong>{embeddedTool.name}</strong><small>{vi ? 'Website AI bên ngoài' : 'External AI website'}</small></div></div><div><a href={embeddedTool.url} target="_blank" rel="noreferrer">{vi ? 'Mở tab mới' : 'Open new tab'} ↗</a><button type="button" onClick={() => setEmbeddedTool(null)} aria-label={vi ? 'Đóng' : 'Close'}>×</button></div></header>
            <div className="brian-ai-site-panel__notice">{vi ? 'Một số website chặn hiển thị nhúng. Khi đó hãy chọn “Mở tab mới”.' : 'Some websites block embedding. Use “Open new tab” if the page does not display.'}</div>
            <iframe src={embeddedTool.url} title={embeddedTool.name} allow="clipboard-read; clipboard-write; microphone; camera" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads" />
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
