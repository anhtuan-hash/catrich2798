import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import './ExternalWebAppPrecisionSelector.css';

const MIN_SELECTION_PERCENT = 18;
const POINTER_ID = 9127;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function afterPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function pointerEvent(type, clientX, clientY, buttons) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: POINTER_ID,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    buttons,
    clientX,
    clientY,
  });
}

async function dragHandle(stage, selector, targetX, targetY) {
  const handle = stage.querySelector(selector);
  if (!handle) return false;
  const rect = handle.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  handle.dispatchEvent(pointerEvent('pointerdown', startX, startY, 1));
  window.dispatchEvent(pointerEvent('pointermove', targetX, targetY, 1));
  window.dispatchEvent(pointerEvent('pointerup', targetX, targetY, 0));
  await afterPaint();
  return true;
}

function normalizeSelection(selection) {
  const x1 = Math.min(selection.startX, selection.endX);
  const x2 = Math.max(selection.startX, selection.endX);
  const y1 = Math.min(selection.startY, selection.endY);
  const y2 = Math.max(selection.startY, selection.endY);

  const normalizeAxis = (start, end) => {
    const center = (start + end) / 2;
    const size = Math.max(MIN_SELECTION_PERCENT, end - start);
    const safeStart = clamp(center - size / 2, 0, 100 - size);
    return [safeStart, safeStart + size];
  };

  const [left, right] = normalizeAxis(x1, x2);
  const [top, bottom] = normalizeAxis(y1, y2);
  return { left, top, right, bottom };
}

async function applySelectionToManager(stage, selection) {
  const bounds = stage.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return false;

  const target = normalizeSelection(selection);
  const toX = (percent) => bounds.left + (percent / 100) * bounds.width;
  const toY = (percent) => bounds.top + (percent / 100) * bounds.height;

  // Mở khung hiện tại ra toàn bộ vùng trước, rồi đặt lại hai góc.
  // Cách này dùng chính cơ chế kéo crop của manager nên dữ liệu React/Supabase
  // được cập nhật bình thường, không chỉ thay đổi phần nhìn bằng CSS.
  if (!await dragHandle(stage, '.bes-ext-crop-handle.is-nw', bounds.left + 1, bounds.top + 1)) return false;
  if (!await dragHandle(stage, '.bes-ext-crop-handle.is-se', bounds.right - 1, bounds.bottom - 1)) return false;
  if (!await dragHandle(stage, '.bes-ext-crop-handle.is-nw', toX(target.left), toY(target.top))) return false;
  if (!await dragHandle(stage, '.bes-ext-crop-handle.is-se', toX(target.right), toY(target.bottom))) return false;
  return true;
}

