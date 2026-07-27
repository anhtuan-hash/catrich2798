import React, { useState } from 'react';
import { ClassroomDeck, Folder, StudentList, AppSettings } from '../../types';
import { getTranslation } from '../../services/i18n';
import { CosmicStarfield } from '../canvas/CosmicStarfield';
import {
  Plus,
  Search,
  Star,
  Folder as FolderIcon,
  Users,
  Trash2,
  Settings as SettingsIcon,
  Download,
  Upload,
  MoreVertical,
  Play,
  Layers,
  Sparkles,
  Rocket,
} from 'lucide-react';

interface DashboardProps {
  decks: ClassroomDeck[];
  folders: Folder[];
  studentLists: StudentList[];
  settings: AppSettings;
  onSelectDeck: (id: string) => void;
  onCreateDeck: (title: string) => void;
  onMoveToTrash: (id: string) => void;
  onOpenSettings: () => void;
  onOpenExportImport: () => void;
  onOpenStudentLists: () => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  decks,
  folders,
  studentLists,
  settings,
  onSelectDeck,
  onCreateDeck,
  onMoveToTrash,
  onOpenSettings,
  onOpenExportImport,
  onOpenStudentLists,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredDecks = decks.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFav = showFavoritesOnly ? d.favorite : true;
    return matchSearch && matchFav;
  });

  const isCosmic = settings.theme === 'cosmic';

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-[#3C4043] dark:text-slate-100 flex flex-col select-none font-sans relative overflow-x-hidden">
      {/* Background Cosmic Starfield */}
      {isCosmic && <CosmicStarfield isFullCanvas />}

      {/* Top Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-[#E0E2E6] dark:border-slate-800 px-6 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A73E8] text-white flex items-center justify-center font-bold text-xl shadow-xs relative">
            B
            {isCosmic && <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1" />}
          </div>
          <div>
            <h1 className="font-semibold text-base leading-tight text-[#1A73E8] dark:text-blue-400 flex items-center gap-1.5">
              Brian Classroom Screen {isCosmic && <Rocket className="w-4 h-4 text-purple-400 animate-pulse" />}
            </h1>
            <p className="text-xs text-gray-500">
              Bảng điều khiển lớp học trực quan chuyên nghiệp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenStudentLists}
            className="px-4 py-2 bg-[#F1F3F4] hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-medium rounded-full text-xs flex items-center gap-2 transition"
          >
            <Users className="w-4 h-4 text-[#1A73E8]" /> Danh sách lớp ({studentLists.length})
          </button>

          <button
            onClick={onOpenExportImport}
            className="px-4 py-2 bg-[#F1F3F4] hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-medium rounded-full text-xs flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-[#1A73E8]" /> Sao lưu & Khôi phục
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-[#F1F3F4] dark:hover:bg-slate-800 text-gray-600 rounded-full transition"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => onCreateDeck('Bài giảng mới')}
            className="px-5 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-semibold rounded-full text-xs flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Tạo Bài Giảng Mới
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-6">
        {/* Search & Filters */}
        <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-[#E0E2E6] dark:border-slate-800 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài giảng..."
              className="w-full pl-9 pr-4 py-2 bg-[#F1F3F4] dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                showFavoritesOnly
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300'
                  : 'bg-[#F1F3F4] dark:bg-slate-800 text-gray-600 dark:text-slate-300'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current text-amber-500" /> Chỉ xem yêu thích
            </button>
          </div>
        </div>

        {/* Decks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              className="group bg-white dark:bg-slate-900 border border-[#E0E2E6] dark:border-slate-800 hover:border-[#1A73E8] rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-xl transition-all cursor-pointer relative"
              onClick={() => onSelectDeck(deck.id)}
            >
              {/* Thumbnail 16:9 box */}
              <div className="w-full aspect-video rounded-2xl bg-[#F1F3F4] dark:from-slate-800 dark:to-slate-900 border border-[#E0E2E6] dark:border-slate-800 flex items-center justify-center mb-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                <Layers className="w-8 h-8 text-[#1A73E8]/40" />
                <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-[#1A73E8] text-white px-2.5 py-0.5 rounded-full">
                  {deck.screenIds?.length || 1} trang
                </span>
              </div>

              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-[#3C4043] dark:text-slate-100 group-hover:text-[#1A73E8] transition truncate">
                    {deck.title}
                  </h3>
                  {deck.favorite && <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />}
                </div>

                {deck.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {deck.description}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3 border-t border-[#E0E2E6] dark:border-slate-800 flex items-center justify-between text-xs font-medium text-gray-400">
                <span>{new Date(deck.updatedAt).toLocaleDateString('vi-VN')}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDeck(deck.id);
                    }}
                    className="p-1.5 hover:bg-[#E8F0FE] text-[#1A73E8] rounded-full transition"
                    title="Mở trình chiếu"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToTrash(deck.id);
                    }}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-full transition"
                    title="Xóa bài giảng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
