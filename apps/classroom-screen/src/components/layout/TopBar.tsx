import React from 'react';
import { ClassroomDeck, ClassroomScreen, Language, ThemeMode } from '../../types';
import { getTranslation } from '../../services/i18n';
import {
  Undo,
  Redo,
  Play,
  Monitor,
  Maximize,
  Settings as SettingsIcon,
  Globe,
  Sun,
  Moon,
  Rocket,
  Sparkles,
  Home,
  CheckCircle2,
  RefreshCw,
  LayoutGrid,
} from 'lucide-react';

interface TopBarProps {
  deck: ClassroomDeck | null;
  activeScreen: ClassroomScreen | null;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'failed';
  canUndo: boolean;
  canRedo: boolean;
  language: Language;
  theme: ThemeMode;
  isPresenting: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePresent: () => void;
  onOpenProjectorWindow: () => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onBackToDashboard: () => void;
  onOpenLayoutLibrary?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  deck,
  activeScreen,
  saveStatus,
  canUndo,
  canRedo,
  language,
  theme,
  isPresenting,
  onUndo,
  onRedo,
  onTogglePresent,
  onOpenProjectorWindow,
  onToggleLanguage,
  onToggleTheme,
  onOpenSettings,
  onBackToDashboard,
  onOpenLayoutLibrary,
}) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-[#E0E2E6] dark:border-slate-800 px-6 flex items-center justify-between z-30 select-none shadow-xs">
      {/* Left Branding & Deck Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-3 text-left group"
          title={getTranslation(language, 'backToDashboard')}
        >
          <div className="w-10 h-10 bg-[#1A73E8] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm group-hover:bg-[#1557B0] transition-colors">
            B
          </div>
          <div>
            <h1 className="font-semibold text-base leading-tight text-[#1A73E8] dark:text-blue-400 group-hover:underline">
              {deck?.title || 'Brian Classroom Screen'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[240px]">
              {activeScreen?.title || 'Màn hình 1'}
            </p>
          </div>
        </button>

        {/* Save Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-[#F1F3F4] dark:bg-slate-800 px-3 py-1 rounded-full">
          {saveStatus === 'saving' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>{getTranslation(language, 'saving')}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{getTranslation(language, 'saved')}</span>
            </>
          )}
        </div>
      </div>

      {/* Center Controls: Edit vs Present Pill Toggle & Undo/Redo */}
      <div className="flex items-center gap-3">
        {/* Undo / Redo group */}
        <div className="flex items-center gap-1 bg-[#F1F3F4] dark:bg-slate-800 p-1 rounded-full">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full text-gray-600 dark:text-slate-200 disabled:opacity-30 transition"
            title={getTranslation(language, 'undo')}
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full text-gray-600 dark:text-slate-200 disabled:opacity-30 transition"
            title={getTranslation(language, 'redo')}
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Pill */}
        <div className="flex bg-[#F1F3F4] dark:bg-slate-800 rounded-full p-1">
          <button
            onClick={() => isPresenting && onTogglePresent()}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              !isPresenting
                ? 'bg-white dark:bg-slate-700 text-[#1A73E8] dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            }`}
          >
            Chỉnh sửa
          </button>
          <button
            onClick={() => !isPresenting && onTogglePresent()}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
              isPresenting
                ? 'bg-[#1A73E8] text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Trình chiếu
          </button>
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1.5">
        {/* Projector Window Button */}
        <button
          onClick={onOpenProjectorWindow}
          className="p-2 hover:bg-[#F1F3F4] dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-full transition"
          title={getTranslation(language, 'projectorWindow')}
        >
          <Monitor className="w-5 h-5 text-[#1A73E8]" />
        </button>

        {/* Language Switcher */}
        <button
          onClick={onToggleLanguage}
          className="p-2 hover:bg-[#F1F3F4] dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-full text-xs font-bold flex items-center gap-1 transition"
          title="Chuyển đổi Ngôn ngữ"
        >
          <Globe className="w-4 h-4 text-gray-600" />
          <span className="hidden sm:inline">{language === 'vi' ? 'VIE' : 'ENG'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-full transition relative ${
            theme === 'cosmic'
              ? 'bg-purple-950/80 text-purple-300 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20'
              : 'hover:bg-[#F1F3F4] dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300'
          }`}
          title={
            theme === 'cosmic'
              ? 'Giao diện Vũ Trụ 🪐 (Nhấp để đổi)'
              : theme === 'dark'
              ? 'Giao diện Tối 🌙 (Nhấp để đổi)'
              : 'Giao diện Sáng ☀️ (Nhấp để đổi)'
          }
        >
          {theme === 'cosmic' ? (
            <div className="relative">
              <Rocket className="w-5 h-5 text-purple-400 animate-pulse" />
              <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1" />
            </div>
          ) : theme === 'dark' ? (
            <Moon className="w-5 h-5 text-amber-300" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2 hover:bg-[#F1F3F4] dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-full transition hidden sm:block"
          title="Toàn màn hình"
        >
          <Maximize className="w-5 h-5" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-[#F1F3F4] dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-full transition"
          title={getTranslation(language, 'settings')}
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
