import React, { useState, useEffect, useRef } from 'react';
import { ClassroomWidget, StudentList } from '../../types';
import { playChimeSound, playAttentionBell, playWinnerFanfare, playTickSound } from '../../services/audio';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, Shuffle, Users, Plus, Minus, Trophy, Bell, RotateCcw } from 'lucide-react';

interface WidgetProps {
  widget: ClassroomWidget;
  onUpdate: (partial: Partial<ClassroomWidget>) => void;
  studentLists?: StudentList[];
}

// 1. TRAFFIC LIGHT WIDGET
export const TrafficLightWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const currentState = widget.settings.state || 'green';
  const labels = widget.settings.labels || {
    green: 'Hoạt động bình thường',
    yellow: 'Giảm âm lượng',
    red: 'Dừng lại quan sát',
  };

  const setLight = (state: 'green' | 'yellow' | 'red') => {
    playChimeSound(0.5);
    onUpdate({ settings: { ...widget.settings, state } });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        ĐÈN TÍN HIỆU LỚP HỌC
      </div>

      <div className="flex items-center gap-4 my-auto">
        {/* Red */}
        <button
          onClick={() => setLight('red')}
          className={`w-14 h-14 rounded-full border-4 transition-all transform ${
            currentState === 'red'
              ? 'bg-red-500 border-red-300 shadow-lg shadow-red-500/50 scale-110'
              : 'bg-red-950/30 border-red-900/50 opacity-40'
          }`}
          title="Đỏ - Dừng lại"
        />
        {/* Yellow */}
        <button
          onClick={() => setLight('yellow')}
          className={`w-14 h-14 rounded-full border-4 transition-all transform ${
            currentState === 'yellow'
              ? 'bg-amber-400 border-amber-200 shadow-lg shadow-amber-400/50 scale-110'
              : 'bg-amber-950/30 border-amber-900/50 opacity-40'
          }`}
          title="Vàng - Chú ý"
        />
        {/* Green */}
        <button
          onClick={() => setLight('green')}
          className={`w-14 h-14 rounded-full border-4 transition-all transform ${
            currentState === 'green'
              ? 'bg-emerald-500 border-emerald-300 shadow-lg shadow-emerald-500/50 scale-110'
              : 'bg-emerald-950/30 border-emerald-900/50 opacity-40'
          }`}
          title="Xanh - Hoạt động"
        />
      </div>

      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-center">
        {labels[currentState as keyof typeof labels]}
      </div>
    </div>
  );
};

