from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, value):
    Path(path).write_text(value, encoding='utf-8')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Marker not found: {label}')
    return text.replace(old, new, 1)


# 1) Retire the Work Hub route while preserving its underlying data tables.
path = 'src/main.jsx'
text = read(path)
text = text.replace("const WorkHub = lazy(() => import('./pages/WorkHub.jsx'));\n", '')
text = text.replace("'dashboard', 'work-hub', 'content-ecosystem'", "'dashboard', 'content-ecosystem'")
text = text.replace("  'work-hub': { accent: '#14866D', soft: '#E6F8F2', ink: '#0B3A31' },\n", '')
text = text.replace("            {canAccessRoute && currentRoute === 'work-hub' && currentUser && <WorkHub {...context} />}\n", '')
text = replace_once(
    text,
    "  const routeOnly = cleanHash.split('?')[0].split('&')[0];\n  return routeOnly || 'home';",
    "  const routeOnly = cleanHash.split('?')[0].split('&')[0];\n  if (routeOnly === 'work-hub') {\n    try { window.sessionStorage.setItem('bes-ttcm-open-on-load', 'schedule'); } catch { /* optional */ }\n    window.history.replaceState(null, '', '#/dashboard');\n    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'schedule' } })), 0);\n    return 'dashboard';\n  }\n  return routeOnly || 'home';",
    'legacy Work Hub redirect',
)
write(path, text)


# 2) Remove Work Hub from the Apps launcher/catalog.
path = 'src/data/apps.js'
text = read(path)
pattern = re.compile(r"\n  \{\n    slug: 'work-hub', route: 'work-hub',.*?\n  \},", re.S)
text, count = pattern.subn('', text, count=1)
if count != 1:
    raise SystemExit('Could not remove Work Hub catalog entry')
write(path, text)


# 3) Remove Work-Hub-only mounting layers from global navigation.
path = 'src/components/GlobalFlatNavigation.jsx'
text = read(path)
text = text.replace("import React, { Suspense, lazy } from 'react';", "import React from 'react';")
for line in [
    "import GlobalWorkScheduleBridge from './GlobalWorkScheduleBridge.jsx';\n",
    "import GlobalWorkHubGoogleHeroV2 from './GlobalWorkHubGoogleHeroV2.jsx';\n",
    "import GlobalWorkHubViewportModalBridge from './GlobalWorkHubViewportModalBridge.jsx';\n",
    "import './GlobalWorkHubGoogleRedesign.css';\n",
    "import './GlobalWorkHubGoogleHeroV2.css';\n",
    "import './GlobalWorkHubViewportModal.css';\n",
    "import './GlobalWorkHubViewportModalFinal.css';\n",
    "import './GlobalWorkHubModalAnchor.css';\n",
    "import './GlobalWorkHubModalCenter.css';\n",
]:
    text = text.replace(line, '')
text = re.sub(
    r"\nconst GlobalWorkScheduleCompatibleCenter = lazy\(.*?\);\nconst GlobalWorkScheduleTemplatePanel = lazy\(.*?\);\nconst GlobalWorkBulkDeleteManager = lazy\(.*?\);\n",
    "\n",
    text,
    count=1,
)
text = text.replace("  const workHubActive = props.route === 'work-hub';\n\n", '')
for line in [
    "      <GlobalWorkScheduleBridge />\n",
    "      <GlobalWorkHubGoogleHeroV2 route={props.route} />\n",
    "      <GlobalWorkHubViewportModalBridge route={props.route} />\n",
]:
    text = text.replace(line, '')
text = re.sub(
    r"\n      \{workHubActive \? \(\n        <Suspense fallback=\{null\}>\n          <GlobalWorkScheduleCompatibleCenter \{\.\.\.props\} />\n          <GlobalWorkScheduleTemplatePanel route=\{props\.route\} />\n          <GlobalWorkBulkDeleteManager \{\.\.\.props\} />\n        </Suspense>\n      \) : null\}",
    '',
    text,
    count=1,
)
text = text.replace('Notification Center has been retired in favor of TTCM + Work Hub.', 'Notification Center and Work Hub UI are retired; TTCM is the single collaboration surface.')
write(path, text)


