import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './RandomStudentPickerBridge.css';

const MODES = [
  ['wheel', 'Vòng quay', 'VQ'], ['lottery', 'Xổ số', 'XS'], ['cards', 'Thẻ bí mật', 'TH'],
  ['boxes', 'Hộp bất ngờ', 'HB'], ['race', 'Đường đua', 'ĐĐ'], ['bomb', 'Bom hẹn giờ', 'BM'],
  ['claw', 'Máy gắp', 'MG'], ['doors', 'Cửa bí mật', 'CB'], ['bingo', 'Lồng cầu', 'LC'],
  ['hotseat', 'Ghế nóng', 'GN'], ['elimination', 'Loại dần', 'LD'], ['teams', 'Chia đội', 'CĐ'],
];

const SAMPLE = ['Nguyễn Minh Anh', 'Trần Gia Bảo', 'Lê Khánh Chi', 'Phạm Đức Duy', 'Võ Ngọc Hà', 'Bùi Quang Huy', 'Đặng Tuấn Kiệt', 'Hoàng Mai Lan', 'Đỗ Nhật Minh', 'Nguyễn Thảo My', 'Trương Phúc Nguyên', 'Lý Bảo Ngọc'];
const ICONS = { wheel: '◉', lottery: '07', cards: '▦', boxes: '▣', race: '➜', bomb: '●', claw: '⌄', doors: '▥', bingo: '○', hotseat: '♨', elimination: '×', teams: '◆' };
const DURATION = { wheel: 2500, lottery: 1900, cards: 1900, boxes: 1900, race: 3000, bomb: 3300, claw: 2400, doors: 1900, bingo: 2400, hotseat: 2200, elimination: 2700 };

