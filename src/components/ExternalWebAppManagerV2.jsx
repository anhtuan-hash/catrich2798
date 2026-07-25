import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import {
  approveExternalWebApp,
  EXTERNAL_APP_GROUPS,
  loadExternalWebApps,
  normalizeExternalAppDraft,
  normalizeExternalAppEmbedConfig,
  rejectExternalWebApp,
  removeApprovedExternalWebApp,
  safeExternalWebAppUrl,
  submitExternalWebApp,
  subscribeExternalWebApps,
  updateApprovedExternalWebAppConfig,
  withEmbedModeParam,
} from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
import './ExternalWebAppReviewFullscreen.css';

const EMPTY = {
  name: '',
  url: '',
  embedUrl: '',
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
  const sourceUrl = safeExternalWebAppUrl(review?.url || review?.externalUrl);
  const embedUrl = safeExternalWebAppUrl(config.embedUrl);
  const reviewBusy = Boolean(busy && review);
  const embedBlocked = check?.embeddable === false;
  const canPublishReview = manager && Boolean(review?.request || review?.approvedApp);

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
    if (!review || !embedUrl) {
      setCheck(null);
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
  }, [review?.id, embedUrl, frameKey]);

  if (!open || typeof document === 'undefined') return null;

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
      url: app.externalUrl,
      embedUrl: app.embedUrl,
      icon: app.icon,
      approvedApp: app,
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy('submit');
    setNotice('');
    try {
      const result = await submitExternalWebApp(currentUser, draft, language);
      setDraft(EMPTY);
      await refresh();
      setTab('mine');
      setNotice(result?.alreadyPending
        ? (vi ? 'Website này đã có yêu cầu chờ duyệt.' : 'This website is already pending approval.')
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
    if (!review || busy || !embedUrl) return;
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
    ['submit', 'Thêm ứng dụng'],
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
                <strong>Ứng dụng website</strong>
                <small>Duyệt bằng URL nhúng riêng và cấu hình khung hiển thị của Brian</small>
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
                <h2>Thêm website làm ứng dụng</h2>
                <p>Nhập URL gốc để nhận diện ứng dụng. URL nhúng là địa chỉ dành riêng cho iframe, thường có thêm <code>?embed=1</code> để website con tự ẩn header hoặc footer.</p>
                <label><span>Tên ứng dụng</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                <label><span>Biểu tượng</span><input maxLength="3" value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value.toUpperCase().slice(0, 3) })} /></label>
                <label className="wide"><span>URL gốc</span><input required type="url" placeholder="https://…" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>
                <label className="wide bes-ext-embed-url-field">
                  <span>URL nhúng <small>Không bắt buộc</small></span>
                  <div>
                    <input type="url" placeholder="https://…/?embed=1" value={draft.embedUrl} onChange={(event) => setDraft({ ...draft, embedUrl: event.target.value })} />
                    <button type="button" onClick={() => setDraft({ ...draft, embedUrl: withEmbedModeParam(draft.url) })} disabled={!safeExternalWebAppUrl(draft.url)}>Tạo ?embed=1</button>
                  </div>
                </label>
                <label><span>Nhóm</span><select value={draft.groupId} onChange={(event) => setDraft({ ...draft, groupId: event.target.value })}>{EXTERNAL_APP_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
                <label className="wide"><span>Mô tả</span><textarea rows="3" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <footer><button className="bes-ext-primary" disabled={!clean.name || !clean.url || busy === 'submit'}>{busy === 'submit' ? 'Đang gửi…' : 'Gửi TTCM duyệt'}</button></footer>
              </form>
            ) : null}

            {['mine', 'pending'].includes(tab) ? (
              <div className="bes-ext-list">
                {list.map((request) => (
                  <article className="bes-ext-item" key={request.id}>
                    <div>
                      <span className={`bes-ext-chip ${request.status}`}>{statusLabel(request.status)}</span>
                      <strong>{request.app.name || request.item_title}</strong>
                      <small>{request.requester_name || request.requester_email || ''} {request.app.url}</small>
                      <p>{request.app.description}</p>
                    </div>
                    <div className="bes-ext-actions">
                      <button type="button" onClick={() => tab === 'pending' ? openPendingReview(request) : openMinePreview(request)}>{tab === 'pending' ? 'Cấu hình & duyệt' : 'Xem trước'}</button>
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
                      <strong>{app.title}</strong>
                      <small>{app.embedConfig?.embedUrl || app.externalUrl}</small>
                      <p>{app.descVi}</p>
                    </div>
                    <div className="bes-ext-actions">
                      <button type="button" onClick={() => openApprovedReview(app)}>Sửa cấu hình</button>
                      <button type="button" className="reject" disabled={busy === app.id} onClick={() => remove(app)}>Gỡ</button>
                    </div>
                  </article>
                ))}
                {!data.approved.length ? <div className="bes-ext-empty">Chưa có ứng dụng website đã duyệt.</div> : null}
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
              <span>{review.icon || 'WEB'}</span>
              <div>
                <strong>{review.name || 'Ứng dụng website'}</strong>
                <small>{canPublishReview ? 'Cấu hình trải nghiệm giáo viên trước khi xuất bản' : 'Bản xem trước URL nhúng'}</small>
              </div>
            </div>
            <div className="bes-ext-review-header-actions">
              <button type="button" className="secondary" onClick={() => setFrameKey((value) => value + 1)}>↻ Tải lại</button>
              {canPublishReview ? (
                <button type="button" className="approve" disabled={reviewBusy || !embedUrl || embedBlocked} onClick={commitReview}>
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
                  <h3>Địa chỉ nhúng</h3>
                  <p>URL gốc dùng để nhận diện; URL nhúng là địa chỉ giáo viên thực sự mở.</p>
                </div>
              </section>

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
                <strong>Lưu ý về chân trang website con</strong>
                <p>Brian không thể xóa DOM của website khác tên miền. Website con phải tự nhận <code>embed=1</code> và không render footer trong chế độ nhúng.</p>
              </div>
            </aside>

            <main className="bes-ext-review-preview-area">
              <div className="bes-ext-review-preview-toolbar">
                <div><i /><i /><i /></div>
                <span>Xem trước như tài khoản giáo viên</span>
                <b>{layoutLabel(config)}</b>
              </div>
              <div className="bes-ext-review-device">
                {!config.hideBrianHeader ? (
                  <div className="bes-ext-review-brian-header">
                    <strong>Brian English Studio</strong>
                    <span>Ứng dụng · Học liệu · Quản lý</span>
                  </div>
                ) : null}
                <div className="bes-ext-review-frame-wrap">
                  {embedUrl ? (
                    <iframe
                      key={frameKey}
                      src={embedUrl}
                      title={review.name || 'Ứng dụng đang duyệt'}
                      sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
                      allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : <div className="bes-ext-review-frame-empty">Nhập URL nhúng hợp lệ để xem trước.</div>}
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