// 2. WORK SYMBOLS WIDGET
export const WorkSymbolsWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const activeSymbol = widget.settings.activeSymbol || 'silent';

  const symbols = [
    { id: 'silent', name: 'Im lặng', icon: '🤫' },
    { id: 'whisper', name: 'Thì thầm', icon: '🗣️' },
    { id: 'pair', name: 'Thảo luận cặp', icon: '👥' },
    { id: 'group', name: 'Thảo luận nhóm', icon: '👨‍👩‍👧‍👦' },
  ];

  const selectSymbol = (id: string) => {
    playChimeSound(0.5);
    onUpdate({ settings: { ...widget.settings, activeSymbol: id } });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        CHẾ ĐỘ LÀM VIỆC
      </div>

      <div className="grid grid-cols-4 gap-2 w-full my-auto">
        {symbols.map((s) => (
          <button
            key={s.id}
            onClick={() => selectSymbol(s.id)}
            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              activeSymbol === s.id
                ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-2xl">{s.icon}</span>
            <span className="text-[10px] font-bold text-center leading-tight">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// 3. SOUND LEVEL NOISE METER WIDGET
export const SoundLevelWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const [level, setLevel] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const threshold = widget.settings.threshold || 65;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);

  const startMic = async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      setIsListening(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));

        setLevel((prev) => Math.round(prev * 0.7 + normalized * 0.3)); // Smooth transition

        if (normalized > threshold) {
          playChimeSound(0.2);
        }

        animRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err: any) {
      setPermissionError('Chưa cấp quyền Microphone hoặc trình duyệt không hỗ trợ.');
      setIsListening(false);
    }
  };

  const stopMic = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    setIsListening(false);
    setLevel(0);
  };

  useEffect(() => {
    return () => stopMic();
  }, []);

  const isExceeded = level > threshold;

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 select-none">
      <div className="flex items-center justify-between w-full text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1">
          <Volume2 className="w-4 h-4 text-blue-600" /> ĐO TIẾNG ỒN LỚP HỌC
        </span>
        {isListening && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExceeded ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
            {isExceeded ? 'VƯỢT NGƯỠNG!' : 'BÌNH THƯỜNG'}
          </span>
        )}
      </div>

      {permissionError ? (
        <div className="text-xs text-red-500 text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg my-auto">
          {permissionError}
        </div>
      ) : !isListening ? (
        <div className="flex flex-col items-center my-auto">
          <p className="text-xs text-slate-500 mb-2 text-center">Bật Micro để bắt đầu phân tích tiếng ồn</p>
          <button
            onClick={startMic}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
          >
            <Volume2 className="w-4 h-4" /> Bật Đo Tiếng Ồn
          </button>
        </div>
      ) : (
        <div className="w-full my-auto space-y-2">
          {/* Bar */}
          <div className="relative w-full h-8 bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden p-1 flex items-center">
            <div
              className={`h-full rounded-lg transition-all duration-100 ${
                isExceeded ? 'bg-red-500 shadow-lg shadow-red-500/50' : level > threshold * 0.8 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${level}%` }}
            />
            {/* Threshold Marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-slate-900 dark:bg-white z-10"
              style={{ left: `${threshold}%` }}
              title={`Ngưỡng cảnh báo: ${threshold}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400">
            <span>0%</span>
            <span>Ngưỡng: {threshold}%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {isListening && (
        <button
          onClick={stopMic}
          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
        >
          <VolumeX className="w-3.5 h-3.5 inline mr-1" /> Tắt Đo
        </button>
      )}
    </div>
  );
};

// 4. ATTENTION SIGNAL WIDGET (Tín hiệu tập trung đa dạng)
export const AttentionSignalWidget: React.FC<WidgetProps> = () => {
  const [isFlashing, setIsFlashing] = useState(false);

  const triggerFlash = () => {
    setIsFlashing(true);
    playAttentionBell(0.8);
    setTimeout(() => setIsFlashing(false), 1200);
  };

  const signals = [
    {
      name: 'Chuông Báo',
      icon: <Bell className="w-4 h-4 text-blue-600" />,
      action: () => playAttentionBell(0.8),
      bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 text-blue-700 dark:text-blue-300',
    },
    {
      name: 'Tuyên Dương',
      icon: <Trophy className="w-4 h-4 text-amber-500" />,
      action: () => playWinnerFanfare(0.8),
      bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 text-amber-700 dark:text-amber-300',
    },
    {
      name: 'Tiếng Chuông Gió',
      icon: <Volume2 className="w-4 h-4 text-emerald-600" />,
      action: () => playChimeSound(0.8),
      bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 text-emerald-700 dark:text-emerald-300',
    },
    {
      name: 'Gõ Nhịp Lớp',
      icon: <RotateCcw className="w-4 h-4 text-indigo-600" />,
      action: () => {
        let count = 0;
        const timer = setInterval(() => {
          playTickSound(0.5);
          count++;
          if (count >= 5) clearInterval(timer);
        }, 300);
      },
      bg: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 text-indigo-700 dark:text-indigo-300',
    },
    {
      name: 'Chớp Đèn Chú Ý',
      icon: <VolumeX className="w-4 h-4 text-purple-600" />,
      action: triggerFlash,
      bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 text-purple-700 dark:text-purple-300',
    },
  ];

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-between p-3 select-none text-center transition-all duration-300 ${
        isFlashing ? 'bg-amber-300 dark:bg-purple-900 ring-4 ring-amber-500 scale-102' : ''
      }`}
    >
      <div className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
        <Bell className="w-3.5 h-3.5 text-blue-500" /> TÍN HIỆU TẬP TRUNG LỚP
      </div>
      <div className="grid grid-cols-2 gap-1.5 w-full my-auto">
        {signals.map((s, idx) => (
          <button
            key={idx}
            onClick={s.action}
            className={`p-2 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 hover:shadow-xs ${s.bg}`}
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>
    </div>
  );
};

// 5. SCOREBOARD WIDGET (Bảng thi đua cộng trừ điểm thi đấu)
export const ScoreboardWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const teams = widget.settings.teams || [
    { id: 't1', name: 'Đội A', score: 0, color: '#1a73e8' },
    { id: 't2', name: 'Đội B', score: 0, color: '#e37400' },
  ];

  const teamColors = ['#1a73e8', '#e37400', '#34a853', '#a142f4', '#ea4335', '#00838f'];

  const changeScore = (id: string, delta: number) => {
    const updated = teams.map((t: any) => {
      if (t.id === id) {
        const nextScore = Math.max(0, t.score + delta);
        if (delta > 0) {
          playChimeSound(0.5);
          if (nextScore > 0 && nextScore % 10 === 0) {
            playWinnerFanfare(0.8);
            confetti({ particleCount: 40, spread: 50 });
          }
        }
        return { ...t, score: nextScore };
      }
      return t;
    });
    onUpdate({ settings: { ...widget.settings, teams: updated } });
  };

  const addTeam = () => {
    if (teams.length >= 6) return;
    const newTeam = {
      id: `t_${Date.now()}`,
      name: `Đội ${teams.length + 1}`,
      score: 0,
      color: teamColors[teams.length % teamColors.length],
    };
    onUpdate({ settings: { ...widget.settings, teams: [...teams, newTeam] } });
  };

  const resetAll = () => {
    const updated = teams.map((t: any) => ({ ...t, score: 0 }));
    onUpdate({ settings: { ...widget.settings, teams: updated } });
  };

  return (
    <div className="w-full h-full flex flex-col p-3 select-none">
      <div className="flex items-center justify-between w-full mb-2 border-b pb-1">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
          <Trophy className="w-4 h-4 text-amber-500" /> BẢNG ĐIỂM THI ĐUA
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={addTeam}
            disabled={teams.length >= 6}
            className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 text-[10px] font-bold rounded-lg hover:bg-blue-100 disabled:opacity-30"
          >
            + Đội
          </button>
          <button
            onClick={resetAll}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            title="Đặt lại điểm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto">
        {teams.map((t: any) => (
          <div
            key={t.id}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center justify-between shadow-xs hover:shadow-md transition"
          >
            <input
              type="text"
              value={t.name}
              onChange={(e) => {
                const updated = teams.map((tm: any) =>
                  tm.id === t.id ? { ...tm, name: e.target.value } : tm
                );
                onUpdate({ settings: { ...widget.settings, teams: updated } });
              }}
              style={{ color: t.color }}
              className="text-xs font-bold text-center bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 outline-none w-full"
            />
            <span className="text-3xl font-black font-mono my-1 text-slate-800 dark:text-slate-100">
              {t.score}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => changeScore(t.id, -1)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg active:scale-95 transition"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => changeScore(t.id, 1)}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 6. RANDOMIZER / NAME PICKER WIDGET
export const RandomizerWidget: React.FC<WidgetProps> = ({ studentLists }) => {
  const activeList = studentLists?.[0];
  const students = activeList?.students.filter((s) => !s.absent) || [];
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  const pickRandom = () => {
    if (students.length === 0) return;
    setIsSpinning(true);
    setSelectedStudent(null);

    let count = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * students.length);
      setSelectedStudent(students[idx].displayName);
      count++;
      if (count >= 15) {
        clearInterval(interval);
        setIsSpinning(false);
        playWinnerFanfare(0.8);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    }, 100);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 select-none text-center">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        CHỌN HỌC SINH NGẪU NHIÊN
      </div>

      <div className="my-auto">
        <div className={`text-2xl md:text-3xl font-black transition-all ${isSpinning ? 'text-blue-500 animate-pulse' : 'text-slate-800 dark:text-slate-100'}`}>
          {selectedStudent || 'Nhấn nút để chọn'}
        </div>
        {activeList && (
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            Danh sách: {activeList.name} ({students.length} học sinh)
          </div>
        )}
      </div>

      <button
        onClick={pickRandom}
        disabled={isSpinning || students.length === 0}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg flex items-center gap-2 transition disabled:opacity-50"
      >
        <Shuffle className="w-4 h-4" /> {isSpinning ? 'Đang chọn...' : 'Chọn Ngẫu Nhiên'}
      </button>
    </div>
  );
};

// 7. GROUP MAKER WIDGET
export const GroupMakerWidget: React.FC<WidgetProps> = ({ widget, studentLists }) => {
  const activeList = studentLists?.[0];
  const students = activeList?.students.filter((s) => !s.absent) || [];
  const groupCount = widget.settings.groupCount || 4;
  const [groups, setGroups] = useState<string[][]>([]);

  const makeGroups = () => {
    if (students.length === 0) return;
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const result: string[][] = Array.from({ length: groupCount }, () => []);

    shuffled.forEach((s, idx) => {
      result[idx % groupCount].push(s.displayName);
    });

    setGroups(result);
    playWinnerFanfare(0.5);
  };

  return (
    <div className="w-full h-full flex flex-col p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Users className="w-4 h-4 text-blue-600" /> CHIA NHÓM TỰ ĐỘNG
        </span>
        <button
          onClick={makeGroups}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          Chia {groupCount} nhóm
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="col-span-2 text-center text-xs text-slate-400 my-auto">
            Nhấn nút trên để tự động chia nhóm
          </div>
        ) : (
          groups.map((grp, idx) => (
            <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 border-b pb-1 mb-1">
                Nhóm {idx + 1} ({grp.length})
              </div>
              <ul className="text-[11px] space-y-0.5 text-slate-700 dark:text-slate-300 font-medium">
                {grp.map((name, i) => (
                  <li key={i} className="truncate">• {name}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