# 4) Make the existing full schedule reusable inside TTCM instead of Work Hub.
path = 'src/components/GlobalWorkScheduleCenter.jsx'
text = read(path)
text = text.replace("connected_modules: ['work-hub', 'dashboard', 'notifications', 'automation']", "connected_modules: ['ttcm', 'dashboard', 'automation']")
text = text.replace("target: `#/work-hub?view=schedule&event=${encodeURIComponent(event.id)}`", "target: '#/dashboard'")
text = text.replace("target: '#/work-hub?view=schedule'", "target: '#/dashboard'")
text = replace_once(
    text,
    "export default function GlobalWorkScheduleCenter({\n  currentUser,\n  language = 'vi',\n  route = '',\n}) {",
    "export default function GlobalWorkScheduleCenter({\n  currentUser,\n  language = 'vi',\n  route = '',\n  embedded = false,\n  mountSelector = '',\n}) {",
    'schedule embedded props',
)
text = text.replace("  const [view, setView] = useState(hashState.view);", "  const [view, setView] = useState(() => embedded ? 'schedule' : hashState.view);")
text = text.replace("  const routeActive = route === 'work-hub' || hashState.route === 'work-hub';", "  const routeActive = embedded || route === 'work-hub' || hashState.route === 'work-hub';")
text = replace_once(
    text,
    "  useEffect(() => {\n    if (!routeActive) return;\n    setView(hashState.view);\n    if (hashState.eventId) setSelectedId(hashState.eventId);\n  }, [hashState.eventId, hashState.view, routeActive]);",
    "  useEffect(() => {\n    if (!routeActive) return;\n    if (embedded) {\n      setView('schedule');\n      return;\n    }\n    setView(hashState.view);\n    if (hashState.eventId) setSelectedId(hashState.eventId);\n  }, [embedded, hashState.eventId, hashState.view, routeActive]);",
    'schedule route view effect',
)
text = replace_once(
    text,
    "      const hub = document.querySelector('.v1093-work-hub');\n      if (!hub) return;",
    "      const hub = embedded && mountSelector\n        ? document.querySelector(mountSelector)\n        : document.querySelector('.v1093-work-hub');\n      if (!hub) return;",
    'schedule embedded mount lookup',
)
text = replace_once(
    text,
    "        const hero = hub.querySelector(':scope > .v1093-hero');\n        if (hero?.nextSibling) hub.insertBefore(node, hero.nextSibling);\n        else hub.appendChild(node);",
    "        const hero = embedded ? null : hub.querySelector(':scope > .v1093-hero');\n        if (hero?.nextSibling) hub.insertBefore(node, hero.nextSibling);\n        else hub.appendChild(node);",
    'schedule embedded insertion',
)
text = text.replace("  }, [routeActive]);", "  }, [embedded, mountSelector, routeActive]);", 1)
text = replace_once(
    text,
    "  function switchView(nextView) {\n    setView(nextView);\n    replaceWorkHubHash(nextView);\n    if (nextView === 'schedule') setHashState((current) => ({ ...current, route: 'work-hub', view: 'schedule' }));\n  }",
    "  function switchView(nextView) {\n    if (embedded) {\n      setView('schedule');\n      return;\n    }\n    setView(nextView);\n    replaceWorkHubHash(nextView);\n    if (nextView === 'schedule') setHashState((current) => ({ ...current, route: 'work-hub', view: 'schedule' }));\n  }",
    'schedule switch view',
)
text = replace_once(
    text,
    "      <nav className=\"work-schedule-tabs\" aria-label=\"Chế độ Trung tâm công việc\">",
    "      {!embedded ? <nav className=\"work-schedule-tabs\" aria-label=\"Chế độ Trung tâm công việc\">",
    'schedule tabs conditional start',
)
text = replace_once(
    text,
    "      </nav>\n\n      {view === 'schedule' ? <section",
    "      </nav> : null}\n\n      {view === 'schedule' ? <section",
    'schedule tabs conditional end',
)
text = text.replace(
    "Mọi hoạt động được lưu bằng dữ liệu Trung tâm công việc để đồng bộ với Dashboard, thông báo và Automation Center.",
    "Lịch chung của tổ được đồng bộ trực tiếp giữa Kênh TTCM, Dashboard và Automation Center.",
)
write(path, text)


