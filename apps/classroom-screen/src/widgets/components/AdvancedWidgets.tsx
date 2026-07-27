import React, { useState } from 'react';
import { ClassroomWidget, StudentList } from '../../types';
import { playWinnerFanfare, playTickSound, playChimeSound } from '../../services/audio';
import confetti from 'canvas-confetti';
import {
  LayoutGrid,
  Binary,
  ExternalLink,
  Shuffle,
  Users,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';

interface WidgetProps {
  widget: ClassroomWidget;
  onUpdate: (partial: Partial<ClassroomWidget>) => void;
  studentLists?: StudentList[];
}

// 1. SEATING PICKER WIDGET
export const SeatingPickerWidget: React.FC<WidgetProps> = ({ widget, studentLists }) => {
  const activeList = studentLists?.[0];
  const students = activeList?.students.filter((s) => !s.absent) || [];
  const rows = widget.settings.rows || 3;
  const cols = widget.settings.cols || 4;

  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const totalSeats = rows * cols;

  const pickRandomSeat = () => {
    setIsPicking(true);
    setSelectedSeat(null);
    let count = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * totalSeats);
      setSelectedSeat(idx);
      playTickSound(0.2);
      count++;
      if (count >= 12) {
        clearInterval(interval);
        setIsPicking(false);
        playWinnerFanfare(0.6);
        confetti({ particleCount: 40, spread: 50 });
      }
    }, 90);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      <div className="flex items-center justify-between border-b pb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <LayoutGrid className="w-4 h-4 text-[#1A73E8]" /> SƠ ĐỒ CHỖ NGỒI LỚP
        </span>
        <button
          onClick={pickRandomSeat}
          disabled={isPicking}
          className="px-3 py-1 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs disabled:opacity-50"
        >
          <Shuffle className="w-3.5 h-3.5" /> Chọn ghế
        </button>
      </div>

      {/* Grid representation */}
      <div
        className="grid gap-1.5 my-auto w-full flex-1 items-center justify-center p-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: totalSeats }).map((_, idx) => {
          const student = students[idx];
          const isSelected = selectedSeat === idx;
          return (
            <div
              key={idx}
              className={`aspect-video rounded-lg border text-[10px] font-bold flex flex-col items-center justify-center p-1 text-center transition transform ${
                isSelected
                  ? 'bg-[#1A73E8] border-[#1A73E8] text-white shadow-md scale-105 animate-pulse'
                  : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'
              }`}
            >
              <span>Ghế {idx + 1}</span>
              {student && (
                <span className="text-[9px] font-normal truncate max-w-full">
                  {student.displayName}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 2. NUMBER GENERATOR WIDGET
export const NumberGeneratorWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const min = widget.settings.min ?? 1;
  const max = widget.settings.max ?? 40;
  const allowRepeat = widget.settings.allowRepeat ?? false;
  const history: number[] = widget.settings.history || [];

  const [currentNum, setCurrentNum] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const generateNumber = () => {
    setIsAnimating(true);
    let count = 0;
    const interval = setInterval(() => {
      const val = Math.floor(Math.random() * (max - min + 1)) + min;
      setCurrentNum(val);
      playTickSound(0.2);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setIsAnimating(false);
        const finalVal = Math.floor(Math.random() * (max - min + 1)) + min;
        setCurrentNum(finalVal);
        playChimeSound(0.5);
        onUpdate({
          settings: {
            ...widget.settings,
            history: [finalVal, ...history.slice(0, 9)],
          },
        });
      }
    }, 80);
  };

  const resetHistory = () => {
    setCurrentNum(null);
    onUpdate({ settings: { ...widget.settings, history: [] } });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <div className="flex items-center justify-between w-full border-b pb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Binary className="w-4 h-4 text-[#1A73E8]" /> TẠO SỐ NGẪU NHIÊN ({min} - {max})
        </span>
        <button
          onClick={resetHistory}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title="Xóa lịch sử"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="my-auto text-center">
        <div
          className={`text-5xl font-black font-mono tracking-tight transition ${
            isAnimating ? 'text-[#1A73E8] scale-110' : 'text-gray-800 dark:text-slate-100'
          }`}
        >
          {currentNum !== null ? currentNum : '?'}
        </div>
      </div>

      <div className="w-full flex items-center justify-between gap-2">
        <button
          onClick={generateNumber}
          disabled={isAnimating}
          className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold rounded-xl shadow-xs flex-1"
        >
          {isAnimating ? 'Đang quay...' : 'Tạo Số'}
        </button>
      </div>

      {history.length > 0 && (
        <div className="w-full text-[10px] text-gray-500 font-mono mt-2 truncate text-center">
          Đã chọn: {history.join(', ')}
        </div>
      )}
    </div>
  );
};

// 3. HYPERLINK WIDGET (Liên kết thông minh & Tài nguyên bài học)
export const HyperlinkWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const title = widget.settings.title || 'Liên kết bài học';
  const url = widget.settings.url || 'https://edu.google.com';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editUrl, setEditUrl] = useState(url);

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdate({
      settings: {
        ...widget.settings,
        title: editTitle.trim() || 'Liên kết bài học',
        url: editUrl.trim().startsWith('http') ? editUrl.trim() : `https://${editUrl.trim()}`,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      <div className="flex items-center justify-between border-b pb-1">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          🔗 LIÊN KẾT BÀI HỌC
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isEditing ? 'Đóng' : 'Chỉnh sửa'}
        </button>
      </div>

      {isEditing ? (
        <div className="my-auto space-y-2 py-1">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Tên tiêu đề liên kết..."
            className="w-full p-1.5 text-xs border rounded-lg dark:bg-slate-800 font-bold"
          />
          <input
            type="text"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://..."
            className="w-full p-1.5 text-xs border rounded-lg dark:bg-slate-800 font-mono"
          />
          <button
            onClick={handleSave}
            className="w-full py-1 bg-[#1A73E8] text-white text-xs font-bold rounded-lg"
          >
            Lưu thay đổi
          </button>
        </div>
      ) : (
        <div className="my-auto">
          <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">{title}</p>
          <p className="text-xs font-mono text-gray-400 truncate mt-0.5">{url}</p>
        </div>
      )}

      {!isEditing && (
        <div className="flex items-center gap-2 mt-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-3 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Mở liên kết
          </a>
          <button
            onClick={copyUrl}
            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl transition active:scale-95"
            title="Sao chép liên kết"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
};
