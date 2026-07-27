import React, { useState, useEffect } from 'react';
import { ClassroomWidget } from '../../types';
import { playTimerAlarm, playTickSound, playChimeSound, playWinnerFanfare, playAlertSound, AlertSoundType } from '../../services/audio';
import { exportToCSV } from '../../services/exportImport';
import confetti from 'canvas-confetti';
import { Play, Pause, RotateCcw, Plus, Minus, Download, Flag, CheckCircle2, Volume2, VolumeX, Sparkles, Clock, Bell } from 'lucide-react';

interface WidgetProps {
  widget: ClassroomWidget;
  onUpdate: (partial: Partial<ClassroomWidget>) => void;
  readOnly?: boolean;
}

// 1. CLOCK WIDGET
export const ClockWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const [time, setTime] = useState(new Date());
  const mode = widget.settings.mode || 'digital';
  const is24Hour = widget.settings.is24Hour !== false;
  const showSeconds = widget.settings.showSeconds !== false;
  const showDate = widget.settings.showDate !== false;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('vi-VN', {
    hour12: !is24Hour,
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
  });

  const dateStr = time.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 select-none text-center">
      {mode === 'digital' ? (
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl md:text-5xl font-black tracking-tight text-blue-600 dark:text-blue-400 font-mono">
            {timeStr}
          </div>
          {showDate && (
            <div className="mt-2 text-sm md:text-base font-medium text-slate-600 dark:text-slate-300 capitalize">
              {dateStr}
            </div>
          )}
        </div>
      ) : (
        // Analog Clock
        <div className="relative w-36 h-36 border-4 border-blue-600 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 shadow-inner">
          <div
            className="absolute w-1 h-10 bg-slate-800 dark:bg-white rounded origin-bottom bottom-1/2"
            style={{ transform: `rotate(${(time.getHours() % 12) * 30 + time.getMinutes() * 0.5}deg)` }}
          />
          <div
            className="absolute w-0.5 h-14 bg-blue-600 rounded origin-bottom bottom-1/2"
            style={{ transform: `rotate(${time.getMinutes() * 6}deg)` }}
          />
          {showSeconds && (
            <div
              className="absolute w-0.5 h-16 bg-red-500 rounded origin-bottom bottom-1/2"
              style={{ transform: `rotate(${time.getSeconds() * 6}deg)` }}
            />
          )}
          <div className="w-3 h-3 bg-blue-600 rounded-full z-10" />
        </div>
      )}
    </div>
  );
};