# 5) Turn TTCM into the single collaboration surface and embed the schedule.
path = 'src/components/GlobalTtcmNavigationTab.jsx'
text = read(path)
text = text.replace("import { launchRoute } from '../utils/navigation.js';\n", '')
text = text.replace("  rememberWorkHubItem,\n", '')
text = replace_once(
    text,
    "import './GlobalTtcmNavigationTab.css';",
    "import GlobalWorkScheduleCompatibleCenter from './GlobalWorkScheduleCompatibleCenter.jsx';\nimport './GlobalWorkScheduleModern.css';\nimport './GlobalTtcmNavigationTab.css';",
    'TTCM schedule import',
)
text = text.replace("Giáo viên phản hồi trong Công việc", "Giáo viên phản hồi ngay tại TTCM")
text = text.replace("Theo dõi trong Trung tâm công việc", "Theo dõi và phản hồi ngay tại TTCM")
text = text.replace("  delete: 'M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2H7Zm1-11v8h2v-8H8Zm6 0v8h2v-8h-2ZM8 4l1-1h6l1 1h4v2H4V4h4Z',\n};", "  delete: 'M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2H7Zm1-11v8h2v-8H8Zm6 0v8h2v-8h-2ZM8 4l1-1h6l1 1h4v2H4V4h4Z',\n  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14h18V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11Z',\n};")
text = replace_once(
    text,
    "  const [editingId, setEditingId] = useState('');\n  const [items, setItems]",
    "  const [editingId, setEditingId] = useState('');\n  const [workspaceView, setWorkspaceView] = useState('feed');\n  const [responseItem, setResponseItem] = useState(null);\n  const [responseText, setResponseText] = useState('');\n  const [responseFile, setResponseFile] = useState(null);\n  const [items, setItems]",
    'TTCM workspace state',
)
# Add external/open-on-load bridge after nav host observer effect.
marker = "  useEffect(() => {\n    setItems(readLocalItems(currentUser));"
insertion = """  useEffect(() => {\n    const openTtcm = (event) => {\n      const nextView = event?.detail?.view === 'schedule' ? 'schedule' : 'feed';\n      setWorkspaceView(nextView);\n      setOpen(true);\n      setComposeOpen(false);\n      setError('');\n    };\n    window.addEventListener('bes-ttcm-open', openTtcm);\n    try {\n      const pending = window.sessionStorage.getItem('bes-ttcm-open-on-load');\n      if (pending) {\n        window.sessionStorage.removeItem('bes-ttcm-open-on-load');\n        window.setTimeout(() => openTtcm({ detail: { view: pending } }), 0);\n      }\n    } catch { /* optional */ }\n    return () => window.removeEventListener('bes-ttcm-open', openTtcm);\n  }, []);\n\n"""
if marker not in text:
    raise SystemExit('Marker not found: TTCM open event')
