import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClassroomWidget, ClassroomScreen } from '../../types';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { Sliders, Palette, Move, Lock, Pin, Trash2, ShieldAlert } from 'lucide-react';

interface InspectorProps {
  selectedWidgets: ClassroomWidget[];
  screen: ClassroomScreen | null;
  onUpdateWidget: (id: string, partial: Partial<ClassroomWidget>) => void;
  onUpdateScreen: (partial: Partial<ClassroomScreen>) => void;
  onDeleteWidgets: (ids: string[]) => void;
}

export const RightInspector: React.FC<InspectorProps> = ({
  selectedWidgets,
  screen,
  onUpdateWidget,
  onUpdateScreen,
  onDeleteWidgets,
}) => {
  const widget = selectedWidgets[0] || null;

  if (!widget) {
    // Show Screen Background & Settings inspector
    const bg = screen?.background || { type: 'color', value: '#ffffff' };

    return (
      <motion.aside
        initial={{ x: 260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 260, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-64 h-full bg-white dark:bg-slate-900 border-l border-[#E0E2E6] dark:border-slate-800 p-5 flex flex-col select-none overflow-y-auto"
      >
        <div className="pb-3 border-b border-[#E0E2E6] dark:border-slate-800 mb-5">
          <h3 className="font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-widest">
            THUỘC TÍNH TRANG
          </h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block mb-2">
              Hình nền màn hình
            </label>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="color"
                value={bg.type === 'color' ? bg.value : '#ffffff'}
                onChange={(e) =>
                  onUpdateScreen({
                    background: { type: 'color', value: e.target.value },
                  })
                }
                className="w-10 h-10 rounded-xl cursor-pointer border border-[#E0E2E6]"
              />
              <span className="text-xs font-mono font-medium text-gray-600 dark:text-slate-300">
                {bg.value}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Mặc định', val: '#ffffff', textCol: '#333' },
                { label: '🪐 Vũ trụ Tím', val: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', textCol: '#fff' },
                { label: '🌌 Tinh vân', val: 'radial-gradient(circle at 50% 50%, #2e0854 0%, #12002b 60%, #050014 100%)', textCol: '#fff' },
                { label: '✨ Dải Ngân Hà', val: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 40%, #415a77 100%)', textCol: '#fff' },
                { label: '🚀 Không gian', val: '#060814', textCol: '#fff' },
                { label: '💫 Nhật thực Neon', val: 'radial-gradient(circle at 30% 30%, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)', textCol: '#fff' },
                { label: 'Xanh nhạt', val: 'linear-gradient(135deg, #e8f0fe 0%, #f1f3f4 100%)', textCol: '#333' },
                { label: 'Ấm áp', val: 'linear-gradient(135deg, #fce8e6 0%, #fff8e1 100%)', textCol: '#333' },
              ].map((g, i) => (
                <button
                  key={i}
                  onClick={() =>
                    onUpdateScreen({
                      background: {
                        type: g.val.includes('gradient') ? 'gradient' : 'color',
                        value: g.val,
                      },
                    })
                  }
                  style={{ background: g.val, color: g.textCol }}
                  className="aspect-video border border-[#E0E2E6] dark:border-slate-700 rounded-lg text-[10px] font-bold shadow-xs hover:border-[#1A73E8] transition flex items-center justify-center p-1 text-center"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E0E2E6] dark:border-slate-800">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block mb-1.5">
              Tên màn hình
            </label>
            <input
              type="text"
              value={screen?.title || ''}
              onChange={(e) => onUpdateScreen({ title: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-[#F1F3F4] dark:bg-slate-800 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block mb-1.5">
              Ghi chú riêng tư (Giáo viên)
            </label>
            <textarea
              value={screen?.notes || ''}
              onChange={(e) => onUpdateScreen({ notes: e.target.value })}
              placeholder="Nhắc nhở giáo án, câu hỏi gợi ý..."
              className="w-full h-28 px-3 py-2 text-xs bg-[#F1F3F4] dark:bg-slate-800 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-[#1A73E8] resize-none"
            />
          </div>
        </div>
      </motion.aside>
    );
  }

  // Widget Inspector
  const reg = WIDGET_REGISTRY[widget.type];

  return (
    <motion.aside
      initial={{ x: 260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 260, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="w-64 h-full bg-white dark:bg-slate-900 border-l border-[#E0E2E6] dark:border-slate-800 p-5 flex flex-col select-none overflow-y-auto"
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#E0E2E6] dark:border-slate-800 mb-5">
        <h3 className="font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-widest">
          THUỘC TÍNH TIỆN ÍCH
        </h3>
        <button
          onClick={() => onDeleteWidgets([widget.id])}
          className="p-1 hover:bg-red-50 text-red-500 rounded-full transition"
          title="Xóa tiện ích"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-5 text-xs">
        {/* Style Properties */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block mb-1.5">
            Màu nền
          </label>
          <input
            type="color"
            value={widget.style?.backgroundColor || '#ffffff'}
            onChange={(e) =>
              onUpdateWidget(widget.id, {
                style: { ...widget.style, backgroundColor: e.target.value },
              })
            }
            className="w-full h-8 rounded-lg cursor-pointer border border-[#E0E2E6]"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block mb-1.5">
            Màu chữ
          </label>
          <input
            type="color"
            value={widget.style?.textColor || '#000000'}
            onChange={(e) =>
              onUpdateWidget(widget.id, {
                style: { ...widget.style, textColor: e.target.value },
              })
            }
            className="w-full h-8 rounded-lg cursor-pointer border border-[#E0E2E6]"
          />
        </div>

        {/* Position & Dimensions */}
        <div className="pt-4 border-t border-[#E0E2E6] dark:border-slate-800">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tight block mb-2">
            KÍCH THƯỚC (PX)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-gray-400">Chiều rộng</span>
              <input
                type="number"
                value={widget.width}
                onChange={(e) =>
                  onUpdateWidget(widget.id, { width: Math.max(100, Number(e.target.value)) })
                }
                className="w-full px-2.5 py-1.5 bg-[#F1F3F4] dark:bg-slate-800 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
              />
            </div>
            <div>
              <span className="text-[10px] text-gray-400">Chiều cao</span>
              <input
                type="number"
                value={widget.height}
                onChange={(e) =>
                  onUpdateWidget(widget.id, { height: Math.max(80, Number(e.target.value)) })
                }
                className="w-full px-2.5 py-1.5 bg-[#F1F3F4] dark:bg-slate-800 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
              />
            </div>
          </div>
        </div>

        {/* Action Toggles */}
        <div className="pt-4 border-t border-[#E0E2E6] dark:border-slate-800 space-y-2">
          <button
            onClick={() => onUpdateWidget(widget.id, { locked: !widget.locked })}
            className={`w-full py-2 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border transition ${
              widget.locked
                ? 'bg-amber-500 text-white border-amber-500 font-bold'
                : 'bg-[#F1F3F4] dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-none'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> {widget.locked ? 'Đã Khóa Vị Trí' : 'Khóa Vị Trí'}
          </button>

          <button
            onClick={() => onUpdateWidget(widget.id, { pinned: !widget.pinned })}
            className={`w-full py-2 rounded-xl font-medium text-xs flex items-center justify-center gap-2 border transition ${
              widget.pinned
                ? 'bg-[#1A73E8] text-white border-[#1A73E8] font-bold'
                : 'bg-[#F1F3F4] dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-none'
            }`}
          >
            <Pin className="w-3.5 h-3.5" /> {widget.pinned ? 'Đã Ghim Toàn Deck' : 'Ghim Toàn Deck'}
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
