from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path, old, new, count=1):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Marker not found in {path}: {old[:120]!r}')
    text = text.replace(old, new, count)
    p.write_text(text, encoding='utf-8')


# Direct signed proxy route: avoid the generic gateway for file-serving URLs.
patch(
    'api/_work-hub-file-access.js',
    "signedUrl: `/api/work-hub-file?token=${encodeURIComponent(token)}`",
    "signedUrl: `/api/work-hub-file-signed?token=${encodeURIComponent(token)}`",
)

# Reliable browser-side stream/download/edit helpers.
patch(
    'src/utils/workHubDelivery.js',
    "const data = await authenticatedJson('/api/work-hub-file-access', {",
    "const data = await authenticatedJson('/api/work-hub-file-access-v2', {",
)

helper_marker = "export async function resolveWorkHubCommentAttachments(comments = []) {"
helper_block = r'''export function getWorkHubAttachmentExtension(attachment = {}) {
  return fileExtension(attachment.name || attachment.fileName || attachment.path || '');
}

export async function fetchWorkHubAttachmentBlob(attachment, { itemId = '', disposition = 'inline' } = {}) {
  if (!attachment) throw new Error('Không tìm thấy thông tin tệp.');
  const effectiveItemId = String(itemId || attachment.item_id || attachment.itemId || '').trim();

  if (isDriveAttachment(attachment)) {
    const token = await getAccessToken();
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    if (!effectiveItemId) throw new Error('Thiếu mã nội dung TTCM của tệp.');
    const params = new URLSearchParams({
      itemId: effectiveItemId,
      fileId: driveFileId(attachment),
      fileName: attachment.name || 'tai-lieu',
      mimeType: attachment.mime || 'application/octet-stream',
      disposition: disposition === 'attachment' ? 'attachment' : 'inline',
    });
    const response = await fetch(`/api/work-hub-file-stream?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      let message = 'Không thể tải tệp từ Google Drive.';
      try { message = (await response.json())?.error || message; } catch { /* binary/empty response */ }
      throw new Error(message);
    }
    return response.blob();
  }

  const url = await createWorkHubAttachmentUrl(attachment);
  if (!url) throw new Error('Không thể tạo đường dẫn truy cập tệp.');
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('Không thể tải tệp đính kèm.');
  return response.blob();
}

export async function downloadWorkHubAttachment(attachment, { itemId = '', fileName = '' } = {}) {
  try {
    const blob = await fetchWorkHubAttachmentBlob(attachment, { itemId, disposition: 'attachment' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName || attachment?.name || 'tai-lieu';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message || 'Không thể tải tệp về máy.' };
  }
}

export async function createWorkHubAttachmentEditUrl(attachment, { itemId = '' } = {}) {
  if (!attachment || !isDriveAttachment(attachment)) {
    return { ok: false, message: 'Chỉnh sửa trực tiếp chỉ hỗ trợ tệp đang lưu trên Google Drive.' };
  }
  try {
    const data = await authenticatedJson('/api/work-hub-file-edit-link', {
      method: 'POST',
      body: JSON.stringify({
        itemId: itemId || attachment.item_id || attachment.itemId || '',
        fileId: driveFileId(attachment),
        fileName: attachment.name || '',
      }),
    });
    const url = data.editUrl || data.webViewLink || '';
    if (!url) throw new Error('Google Drive không trả về đường dẫn chỉnh sửa.');
    return { ok: true, url, warning: data.warning || '', permissionGranted: Boolean(data.permissionGranted) };
  } catch (error) {
    return { ok: false, message: error?.message || 'Không thể mở tệp để chỉnh sửa.' };
  }
}

'''
patch('src/utils/workHubDelivery.js', helper_marker, helper_block + helper_marker)

