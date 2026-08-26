from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Marker not found: {label}')
    return text.replace(old, new, 1)

# Route old Work Hub links to the appropriate TTCM surface.
main_path = Path('src/main.jsx')
text = main_path.read_text(encoding='utf-8')
old = """  if (routeOnly === 'work-hub') {
    try { window.sessionStorage.setItem('bes-ttcm-open-on-load', 'schedule'); } catch { /* optional */ }
    window.history.replaceState(null, '', '#/dashboard');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'schedule' } })), 0);
    return 'dashboard';
  }"""
new = """  if (routeOnly === 'work-hub') {
    const ttcmView = /(?:^|[?&])view=schedule(?:&|$)/.test(cleanHash) ? 'schedule' : 'feed';
    try { window.sessionStorage.setItem('bes-ttcm-open-on-load', ttcmView); } catch { /* optional */ }
    window.history.replaceState(null, '', '#/dashboard');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: ttcmView } })), 0);
    return 'dashboard';
  }"""
text = replace_once(text, old, new, 'legacy TTCM view mapping')
main_path.write_text(text, encoding='utf-8')

# Add response visibility for TTCM managers.
path = Path('src/components/GlobalTtcmNavigationTab.jsx')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  const [responseFile, setResponseFile] = useState(null);\n  const [items, setItems]",
    "  const [responseFile, setResponseFile] = useState(null);\n  const [responses, setResponses] = useState([]);\n  const [responseViewerItem, setResponseViewerItem] = useState(null);\n  const [items, setItems]",
    'response viewer states',
)
# Add loader after loadFeed callback.
marker = "  const loadPeople = useCallback(async () => {"
loader = r'''  const loadResponses = useCallback(async () => {
    if (!manager || !client || !runtime.ready || !runtime.session) {
      setResponses([]);
      return;
    }
    const actionIds = items.filter(isActionItem).map((item) => item.id).filter(Boolean);
    if (!actionIds.length) {
      setResponses([]);
      return;
    }
    const { data, error: responseError } = await client
      .from('work_hub_comments')
      .select('id,item_id,author_id,body,comment_type,attachments,created_at')
      .in('item_id', actionIds)
      .order('created_at', { ascending: true });
    if (responseError) return;
    setResponses(data || []);
  }, [client, items, manager, runtime.ready, runtime.session]);

'''
if marker not in text:
    raise SystemExit('Marker not found: response loader insertion')
text = text.replace(marker, loader + marker, 1)
# Subscribe while manager panel is open.
marker = "  useEffect(() => {\n    if (!open) return undefined;\n    document.documentElement.classList.add('bes-ttcm-hub-open');"
subscription = r'''  useEffect(() => {
    if (!open || !manager) return undefined;
    loadResponses();
    return subscribeTable({
      key: `ttcm-responses-${currentUser?.id || 'manager'}`,
      table: 'work_hub_comments',
      onChange: () => loadResponses(),
    });
  }, [currentUser?.id, loadResponses, manager, open]);

'''
if marker not in text:
    raise SystemExit('Marker not found: response subscription')
text = text.replace(marker, subscription + marker, 1)
# Escape viewer first.
text = text.replace(
    "      if (responseItem) setResponseItem(null);\n      else if (composeOpen) setComposeOpen(false);",
    "      if (responseViewerItem) setResponseViewerItem(null);\n      else if (responseItem) setResponseItem(null);\n      else if (composeOpen) setComposeOpen(false);",
)
text = text.replace("  }, [composeOpen, open, responseItem]);", "  }, [composeOpen, open, responseItem, responseViewerItem]);")
# Add helpers before markRead.
marker = "  function markRead(itemId) {"
helpers = r'''  function responsesForItem(itemId) {
    return responses.filter((entry) => String(entry.item_id) === String(itemId));
  }

  function responseAuthor(authorId) {
    const person = people.find((entry) => String(entry.id) === String(authorId));
    return person?.name || person?.email || 'Giáo viên';
  }

'''
if marker not in text:
    raise SystemExit('Marker not found: response helpers')
text = text.replace(marker, helpers + marker, 1)
# Manager card gets response count/action.
old = '''                      <button type="button" className="ttcm-m3-manager-button is-danger" disabled={busy} onClick={(event) => { event.stopPropagation(); deleteCommunication(item); }}>
                        <Icon name="delete" size={17} />Xóa
                      </button>'''
