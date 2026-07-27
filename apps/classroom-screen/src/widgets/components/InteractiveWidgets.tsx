import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { ClassroomWidget } from '../../types';
import { playChimeSound, playWinnerFanfare, playTickSound } from '../../services/audio';
import confetti from 'canvas-confetti';
import {
  Plus,
  RotateCw,
  Sparkles,
  Check,
  Smile,
  Dices,
  CircleDollarSign,
  PieChart,
  Edit2,
  Trash2,
  BarChart2,
  Award,
} from 'lucide-react';

interface WidgetProps {
  widget: ClassroomWidget;
  onUpdate: (partial: Partial<ClassroomWidget>) => void;
}

// 1. POLL WIDGET (Bình chọn / Khảo sát trực quan)
export const PollWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const question = widget.settings.question || 'Câu hỏi bình chọn trong lớp?';
  const options = widget.settings.options || [
    { id: 1, text: 'Đồng ý / Hiểu bài', votes: 12, color: 'bg-emerald-500' },
    { id: 2, text: 'Cần giải thích thêm', votes: 5, color: 'bg-amber-500' },
    { id: 3, text: 'Chưa hiểu rõ', votes: 2, color: 'bg-rose-500' },
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const [pasteOptions, setPasteOptions] = useState('');

  const addVote = (idx: number) => {
    const updated = options.map((opt: any, i: number) =>
      i === idx ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
    );
    playChimeSound(0.4);
    onUpdate({ settings: { ...widget.settings, options: updated } });
  };

  const totalVotes = options.reduce((acc: number, curr: any) => acc + (curr.votes || 0), 0);

  const handleAddOption = () => {
    if (newOptionText.trim()) {
      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-indigo-500', 'bg-amber-500'];
      const newOpt = {
        id: Date.now(),
        text: newOptionText.trim(),
        votes: 0,
        color: colors[options.length % colors.length],
      };
      onUpdate({ settings: { ...widget.settings, options: [...options, newOpt] } });
      setNewOptionText('');
    }
  };

  const handleRemoveOption = (id: number) => {
    const updated = options.filter((o: any) => o.id !== id);
    onUpdate({ settings: { ...widget.settings, options: updated } });
  };

  const handleApplyPasteOptions = () => {
    if (!pasteOptions.trim()) return;
    const lines = pasteOptions.split('\n').filter((l) => l.trim());
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-indigo-500', 'bg-amber-500', 'bg-rose-500'];
    const newOptions = lines.map((line, idx) => ({
      id: Date.now() + idx,
      text: line.trim(),
      votes: 0,
      color: colors[idx % colors.length],
    }));

    onUpdate({ settings: { ...widget.settings, options: newOptions } });
    setPasteOptions('');
    setIsEditing(false);
  };

  return (
    <div className="w-full h-full flex flex-col p-3 select-none">
      <div className="flex items-center justify-between border-b pb-1.5 mb-2">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-[#1A73E8]" /> {question}
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-gray-400 hover:text-[#1A73E8] rounded transition"
          title="Chỉnh sửa bình chọn"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {isEditing ? (
        <div className="flex-1 flex flex-col justify-between space-y-2 p-1 overflow-y-auto max-h-[260px]">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Dán danh sách lựa chọn (mỗi dòng 1 mục)</span>
            <textarea
              value={pasteOptions}
              onChange={(e) => setPasteOptions(e.target.value)}
              placeholder={`Lựa chọn A: Rất hiểu bài\nLựa chọn B: Bình thường\nLựa chọn C: Cần ôn lại`}
              className="w-full h-20 p-2 text-xs bg-gray-50 dark:bg-slate-800 rounded-lg border font-mono resize-none"
            />
            <button
              onClick={handleApplyPasteOptions}
              className="w-full py-1 bg-[#1A73E8] text-white text-xs font-bold rounded-lg shadow-xs"
            >
              Nạp danh sách dán
            </button>
          </div>

          <div className="border-t pt-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Danh sách hiện tại</span>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {options.map((opt: any) => (
                <div key={opt.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-1.5 rounded-lg text-xs">
                  <span className="truncate max-w-[180px] font-medium">{opt.text}</span>
                  <button
                    onClick={() => handleRemoveOption(opt.id)}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsEditing(false)}
            className="w-full py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-lg"
          >
            Đóng
          </button>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
          {options.map((opt: any, idx: number) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            return (
              <div
                key={opt.id || idx}
                onClick={() => addVote(idx)}
                className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 cursor-pointer hover:border-[#1A73E8] transition relative overflow-hidden group shadow-xs hover:shadow-md"
              >
                <div
                  className={`absolute top-0 bottom-0 left-0 opacity-20 group-hover:opacity-30 transition-all duration-500 ${opt.color || 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative z-10 flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${opt.color || 'bg-blue-500'}`} />
                    {opt.text}
                  </span>
                  <span className="text-[#1A73E8] dark:text-blue-400 font-extrabold font-mono">
                    {opt.votes} ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isEditing && (
        <div className="pt-2 text-[10px] text-gray-400 flex items-center justify-between font-mono">
          <span>Tổng số phiếu: {totalVotes}</span>
          <span className="text-[#1A73E8] font-bold">Nhấp để bình chọn</span>
        </div>
      )}
    </div>
  );
};

// 2. DICE WIDGET (Xúc xắc 3D Sống động)
export const DiceWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const [val1, setVal1] = useState<number>(widget.settings.value || 1);
  const [val2, setVal2] = useState<number | null>(widget.settings.val2 || null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const mode = widget.settings.mode || 'single'; // 'single' or 'double'

  const rollDice = () => {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      const v1 = Math.floor(Math.random() * 6) + 1;
      setVal1(v1);
      if (mode === 'double') {
        const v2 = Math.floor(Math.random() * 6) + 1;
        setVal2(v2);
      }
      playTickSound(0.25);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setIsRolling(false);
        playChimeSound(0.5);
      }
    }, 80);
  };

  const renderDiceFace = (num: number) => {
    // Standard pip layouts for 1-6
    const pips: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const activePips = pips[num] || [];

    return (
      <div
        className={`w-20 h-20 bg-white dark:bg-slate-800 border-4 border-[#1A73E8] rounded-2xl p-2.5 grid grid-cols-3 grid-rows-3 gap-1 shadow-xl transform transition-all duration-300 ${
          isRolling ? 'rotate-180 scale-110 shadow-2xl' : 'hover:scale-105'
        }`}
      >
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {activePips.includes(idx) && (
              <div className="w-3.5 h-3.5 bg-[#1A73E8] dark:bg-blue-400 rounded-full shadow-inner" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const toggleMode = () => {
    const nextMode = mode === 'single' ? 'double' : 'single';
    if (nextMode === 'double' && !val2) setVal2(1);
    onUpdate({ settings: { ...widget.settings, mode: nextMode } });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <div className="flex items-center justify-between w-full border-b pb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Dices className="w-4 h-4 text-[#1A73E8]" /> XÚC XẮC LỚP HỌC
        </span>
        <button
          onClick={toggleMode}
          className="px-2 py-0.5 text-[10px] font-bold bg-[#E8F0FE] text-[#1A73E8] rounded-lg"
        >
          {mode === 'single' ? '1 Xúc xắc' : '2 Xúc xắc'}
        </button>
      </div>

      <div className="my-auto flex items-center justify-center gap-4 cursor-pointer" onClick={rollDice}>
        {renderDiceFace(val1)}
        {mode === 'double' && val2 !== null && renderDiceFace(val2)}
      </div>

      <button
        onClick={rollDice}
        disabled={isRolling}
        className="px-5 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-black rounded-xl text-xs shadow-md active:scale-95 transition"
      >
        {isRolling ? 'Đang Lắc Xúc Xắc...' : 'Tung Xúc Xắc'}
      </button>
    </div>
  );
};

// 3. COIN TOSS WIDGET (Tung Đồng Xu 3D Metallic)
export const CoinTossWidget: React.FC<WidgetProps> = () => {
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [headsCount, setHeadsCount] = useState(0);
  const [tailsCount, setTailsCount] = useState(0);

  const flipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    playTickSound(0.3);

    setTimeout(() => {
      const next = Math.random() > 0.5 ? 'heads' : 'tails';
      setSide(next);
      if (next === 'heads') setHeadsCount((c) => c + 1);
      else setTailsCount((c) => c + 1);
      setIsFlipping(false);
      playChimeSound(0.6);
    }, 700);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <div className="flex items-center justify-between w-full border-b pb-1.5">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <CircleDollarSign className="w-4 h-4 text-amber-500" /> TUNG ĐỒNG XU 3D
        </span>
        <div className="text-[10px] font-mono text-gray-500">
          Sấp: {headsCount} | Ngửa: {tailsCount}
        </div>
      </div>

      <div
        onClick={flipCoin}
        className={`w-24 h-24 rounded-full border-4 border-amber-500 bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 text-amber-950 font-black text-xl flex flex-col items-center justify-center shadow-xl cursor-pointer transform transition-all duration-700 ${
          isFlipping ? 'animate-spin scale-110' : 'hover:scale-105 active:scale-95'
        }`}
      >
        <span className="text-2xl drop-shadow-xs">{side === 'heads' ? '⭐' : '👑'}</span>
        <span className="text-xs font-black uppercase tracking-wider text-amber-950 mt-0.5">
          {side === 'heads' ? 'SẤP' : 'NGỬA'}
        </span>
      </div>

      <button
        onClick={flipCoin}
        disabled={isFlipping}
        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95"
      >
        {isFlipping ? 'Đang Tung...' : 'Tung Đồng Xu'}
      </button>
    </div>
  );
};

// 4. SPINNER WHEEL WIDGET (Vòng quay may mắn phân đoạn)
export const SpinnerWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const options: string[] = widget.settings.options || ['Đội 1', 'Đội 2', 'Đội 3', 'Đội 4', 'Đội 5', 'Đội 6'];
  const [rotation, setRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');

  const colors = [
    '#1A73E8', // Blue
    '#EA4335', // Red
    '#FBBC04', // Yellow
    '#34A853', // Green
    '#A142F4', // Purple
    '#24C1E0', // Teal
  ];

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWinner(null);

    const extraTurns = Math.floor(Math.random() * 360) + 1800; // 5 full turns
    const newRotation = rotation + extraTurns;
    setRotation(newRotation);

    playTickSound(0.3);

    setTimeout(() => {
      setIsSpinning(false);
      const actualDeg = newRotation % 360;
      const sliceAngle = 360 / options.length;
      // Calculate winning option based on top pointer (270 deg / top position)
      const winnerIdx = Math.floor((360 - (actualDeg % 360)) / sliceAngle) % options.length;
      const selectedWinner = options[winnerIdx] || options[0];

      setWinner(selectedWinner);
      playWinnerFanfare(0.8);
      confetti({ particleCount: 50, spread: 60 });
    }, 3200);
  };

  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      onUpdate({ settings: { ...widget.settings, options: lines } });
      setPasteText('');
      setIsEditing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none relative">
      <div className="flex items-center justify-between w-full border-b pb-1">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-[#1A73E8]" /> VÒNG QUAY BÀI HỌC
        </span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-gray-400 hover:text-[#1A73E8] rounded transition text-[10px] font-bold flex items-center gap-1 bg-[#E8F0FE] text-[#1A73E8] px-2 py-0.5"
        >
          <Edit2 className="w-3 h-3" /> {isEditing ? 'Đóng' : 'Sửa danh sách'}
        </button>
      </div>

      {isEditing ? (
        <div className="my-auto w-full p-2 bg-gray-50 dark:bg-slate-800 rounded-xl border space-y-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase block">Dán danh sách tên (mỗi dòng 1 tên)</span>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`An\nBình\nCường\nDung\nGiang\nHoàng`}
            className="w-full h-24 p-2 text-xs bg-white dark:bg-slate-900 rounded-lg border font-mono resize-none"
          />
          <button
            onClick={handleApplyPaste}
            className="w-full py-1.5 bg-[#1A73E8] text-white text-xs font-bold rounded-lg"
          >
            Nạp danh sách mới
          </button>
        </div>
      ) : (
        <>
          {/* Wheel & Pointer Container */}
          <div className="relative w-40 h-40 my-auto flex items-center justify-center">
            {/* Top Pointer Needle */}
            <div className="absolute -top-2 z-30 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-[16px] border-t-rose-600 drop-shadow-md" />

            {/* SVG Wheel with Colored Sectors */}
            <div
              className="w-full h-full rounded-full border-4 border-slate-900 overflow-hidden shadow-2xl transition-transform duration-[3200ms] cubic-bezier(0.15, 0.85, 0.35, 1.0)"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {options.map((opt: string, idx: number) => {
                  const sliceAngle = 360 / options.length;
                  const startAngle = idx * sliceAngle;
                  const endAngle = (idx + 1) * sliceAngle;

                  const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                  const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                  const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                  const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

                  const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                  const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                  return (
                    <path
                      key={idx}
                      d={pathData}
                      fill={colors[idx % colors.length]}
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  );
                })}
              </svg>
              {/* Center Hub */}
              <div className="absolute inset-0 m-auto w-8 h-8 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
            </div>
          </div>

          {winner && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-2xl border border-amber-400 z-40 animate-bounce flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> KẾT QUẢ: {winner}
            </div>
          )}

          <button
            onClick={spin}
            disabled={isSpinning}
            className="px-5 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            {isSpinning ? 'Đang Quay...' : 'Quay Ngay'}
          </button>
        </>
      )}
    </div>
  );
};

// 5. TEXT WIDGET
export const TextWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const content = widget.settings.content || '';

  return (
    <div className="w-full h-full p-2">
      <textarea
        value={content}
        onChange={(e) => onUpdate({ settings: { ...widget.settings, content: e.target.value } })}
        className="w-full h-full bg-transparent border-none focus:outline-none resize-none font-sans font-medium text-slate-800 dark:text-slate-100"
        placeholder="Nhập ghi chú / thông báo bài học..."
      />
    </div>
  );
};

// 6. STICKY NOTE WIDGET
export const StickyNoteWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const content = widget.settings.content || '';
  const color = widget.settings.color || 'bg-amber-100 text-amber-900';

  return (
    <div className={`w-full h-full p-3 rounded-2xl ${color} shadow-sm flex flex-col`}>
      <textarea
        value={content}
        onChange={(e) => onUpdate({ settings: { ...widget.settings, content: e.target.value } })}
        className="w-full h-full bg-transparent border-none focus:outline-none resize-none font-sans font-bold text-sm"
        placeholder="Ghi chú nhanh..."
      />
    </div>
  );
};

// 7. CHECKLIST WIDGET (Danh sách công việc & Tiến độ)
export const ChecklistWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const items: Array<{ id: number; text: string; done: boolean }> = widget.settings.items || [
    { id: 1, text: 'Chuẩn bị SGK & Vở bài tập', done: true },
    { id: 2, text: 'Kiểm tra sĩ số đầu giờ', done: false },
    { id: 3, text: 'Thảo luận nhóm 5 phút', done: false },
  ];

  const [newItemText, setNewItemText] = useState('');

  const toggleDone = (id: number) => {
    const updated = items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    playChimeSound(0.3);
    onUpdate({ settings: { ...widget.settings, items: updated } });
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItem = { id: Date.now(), text: newItemText.trim(), done: false };
    onUpdate({ settings: { ...widget.settings, items: [...items, newItem] } });
    setNewItemText('');
  };

  const removeItem = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.filter((i) => i.id !== id);
    onUpdate({ settings: { ...widget.settings, items: updated } });
  };

  const resetAll = () => {
    const updated = items.map((i) => ({ ...i, done: false }));
    onUpdate({ settings: { ...widget.settings, items: updated } });
  };

  const completedCount = items.filter((i) => i.done).length;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="w-full h-full p-3 flex flex-col justify-between select-none">
      <div className="flex items-center justify-between pb-1 border-b mb-1">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
          📋 MỤC TIÊU & TIẾN ĐỘ ({completedCount}/{items.length})
        </span>
        <button
          onClick={resetAll}
          className="text-[10px] font-bold text-gray-400 hover:text-blue-500"
          title="Bỏ chọn tất cả"
        >
          Đặt lại
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden my-1">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex-1 space-y-1 my-1 overflow-y-auto max-h-[140px]">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleDone(item.id)}
            className="flex items-center justify-between text-xs font-semibold cursor-pointer p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition group"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                  item.done ? 'bg-[#1A73E8] border-[#1A73E8] text-white' : 'border-gray-400'
                }`}
              >
                {item.done && <Check className="w-3 h-3" />}
              </div>
              <span className={item.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-slate-100'}>
                {item.text}
              </span>
            </div>
            <button
              onClick={(e) => removeItem(item.id, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-rose-500 rounded"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Quick Add Input */}
      <div className="flex items-center gap-1 pt-1 border-t">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Thêm mục cần làm..."
          className="flex-1 p-1 text-xs border rounded-lg dark:bg-slate-900 font-medium"
        />
        <button
          onClick={addItem}
          className="p-1 bg-[#1A73E8] text-white rounded-lg hover:bg-[#1557B0]"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// 8. QR CODE WIDGET
export const QRCodeWidget: React.FC<WidgetProps> = ({ widget }) => {
  const url = widget.settings.url || 'https://edu.google.com';
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { width: 180, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [url]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <span className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
        MÃ QR TRUY CẬP
      </span>
      {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 rounded-xl border p-1" />}
      <span className="text-[10px] text-gray-400 truncate max-w-full font-mono">{url}</span>
    </div>
  );
};

// 9. DRAW WIDGET (Bảng vẽ tương tác mini)
export const DrawWidget: React.FC<WidgetProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1A73E8');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Set initial canvas size relative to container
    canvas.width = canvas.parentElement?.clientWidth || 300;
    canvas.height = canvas.parentElement?.clientHeight || 200;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = isEraser ? '#ffffff' : color;
    ctx.lineWidth = isEraser ? brushSize * 4 : brushSize;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl p-2 flex flex-col justify-between select-none relative group">
      {/* Canvas Tool Palette Header */}
      <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b text-xs">
        <div className="flex items-center gap-1">
          {['#1A73E8', '#EA4335', '#FBBC04', '#34A853', '#A142F4', '#000000'].map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setIsEraser(false);
              }}
              style={{ backgroundColor: c }}
              className={`w-4 h-4 rounded-full border border-white dark:border-slate-800 transition ${
                !isEraser && color === c ? 'scale-125 ring-2 ring-blue-500' : 'hover:scale-110'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEraser(!isEraser)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isEraser ? 'bg-rose-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
            }`}
          >
            {isEraser ? '🧹 Tẩy' : '✏️ Vẽ'}
          </button>
          <button
            onClick={clearCanvas}
            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded text-[10px] font-bold"
          >
            Xóa
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 w-full relative bg-white dark:bg-slate-950 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
};

// 10. STICKER WIDGET (Nhãn dán Khen thưởng & Tuyên dương)
export const StickerWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const emoji = widget.settings.emoji || '⭐';
  const badgeText = widget.settings.badgeText || 'XUẤT SẮC!';
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const emojiList = ['⭐', '🌟', '🏆', '🥇', '💯', '👏', '🎉', '🚀', '❤️', '🎯', '💡', '💎', '👑', '🔥'];

  const triggerReaction = () => {
    playWinnerFanfare(0.6);
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-2 select-none relative group">
      <button
        onClick={() => setIsPickerOpen(!isPickerOpen)}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-gray-600 dark:text-slate-300 transition z-20"
      >
        ⚙️ Đổi
      </button>

      {isPickerOpen ? (
        <div className="my-auto w-full p-2 bg-white dark:bg-slate-800 border rounded-xl shadow-lg z-30 space-y-2">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Chọn biểu tượng</div>
          <div className="grid grid-cols-7 gap-1 text-base">
            {emojiList.map((e) => (
              <button
                key={e}
                onClick={() => {
                  onUpdate({ settings: { ...widget.settings, emoji: e } });
                  setIsPickerOpen(false);
                }}
                className="hover:scale-125 transition p-1"
              >
                {e}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase pt-1">Nhãn tuyên dương</div>
          <input
            type="text"
            value={badgeText}
            onChange={(e) => onUpdate({ settings: { ...widget.settings, badgeText: e.target.value } })}
            placeholder="Tên danh hiệu..."
            className="w-full p-1 text-xs border rounded-lg dark:bg-slate-900 font-bold text-center"
          />
        </div>
      ) : (
        <div
          onClick={triggerReaction}
          className="my-auto flex flex-col items-center cursor-pointer hover:scale-105 active:scale-95 transition"
        >
          <div className="text-6xl filter drop-shadow-lg animate-bounce">{emoji}</div>
          {badgeText && (
            <span className="mt-1 px-3 py-0.5 bg-amber-400 text-amber-950 text-xs font-black rounded-full uppercase tracking-wider shadow-sm">
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