# TTCM component imports.
patch(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "  createWorkHubAttachmentUrl,\n  removeWorkHubSubmissionFiles,\n  uploadWorkHubSubmissionFile,\n  validateWorkHubFile,",
    "  createWorkHubAttachmentEditUrl,\n  createWorkHubAttachmentUrl,\n  downloadWorkHubAttachment,\n  fetchWorkHubAttachmentBlob,\n  getWorkHubAttachmentExtension,\n  removeWorkHubSubmissionFiles,\n  uploadWorkHubSubmissionFile,\n  validateWorkHubFile,",
)

patch(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "  download: 'M11 3h2v9l3-3 1.4 1.4L12 15.8l-5.4-5.4L8 9l3 3V3ZM5 18h14v2H5v-2Z',",
    "  download: 'M11 3h2v9l3-3 1.4 1.4L12 15.8l-5.4-5.4L8 9l3 3V3ZM5 18h14v2H5v-2Z',\n  eye: 'M12 5c-5.5 0-9.5 5-10 7 .5 2 4.5 7 10 7s9.5-5 10-7c-.5-2-4.5-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',",
)

functions_marker = "export default function GlobalTtcmNavigationTab({ currentUser, language = 'vi' }) {"
functions_block = r'''function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function sanitizePreviewHtml(value) {
  if (typeof DOMParser === 'undefined') return String(value || '');
  const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form,input,button,meta,link').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const attrValue = String(attribute.value || '').trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && attrValue.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return doc.body.innerHTML;
}

'''
patch('src/components/GlobalTtcmNavigationTab.jsx', functions_marker, functions_block + functions_marker)

patch(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "  const [responseViewerItem, setResponseViewerItem] = useState(null);",
    "  const [responseViewerItem, setResponseViewerItem] = useState(null);\n  const [fileViewer, setFileViewer] = useState(null);",
)

# Revoke locally created preview URLs when switching/closing preview.
patch(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "  useEffect(() => {\n    setItems(readLocalItems(currentUser));\n    setReadIds(readReadIds(currentUser));\n  }, [currentUser?.id, currentUser?.email]);",
    "  useEffect(() => {\n    setItems(readLocalItems(currentUser));\n    setReadIds(readReadIds(currentUser));\n  }, [currentUser?.id, currentUser?.email]);\n\n  useEffect(() => () => {\n    if (fileViewer?.objectUrl) URL.revokeObjectURL(fileViewer.objectUrl);\n  }, [fileViewer?.objectUrl]);",
)

