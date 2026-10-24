import React, { useCallback, useEffect, useState } from 'react';
import {
  BellOff, Check, ChevronRight, ClipboardPenLine, CloudRain, Headphones,
  Moon, Pause, Play, SlidersHorizontal, Sparkles, Sun, TimerReset,
  Volume2, X, Waves, MoreHorizontal,
} from 'lucide-react';
import useFocusTimer, { FOCUS_TIMER_PRESETS } from './useFocusTimer.js';
import useFocusSoundMixer from './useFocusSoundMixer.js';
import Focus6Tasks from './Focus6Tasks.jsx';
import useFocusSoundscape, { FOCUS_SOUNDS, FOCUS_SOUND_LABELS } from './useFocusSoundscape.js';
import FocusNotes from './FocusNotes.jsx';

const STORAGE_PREFIX = 'bfc-preferences-v4:';
function readPersonal(userId) {
  const defaults = { brightness: null, dnd: false };
  if (!userId || typeof localStorage === 'undefined') return defaults;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + userId) || '{}');
    return {
      brightness: Number.isFinite(saved.brightness) && saved.brightness >= 0 && saved.brightness <= 85
        ? saved.brightness : null,
      dnd: saved.dnd === true,
    };
  } catch { return defaults; }
}
function focusChime() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const audio = new Context();
    const tone = audio.createOscillator();
    const level = audio.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(640, audio.currentTime);
    tone.frequency.exponentialRampToValueAtTime(830, audio.currentTime + .17);
    level.gain.setValueAtTime(.0001, audio.currentTime);
    level.gain.exponentialRampToValueAtTime(.05, audio.currentTime + .02);
    level.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .55);
    tone.connect(level).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + .56);
    tone.onended = () => audio.close().catch(() => {});
  } catch { /* Browser may block sound until a gesture; never break the timer. */ }
}
const TOOL_META = [
  { id:'timer', Icon:TimerReset, vi:'Hẹn giờ', en:'Timer' },
  { id:'notes', Icon:ClipboardPenLine, vi:'Ghi chú', en:'Notes' },
  { id:'soundscape', Icon:Waves, vi:'Âm thanh', en:'Soundscape' },
  { id:'brightness', Icon:Sun, vi:'Độ sáng', en:'Brightness' },
];

