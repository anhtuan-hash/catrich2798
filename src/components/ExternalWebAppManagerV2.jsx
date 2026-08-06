import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import {
  approveExternalWebApp,
  EXTERNAL_APP_GROUPS,
  EXTERNAL_APP_SOURCE_HTML,
  EXTERNAL_APP_SOURCE_URL,
  externalHtmlByteLength,
  isValidExternalHtml,
  loadExternalWebApps,
  MAX_EXTERNAL_HTML_BYTES,
  normalizeExternalAppDraft,
  normalizeExternalAppEmbedConfig,
  rejectExternalWebApp,
  removeApprovedExternalWebApp,
  safeExternalWebAppUrl,
  submitExternalWebApp,
  subscribeExternalWebApps,
  updateApprovedExternalWebAppConfig,
  validateExternalAppDraft,
  withEmbedModeParam,
} from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
import './ExternalWebAppReviewFullscreen.css';
import './ExternalAppApprovalRestore.css';

const EMPTY = {
  name: '',
  sourceType: EXTERNAL_APP_SOURCE_URL,
  url: '',
  embedUrl: '',
  htmlContent: '',
  fileName: '',
  icon: 'WEB',
  description: '',
  groupId: 'create',
};

const LAYOUT_PRESETS = [
  {
    id: 'framed',
    title: 'Giữ khung Brian',
    description: 'Hiện cả thanh trên và chân trang Brian.',
    hideBrianHeader: false,
    hideBrianFooter: false,
  },
  {
    id: 'focused',
    title: 'Giữ thanh trên',
    description: 'Giữ điều hướng, ẩn chân trang để tăng diện tích.',
    hideBrianHeader: false,
    hideBrianFooter: true,
  },
  {
    id: 'immersive',
    title: 'Toàn màn hình ứng dụng',
    description: 'Ẩn cả thanh trên và chân trang Brian.',
    hideBrianHeader: true,
    hideBrianFooter: true,
  },
];

const statusLabel = (status) => ({
  pending: 'Chờ TTCM duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
}[status] || status);

function sourceTypeOf(value = {}) {
  return value.sourceType === EXTERNAL_APP_SOURCE_HTML || value.htmlContent
    ? EXTERNAL_APP_SOURCE_HTML
    : EXTERNAL_APP_SOURCE_URL;
}

function sourceLabel(value = {}) {
  return sourceTypeOf(value) === EXTERNAL_APP_SOURCE_HTML ? 'File HTML' : 'Website URL';
}

function layoutPresetId(config = {}) {
  const match = LAYOUT_PRESETS.find((preset) => (
    preset.hideBrianHeader === Boolean(config.hideBrianHeader)
    && preset.hideBrianFooter === Boolean(config.hideBrianFooter)
  ));
  return match?.id || 'custom';
}

function layoutLabel(config = {}) {
  const preset = LAYOUT_PRESETS.find((item) => item.id === layoutPresetId(config));
  return preset?.title || 'Bố cục tùy chỉnh';
}

function initialReviewConfig(review) {
  const sourceUrl = review?.url || review?.externalUrl || '';
  if (review?.approvedApp?.embedConfig) {
    return normalizeExternalAppEmbedConfig(review.approvedApp.embedConfig, sourceUrl);
  }
  if (review?.previewOnly) {
    return normalizeExternalAppEmbedConfig({
      embedUrl: review.embedUrl || sourceUrl,
      hideBrianHeader: false,
      hideBrianFooter: false,
      allowFullscreen: true,
    }, sourceUrl);
  }
  return normalizeExternalAppEmbedConfig({
    embedUrl: review?.embedUrl || withEmbedModeParam(sourceUrl) || sourceUrl,
    hideBrianHeader: true,
    hideBrianFooter: true,
    allowFullscreen: true,
  }, sourceUrl);
}

