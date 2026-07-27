import React from 'react';
import { ClassroomScreen, ClassroomWidget } from '../../types';
import { CanvasWidgetWrapper } from './CanvasWidgetWrapper';
import { CosmicStarfield } from './CosmicStarfield';
import { Plus, Sparkles } from 'lucide-react';

interface CanvasProps {
  screen: ClassroomScreen | null;
  widgets: ClassroomWidget[];
  selectedWidgetIds: string[];
  spotlightWidgetId: string | null;
  zoomLevel: number;
  showGrid: boolean;
  showSafeArea: boolean;
  readOnly?: boolean;
  onSelectWidget: (id: string, multiSelect: boolean) => void;
  onClearSelection: () => void;
  onUpdateWidget: (id: string, partial: Partial<ClassroomWidget>) => void;
  onDeleteWidget: (id: string) => void;
  onDuplicateWidget: (widget: ClassroomWidget) => void;
}

export const CenterCanvas: React.FC<CanvasProps> = ({
  screen,
  widgets,
  selectedWidgetIds,
  spotlightWidgetId,
  zoomLevel,
  showGrid,
  showSafeArea,
  readOnly = false,
  onSelectWidget,
  onClearSelection,
  onUpdateWidget,
  onDeleteWidget,
  onDuplicateWidget,
}) => {
  const bgStyle = screen?.background || { type: 'color', value: '#ffffff' };
  const isCosmicMode = typeof document !== 'undefined' && document.documentElement.classList.contains('cosmic');
  const isSpaceBg = bgStyle.value.includes('#0f0c29') || bgStyle.value.includes('#060814') || bgStyle.value.includes('#2e0854') || bgStyle.value.includes('#0d1b2a');

  return (
    <div
      onClick={onClearSelection}
      className="relative w-full h-full flex items-center justify-center bg-[#DADCE0] dark:bg-slate-950 p-8 overflow-hidden select-none"
    >
      {/* Outer Cosmic Ambient Starfield in Cosmic Theme */}
      {isCosmicMode && <CosmicStarfield isFullCanvas />}

      {/* 16:9 Responsive Stage */}
      <div
        style={{
          width: '1280px',
          height: '720px',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          background: isCosmicMode && bgStyle.value === '#ffffff'
            ? 'linear-gradient(135deg, #090c1e 0%, #171d3d 50%, #0d1127 100%)'
            : bgStyle.type === 'gradient'
            ? bgStyle.value
            : bgStyle.value,
        }}
        className="relative shadow-2xl rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-purple-500/20 transition-transform duration-200"
      >
        {/* Stage Starfield for Cosmic Theme or Space Wallpapers */}
        {(isCosmicMode || isSpaceBg) && <CosmicStarfield />}
        {/* Dot Grid Overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(#BDC1C6 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        )}

        {/* 16:9 Safe Area */}
        {showSafeArea && (
          <div className="absolute inset-8 border-2 border-dashed border-[#1A73E8]/30 rounded-xl pointer-events-none flex items-start justify-end p-2">
            <span className="text-[10px] font-bold text-[#1A73E8]/60 uppercase tracking-wide">VÙNG AN TOÀN TRÌNH CHIẾU</span>
          </div>
        )}

        {/* Empty State */}
        {widgets.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center mb-3 shadow-inner">
              <Plus className="w-8 h-8" />
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-1">
              Màn hình đang trống
            </p>
            <p className="text-sm max-w-md text-gray-500">
              Chọn công cụ từ thanh bên dưới để thêm tiện ích dạy học!
            </p>
          </div>
        )}

        {/* Widgets Layer */}
        {widgets.map((widget) => (
          <CanvasWidgetWrapper
            key={widget.id}
            widget={widget}
            isSelected={selectedWidgetIds.includes(widget.id)}
            isSpotlighted={spotlightWidgetId === widget.id}
            readOnly={readOnly}
            onSelect={(e) => {
              e.stopPropagation();
              onSelectWidget(widget.id, e.shiftKey);
            }}
            onUpdate={(partial) => onUpdateWidget(widget.id, partial)}
            onDelete={() => onDeleteWidget(widget.id)}
            onDuplicate={() => onDuplicateWidget(widget)}
            onBringForward={() => onUpdateWidget(widget.id, { zIndex: widget.zIndex + 1 })}
            onSendBackward={() => onUpdateWidget(widget.id, { zIndex: Math.max(0, widget.zIndex - 1) })}
          />
        ))}
      </div>
    </div>
  );
};