text = text.replace(marker, insertion + marker, 1)
# Escape closes response composer first.
text = text.replace("      if (composeOpen) setComposeOpen(false);\n      else setOpen(false);", "      if (responseItem) setResponseItem(null);\n      else if (composeOpen) setComposeOpen(false);\n      else setOpen(false);")
text = text.replace("  }, [composeOpen, open]);", "  }, [composeOpen, open, responseItem]);")
# Update wording now that Work Hub UI is retired.
text = text.replace("Đã cập nhật nội dung đã gửi. Thay đổi được đồng bộ đến tổ viên và Trung tâm công việc.", "Đã cập nhật nội dung đã gửi. Thay đổi được đồng bộ trực tiếp đến tổ viên trong Kênh TTCM.")
text = text.replace("Nội dung sẽ biến mất khỏi Kênh TTCM và mục liên quan trong Trung tâm công việc.", "Nội dung sẽ biến mất khỏi Kênh TTCM và dữ liệu theo dõi liên quan.")
text = text.replace("Đã xóa nội dung TTCM và dữ liệu công việc liên quan.", "Đã xóa nội dung TTCM và dữ liệu theo dõi liên quan.")
text = text.replace("Đã gửi đến tổ viên và tạo mục theo dõi trong Trung tâm công việc.", "Đã gửi đến tổ viên và bật theo dõi phản hồi ngay trong Kênh TTCM.")
# Remove legacy Work Hub launcher.
text = re.sub(r"\n  function openWorkItem\(item\) \{.*?\n  \}\n\n  async function acknowledge", "\n  async function acknowledge", text, count=1, flags=re.S)
# Add inline TTCM response submission before acknowledge.
marker = "  async function acknowledge(item) {"
response_fn = r'''  function beginResponse(item) {
    markRead(item.id);
    setResponseItem(item);
    setResponseText('');
    setResponseFile(null);
    setError('');
  }

  async function submitResponse(event) {
    event.preventDefault();
    if (!responseItem || busy) return;
    if (!responseText.trim() && !responseFile) {
      setError('Vui lòng nhập phản hồi hoặc đính kèm tệp.');
      return;
    }
    if (responseFile) {
      const validation = validateWorkHubFile(responseFile);
      if (!validation.ok) { setError(validation.message); return; }
    }
    if (!client || !runtime.ready || !runtime.session) {
      setNotice('Phản hồi cần kết nối Supabase để gửi đến TTCM.');
      return;
    }

    setBusy(true); setError('');
    try {
      let attachments = [];
      if (responseFile) {
        const upload = await uploadWorkHubSubmissionFile({ file: responseFile, itemId: responseItem.id, userId: currentUser.id });
        if (!upload.ok) throw new Error(upload.message || 'Không thể tải tệp phản hồi.');
        attachments = [upload.attachment];
      }
      const responseType = typeForItem(responseItem).id === 'feedback' ? 'feedback' : 'submission';
      const { error: responseError } = await client.from('work_hub_comments').insert({
        item_id: responseItem.id,
        author_id: currentUser.id,
        body: responseText.trim() || 'Đã hoàn thành yêu cầu.',
        comment_type: `ttcm_${responseType}`,
        attachments,
      });
      if (responseError) throw responseError;
      markRead(responseItem.id);
      setResponseItem(null);
      setResponseText('');
      setResponseFile(null);
      setNotice(responseType === 'feedback' ? 'Đã gửi góp ý trực tiếp đến TTCM.' : 'Đã gửi phản hồi/hoàn thành đến TTCM.');
      window.setTimeout(() => setNotice(''), 3200);
    } catch (responseError) {
      setError(responseError?.message || 'Không thể gửi phản hồi đến TTCM.');
    } finally {
      setBusy(false);
    }
  }

'''
if marker not in text:
    raise SystemExit('Marker not found: TTCM response insertion')
text = text.replace(marker, response_fn + marker, 1)
# Open tab should default to feed only when it was closed manually; external event can select schedule.
text = text.replace("        if (!open) loadFeed();", "        if (!open) { setWorkspaceView('feed'); loadFeed(); }")
# Hide create button on schedule view.
text = text.replace("{manager ? <button type=\"button\" className=\"ttcm-m3-filled-button\" onClick={beginCompose}", "{manager && workspaceView === 'feed' ? <button type=\"button\" className=\"ttcm-m3-filled-button\" onClick={beginCompose}")
# Replace toolbar with workspace-level switch plus feed filters.
old_toolbar = '''        <div className="ttcm-m3-toolbar">
          <div className="ttcm-m3-filters" role="tablist" aria-label="Lọc nội dung TTCM">
            {[
              ['all', 'Tất cả'],
              ['announcement', 'Thông báo'],
              ['resource', 'Tài liệu'],
              ['action', 'Cần xử lý'],
            ].map(([id, label]) => (
              <button key={id} type="button" className={filter === id ? 'is-selected' : ''} onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>
          {!manager && unseenCount > 0 ? <button type="button" className="ttcm-m3-text-button" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button> : null}
        </div>'''
new_toolbar = '''        <div className="ttcm-m3-toolbar">
          <div className="ttcm-m3-workspace-tabs" role="tablist" aria-label="Khu vực TTCM">
            <button type="button" className={workspaceView === 'feed' ? 'is-selected' : ''} onClick={() => setWorkspaceView('feed')}><Icon name="campaign" size={18} />Trao đổi</button>
            <button type="button" className={workspaceView === 'schedule' ? 'is-selected' : ''} onClick={() => setWorkspaceView('schedule')}><Icon name="calendar" size={18} />Lịch làm việc</button>
          </div>
          {workspaceView === 'feed' ? <>
            <div className="ttcm-m3-filters" role="tablist" aria-label="Lọc nội dung TTCM">
              {[
                ['all', 'Tất cả'],
                ['announcement', 'Thông báo'],
                ['resource', 'Tài liệu'],
                ['action', 'Cần xử lý'],
              ].map(([id, label]) => (
                <button key={id} type="button" className={filter === id ? 'is-selected' : ''} onClick={() => setFilter(id)}>{label}</button>
              ))}
            </div>
            {!manager && unseenCount > 0 ? <button type="button" className="ttcm-m3-text-button" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button> : null}
          </> : <span className="ttcm-m3-schedule-caption">Lịch dùng chung của tổ chuyên môn</span>}
        </div>'''