new = '''                      {isActionItem(item) ? <button type="button" className="ttcm-m3-manager-button" onClick={(event) => { event.stopPropagation(); setResponseViewerItem(item); loadResponses(); }}>
                        <Icon name="people" size={17} />Phản hồi ({responsesForItem(item.id).length})
                      </button> : null}
                      <button type="button" className="ttcm-m3-manager-button is-danger" disabled={busy} onClick={(event) => { event.stopPropagation(); deleteCommunication(item); }}>
                        <Icon name="delete" size={17} />Xóa
                      </button>'''
text = replace_once(text, old, new, 'manager response action')
# Add response viewer before teacher response dialog.
marker = "        {responseItem && !manager ? ("
viewer = r'''        {responseViewerItem && manager ? (
          <div className="ttcm-m3-compose-layer" role="presentation">
            <section className="ttcm-m3-response-dialog ttcm-m3-response-viewer" aria-label="Phản hồi của tổ viên">
              <header><div><strong>Phản hồi của tổ viên</strong><small>{responseViewerItem.title}</small></div><button type="button" className="ttcm-m3-icon-button" onClick={() => setResponseViewerItem(null)} aria-label="Đóng"><Icon name="close" /></button></header>
              <div className="ttcm-m3-response-list">
                {responsesForItem(responseViewerItem.id).map((entry) => (
                  <article key={entry.id}>
                    <header><span className="ttcm-m3-avatar">{String(responseAuthor(entry.author_id)).trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase()}</span><div><b>{responseAuthor(entry.author_id)}</b><small>{formatDate(entry.created_at)}</small></div></header>
                    <p>{entry.body || 'Đã xác nhận.'}</p>
                    {Array.isArray(entry.attachments) && entry.attachments.length ? <div className="ttcm-m3-attachments">{entry.attachments.map((attachment, index) => <button key={`${entry.id}-${index}`} type="button" onClick={() => openAttachment(responseViewerItem, attachment)}><Icon name="download" size={17} /><span>{attachment.name || `Tệp ${index + 1}`}</span></button>)}</div> : null}
                  </article>
                ))}
                {!responsesForItem(responseViewerItem.id).length ? <div className="ttcm-m3-response-empty"><Icon name="people" size={28} /><strong>Chưa có phản hồi</strong><span>Phản hồi, xác nhận và tệp của tổ viên sẽ xuất hiện tại đây theo thời gian thực.</span></div> : null}
              </div>
              <footer><button type="button" className="ttcm-m3-filled-button" onClick={() => setResponseViewerItem(null)}>Đóng</button></footer>
            </section>
          </div>
        ) : null}

'''
if marker not in text:
    raise SystemExit('Marker not found: response viewer modal')
text = text.replace(marker, viewer + marker, 1)
path.write_text(text, encoding='utf-8')

# Material response viewer styling.
css_path = Path('src/components/GlobalTtcmNavigationTab.css')
css = css_path.read_text(encoding='utf-8')
append = r'''

.ttcm-m3-response-list {
  max-height: min(520px, 60vh);
  overflow: auto;
  display: grid;
  gap: 10px;
}

.ttcm-m3-response-list > article {
  padding: 14px;
  border: 1px solid #e0e3e7;
  border-radius: 16px;
  background: #f8fafd;
}

.ttcm-m3-response-list > article > header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ttcm-m3-response-list > article > header div { min-width: 0; }
.ttcm-m3-response-list > article > header b,
.ttcm-m3-response-list > article > header small { display: block; }
.ttcm-m3-response-list > article > header b { color: #1f1f1f; font-size: 13px; }
.ttcm-m3-response-list > article > header small { margin-top: 2px; color: #5f6368; font-size: 11px; }
.ttcm-m3-response-list > article > p { margin: 10px 0 0; color: #3c4043; line-height: 1.55; white-space: pre-wrap; }

.ttcm-m3-response-empty {
  min-height: 190px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: #5f6368;
  text-align: center;
}
.ttcm-m3-response-empty > .ttcm-m3-icon { color: #0b57d0; }
.ttcm-m3-response-empty strong { color: #1f1f1f; }
.ttcm-m3-response-empty span { max-width: 420px; font-size: 13px; line-height: 1.45; }
'''
if '.ttcm-m3-response-list {' not in css:
    css += append
css_path.write_text(css, encoding='utf-8')

print('TTCM response viewer completion applied.')