old_open = r'''  async function openAttachment(item, attachment) {
    markRead(item.id);
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const url = await createWorkHubAttachmentUrl({ ...attachment, item_id: item.id });
      if (!url) throw new Error('Không thể tạo đường dẫn tải tệp.');
      if (popup) popup.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (attachmentError) {
      if (popup) popup.close();
      setError(attachmentError?.message || 'Không thể mở tệp.');
    }
  }
'''
new_open = r'''  function closeFileViewer() {
    setFileViewer(null);
  }

  async function previewAttachment(item, attachment) {
    markRead(item.id);
    setError('');
    const target = { ...attachment, item_id: item.id };
    const ext = getWorkHubAttachmentExtension(target);
    const base = { item, attachment: target, name: target.name || 'Tài liệu', ext, loading: true, kind: 'loading', error: '' };
    setFileViewer(base);

    try {
      if (ext === 'docx') {
        const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
        const arrayBuffer = await blob.arrayBuffer();
        const mammothModule = await import('mammoth');
        const mammothApi = mammothModule.default || mammothModule;
        const result = await mammothApi.convertToHtml({ arrayBuffer });
        setFileViewer({ ...base, loading: false, kind: 'html', html: sanitizePreviewHtml(result.value || '') });
        return;
      }

      if (ext === 'xlsx') {
        const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
        const readExcelModule = await import('read-excel-file');
        const readXlsxFile = readExcelModule.default || readExcelModule;
        const rows = await readXlsxFile(blob);
        setFileViewer({ ...base, loading: false, kind: 'table', rows: (rows || []).slice(0, 250) });
        return;
      }

      if (['doc', 'xls', 'ppt', 'pptx'].includes(ext)) {
        const signedUrl = await createWorkHubAttachmentUrl(target);
        if (signedUrl) {
          const absoluteUrl = new URL(signedUrl, window.location.origin).href;
          const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
          setFileViewer({ ...base, loading: false, kind: 'iframe', url: officeUrl, externalOffice: true });
          return;
        }
      }

      const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
      if (['txt', 'rtf'].includes(ext) || String(blob.type || '').startsWith('text/')) {
        setFileViewer({ ...base, loading: false, kind: 'text', text: await blob.text() });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || String(blob.type || '').startsWith('image/')) {
        setFileViewer({ ...base, loading: false, kind: 'image', url: objectUrl, objectUrl });
      } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext) || String(blob.type || '').startsWith('audio/')) {
        setFileViewer({ ...base, loading: false, kind: 'audio', url: objectUrl, objectUrl });
      } else if (['mp4', 'webm', 'mov'].includes(ext) || String(blob.type || '').startsWith('video/')) {
        setFileViewer({ ...base, loading: false, kind: 'video', url: objectUrl, objectUrl });
      } else {
        setFileViewer({ ...base, loading: false, kind: 'iframe', url: objectUrl, objectUrl });
      }
    } catch (attachmentError) {
      setFileViewer({ ...base, loading: false, kind: 'error', error: attachmentError?.message || 'Không thể xem trước tệp.' });
    }
  }

  async function downloadAttachment(item, attachment) {
    markRead(item.id);
    setError('');
    const result = await downloadWorkHubAttachment({ ...attachment, item_id: item.id }, { itemId: item.id, fileName: attachment.name });
    if (!result.ok) setError(result.message || 'Không thể tải tệp về máy.');
  }

  async function editAttachment(item, attachment) {
    markRead(item.id);
    setError('');
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    const result = await createWorkHubAttachmentEditUrl({ ...attachment, item_id: item.id }, { itemId: item.id });
    if (!result.ok) {
      if (popup) popup.close();
      setError(result.message || 'Không thể mở tệp để chỉnh sửa.');
      return;
    }
    if (result.warning) {
      setNotice(`Đã mở Google Drive. ${result.warning}`);
      window.setTimeout(() => setNotice(''), 4200);
    }
    if (popup) popup.location.href = result.url;
    else window.open(result.url, '_blank', 'noopener,noreferrer');
  }

  async function openAttachment(item, attachment) {
    return previewAttachment(item, attachment);
  }
'''
patch('src/components/GlobalTtcmNavigationTab.jsx', old_open, new_open)

old_attachment_ui = r'''                  {attachments.length ? (
                    <div className="ttcm-m3-attachments">
                      {attachments.map((attachment, index) => (
                        <button key={`${attachment.path || attachment.name}-${index}`} type="button" onClick={(event) => { event.stopPropagation(); openAttachment(item, attachment); }}>
                          <Icon name="download" size={17} />
                          <span>{attachment.name || `Tài liệu ${index + 1}`}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
'''
new_attachment_ui = r'''                  {attachments.length ? (
                    <div className="ttcm-m3-file-list">
                      {attachments.map((attachment, index) => {
                        const fileExt = getWorkHubAttachmentExtension(attachment);
                        const fileMeta = [fileExt ? fileExt.toUpperCase() : '', formatFileSize(attachment.size)].filter(Boolean).join(' · ');
                        return <div className="ttcm-m3-file-row" key={`${attachment.path || attachment.name}-${index}`}>
                          <button type="button" className="ttcm-m3-file-main" onClick={(event) => { event.stopPropagation(); previewAttachment(item, attachment); }}>
                            <span className="ttcm-m3-file-icon"><Icon name="folder" size={20} /></span>
                            <span><b>{attachment.name || `Tài liệu ${index + 1}`}</b>{fileMeta ? <small>{fileMeta}</small> : null}</span>
                          </button>
                          <div className="ttcm-m3-file-actions">
                            <button type="button" onClick={(event) => { event.stopPropagation(); previewAttachment(item, attachment); }}><Icon name="eye" size={17} />Xem trước</button>
                            {canManageItem ? <button type="button" onClick={(event) => { event.stopPropagation(); editAttachment(item, attachment); }}><Icon name="edit" size={17} />Sửa trực tiếp</button> : null}
                            <button type="button" onClick={(event) => { event.stopPropagation(); downloadAttachment(item, attachment); }}><Icon name="download" size={17} />Tải về</button>
                          </div>
                        </div>;
                      })}
                    </div>
                  ) : null}
'''
patch('src/components/GlobalTtcmNavigationTab.jsx', old_attachment_ui, new_attachment_ui)