text = replace_once(text, old_toolbar, new_toolbar, 'TTCM workspace toolbar')
# Feed becomes conditional; schedule is embedded in same Material shell.
text = replace_once(text, '        <main className="ttcm-m3-feed">', "        {workspaceView === 'feed' ? <main className=\"ttcm-m3-feed\">", 'TTCM conditional feed start')
text = replace_once(
    text,
    "        </main>\n\n        {composeOpen && manager ? (",
    "        </main> : <main className=\"ttcm-m3-schedule-view\">\n          <div className=\"ttcm-m3-schedule-host v1093-work-hub\" data-ttcm-schedule-host=\"true\" />\n          <GlobalWorkScheduleCompatibleCenter currentUser={currentUser} language={language} route=\"ttcm\" embedded mountSelector='[data-ttcm-schedule-host=\"true\"]' />\n        </main>}\n\n        {responseItem && !manager ? (\n          <div className=\"ttcm-m3-compose-layer\" role=\"presentation\">\n            <form className=\"ttcm-m3-response-dialog\" onSubmit={submitResponse}>\n              <header><div><strong>{typeForItem(responseItem).id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi yêu cầu'}</strong><small>{responseItem.title}</small></div><button type=\"button\" className=\"ttcm-m3-icon-button\" onClick={() => setResponseItem(null)} aria-label=\"Đóng\"><Icon name=\"close\" /></button></header>\n              <label className=\"ttcm-m3-field\"><span>Nội dung phản hồi</span><textarea value={responseText} onChange={(event) => setResponseText(event.target.value)} rows={5} placeholder=\"Nhập góp ý, kết quả thực hiện hoặc nội dung cần phản hồi…\" /></label>\n              <label className=\"ttcm-m3-field\"><span>Tệp đính kèm <small>(nếu có, tối đa 10 MB)</small></span><input type=\"file\" onChange={(event) => setResponseFile(event.target.files?.[0] || null)} /></label>\n              {error ? <div className=\"ttcm-m3-banner is-error\">{error}</div> : null}\n              <footer><button type=\"button\" className=\"ttcm-m3-text-button\" onClick={() => setResponseItem(null)}>Hủy</button><button type=\"submit\" className=\"ttcm-m3-filled-button\" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi đến TTCM'}</button></footer>\n            </form>\n          </div>\n        ) : null}\n\n        {composeOpen && manager ? (",
    'TTCM conditional feed end and response dialog',
)
# Replace teacher action launcher with inline TTCM action.
old_action = '''                  {!manager && isActionItem(item) ? (
                    <div className="ttcm-m3-card-actions">
                      {type.id === 'acknowledgement' ? <button type="button" className="ttcm-m3-tonal-button" disabled={busy} onClick={(event) => { event.stopPropagation(); acknowledge(item); }}><Icon name="check" size={18} />Xác nhận đã nhận</button> : null}
                      <button type="button" className="ttcm-m3-filled-button" onClick={(event) => { event.stopPropagation(); openWorkItem(item); }}>Mở trong Công việc<Icon name="arrow" size={18} /></button>
                    </div>
                  ) : null}'''
new_action = '''                  {!manager && isActionItem(item) ? (
                    <div className="ttcm-m3-card-actions">
                      {type.id === 'acknowledgement' ? <button type="button" className="ttcm-m3-tonal-button" disabled={busy} onClick={(event) => { event.stopPropagation(); acknowledge(item); }}><Icon name="check" size={18} />Xác nhận đã nhận</button> : null}
                      {type.id !== 'acknowledgement' ? <button type="button" className="ttcm-m3-filled-button" onClick={(event) => { event.stopPropagation(); beginResponse(item); }}>{type.id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi / hoàn thành'}<Icon name="arrow" size={18} /></button> : null}
                    </div>
                  ) : null}'''