function selectionStyle(selection) {
  if (!selection) return null;
  const left = Math.min(selection.startX, selection.endX);
  const top = Math.min(selection.startY, selection.endY);
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${Math.abs(selection.endX - selection.startX)}%`,
    height: `${Math.abs(selection.endY - selection.startY)}%`,
  };
}

function stagePoint(event, stage) {
  const bounds = stage.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100),
    y: clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100),
  };
}

export default function ExternalWebAppPrecisionSelector({ currentUser, open }) {
  const manager = canManageAiWebsites(currentUser);
  const [host, setHost] = useState({ toolbar: null, stage: null });
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState(null);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open || !manager) {
      setHost({ toolbar: null, stage: null });
      setActive(false);
      setSelection(null);
      return undefined;
    }

    const findHost = () => {
      const dialogs = [...document.querySelectorAll('.bes-ext-dialog.is-reviewing')];
      const dialog = dialogs[dialogs.length - 1] || null;
      const toolbar = dialog?.querySelector('.bes-ext-crop-toolbar-actions') || null;
      const stage = dialog?.querySelector('.bes-ext-crop-stage') || null;
      setHost((current) => (
        current.toolbar === toolbar && current.stage === stage ? current : { toolbar, stage }
      ));
    };

    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [open, manager]);

  useEffect(() => {
    document.body.classList.toggle('bes-ext-precision-selecting', active);
    return () => document.body.classList.remove('bes-ext-precision-selecting');
  }, [active]);

  useEffect(() => {
    if (!host.stage) {
      setActive(false);
      setSelection(null);
    }
  }, [host.stage]);

  const readout = useMemo(() => {
    if (!selection || !host.stage) return null;
    const bounds = host.stage.getBoundingClientRect();
    const left = Math.min(selection.startX, selection.endX);
    const top = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);
    return {
      x: Math.round((left / 100) * bounds.width),
      y: Math.round((top / 100) * bounds.height),
      width: Math.round((width / 100) * bounds.width),
      height: Math.round((height / 100) * bounds.height),
    };
  }, [selection, host.stage]);

  if (!open || !manager || !host.toolbar || !host.stage) return null;

  const startSelection = () => {
    if (applying) return;
    setMessage('Kéo từ góc trên trái đến góc dưới phải của đúng khu vực cần duyệt.');
    setSelection(null);
    setActive(true);
  };

  const cancelSelection = () => {
    dragRef.current = null;
    setSelection(null);
    setActive(false);
    setMessage('');
  };

  const onPointerDown = (event) => {
    if (!active || applying) return;
    event.preventDefault();
    event.stopPropagation();
    const point = stagePoint(event, host.stage);
    dragRef.current = { pointerId: event.pointerId, startX: point.x, startY: point.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelection({ startX: point.x, startY: point.y, endX: point.x, endY: point.y });
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = stagePoint(event, host.stage);
    setSelection({ startX: drag.startX, startY: drag.startY, endX: point.x, endY: point.y });
  };

  const finishSelection = async (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const point = stagePoint(event, host.stage);
    const nextSelection = {
      startX: drag.startX,
      startY: drag.startY,
      endX: point.x,
      endY: point.y,
    };
    setSelection(nextSelection);
    setApplying(true);
    setMessage('Đang áp dụng đúng vùng vừa chọn…');

    try {
      const applied = await applySelectionToManager(host.stage, nextSelection);
      if (!applied) throw new Error('Không tìm thấy khung crop hiện tại.');
      setMessage('Đã đặt vùng chính xác. Hãy kiểm tra khung xanh rồi bấm Duyệt vùng này.');
      setActive(false);
      window.setTimeout(() => setSelection(null), 450);
    } catch (error) {
      setMessage(error?.message || 'Không thể áp dụng vùng vừa chọn.');
    } finally {
      setApplying(false);
    }
  };

  const toolbarControl = createPortal(
    <button
      type="button"
      className={`bes-ext-precision-button ${active ? 'active' : ''}`}
      disabled={applying}
      onClick={active ? cancelSelection : startSelection}
      title="Kéo trực tiếp trên website như công cụ chụp màn hình"
    >
      {applying ? 'Đang đặt vùng…' : active ? 'Hủy chọn vùng' : '🎯 Chọn vùng chính xác'}
    </button>,
    host.toolbar,
  );

  const stageOverlay = active ? createPortal(
    <div
      className="bes-ext-precision-overlay"
      role="application"
      aria-label="Kéo để chọn chính xác vùng website cần duyệt"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishSelection}
      onPointerCancel={cancelSelection}
    >
      <div className="bes-ext-precision-instruction">
        <strong>Chọn giống như chụp màn hình</strong>
        <span>Kéo chuột bao quanh đúng phần nội dung cần giữ lại.</span>
      </div>
      {selection ? (
        <div className="bes-ext-precision-marquee" style={selectionStyle(selection)}>
          {readout ? <span>{readout.width} × {readout.height}px · X {readout.x} · Y {readout.y}</span> : null}
        </div>
      ) : null}
    </div>,
    host.stage,
  ) : null;

  const messagePortal = message ? createPortal(
    <div className={`bes-ext-precision-message ${applying ? 'is-applying' : ''}`}>
      {message}
    </div>,
    host.stage,
  ) : null;

  return <>{toolbarControl}{stageOverlay}{messagePortal}</>;
}
