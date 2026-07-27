import React, { useRef, useState } from 'react';
import { ClassroomWidget } from '../../types';
import { WidgetFactory } from '../../widgets/WidgetFactory';
import { Lock, Pin, Move, Copy, Trash2 } from 'lucide-react';

interface WrapperProps {
  widget: ClassroomWidget;
  isSelected: boolean;
  isSpotlighted: boolean;
  readOnly?: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onUpdate: (partial: Partial<ClassroomWidget>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}

export const CanvasWidgetWrapper: React.FC<WrapperProps> = ({
  widget,
  isSelected,
  isSpotlighted,
  readOnly = false,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; widgetX: number; widgetY: number }>({
    x: 0,
    y: 0,
    widgetX: widget.x,
    widgetY: widget.y,
  });

  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: widget.width,
    h: widget.height,
  });

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (widget.locked || readOnly) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      widgetX: widget.x,
      widgetY: widget.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onUpdate({
        x: Math.max(0, Math.round(dragStartRef.current.widgetX + dx)),
        y: Math.max(0, Math.round(dragStartRef.current.widgetY + dy)),
      });
    } else if (isResizing) {
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      onUpdate({
        width: Math.max(120, Math.round(resizeStartRef.current.w + dx)),
        height: Math.max(80, Math.round(resizeStartRef.current.h + dy)),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Resizing logic
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (widget.locked || readOnly) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: widget.width,
      h: widget.height,
    };
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ locked: !widget.locked });
  };

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ pinned: !widget.pinned });
  };

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'absolute',
        left: `${widget.x}px`,
        top: `${widget.y}px`,
        width: `${widget.width}px`,
        height: `${widget.height}px`,
        transform: `rotate(${widget.rotation || 0}deg)`,
        zIndex: isSpotlighted ? 9999 : widget.zIndex,
        opacity: widget.opacity ?? 1,
        ...widget.style,
      }}
      className={`group rounded-2xl border transition-shadow select-none ${
        isSpotlighted
          ? 'fixed inset-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] shadow-2xl scale-125 border-[#1A73E8]'
          : isSelected
          ? 'border-2 border-[#1A73E8] shadow-xl ring-2 ring-blue-500/20'
          : 'border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md'
      } bg-white dark:bg-slate-800`}
    >
      {/* Control overlay toolbar on hover/select */}
      {isSelected && !readOnly && (
        <div className="absolute -top-10 left-0 flex items-center gap-1 bg-slate-900 text-white p-1 rounded-xl text-xs shadow-lg z-50">
          <button
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="p-1 hover:bg-slate-700 rounded cursor-move"
            title="Di chuyển"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
          <button onClick={toggleLock} className="p-1 hover:bg-slate-700 rounded" title={widget.locked ? 'Mở khóa' : 'Khóa'}>
            <Lock className={`w-3.5 h-3.5 ${widget.locked ? 'text-amber-400' : ''}`} />
          </button>
          <button onClick={togglePin} className="p-1 hover:bg-slate-700 rounded" title={widget.pinned ? 'Bỏ ghim' : 'Ghim deck'}>
            <Pin className={`w-3.5 h-3.5 ${widget.pinned ? 'text-blue-400' : ''}`} />
          </button>
          <button onClick={onDuplicate} className="p-1 hover:bg-slate-700 rounded" title="Nhân bản">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-600 rounded text-red-300 hover:text-white" title="Xóa">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pinned / Locked status badges */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-30 pointer-events-none">
        {widget.pinned && (
          <span className="p-1 bg-[#1A73E8] text-white rounded-full shadow-xs" title="Đã ghim toàn bộ deck">
            <Pin className="w-3 h-3" />
          </span>
        )}
        {widget.locked && (
          <span className="p-1 bg-amber-500 text-white rounded-full shadow-xs" title="Đã khóa vị trí">
            <Lock className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Widget Content */}
      <div className="w-full h-full overflow-hidden rounded-2xl">
        <WidgetFactory widget={widget} onUpdate={onUpdate} />
      </div>

      {/* SE Corner Resize Handle */}
      {isSelected && !readOnly && !widget.locked && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-[#1A73E8] border-2 border-white rounded-full cursor-se-resize shadow-md z-50 hover:scale-125 transition-transform"
          title="Kéo để thay đổi kích thước"
        />
      )}
    </div>
  );
};
