import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import { isDepartmentLeaderRole, normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';
import {
  getAccessToken,
  loadResourceLibrary,
  RESOURCE_EVENT,
  sha256,
  syncResourcesFromCloud,
  syncResourceViaServer,
  updateResourceLibrary,
  upsertResourceCloud,
} from '../utils/resourceLibrary.js';
import './THPTPracticeHub.css';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const HTML_MIME = 'text/html';
const HUB_TAG = 'thpt-interactive-html';

function formatSize(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function isHtmlLesson(item) {
  const name = String(item?.fileName || '').toLowerCase();
  const mime = String(item?.mimeType || '').toLowerCase();
  const tags = Array.isArray(item?.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
  return item?.category === 'thpt-exam'
    && !item?.deletedAt
    && (mime.includes('text/html') || /\.html?$/.test(name) || tags.includes(HUB_TAG));
}

function isMine(item, user) {
  if (!item || !user) return false;
  return item.uploaderId === user.id
    || String(item.uploaderName || '').toLowerCase() === String(user.email || '').toLowerCase();
}

function statusLabel(item, vi) {
  if (item.status === 'approved') return vi ? 'Đã chia sẻ' : 'Shared';
  if (item.visibility === 'private') return vi ? 'Riêng tư' : 'Private';
  if (item.status === 'revision') return vi ? 'Cần chỉnh sửa' : 'Needs revision';
  if (item.status === 'rejected') return vi ? 'Đã từ chối' : 'Rejected';
  return vi ? 'Chờ TTCM duyệt' : 'Awaiting approval';
}

function encodeMetadata(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

async function uploadToDrive(file, metadata) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn');
  const response = await fetch('/api/google-drive-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': HTML_MIME,
      'X-File-Name': encodeURIComponent(file.name),
      'X-Resource-Metadata': encodeMetadata(metadata),
    },
    body: file,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể tải file lên Google Drive');
  return data;
}

async function moveDriveFile(item, status) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn');
  const response = await fetch('/api/google-drive-move', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId: item.driveFileId, category: 'thpt-exam', status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể chuyển file trên Google Drive');
  return data;
}

async function fetchHtml(item) {
  const token = await getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn');
  const id = item.cloudId || item.id;
  const response = await fetch(`/api/google-drive-file?resourceId=${encodeURIComponent(id)}&mode=inline`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    let message = 'Không thể mở bài học';
    try { message = (await response.json()).error || message; } catch { /* response may be text */ }
    throw new Error(message);
  }
  return response.text();
}

function safeStandalonePlayer(title, html) {
  const safeTitle = String(title || 'Bài học tương tác').replace(/[<>]/g, '');
  const serialized = JSON.stringify(String(html || '')).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111}iframe{display:block;width:100%;height:100%;border:0;background:#fff}</style></head><body><iframe title="${safeTitle}" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" referrerpolicy="no-referrer"></iframe><script>document.querySelector('iframe').srcdoc=${serialized};<\/script></body></html>`;
}

export default function THPTPracticeHub({ language = 'vi', currentUser }) {
  const vi = language === 'vi';
  const manager = isDepartmentLeaderRole(currentUser?.role);
  const teacher = normalizeSystemRole(currentUser?.role, SYSTEM_ROLES.GUEST) === SYSTEM_ROLES.TEACHER;
  const canUpload = manager || teacher;
  const fileRef = useRef(null);
  const htmlCacheRef = useRef(new Map());
  const [lessons, setLessons] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [shareNow, setShareNow] = useState(true);
  const [tab, setTab] = useState('shared');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('');
  const [activeHtml, setActiveHtml] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [playerBusy, setPlayerBusy] = useState(false);

  const refresh = useCallback(async (preferredId = '') => {
    const result = await syncResourcesFromCloud().catch((error) => ({ ok: false, reason: error.message }));
    const next = loadResourceLibrary().items
      .filter((item) => item.cloudId && item.driveFileId && isHtmlLesson(item))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    setLessons(next);
    setActiveId((current) => preferredId || (next.some((item) => item.id === current || item.cloudId === current) ? current : next[0]?.id || ''));
    if (!result.ok && isSupabaseConfigured) setMessage((old) => old || `${vi ? 'Đang dùng dữ liệu đã đồng bộ gần nhất' : 'Using the latest synced data'}: ${result.reason}`);
    return next;
  }, [vi]);

  useEffect(() => {
    refresh();
    const onLocalUpdate = () => {
      const next = loadResourceLibrary().items.filter((item) => item.cloudId && item.driveFileId && isHtmlLesson(item));
      setLessons(next);
    };
    window.addEventListener(RESOURCE_EVENT, onLocalUpdate);
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel('thpt-practice-hub-resource-items')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_items' }, () => refresh())
        .subscribe();
    }
    return () => {
      window.removeEventListener(RESOURCE_EVENT, onLocalUpdate);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [refresh]);

  const activeLesson = useMemo(
    () => lessons.find((item) => item.id === activeId || item.cloudId === activeId) || null,
    [lessons, activeId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!activeLesson) {
      setActiveHtml('');
      return undefined;
    }
    const key = activeLesson.cloudId || activeLesson.id;
    const cached = htmlCacheRef.current.get(key);
    if (cached) {
      setActiveHtml(cached);
      return undefined;
    }
    setPlayerBusy(true);
    setActiveHtml('');
    fetchHtml(activeLesson)
      .then((html) => {
        if (cancelled) return;
        htmlCacheRef.current.set(key, html);
        setActiveHtml(html);
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setPlayerBusy(false);
      });
    return () => { cancelled = true; };
  }, [activeLesson?.cloudId, activeLesson?.id, activeLesson?.updatedAt]);

  const counts = useMemo(() => ({
    shared: lessons.filter((item) => item.status === 'approved').length,
    mine: lessons.filter((item) => isMine(item, currentUser)).length,
    pending: lessons.filter((item) => item.status !== 'approved' && !(isMine(item, currentUser) && item.visibility === 'private')).length,
    private: lessons.filter((item) => isMine(item, currentUser) && item.visibility === 'private').length,
  }), [lessons, currentUser?.id, currentUser?.email]);

  const filteredLessons = useMemo(() => {
    const term = query.trim().toLowerCase();
    return lessons.filter((item) => {
      const mine = isMine(item, currentUser);
      const tabOk = tab === 'mine'
        ? mine
        : tab === 'pending'
          ? manager && item.status !== 'approved' && !(mine && item.visibility === 'private')
          : item.status === 'approved';
      const text = `${item.title} ${item.fileName} ${item.uploaderName} ${(item.tags || []).join(' ')}`.toLowerCase();
      return tabOk && (!term || text.includes(term));
    });
  }, [lessons, tab, query, manager, currentUser?.id, currentUser?.email]);

  const chooseFile = (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    const htmlLike = selected.type === HTML_MIME || /\.html?$/i.test(selected.name);
    if (!htmlLike) {
      setFile(null);
      setMessage(vi ? 'Chỉ chấp nhận file .html hoặc .htm.' : 'Only .html or .htm files are accepted.');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setMessage(vi ? 'File vượt quá giới hạn 20 MB.' : 'The file exceeds the 20 MB limit.');
      return;
    }
    setFile(selected);
    if (!title.trim()) setTitle(selected.name.replace(/\.html?$/i, ''));
    setMessage('');
  };

  const saveLesson = async (event) => {
    event.preventDefault();
    if (!canUpload) {
      setMessage(vi ? 'Chỉ TTCM hoặc giáo viên được tải bài.' : 'Only department heads or teachers can upload lessons.');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setMessage(vi ? 'Supabase chưa được cấu hình nên chưa thể lưu bài trên toàn website.' : 'Supabase is not configured, so site-wide saving is unavailable.');
      return;
    }
    if (!title.trim() || !file) {
      setMessage(vi ? 'Hãy nhập tên bài và chọn file HTML.' : 'Enter a lesson name and choose an HTML file.');
      return;
    }

    setBusy('upload');
    setMessage('');
    try {
      const checksum = await sha256(file);
      const sharedByLeader = manager && shareNow;
      const base = {
        title: title.trim(),
        description: vi ? 'Bài học HTML tương tác trong hub Luyện thi THPT.' : 'Interactive HTML lesson in the THPT Practice Hub.',
        category: 'thpt-exam',
        grade: '12',
        schoolYear: '',
        unitName: '',
        cefr: '',
        skills: [],
        tags: [HUB_TAG, 'html', 'interactive'],
        source: 'Brian English Studio',
        copyright: 'internal',
        visibility: sharedByLeader ? 'department' : (manager ? 'private' : 'department'),
        allowDownload: true,
        status: sharedByLeader ? 'approved' : 'pending',
        uploaderId: currentUser?.id,
        uploaderName: currentUser?.name || currentUser?.email || (vi ? 'Giáo viên' : 'Teacher'),
        mimeType: HTML_MIME,
        fileName: file.name,
        size: file.size,
        checksum,
        aiSummary: '',
        aiUses: [],
        extractedText: '',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const uploaded = await uploadToDrive(file, base);
      Object.assign(base, {
        driveFileId: uploaded.fileId || '',
        driveWebViewLink: uploaded.webViewLink || '',
        driveDownloadLink: uploaded.downloadLink || '',
      });

      let cloud = await upsertResourceCloud(base);
      if (!cloud.ok) cloud = await syncResourceViaServer(base);
      if (!cloud.ok) throw new Error(cloud.reason || 'Không thể lưu metadata bài học');
      const saved = { ...base, ...cloud.item };

      if (sharedByLeader && saved.driveFileId) await moveDriveFile(saved, 'approved');

      updateResourceLibrary((store) => {
        const index = store.items.findIndex((item) => item.id === saved.id || item.cloudId === saved.cloudId);
        if (index >= 0) store.items[index] = saved;
        else store.items.unshift(saved);
      });
      await refresh(saved.id || saved.cloudId);
      setTab('mine');
      setActiveId(saved.id || saved.cloudId || '');
      setTitle('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setMessage(manager
        ? (sharedByLeader
          ? (vi ? 'Đã tải và chia sẻ bài cho toàn bộ giáo viên.' : 'Lesson uploaded and shared with all teachers.')
          : (vi ? 'Đã lưu bài ở chế độ riêng tư.' : 'Lesson saved privately.'))
        : (vi ? 'Đã gửi bài. TTCM sẽ duyệt trước khi chia sẻ toàn website.' : 'Lesson submitted for department-head approval.'));
    } catch (error) {
      setMessage(error.message || (vi ? 'Không thể tải bài lên.' : 'Could not upload the lesson.'));
    } finally {
      setBusy('');
    }
  };

  const persistLesson = async (lesson, changes, moveStatus = '') => {
    const updated = {
      ...lesson,
      ...changes,
      updatedAt: new Date().toISOString(),
      approvedAt: changes.status === 'approved' ? new Date().toISOString() : null,
      approvedBy: changes.status === 'approved' ? currentUser?.email : null,
    };
    let cloud = await upsertResourceCloud(updated);
    if (!cloud.ok) cloud = await syncResourceViaServer(updated);
    if (!cloud.ok) throw new Error(cloud.reason || 'Không thể cập nhật bài học');
    const saved = { ...updated, ...cloud.item };
    if (moveStatus && saved.driveFileId) await moveDriveFile(saved, moveStatus);
    htmlCacheRef.current.delete(saved.cloudId || saved.id);
    await refresh(saved.id || saved.cloudId);
    return saved;
  };

  const renameLesson = async (lesson) => {
    const nextTitle = window.prompt(vi ? 'Tên bài mới' : 'New lesson name', lesson.title)?.trim();
    if (!nextTitle || nextTitle === lesson.title) return;
    setBusy(`rename:${lesson.id}`);
    try {
      await persistLesson(lesson, { title: nextTitle });
      setMessage(vi ? 'Đã đổi tên bài học.' : 'Lesson renamed.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy('');
    }
  };

  const changeStatus = async (lesson, status, visibility) => {
    setBusy(`status:${lesson.id}`);
    try {
      await persistLesson(lesson, { status, visibility }, status);
      setMessage(status === 'approved'
        ? (vi ? `Đã duyệt và chia sẻ “${lesson.title}” cho toàn bộ giáo viên.` : `Approved and shared “${lesson.title}”.`)
        : status === 'revision'
          ? (vi ? `Đã yêu cầu chỉnh sửa “${lesson.title}”.` : `Revision requested for “${lesson.title}”.`)
          : (vi ? `Đã chuyển “${lesson.title}” sang chế độ riêng tư.` : `“${lesson.title}” is now private.`));
      if (status === 'approved') setTab('shared');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy('');
    }
  };

  const deleteLesson = async (lesson) => {
    if (!manager) return;
    if (!window.confirm(vi ? `Xoá bài “${lesson.title}” khỏi toàn website?` : `Delete “${lesson.title}” from the whole website?`)) return;
    setBusy(`delete:${lesson.id}`);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/google-drive-delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: lesson.cloudId || lesson.id, fileId: lesson.driveFileId, title: lesson.title, category: 'thpt-exam', status: lesson.status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể xoá bài học');
      htmlCacheRef.current.delete(lesson.cloudId || lesson.id);
      await refresh();
      setMessage(vi ? 'Đã xoá bài khỏi website và chuyển file vào thùng rác Drive.' : 'Lesson deleted and its Drive file moved to trash.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy('');
    }
  };

  const openInNewTab = async (lesson) => {
    try {
      const key = lesson.cloudId || lesson.id;
      const html = htmlCacheRef.current.get(key) || await fetchHtml(lesson);
      htmlCacheRef.current.set(key, html);
      const url = URL.createObjectURL(new Blob([safeStandalonePlayer(lesson.title, html)], { type: HTML_MIME }));
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="thpt-hub-page">
      <section className="thpt-hub-hero">
        <div>
          <span className="thpt-hub-kicker">THPT INTERACTIVE LEARNING</span>
          <h1>{vi ? 'Luyện thi THPT' : 'High School Exam Practice'}</h1>
          <p>{vi ? 'TTCM và giáo viên tải bài HTML tương tác. Bài của giáo viên được TTCM duyệt trước khi chia sẻ trên toàn website.' : 'Department heads and teachers upload interactive HTML lessons. Teacher submissions require approval before site-wide sharing.'}</p>
        </div>
        <div className="thpt-hub-stats">
          <div className="thpt-hub-stat"><strong>{counts.shared}</strong><span>{vi ? 'đã chia sẻ' : 'shared'}</span></div>
          {manager ? <div className="thpt-hub-stat pending"><strong>{counts.pending}</strong><span>{vi ? 'chờ duyệt' : 'pending'}</span></div> : null}
        </div>
      </section>

      <section className="thpt-workflow-note" aria-label={vi ? 'Quy trình chia sẻ' : 'Sharing workflow'}>
        <span><b>TTCM</b>{vi ? 'Tải lên → chọn chia sẻ toàn tổ hoặc giữ riêng tư.' : 'Upload → share with the department or keep private.'}</span>
        <span><b>{vi ? 'Giáo viên' : 'Teacher'}</b>{vi ? 'Tải lên → chờ TTCM duyệt → xuất hiện trên toàn website.' : 'Upload → await approval → publish site-wide.'}</span>
      </section>

      <section className="thpt-hub-grid">
        <form className="thpt-upload-card" onSubmit={saveLesson}>
          <div className="thpt-section-title"><span>01</span><div><h2>{vi ? 'Tải bài lên' : 'Upload a lesson'}</h2><p>{manager ? (vi ? 'Bạn có quyền chia sẻ ngay hoặc lưu riêng tư.' : 'You may share immediately or keep it private.') : (vi ? 'Bài sẽ được gửi TTCM duyệt.' : 'The lesson will be sent for approval.')}</p></div></div>
          <label>{vi ? 'Tên bài học' : 'Lesson name'}</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={vi ? 'Ví dụ: Ôn tập 12 thì tiếng Anh' : 'Example: Review of the 12 English tenses'} maxLength={120} disabled={!canUpload || Boolean(busy)} />
          <label className="thpt-file-drop">
            <input ref={fileRef} type="file" accept=".html,.htm,text/html" onChange={chooseFile} disabled={!canUpload || Boolean(busy)} />
            <b>{file ? file.name : (vi ? 'Chọn file HTML' : 'Choose an HTML file')}</b>
            <span>{file ? formatSize(file.size) : (vi ? 'Tối đa 20 MB · .html hoặc .htm' : 'Up to 20 MB · .html or .htm')}</span>
          </label>

          {manager ? (
            <label className="thpt-share-toggle">
              <input type="checkbox" checked={shareNow} onChange={(event) => setShareNow(event.target.checked)} />
              <span aria-hidden="true" />
              <div><strong>{shareNow ? (vi ? 'Chia sẻ cho toàn giáo viên' : 'Share with all teachers') : (vi ? 'Chỉ mình tôi xem' : 'Private to me')}</strong><small>{shareNow ? (vi ? 'Bài được duyệt và công bố ngay.' : 'The lesson is approved and published immediately.') : (vi ? 'Có thể chia sẻ sau bằng nút Chia sẻ.' : 'You can share it later.')}</small></div>
            </label>
          ) : (
            <div className="thpt-approval-hint"><b>{vi ? 'Trạng thái sau khi tải:' : 'After upload:'}</b> {vi ? 'Chờ TTCM duyệt' : 'Awaiting department-head approval'}</div>
          )}

          <button className="thpt-primary" type="submit" disabled={!canUpload || Boolean(busy)}>{busy === 'upload' ? (vi ? 'Đang tải và đồng bộ…' : 'Uploading and syncing…') : (vi ? 'Tải bài lên hệ thống' : 'Upload to the system')}</button>
          {!canUpload ? <p className="thpt-message">{vi ? 'Tài khoản này không có quyền tải bài.' : 'This account cannot upload lessons.'}</p> : null}
          {message ? <p className="thpt-message" role="status">{message}</p> : null}
        </form>

        <section className="thpt-library-card">
          <div className="thpt-section-title"><span>02</span><div><h2>{vi ? 'Kho bài tương tác' : 'Interactive lesson library'}</h2><p>{vi ? 'Bài đã duyệt được chia sẻ trên mọi tài khoản giáo viên.' : 'Approved lessons are shared across all teacher accounts.'}</p></div></div>
          <div className="thpt-tabs" role="tablist">
            <button type="button" className={tab === 'shared' ? 'is-active' : ''} onClick={() => setTab('shared')}>{vi ? 'Đã chia sẻ' : 'Shared'} <b>{counts.shared}</b></button>
            <button type="button" className={tab === 'mine' ? 'is-active' : ''} onClick={() => setTab('mine')}>{vi ? 'Bài của tôi' : 'My lessons'} <b>{counts.mine}</b></button>
            {manager ? <button type="button" className={tab === 'pending' ? 'is-active' : ''} onClick={() => setTab('pending')}>{vi ? 'Chờ duyệt' : 'Pending'} <b>{counts.pending}</b></button> : null}
          </div>
          <input className="thpt-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={vi ? 'Tìm theo tên bài hoặc giáo viên…' : 'Search by lesson or teacher…'} />
          <div className="thpt-lesson-list">
            {filteredLessons.length ? filteredLessons.map((lesson) => {
              const mine = isMine(lesson, currentUser);
              const pendingTeacherSubmission = manager && !mine && lesson.status !== 'approved';
              const leaderPrivate = manager && mine && lesson.visibility === 'private' && lesson.status !== 'approved';
              const canRename = manager || (mine && lesson.status !== 'approved');
              return (
                <article key={lesson.cloudId || lesson.id} className={(lesson.id === activeId || lesson.cloudId === activeId) ? 'thpt-lesson is-active' : 'thpt-lesson'} onClick={() => setActiveId(lesson.id || lesson.cloudId)}>
                  <button type="button" className="thpt-lesson-main" onClick={() => setActiveId(lesson.id || lesson.cloudId)}>
                    <span className="thpt-file-icon">HTML</span>
                    <span>
                      <span className={`thpt-status status-${lesson.status}${lesson.visibility === 'private' ? ' is-private' : ''}`}>{statusLabel(lesson, vi)}</span>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.uploaderName || (vi ? 'Giáo viên' : 'Teacher')} · {formatSize(lesson.size)} · {formatDate(lesson.updatedAt || lesson.createdAt)}</small>
                    </span>
                  </button>
                  <div className="thpt-row-actions">
                    {canRename ? <button type="button" disabled={Boolean(busy)} onClick={(event) => { event.stopPropagation(); renameLesson(lesson); }}>{vi ? 'Đổi tên' : 'Rename'}</button> : null}
                    {pendingTeacherSubmission ? <button type="button" className="approve" disabled={Boolean(busy)} onClick={(event) => { event.stopPropagation(); changeStatus(lesson, 'approved', 'department'); }}>{vi ? 'Duyệt & chia sẻ' : 'Approve & share'}</button> : null}
                    {pendingTeacherSubmission ? <button type="button" className="revision" disabled={Boolean(busy)} onClick={(event) => { event.stopPropagation(); changeStatus(lesson, 'revision', 'department'); }}>{vi ? 'Yêu cầu sửa' : 'Request revision'}</button> : null}
                    {leaderPrivate ? <button type="button" className="approve" disabled={Boolean(busy)} onClick={(event) => { event.stopPropagation(); changeStatus(lesson, 'approved', 'department'); }}>{vi ? 'Chia sẻ' : 'Share'}</button> : null}
                    {manager && lesson.status === 'approved' ? <button type="button" className="private" disabled={Boolean(busy)} onClick={(event) => { event.stopPropagation(); changeStatus(lesson, 'pending', 'private'); }}>{vi ? 'Ẩn khỏi giáo viên' : 'Make private'}</button> : null}
                    {manager ? <button type="button" className="danger" disabled={Boolean(busy)} onClick={(event) => { event.stopPropagation(); deleteLesson(lesson); }}>{vi ? 'Xoá' : 'Delete'}</button> : null}
                  </div>
                </article>
              );
            }) : <div className="thpt-empty"><b>{vi ? 'Chưa có bài phù hợp' : 'No matching lessons'}</b><span>{vi ? 'Tải bài mới hoặc chọn một mục khác.' : 'Upload a lesson or choose another tab.'}</span></div>}
          </div>
        </section>
      </section>

      <section className="thpt-player-card">
        <div className="thpt-player-head">
          <div><span>03 · SANDBOXED LIVE PLAYER</span><h2>{activeLesson?.title || (vi ? 'Trình chạy bài học' : 'Lesson player')}</h2></div>
          {activeLesson ? <button type="button" className="thpt-secondary" onClick={() => openInNewTab(activeLesson)} disabled={playerBusy}>{vi ? 'Mở cửa sổ riêng ↗' : 'Open in a new window ↗'}</button> : null}
        </div>
        <div className="thpt-player-shell">
          {playerBusy ? <div className="thpt-player-empty">{vi ? 'Đang tải bài từ kho học liệu…' : 'Loading the lesson from the resource library…'}</div> : activeLesson && activeHtml ? <iframe key={`${activeLesson.cloudId || activeLesson.id}:${activeLesson.updatedAt}`} title={activeLesson.title} srcDoc={activeHtml} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" referrerPolicy="no-referrer" /> : <div className="thpt-player-empty">{vi ? 'Chọn một bài HTML để chạy trực tiếp.' : 'Choose an HTML lesson to run it directly.'}</div>}
        </div>
      </section>
    </div>
  );
}
