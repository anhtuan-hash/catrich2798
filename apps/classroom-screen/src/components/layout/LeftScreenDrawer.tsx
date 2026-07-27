import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClassroomScreen } from '../../types';
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface LeftDrawerProps {
  screens: ClassroomScreen[];
  activeScreenId: string | null;
  onSelectScreen: (id: string) => void;
  onAddScreen: () => void;
  onDeleteScreen: (id: string) => void;
}

export const LeftScreenDrawer: React.FC<LeftDrawerProps> = ({
  screens,
  activeScreenId,
  onSelectScreen,
  onAddScreen,
  onDeleteScreen,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <motion.aside
      initial={{ x: -220, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: isCollapsed ? 56 : 176 }}
      exit={{ x: -220, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="relative h-full bg-white dark:bg-slate-900 border-r border-[#E0E2E6] dark:border-slate-800 flex flex-col z-20 select-none overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-[#E0E2E6] dark:border-slate-800 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-bold text-[11px] text-gray-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap overflow-hidden"
            >
              <Layers className="w-4 h-4 text-[#1A73E8]" /> TRANG ({screens.length})
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-[#F1F3F4] dark:hover:bg-slate-800 rounded-full text-gray-500 mx-auto transition"
          title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Screen Thumbnails List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {screens.map((sc, idx) => {
          const isActive = sc.id === activeScreenId;
          return (
            <motion.div
              key={sc.id}
              onClick={() => onSelectScreen(sc.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="group relative cursor-pointer"
            >
              <div
                className={`w-full aspect-video rounded-lg border-2 transition-all flex flex-col items-center justify-center relative bg-gray-50 dark:bg-slate-800 ${
                  isActive
                    ? 'border-[#1A73E8] shadow-md ring-2 ring-blue-500/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                }`}
                style={{
                  background: sc.background?.type === 'gradient' ? sc.background.value : sc.background?.value,
                }}
              >
                {/* Number badge */}
                <span
                  className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive ? 'bg-[#1A73E8] text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                  }`}
                >
                  {idx + 1}
                </span>
              </div>

              {!isCollapsed && (
                <div className="mt-1 flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-medium text-gray-600 dark:text-slate-300 truncate max-w-[100px]">
                    {sc.title}
                  </span>
                  {screens.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScreen(sc.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 rounded transition"
                      title="Xóa trang"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Add Screen Button */}
      <div className="p-3 border-t border-[#E0E2E6] dark:border-slate-800">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddScreen}
          className="w-full flex flex-col items-center justify-center py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-400 hover:text-[#1A73E8] hover:border-[#1A73E8] transition-colors"
        >
          <Plus className="w-5 h-5 mb-0.5" />
          {!isCollapsed && <span className="text-[10px] font-medium uppercase tracking-wider">THÊM TRANG</span>}
        </motion.button>
      </div>
    </motion.aside>
  );
};
