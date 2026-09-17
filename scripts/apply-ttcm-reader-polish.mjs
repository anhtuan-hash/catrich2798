import { readFile, writeFile } from 'node:fs/promises';

const componentPath = new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url);
const cssPath = new URL('../src/components/GlobalTtcmTeacherReaderV2.css', import.meta.url);

let component = await readFile(componentPath, 'utf8');
let css = await readFile(cssPath, 'utf8');

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing ${label} anchor`);
  return source.replace(before, after);
}

component = replaceOnce(
  component,
  `function formatFullDate(value) {\n  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';\n  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);\n}`,
  `function formatReaderTimestamp(value) {\n  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';\n  const dayMonth = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);\n  const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);\n  return dayMonth + ' · ' + time;\n}\nfunction formatFullDate(value) {\n  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';\n  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);\n}`,
  'reader timestamp helper',
);

component = replaceOnce(
  component,
  `              <header className="ttcm-reader-list-head">\n                <div><span>Thông báo mới nhất</span><small>{filteredItems.length}{feedQuery ? '/' + counts.all : ''} nội dung</small></div>\n                {unseenCount > 0 ? <button type="button" className="ttcm-reader-mark-all-quiet" onClick={markAllRead}><Icon name="check" size={16} />Đánh dấu tất cả đã đọc</button> : null}\n              </header>`,
  `              <header className="ttcm-reader-list-head">\n                <div className="ttcm-reader-list-copy"><span>Thông báo mới nhất</span><small>{filteredItems.length}{feedQuery ? '/' + counts.all : ''} nội dung</small></div>\n                <div className="ttcm-reader-list-tools">\n                  <label className="ttcm-reader-search"><span aria-hidden="true">⌕</span><input type="search" value={feedQuery} onChange={(event) => setFeedQuery(event.target.value)} placeholder="Tìm kiếm thông báo…" aria-label="Tìm kiếm thông báo TTCM" /></label>\n                  <select className="ttcm-reader-sort" value={feedSort} onChange={(event) => setFeedSort(event.target.value)} aria-label="Sắp xếp thông báo"><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select>\n                  {unseenCount > 0 ? <button type="button" className="ttcm-reader-mark-all-quiet" onClick={markAllRead} title="Đánh dấu tất cả đã đọc" aria-label="Đánh dấu tất cả đã đọc"><Icon name="check" size={16} /></button> : null}\n                </div>\n              </header>`,
  'list header tools',
);

component = replaceOnce(
  component,
  `<div className="ttcm-reader-card-titleline"><h3>{item.title}</h3><time>{formatDate(item.created_at || item.updated_at)}</time></div>`,
  `<div className="ttcm-reader-card-titleline"><h3>{item.title}</h3><time>{formatReaderTimestamp(item.created_at || item.updated_at)}</time></div>`,
  'card timestamp',
);

component = replaceOnce(
  component,
  `              <header className="ttcm-reader-detail-head">\n                <button type="button" className="ttcm-reader-back" onClick={() => setSelectedItemId('')}>← Quay lại danh sách</button>\n                <div className="ttcm-reader-detail-tools">\n                  <label className="ttcm-reader-search"><span aria-hidden="true">⌕</span><input type="search" value={feedQuery} onChange={(event) => setFeedQuery(event.target.value)} placeholder="Tìm kiếm thông báo…" aria-label="Tìm kiếm thông báo TTCM" /></label>\n                  <select className="ttcm-reader-sort" value={feedSort} onChange={(event) => setFeedSort(event.target.value)} aria-label="Sắp xếp thông báo"><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select>\n                </div>\n              </header>`,
  `              <header className="ttcm-reader-detail-head">\n                <button type="button" className="ttcm-reader-back" onClick={() => setSelectedItemId('')}>← Quay lại danh sách</button>\n              </header>`,
  'detail toolbar',
);

component = replaceOnce(
  component,
  `                        {manager && canManageSelected ? <button type="button" className="ttcm-reader-secondary" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}><Icon name="people" size={18} />Phản hồi ({responsesForItem(selectedItem.id).length})</button> : null}\n                        {selectedType?.id === 'acknowledgement'\n                          ? <button type="button" className="ttcm-reader-primary" disabled={busy} onClick={() => acknowledge(selectedItem)}><Icon name="check" size={18} />Xác nhận đã nhận</button>\n                          : <button type="button" className="ttcm-reader-primary" onClick={() => beginResponse(selectedItem)}><Icon name="arrow" size={18} />{selectedType?.id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi / hoàn thành'}</button>}\n                        {manager && canManageSelected ? <button type="button" className="ttcm-reader-secondary" onClick={() => beginEdit(selectedItem)}><Icon name="edit" size={18} />Chỉnh sửa</button> : null}`,
  `                        {manager && canManageSelected ? <button type="button" className="ttcm-reader-secondary" onClick={() => beginEdit(selectedItem)}><Icon name="edit" size={18} />Chỉnh sửa</button> : null}\n                        {manager && canManageSelected ? <button type="button" className="ttcm-reader-secondary" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}><Icon name="people" size={18} />Xem phản hồi</button> : null}\n                        {selectedType?.id === 'acknowledgement'\n                          ? <button type="button" className="ttcm-reader-primary" disabled={busy} onClick={() => acknowledge(selectedItem)}><Icon name="check" size={18} />Xác nhận đã nhận</button>\n                          : <button type="button" className="ttcm-reader-primary" onClick={() => beginResponse(selectedItem)}><Icon name="arrow" size={18} />{selectedType?.id === 'feedback' ? 'Gửi góp ý' : 'Phản hồi / hoàn thành'}</button>}`,
  'manager action order',
);