text = replace_once(text, old_action, new_action, 'TTCM inline action')
write(path, text)


# 6) Material styling for TTCM workspace tabs, schedule embedding and response dialog.
path = 'src/components/GlobalTtcmNavigationTab.css'
text = read(path)
append = r'''

/* TTCM single-workspace consolidation: communications + shared work calendar. */
.ttcm-m3-workspace-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  padding: 4px;
  border-radius: 999px;
  background: #eef3f8;
}

.ttcm-m3-workspace-tabs button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #444746;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.ttcm-m3-workspace-tabs button:hover { background: rgba(11, 87, 208, .08); }
.ttcm-m3-workspace-tabs button.is-selected { background: #fff; color: #0b57d0; box-shadow: 0 1px 2px rgba(60,64,67,.16); }

.ttcm-m3-schedule-caption {
  margin-left: auto;
  color: #5f6368;
  font-size: 13px;
  font-weight: 650;
}

.ttcm-m3-schedule-view {
  position: relative;
  min-height: 0;
  overflow: auto;
  padding: 0;
  background: #f8fafd;
}

.ttcm-m3-schedule-host.v1093-work-hub {
  display: block !important;
  width: 100% !important;
  min-height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.ttcm-m3-schedule-view .work-schedule-mount,
.ttcm-m3-schedule-view .work-schedule-integration {
  width: 100%;
  max-width: none;
  margin: 0;
}

.ttcm-m3-schedule-view .work-schedule-integration { padding: 16px 18px 24px; box-sizing: border-box; }
.ttcm-m3-schedule-view .work-schedule-tabs { display: none !important; }
.ttcm-m3-schedule-view .work-schedule-center { margin: 0; }
.ttcm-m3-schedule-view .work-schedule-toolbar { border-radius: 20px; }

.ttcm-m3-response-dialog {
  width: min(640px, calc(100% - 24px));
  max-height: calc(100% - 24px);
  overflow: auto;
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid #c4c7c5;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(60, 64, 67, .22);
}

.ttcm-m3-response-dialog > header,
.ttcm-m3-response-dialog > footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.ttcm-m3-response-dialog > header { align-items: flex-start; }
.ttcm-m3-response-dialog > header strong { display: block; font-size: 18px; color: #1f1f1f; }
.ttcm-m3-response-dialog > header small { display: block; margin-top: 4px; color: #5f6368; line-height: 1.4; }
.ttcm-m3-response-dialog > footer { justify-content: flex-end; }

@media (max-width: 820px) {
  .ttcm-m3-toolbar { flex-wrap: wrap; }
  .ttcm-m3-workspace-tabs { width: 100%; }
  .ttcm-m3-workspace-tabs button { flex: 1 1 0; justify-content: center; }
  .ttcm-m3-schedule-caption { margin-left: 0; }
  .ttcm-m3-schedule-view .work-schedule-integration { padding: 10px; }
  .ttcm-m3-response-dialog { width: 100%; max-height: 100%; min-height: 100%; border: 0; border-radius: 0; box-shadow: none; }
}
'''
if 'TTCM single-workspace consolidation' not in text:
    text += append
write(path, text)


# 7) Dashboard links now open TTCM instead of the retired Work Hub.
path = 'src/pages/WorkDashboard.jsx'
text = read(path)
marker = "function Empty({ children }) { return <div className=\"gd-empty\""
if marker not in text:
    raise SystemExit('Marker not found: Dashboard helper insertion')
helper = "function openTtcm(view = 'feed') { window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view } })); }\n"
text = text.replace(marker, helper + marker, 1)
text = text.replace("['task', t.createWork, '#/work-hub']", "['task', t.createWork, 'ttcm:feed']")
text = text.replace("onClick={() => { window.location.hash = '#/work-hub'; }}", "onClick={() => openTtcm('schedule')}")
text = text.replace("action={() => { window.location.hash = leaderView ? '#/resource-library' : '#/work-hub'; }}", "action={() => { if (leaderView) window.location.hash = '#/resource-library'; else openTtcm('feed'); }}")
text = text.replace("onClick={() => { window.location.hash = target; }}", "onClick={() => { if (String(target).startsWith('ttcm:')) openTtcm(String(target).split(':')[1] || 'feed'); else window.location.hash = target; }}")
write(path, text)

print('TTCM consolidation patch applied successfully.')
