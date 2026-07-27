import React from 'react';
import { AppSettings, Language, ThemeMode } from '../../types';
import { getTranslation } from '../../services/i18n';
import { X, Volume2, Globe, Palette, Shield } from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onUpdate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
            Cài Đặt Hệ Thống
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-medium">
          {/* Language */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Ngôn ngữ giao diện
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdate({ language: 'vi' })}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                  settings.language === 'vi'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-200'
                }`}
              >
                Tiếng Việt 🇻🇳
              </button>
              <button
                onClick={() => onUpdate({ language: 'en' })}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 ${
                  settings.language === 'en'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-200'
                }`}
              >
                English 🇬🇧
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Chế độ giao diện
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'light', label: '☀️ Sáng' },
                  { id: 'dark', label: '🌙 Tối' },
                  { id: 'cosmic', label: '🪐 Vũ Trụ' },
                  { id: 'high-contrast', label: '⚡ Tương phản' },
                ] as Array<{ id: ThemeMode; label: string }>
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onUpdate({ theme: t.id })}
                  className={`py-2 px-2 rounded-xl border font-bold text-center text-xs transition ${
                    settings.theme === t.id
                      ? t.id === 'cosmic'
                        ? 'bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                        : 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-200 hover:border-blue-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Âm thanh ứng dụng
            </label>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200">
              <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                <Volume2 className="w-4 h-4 text-blue-600" /> Bật âm thanh cảnh báo & timer
              </span>
              <input
                type="checkbox"
                checked={settings.enableSound}
                onChange={(e) => onUpdate({ enableSound: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            Đã Xong
          </button>
        </div>
      </div>
    </div>
  );
};