// 2. TIMER WIDGET (Bộ đếm ngược lớp học tương tác)
export const TimerWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const [duration, setDuration] = useState<number>(widget.settings.durationSeconds || 300);
  const [remaining, setRemaining] = useState<number>(widget.settings.remainingSeconds ?? duration);
  const [isRunning, setIsRunning] = useState<boolean>(widget.settings.isRunning || false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(widget.settings.soundEnabled !== false);
  const [alarmSound, setAlarmSound] = useState<AlertSoundType>(widget.settings.alarmSound || 'alarm');
  const [isSoundMenuOpen, setIsSoundMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setRemaining((prev) => {
          const next = prev - 1;
          if (next === 0) {
            if (soundEnabled) playAlertSound(alarmSound, 0.9);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, soundEnabled, alarmSound]);

  const toggleTimer = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    onUpdate({ settings: { ...widget.settings, isRunning: nextRunning, remainingSeconds: remaining, durationSeconds: duration, alarmSound } });
  };

  const resetTimer = () => {
    setIsRunning(false);
    setRemaining(duration);
    onUpdate({ settings: { ...widget.settings, isRunning: false, remainingSeconds: duration, alarmSound } });
  };

  const setPreset = (secs: number) => {
    setIsRunning(false);
    setDuration(secs);
    setRemaining(secs);
    onUpdate({ settings: { ...widget.settings, isRunning: false, durationSeconds: secs, remainingSeconds: secs, alarmSound } });
  };

  const adjustTime = (secs: number) => {
    setRemaining((prev) => {
      const next = Math.max(-3600, prev + secs);
      if (next > duration) setDuration(next);
      return next;
    });
  };

  const selectSound = (type: AlertSoundType) => {
    setAlarmSound(type);
    playAlertSound(type, 0.8);
    onUpdate({ settings: { ...widget.settings, alarmSound: type } });
  };

  const soundOptions: Array<{ id: AlertSoundType; label: string; icon: string }> = [
    { id: 'alarm', label: 'Còi báo Bíp', icon: '🚨' },
    { id: 'bell', label: 'Chuông lớp', icon: '🔔' },
    { id: 'chime', label: 'Chuông ngân', icon: '🎶' },
    { id: 'fanfare', label: 'Tuyên dương', icon: '🎺' },
  ];

  const isOvertime = remaining < 0;
  const absSecs = Math.abs(remaining);
  const mins = Math.floor(absSecs / 60);
  const secs = absSecs % 60;
  const formatTimeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Calculate visual progress percentage (0 to 100)
  const progressPct = duration > 0 ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 0;

  // Determine progress color
  let progressColorClass = 'text-blue-600 dark:text-blue-400';
  let barBgClass = 'bg-[#1A73E8]';
  if (isOvertime) {
    progressColorClass = 'text-rose-600 dark:text-rose-400';
    barBgClass = 'bg-rose-600';
  } else if (progressPct < 20) {
    progressColorClass = 'text-rose-500 dark:text-rose-400';
    barBgClass = 'bg-rose-500';
  } else if (progressPct < 50) {
    progressColorClass = 'text-amber-500 dark:text-amber-400';
    barBgClass = 'bg-amber-500';
  }

  const presets = [
    { label: '30s', secs: 30 },
    { label: '1m', secs: 60 },
    { label: '3m', secs: 180 },
    { label: '5m', secs: 300 },
    { label: '10m', secs: 600 },
    { label: '15m', secs: 900 },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none relative group">
      {/* Widget Header & Sound Options Toggle */}
      <div className="flex items-center justify-between w-full text-xs font-bold text-slate-500 dark:text-slate-400 border-b pb-1">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-blue-500" /> BỘ ĐẾM NGƯỢC
        </span>
        <div className="flex items-center gap-1.5">
          {isOvertime && (
            <span className="text-[10px] bg-rose-100 dark:bg-rose-900/40 text-rose-600 font-bold px-2 py-0.5 rounded-full animate-pulse">
              ĐÃ QUÁ GIỜ!
            </span>
          )}
          <button
            onClick={() => setIsSoundMenuOpen(!isSoundMenuOpen)}
            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold flex items-center gap-1 transition"
            title="Chọn âm thanh báo khi hết giờ"
          >
            <Bell className="w-3 h-3 text-amber-500" />
            <span>{soundOptions.find((s) => s.id === alarmSound)?.icon}</span>
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition"
            title={soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Sound Selection Dropdown Modal / Popover */}
      {isSoundMenuOpen && (
        <div className="absolute top-8 right-2 z-30 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg w-48 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1 border-b">
            Âm thanh báo khi hết giờ
          </div>
          {soundOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => selectSound(opt.id)}
              className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold transition ${
                alarmSound === opt.id
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </span>
              <span
                className="text-[10px] text-blue-500 hover:underline px-1 py-0.5 rounded bg-blue-100/50 dark:bg-blue-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  playAlertSound(opt.id, 0.8);
                }}
              >
                Thử
              </span>
            </button>
          ))}
          <button
            onClick={() => setIsSoundMenuOpen(false)}
            className="w-full mt-1 pt-1 border-t text-[10px] font-bold text-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Digital Time & Circular Progress Display */}
      <div className="my-auto flex flex-col items-center justify-center relative w-full py-1">
        <div className="relative flex items-center justify-center">
          {/* Circular Progress Ring */}
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="3"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`${progressColorClass} transition-all duration-300`}
              strokeDasharray={`${isOvertime ? 100 : progressPct}, 100`}
              strokeWidth="3"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>

          {/* Time Display Text */}
          <div className="absolute flex flex-col items-center justify-center">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                isOvertime ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {isOvertime ? `-${formatTimeStr}` : formatTimeStr}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {isRunning ? 'Đang đếm...' : 'Tạm dừng'}
            </span>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2 max-w-[200px]">
          <div
            className={`h-full transition-all duration-300 ${barBgClass}`}
            style={{ width: `${isOvertime ? 100 : progressPct}%` }}
          />
        </div>
      </div>

      {/* Quick Time Presets */}
      <div className="flex items-center justify-center gap-1 w-full my-1 overflow-x-auto py-0.5">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p.secs)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition active:scale-95 ${
              duration === p.secs
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main Action Controls: Start/Stop, Reset, Time Adjustments */}
      <div className="flex items-center gap-1.5 w-full justify-center pt-1 border-t">
        <button
          onClick={toggleTimer}
          className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 shadow-xs ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-[#1A73E8] hover:bg-[#1557B0]'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
        </button>

        <button
          onClick={resetTimer}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition active:scale-95"
          title="Đặt lại"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => adjustTime(-30)}
            className="px-1.5 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg"
            title="Trừ 30 giây"
          >
            -30s
          </button>
          <button
            onClick={() => adjustTime(30)}
            className="px-1.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg"
            title="Cộng 30 giây"
          >
            +30s
          </button>
          <button
            onClick={() => adjustTime(60)}
            className="px-1.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg"
            title="Cộng 1 phút"
          >
            +1m
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. VISUAL TIMER WIDGET
export const VisualTimerWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const duration = widget.settings.durationSeconds || 180;
  const [remaining, setRemaining] = useState<number>(duration);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && remaining > 0) {
      interval = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            playTimerAlarm();
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, remaining]);

  const percentage = Math.max(0, Math.min(100, (remaining / duration) * 100));

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <div className="relative w-32 h-32 flex items-center justify-center my-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-200 dark:text-slate-700"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={`${percentage < 20 ? 'text-red-500' : percentage < 50 ? 'text-amber-500' : 'text-blue-600'} transition-all duration-500`}
            strokeDasharray={`${percentage}, 100`}
            strokeWidth="3.5"
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span className="absolute text-xl font-black font-mono text-slate-800 dark:text-slate-100">
          {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
        >
          {isRunning ? 'Tạm dừng' : 'Bắt đầu'}
        </button>
        <button
          onClick={() => {
            setIsRunning(false);
            setRemaining(duration);
          }}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
        >
          Đặt lại
        </button>
      </div>
    </div>
  );
};

