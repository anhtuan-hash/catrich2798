import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { callAI, extractJson } from '../utils/gemini.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { canPublishDepartment } from '../utils/permissions.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import {
  fetchResourceCategoryOverview,
  getAccessToken,
  loadResourceLibrary,
  RESOURCE_EVENT,
  resourceId,
  sha256,
  syncResourcesFromCloud,
  updateResourceLibrary,
  upsertResourceCloud,
} from '../utils/resourceLibrary.js';
import {
  RESOURCE_CATEGORY_FALLBACK,
  ResourceCategoryCards,
  ResourceUploadCategoryPicker,
  categoryName,
  decorateCategory,
  findResourceCategory,
  normaliseResourceCategory,
} from '../features/resource-library/index.js';
import '../features/resource-library/resourceLibraryCategories.css';

const SKILLS = ['Vocabulary', 'Grammar', 'Reading', 'Listening', 'Speaking', 'Writing', 'Pronunciation'];
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.html,.zip,.mp3,.wav,.m4a,.mp4,.mov,.png,.jpg,.jpeg';
const DEFAULT_FORM = {
  title: '', description: '', category: 'other', grade: '', schoolYear: '', unitName: '', cefr: '',
  skills: [], tags: '', source: '', copyright: 'internal', visibility: 'department', allowDownload: true,
};

function formatSize(bytes = 0) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value || '';
  }
}

function isLeader(user) {
  return canPublishDepartment(user) || ['admin', 'ttcm', 'department_leader', 'to_truong', 'leader', 'head', 'manager'].includes(String(user?.role || '').toLowerCase());
}

function extensionOf(item) {
  return String(item?.fileName || '').split('.').pop()?.toLowerCase() || '';
}

function canInlinePreview(item) {
  const mime = String(item?.mimeType || '').toLowerCase();
  const extension = extensionOf(item);
  return mime.includes('pdf') || mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/')
    || mime.startsWith('text/') || ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp3', 'wav', 'm4a', 'mp4', 'mov', 'txt', 'md', 'csv', 'html'].includes(extension);
}

function matchesGrade(value, filter) {
  if (filter === 'all') return true;
  return String(value || '').split(/[,;/\s]+/).filter(Boolean).includes(filter);
}

async function extractFileText(file) {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.pdf')) return readPdfTextFromBuffer(buffer, { maxPages: 25, maxChars: 50000 });
  if (name.endsWith('.docx')) return readDocxTextFromBuffer(buffer);
  if (/\.(txt|md|csv|html)$/i.test(name)) return new TextDecoder().decode(buffer).slice(0, 50000);
  return '';
}