export default function FocusWorkspace({
  currentUser, language = 'vi', activeTool, onChangeTool,
  onBrightnessChange, onDndChange, onSoundscapeActiveChange, onQuickToolsOpenChange,
  appearance, timerController, completedSessions=0,
}) {
  const vi = language !== 'en';
  const [prefs, setPrefs] = useState(() => readPersonal(currentUser?.id));
  const [customMinutes, setCustomMinutes] = useState(30);
  const [timerFinished, setTimerFinished] = useState(false);
  const [soundError, setSoundError] = useState('');
  const [quickExpanded, setQuickExpanded] = useState(false);
  useEffect(() => { onQuickToolsOpenChange?.(quickExpanded); }, [quickExpanded, onQuickToolsOpenChange]);
  const onTimerComplete = useCallback(() => {
    setTimerFinished(true);
    focusChime();
  }, []);
  const timer = timerController;
  const soundscape = useFocusSoundMixer(currentUser?.id);
  const arrangedTools = [...TOOL_META].sort((a,b)=> (appearance?.dock?.indexOf(a.id)??0)-(appearance?.dock?.indexOf(b.id)??0));

  useEffect(() => {
    const next = readPersonal(currentUser?.id);
    setPrefs(next);
    onBrightnessChange?.(next.brightness);
    onDndChange?.(next.dnd);
  }, [currentUser?.id]);
  useEffect(() => {
    onSoundscapeActiveChange?.(soundscape.playing);
  }, [soundscape.playing, onSoundscapeActiveChange]);
  useEffect(() => {
    const onYoutubeUnmute = () => { soundscape.stop().catch(() => {}); };
    window.addEventListener('bfc-youtube-unmute', onYoutubeUnmute);
    return () => window.removeEventListener('bfc-youtube-unmute', onYoutubeUnmute);
  }, [soundscape.stop]);

  const savePrefs = patch => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (currentUser?.id) {
      try { localStorage.setItem(STORAGE_PREFIX + currentUser.id, JSON.stringify(next)); } catch {}
    }
    if (Object.hasOwn(patch, 'brightness')) onBrightnessChange?.(next.brightness);
    if (Object.hasOwn(patch, 'dnd')) onDndChange?.(next.dnd);
  };
  const changePanel = id => onChangeTool?.(activeTool === id ? '' : id);
  const toggleSound = async (selection = 'rain') => {
    setSoundError('');
    try {
      await soundscape.toggleLayer(selection);
    } catch (error) { setSoundError(error?.message || (vi ? 'Không phát được âm thanh.' : 'Audio unavailable.')); }
  };
  const selectedTool = TOOL_META.find(tool => tool.id === activeTool);
  const progress = 1 - (timer.remainingMs / (timer.timer.minutes * 60_000) || 0);
  return <>
    <nav className="bfc-utility-dock" aria-label={vi ? 'Tiện ích Focus' : 'Focus utilities'}>
      {arrangedTools.map(({ id, Icon, vi: vLabel, en }) => (
        <button type="button" key={id} className={activeTool === id ? 'is-active' : ''}
          aria-pressed={activeTool === id} aria-label={vi ? vLabel : en}
          onClick={() => {setQuickExpanded(false);changePanel(id);}} title={vi ? vLabel : en}>
          <span className="bfc-utility-dock__icon"><Icon size={22} strokeWidth={1.7}/></span>
          <span className="bfc-utility-dock__label">{vi ? vLabel : en}</span>
        </button>
      ))}
      <button type="button" className={quickExpanded ? 'is-active' : ''}
        aria-expanded={quickExpanded} aria-label={vi ? 'Mở tiện ích khác' : 'More quick tools'}
        onClick={() => {onChangeTool?.('');setQuickExpanded(value => !value);}}
        title={vi ? 'Thêm tiện ích' : 'More tools'}>
        <span className="bfc-utility-dock__icon"><MoreHorizontal size={22} strokeWidth={1.7}/></span>
        <span className="bfc-utility-dock__label">{vi ? 'Thêm' : 'More'}</span>
      </button>
    </nav>

    {quickExpanded && <div className={'bfc-quick-tools' + (!prefs.dnd ? ' is-expanded' : ' is-collapsed')}>
      <button type="button" className="bfc-quick-tools__title"
        aria-expanded={quickExpanded && !prefs.dnd} onClick={() => setQuickExpanded(value => !value)}>
        <Sparkles size={15}/>
        <span>{vi ? 'TIỆN ÍCH TẬP TRUNG' : 'QUICK FOCUS TOOLS'}</span>
        <ChevronRight size={16} className="bfc-quick-tools__arrow"/>
      </button>
      {quickExpanded && !prefs.dnd ? <div className="bfc-quick-tools__items">
        <button type="button" onClick={() => {
          timer.setPreset('pomodoro');
          onChangeTool?.('timer');
        }}>
          <TimerReset size={19}/><strong>Pomodoro</strong>
          <small>{timer.timer.mode === 'pomodoro' ? timer.formatted : '25:00'}</small>
        </button>
        <button type="button" aria-pressed={soundscape.playing} onClick={() => toggleSound('white')}>
          <Waves size={19}/><strong>{vi ? 'Tiếng trắng' : 'White noise'}</strong>
          <small>{soundscape.playing && soundscape.levels.white > 0 ? (vi ? 'Đang phát' : 'Playing') : (vi ? 'Bật âm' : 'Start audio')}</small>
        </button>
        <button type="button" aria-pressed={prefs.dnd} onClick={() => savePrefs({dnd:!prefs.dnd})}>
          <Moon size={19}/><strong>{vi ? 'Yên tĩnh' : 'Do not disturb'}</strong>
          <small>{vi ? 'Ẩn phiền nhiễu' : 'Reduce clutter'}</small>
        </button>
      </div> : <button type="button" className="bfc-quick-tools__dnd" aria-pressed={prefs.dnd}
        onClick={() => savePrefs({dnd: !prefs.dnd})}>
        <BellOff size={14}/>{prefs.dnd ? (vi ? 'Đang bật yên tĩnh · Tắt' : 'Quiet mode on · Disable') :
          (vi ? 'Mở tiện ích' : 'Show tools')}
      </button>}
    </div>}

    {activeTool && selectedTool && <section className="bfc-tool-panel"
      role="region" aria-label={vi ? selectedTool.vi : selectedTool.en}>
      <header className="bfc-tool-panel__header">
        <div>
          <small>BRIAN FOCUS / TOOLKIT</small>
          <h3><selectedTool.Icon size={18}/>{vi ? selectedTool.vi : selectedTool.en}</h3>
        </div>
        <button type="button" aria-label={vi ? 'Đóng tiện ích' : 'Close tool'} onClick={() => onChangeTool?.('')}>
          <X size={17}/>
        </button>
      </header>
      <div className="bfc-tool-panel__content">
        {activeTool === 'timer' && <div className="bfc-timer">
          <div className="bfc-timer__modes">
            {[
              ['pomodoro',vi ? 'Tập trung' : 'Focus'],
              ['short',vi ? 'Nghỉ ngắn' : 'Short break'],
              ['long',vi ? 'Nghỉ dài' : 'Long break'],
              ['deep',vi ? 'Chuyên sâu' : 'Deep work'],
            ].map(([id,label]) => <button type="button" key={id}
              className={timer.timer.mode === id ? 'is-active' : ''}
              onClick={() => {setTimerFinished(false);timer.setPreset(id);}}>{label}</button>)}
          </div>
          <div className="bfc-timer__dial" style={{ '--bfc-progress': String(Math.max(0,Math.min(100,progress*100)))+'%' }}>
            <span className="bfc-timer__time" role="timer" aria-label={timer.formatted}>{timer.formatted}</span>
            <small>{timer.timer.running ? (vi ? 'ĐANG TẬP TRUNG' : 'IN PROGRESS') :
              timerFinished ? (vi ? 'HOÀN THÀNH' : 'COMPLETE') : (vi ? 'SẴN SÀNG' : 'READY')}</small>
          </div>
          <div className="bfc-timer__controls">
            <button type="button" className="is-primary" onClick={() => {
              setTimerFinished(false);
              timer.timer.running ? timer.pause() : timer.start();
            }}>{timer.timer.running ? <Pause size={16}/> : <Play size={16}/>}
            {timer.timer.running ? (vi ? 'Tạm dừng' : 'Pause') : (vi ? 'Bắt đầu' : 'Start')}</button>
            <button type="button" onClick={() => {setTimerFinished(false);timer.reset();}}>
              <TimerReset size={16}/>{vi ? 'Đặt lại' : 'Reset'}
            </button>
          </div>
          <label className="bfc-timer__custom">{vi ? 'Tùy chỉnh thời lượng (phút)' : 'Custom minutes'}
            <span><input type="number" min={1} max={180} value={customMinutes}
              onChange={event => setCustomMinutes(event.target.value)}
              aria-label={vi ? 'Số phút' : 'Minutes'}/>
            <button type="button" onClick={() => {
              setTimerFinished(false);timer.setPreset('custom',customMinutes);
            }}><Check size={14}/>{vi ? 'Áp dụng' : 'Apply'}</button></span>
          </label>
          <p className="bfc-workspace__muted"><Check size={13}/> {vi ? 'Phiên tập trung hoàn thành hôm nay: ' : 'Focus sessions completed today: '}{completedSessions}</p>
          <p className="bfc-workspace__muted">{vi ? 'Bộ đếm cá nhân tiếp tục tính chính xác khi chuyển tab hoặc đóng Focus.' :
            'Your personal countdown stays accurate across tabs and after closing Focus.'}</p>
        </div>}

        {activeTool === 'notes' && <><Focus6Tasks userId={currentUser?.id} language={language}/><FocusNotes currentUser={currentUser} language={language}/></>}

        {activeTool === 'soundscape' && <div className="bfc-soundscape bfc6-mixer">
          <p className="bfc-workspace__muted">{vi ? 'Phối các lớp âm thanh tạo trực tiếp trên thiết bị; chỉ phát khi bạn nhấn Bắt đầu.' :
            'Blend locally generated sound layers; audio starts only after you press Start.'}</p>
          {FOCUS_SOUNDS.map(item => <div className="bfc6-mixer__row" key={item}>
            <label><span>{FOCUS_SOUND_LABELS[item][vi?0:1]}</span><strong>{soundscape.levels[item]}%</strong></label>
            <input type="range" min="0" max="100" step="1" value={soundscape.levels[item]}
              aria-label={FOCUS_SOUND_LABELS[item][vi?0:1]}
              onChange={e=>soundscape.setLevel(item,e.target.value)}/>
          </div>)}
          <div className="bfc6-mixer__row is-master">
            <label><span>{vi?'Âm lượng tổng':'Master volume'}</span><strong>{soundscape.master}%</strong></label>
            <input type="range" min="0" max="100" value={soundscape.master}
              aria-label={vi?'Âm lượng tổng':'Master volume'}
              onChange={e=>soundscape.setMaster(e.target.value)}/>
          </div>
          <button type="button" className="bfc-tool-panel__wide"
            onClick={()=>{ if(soundscape.playing)void soundscape.stop();else void soundscape.start();}}>
            {soundscape.playing?<Pause size={16}/>:<Play size={16}/>}
            {soundscape.playing?(vi?'Dừng bộ trộn':'Stop mixer'):(vi?'Phát âm thanh':'Start mixing')}
          </button>
          {(soundscape.error||soundError)&&<p role="alert" className="bfc-workspace__error">{soundscape.error||soundError}</p>}
        </div>}

        {activeTool === 'brightness' && <div className="bfc-brightness">
          <p className="bfc-workspace__muted">{vi ? 'Điều chỉnh độ tối của nền, không ảnh hưởng độ sáng màn hình hoặc đồng hồ.' :
            'Adjust the background overlay, not screen brightness or clock.'}</p>
          <label>{vi ? 'Độ tối hình nền' : 'Background dimming'}
            <strong>{prefs.brightness ?? 24}%</strong>
            <input type="range" min="0" max="85" step="1" value={prefs.brightness ?? 24}
              onChange={event => savePrefs({brightness: Number(event.target.value)})}/>
          </label>
          <div className="bfc-brightness__presets">
            {[
              [0,vi ? 'Sáng' : 'Clear'],
              [20,vi ? 'Cân bằng' : 'Balanced'],
              [48,vi ? 'Tối' : 'Dark'],
              [75,vi ? 'Ban đêm' : 'Night'],
            ].map(([value,label]) => <button type="button" key={value}
              aria-pressed={prefs.brightness === value} onClick={() => savePrefs({brightness:value})}>
              {label}</button>)}
          </div>
          <button type="button" className="bfc-tool-panel__wide" onClick={() => savePrefs({brightness:null})}>
            {vi ? 'Theo cài đặt nền dùng chung' : 'Use shared scene setting'}
          </button>
        </div>}
      </div>
    </section>}
  </>;
}