component = replaceOnce(
  component,
  `<div className="ttcm-reader-manager-footer"><button type="button" className="ttcm-reader-secondary" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}><Icon name="people" size={18} />Phản hồi ({responsesForItem(selectedItem.id).length})</button><button type="button" className="ttcm-reader-primary" onClick={() => beginEdit(selectedItem)}><Icon name="edit" size={18} />Chỉnh sửa</button></div>`,
  `<div className="ttcm-reader-manager-footer"><button type="button" className="ttcm-reader-secondary" onClick={() => beginEdit(selectedItem)}><Icon name="edit" size={18} />Chỉnh sửa</button><button type="button" className="ttcm-reader-secondary" onClick={() => { setResponseViewerItem(selectedItem); loadResponses(); }}><Icon name="people" size={18} />Xem phản hồi</button></div>`,
  'manager non-action footer',
);

const polishMarker = '/* TTCM Reader polish — hierarchy and control placement */';
if (!css.includes(polishMarker)) {
  css += `\n\n${polishMarker}\n.ttcm-reader-list-head { min-height: 76px; padding: 12px 18px 10px; gap: 14px; }\n.ttcm-reader-list-copy { min-width: 0; flex: 1 1 auto; }\n.ttcm-reader-list-tools { min-width: 0; display: flex; align-items: center; justify-content: flex-end; gap: 7px; }\n.ttcm-reader-list-tools .ttcm-reader-search { width: min(230px, 18vw); min-width: 158px; height: 36px; }\n.ttcm-reader-list-tools .ttcm-reader-sort { height: 36px; }\n.ttcm-reader-list-tools .ttcm-reader-mark-all-quiet { width: 36px; min-height: 36px; justify-content: center; padding: 0; font-size: 0; border: 1px solid #d8e2ee; background: #fff; }\n.ttcm-reader-filter-chips button { min-height: 36px; padding-inline: 11px; font-size: 11px; }\n.ttcm-reader-card.is-selected { border-color: #88b2ff; background: #f4f8ff; box-shadow: inset 3px 0 0 #0b67eb, 0 8px 18px rgba(30, 76, 140, .08); }\n.ttcm-reader-card-titleline time { color: #65758a; font-size: 10px; font-weight: 700; }\n.ttcm-reader-detail-head { display: none; }\n.ttcm-reader-detail-scroll { padding: 12px 18px 18px; }\n.ttcm-reader-detail-card { min-height: auto; padding: 20px 24px 22px; }\n.ttcm-reader-detail h2 { margin-bottom: 18px; font-size: clamp(24px, 1.8vw, 30px); }\n.ttcm-reader-message::after { margin-top: 20px; }\n.ttcm-reader-response-preview { margin-top: 18px; padding-top: 14px; }\n.ttcm-reader-detail-footer { min-height: 70px; padding-block: 10px; }\n\n@media (max-width: 1160px) {\n  .ttcm-reader-list-head { align-items: flex-start; flex-direction: column; }\n  .ttcm-reader-list-tools { width: 100%; justify-content: stretch; }\n  .ttcm-reader-list-tools .ttcm-reader-search { width: auto; flex: 1 1 auto; }\n}\n\n@media (max-width: 900px) {\n  .ttcm-reader-detail-head { display: flex; min-height: 52px; padding: 8px 14px; }\n  .ttcm-reader-back { display: inline-flex; align-items: center; min-height: 36px; }\n}\n\n@media (max-width: 640px) {\n  .ttcm-reader-list-head { min-height: auto; padding: 10px 13px 8px; }\n  .ttcm-reader-list-tools { gap: 6px; }\n  .ttcm-reader-list-tools .ttcm-reader-search { width: 100%; min-width: 0; }\n  .ttcm-reader-list-tools .ttcm-reader-sort { max-width: 108px; }\n  .ttcm-reader-detail-card { padding: 16px 15px 18px; }\n  .ttcm-reader-detail h2 { font-size: 23px; }\n}\n`;
}

await writeFile(componentPath, component);
await writeFile(cssPath, css);
console.log('Applied TTCM reader polish.');
