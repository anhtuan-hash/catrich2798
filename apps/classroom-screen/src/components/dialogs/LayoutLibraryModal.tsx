import React, { useState } from 'react';
import { LayoutPreset } from '../../types';
import {
  X,
  LayoutGrid,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Layers,
  FilePlus,
  BookmarkPlus,
} from 'lucide-react';

interface LayoutLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  allLayouts: LayoutPreset[];
  onApplyLayout: (preset: LayoutPreset, mode: 'replace' | 'append') => Promise<void>;
  onApplyLayoutToNewScreen: (preset: LayoutPreset) => Promise<void>;
  onSaveCurrentAsLayout: (name: string, description: string, icon: string) => LayoutPreset;
  onDeleteCustomLayout: (id: string) => void;
  currentWidgetCount: number;
}

export const LayoutLibraryModal: React.FC<LayoutLibraryModalProps> = ({
  isOpen,
  onClose,
  allLayouts,
  onApplyLayout,
  onApplyLayoutToNewScreen,
  onSaveCurrentAsLayout,
  onDeleteCustomLayout,
  currentWidgetCount,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'builtin' | 'custom'>('all');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customIcon, setCustomIcon] = useState('📌');
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLayouts = allLayouts.filter((layout) => {
    if (activeTab === 'builtin') return layout.category === 'builtin';
    if (activeTab === 'custom') return layout.category === 'custom';
    return true;
  });

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onSaveCurrentAsLayout(customName.trim(), customDesc.trim(), customIcon);
    setCustomName('');
    setCustomDesc('');
    setIsCreatingCustom(false);
    showToast('Đã lưu bố cục cá nhân mới!');
  };

  const showToast = (msg: string) => {
    setAppliedNotification(msg);
    setTimeout(() => setAppliedNotification(null), 2500);
  };

  const handleApply = async (preset: LayoutPreset, mode: 'replace' | 'append') => {
    await onApplyLayout(preset, mode);
    showToast(`Đã áp dụng bố cục "${preset.name}"!`);
  };

  const handleApplyToNew = async (preset: LayoutPreset) => {
    await onApplyLayoutToNewScreen(preset);
    showToast(`Đã tạo trang mới với bố cục "${preset.name}"!`);
  };

  const iconOptions = ['📝', '👥', '☀️', '🏆', '🎨', '📌', '📚', '💡', '⚡', '🌟', '🎯', '🧪'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-[#1A73E8] dark:text-blue-400 flex items-center justify-center font-bold">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Thư Viện Bố Cục Lớp Học
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                  {allLayouts.length} mẫu
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sắp xếp tiện lợi theo từng hoạt động giảng dạy (Thi cử, Thảo luận nhóm, Chào buổi sáng...)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {appliedNotification && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-1.5 animate-in slide-in-from-top duration-200">
            <Check className="w-4 h-4" />
            <span>{appliedNotification}</span>
          </div>
        )}

        {/* Main Toolbar & Controls */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900">
          {/* Tabs Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-[#1A73E8] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tất cả mẫu ({allLayouts.length})
            </button>
            <button
              onClick={() => setActiveTab('builtin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'builtin'
                  ? 'bg-white dark:bg-slate-700 text-[#1A73E8] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Mẫu chuẩn ({allLayouts.filter((l) => l.category === 'builtin').length})
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'custom'
                  ? 'bg-white dark:bg-slate-700 text-[#1A73E8] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Mẫu của tôi ({allLayouts.filter((l) => l.category === 'custom').length})
            </button>
          </div>

          {/* Action: Save Current Screen Layout */}
          <button
            onClick={() => setIsCreatingCustom(!isCreatingCustom)}
            className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Lưu màn hình hiện tại ({currentWidgetCount} tiện ích)</span>
          </button>
        </div>

        {/* Save Custom Layout Inline Form */}
        {isCreatingCustom && (
          <form
            onSubmit={handleSaveCustom}
            className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40 flex flex-col gap-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Lưu màn hình làm mẫu bố cục
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Hủy
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Tên bố cục (VD: Ôn tập Toán)..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Mô tả ngắn (không bắt buộc)..."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                <span className="text-xs text-slate-500 mr-1 font-semibold">Biểu tượng:</span>
                {iconOptions.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setCustomIcon(ic)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition ${
                      customIcon === ic ? 'bg-blue-600 text-white scale-105 shadow-xs' : 'bg-white dark:bg-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!customName.trim()}
                className="px-4 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition"
              >
                Xác nhận lưu
              </button>
            </div>
          </form>
        )}

        {/* Layout Cards Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh] grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLayouts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              <LayoutGrid className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">Chưa có mẫu bố cục nào trong mục này.</p>
            </div>
          ) : (
            filteredLayouts.map((preset) => (
              <div
                key={preset.id}
                className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-xs hover:border-blue-500 dark:hover:border-blue-400 transition flex flex-col justify-between group relative"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-2 bg-slate-100 dark:bg-slate-700 rounded-xl group-hover:scale-110 transition-transform">
                        {preset.icon}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                          {preset.name}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {preset.category === 'builtin' ? 'Mẫu lớp học chuẩn' : 'Mẫu cá nhân'}
                        </span>
                      </div>
                    </div>

                    {preset.category === 'custom' && (
                      <button
                        onClick={() => onDeleteCustomLayout(preset.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Xóa mẫu cá nhân"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-3 line-clamp-2">
                    {preset.description || 'Không có mô tả.'}
                  </p>

                  {/* Included Widgets List Badges */}
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Các tiện ích bao gồm ({preset.widgets.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {preset.widgets.map((w, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[10px] font-semibold uppercase"
                        >
                          {w.type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                  <button
                    onClick={() => handleApply(preset, 'replace')}
                    className="flex-1 py-2 px-3 bg-[#1A73E8] hover:bg-[#1557B0] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow-xs"
                    title="Ghi đè thay thế toàn bộ tiện ích trên màn hình hiện tại"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Áp dụng (Ghi đè)</span>
                  </button>

                  <button
                    onClick={() => handleApply(preset, 'append')}
                    className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                    title="Thêm các tiện ích này vào màn hình hiện tại"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleApplyToNew(preset)}
                    className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                    title="Tạo màn hình mới và thêm tiện ích mẫu"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Trang mới</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