function fileNameWithoutExtension(value = '') {
  return String(value || '').replace(/\.(html?|xhtml)$/i, '').replace(/[-_]+/g, ' ').trim();
}

export default function ExternalWebAppManagerV2({ open, onClose, currentUser, language = 'vi', onChanged }) {
  const vi = language !== 'en';
  const manager = canManageAiWebsites(currentUser);
  const [data, setData] = useState({ approved: [], mine: [], requests: [] });
  const [tab, setTab] = useState('submit');
  const [draft, setDraft] = useState(EMPTY);
  const [review, setReview] = useState(null);
  const [config, setConfig] = useState(() => normalizeExternalAppEmbedConfig());
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [frameKey, setFrameKey] = useState(0);

  const pending = useMemo(() => data.requests.filter((item) => item.status === 'pending'), [data.requests]);
  const clean = normalizeExternalAppDraft(draft);
  const draftError = validateExternalAppDraft(clean, language);
  const reviewSourceType = sourceTypeOf(review || {});
  const htmlReview = reviewSourceType === EXTERNAL_APP_SOURCE_HTML;
  const reviewHtml = htmlReview ? String(review?.htmlContent || '') : '';
  const sourceUrl = htmlReview ? '' : safeExternalWebAppUrl(review?.url || review?.externalUrl);
  const embedUrl = htmlReview ? '' : safeExternalWebAppUrl(config.embedUrl);
  const reviewBusy = Boolean(busy && review);
  const embedBlocked = !htmlReview && check?.embeddable === false;
  const canPublishReview = manager && Boolean(review?.request || review?.approvedApp);
  const canRenderReview = htmlReview ? isValidExternalHtml(reviewHtml) : Boolean(embedUrl);

  const applyData = (next) => {
    if (!next) return;
    setData(next);
    onChanged?.(next);
  };

  const refresh = async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const next = await loadExternalWebApps(currentUser, { force: !silent });
      applyData(next);
      return next;
    } catch (error) {
      if (!silent) setNotice(error?.message || String(error));
      throw error;
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!open || !currentUser) return undefined;
    let active = true;
    let unsubscribe = () => {};
    refresh().catch(() => {});
    try {
      unsubscribe = subscribeExternalWebApps(currentUser, (next) => active && applyData(next));
    } catch (error) {
      console.warn('[External apps] realtime unavailable; polling remains active', error);
    }
    const poll = manager ? window.setInterval(() => refresh({ silent: true }).catch(() => {}), 8000) : null;
    return () => {
      active = false;
      unsubscribe?.();
      if (poll) window.clearInterval(poll);
    };
  }, [open, currentUser?.id, currentUser?.email, currentUser?.role, manager]);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-ext-open');
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (review) setReview(null);
      else onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('bes-ext-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, review?.id, onClose]);

  useEffect(() => {
    if (!review) return;
    setConfig(initialReviewConfig(review));
    setFrameKey((value) => value + 1);
  }, [review?.id]);

  useEffect(() => {
    if (!review || htmlReview || !embedUrl) {
      setCheck(htmlReview ? { embeddable: true, reason: 'File HTML chạy trong vùng cách ly của Brian.' } : null);
      return undefined;
    }
    const controller = new AbortController();
    setCheck({ checking: true });
    fetch(`/api/check-embed?url=${encodeURIComponent(embedUrl)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(setCheck)
      .catch((error) => {
        if (error?.name !== 'AbortError') setCheck({ embeddable: null, reason: 'Không kiểm tra được chính sách iframe.' });
      });
    return () => controller.abort();
  }, [review?.id, htmlReview, embedUrl, frameKey]);

  if (!open || typeof document === 'undefined') return null;

  const switchSourceType = (sourceType) => {
    setNotice('');
    setDraft((current) => ({
      ...current,
      sourceType,
      url: sourceType === EXTERNAL_APP_SOURCE_URL ? current.url : '',
      embedUrl: sourceType === EXTERNAL_APP_SOURCE_URL ? current.embedUrl : '',
      htmlContent: sourceType === EXTERNAL_APP_SOURCE_HTML ? current.htmlContent : '',
      fileName: sourceType === EXTERNAL_APP_SOURCE_HTML ? current.fileName : '',
      icon: sourceType === EXTERNAL_APP_SOURCE_HTML
        ? (current.icon === 'WEB' ? 'HTM' : current.icon)
        : (current.icon === 'HTM' ? 'WEB' : current.icon),
    }));
  };

  const chooseHtmlFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setNotice('');
    if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
      setNotice('Chỉ chấp nhận file .html hoặc .htm.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_EXTERNAL_HTML_BYTES) {
      setNotice('File HTML vượt quá 2 MB. Hãy giảm dung lượng trước khi gửi.');
      event.target.value = '';
      return;
    }
    try {
      const htmlContent = await file.text();
      if (!isValidExternalHtml(htmlContent)) throw new Error('File đã chọn không có cấu trúc HTML hợp lệ.');
      setDraft((current) => ({
        ...current,
        sourceType: EXTERNAL_APP_SOURCE_HTML,
        htmlContent,
        fileName: file.name,
        name: current.name || fileNameWithoutExtension(file.name),
        icon: current.icon === 'WEB' ? 'HTM' : current.icon,
      }));
      setNotice(`Đã đọc ${file.name} · ${(externalHtmlByteLength(htmlContent) / 1024).toFixed(0)} KB.`);
    } catch (error) {
      setNotice(error?.message || 'Không thể đọc file HTML.');
      event.target.value = '';
    }
  };

  const openPendingReview = (request) => {
    setReview({
      ...request.app,
      id: `request-${request.id}`,
      request,
    });
  };

  const openMinePreview = (request) => {
    setReview({
      ...request.app,
      id: `mine-${request.id}`,
      previewOnly: true,
    });
  };

  const openApprovedReview = (app) => {
    setReview({
      id: `approved-${app.id}`,
      name: app.title,
      sourceType: app.sourceType,
      url: app.externalUrl,
      embedUrl: app.embedUrl,
      htmlContent: app.htmlContent,
      fileName: app.fileName,
      icon: app.icon,
      approvedApp: app,
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || draftError) return;
    setBusy('submit');
    setNotice('');
    try {
      const result = await submitExternalWebApp(currentUser, draft, language);
      const submittedType = sourceTypeOf(draft);
      setDraft(EMPTY);
      await refresh();
      setTab('mine');
      setNotice(result?.alreadyPending
        ? (submittedType === EXTERNAL_APP_SOURCE_HTML ? 'File HTML này đã có yêu cầu chờ duyệt.' : 'Website này đã có yêu cầu chờ duyệt.')
        : (vi ? 'Đã gửi TTCM duyệt.' : 'Submitted for approval.'));
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const applyPreset = (preset) => {
    setConfig((current) => normalizeExternalAppEmbedConfig({
      ...current,
      hideBrianHeader: preset.hideBrianHeader,
      hideBrianFooter: preset.hideBrianFooter,
    }, sourceUrl));
  };

  const commitReview = async () => {
    if (!review || busy || !canRenderReview || embedBlocked) return;
    const approvedConfig = normalizeExternalAppEmbedConfig(config, sourceUrl);
    const targetId = review.request?.id || review.approvedApp?.id;
    setBusy(targetId || 'publish');
    setNotice('');
    try {
      if (review.request) {
        await approveExternalWebApp(currentUser, review.request, approvedConfig);
      } else if (review.approvedApp) {
        await updateApprovedExternalWebAppConfig(currentUser, review.approvedApp.id, approvedConfig);
      }
      await refresh();
      const title = review.name || review.request?.app?.name || review.approvedApp?.title || 'Ứng dụng';
      setNotice(`Đã lưu “${title}” với chế độ ${layoutLabel(approvedConfig).toLowerCase()}.`);
      setReview(null);
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const reject = async (request) => {
    if (busy) return;
    setBusy(request.id);
    setNotice('');
    try {
      await rejectExternalWebApp(request.id);
      await refresh();
      if (review?.request?.id === request.id) setReview(null);
      setNotice(`Đã từ chối “${request.app.name}”.`);
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const remove = async (app) => {
    if (!window.confirm(`Gỡ ứng dụng “${app.title}”?`)) return;
    setBusy(app.id);
    try {
      await removeApprovedExternalWebApp(currentUser, app.id);
      await refresh();
      if (review?.approvedApp?.id === app.id) setReview(null);
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const tabs = [
    ['submit', 'Gửi ứng dụng'],
    ['mine', 'Yêu cầu của tôi'],
    ...(manager ? [['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt']] : []),
  ];
  const list = tab === 'mine' ? data.mine : tab === 'pending' ? pending : [];

  return createPortal(
    <>
      <div className="bes-ext-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
        <section className="bes-ext-dialog bes-ext-manager-simple" role="dialog" aria-modal="true">
          <header className="bes-ext-head">
            <div>
              <span>＋</span>
              <div>
                <strong>Gửi ứng dụng cho TTCM duyệt</strong>
                <small>Hỗ trợ website HTTPS và ứng dụng HTML một tệp</small>
              </div>
            </div>
            <div className="bes-ext-head-actions">
              <button type="button" className="bes-ext-refresh" disabled={refreshing} onClick={() => refresh().catch(() => {})}>↻ {refreshing ? 'Đang tải' : 'Làm mới'}</button>
              <button type="button" className="bes-ext-close" onClick={onClose}>×</button>
            </div>
          </header>

          <nav className="bes-ext-tabs">
            {tabs.map(([id, text]) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {text}{id === 'pending' && pending.length ? <b>{pending.length}</b> : null}
              </button>
            ))}
          </nav>

          <main className="bes-ext-manager-simple-body">
            {tab === 'submit' ? (
              <form className="bes-ext-form" onSubmit={submit}>
                <h2>Chọn cách gửi ứng dụng</h2>
                <p>TTCM sẽ xem thử nội dung, kiểm tra cách hiển thị rồi mới duyệt để đưa ứng dụng vào English Hub.</p>

                <div className="bes-ext-source-picker wide" role="tablist" aria-label="Nguồn ứng dụng">
                  <button type="button" className={draft.sourceType === EXTERNAL_APP_SOURCE_URL ? 'active' : ''} onClick={() => switchSourceType(EXTERNAL_APP_SOURCE_URL)}>
                    <b>🔗 Đường dẫn website</b><small>Vercel, GitHub Pages hoặc website HTTPS</small>
                  </button>
                  <button type="button" className={draft.sourceType === EXTERNAL_APP_SOURCE_HTML ? 'active' : ''} onClick={() => switchSourceType(EXTERNAL_APP_SOURCE_HTML)}>
                    <b>⌁ Tải file HTML</b><small>Ứng dụng .html hoặc .htm chạy trong Brian</small>
                  </button>
                </div>

                <label><span>Tên ứng dụng</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                <label><span>Biểu tượng</span><input maxLength="3" value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value.toUpperCase().slice(0, 3) })} /></label>

                {draft.sourceType === EXTERNAL_APP_SOURCE_URL ? (
                  <>
                    <label className="wide"><span>URL gốc</span><input required type="url" placeholder="https://…" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>
                    <label className="wide bes-ext-embed-url-field">
                      <span>URL nhúng <small>Không bắt buộc</small></span>
                      <div>
                        <input type="url" placeholder="https://…/?embed=1" value={draft.embedUrl} onChange={(event) => setDraft({ ...draft, embedUrl: event.target.value })} />
                        <button type="button" onClick={() => setDraft({ ...draft, embedUrl: withEmbedModeParam(draft.url) })} disabled={!safeExternalWebAppUrl(draft.url)}>Tạo ?embed=1</button>
                      </div>
                    </label>
                  </>
                ) : (
                  <label className="wide bes-ext-html-file-field">
                    <span>File ứng dụng HTML <small>Tối đa 2 MB</small></span>
                    <input type="file" accept=".html,.htm,text/html" onChange={chooseHtmlFile} />
                    <div className={draft.htmlContent ? 'is-ready' : ''}>
                      <b>{draft.fileName || 'Chưa chọn file'}</b>
                      <small>{draft.htmlContent ? `${(externalHtmlByteLength(draft.htmlContent) / 1024).toFixed(0)} KB · sẵn sàng gửi duyệt` : 'Chọn file HTML một tệp từ máy tính'}</small>
                    </div>
                  </label>
                )}

                <label><span>Nhóm</span><select value={draft.groupId} onChange={(event) => setDraft({ ...draft, groupId: event.target.value })}>{EXTERNAL_APP_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
                <label className="wide"><span>Mô tả</span><textarea rows="3" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <footer>
                  <small className="bes-ext-submit-hint">{draftError || 'Ứng dụng hợp lệ và sẵn sàng gửi TTCM.'}</small>
                  <button className="bes-ext-primary" disabled={Boolean(draftError) || busy === 'submit'}>{busy === 'submit' ? 'Đang gửi…' : 'Gửi TTCM duyệt'}</button>
                </footer>
              </form>
            ) : null}

            {['mine', 'pending'].includes(tab) ? (
              <div className="bes-ext-list">
                {list.map((request) => (
                  <article className="bes-ext-item" key={request.id}>
                    <div>
                      <span className={`bes-ext-chip ${request.status}`}>{statusLabel(request.status)}</span>
                      <span className={`bes-ext-source-chip ${sourceTypeOf(request.app)}`}>{sourceLabel(request.app)}</span>
                      <strong>{request.app.name || request.item_title}</strong>
                      <small>{request.requester_name || request.requester_email || ''} · {request.app.fileName || request.app.url}</small>
                      <p>{request.app.description}</p>
                    </div>
                    <div className="bes-ext-actions">
                      <button type="button" onClick={() => tab === 'pending' ? openPendingReview(request) : openMinePreview(request)}>{tab === 'pending' ? 'Xem thử & duyệt' : 'Xem trước'}</button>
                      {tab === 'pending' && manager ? <button type="button" className="reject" disabled={busy === request.id} onClick={() => reject(request)}>Từ chối</button> : null}
                    </div>
                  </article>
                ))}
                {!list.length ? <div className="bes-ext-empty">{tab === 'pending' ? 'Chưa có yêu cầu chờ duyệt.' : 'Chưa có yêu cầu.'}</div> : null}
              </div>
            ) : null}

            {tab === 'approved' && manager ? (
              <div className="bes-ext-list">
                {data.approved.map((app) => (
                  <article className="bes-ext-item" key={app.id}>
                    <div>
                      <span className="bes-ext-chip approved">{layoutLabel(app.embedConfig)}</span>
                      <span className={`bes-ext-source-chip ${app.sourceType}`}>{sourceLabel(app)}</span>
                      <strong>{app.title}</strong>
                      <small>{app.fileName || app.embedConfig?.embedUrl || app.externalUrl}</small>
                      <p>{app.descVi}</p>
                    </div>
                    <div className="bes-ext-actions">
                      <button type="button" onClick={() => openApprovedReview(app)}>Xem & cấu hình</button>
                      <button type="button" className="reject" disabled={busy === app.id} onClick={() => remove(app)}>Gỡ</button>
                    </div>
                  </article>
                ))}
                {!data.approved.length ? <div className="bes-ext-empty">Chưa có ứng dụng đã duyệt.</div> : null}
              </div>
            ) : null}
          </main>
          {notice ? <div className="bes-ext-notice">{notice}</div> : null}
        </section>
      </div>

      {review ? (
        <section className="bes-ext-review-screen" aria-label={`Duyệt ${review.name || 'ứng dụng'}`}>
          <header className="bes-ext-review-header">
            <div className="bes-ext-review-title">
              <span>{review.icon || (htmlReview ? 'HTM' : 'WEB')}</span>
              <div>
                <strong>{review.name || 'Ứng dụng'}</strong>
                <small>{sourceLabel(review)} · {canPublishReview ? 'Xem thử trước khi xuất bản' : 'Bản xem trước của yêu cầu'}</small>
              </div>
            </div>
            <div className="bes-ext-review-header-actions">
              <button type="button" className="secondary" onClick={() => setFrameKey((value) => value + 1)}>↻ Tải lại</button>
              {canPublishReview ? (
                <button type="button" className="approve" disabled={reviewBusy || !canRenderReview || embedBlocked} onClick={commitReview}>
                  {reviewBusy ? 'Đang lưu…' : review.approvedApp ? 'Lưu cấu hình' : 'Duyệt & xuất bản'}
                </button>
              ) : null}
              <button type="button" className="close" disabled={reviewBusy} onClick={() => setReview(null)}>×</button>
            </div>
          </header>

          <div className="bes-ext-review-workspace">
            <aside className="bes-ext-review-settings">
              <section>
                <span className="bes-ext-review-step">1</span>
                <div>
                  <h3>{htmlReview ? 'Nguồn file HTML' : 'Địa chỉ nhúng'}</h3>
                  <p>{htmlReview ? 'File được chạy trong iframe cách ly, không được truy cập trực tiếp vào Brian.' : 'URL gốc dùng để nhận diện; URL nhúng là địa chỉ giáo viên thực sự mở.'}</p>
                </div>
              </section>

              {htmlReview ? (
                <div className="bes-ext-review-html-source">
                  <span>File đã gửi</span>
                  <strong>{review.fileName || 'application.html'}</strong>
                  <small>{reviewHtml ? `${(externalHtmlByteLength(reviewHtml) / 1024).toFixed(0)} KB` : 'Thiếu nội dung HTML'}</small>
                </div>
              ) : (
                <>
                  <label>
                    <span>URL gốc</span>
                    <input type="url" value={sourceUrl} readOnly />
                  </label>
                  <label>
                    <span>URL nhúng</span>
                    <div className="bes-ext-review-url-row">
                      <input
                        type="url"
                        value={config.embedUrl || ''}
                        onChange={(event) => setConfig((current) => ({ ...current, embedUrl: event.target.value }))}
                        placeholder="https://…/?embed=1"
                        readOnly={!canPublishReview}
                      />
                      {canPublishReview ? <button type="button" onClick={() => setConfig((current) => ({ ...current, embedUrl: withEmbedModeParam(sourceUrl) }))}>Tạo</button> : null}
                    </div>
                  </label>
                  <div className={`bes-ext-embed-status ${check?.checking ? 'checking' : embedBlocked ? 'blocked' : embedUrl ? 'ready' : 'invalid'}`}>
                    <span>{check?.checking ? '…' : embedBlocked ? '!' : embedUrl ? '✓' : '×'}</span>
                    <div>
                      <strong>{check?.checking ? 'Đang kiểm tra iframe' : embedBlocked ? 'Website đang chặn iframe' : embedUrl ? 'URL nhúng hợp lệ' : 'URL nhúng chưa hợp lệ'}</strong>
                      <small>{check?.reason || (embedBlocked ? 'Cần sửa chính sách frame-ancestors/X-Frame-Options ở website con.' : 'Brian sẽ dùng đúng URL này khi giáo viên mở ứng dụng.')}</small>
                    </div>
                  </div>
                </>
              )}

              <section>
                <span className="bes-ext-review-step">2</span>
                <div>
                  <h3>Khung hiển thị Brian</h3>
                  <p>Chọn những thành phần của Brian còn xuất hiện quanh ứng dụng.</p>
                </div>
              </section>

              <div className="bes-ext-layout-presets" role="radiogroup" aria-label="Bố cục ứng dụng">
                {LAYOUT_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    role="radio"
                    aria-checked={layoutPresetId(config) === preset.id}
                    className={layoutPresetId(config) === preset.id ? 'active' : ''}
                    onClick={() => canPublishReview && applyPreset(preset)}
                    disabled={!canPublishReview}
                  >
                    <i aria-hidden="true">
                      <b className={preset.hideBrianHeader ? 'hidden' : ''} />
                      <em />
                      <b className={preset.hideBrianFooter ? 'hidden' : ''} />
                    </i>
                    <span><strong>{preset.title}</strong><small>{preset.description}</small></span>
                  </button>
                ))}
              </div>

              <label className="bes-ext-review-switch">
                <input
                  type="checkbox"
                  checked={config.allowFullscreen !== false}
                  onChange={(event) => setConfig((current) => ({ ...current, allowFullscreen: event.target.checked }))}
                  disabled={!canPublishReview}
                />
                <span><strong>Cho phép mở toàn màn hình</strong><small>Giáo viên có thể phóng ứng dụng chiếm toàn bộ màn hình thiết bị.</small></span>
              </label>

              <div className="bes-ext-review-note">
                <strong>{htmlReview ? 'Ứng dụng HTML được cách ly' : 'Lưu ý về website con'}</strong>
                <p>{htmlReview ? 'Brian không cấp quyền cùng nguồn cho file HTML. Mã trong ứng dụng không thể đọc dữ liệu đăng nhập hoặc DOM của English Hub.' : <>Brian không thể xóa DOM của website khác tên miền. Website con nên nhận <code>embed=1</code> và tự ẩn header/footer trong chế độ nhúng.</>}</p>
              </div>
            </aside>

            <main className="bes-ext-review-preview-area">
              <div className="bes-ext-review-preview-toolbar">
                <div><i /><i /><i /></div>
                <span>Xem trước như tài khoản giáo viên</span>
                <b>{layoutLabel(config)}</b>
              </div>
              <div className={`bes-ext-review-device${config.hideBrianHeader ? ' no-header' : ''}${config.hideBrianFooter ? ' no-footer' : ''}`}>
                {!config.hideBrianHeader ? (
                  <div className="bes-ext-review-brian-header">
                    <strong>Brian English Studio</strong>
                    <span>Ứng dụng · Học liệu · Quản lý</span>
                  </div>
                ) : null}
                <div className="bes-ext-review-frame-wrap">
                  {canRenderReview ? (
                    htmlReview ? (
                      <iframe
                        key={frameKey}
                        srcDoc={reviewHtml}
                        title={review.name || 'Ứng dụng HTML đang duyệt'}
                        sandbox="allow-forms allow-modals allow-presentation allow-scripts allow-downloads allow-popups"
                        allow="clipboard-write; microphone; camera; fullscreen"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <iframe
                        key={frameKey}
                        src={embedUrl}
                        title={review.name || 'Ứng dụng website đang duyệt'}
                        sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
                        allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    )
                  ) : <div className="bes-ext-review-frame-empty">{htmlReview ? 'File HTML không hợp lệ hoặc đã bị thiếu nội dung.' : 'Nhập URL nhúng hợp lệ để xem trước.'}</div>}
                </div>
                {!config.hideBrianFooter ? (
                  <div className="bes-ext-review-brian-footer">
                    <span>Brian English Studio</span>
                    <small>Phiên bản · Bản quyền</small>
                  </div>
                ) : null}
              </div>
            </main>
          </div>
        </section>
      ) : null}
    </>,
    document.body,
  );
}
