import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Image as ImageIcon, LockKeyhole, RotateCcw, Smartphone, Upload } from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { supabase } from '../utils/supabase.js';
import { uploadHomeHeroMedia } from '../utils/homepageHeroMediaOptimizer.js';

const MOBILE_HERO_DOCUMENT = '/hero/mobile-current.json';
const FALLBACK_MOBILE_HERO = '/mobile-home-premium-hero.webp';
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/apng';

function clean(value) {
  return String(value || '').trim();
}

async function readPublishedMobileHero() {
  const separator = MOBILE_HERO_DOCUMENT.includes('?') ? '&' : '?';
  const response = await fetch(`${MOBILE_HERO_DOCUMENT}${separator}t=${Date.now()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return { url: '', fileName: '', mimeType: '' };
  const document = await response.json();
  return {
    url: clean(document?.mobileHero?.url),
    fileName: clean(document?.mobileHero?.fileName),
    mimeType: clean(document?.mobileHero?.mimeType),
  };
}

function statusMessage(error) {
  const message = String(error?.message || error || 'Không thể cập nhật Hero Mobile.');
  if (/admin|ttcm/i.test(message) && /only|chỉ/i.test(message)) return 'Chỉ tài khoản TTCM/Admin có quyền chỉnh Hero mới được thay đổi ảnh Hero Mobile.';
  if (/GITHUB_HERO_TOKEN/i.test(message)) return 'Vercel chưa có GITHUB_HERO_TOKEN để công bố ảnh Hero Mobile.';
  if (/session|token|đăng nhập/i.test(message)) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử lại.';
  return message;
}

export default function MobileHeroAdminField({ currentUser }) {
  const inputRef = useRef(null);
  const canEdit = isDepartmentLeaderRole(currentUser?.role);
  const [published, setPublished] = useState({ url: '', fileName: '', mimeType: '' });
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    readPublishedMobileHero()
      .then((value) => active && setPublished(value))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const previewUrl = useMemo(() => clean(draft?.url || published.url) || FALLBACK_MOBILE_HERO, [draft, published.url]);
  const usingFallback = !clean(draft?.url || published.url);

  const handleSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ tone: 'error', text: 'Hero Mobile chỉ nhận tệp ảnh.' });
      return;
    }

    setBusy('upload');
    setMessage(null);
    try {
      const result = await uploadHomeHeroMedia(file, currentUser);
      if (result.type === 'video') throw new Error('Hero Mobile chỉ nhận tệp ảnh.');
      setDraft({
        url: result.url,
        fileName: result.fileName,
        mimeType: result.mimeType,
        temporary: Boolean(result.temporary),
      });
      setMessage({
        tone: result.temporary ? 'warning' : 'success',
        text: result.temporary
          ? 'Đã xem trước ảnh trên thiết bị này, nhưng chưa thể công bố vì Storage chưa sẵn sàng.'
          : 'Đã tải ảnh lên vùng bản nháp. Kiểm tra hình xem trước rồi bấm “Công bố ảnh mobile”.',
      });
    } catch (error) {
      setMessage({ tone: 'error', text: statusMessage(error) });
    } finally {
      setBusy('');
    }
  };

  const sendPublishRequest = async (payload) => {
    if (!supabase) throw new Error('Supabase Auth chưa được cấu hình.');
    const { data, error } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (error || !accessToken) throw new Error('Phiên đăng nhập đã hết hạn.');

    const response = await fetch('/api/homepage-mobile-hero-publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || `Không thể công bố Hero Mobile (${response.status}).`);
    return result;
  };

  const handlePublish = async () => {
    if (!draft?.url || draft.temporary) return;
    setBusy('publish');
    setMessage(null);
    try {
      const result = await sendPublishRequest({
        url: draft.url,
        fileName: draft.fileName,
        mimeType: draft.mimeType,
      });
      setPublished(result.mobileHero || published);
      const shortCommit = clean(result.commitSha).slice(0, 7);
      setMessage({
        tone: 'success',
        text: `Đã công bố ảnh Hero Mobile${shortCommit ? ` · commit ${shortCommit}` : ''}. Vercel đang triển khai; ảnh mới sẽ tự xuất hiện trên điện thoại sau khi deployment hoàn tất.`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: statusMessage(error) });
    } finally {
      setBusy('');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Khôi phục ảnh Hero Mobile mặc định? Ảnh Desktop sẽ không bị thay đổi.')) return;
    setBusy('remove');
    setMessage(null);
    try {
      const result = await sendPublishRequest({ remove: true });
      setDraft(null);
      setPublished({ url: '', fileName: '', mimeType: '' });
      const shortCommit = clean(result.commitSha).slice(0, 7);
      setMessage({
        tone: 'success',
        text: `Đã yêu cầu khôi phục ảnh mobile mặc định${shortCommit ? ` · commit ${shortCommit}` : ''}. Thay đổi có hiệu lực sau khi Vercel triển khai xong.`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: statusMessage(error) });
    } finally {
      setBusy('');
    }
  };

  if (!canEdit) {
    return (
      <article className="hero-editor__card" data-mobile-hero-admin-field="locked">
        <header>
          <div><strong>Ảnh Hero Mobile</strong><small>Ảnh riêng cho phiên bản điện thoại</small></div>
          <LockKeyhole size={19} />
        </header>
        <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Chỉ tài khoản TTCM/Admin có quyền chỉnh Hero mới được thay đổi ảnh Hero Mobile.</p>
      </article>
    );
  }

  return (
    <article className="hero-editor__card" data-mobile-hero-admin-field="admin">
      <header>
        <div>
          <strong><Smartphone size={17} style={{ verticalAlign: '-3px', marginRight: 7 }} />Ảnh Hero Mobile</strong>
          <small>Độc lập với Hero Desktop · khung hiển thị 4:3</small>
        </div>
        <span style={{ fontSize: 12, color: '#64748b' }}>{loading ? 'Đang tải…' : (usingFallback ? 'Đang dùng ảnh mặc định' : 'Đã có ảnh riêng')}</span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 320px) 1fr', gap: 18, alignItems: 'center' }}>
        <div style={{ aspectRatio: '4 / 3', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(15,23,42,.12)', background: '#f8fbff' }}>
          <img src={previewUrl} alt="Xem trước Hero Mobile" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
        </div>
        <div>
          <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} onChange={handleSelect} hidden />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>
              <Upload size={16} />{busy === 'upload' ? 'Đang tải…' : (draft?.url ? 'Chọn ảnh khác' : 'Chọn ảnh mobile')}
            </button>
            <button type="button" className="is-publish" disabled={Boolean(busy) || !draft?.url || draft?.temporary} onClick={handlePublish}>
              <Check size={16} />{busy === 'publish' ? 'Đang công bố…' : 'Công bố ảnh mobile'}
            </button>
            <button type="button" className="hero-editor__clear-media" disabled={Boolean(busy) || usingFallback} onClick={handleReset}>
              <RotateCcw size={16} />{busy === 'remove' ? 'Đang khôi phục…' : 'Dùng ảnh mặc định'}
            </button>
          </div>
          <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
            JPG, PNG, WebP, GIF hoặc APNG · tối đa 25 MB. Việc công bố ảnh mobile tạo deployment riêng và không thay đổi ảnh Hero Desktop.
          </p>
        </div>
      </div>

      {message ? <div className={`hero-editor__message is-${message.tone}`} style={{ marginTop: 14 }}>{message.text}</div> : null}
      {!message && draft?.url ? <div className="hero-editor__message is-info" style={{ marginTop: 14 }}><ImageIcon size={15} />Ảnh đang ở chế độ xem trước, chưa hiển thị công khai cho đến khi bấm “Công bố ảnh mobile”.</div> : null}
    </article>
  );
}
