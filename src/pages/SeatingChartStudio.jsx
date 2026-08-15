import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SeatingChartStudioV10Pro.css';

const STORAGE_KEY = 'brian-seating-chart-studio-v10-classes';
const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 7;
const PALETTE = ['lemon', 'sky', 'lilac', 'mint', 'rose', 'cyan'];

function normalizeStudentName(value) {
  return String(value || '')
    .replace(/^\s*\d+\s*[.\-):]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRoster(text) {
  const seen = new Set();
  return String(text || '')
    .split(/[\n,]+/)
    .map(normalizeStudentName)
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLocaleLowerCase('vi');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function sortNames(list, mode) {
  if (mode === 'az') return [...list].sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
  if (mode === 'za') return [...list].sort((a, b) => b.localeCompare(a, 'vi', { sensitivity: 'base' }));
  return shuffle(list);
}

function loadSavedClasses() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedClasses(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // The app remains fully usable when local storage is blocked.
  }
}

function rowOf(index, cols) {
  return Math.floor(index / cols);
}

function isSameName(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'vi', { sensitivity: 'base' }) === 0;
}

function containsName(list, name) {
  return list.some((item) => isSameName(item, name));
}

function withoutNames(list, excluded) {
  return list.filter((name) => !excluded.some((item) => isSameName(item, name)));
}

function makeSeatPlan({ students, rows, cols, frontPinned, backPinned, mode }) {
  const capacity = rows * cols;
  const seats = Array.from({ length: capacity }, () => null);
  const firstRow = shuffle(Array.from({ length: cols }, (_, index) => index));
  const lastRowStart = (rows - 1) * cols;
  const lastRow = shuffle(Array.from({ length: cols }, (_, index) => lastRowStart + index));

  shuffle(frontPinned).forEach((student, index) => {
    seats[firstRow[index]] = student;
  });
  shuffle(backPinned).forEach((student, index) => {
    seats[lastRow[index]] = student;
  });

  const constrained = [...frontPinned, ...backPinned];
  const remainingStudents = sortNames(withoutNames(students, constrained), mode);
  const freeSeats = seats
    .map((seat, index) => (seat === null ? index : -1))
    .filter((index) => index >= 0);

  remainingStudents.forEach((student, index) => {
    seats[freeSeats[index]] = student;
  });
  return seats;
}