viewer_marker = "        {responseViewerItem && manager ? ("
viewer_block = r'''        {fileViewer ? (
          <div className="ttcm-m3-compose-layer ttcm-m3-file-viewer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFileViewer(); }}>
            <section className="ttcm-m3-file-viewer" role="dialog" aria-modal="true" aria-label={`Xem trước ${fileViewer.name || 'tài liệu'}`}>
              <header>
                <div className="ttcm-m3-file-viewer-title"><span><Icon name="folder" size={21} /></span><div><strong>{fileViewer.name || 'Tài liệu'}</strong><small>{[fileViewer.ext ? fileViewer.ext.toUpperCase() : '', formatFileSize(fileViewer.attachment?.size)].filter(Boolean).join(' · ') || 'Tệp đính kèm TTCM'}</small></div></div>
                <button type="button" className="ttcm-m3-icon-button" onClick={closeFileViewer} aria-label="Đóng"><Icon name="close" /></button>
              </header>
              <div className={`ttcm-m3-file-viewer-body is-${fileViewer.kind || 'loading'}`}>
                {fileViewer.loading ? <div className="ttcm-m3-file-viewer-state"><span className="ttcm-m3-file-spinner" /><strong>Đang chuẩn bị bản xem trước…</strong><small>Tệp được đọc qua kết nối bảo mật của Brian.</small></div> : null}
                {!fileViewer.loading && fileViewer.kind === 'error' ? <div className="ttcm-m3-file-viewer-state is-error"><Icon name="folder" size={30} /><strong>Chưa thể xem trước tệp này</strong><small>{fileViewer.error}</small></div> : null}
                {!fileViewer.loading && fileViewer.kind === 'html' ? <article className="ttcm-m3-docx-preview" dangerouslySetInnerHTML={{ __html: fileViewer.html || '' }} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'text' ? <pre className="ttcm-m3-text-preview">{fileViewer.text || ''}</pre> : null}
                {!fileViewer.loading && fileViewer.kind === 'table' ? <div className="ttcm-m3-sheet-preview"><table><tbody>{(fileViewer.rows || []).map((row, rowIndex) => <tr key={rowIndex}>{(row || []).map((cell, cellIndex) => <td key={cellIndex}>{String(cell ?? '')}</td>)}</tr>)}</tbody></table></div> : null}
                {!fileViewer.loading && fileViewer.kind === 'image' ? <img className="ttcm-m3-image-preview" src={fileViewer.url} alt={fileViewer.name || 'Tài liệu'} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'audio' ? <audio className="ttcm-m3-media-preview" controls src={fileViewer.url} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'video' ? <video className="ttcm-m3-media-preview" controls src={fileViewer.url} /> : null}
                {!fileViewer.loading && fileViewer.kind === 'iframe' ? <iframe className="ttcm-m3-iframe-preview" title={fileViewer.name || 'Xem trước tài liệu'} src={fileViewer.url} allow="fullscreen" /> : null}
              </div>
              <footer>
                <div><span>Bản xem trước</span><small>{fileViewer.externalOffice ? 'Hiển thị bằng Microsoft Office Viewer' : 'Hiển thị trực tiếp trong Brian'}</small></div>
                <div>
                  {manager && (fileViewer.item?.created_by === currentUser?.id || fileViewer.item?.owner_id === currentUser?.id) ? <button type="button" className="ttcm-m3-tonal-button" onClick={() => editAttachment(fileViewer.item, fileViewer.attachment)}><Icon name="edit" size={17} />Sửa trực tiếp</button> : null}
                  <button type="button" className="ttcm-m3-filled-button" onClick={() => downloadAttachment(fileViewer.item, fileViewer.attachment)}><Icon name="download" size={17} />Tải về</button>
                </div>
              </footer>
            </section>
          </div>
        ) : null}

'''
patch('src/components/GlobalTtcmNavigationTab.jsx', viewer_marker, viewer_block + viewer_marker)