function parseNames(value) {
  const seen = new Set();
  return String(value || '')
    .replace(/\r/g, '\n')
    .split(/[\n,;]+/)
    .map((name) => name.replace(/^\s*\d+[.)-]?\s*/, '').trim())
    .filter((name) => {
      if (!name) return false;
      const key = name.toLocaleLowerCase('vi');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function shuffle(items) {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
  }
  return out;
}

function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function PickerStage({ mode, names, rolling, ticker, result, teams, race }) {
  const active = rolling ? ticker : result;
  const visible = active && !names.slice(0, 12).includes(active)
    ? [active, ...names.filter((name) => name !== active)].slice(0, 12)
    : names.slice(0, 12);

  if (mode === 'teams') {
    return <div className="rspb-teams">{teams.length ? teams.map((team, index) => <section key={index}><header><b>Đội {index + 1}</b><span>{team.length}</span></header>{team.map((name) => <p key={name}>{name}</p>)}</section>) : <div className="rspb-empty-stage"><span>◆</span><b>Chọn số đội và nhấn Chia đội</b></div>}</div>;
  }
  if (mode === 'wheel') {
    return <div className={`rspb-wheel ${rolling ? 'spin' : ''}`}><i>{active ? initials(active) : 'GO'}</i>{visible.slice(0, 8).map((name, index) => <span key={name} style={{ '--i': index, '--n': Math.max(visible.slice(0, 8).length, 1) }}>{initials(name)}</span>)}</div>;
  }
  if (mode === 'race') {
    const racers = race.length ? race : visible.slice(0, 6);
    return <div className={`rspb-race ${rolling ? 'go' : ''}`}>{racers.map((name, index) => <div key={name}><b>{name}</b><span style={{ '--lane': index }}>➜</span></div>)}</div>;
  }
  if (['cards', 'boxes', 'doors', 'elimination'].includes(mode)) {
    return <div className={`rspb-grid-mode ${mode}`}>{visible.map((name, index) => <div key={name} className={!rolling && result === name ? 'winner' : ''}><span>{mode === 'doors' ? '▥' : mode === 'boxes' ? '▣' : String(index + 1).padStart(2, '0')}</span><b>{!rolling && result === name ? name : initials(name)}</b></div>)}</div>;
  }
  if (mode === 'lottery') {
    return <div className={`rspb-machine ${rolling ? 'rolling' : ''}`}><strong>{String(Math.max(0, names.indexOf(active) + 1)).padStart(2, '0')}</strong><p>{active || 'Số thứ tự'}</p></div>;
  }
  return <div className={`rspb-focus mode-${mode} ${rolling ? 'rolling' : ''}`}><span>{ICONS[mode]}</span><small>{MODES.find((item) => item[0] === mode)?.[1]}</small><strong>{active || 'Sẵn sàng'}</strong></div>;
}

export function RandomStudentPicker({ currentUser, onClose = () => { window.location.hash = '#/apps'; } }) {
  const scope = currentUser?.id || currentUser?.email || 'local';
  const key = `bes-random-picker:${scope}`;
  const fileRef = useRef(null);
  const shellRef = useRef(null);
  const timers = useRef([]);
  const [classes, setClasses] = useState(() => read(`${key}:classes`, [{ id: 'default', name: 'Lớp của tôi', students: SAMPLE }]));
  const [classId, setClassId] = useState(() => read(`${key}:class`, 'default'));
  const current = classes.find((item) => item.id === classId) || classes[0];
  const [className, setClassName] = useState(current?.name || 'Lớp của tôi');
  const [draft, setDraft] = useState((current?.students || []).join('\n'));
  const [mode, setMode] = useState(() => read(`${key}:mode`, 'wheel'));
  const [history, setHistory] = useState(() => read(`${key}:history`, []));
  const [absent, setAbsent] = useState([]);
  const [noRepeat, setNoRepeat] = useState(true);
  const [voice, setVoice] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState('');
  const [teams, setTeams] = useState([]);
  const [teamCount, setTeamCount] = useState(4);
  const [race, setRace] = useState([]);
  const [toast, setToast] = useState('');
  const [showRoster, setShowRoster] = useState(true);
  const names = useMemo(() => parseNames(draft), [draft]);
  const active = useMemo(() => names.filter((name) => !absent.includes(name)), [names, absent]);
  const used = new Set(history.filter((item) => item.classId === classId).map((item) => item.name));
  const classHistory = history.filter((item) => item.classId === classId);

  const clearTimers = () => {
    timers.current.forEach((id) => { clearTimeout(id); clearInterval(id); });
    timers.current = [];
  };
  const notify = (message) => {
    setToast(message);
    const id = setTimeout(() => setToast(''), 2200);
    timers.current.push(id);
  };

  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    try {
      localStorage.setItem(`${key}:classes`, JSON.stringify(classes));
      localStorage.setItem(`${key}:class`, JSON.stringify(classId));
      localStorage.setItem(`${key}:mode`, JSON.stringify(mode));
      localStorage.setItem(`${key}:history`, JSON.stringify(history.slice(0, 150)));
    } catch { /* local storage is optional */ }
  }, [classes, classId, mode, history, key]);
  useEffect(() => {
    const next = classes.find((item) => item.id === classId) || classes[0];
    if (!next) return;
    setClassName(next.name);
    setDraft((next.students || []).join('\n'));
    setAbsent([]);
    setResult('');
    setTeams([]);
  }, [classId]);

  function saveClass() {
    const cleaned = parseNames(draft);
    if (!cleaned.length) { notify('Hãy nhập ít nhất một học sinh.'); return; }
    const id = current?.id || `class-${Date.now()}`;
    const next = { id, name: className.trim() || 'Lớp chưa đặt tên', students: cleaned };
    setClasses((items) => items.some((item) => item.id === id) ? items.map((item) => item.id === id ? next : item) : [...items, next]);
    setClassId(id);
    setDraft(cleaned.join('\n'));
    notify(`Đã lưu ${cleaned.length} học sinh.`);
  }

  function addClass() {
    const id = `class-${Date.now()}`;
    setClasses((items) => [...items, { id, name: `Lớp mới ${items.length + 1}`, students: [] }]);
    setClassId(id);
  }

  function deleteClass() {
    if (classes.length === 1) {
      setClasses([{ id: 'default', name: 'Lớp của tôi', students: [] }]);
      setClassId('default');
      setDraft('');
    } else {
      const next = classes.filter((item) => item.id !== classId);
      setClasses(next);
      setClassId(next[0].id);
    }
    setHistory((items) => items.filter((item) => item.classId !== classId));
  }

  function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseNames(reader.result);
      setDraft(imported.join('\n'));
      setClassName(file.name.replace(/\.[^.]+$/, '') || 'Lớp đã nhập');
      notify(`Đã nhập ${imported.length} học sinh.`);
    };
    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  }

  function speak(name) {
    if (!voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(name);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.88;
      speechSynthesis.speak(utterance);
    } catch { /* speech is optional */ }
  }

  function splitTeams() {
    if (active.length < 2) { notify('Cần ít nhất hai học sinh.'); return; }
    const count = Math.min(Math.max(2, teamCount), Math.min(8, active.length));
    const out = Array.from({ length: count }, () => []);
    shuffle(active).forEach((name, index) => out[index % count].push(name));
    setTeams(out);
    setResult(`Đã chia ${count} đội`);
  }

  function run() {
    if (rolling) return;
    if (mode === 'teams') { splitTeams(); return; }
    if (!active.length) { notify('Danh sách có mặt đang trống.'); return; }
    clearTimers();
    let pool = noRepeat ? active.filter((name) => !used.has(name)) : active;
    if (!pool.length) {
      pool = active;
      setHistory((items) => items.filter((item) => item.classId !== classId));
      notify('Đã bắt đầu vòng không lặp mới.');
    }
    const winner = pool[Math.floor(Math.random() * pool.length)];
    const racers = [winner, ...shuffle(active.filter((name) => name !== winner)).slice(0, 5)];
    setRace(racers);
    setRolling(true);
    setResult('');
    setTeams([]);
    const cycle = setInterval(() => setTicker(active[Math.floor(Math.random() * active.length)]), mode === 'hotseat' ? 65 : 95);
    timers.current.push(cycle);
    const finish = setTimeout(() => {
      clearTimers();
      setTicker(winner);
      setResult(winner);
      setRolling(false);
      setHistory((items) => [{ id: `${Date.now()}-${Math.random()}`, classId, name: winner, mode, time: Date.now() }, ...items].slice(0, 150));
      speak(winner);
    }, DURATION[mode] || 2200);
    timers.current.push(finish);
  }

  useEffect(() => {
    const keydown = (event) => {
      const tag = event.target?.tagName;
      if (event.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) {
        event.preventDefault();
        run();
      }
      if (event.key === 'Escape') onClose();
    };
    addEventListener('keydown', keydown);
    return () => removeEventListener('keydown', keydown);
  });

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen?.();
    } catch {
      notify('Không thể mở toàn màn hình.');
    }
  }

  return <div className="rspb-overlay" ref={shellRef}>
    <header className="rspb-top"><div><button onClick={onClose}>←</button><span><small>BRIAN CLASSROOM GAME</small><h1>Gọi tên học sinh</h1><p>12 chế độ tương tác · dữ liệu lưu trên thiết bị</p></span></div><nav><button onClick={() => setVoice(!voice)}>{voice ? 'Âm đọc: Bật' : 'Âm đọc: Tắt'}</button><button onClick={fullscreen}>Toàn màn hình</button><button onClick={onClose}>Đóng</button></nav></header>
    <section className="rspb-toolbar"><label><span>Lớp đang dùng</span><select value={classId} onChange={(event) => setClassId(event.target.value)}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div><b>{active.length}</b> có mặt <b>{absent.length}</b> vắng <b>{noRepeat ? Math.max(0, active.length - used.size) : '∞'}</b> chưa gọi</div><button onClick={addClass}>Lớp mới</button><button onClick={() => setShowRoster(!showRoster)}>{showRoster ? 'Ẩn danh sách' : 'Sửa danh sách'}</button></section>
    <div className={`rspb-layout ${showRoster ? '' : 'wide'}`}>
      {showRoster && <aside className="rspb-roster"><div className="rspb-heading"><h2>01 · Danh sách lớp</h2><button onClick={deleteClass}>Xoá</button></div><label><span>Tên lớp</span><input value={className} onChange={(event) => setClassName(event.target.value)} /></label><label><span>Mỗi dòng một học sinh</span><textarea rows="10" value={draft} onChange={(event) => setDraft(event.target.value)} /></label><div className="rspb-actions"><button className="primary" onClick={saveClass}>Lưu danh sách</button><button onClick={() => fileRef.current?.click()}>Nhập TXT/CSV</button><input hidden ref={fileRef} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={importFile} /><button onClick={() => setDraft(SAMPLE.join('\n'))}>Dữ liệu mẫu</button></div><h3>Đánh dấu vắng</h3><div className="rspb-chips">{names.map((name) => <button key={name} className={absent.includes(name) ? 'absent' : ''} onClick={() => setAbsent((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name])}><i>{initials(name)}</i>{name}</button>)}</div></aside>}
      <main className="rspb-main"><section className="rspb-modes"><div className="rspb-heading"><h2>02 · Chọn chế độ</h2><span>{MODES.find((item) => item[0] === mode)?.[1]}</span></div><div>{MODES.map((item) => <button key={item[0]} className={mode === item[0] ? 'active' : ''} onClick={() => { if (!rolling) { setMode(item[0]); setResult(''); setTeams([]); } }}><i>{item[2]}</i><b>{item[1]}</b></button>)}</div></section><section className={`rspb-stage mode-${mode} ${rolling ? 'running' : ''}`}><header><span><small>03 · {MODES.find((item) => item[0] === mode)?.[1]}</small><h2>{rolling ? 'Đang chọn ngẫu nhiên…' : result || 'Sẵn sàng bắt đầu'}</h2></span>{mode === 'teams' ? <label>Số đội <select value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))}>{[2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count}>{count}</option>)}</select></label> : <label className="rspb-switch"><input type="checkbox" checked={noRepeat} onChange={(event) => setNoRepeat(event.target.checked)} /><i />Không lặp tên</label>}</header><div className="rspb-canvas"><PickerStage mode={mode} names={active} rolling={rolling} ticker={ticker} result={result} teams={teams} race={race} /></div><footer><button className="rspb-go" onClick={run} disabled={rolling || !active.length}><i>{rolling ? '…' : mode === 'teams' ? 'CĐ' : 'GO'}</i><b>{rolling ? 'ĐANG CHỌN' : mode === 'teams' ? 'CHIA ĐỘI NGAY' : 'BẮT ĐẦU'}</b><small>Phím cách</small></button><button disabled={!classHistory.length || rolling} onClick={() => { const first = history.find((item) => item.classId === classId); setHistory((items) => items.filter((item) => item.id !== first?.id)); setResult(''); }}>Hoàn tác</button><button disabled={!classHistory.length || rolling} onClick={() => { setHistory((items) => items.filter((item) => item.classId !== classId)); setResult(''); }}>Vòng mới</button></footer></section></main>
      <aside className="rspb-history"><div className="rspb-heading"><h2>04 · Lịch sử</h2><b>{classHistory.length}</b></div>{classHistory.slice(0, 20).map((item, index) => <div key={item.id}><span>{classHistory.length - index}</span><p><b>{item.name}</b><small>{MODES.find((modeItem) => modeItem[0] === item.mode)?.[1]} · {new Date(item.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small></p></div>)}</aside>
    </div>
    {result && mode !== 'teams' && !rolling && <div className="rspb-result"><i>{initials(result)}</i><span><small>HỌC SINH ĐƯỢC CHỌN</small><b>{result}</b></span><button onClick={run}>Chọn tiếp</button></div>}
    {toast && <div className="rspb-toast">{toast}</div>}
  </div>;
}

function LauncherCard({ host }) {
  return host ? createPortal(<button className="rspb-launcher" onClick={() => { window.location.hash = '#/tool/random-student-picker'; }}><span>VQ</span><i><small>TRÒ CHƠI NATIVE</small><b>Gọi tên học sinh</b><em>12 chế độ · chia đội · không lặp</em></i><strong>Mở ứng dụng →</strong></button>, host) : null;
}

export default function RandomStudentPickerBridge({ currentUser }) {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#\//, '').split('?')[0]);
  const [host, setHost] = useState(null);
  useEffect(() => {
    const update = () => setRoute(window.location.hash.replace(/^#\//, '').split('?')[0]);
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    if (route !== 'games') { setHost(null); return undefined; }
    const find = () => setHost(document.querySelector('.metro-clean-system[data-route="games"] .games-hero-side-panel') || document.querySelector('.games-hero-side-panel') || document.querySelector('.games-showcase-hero'));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route]);
  return <>{route === 'games' && <LauncherCard host={host} />}{route === 'random-student-picker' && createPortal(<RandomStudentPicker currentUser={currentUser} onClose={() => { window.location.hash = '#/games'; }} />, document.body)}</>;
}