function ClassroomArt() {
  return (
    <svg viewBox="0 0 360 210" aria-hidden="true">
      <rect x="20" y="20" width="320" height="170" rx="30" fill="#f1f6fd" />
      <rect x="50" y="39" width="260" height="54" rx="15" fill="#173f69" />
      <rect x="68" y="54" width="94" height="7" rx="4" fill="#dcecff" />
      <rect x="68" y="70" width="148" height="7" rx="4" fill="#80bcfb" />
      <g fill="#fff" stroke="#dbe7f3" strokeWidth="2">
        <rect x="48" y="116" width="58" height="35" rx="11" />
        <rect x="116" y="116" width="58" height="35" rx="11" />
        <rect x="184" y="116" width="58" height="35" rx="11" />
        <rect x="252" y="116" width="58" height="35" rx="11" />
      </g>
      <g fill="#4388ef"><circle cx="77" cy="126" r="6" /><circle cx="145" cy="126" r="6" /><circle cx="213" cy="126" r="6" /><circle cx="281" cy="126" r="6" /></g>
      <path d="M44 168h272" stroke="#d5e2ef" strokeWidth="5" strokeLinecap="round" />
      <circle cx="316" cy="44" r="15" fill="#ffe1a1" /><path d="M316 35v18M307 44h18" stroke="#f3a600" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Tab({ active, icon, children, onClick }) {
  return <button type="button" className={`scs-pro__tab${active ? ' is-active' : ''}`} onClick={onClick}><span>{icon}</span><b>{children}</b></button>;
}

export default function SeatingChartStudio() {
  const [className, setClassName] = useState('');
  const [rosterText, setRosterText] = useState('');
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [orderMode, setOrderMode] = useState('random');
  const [frontPinned, setFrontPinned] = useState([]);
  const [backPinned, setBackPinned] = useState([]);
  const [seats, setSeats] = useState([]);
  const [fontSize, setFontSize] = useState(13);
  const [activeTab, setActiveTab] = useState('conditions');
  const [studentView, setStudentView] = useState(false);
  const [savedClasses, setSavedClasses] = useState(loadSavedClasses);
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [picker, setPicker] = useState(null);
  const [pickerDraft, setPickerDraft] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [dealKey, setDealKey] = useState(0);
  const [dragIndex, setDragIndex] = useState(null);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState(null);
  const toastTimer = useRef(null);

  const students = useMemo(() => parseRoster(rosterText), [rosterText]);
  const capacity = rows * cols;
  const emptyCount = Math.max(0, capacity - students.length);
  const overflow = Math.max(0, students.length - capacity);
  const chartReady = seats.length === capacity && seats.some(Boolean);

  const notify = (message, type = 'success') => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    setFrontPinned((current) => current.filter((name) => containsName(students, name)));
    setBackPinned((current) => current.filter((name) => containsName(students, name)));
  }, [rosterText]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (picker) {
        setPicker(null);
        setPickerSearch('');
        return;
      }
      if (studentView) setStudentView(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [picker, studentView]);

  const validatePlan = () => {
    if (!students.length) {
      notify('Hãy nhập danh sách học sinh trước.', 'error');
      return false;
    }
    if (overflow > 0) {
      notify(`Có ${students.length} học sinh nhưng chỉ có ${capacity} chỗ.`, 'error');
      return false;
    }
    if (frontPinned.length > cols || backPinned.length > cols) {
      notify(`Mỗi hàng chỉ có tối đa ${cols} học sinh ưu tiên.`, 'error');
      return false;
    }
    if (frontPinned.some((name) => containsName(backPinned, name))) {
      notify('Một học sinh không thể vừa ở hàng đầu vừa ở hàng cuối.', 'error');
      return false;
    }
    return true;
  };

  const generateChart = (mode = orderMode, shuffled = false) => {
    if (!validatePlan()) return;
    setSeats(makeSeatPlan({ students, rows, cols, frontPinned, backPinned, mode }));
    setDealKey((value) => value + 1);
    setSelectedSeatIndex(null);
    notify(shuffled ? 'Đã xáo trộn sơ đồ.' : 'Đã tạo sơ đồ chỗ ngồi.');
  };

  const resetSession = () => {
    setClassName(''); setRosterText(''); setRows(DEFAULT_ROWS); setCols(DEFAULT_COLS);
    setOrderMode('random'); setFrontPinned([]); setBackPinned([]); setSeats([]);
    setFontSize(13); setSelectedSavedId(''); setActiveTab('roster'); setSelectedSeatIndex(null);
    notify('Đã đặt lại phiên làm việc hiện tại.');
  };

  const clearRoster = () => {
    setRosterText(''); setFrontPinned([]); setBackPinned([]); setSeats([]);
    notify('Đã xóa danh sách hiện tại.');
  };

  const saveClass = () => {
    const name = className.trim();
    if (!name) return notify('Hãy nhập tên lớp trước khi lưu.', 'error');
    if (!students.length) return notify('Danh sách lớp đang trống.', 'error');
    const id = name.toLocaleLowerCase('vi').replace(/\s+/g, '-');
    const item = { id, name, students, updatedAt: new Date().toISOString() };
    const next = [item, ...savedClasses.filter((entry) => entry.id !== id)].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    setSavedClasses(next); setSelectedSavedId(id); persistSavedClasses(next);
    notify(`Đã lưu lớp ${name}.`);
  };

  const loadClass = (id) => {
    setSelectedSavedId(id);
    const item = savedClasses.find((entry) => entry.id === id);
    if (!item) return;
    setClassName(item.name || '');
    setRosterText((item.students || []).join('\n'));
    setFrontPinned([]); setBackPinned([]); setSeats([]); setSelectedSeatIndex(null);
    notify(`Đã tải lớp ${item.name}.`);
  };

  const deleteSavedClass = () => {
    const item = savedClasses.find((entry) => entry.id === selectedSavedId);
    if (!item) return notify('Hãy chọn một lớp đã lưu.', 'error');
    if (!window.confirm(`Xóa lớp ${item.name} khỏi bộ nhớ trình duyệt?`)) return;
    const next = savedClasses.filter((entry) => entry.id !== item.id);
    setSavedClasses(next); setSelectedSavedId(''); persistSavedClasses(next);
    notify(`Đã xóa lớp ${item.name}.`);
  };

  const openPicker = (type) => {
    if (!students.length) return notify('Hãy nhập danh sách học sinh trước.', 'error');
    setPicker(type);
    setPickerDraft(type === 'front' ? [...frontPinned] : [...backPinned]);
    setPickerSearch('');
  };

  const closePicker = () => {
    setPicker(null);
    setPickerSearch('');
  };

  const togglePickerStudent = (name) => {
    const opposite = picker === 'front' ? backPinned : frontPinned;
    if (containsName(opposite, name)) return notify('Học sinh này đã thuộc nhóm đối lập.', 'error');
    const exists = containsName(pickerDraft, name);
    if (!exists && pickerDraft.length >= cols) return notify(`Mỗi hàng chỉ có tối đa ${cols} học sinh ưu tiên.`, 'error');
    setPickerDraft((current) => exists ? current.filter((item) => !isSameName(item, name)) : [...current, name]);
  };

  const savePicker = () => {
    if (picker === 'front') setFrontPinned(pickerDraft);
    if (picker === 'back') setBackPinned(pickerDraft);
    closePicker();
    notify(`Đã lưu ${pickerDraft.length} học sinh vào điều kiện bí mật.`);
  };

  const studentCanSitAt = (student, targetIndex) => {
    if (!student) return true;
    const targetRow = rowOf(targetIndex, cols);
    if (containsName(frontPinned, student)) return targetRow === 0;
    if (containsName(backPinned, student)) return targetRow === rows - 1;
    return true;
  };

  const swap = (sourceIndex, targetIndex) => {
    if (sourceIndex === null || sourceIndex === targetIndex) return true;
    const sourceStudent = seats[sourceIndex];
    const targetStudent = seats[targetIndex];
    if (!studentCanSitAt(sourceStudent, targetIndex) || !studentCanSitAt(targetStudent, sourceIndex)) {
      notify('Không thể đổi chỗ vì sẽ phá điều kiện hàng đầu/hàng cuối.', 'error');
      return false;
    }
    const next = [...seats];
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
    setSeats(next);
    notify('Đã đổi chỗ thủ công.');
    return true;
  };

  const dropSeat = (targetIndex) => {
    swap(dragIndex, targetIndex);
    setDragIndex(null);
    setSelectedSeatIndex(null);
  };

  const clickSeat = (index) => {
    if (studentView) return;
    if (selectedSeatIndex === null) {
      setSelectedSeatIndex(index);
      return;
    }
    swap(selectedSeatIndex, index);
    setSelectedSeatIndex(null);
  };

  const pickerStudents = students.filter((name) => name.toLocaleLowerCase('vi').includes(pickerSearch.trim().toLocaleLowerCase('vi')));

  return (
    <div className={`scs-pro${studentView ? ' is-student-view' : ''}`}>
      {!studentView ? (
        <header className="scs-pro__toolbar">
          <div className="scs-pro__brand"><span className="scs-pro__mark">S</span><div><strong>Seating Chart Studio</strong><small>V10.1 · Brian Classroom Utility</small></div></div>
          <div className="scs-pro__actions">
            <button type="button" onClick={() => setStudentView(true)} disabled={!chartReady}>◉ Chế độ học sinh</button>
            <button type="button" onClick={() => window.print()} disabled={!chartReady}>⎙ In sơ đồ</button>
            <button type="button" onClick={resetSession}>↺ Reset</button>
          </div>
        </header>
      ) : null}

      {!studentView ? (
        <section className="scs-pro__summary" aria-label="Tổng quan sơ đồ">
          <div className="scs-pro__stat"><i>🏷</i><span><small>LỚP HIỆN TẠI</small><b>{className.trim() || 'Chưa đặt tên'}</b></span></div>
          <div className="scs-pro__stat"><i>▦</i><span><small>BỐ CỤC</small><b>{rows} hàng × {cols} cột</b></span></div>
          <div className={`scs-pro__stat${overflow ? ' is-danger' : ' is-good'}`}><i>{overflow ? '!' : '✓'}</i><span><small>SỨC CHỨA</small><b>{students.length} / {capacity}</b></span></div>
          <div className="scs-pro__stat"><i>○</i><span><small>{overflow ? 'THIẾU CHỖ' : emptyCount ? 'GHẾ TRỐNG' : 'TRẠNG THÁI'}</small><b>{overflow ? overflow : emptyCount ? emptyCount : 'Vừa đủ'}</b></span></div>
          <div className="scs-pro__stat"><i>F</i><span><small>HÀNG ĐẦU</small><b>{frontPinned.length} ưu tiên</b></span></div>
          <div className="scs-pro__stat"><i>B</i><span><small>HÀNG CUỐI</small><b>{backPinned.length} ưu tiên</b></span></div>
        </section>
      ) : null}

      <section className="scs-pro__stage" aria-label="Sơ đồ chỗ ngồi">
        <div className="scs-pro__stagebar">
          <div className="scs-pro__board"><span className="scs-pro__board-icon">◇</span><span><b>BẢNG / FRONT</b><small>Hàng đầu nằm sát bảng</small></span></div>
          {!studentView ? (
            <div className="scs-pro__stage-actions">
              <div className="scs-pro__font"><button type="button" onClick={() => setFontSize((v) => Math.max(9, v - 1))}>A−</button><b>{fontSize}px</b><button type="button" onClick={() => setFontSize((v) => Math.min(18, v + 1))}>A+</button></div>
              <button type="button" className="scs-pro__shuffle" onClick={() => generateChart('random', true)} disabled={!students.length}>⤨ Xáo trộn</button>
            </div>
          ) : <div className="scs-pro__student-hint">Esc · Thoát trình chiếu</div>}
        </div>

        {chartReady ? (
          <div className="scs-pro__grid-scroll">
            <div className="scs-pro__grid" style={{ '--scs-cols': cols, '--student-font-size': `${fontSize}px` }}>
              {seats.map((student, index) => (
                <button
                  type="button"
                  key={`${dealKey}-${index}-${student || 'empty'}`}
                  className={`scs-pro__seat is-${PALETTE[index % PALETTE.length]}${student ? '' : ' is-empty'}${selectedSeatIndex === index ? ' is-selected' : ''}`}
                  style={{ '--deal-delay': `${Math.min(index * 20, 480)}ms` }}
                  draggable={Boolean(student) && !studentView}
                  onDragStart={() => !studentView && setDragIndex(index)}
                  onDragOver={(event) => !studentView && event.preventDefault()}
                  onDrop={() => !studentView && dropSeat(index)}
                  onDragEnd={() => setDragIndex(null)}
                  onClick={() => clickSeat(index)}
                  aria-label={student || 'Ghế trống'}
                ><strong>{student || 'Trống'}</strong></button>
              ))}
            </div>
          </div>
        ) : (
          <div className="scs-pro__empty"><ClassroomArt /><div className="scs-pro__empty-copy"><span>SƠ ĐỒ SẴN SÀNG</span><h2>Thiết lập lớp rồi tạo sơ đồ</h2><p>Sơ đồ sẽ tự co vừa màn hình desktop. Điều kiện hàng đầu/hàng cuối được giữ kín; khi xáo trộn, học sinh ưu tiên vẫn đổi vị trí tự nhiên trong đúng hàng.</p></div></div>
        )}
      </section>

      {!studentView ? (
        <section className="scs-pro__settings">
          <nav className="scs-pro__tabs" aria-label="Nhóm thiết lập">
            <Tab active={activeTab === 'roster'} icon="👥" onClick={() => setActiveTab('roster')}>Danh sách</Tab>
            <Tab active={activeTab === 'classes'} icon="🏷️" onClick={() => setActiveTab('classes')}>Lớp học</Tab>
            <Tab active={activeTab === 'layout'} icon="🪑" onClick={() => setActiveTab('layout')}>Bố cục</Tab>
            <Tab active={activeTab === 'conditions'} icon="📍" onClick={() => setActiveTab('conditions')}>Điều kiện</Tab>
            <Tab active={activeTab === 'tips'} icon="✨" onClick={() => setActiveTab('tips')}>Gợi ý</Tab>
          </nav>

          <div className="scs-pro__settings-body">
            {activeTab === 'roster' ? <div className="scs-pro__panel-grid">
              <div className="scs-pro__card"><div className="scs-pro__card-head"><div><span className="scs-pro__eyebrow">01 · ROSTER</span><h3>Danh sách học sinh</h3></div><b className="scs-pro__count">{students.length} học sinh</b></div><textarea value={rosterText} onChange={(e) => setRosterText(e.target.value)} rows={10} placeholder={'1. Nguyễn Văn A\n2. Trần Thị B\n3. Lê Minh C'} /><div className="scs-pro__inline"><button type="button" onClick={clearRoster}>Xóa danh sách</button><small>Tự bỏ số thứ tự, dòng trống và tên trùng.</small></div></div>
              <div className="scs-pro__card"><div className="scs-pro__card-head"><div><span className="scs-pro__eyebrow">NHẬP NHANH</span><h3>Dán danh sách theo cách quen dùng</h3></div></div><ClassroomArt /><p className="scs-pro__note">Có thể nhập mỗi học sinh một dòng hoặc phân cách bằng dấu phẩy. Dữ liệu chỉ được xử lý trên trình duyệt hiện tại.</p></div>
            </div> : null}

            {activeTab === 'classes' ? <div className="scs-pro__panel-grid">
              <div className="scs-pro__card"><div className="scs-pro__card-head"><div><span className="scs-pro__eyebrow">02 · CLASS</span><h3>Tên lớp và lưu nhanh</h3></div></div><label>Tên lớp<input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Ví dụ: 12.6" /></label><button type="button" className="scs-pro__primary" onClick={saveClass}>💾 Lưu lớp vào trình duyệt</button></div>
              <div className="scs-pro__card"><div className="scs-pro__card-head"><div><span className="scs-pro__eyebrow">LOCAL STORAGE</span><h3>Mở lớp đã lưu</h3></div><b className="scs-pro__count">{savedClasses.length} lớp</b></div><label>Chọn lớp<select value={selectedSavedId} onChange={(e) => loadClass(e.target.value)}><option value="">— Chọn lớp đã lưu —</option>{savedClasses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.students?.length || 0} HS</option>)}</select></label><button type="button" className="scs-pro__danger" onClick={deleteSavedClass}>🗑 Xóa lớp đã chọn</button><p className="scs-pro__note">Lớp được lưu cục bộ trên trình duyệt này; chưa đồng bộ cloud.</p></div>
            </div> : null}

            {activeTab === 'layout' ? <div className="scs-pro__panel-grid">
              <div className="scs-pro__card"><div className="scs-pro__card-head"><div><span className="scs-pro__eyebrow">03 · LAYOUT</span><h3>Cấu trúc phòng học</h3></div><b className="scs-pro__count">{capacity} chỗ</b></div><div className="scs-pro__two"><label>Số cột<select value={cols} onChange={(e) => { setCols(Number(e.target.value)); setSeats([]); }}>{[4,5,6,7,8,9,10].map((v) => <option key={v} value={v}>{v} cột</option>)}</select></label><label>Số hàng<select value={rows} onChange={(e) => { setRows(Number(e.target.value)); setSeats([]); }}>{[3,4,5,6,7,8].map((v) => <option key={v} value={v}>{v} hàng</option>)}</select></label></div><div className="scs-pro__capacity"><div><span>Học sinh</span><b>{students.length}</b></div><div><span>Sức chứa</span><b>{capacity}</b></div><div><span>{overflow ? 'Thiếu' : 'Trống'}</span><b>{overflow || emptyCount}</b></div></div></div>
              <div className="scs-pro__card"><div className="scs-pro__card-head"><div><span className="scs-pro__eyebrow">ORDER</span><h3>Chế độ sắp xếp</h3></div></div><div className="scs-pro__segmented"><button type="button" className={orderMode === 'random' ? 'is-active' : ''} onClick={() => setOrderMode('random')}>Ngẫu nhiên</button><button type="button" className={orderMode === 'az' ? 'is-active' : ''} onClick={() => setOrderMode('az')}>A → Z</button><button type="button" className={orderMode === 'za' ? 'is-active' : ''} onClick={() => setOrderMode('za')}>Z → A</button></div><p className="scs-pro__note">Nút Xáo trộn ở phía trên luôn random lại toàn bộ vị trí.</p></div>
            </div> : null}

            {activeTab === 'conditions' ? <div className="scs-pro__panel-grid">
              <div className="scs-pro__card scs-pro__condition"><div className="scs-pro__condition-icon">F</div><div><span className="scs-pro__eyebrow">ĐIỀU KIỆN BÍ MẬT</span><h3>Ưu tiên hàng đầu</h3><p>Luôn ở hàng sát BẢNG / FRONT nhưng vẫn đổi ghế trong hàng sau mỗi lần xáo.</p><div className="scs-pro__chips">{frontPinned.length ? frontPinned.map((name) => <span key={name}>{name}</span>) : <i>Chưa chọn học sinh</i>}</div></div><button type="button" onClick={() => openPicker('front')}>Chọn · {frontPinned.length}/{cols}</button></div>
              <div className="scs-pro__card scs-pro__condition"><div className="scs-pro__condition-icon is-back">B</div><div><span className="scs-pro__eyebrow">ĐIỀU KIỆN BÍ MẬT</span><h3>Ưu tiên hàng cuối</h3><p>Luôn ở hàng xa bảng nhất; vị trí trái/phải vẫn được random tự nhiên.</p><div className="scs-pro__chips">{backPinned.length ? backPinned.map((name) => <span key={name}>{name}</span>) : <i>Chưa chọn học sinh</i>}</div></div><button type="button" onClick={() => openPicker('back')}>Chọn · {backPinned.length}/{cols}</button></div>
            </div> : null}

            {activeTab === 'tips' ? <div className="scs-pro__tips"><article><span>🎭</span><h3>Student View</h3><p>Không hiện điều kiện bí mật hay setting. Esc để quay về.</p></article><article><span>🫳</span><h3>Đổi chỗ an toàn</h3><p>Kéo thả hoặc bấm hai ghế liên tiếp. App chặn thao tác phá điều kiện.</p></article><article><span>🎲</span><h3>Random tự nhiên</h3><p>Chỉ khóa theo hàng, không khóa ghế cụ thể.</p></article><article><span>🖨️</span><h3>In sạch</h3><p>Print mode chỉ giữ lại BẢNG và sơ đồ.</p></article></div> : null}
          </div>

          <div className="scs-pro__create"><div><span className="scs-pro__eyebrow">READY TO DEAL</span><b>{students.length ? `${students.length} học sinh · ${capacity} vị trí` : 'Nhập danh sách để bắt đầu'}</b></div><button type="button" onClick={() => generateChart(orderMode, false)} disabled={!students.length || overflow > 0}>✨ Tạo sơ đồ</button></div>
        </section>
      ) : null}

      {picker ? (
        <div className="scs-pro__modal" onMouseDown={(event) => { if (event.target === event.currentTarget) closePicker(); }}>
          <section className="scs-pro__picker" role="dialog" aria-modal="true" aria-label={picker === 'front' ? 'Chọn học sinh hàng đầu' : 'Chọn học sinh hàng cuối'}>
            <header><div><span className="scs-pro__eyebrow">ĐIỀU KIỆN BÍ MẬT</span><h2>{picker === 'front' ? 'Ưu tiên hàng đầu' : 'Ưu tiên hàng cuối'}</h2><p>Chọn tối đa {cols} học sinh. Đây chỉ là bản nháp cho đến khi bạn bấm <b>Lưu lựa chọn</b>.</p></div><button type="button" onClick={closePicker} aria-label="Đóng">×</button></header>
            <div className="scs-pro__picker-search"><span>⌕</span><input autoFocus value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Tìm học sinh..." /><b>{pickerDraft.length}/{cols}</b></div>
            <div className="scs-pro__picker-list">{pickerStudents.map((name) => { const checked = containsName(pickerDraft, name); const blocked = containsName(picker === 'front' ? backPinned : frontPinned, name); return <label key={name} className={blocked ? 'is-blocked' : ''}><input type="checkbox" checked={checked} disabled={blocked} onChange={() => togglePickerStudent(name)} /><span>{name}</span>{blocked ? <small>Nhóm đối lập</small> : null}</label>; })}</div>
            <footer><button type="button" onClick={closePicker}>Hủy</button><button type="button" className="is-primary" onClick={savePicker}>✓ Lưu lựa chọn ({pickerDraft.length})</button></footer>
          </section>
        </div>
      ) : null}

      {toast ? <div className={`scs-pro__toast is-${toast.type}`} role="status"><span>{toast.type === 'error' ? '!' : '✓'}</span>{toast.message}</div> : null}
    </div>
  );
}
