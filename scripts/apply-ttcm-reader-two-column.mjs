import { readFile, writeFile } from 'node:fs/promises';

const componentUrl = new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url);
const cssUrl = new URL('../src/components/GlobalTtcmTeacherReaderV2.css', import.meta.url);
let component = await readFile(componentUrl, 'utf8');

function replaceExact(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Cannot find ${label}`);
  return source.replace(before, after);
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`Cannot find start of ${label}`);
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex < 0) throw new Error(`Cannot find end of ${label}`);
  return `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`;
}

component = replaceExact(
  component,
  "  const [filter, setFilter] = useState('all');\n  const [kind, setKind] = useState('announcement');",
  "  const [filter, setFilter] = useState('all');\n  const [feedQuery, setFeedQuery] = useState('');\n  const [feedSort, setFeedSort] = useState('newest');\n  const [kind, setKind] = useState('announcement');",
  'feed search/sort state',
);

component = replaceExact(
  component,
  "function isDoneItem(item) { return ['completed', 'approved', 'archived'].includes(String(item?.status || '').toLowerCase()); }\nfunction formatFileSize(value) {",
  "function isDoneItem(item) { return ['completed', 'approved', 'archived'].includes(String(item?.status || '').toLowerCase()); }\nfunction isOverdueItem(item) { const due = item?.due_at ? new Date(item.due_at).getTime() : 0; return Boolean(due && due <= Date.now() && !isDoneItem(item)); }\nfunction formatFileSize(value) {",
  'overdue helper',
);

const oldFilterBlock = `  const filteredItems = useMemo(() => items.filter((item) => {\n    if (filter === 'all') return true;\n    if (filter === 'unread') return userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id));\n    if (filter === 'action') return isActionItem(item);\n    if (filter === 'due') { const due = item.due_at ? new Date(item.due_at).getTime() : 0; return Boolean(due && due >= Date.now() && !isDoneItem(item)); }\n    if (filter === 'done') return isDoneItem(item);\n    return true;\n  }), [currentUser?.id, filter, items, readIds]);\n\n  const selectedItem = useMemo(() => filteredItems.find((item) => String(item.id) === String(selectedItemId)) || filteredItems[0] || null, [filteredItems, selectedItemId]);`;

const newFilterBlock = `  const feedNeedle = feedQuery.trim().toLowerCase();\n  const filteredItems = useMemo(() => {\n    const visible = items.filter((item) => {\n      if (filter === 'unread' && !(userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id)))) return false;\n      if (filter === 'action' && !isActionItem(item)) return false;\n      if (filter === 'due') { const due = item.due_at ? new Date(item.due_at).getTime() : 0; if (!(due && due >= Date.now() && !isDoneItem(item))) return false; }\n      if (filter === 'done' && !isDoneItem(item)) return false;\n      if (feedNeedle && !\`${'${item.title || \'\'} ${item.description || \'\'} ${typeForItem(item).label}'}\`.toLowerCase().includes(feedNeedle)) return false;\n      return true;\n    });\n    return [...visible].sort((left, right) => {\n      const leftTime = new Date(left.created_at || left.updated_at || 0).getTime() || 0;\n      const rightTime = new Date(right.created_at || right.updated_at || 0).getTime() || 0;\n      return feedSort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;\n    });\n  }, [currentUser?.id, feedNeedle, feedSort, filter, items, readIds]);\n\n  const selectedItem = useMemo(() => selectedItemId ? filteredItems.find((item) => String(item.id) === String(selectedItemId)) || null : null, [filteredItems, selectedItemId]);`;
component = replaceExact(component, oldFilterBlock, newFilterBlock, 'feed filtering block');

component = replaceExact(
  component,
  `  useEffect(() => {\n    if (!filteredItems.length) { setSelectedItemId(''); return; }\n    if (!filteredItems.some((item) => String(item.id) === String(selectedItemId))) setSelectedItemId(String(filteredItems[0].id));\n  }, [filteredItems, selectedItemId]);`,
  `  useEffect(() => {\n    if (selectedItemId && !filteredItems.some((item) => String(item.id) === String(selectedItemId))) setSelectedItemId('');\n  }, [filteredItems, selectedItemId]);`,
  'selection reconciliation',
);

component = replaceExact(
  component,
  `            {workspaceView === 'feed' && unseenCount > 0 ? <button type="button" className="ttcm-reader-mark-all" onClick={markAllRead}><Icon name="check" size={18} />Đánh dấu tất cả đã đọc</button> : null}\n`,
  '',
  'topbar mark-all action',
);

const feedStart = `        {workspaceView === 'feed' ? (\n`;
const feedEnd = `        ) : workspaceView === 'schedule' ?`;
const feedReplacement = `        {workspaceView === 'feed' ? (\n          <main className="ttcm-reader-workspace">\n            <section className="ttcm-reader-list" aria-label="Danh sách thông báo">\n              <header className="ttcm-reader-list-head">\n                <div><span>Thông báo mới nhất</span><small>{filteredItems.length}{feedQuery ? \`/${counts.all}\` : ''} nội dung</small></div>\n                {unseenCount > 0 ? <button type="button" className="ttcm-reader-mark-all-quiet" onClick={markAllRead}><Icon name="check" size={16} />Đánh dấu tất cả đã đọc</button> : null}\n              </header>\n              <div className="ttcm-reader-filter-chips" aria-label="Bộ lọc thông báo">\n                {[\n                  ['all', 'Tất cả', '#2563eb'],\n                  ['unread', 'Chưa đọc', '#1685e6'],\n                  ['action', 'Cần xử lý', '#e59a11'],\n                  ['due', 'Sắp đến hạn', '#ef5350'],\n                  ['done', 'Hoàn tất', '#23a66f'],\n                ].map(([id, label, color]) => (\n                  <button key={id} type="button" className={filter === id ? 'is-selected' : ''} aria-pressed={filter === id} onClick={() => { setFilter(id); setSelectedItemId(''); }}>\n                    <span className="ttcm-reader-dot" style={{ '--dot': color }} /><span>{label}</span><b>{counts[id]}</b>\n                  </button>\n                ))}\n              </div>\n              <div className="ttcm-reader-list-scroll">\n                {loading ? <div className="ttcm-reader-empty">Đang đồng bộ kênh TTCM…</div> : null}\n                {!loading && filteredItems.map((item) => {\n                  const type = typeForItem(item); const unread = userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id));\n                  const active = String(selectedItem?.id || '') === String(item.id); const attachments = Array.isArray(item.attachments) ? item.attachments : [];\n                  const overdue = isOverdueItem(item); const done = isDoneItem(item);\n                  const statusLabel = done ? 'Hoàn tất' : overdue ? 'Hết hạn' : unread ? 'Chưa đọc' : isActionItem(item) ? 'Cần xử lý' : 'Đã đọc';\n                  const statusClass = done ? 'is-done' : overdue ? 'is-overdue' : unread ? 'is-unread' : isActionItem(item) ? 'is-action' : 'is-read';\n                  return (\n                    <article key={item.id} role="button" tabIndex={0} className={\`ttcm-reader-card is-${'${type.id}'} ${'${unread ? \'is-unread\' : \'\'}'} ${'${active ? \'is-selected\' : \'\'}'}\`}\n                      onClick={() => openItem(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openItem(item); } }}>\n                      <span className="ttcm-reader-card-icon"><Icon name={type.glyph} size={20} /></span>\n                      <div className="ttcm-reader-card-body">\n                        <div className="ttcm-reader-card-titleline"><h3>{item.title}</h3><time>{formatDate(item.created_at || item.updated_at)}</time></div>\n                        {item.description ? <p>{item.description}</p> : <p className="is-muted">Nhấn để xem nội dung chi tiết.</p>}\n                        <div className="ttcm-reader-card-foot">\n                          <span className={\`ttcm-reader-card-status ${'${statusClass}'}\`}><i />{statusLabel}</span>\n                          {attachments.length ? <span className="ttcm-reader-card-filecount">{attachments.length} tệp</span> : null}\n                        </div>\n                      </div>\n                    </article>\n                  );\n                })}\n                {!loading && !filteredItems.length ? <div className="ttcm-reader-empty"><Icon name="campaign" size={30} /><strong>Không có nội dung phù hợp</strong><span>{feedQuery ? 'Thử từ khóa khác hoặc xóa tìm kiếm.' : (manager ? 'Tạo nội dung mới hoặc chọn bộ lọc khác.' : 'Thông báo mới từ TTCM sẽ xuất hiện tại đây.')}</span></div> : null}\n              </div>\n            </section>\n\n            <section className="ttcm-reader-detail" aria-label="Nội dung thông báo">\n              <header className="ttcm-reader-detail-head">\n                <button type="button" className="ttcm-reader-back" onClick={() => setSelectedItemId('')}>← Quay lại danh sách</button>\n                <div className="ttcm-reader-detail-tools">\n                  <label className="ttcm-reader-search"><span aria-hidden="true">⌕</span><input type="search" value={feedQuery} onChange={(event) => setFeedQuery(event.target.value)} placeholder="Tìm kiếm thông báo…" aria-label="Tìm kiếm thông báo TTCM" /></label>\n                  <select className="ttcm-reader-sort" value={feedSort} onChange={(event) => setFeedSort(event.target.value)} aria-label="Sắp xếp thông báo"><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select>\n                </div>\n              </header>\n              {selectedItem ? (\n                <>\n                  <div className="ttcm-reader-detail-scroll">\n                    <article className="ttcm-reader-detail-card">\n                      <div className="ttcm-reader-detail-meta"><span className={\`is-${'${selectedType?.id || \'announcement\'}'}\`}>{selectedType?.label || 'Thông báo'}</span><time>{formatFullDate(selectedItem.created_at || selectedItem.updated_at)}</time>{selectedUnread ? <b>Mới</b> : null}{selectedItem.due_at ? <em className={isOverdueItem(selectedItem) ? 'is-overdue' : ''}>{isOverdueItem(selectedItem) ? 'Hết hạn' : dueLabel(selectedItem.due_at)}</em> : null}</div>\n                      <h2>{selectedItem.title}</h2>\n                      <div className="ttcm-reader-message">{selectedItem.description ? selectedItem.description : 'TTCM chưa nhập nội dung mô tả bổ sung cho thông báo này.'}</div>\n\n                      {selectedAttachments.length ? (\n                        <section className="ttcm-reader-files">\n                          <header><div><strong>Tệp đính kèm ({selectedAttachments.length})</strong><small>Tài liệu gắn với nội dung này</small></div><button type="button" onClick={() => downloadAllAttachments(selectedItem)}><Icon name="download" size={17} />Tải tất cả</button></header>\n                          <div>\n                            {selectedAttachments.map((attachment, index) => {\n                              const ext = getWorkHubAttachmentExtension(attachment); const meta = [ext ? ext.toUpperCase() : 'FILE', formatFileSize(attachment.size)].filter(Boolean).join(' · ');\n                              return (\n                                <article key={\`${'${attachment.path || attachment.name}'}-${'${index}'}\`} className="ttcm-reader-file-row">\n                                  <span className={\`ttcm-reader-file-type is-${'${ext || \'file\'}'}\`}>{ext ? ext.slice(0, 4).toUpperCase() : 'FILE'}</span>\n                                  <div><b>{attachment.name || \`Tệp ${'${index + 1}'}\`}</b><small>{meta}</small></div>\n                                  <div className="ttcm-reader-file-actions">\n                                    <button type="button" onClick={() => previewAttachment(selectedItem, attachment)} title="Xem trước"><Icon name="eye" size={18} /></button>\n                                    {canManageSelected ? <button type="button" onClick={() => editAttachment(selectedItem, attachment)} title="Sửa trực tiếp"><Icon name="edit" size={18} /></button> : null}\n                                    <button type="button" onClick={() => downloadAttachment(selectedItem, attachment)} title="Tải về"><Icon name="download" size={18} /></button>\n                                  </div>\n                                </article>\n                              );\n                            })}\n                          </div>\n                        </section>\n                      ) : null}\n\n                      {responsesForItem(selectedItem.id).length ? (\n                        <section className="ttcm-reader-response-preview">\n                          <header><div><Icon name="people" size={18} /><strong>Phản hồi ({responsesForItem(selectedItem.id).length})</strong></div><button type="button" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}>Xem tất cả →</button></header>\n                          <div>{responsesForItem(selectedItem.id).slice(0, 2).map((entry) => { const author = responseAuthor(entry.author_id); const initials = author.trim().split(/\\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase(); return <article key={entry.id || \`${'${entry.author_id}'}:${'${entry.created_at}'}\`}><span>{initials || 'GV'}</span><div><b>{author}</b><p>{entry.body || 'Đã phản hồi nội dung này.'}</p></div><time>{formatFullDate(entry.created_at)}</time></article>; })}</div>\n                        </section>\n                      ) : null}\n                    </article>\n                  </div>\n                  <footer className="ttcm-reader-detail-footer">\n                    <span className="ttcm-reader-footer-spacer" />\n                    {canActOnSelected ? (\n                      <div className={manager ? 'ttcm-reader-manager-footer' : undefined}>\n                        {manager && canManageSelected ? <button type="button" className="ttcm-reader-secondary" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}><Icon name="people" size={18} />Phản hồi ({responsesForItem(selectedItem.id).length})</button> : null}\n                        {selectedType?.id === 'acknowledgement'\n                          ? <button type="button" className="ttcm-reader-primary" disabled={busy} onClick={() => acknowledge(selectedItem)}><Icon name="check" size={18} />Xác nhận đã nhận</button>\n                          : <button type="button" className="ttcm-reader-primary" onClick={() => beginResponse(selectedItem)}><Icon name="arrow" size={18} />{selectedType?.id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi / hoàn thành'}</button>}\n                        {manager && canManageSelected ? <button type="button" className="ttcm-reader-secondary" onClick={() => beginEdit(selectedItem)}><Icon name="edit" size={18} />Chỉnh sửa</button> : null}\n                      </div>\n                    ) : canManageSelected ? (\n                      <div className="ttcm-reader-manager-footer"><button type="button" className="ttcm-reader-secondary" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}><Icon name="people" size={18} />Phản hồi ({responsesForItem(selectedItem.id).length})</button><button type="button" className="ttcm-reader-primary" onClick={() => beginEdit(selectedItem)}><Icon name="edit" size={18} />Chỉnh sửa</button></div>\n                    ) : (\n                      <button type="button" className={\`ttcm-reader-primary ${'${selectedUnread ? \'\' : \'is-done\'}'}\`} onClick={() => markRead(selectedItem.id)} disabled={!selectedUnread}><Icon name="check" size={18} />{selectedUnread ? 'Đánh dấu đã đọc' : 'Đã đọc'}</button>\n                    )}\n                  </footer>\n                </>\n              ) : <div className="ttcm-reader-detail-empty"><span><Icon name="campaign" size={32} /></span><strong>Chọn một thông báo để đọc</strong><p>Nội dung, tệp đính kèm và phản hồi sẽ hiển thị tại đây.</p></div>}\n            </section>\n          </main>\n`;
component = replaceBetween(component, feedStart, feedEnd, feedReplacement, 'feed workspace');

const css = `/* TTCM Teacher Reader — simplified two-column workspace */

.ttcm-reader-shell {
  --reader-blue: #0b67eb;
  --reader-blue-soft: #eef5ff;
  --reader-line: #dfe7f1;
  --reader-text: #10243e;
  --reader-muted: #6b7b91;
  --reader-green: #1ca56d;
  --reader-amber: #e6a019;
  --reader-red: #ef5350;
  width: min(1510px, calc(100vw - 28px));
  height: min(940px, calc(100vh - 28px));
  border: 1px solid #dce5ef;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 28px 80px rgba(20, 36, 60, .22);
}

.ttcm-reader-shell .ttcm-m3-topbar {
  min-height: 94px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--reader-line);
  background: #fff;
}
.ttcm-reader-shell .ttcm-m3-title { gap: 14px; }
.ttcm-reader-shell .ttcm-m3-title-icon {
  width: 52px; height: 52px; border: 1px solid #d9e7ff; border-radius: 15px;
  background: #f1f6ff; color: var(--reader-blue); box-shadow: none;
}
.ttcm-reader-shell .ttcm-m3-title > div::before { color: #77879b; font-size: 9px; letter-spacing: .15em; }
.ttcm-reader-shell .ttcm-m3-title strong { color: #0b2340; font-size: 27px; letter-spacing: -.035em; }
.ttcm-reader-shell .ttcm-m3-title small { margin-top: 4px; color: #718096; font-size: 12.5px; }
.ttcm-reader-shell .ttcm-m3-top-actions { gap: 9px; }
.ttcm-reader-shell .ttcm-m3-icon-button {
  width: 44px; height: 44px; border: 1px solid #d7e1ed; border-radius: 13px;
  background: #fff; color: #51647d;
}
.ttcm-reader-shell .ttcm-m3-icon-button:hover { border-color: #bfcfe1; background: #f6f9fd; color: #155fc9; }
.ttcm-reader-shell .ttcm-m3-filled-button {
  min-height: 44px; padding: 0 20px; border: 1px solid #0961dd; border-radius: 12px;
  background: #0b67eb; color: #fff; box-shadow: 0 6px 16px rgba(11,103,235,.18);
}

.ttcm-reader-toolbar.ttcm-m3-toolbar {
  min-height: 58px; padding: 0 24px; border-bottom: 1px solid var(--reader-line); background: #fff;
}
.ttcm-reader-toolbar .ttcm-m3-workspace-tabs { gap: 8px; align-items: center; }
.ttcm-reader-toolbar .ttcm-m3-workspace-tabs button {
  min-height: 38px; height: 38px; padding: 0 13px; border-radius: 10px; color: #607188;
}
.ttcm-reader-toolbar .ttcm-m3-workspace-tabs button.is-selected { background: #eef4ff; color: #0e62d6; }
.ttcm-reader-toolbar .ttcm-m3-workspace-tabs button.is-selected::after { display: none; }

.ttcm-reader-workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(390px, .96fr) minmax(0, 1.04fr);
  overflow: hidden;
  background: #fff;
}

.ttcm-reader-list {
  min-width: 0; min-height: 0; display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  border-right: 1px solid var(--reader-line); background: #fbfcfe;
}
.ttcm-reader-list-head {
  min-height: 70px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 22px 8px; background: #fff;
}
.ttcm-reader-list-head > div { min-width: 0; }
.ttcm-reader-list-head span { display: block; color: #152d4b; font-size: 20px; font-weight: 850; letter-spacing: -.025em; }
.ttcm-reader-list-head small { display: block; margin-top: 3px; color: #8997a9; font-size: 11px; }
.ttcm-reader-mark-all-quiet {
  display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px;
  border: 0; border-radius: 9px; background: transparent; color: #52708f;
  font: inherit; font-size: 10.5px; font-weight: 760; cursor: pointer; white-space: nowrap;
}
.ttcm-reader-mark-all-quiet:hover { background: #f0f5fb; color: #0b63d9; }

.ttcm-reader-filter-chips {
  display: flex; align-items: center; gap: 7px; min-width: 0; padding: 7px 20px 12px;
  border-bottom: 1px solid var(--reader-line); background: #fff; overflow-x: auto; scrollbar-width: none;
}
.ttcm-reader-filter-chips::-webkit-scrollbar { display: none; }
.ttcm-reader-filter-chips button {
  flex: 0 0 auto; min-height: 36px; display: inline-flex; align-items: center; gap: 7px;
  padding: 0 10px; border: 1px solid #dce5ef; border-radius: 999px; background: #fff;
  color: #52647b; font: inherit; font-size: 10.5px; font-weight: 780; cursor: pointer;
}
.ttcm-reader-filter-chips button:hover { border-color: #b9cbea; background: #f8fbff; color: #185ebd; }
.ttcm-reader-filter-chips button.is-selected { border-color: #a9c7ff; background: #eef5ff; color: #0e60cc; }
.ttcm-reader-filter-chips button b {
  min-width: 21px; height: 21px; display: inline-grid; place-items: center; padding: 0 5px;
  border-radius: 999px; background: #eef2f7; color: #66768a; font-size: 9.5px;
}
.ttcm-reader-filter-chips button.is-selected b { background: #dbe9ff; color: #0e60cc; }
.ttcm-reader-dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--dot, #64748b);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dot, #64748b) 10%, transparent);
}

.ttcm-reader-list-scroll { min-height: 0; overflow-y: auto; padding: 12px 16px 22px 20px; scrollbar-width: thin; }
.ttcm-reader-card {
  position: relative; display: grid; grid-template-columns: 48px minmax(0,1fr); gap: 13px;
  margin: 0 0 9px; padding: 14px 14px; border: 1px solid #e0e7ef; border-radius: 14px;
  background: #fff; color: var(--reader-text); outline: none; cursor: pointer;
  transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease, background .15s ease;
}
.ttcm-reader-card:hover { border-color: #c3d2e5; box-shadow: 0 6px 18px rgba(30,59,97,.07); transform: translateY(-1px); }
.ttcm-reader-card.is-selected { border-color: #9bc0ff; background: #f5f9ff; box-shadow: inset 4px 0 0 #0b67eb; }
.ttcm-reader-card-icon {
  width: 46px; height: 46px; display: grid; place-items: center; border: 1px solid #dbe7f6;
  border-radius: 12px; background: #f2f6fc; color: #2c6fce;
}
.ttcm-reader-card.is-resource .ttcm-reader-card-icon { background: #effaf4; border-color: #d2ecde; color: #23915e; }
.ttcm-reader-card.is-task .ttcm-reader-card-icon,
.ttcm-reader-card.is-feedback .ttcm-reader-card-icon,
.ttcm-reader-card.is-acknowledgement .ttcm-reader-card-icon { background: #fff8eb; border-color: #f1dfb8; color: #ba7910; }
.ttcm-reader-card-body { min-width: 0; }
.ttcm-reader-card-titleline { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.ttcm-reader-card h3 { flex: 1 1 auto; min-width: 0; margin: 1px 0 0; color: #152840; font-size: 14px; font-weight: 820; line-height: 1.35; }
.ttcm-reader-card-titleline time { flex: 0 0 auto; color: #8291a4; font-size: 9.5px; white-space: nowrap; }
.ttcm-reader-card p {
  display: -webkit-box; margin: 6px 0 0; overflow: hidden; color: #65758a; font-size: 11.5px; line-height: 1.45;
  -webkit-line-clamp: 1; -webkit-box-orient: vertical;
}
.ttcm-reader-card p.is-muted { color: #98a3b1; font-style: italic; }
.ttcm-reader-card-foot { display: flex; align-items: center; gap: 7px; margin-top: 10px; }
.ttcm-reader-card-status {
  min-height: 24px; display: inline-flex; align-items: center; gap: 6px; padding: 0 9px;
  border-radius: 999px; background: #f3f5f8; color: #6d7a8c; font-size: 9.5px; font-weight: 820;
}
.ttcm-reader-card-status i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.ttcm-reader-card-status.is-overdue { background: #fff0ee; color: #df514a; }
.ttcm-reader-card-status.is-done { background: #eaf9f1; color: #1a9a64; }
.ttcm-reader-card-status.is-unread { background: #eaf3ff; color: #176cd4; }
.ttcm-reader-card-status.is-action { background: #fff6df; color: #c8840b; }
.ttcm-reader-card-filecount { color: #8593a4; font-size: 9.5px; font-weight: 700; }

.ttcm-reader-detail { min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0,1fr) auto; background: #fff; }
.ttcm-reader-detail-head {
  min-height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 10px 22px; border-bottom: 1px solid #edf1f5; background: #fff;
}
.ttcm-reader-back { flex: 0 0 auto; border: 0; background: transparent; color: #64758b; font: inherit; font-size: 11px; font-weight: 740; cursor: pointer; }
.ttcm-reader-back:hover { color: #0b63d9; }
.ttcm-reader-detail-tools { display: flex; align-items: center; justify-content: flex-end; gap: 9px; min-width: 0; }
.ttcm-reader-search {
  width: min(250px, 34vw); min-width: 180px; height: 38px; display: flex; align-items: center; gap: 6px;
  padding: 0 10px; border: 1px solid #d8e2ee; border-radius: 10px; background: #fbfcfe; color: #8090a4;
}
.ttcm-reader-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #253b56; font: inherit; font-size: 11px; }
.ttcm-reader-search input::placeholder { color: #98a5b5; }
.ttcm-reader-sort { height: 38px; padding: 0 28px 0 11px; border: 1px solid #d8e2ee; border-radius: 10px; background: #fff; color: #425873; font: inherit; font-size: 11px; font-weight: 720; outline: 0; }
.ttcm-reader-detail-scroll { min-height: 0; overflow-y: auto; padding: 14px 20px 22px; background: #fff; scrollbar-width: thin; }
.ttcm-reader-detail-card { min-height: 100%; padding: 24px 26px 28px; border: 1px solid #dfe7ef; border-radius: 15px; background: #fff; }
.ttcm-reader-detail-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; margin-bottom: 15px; color: #8290a2; font-size: 10.5px; }
.ttcm-reader-detail-meta > span { padding: 5px 9px; border-radius: 8px; background: #edf4ff; color: #1764c8; font-weight: 820; }
.ttcm-reader-detail-meta > span.is-resource { background: #edf8f1; color: #237c51; }
.ttcm-reader-detail-meta b { padding: 4px 8px; border-radius: 999px; background: #0c63dc; color: #fff; font-size: 9px; }
.ttcm-reader-detail-meta em { padding: 5px 9px; border-radius: 8px; background: #fff6df; color: #b9770d; font-size: 9.5px; font-style: normal; font-weight: 820; }
.ttcm-reader-detail-meta em.is-overdue { background: #fff0ee; color: #db4d47; }
.ttcm-reader-detail h2 { max-width: 900px; margin: 0 0 22px; color: #0d2541; font-size: clamp(25px, 2vw, 33px); font-weight: 870; line-height: 1.12; letter-spacing: -.035em; }
.ttcm-reader-message { max-width: 920px; color: #3b4d63; font-size: 14.5px; line-height: 1.72; white-space: pre-wrap; overflow-wrap: anywhere; }
.ttcm-reader-message::after { content: ''; display: block; width: 100%; height: 1px; margin-top: 26px; background: #e7edf4; }

.ttcm-reader-files { margin-top: 20px; }
.ttcm-reader-files > header { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 10px; }
.ttcm-reader-files > header strong { display: block; color: #1e3652; font-size: 13px; }
.ttcm-reader-files > header small { display: block; margin-top: 2px; color: #8b98a9; font-size: 9.5px; }
.ttcm-reader-files > header button {
  min-height: 34px; display: inline-flex; align-items: center; gap: 7px; padding: 0 11px;
  border: 1px solid #d7e4f2; border-radius: 9px; background: #fff; color: #1765c9;
  font: inherit; font-size: 10px; font-weight: 770; cursor: pointer;
}
.ttcm-reader-file-row {
  display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 11px;
  min-height: 62px; margin-bottom: 7px; padding: 8px 10px; border: 1px solid #e1e7ef; border-radius: 11px; background: #fbfcfe;
}
.ttcm-reader-file-type { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 9px; background: #eee9ff; color: #6d4ee8; font-size: 9px; font-weight: 900; }
.ttcm-reader-file-type.is-pdf { background: #fff0ef; color: #d84b43; }
.ttcm-reader-file-type.is-xls, .ttcm-reader-file-type.is-xlsx, .ttcm-reader-file-type.is-csv { background: #edf8f1; color: #238459; }
.ttcm-reader-file-row > div:nth-child(2) { min-width: 0; }
.ttcm-reader-file-row b { display: block; overflow: hidden; color: #263a53; font-size: 11.5px; font-weight: 780; text-overflow: ellipsis; white-space: nowrap; }
.ttcm-reader-file-row small { display: block; margin-top: 3px; color: #8a98aa; font-size: 9.5px; }
.ttcm-reader-file-actions { display: flex; gap: 5px; }
.ttcm-reader-file-actions button { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid #d9e3ee; border-radius: 9px; background: #fff; color: #567089; cursor: pointer; }
.ttcm-reader-file-actions button:hover { background: #f1f6fc; color: #1263ca; }

.ttcm-reader-response-preview { margin-top: 24px; padding-top: 18px; border-top: 1px solid #e7edf4; }
.ttcm-reader-response-preview > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
.ttcm-reader-response-preview > header > div { display: flex; align-items: center; gap: 7px; color: #1d6bd3; }
.ttcm-reader-response-preview > header strong { color: #1d3653; font-size: 12.5px; }
.ttcm-reader-response-preview > header button { border: 0; background: transparent; color: #0b67eb; font: inherit; font-size: 10.5px; font-weight: 760; cursor: pointer; }
.ttcm-reader-response-preview article { display: grid; grid-template-columns: 38px minmax(0,1fr) auto; align-items: center; gap: 10px; min-height: 58px; padding: 7px 9px; border-radius: 10px; background: #f7f9fc; }
.ttcm-reader-response-preview article + article { margin-top: 6px; }
.ttcm-reader-response-preview article > span { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; background: #dff0ff; color: #1f68c8; font-size: 10px; font-weight: 850; }
.ttcm-reader-response-preview article:nth-child(even) > span { background: #ece8ff; color: #6545cf; }
.ttcm-reader-response-preview article div { min-width: 0; }
.ttcm-reader-response-preview article b { display: block; color: #27405d; font-size: 10.5px; }
.ttcm-reader-response-preview article p { margin: 2px 0 0; overflow: hidden; color: #718096; font-size: 9.5px; text-overflow: ellipsis; white-space: nowrap; }
.ttcm-reader-response-preview article time { color: #8090a5; font-size: 9px; white-space: nowrap; }

.ttcm-reader-detail-footer { min-height: 76px; display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 12px 22px; border-top: 1px solid #e3e9f0; background: #fff; }
.ttcm-reader-footer-spacer { flex: 1 1 auto; }
.ttcm-reader-primary, .ttcm-reader-secondary { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 18px; border-radius: 11px; font: inherit; font-size: 11.5px; font-weight: 820; cursor: pointer; }
.ttcm-reader-primary { border: 1px solid #0a61df; background: #0b67eb; color: #fff; box-shadow: 0 5px 14px rgba(11,103,235,.14); }
.ttcm-reader-primary:hover { background: #075acb; }
.ttcm-reader-primary:disabled, .ttcm-reader-primary.is-done { border-color: #cee6d9; background: #edf8f2; color: #2f8559; box-shadow: none; cursor: default; }
.ttcm-reader-secondary { border: 1px solid #bcd2f2; background: #fff; color: #1461c9; }
.ttcm-reader-secondary:hover { background: #f5f9ff; }
.ttcm-reader-manager-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-left: auto; }

.ttcm-reader-empty, .ttcm-reader-detail-empty { min-height: 230px; display: grid; place-items: center; align-content: center; gap: 8px; padding: 30px; color: #8b96a5; text-align: center; }
.ttcm-reader-empty strong, .ttcm-reader-detail-empty strong { color: #435168; font-size: 14px; }
.ttcm-reader-empty span, .ttcm-reader-detail-empty p { margin: 0; color: #96a0ad; font-size: 12px; }
.ttcm-reader-detail-empty > span { width: 58px; height: 58px; display: grid; place-items: center; border-radius: 16px; background: #eef4ff; color: #3169c8; }

.ttcm-reader-shell .ttcm-m3-banner { top: 155px; right: 22px; width: min(460px, calc(100% - 44px)); z-index: 70; }

@media (max-width: 1160px) {
  .ttcm-reader-workspace { grid-template-columns: minmax(350px, .9fr) minmax(0, 1.1fr); }
  .ttcm-reader-search { width: 210px; min-width: 150px; }
  .ttcm-reader-detail-card { padding-inline: 20px; }
  .ttcm-reader-list-scroll { padding-left: 14px; padding-right: 12px; }
}

@media (max-width: 900px) {
  .ttcm-reader-shell .ttcm-m3-title small { display: none; }
  .ttcm-reader-workspace { grid-template-columns: 1fr; position: relative; }
  .ttcm-reader-list { border-right: 0; }
  .ttcm-reader-detail { position: absolute; inset: 0; z-index: 12; box-shadow: -12px 0 32px rgba(30,45,70,.12); }
  .ttcm-reader-detail:has(.ttcm-reader-detail-empty) { display: none; }
  .ttcm-reader-detail-head { padding-inline: 14px; }
  .ttcm-reader-search { width: min(240px, 38vw); }
}

@media (max-width: 640px) {
  .ttcm-reader-shell { width: calc(100vw - 10px); height: calc(100vh - 10px); border-radius: 18px; }
  .ttcm-reader-shell .ttcm-m3-topbar { min-height: 72px; padding: 9px 11px; }
  .ttcm-reader-shell .ttcm-m3-title-icon { width: 42px; height: 42px; }
  .ttcm-reader-shell .ttcm-m3-title strong { font-size: 20px; }
  .ttcm-reader-toolbar.ttcm-m3-toolbar { padding-inline: 9px; }
  .ttcm-reader-list-head { min-height: 60px; padding: 10px 13px 6px; }
  .ttcm-reader-list-head span { font-size: 18px; }
  .ttcm-reader-mark-all-quiet { font-size: 0; padding-inline: 8px; }
  .ttcm-reader-filter-chips { padding: 6px 12px 10px; }
  .ttcm-reader-list-scroll { padding: 10px 9px 18px; }
  .ttcm-reader-card { grid-template-columns: 42px minmax(0,1fr); gap: 10px; padding: 11px; }
  .ttcm-reader-card-icon { width: 40px; height: 40px; }
  .ttcm-reader-card-titleline time { display: none; }
  .ttcm-reader-detail-head { align-items: stretch; flex-direction: column; padding-block: 9px; }
  .ttcm-reader-detail-tools { justify-content: stretch; }
  .ttcm-reader-search { width: 100%; min-width: 0; flex: 1 1 auto; }
  .ttcm-reader-sort { flex: 0 0 auto; }
  .ttcm-reader-detail-scroll { padding: 10px 9px 16px; }
  .ttcm-reader-detail-card { padding: 18px 15px 22px; }
  .ttcm-reader-detail h2 { font-size: 24px; }
  .ttcm-reader-message { font-size: 13.5px; }
  .ttcm-reader-response-preview article { grid-template-columns: 34px minmax(0,1fr); }
  .ttcm-reader-response-preview article time { display: none; }
  .ttcm-reader-detail-footer { padding: 9px; overflow-x: auto; }
  .ttcm-reader-manager-footer { flex: 0 0 auto; }
  .ttcm-reader-primary, .ttcm-reader-secondary { min-height: 42px; padding-inline: 12px; white-space: nowrap; }
}
`;

await writeFile(componentUrl, component, 'utf8');
await writeFile(cssUrl, css, 'utf8');
console.log('Applied TTCM two-column reader redesign.');
