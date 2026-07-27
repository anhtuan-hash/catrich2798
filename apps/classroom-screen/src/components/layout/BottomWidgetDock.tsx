import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WidgetType, WidgetCategory, ClassroomWidget } from '../../types';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import {
  Type,
  Clock,
  Volume2,
  Users,
  Dices,
  Image as ImageIcon,
  PenTool,
  ChevronUp,
  ChevronDown,
  Search,
} from 'lucide-react';

interface DockProps {
  onAddWidget: (widget: ClassroomWidget) => void;
  activeScreenId: string | null;
}

export const BottomWidgetDock: React.FC<DockProps> = ({ onAddWidget, activeScreenId }) => {
  const [activeCategory, setActiveCategory] = useState<WidgetCategory>('content');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories: { id: WidgetCategory; label: string; icon: any }[] = [
    { id: 'content', label: 'Văn bản & Chữ', icon: Type },
    { id: 'time', label: 'Đồng hồ', icon: Clock },
    { id: 'classroom', label: 'Quản lý lớp', icon: Volume2 },
    { id: 'students', label: 'Học sinh', icon: Users },
    { id: 'interactive', label: 'Trò chơi', icon: Dices },
    { id: 'media', label: 'Hình ảnh', icon: ImageIcon },
    { id: 'decoration', label: 'Trang trí', icon: PenTool },
  ];

  const handleAddType = (type: WidgetType) => {
    if (!activeScreenId) return;
    const reg = WIDGET_REGISTRY[type];
    if (!reg) return;

    const now = Date.now();
    const newWidget: ClassroomWidget = {
      id: `widget_${type}_${now}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      screenId: activeScreenId,
      x: 100 + Math.floor(Math.random() * 100),
      y: 100 + Math.floor(Math.random() * 100),
      width: reg.defaultWidth,
      height: reg.defaultHeight,
      rotation: 0,
      zIndex: 10,
      opacity: 1,
      locked: false,
      hidden: false,
      pinned: false,
      style: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      },
      settings: JSON.parse(JSON.stringify(reg.defaultSettings)),
      createdAt: now,
      updatedAt: now,
    };

    onAddWidget(newWidget);
  };

  const filteredWidgets = Object.values(WIDGET_REGISTRY).filter((w) => {
    const matchCat = searchQuery
      ? true
      : w.category === activeCategory || (activeCategory === 'interactive' && w.category === 'games');
    const matchSearch = searchQuery
      ? w.title.vi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.title.en.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchCat && matchSearch;
  });

  return (
    <motion.footer
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="relative bg-white dark:bg-slate-900 border-t border-[#E0E2E6] dark:border-slate-800 shadow-lg z-20 select-none overflow-hidden"
    >
      {/* Category Tabs Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[#E0E2E6]/60 dark:border-slate-800">
        <div className="flex items-center bg-[#F1F3F4] dark:bg-slate-800 rounded-2xl p-1 gap-1 overflow-x-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                  setIsCollapsed(false);
                }}
                className={`px-3.5 py-1.5 rounded-xl font-medium text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-[#1A73E8] dark:text-blue-400 shadow-xs font-bold'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Collapse Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tiện ích..."
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F1F3F4] dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A73E8] text-gray-800 dark:text-slate-100"
            />
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-[#F1F3F4] dark:hover:bg-slate-800 text-gray-500 rounded-full transition"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Widget Grid Items */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="p-3 max-h-36 overflow-x-auto flex items-center gap-2.5"
          >
            {filteredWidgets.map((reg, idx) => (
              <motion.button
                key={reg.type}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => handleAddType(reg.type)}
                className="min-w-[120px] max-w-[140px] p-2.5 bg-white dark:bg-slate-800 border border-[#E0E2E6] dark:border-slate-700 hover:border-[#1A73E8] hover:shadow-md rounded-2xl flex flex-col items-center justify-center text-center transition group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] dark:bg-blue-900/40 text-[#1A73E8] dark:text-blue-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                  <span className="font-bold text-xs uppercase">{reg.type[0]}</span>
                </div>
                <span className="font-semibold text-xs text-gray-800 dark:text-slate-100 truncate w-full">
                  {reg.title.vi}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.footer>
  );
};