function ResourceCard({ item, categoryLabel, manager, currentUser, onPreview, onApprove, onReject, onFavorite, onOpenApp, onDownload }) {
  const mine = item.uploaderId === currentUser?.id || item.uploaderName === currentUser?.email;
  return (
    <article className="resource-library-card">
      <div className="resource-file-icon">{item.mimeType?.includes('pdf') ? 'PDF' : item.fileName?.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE'}</div>
      <div className="resource-card-main">
        <div className="resource-card-top">
          <span className={`resource-status status-${item.status}`}>{item.status === 'approved' ? 'Đã duyệt' : item.status === 'rejected' ? 'Từ chối' : item.status === 'revision' ? 'Cần sửa' : 'Chờ duyệt'}</span>
          <span>{formatSize(item.size)}</span>
        </div>
        <h3>{item.title || item.fileName}</h3>
        <p>{item.aiSummary || item.description || 'Chưa có mô tả.'}</p>
        <div className="resource-meta-row">
          <span>{categoryLabel}</span>
          {item.grade && <span>Khối {item.grade}</span>}
          {item.schoolYear && <span>{item.schoolYear}</span>}
          {item.unitName && <span>{item.unitName}</span>}
          {item.cefr && <span>{item.cefr}</span>}
          <span>{item.uploaderName || 'Giáo viên'}</span>
        </div>
        <div className="resource-tags">{(item.tags || []).slice(0, 5).map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <div className="resource-card-actions">
          <button onClick={() => onPreview(item)}>Xem trong app</button>
          {item.allowDownload && item.driveFileId && <button onClick={() => onDownload(item)}>Tải xuống</button>}
          {manager && item.driveWebViewLink && <a href={item.driveWebViewLink} target="_blank" rel="noreferrer">Mở Drive ↗</a>}
          <button onClick={() => onFavorite(item)}>☆ Yêu thích</button>
          <button onClick={() => onOpenApp(item)}>Mở bằng app</button>
          {manager && item.status === 'pending' && <><button className="approve" onClick={() => onApprove(item)}>Duyệt</button><button className="reject" onClick={() => onReject(item)}>Yêu cầu sửa</button></>}
          {(manager || mine) && item.status === 'revision' && <span className="resource-inline-note">Có thể chỉnh metadata và gửi lại</span>}
        </div>
      </div>
    </article>
  );
}

export default function ResourceLibrary({ language = 'vi', currentUser, hasApiKey }) {
  const manager = isLeader(currentUser);
  const [store, setStore] = useState(loadResourceLibrary);
  const [overviewRows, setOverviewRows] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [tab, setTab] = useState('explore');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [sortMode, setSortMode] = useState('newest');
  const [showUpload, setShowUpload] = useState(false);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [driveMessage, setDriveMessage] = useState('');
  const inputRef = useRef(null);
  const previewObjectUrlRef = useRef('');
  const folderViewRef = useRef(null);

  const refreshLibrary = useCallback(async () => {
    const [syncResult, overviewResult] = await Promise.all([
      syncResourcesFromCloud().catch((error) => ({ ok: false, reason: error.message })),
      fetchResourceCategoryOverview().catch((error) => ({ ok: false, rows: [], reason: error.message })),
    ]);
    setStore(loadResourceLibrary());
    if (overviewResult.ok) setOverviewRows(overviewResult.rows);
    else if (isSupabaseConfigured && overviewResult.reason) setDriveMessage((current) => current || `Danh mục đang dùng dữ liệu dự phòng: ${overviewResult.reason}`);
    setCategoriesLoading(false);
    return syncResult;
  }, []);

  useEffect(() => {
    const refreshLocal = () => setStore(loadResourceLibrary());
    window.addEventListener(RESOURCE_EVENT, refreshLocal);
    refreshLibrary();

    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    if (params.get('drive') === 'connected') setDriveMessage('Google Drive đã kết nối thành công. Các thư mục phân loại đã được đồng bộ.');
    if (params.get('drive') === 'error') setDriveMessage(`Google Drive chưa kết nối: ${params.get('message') || 'Lỗi không xác định'}`);

    let channel = null;
    if (supabase) {
      channel = supabase
        .channel('resource-library-v10-81-3')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_items' }, () => { refreshLibrary(); })
        .subscribe();
    }

    return () => {
      window.removeEventListener(RESOURCE_EVENT, refreshLocal);
      if (channel && supabase) supabase.removeChannel(channel);
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    };
  }, [refreshLibrary]);

  const categoryCards = useMemo(() => {
    const overviewMap = new Map((overviewRows || []).map((row) => [normaliseResourceCategory(row.slug), row]));
    return RESOURCE_CATEGORY_FALLBACK.map((fallback) => {
      const slug = fallback.slug;
      const remote = overviewMap.get(slug) || {};
      const localItems = store.items.filter((item) => normaliseResourceCategory(item.category) === slug);
      const latestLocal = [...localItems].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
      const newLocal = localItems.filter((item) => Date.now() - new Date(item.createdAt || 0).getTime() <= 7 * 86400000).length;
      return decorateCategory({
        ...fallback,
        ...remote,
        slug,
        item_count: localItems.length,
        new_count: newLocal,
        latest_at: latestLocal?.updatedAt || latestLocal?.createdAt || remote.latest_at || null,
        latest_title: latestLocal?.title || remote.latest_title || '',
      });
    }).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [overviewRows, store.items]);

  const categoryMap = useMemo(() => new Map(categoryCards.map((item) => [item.slug, item])), [categoryCards]);
  const schoolYears = useMemo(() => Array.from(new Set(store.items.map((item) => item.schoolYear).filter(Boolean))).sort().reverse(), [store.items]);

  const visibleItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    const items = store.items.filter((item) => {
      const access = item.status === 'approved' || manager || item.uploaderId === currentUser?.id || item.uploaderName === currentUser?.email;
      const tabOk = tab === 'mine'
        ? (item.uploaderId === currentUser?.id || item.uploaderName === currentUser?.email)
        : tab === 'pending' ? item.status !== 'approved' : true;
      const categoryOk = category === 'all' || normaliseResourceCategory(item.category) === category;
      const gradeOk = matchesGrade(item.grade, gradeFilter);
      const yearOk = schoolYearFilter === 'all' || item.schoolYear === schoolYearFilter;
      const text = `${item.title} ${item.description} ${item.aiSummary} ${item.fileName} ${item.unitName} ${(item.tags || []).join(' ')} ${item.extractedText || ''}`.toLowerCase();
      return access && tabOk && categoryOk && gradeOk && yearOk && (!search || text.includes(search));
    });

    return [...items].sort((a, b) => {
      if (sortMode === 'popular') return Number(b.downloads || 0) - Number(a.downloads || 0) || Number(b.views || 0) - Number(a.views || 0);
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return sortMode === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }, [store.items, query, category, gradeFilter, schoolYearFilter, sortMode, tab, manager, currentUser]);

  const stats = useMemo(() => ({
    total: store.items.filter((item) => item.status === 'approved').length,
    pending: store.items.filter((item) => item.status === 'pending').length,
    contributors: new Set(store.items.map((item) => item.uploaderName).filter(Boolean)).size,
    size: store.items.reduce((sum, item) => sum + Number(item.size || 0), 0),
  }), [store.items]);

  const connectDrive = async () => {
    setDriveMessage('Đang tạo liên kết Google Drive…');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/google-drive-connect', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể kết nối');
      window.location.href = data.url;
    } catch (error) {
      setDriveMessage(`${error.message}. Hãy kiểm tra Google OAuth và biến môi trường trên Vercel.`);
    }
  };

  const openUpload = (preferredCategory = category) => {
    const selected = preferredCategory === 'all' ? 'other' : normaliseResourceCategory(preferredCategory);
    setForm({ ...DEFAULT_FORM, category: selected });
    setFiles([]);
    setShowUpload(true);
  };

  const openCategoryFolder = useCallback((nextCategory) => {
    const selected = nextCategory === 'all' ? 'all' : normaliseResourceCategory(nextCategory);
    // Opening a folder must reveal every accessible upload in that folder.
    // Reset the secondary filters so a previous search does not make the folder look empty.
    setCategory(selected);
    setTab('explore');
    setQuery('');
    setGradeFilter('all');
    setSchoolYearFilter('all');
    setSortMode('newest');
    window.setTimeout(() => {
      folderViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      folderViewRef.current?.focus({ preventScroll: true });
    }, 80);
  }, []);

  const analyzeFiles = async () => {
    if (!files.length) return;
    setBusy('AI đang đọc và phân loại tài liệu…');
    setProgress(12);
    try {
      const text = await extractFileText(files[0]);
      setProgress(40);
      const raw = await callAI({
        prompt: `Phân loại tài nguyên dạy học tiếng Anh. Trả JSON gồm title, description, category (lesson-plan|presentation|worksheet|assessment|answer-key|thpt-exam|gifted|audio|media|professional-form|reference|other), grade, schoolYear, unitName, cefr, skills[], tags[], source, aiUses[]. Không bịa nguồn.\nTên file: ${files[0].name}\nNội dung:\n${text.slice(0, 18000)}`,
        responseMimeType: 'application/json', temperature: 0.15, maxOutputTokens: 700, loadingLabel: 'AI đang phân loại học liệu…',
      });
      const data = extractJson(raw) || {};
      setForm((old) => ({
        ...old,
        title: data.title || files[0].name.replace(/\.[^.]+$/, ''),
        description: data.description || '',
        category: normaliseResourceCategory(data.category || old.category),
        grade: data.grade || '',
        schoolYear: data.schoolYear || data.school_year || '',
        unitName: data.unitName || data.unit_name || '',
        cefr: data.cefr || '',
        skills: Array.isArray(data.skills) ? data.skills : [],
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        source: data.source || '',
        aiUses: data.aiUses || [],
        extractedText: text,
      }));
      setProgress(100);
    } catch (error) {
      setDriveMessage(`AI chưa phân loại được: ${error.message}`);
    } finally {
      setBusy('');
      setTimeout(() => setProgress(0), 800);
    }
  };

  const uploadOne = async (file, metadata) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Cần đăng nhập Supabase để tải lên Drive');
    const response = await fetch('/api/google-drive-upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'X-Resource-Metadata': btoa(unescape(encodeURIComponent(JSON.stringify(metadata)))),
      },
      body: file,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Drive upload failed');
    return data;
  };

  const saveUpload = async () => {
    if (!files.length || !form.title.trim()) return;
    setBusy('Đang lưu tài liệu vào thư mục chờ duyệt…');
    setProgress(5);
    const created = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const checksum = await sha256(file);
        const duplicate = store.items.find((item) => item.checksum === checksum);
        const base = {
          id: resourceId(),
          title: files.length === 1 ? form.title : `${form.title} – ${file.name}`,
          description: form.description,
          category: normaliseResourceCategory(form.category),
          grade: form.grade,
          schoolYear: form.schoolYear,
          unitName: form.unitName,
          cefr: form.cefr,
          skills: form.skills,
          tags: form.tags.split(',').map((value) => value.trim()).filter(Boolean),
          source: form.source,
          copyright: form.copyright,
          visibility: form.visibility,
          allowDownload: form.allowDownload,
          status: 'pending',
          uploaderId: currentUser?.id,
          uploaderName: currentUser?.name || currentUser?.email || 'Giáo viên',
          mimeType: file.type,
          fileName: file.name,
          size: file.size,
          checksum,
          aiSummary: form.description,
          aiUses: form.aiUses || [],
          extractedText: form.extractedText || '',
          version: duplicate ? Number(duplicate.version || 1) + 1 : 1,
          parentResourceId: duplicate?.id || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          storageMode: 'local',
        };

        let uploaded = {};
        try {
          uploaded = await uploadOne(file, base);
          base.storageMode = 'cloud';
        } catch (error) {
          base.uploadWarning = error.message;
        }

        Object.assign(base, {
          driveFileId: uploaded.fileId || '',
          driveWebViewLink: uploaded.webViewLink || '',
          driveDownloadLink: uploaded.downloadLink || '',
        });

        const cloud = await upsertResourceCloud(base);
        if (cloud.ok) Object.assign(base, cloud.item);
        else if (cloud.reason && cloud.reason !== 'local') base.uploadWarning = [base.uploadWarning, cloud.reason].filter(Boolean).join(' · ');
        created.push(base);
        setProgress(Math.round(((index + 1) / files.length) * 100));
      }

      updateResourceLibrary((draft) => {
        draft.items.unshift(...created);
        draft.activity.unshift({ id: resourceId('log'), type: 'upload', actor: currentUser?.email, at: new Date().toISOString(), count: created.length });
      });
      setShowUpload(false);
      setFiles([]);
      setForm(DEFAULT_FORM);
      setDriveMessage(`${created.length} tài liệu đã được lưu${created.some((item) => item.uploadWarning) ? '; một số bước cần kiểm tra lại' : ' vào Drive và gửi admin duyệt'}.`);
      await refreshLibrary();
    } catch (error) {
      setDriveMessage(`Không thể hoàn tất tải tài liệu: ${error.message}`);
    } finally {
      setBusy('');
      setTimeout(() => setProgress(0), 700);
    }
  };

  const changeStatus = async (item, status) => {
    const updated = {
      ...item,
      status,
      approvedAt: status === 'approved' ? new Date().toISOString() : null,
      approvedBy: currentUser?.email,
      updatedAt: new Date().toISOString(),
    };
    updateResourceLibrary((draft) => {
      const index = draft.items.findIndex((entry) => entry.id === item.id);
      if (index >= 0) draft.items[index] = updated;
      draft.activity.unshift({ id: resourceId('log'), type: status, resourceId: item.id, actor: currentUser?.email, at: new Date().toISOString() });
    });

    const cloudResult = await upsertResourceCloud(updated);
    if (!cloudResult.ok) setDriveMessage(`Đã cập nhật cục bộ nhưng Supabase báo lỗi: ${cloudResult.reason}`);

    if (item.driveFileId) {
      try {
        const token = await getAccessToken();
        const response = await fetch('/api/google-drive-move', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: item.driveFileId, category: normaliseResourceCategory(item.category), status }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể chuyển thư mục Drive');
      } catch (error) {
        setDriveMessage(`Trạng thái đã lưu nhưng chưa chuyển được file Drive: ${error.message}`);
      }
    }
    await refreshLibrary();
  };

  const toggleFavorite = (item) => updateResourceLibrary((draft) => {
    const key = `${currentUser?.id || currentUser?.email}:${item.id}`;
    const index = draft.favorites.indexOf(key);
    if (index >= 0) draft.favorites.splice(index, 1);
    else draft.favorites.push(key);
  });

  const fetchResourceBlob = async (item, mode = 'inline') => {
    if (!item.driveFileId) throw new Error('Tài liệu chưa có file trên Google Drive');
    const token = await getAccessToken();
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn');
    const params = new URLSearchParams({ resourceId: item.cloudId || item.id, fileId: item.driveFileId, mode });
    const response = await fetch(`/api/google-drive-file?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      let message = 'Không thể đọc file trong ứng dụng';
      try { message = (await response.json()).error || message; } catch { /* non-JSON response */ }
      throw new Error(message);
    }
    return response.blob();
  };

  const closePreview = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }
    setPreview(null);
    setPreviewUrl('');
    setPreviewError('');
    setPreviewLoading(false);
  };

  const openPreview = async (item) => {
    closePreview();
    setPreview(item);
    if (!item.driveFileId || !canInlinePreview(item)) return;
    setPreviewLoading(true);
    try {
      const blob = await fetchResourceBlob(item, 'inline');
      const objectUrl = URL.createObjectURL(blob);
      previewObjectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } catch (error) {
      setPreviewError(error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadResource = async (item) => {
    setBusy(`Đang chuẩn bị tải ${item.fileName || item.title}…`);
    try {
      const blob = await fetchResourceBlob(item, 'download');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.fileName || item.title || 'resource';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDriveMessage(`Không thể tải tài liệu: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const askLibrary = async () => {
    if (!aiQuery.trim()) return;
    setBusy('AI đang tìm trong kho học liệu…');
    try {
      const context = visibleItems.slice(0, 25).map((item, index) => `[${index + 1}] ${item.title}\n${item.aiSummary || item.description}\nTags: ${(item.tags || []).join(', ')}\n${String(item.extractedText || '').slice(0, 1200)}`).join('\n\n');
      const answer = await callAI({
        prompt: `Bạn là thủ thư chuyên môn tiếng Anh. Chỉ trả lời dựa trên danh mục dưới đây; nêu rõ tên tài liệu phù hợp. Nếu thiếu dữ liệu thì nói rõ.\nCâu hỏi: ${aiQuery}\n\nKHO:\n${context}`,
        temperature: 0.2, maxOutputTokens: 700, loadingLabel: 'AI đang tìm kiếm kho học liệu…',
      });
      setAiAnswer(answer);
    } catch (error) {
      setAiAnswer(error.message);
    } finally {
      setBusy('');
    }
  };

  const openWithApp = (item) => {
    const map = {
      assessment: 'exam-studio', worksheet: 'textlab-activities', reference: 'reading-studio',
      'lesson-plan': 'lesson-plan-ai', presentation: 'lesson-plan-ai', 'professional-form': 'lesson-plan-ai',
      audio: 'speaking-studio', media: 'textlab-activities', gifted: 'reading-studio', 'thpt-exam': 'exam-studio',
    };
    const slug = map[normaliseResourceCategory(item.category)] || 'textlab-activities';
    try { sessionStorage.setItem('bes-resource-open-item', JSON.stringify(item)); } catch { /* ignore */ }
    window.location.hash = `#/tool/${slug}`;
  };

  const selectedCategory = category === 'all' ? null : categoryMap.get(category);
  const previewCategory = preview ? categoryMap.get(normaliseResourceCategory(preview.category)) || decorateCategory(findResourceCategory(preview.category)) : null;
  const previewMime = String(preview?.mimeType || '').toLowerCase();

  return (
    <div className="resource-library-page">
      {busy && <div className="resource-busy-overlay"><div className="resource-spinner"/><strong>{busy}</strong>{progress > 0 && <div className="resource-progress"><i style={{ width: `${progress}%` }}/><span>{progress}%</span></div>}</div>}

      <section className="resource-library-hero">
        <div>
          <span className="resource-eyebrow">BRIAN RESOURCE LIBRARY · V10.81.5</span>
          <h1>Kho học liệu Tổ Tiếng Anh</h1>
          <p>Giáo viên tải tài liệu lên Google Drive của admin, phân loại bằng thẻ và truy cập file trực tiếp trong ứng dụng mà không cần mở Drive.</p>
          <div className="resource-hero-actions">
            <button className="primary" onClick={() => openUpload()}>＋ Tải tài liệu</button>
            {manager && <button onClick={connectDrive}>⌁ Kết nối / đồng bộ Drive</button>}
            <button onClick={refreshLibrary}>↻ Đồng bộ</button>
          </div>
          {driveMessage && <div className="resource-drive-message">{driveMessage}</div>}
        </div>
        <div className="resource-drive-art"><div className="drive-folder back"/><div className="drive-folder front"><b>ENGLISH<br/>RESOURCES</b><span>Google Drive</span></div><div className="resource-floating-file f1">PDF</div><div className="resource-floating-file f2">DOCX</div><div className="resource-floating-file f3">PPTX</div></div>
      </section>

      <section className="resource-stat-grid"><div><b>{stats.total}</b><span>Tài liệu đã duyệt</span></div><div><b>{stats.pending}</b><span>Chờ admin duyệt</span></div><div><b>{stats.contributors}</b><span>Giáo viên đóng góp</span></div><div><b>{formatSize(stats.size)}</b><span>Dung lượng quản lý</span></div></section>

      <section className="resource-category-section">
        <div className="resource-category-heading">
          <div><span className="resource-eyebrow">DANH MỤC CÓ SẴN</span><h2>Chọn thẻ để mở tài liệu ngay trong app</h2></div>
          <p>Thẻ vẫn luôn hiển thị kể cả khi chưa có tài liệu. Số lượng và nội dung mới được cập nhật bằng Supabase Realtime.</p>
        </div>
        <button type="button" className={`resource-category-all${category === 'all' ? ' is-active' : ''}`} onClick={() => openCategoryFolder('all')}>
          <span>⌂</span><strong>Tất cả tài liệu</strong><small>{categoryCards.reduce((sum, item) => sum + Number(item.item_count || 0), 0)} tài liệu</small>
        </button>
        <ResourceCategoryCards categories={categoryCards} activeCategory={category} onSelect={openCategoryFolder} language={language} loading={categoriesLoading} />
        {selectedCategory && <div className="resource-drive-message resource-folder-open-message">Đã mở thư mục: <strong>{categoryName(selectedCategory, language)}</strong> · <span>{visibleItems.length} file hiển thị</span> · <button type="button" onClick={() => openUpload(selectedCategory.slug)}>Tải file vào thư mục này</button></div>}
      </section>

      <section className="resource-filter-bar">
        <div className="resource-tabs">
          <button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>Khám phá</button>
          <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>Tài liệu của tôi</button>
          {manager && <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>Chờ duyệt ({stats.pending})</button>}
        </div>
        <label className="resource-search-field"><span>Tìm kiếm</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, chủ đề, Unit, kỹ năng hoặc nội dung…"/></label>
        <label><span>Khối lớp</span><select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option value="all">Tất cả</option><option value="10">Khối 10</option><option value="11">Khối 11</option><option value="12">Khối 12</option></select></label>
        <label><span>Năm học</span><select value={schoolYearFilter} onChange={(event) => setSchoolYearFilter(event.target.value)}><option value="all">Tất cả</option>{schoolYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        <label><span>Sắp xếp</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value)}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="popular">Dùng nhiều</option></select></label>
      </section>

      <section
        ref={folderViewRef}
        className="resource-folder-view"
        id="resource-library-results"
        tabIndex={-1}
        aria-live="polite"
      >
        <header className="resource-folder-view__header">
          <div className="resource-folder-view__identity">
            <span className={`resource-folder-view__icon tone-${selectedCategory?.tone || 'blue'}`} aria-hidden="true">
              {selectedCategory?.displayIcon || '⌂'}
            </span>
            <div>
              <span className="resource-eyebrow">THƯ MỤC ĐANG MỞ</span>
              <h2>{selectedCategory ? categoryName(selectedCategory, language) : 'Tất cả tài liệu'}</h2>
              <p>
                {manager
                  ? 'Hiển thị toàn bộ file do giáo viên và admin tải lên, gồm cả file đang chờ duyệt.'
                  : 'Hiển thị tài liệu đã duyệt của toàn tổ và các file do chính bạn tải lên.'}
              </p>
            </div>
          </div>
          <div className="resource-folder-view__summary">
            <strong>{visibleItems.length}</strong>
            <span>file trong thư mục</span>
            <button type="button" onClick={() => openUpload(category)}>＋ Tải file vào đây</button>
          </div>
        </header>
        <div className="resource-folder-statuses">
          <span><i className="is-approved" />{visibleItems.filter((item) => item.status === 'approved').length} đã duyệt</span>
          {manager && <span><i className="is-pending" />{visibleItems.filter((item) => item.status === 'pending').length} chờ duyệt</span>}
          {manager && <span><i className="is-revision" />{visibleItems.filter((item) => item.status === 'revision').length} cần sửa</span>}
        </div>
        <div className="resource-library-list">
          {visibleItems.length ? visibleItems.map((item) => (
            <ResourceCard
              key={item.id}
              item={item}
              categoryLabel={categoryName(categoryMap.get(normaliseResourceCategory(item.category)) || decorateCategory(findResourceCategory(item.category)), language)}
              manager={manager}
              currentUser={currentUser}
              onPreview={openPreview}
              onApprove={(entry) => changeStatus(entry, 'approved')}
              onReject={(entry) => changeStatus(entry, 'revision')}
              onFavorite={toggleFavorite}
              onOpenApp={openWithApp}
              onDownload={downloadResource}
            />
          )) : <div className="resource-empty"><b>Thư mục chưa có tài liệu</b><p>Nhấn “Tải file vào đây” để thêm tài liệu đầu tiên vào đúng thư mục.</p></div>}
        </div>
      </section>

      <section className="resource-ai-search">
        <div><span>✦ AI KNOWLEDGE SEARCH</span><h2>Hỏi kho học liệu</h2><p>Tìm tài liệu bằng ngôn ngữ tự nhiên, hỏi nội dung hoặc xin gợi ý cách sử dụng.</p></div>
        <div className="resource-ai-input"><textarea value={aiQuery} onChange={(event) => setAiQuery(event.target.value)} placeholder="Ví dụ: Tìm worksheet Reading B2 cho lớp 12 về multiculturalism…"/><button disabled={!hasApiKey} onClick={askLibrary}>AI tìm kiếm</button></div>
        {aiAnswer && <div className="resource-ai-answer">{aiAnswer}</div>}
      </section>

      {showUpload && <div className="resource-modal-backdrop"><section className="resource-upload-modal">
        <header><div><span>UPLOAD TO ADMIN DRIVE</span><h2>Tải tài liệu vào kho dùng chung</h2></div><button onClick={() => setShowUpload(false)}>×</button></header>
        <div className="resource-upload-grid">
          <div className="resource-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setFiles([...event.dataTransfer.files]); }}>
            <input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={(event) => setFiles([...event.target.files])}/>
            <b>⇧ Kéo thả tài liệu vào đây</b><span>PDF, Word, PowerPoint, Excel, audio, video, ảnh, HTML, ZIP</span>
            {files.map((file) => <em key={`${file.name}-${file.size}`}>{file.name} · {formatSize(file.size)}</em>)}
          </div>
          <div className="resource-form">
            <label>Tên tài liệu<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}/></label>
            <label>Mô tả<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label>
            <ResourceUploadCategoryPicker categories={categoryCards} value={form.category} onChange={(value) => setForm({ ...form, category: value })} language={language}/>
            <div className="resource-form-row">
              <label>Khối<input value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} placeholder="10, 11, 12…"/></label>
              <label>Năm học<input value={form.schoolYear} onChange={(event) => setForm({ ...form, schoolYear: event.target.value })} placeholder="2026–2027"/></label>
              <label>Unit / Chủ đề<input value={form.unitName} onChange={(event) => setForm({ ...form, unitName: event.target.value })} placeholder="Unit 2 · Multicultural World"/></label>
            </div>
            <div className="resource-form-row">
              <label>CEFR<input value={form.cefr} onChange={(event) => setForm({ ...form, cefr: event.target.value })} placeholder="B1–C1"/></label>
              <label>Nguồn / tác giả<input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}/></label>
              <label>Từ khóa<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="reading, environment, THPT…"/></label>
            </div>
            <label>Kỹ năng<div className="resource-skill-options">{SKILLS.map((skill) => <button type="button" className={form.skills.includes(skill) ? 'active' : ''} onClick={() => setForm({ ...form, skills: form.skills.includes(skill) ? form.skills.filter((value) => value !== skill) : [...form.skills, skill] })} key={skill}>{skill}</button>)}</div></label>
            <div className="resource-form-row">
              <label>Bản quyền<select value={form.copyright} onChange={(event) => setForm({ ...form, copyright: event.target.value })}><option value="self">Tự soạn</option><option value="school">Nhà trường cấp</option><option value="free">Miễn phí / được phép</option><option value="internal">Chỉ dùng nội bộ</option><option value="unknown">Chưa xác định</option></select></label>
              <label>Phạm vi<select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })}><option value="department">Toàn tổ</option><option value="leader">Chỉ admin</option><option value="internal">Nội bộ</option></select></label>
            </div>
          </div>
        </div>
        <footer><button onClick={analyzeFiles} disabled={!files.length || !hasApiKey}>✦ AI nhận diện</button><button className="primary" onClick={saveUpload} disabled={!files.length || !form.title.trim()}>Lưu Drive &amp; gửi admin duyệt</button></footer>
      </section></div>}

      {preview && <div className="resource-modal-backdrop"><section className="resource-preview-modal">
        <header><div><span>IN-APP RESOURCE PREVIEW</span><h2>{preview.title}</h2></div><button onClick={closePreview}>×</button></header>
        <div className="resource-preview-body">
          <aside><div className="resource-file-icon big">{preview.fileName?.split('.').pop()?.toUpperCase()}</div><p>{preview.fileName}</p><small>{formatSize(preview.size)} · {formatDate(preview.createdAt)}</small><dl><dt>Người đóng góp</dt><dd>{preview.uploaderName}</dd><dt>Danh mục</dt><dd>{categoryName(previewCategory, language)}</dd><dt>Khối / CEFR</dt><dd>{preview.grade || '—'} / {preview.cefr || '—'}</dd><dt>Năm học</dt><dd>{preview.schoolYear || '—'}</dd><dt>Unit / Chủ đề</dt><dd>{preview.unitName || '—'}</dd><dt>Nguồn</dt><dd>{preview.source || 'Chưa khai báo'}</dd></dl>{preview.allowDownload && preview.driveFileId && <button className="resource-download-button" onClick={() => downloadResource(preview)}>Tải xuống</button>}</aside>
          <main className="resource-secure-preview">
            {previewLoading && <div className="resource-preview-loading"><strong>Đang tải file an toàn từ Drive của admin…</strong></div>}
            {previewError && <div className="resource-preview-error">{previewError}</div>}
            {previewUrl && previewMime.startsWith('image/') && <img className="resource-secure-preview__image" src={previewUrl} alt={preview.title}/>} 
            {previewUrl && previewMime.startsWith('audio/') && <audio controls src={previewUrl}/>} 
            {previewUrl && previewMime.startsWith('video/') && <video controls src={previewUrl}/>} 
            {previewUrl && !previewMime.startsWith('image/') && !previewMime.startsWith('audio/') && !previewMime.startsWith('video/') && <iframe className="resource-secure-preview__frame" src={previewUrl} title={preview.title} sandbox="allow-same-origin"/>} 
            {!previewLoading && !previewUrl && !canInlinePreview(preview) && <div className="resource-preview-loading"><div><strong>Định dạng này chưa xem trực tiếp được trong trình duyệt.</strong><p>Thông tin và nội dung đã lập chỉ mục vẫn hiển thị bên dưới; giáo viên có thể tải file về.</p></div></div>}
            <h3>Tóm tắt</h3><p>{preview.aiSummary || preview.description || 'Chưa có mô tả.'}</p>
            {!!(preview.aiUses || []).length && <><h3>Gợi ý sử dụng</h3><ul>{preview.aiUses.map((value) => <li key={value}>{value}</li>)}</ul></>}
            {preview.extractedText && <><h3>Nội dung được lập chỉ mục</h3><pre>{preview.extractedText.slice(0, 8000)}</pre></>}
          </main>
        </div>
      </section></div>}
    </div>
  );
}