// 4. STOPWATCH WIDGET
export const StopwatchWidget: React.FC<WidgetProps> = ({ widget }) => {
  const [elapsed, setElapsed] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<number[]>([]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => setElapsed((prev) => prev + 100), 100);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const addLap = () => {
    setLaps((prev) => [elapsed, ...prev]);
  };

  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
    setLaps([]);
  };

  const formatMs = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  const handleExportCSV = () => {
    const rows = laps.map((lap, idx) => [`Vòng ${laps.length - idx}`, formatMs(lap)]);
    exportToCSV('stopwatch_laps', ['Thứ tự', 'Thời gian'], rows);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <div className="text-3xl font-black font-mono text-slate-800 dark:text-slate-100 my-1">
        {formatMs(elapsed)}
      </div>

      <div className="flex items-center gap-1.5 my-1">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
        >
          {isRunning ? 'Tạm dừng' : 'Bắt đầu'}
        </button>
        <button
          onClick={addLap}
          disabled={!isRunning}
          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
        >
          <Flag className="w-3.5 h-3.5 inline mr-1" /> Vòng
        </button>
        <button
          onClick={reset}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
        >
          Đặt lại
        </button>
      </div>

      {laps.length > 0 && (
        <div className="w-full max-h-24 overflow-y-auto text-xs space-y-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 mt-1">
          <div className="flex items-center justify-between text-slate-500 font-medium pb-1 border-b">
            <span>Danh sách vòng ({laps.length})</span>
            <button onClick={handleExportCSV} className="text-blue-600 hover:underline flex items-center gap-1">
              <Download className="w-3 h-3" /> Xuất CSV
            </button>
          </div>
          {laps.map((lap, idx) => (
            <div key={idx} className="flex justify-between font-mono text-slate-700 dark:text-slate-300">
              <span>Vòng {laps.length - idx}:</span>
              <span className="font-bold">{formatMs(lap)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 5. COUNTDOWN WIDGET
export const CountdownWidget: React.FC<WidgetProps> = ({ widget }) => {
  const title = widget.settings.title || 'Đếm ngược sự kiện';
  const target = widget.settings.targetTimestamp || Date.now() + 86400000;
  const [diff, setDiff] = useState<number>(Math.max(0, target - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      setDiff(Math.max(0, target - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none">
      <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">
        {title}
      </div>
      <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center">
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">{days}</div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Ngày</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center">
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">{hours}</div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Giờ</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center">
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">{minutes}</div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Phút</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center">
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">{seconds}</div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Giây</div>
        </div>
      </div>
    </div>
  );
};

// 6. CALENDAR WIDGET
export const CalendarWidget: React.FC<WidgetProps> = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="w-full h-full flex flex-col p-3 select-none">
      <div className="text-center font-bold text-slate-800 dark:text-slate-100 text-sm mb-2">
        Tháng {month + 1}, {year}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 mb-1">
        <span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs flex-1">
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`p-1.5 rounded-lg flex items-center justify-center font-medium ${
              day === today.getDate()
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : day
                ? 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                : ''
            }`}
          >
            {day || ''}
          </div>
        ))}
      </div>
    </div>
  );
};

// 7. TIMETABLE / AGENDA WIDGET
export const TimetableWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const items = widget.settings.items || [];

  const toggleItemStatus = (idx: number) => {
    const updated = items.map((item: any, i: number) => {
      if (i === idx) {
        const nextStatus = item.status === 'done' ? 'pending' : 'done';
        return { ...item, status: nextStatus };
      }
      return item;
    });
    onUpdate({ settings: { ...widget.settings, items: updated } });
  };

  return (
    <div className="w-full h-full flex flex-col p-3 select-none overflow-hidden">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        LỊCH TRÌNH TIẾT HỌC
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 ? (
          <div className="text-xs text-slate-400 italic">Chưa có các bước trong tiết học</div>
        ) : (
          items.map((item: any, idx: number) => (
            <div
              key={item.id || idx}
              onClick={() => toggleItemStatus(idx)}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                item.status === 'done'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`w-4 h-4 ${item.status === 'done' ? 'text-emerald-600' : 'text-slate-300'}`}
                />
                <span className={`text-xs font-semibold ${item.status === 'done' ? 'line-through opacity-80' : ''}`}>
                  {item.title}
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {item.duration}p
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
