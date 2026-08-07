import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { isLeader, readLocal, scopedLocalKey, writeLocal } from '../pages/v1093/shared.js';
import { removeWorkHubSubmissionFiles, WORK_HUB_DELIVERY_EVENT } from '../utils/workHubDelivery.js';
import './GlobalWorkBulkDeleteManager.css';

const ITEM_COLUMNS = 'id,title,description,item_type,status,priority,due_at,attachments,metadata,created_at,updated_at';
const SCHEDULE_CACHE_KEY = 'bes-system-work-schedule-cache-v1';
const SCHEDULE_SYNC_KEY = 'bes-system-work-schedule-sync-v1';
const SCHEDULE_UPDATE_EVENT = 'bes-work-schedule-updated';
const STATUS_LABEL = {
  draft: 'Nháp',
  assigned: 'Đã giao',
  accepted: 'Đã tiếp nhận',
  in_progress: 'Đang thực hiện',
  submitted: 'Đã nộp',
  changes_requested: 'Cần chỉnh sửa',
  approved: 'Đã phê duyệt',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

function isScheduleItem(item) {
  return item?.metadata?.schedule_event === true;
}

function uniqueIds(values = []) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function chunks(values, size = 80) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function formatDateTime(value) {
  if (!value) return 'Chưa đặt thời gian';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa đặt thời gian';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function currentKindFromHash() {
  if (typeof window === 'undefined') return 'work';
  const query = window.location.hash.split('?')[1] || '';
  return new URLSearchParams(query).get('view') === 'schedule' ? 'schedule' : 'work';
}

function updateLocalCaches(user, deletedIds) {
  const deleted = new Set(deletedIds.map(String));
  const workKey = scopedLocalKey('bes-work-hub-v1093-local', user);
  const workSyncKey = scopedLocalKey('bes-work-hub-v1093-sync', user);
  writeLocal(workKey, readLocal(workKey, []).filter((item) => !deleted.has(String(item?.id || ''))));
  writeLocal(workSyncKey, Date.now());

  try {
    const schedule = JSON.parse(window.localStorage.getItem(SCHEDULE_CACHE_KEY) || '[]');
    const next = Array.isArray(schedule)
      ? schedule.filter((item) => !deleted.has(String(item?.id || '')))
      : [];
    window.localStorage.setItem(SCHEDULE_CACHE_KEY, JSON.stringify(next));
    window.localStorage.setItem(SCHEDULE_SYNC_KEY, String(Date.now()));
  } catch {
    // Cache cleanup is best effort; cloud data remains the source of truth.
  }
}

export default function GlobalWorkBulkDeleteManager({ currentUser, route = '' }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const leader = isLeader(currentUser);
  const launchButtonRef = useRef(null);
  const modalRef = useRef(null);
  const confirmInputRef = useRef(null);
  const [tabsNode, setTabsNode] = useState(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('work');
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmRequest, setConfirmRequest] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!leader || route !== 'work-hub') {
      setTabsNode(null);
      return undefined;
    }
    const findTabs = () => setTabsNode(document.querySelector('.work-schedule-tabs'));
    findTabs();
    const observer = new MutationObserver(findTabs);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [leader, route]);

  const loadItems = useCallback(async () => {
    if (!client || !runtime.ready || !runtime.session) {
      setError('Cần kết nối Supabase để quản lý và xoá dữ liệu dùng chung.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data, error: loadError } = await client
        .from('work_hub_items')
        .select(ITEM_COLUMNS)
        .order('updated_at', { ascending: false })
        .limit(1000);
      if (loadError) throw loadError;
      setItems(data || []);
    } catch (loadError) {
      setError(loadError.message || 'Không thể tải danh sách công việc và lịch làm việc.');
    } finally {
      setBusy(false);
    }
  }, [client, runtime.ready, runtime.session]);

  useEffect(() => {
    if (!open) return;
    setKind(currentKindFromHash());
    setSelectedIds(new Set());
    setQuery('');
    setNotice('');
    setError('');
    loadItems();
  }, [loadItems, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousActive = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      modalRef.current?.querySelector('button, input, select, textarea')?.focus();
    }, 0);
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        if (confirmRequest) {
          setConfirmRequest(null);
          setConfirmText('');
        } else {
          setOpen(false);
        }
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [busy, confirmRequest, open]);

  useEffect(() => {
    if (!confirmRequest) return;
    const timer = window.setTimeout(() => confirmInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [confirmRequest]);

  const workItems = useMemo(() => items.filter((item) => !isScheduleItem(item)), [items]);
  const scheduleItems = useMemo(() => items.filter(isScheduleItem), [items]);
  const categoryItems = kind === 'schedule' ? scheduleItems : workItems;
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categoryItems;
    return categoryItems.filter((item) => `${item.title || ''} ${item.description || ''} ${item.status || ''}`.toLowerCase().includes(needle));
  }, [categoryItems, query]);
  const selectedCount = useMemo(
    () => categoryItems.filter((item) => selectedIds.has(String(item.id))).length,
    [categoryItems, selectedIds],
  );

  function switchKind(nextKind) {
    setKind(nextKind);
    setSelectedIds(new Set());
    setQuery('');
    setError('');
    setNotice('');
  }

  function toggleItem(itemId) {
    const id = String(itemId);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredItems.forEach((item) => next.add(String(item.id)));
      return next;
    });
  }

  function requestDelete(ids, all = false) {
    const normalizedIds = uniqueIds(ids);
    if (!normalizedIds.length || busy) return;
    setConfirmText('');
    setConfirmRequest({ ids: normalizedIds, all, kind });
  }

  async function deleteRequestedItems() {
    if (!confirmRequest || !client || !runtime.session || !leader) return;
    const requiredPhrase = confirmRequest.all ? 'XÓA TẤT CẢ' : 'XÓA';
    if (confirmText.trim().toUpperCase() !== requiredPhrase) return;

    const targetIds = uniqueIds(confirmRequest.ids);
    const targetSet = new Set(targetIds);
    const targetItems = items.filter((item) => targetSet.has(String(item.id)));
    if (!targetItems.length) {
      setConfirmRequest(null);
      setConfirmText('');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');
    try {
      const commentRows = [];
      for (const batch of chunks(targetIds)) {
        const { data, error: commentError } = await client
          .from('work_hub_comments')
          .select('item_id,attachments')
          .in('item_id', batch);
        if (commentError) throw commentError;
        commentRows.push(...(data || []));
      }

      const attachmentMap = new Map();
      const attachments = [
        ...targetItems.flatMap((item) => Array.isArray(item.attachments) ? item.attachments : []),
        ...commentRows.flatMap((comment) => Array.isArray(comment.attachments) ? comment.attachments : []),
      ];
      attachments.forEach((attachment, index) => {
        const key = `${attachment?.bucket || ''}:${attachment?.path || attachment?.name || index}`;
        attachmentMap.set(key, attachment);
      });
      if (attachmentMap.size) {
        const removeResult = await removeWorkHubSubmissionFiles([...attachmentMap.values()]);
        if (!removeResult.ok) throw new Error(removeResult.message || 'Không thể xoá tệp đính kèm liên quan.');
      }

      for (const batch of chunks(targetIds)) {
        const { error: deleteError } = await client.from('work_hub_items').delete().in('id', batch);
        if (deleteError) throw deleteError;
      }

      const deletedKind = confirmRequest.kind;
      await recordAuditEvent({
        action: deletedKind === 'schedule' ? 'schedule.bulk_deleted' : 'work.bulk_deleted',
        entity_type: 'work_hub_item',
        entity_id: targetIds[0],
        source_module: deletedKind === 'schedule' ? 'work-schedule' : 'work-hub',
        before_data: {
          item_ids: targetIds,
          count: targetIds.length,
          delete_all: Boolean(confirmRequest.all),
          titles: targetItems.slice(0, 30).map((item) => item.title),
        },
      }, currentUser).catch(() => {});

      updateLocalCaches(currentUser, targetIds);
      setItems((current) => current.filter((item) => !targetSet.has(String(item.id))));
      setSelectedIds(new Set());
      setConfirmRequest(null);
      setConfirmText('');
      setNotice(`Đã xoá ${targetIds.length} ${deletedKind === 'schedule' ? 'hoạt động lịch làm việc' : 'công việc'} và dữ liệu liên quan.`);
      window.dispatchEvent(new CustomEvent(WORK_HUB_DELIVERY_EVENT, { detail: { deletedIds: targetIds } }));
      window.dispatchEvent(new CustomEvent(SCHEDULE_UPDATE_EVENT, { detail: { deletedIds: targetIds } }));
      window.dispatchEvent(new CustomEvent('bes-global-notification', {
        detail: {
          id: `bulk-delete:${Date.now()}`,
          title: deletedKind === 'schedule' ? 'Đã cập nhật lịch làm việc' : 'Đã cập nhật Trung tâm công việc',
          message: `Đã xoá ${targetIds.length} mục theo yêu cầu của Admin/TTCM.`,
          target: '#/work-hub',
          createdAt: new Date().toISOString(),
          read: false,
          category: deletedKind === 'schedule' ? 'schedule' : 'work',
          status: 'deleted',
          source: 'work-bulk-delete',
        },
      }));
    } catch (deleteError) {
      setError(deleteError.message || 'Không thể xoá các mục đã chọn.');
    } finally {
      setBusy(false);
    }
  }

  if (!leader || route !== 'work-hub' || typeof document === 'undefined') return null;

  const launcher = tabsNode ? createPortal(
    <span className="work-bulk-delete-launcher-slot">
      <button
        ref={launchButtonRef}
        type="button"
        className="work-bulk-delete-launcher"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">⌫</span>
        <b>Quản lý xoá</b>
      </button>
    </span>,
    tabsNode,
  ) : null;

  const requiredPhrase = confirmRequest?.all ? 'XÓA TẤT CẢ' : 'XÓA';
  const modal = open ? createPortal(
    <div className="work-bulk-delete-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy && !confirmRequest) setOpen(false);
    }}>
      <section ref={modalRef} className="work-bulk-delete-modal" role="dialog" aria-modal="true" aria-labelledby="work-bulk-delete-title">
        <header className="work-bulk-delete-header">
          <div>
            <span>ADMIN / TTCM · DATA MANAGEMENT</span>
            <h2 id="work-bulk-delete-title">Quản lý và xoá dữ liệu</h2>
            <p>Chọn nhiều mục hoặc xoá toàn bộ theo từng nhóm. Chỉ tài khoản Admin/TTCM được sử dụng tính năng này.</p>
          </div>
          <button type="button" className="work-bulk-delete-close" disabled={busy} onClick={() => setOpen(false)} aria-label="Đóng">×</button>
        </header>

        <div className="work-bulk-delete-kind-tabs" role="tablist" aria-label="Loại dữ liệu">
          <button type="button" role="tab" aria-selected={kind === 'work'} className={kind === 'work' ? 'active' : ''} onClick={() => switchKind('work')}>
            <span>Công việc</span><b>{workItems.length}</b>
          </button>
          <button type="button" role="tab" aria-selected={kind === 'schedule'} className={kind === 'schedule' ? 'active' : ''} onClick={() => switchKind('schedule')}>
            <span>Lịch làm việc</span><b>{scheduleItems.length}</b>
          </button>
        </div>

        {error ? <div className="work-bulk-delete-alert error" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')}>×</button></div> : null}
        {notice ? <div className="work-bulk-delete-alert success" aria-live="polite"><span>{notice}</span><button type="button" onClick={() => setNotice('')}>×</button></div> : null}

        <div className="work-bulk-delete-tools">
          <label>
            <span className="sr-only">Tìm kiếm</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === 'schedule' ? 'Tìm nội dung lịch…' : 'Tìm công việc…'} />
          </label>
          <div className="work-bulk-delete-selection-tools">
            <span><b>{selectedCount}</b> đã chọn</span>
            <button type="button" disabled={busy || !filteredItems.length} onClick={selectVisible}>Chọn tất cả đang hiển thị</button>
            <button type="button" disabled={busy || !selectedCount} onClick={() => setSelectedIds(new Set())}>Bỏ chọn</button>
          </div>
        </div>

        <div className="work-bulk-delete-list" aria-busy={busy}>
          {busy && !items.length ? <div className="work-bulk-delete-loading">Đang tải dữ liệu…</div> : null}
          {!busy && filteredItems.map((item) => {
            const checked = selectedIds.has(String(item.id));
            return <label key={item.id} className={`work-bulk-delete-row${checked ? ' selected' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id)} />
              <span className="work-bulk-delete-check" aria-hidden="true">✓</span>
              <span className="work-bulk-delete-row-main">
                <strong>{item.title || 'Mục chưa đặt tên'}</strong>
                <small>{item.description || (kind === 'schedule' ? 'Hoạt động trong lịch làm việc dùng chung.' : 'Công việc trong Trung tâm công việc.')}</small>
              </span>
              <span className="work-bulk-delete-row-meta">
                <b>{kind === 'schedule' ? 'Lịch' : (STATUS_LABEL[item.status] || item.status || 'Công việc')}</b>
                <time>{formatDateTime(item.due_at || item.created_at)}</time>
              </span>
            </label>;
          })}
          {!busy && !filteredItems.length ? <div className="work-bulk-delete-empty"><strong>Không có mục phù hợp</strong><span>Đổi từ khoá tìm kiếm hoặc chọn nhóm dữ liệu khác.</span></div> : null}
        </div>

        <footer className="work-bulk-delete-footer">
          <div>
            <strong>{categoryItems.length} {kind === 'schedule' ? 'hoạt động lịch' : 'công việc'}</strong>
            <span>Việc xoá sẽ dọn cả phản hồi và tệp đính kèm liên quan.</span>
          </div>
          <div className="work-bulk-delete-footer-actions">
            <button type="button" className="secondary" disabled={busy} onClick={() => setOpen(false)}>Đóng</button>
            <button type="button" className="danger-outline" disabled={busy || !categoryItems.length} onClick={() => requestDelete(categoryItems.map((item) => item.id), true)}>
              Xoá toàn bộ {kind === 'schedule' ? 'lịch' : 'công việc'}
            </button>
            <button type="button" className="danger" disabled={busy || !selectedCount} onClick={() => requestDelete([...selectedIds], false)}>
              Xoá mục đã chọn ({selectedCount})
            </button>
          </div>
        </footer>

        {confirmRequest ? <div className="work-bulk-delete-confirm-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) {
            setConfirmRequest(null);
            setConfirmText('');
          }
        }}>
          <section className="work-bulk-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="work-bulk-confirm-title">
            <div className="work-bulk-delete-confirm-icon" aria-hidden="true">!</div>
            <div>
              <span>THAO TÁC KHÔNG THỂ HOÀN TÁC</span>
              <h3 id="work-bulk-confirm-title">Xoá {confirmRequest.ids.length} {confirmRequest.kind === 'schedule' ? 'hoạt động lịch' : 'công việc'}?</h3>
              <p>Dữ liệu đã chọn, phản hồi và tệp đính kèm liên quan sẽ bị xoá khỏi hệ thống dùng chung.</p>
              <label>
                <span>Nhập <b>{requiredPhrase}</b> để xác nhận</span>
                <input ref={confirmInputRef} value={confirmText} onChange={(event) => setConfirmText(event.target.value)} autoComplete="off" />
              </label>
              <div className="work-bulk-delete-confirm-actions">
                <button type="button" disabled={busy} onClick={() => { setConfirmRequest(null); setConfirmText(''); }}>Huỷ</button>
                <button type="button" className="danger" disabled={busy || confirmText.trim().toUpperCase() !== requiredPhrase} onClick={deleteRequestedItems}>
                  {busy ? 'Đang xoá…' : 'Xoá vĩnh viễn'}
                </button>
              </div>
            </div>
          </section>
        </div> : null}
      </section>
    </div>,
    document.body,
  ) : null;

  return <>{launcher}{modal}</>;
}