# Append Material 3 file viewer/action styles.
css_path = ROOT / 'src/components/GlobalTtcmNavigationTab.css'
css = css_path.read_text(encoding='utf-8')
css_append = r'''

/* TTCM attachment experience: preview, direct edit and reliable download. */
.ttcm-m3-file-list { display:grid; gap:8px; margin-top:12px; }
.ttcm-m3-file-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 10px; border:1px solid #dfe3e7; border-radius:16px; background:#f8fafd; }
.ttcm-m3-file-main { min-width:0; flex:1; display:flex; align-items:center; gap:10px; padding:4px; border:0; background:transparent; color:#1f1f1f; text-align:left; cursor:pointer; }
.ttcm-m3-file-icon { width:38px; height:38px; flex:0 0 auto; display:grid; place-items:center; border-radius:12px; background:#d3e3fd; color:#0b57d0; }
.ttcm-m3-file-main > span:last-child { min-width:0; }
.ttcm-m3-file-main b,.ttcm-m3-file-main small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ttcm-m3-file-main b { font-size:13px; font-weight:700; }
.ttcm-m3-file-main small { margin-top:2px; color:#5f6368; font-size:11px; }
.ttcm-m3-file-actions { flex:0 0 auto; display:flex; align-items:center; gap:4px; }
.ttcm-m3-file-actions button { min-height:34px; display:inline-flex; align-items:center; gap:6px; padding:0 10px; border:0; border-radius:999px; background:transparent; color:#0b57d0; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
.ttcm-m3-file-actions button:hover { background:#e8f0fe; }
.ttcm-m3-file-viewer-layer { z-index:8; }
.ttcm-m3-file-viewer { width:min(1100px, calc(100% - 18px)); height:min(760px, calc(100% - 18px)); display:grid; grid-template-rows:auto minmax(0,1fr) auto; overflow:hidden; border:1px solid #c4c7c5; border-radius:24px; background:#fff; box-shadow:0 12px 36px rgba(60,64,67,.28); }
.ttcm-m3-file-viewer > header,.ttcm-m3-file-viewer > footer { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:14px 16px; background:#fff; }
.ttcm-m3-file-viewer > header { border-bottom:1px solid #e0e3e7; }
.ttcm-m3-file-viewer > footer { border-top:1px solid #e0e3e7; }
.ttcm-m3-file-viewer > footer > div:last-child { display:flex; gap:8px; align-items:center; }
.ttcm-m3-file-viewer > footer > div:first-child span,.ttcm-m3-file-viewer > footer > div:first-child small { display:block; }
.ttcm-m3-file-viewer > footer > div:first-child span { color:#1f1f1f; font-size:12px; font-weight:700; }
.ttcm-m3-file-viewer > footer > div:first-child small { margin-top:2px; color:#5f6368; font-size:11px; }
.ttcm-m3-file-viewer-title { min-width:0; display:flex; align-items:center; gap:10px; }
.ttcm-m3-file-viewer-title > span { width:40px; height:40px; display:grid; place-items:center; flex:0 0 auto; border-radius:13px; background:#d3e3fd; color:#0b57d0; }
.ttcm-m3-file-viewer-title > div { min-width:0; }
.ttcm-m3-file-viewer-title strong,.ttcm-m3-file-viewer-title small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ttcm-m3-file-viewer-title strong { max-width:min(680px,55vw); font-size:15px; }
.ttcm-m3-file-viewer-title small { margin-top:3px; color:#5f6368; font-size:11px; }
.ttcm-m3-file-viewer-body { min-height:0; overflow:auto; display:grid; place-items:center; background:#eef2f7; }
.ttcm-m3-file-viewer-state { display:grid; justify-items:center; gap:8px; max-width:440px; padding:28px; text-align:center; color:#5f6368; }
.ttcm-m3-file-viewer-state strong { color:#1f1f1f; }
.ttcm-m3-file-viewer-state.is-error strong { color:#b3261e; }
.ttcm-m3-file-spinner { width:30px; height:30px; border:3px solid #d3e3fd; border-top-color:#0b57d0; border-radius:50%; animation:ttcm-file-spin .8s linear infinite; }
@keyframes ttcm-file-spin { to { transform:rotate(360deg); } }
.ttcm-m3-docx-preview { box-sizing:border-box; width:min(820px, calc(100% - 32px)); min-height:calc(100% - 32px); margin:16px; padding:54px 62px; background:#fff; color:#202124; box-shadow:0 2px 10px rgba(60,64,67,.18); line-height:1.55; overflow-wrap:anywhere; }
.ttcm-m3-docx-preview img { max-width:100%; height:auto; }
.ttcm-m3-docx-preview table { max-width:100%; border-collapse:collapse; }
.ttcm-m3-docx-preview td,.ttcm-m3-docx-preview th { padding:5px 7px; border:1px solid #dadce0; }
.ttcm-m3-text-preview { box-sizing:border-box; width:min(900px,calc(100% - 32px)); min-height:calc(100% - 32px); margin:16px; padding:24px; overflow:auto; white-space:pre-wrap; background:#fff; color:#202124; font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace; box-shadow:0 2px 10px rgba(60,64,67,.15); }
.ttcm-m3-sheet-preview { width:100%; height:100%; overflow:auto; background:#fff; }
.ttcm-m3-sheet-preview table { min-width:100%; border-collapse:collapse; font-size:12px; }
.ttcm-m3-sheet-preview td { min-width:110px; max-width:320px; padding:7px 9px; border:1px solid #e0e3e7; background:#fff; vertical-align:top; }
.ttcm-m3-image-preview { max-width:calc(100% - 28px); max-height:calc(100% - 28px); object-fit:contain; border-radius:8px; background:#fff; box-shadow:0 2px 10px rgba(60,64,67,.16); }
.ttcm-m3-media-preview { width:min(880px,calc(100% - 28px)); max-height:calc(100% - 28px); }
.ttcm-m3-iframe-preview { width:100%; height:100%; border:0; background:#fff; }
@media (max-width:760px) {
  .ttcm-m3-file-row { align-items:stretch; flex-direction:column; }
  .ttcm-m3-file-actions { width:100%; overflow-x:auto; }
  .ttcm-m3-file-actions button { flex:0 0 auto; }
  .ttcm-m3-file-viewer { width:100%; height:100%; border-radius:0; }
  .ttcm-m3-docx-preview { width:100%; min-height:100%; margin:0; padding:26px 20px; box-shadow:none; }
  .ttcm-m3-file-viewer > footer { align-items:stretch; flex-direction:column; }
  .ttcm-m3-file-viewer > footer > div:last-child { width:100%; }
  .ttcm-m3-file-viewer > footer button { flex:1; }
}
'''
if 'TTCM attachment experience: preview, direct edit and reliable download.' not in css:
    css_path.write_text(css + css_append, encoding='utf-8')

print('TTCM file preview/edit/download upgrade applied.')
