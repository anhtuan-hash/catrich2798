import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SeatingChartStudio.css';

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
    // The app remains usable even if browser storage is unavailable.
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
  const frontIndices = shuffle(Array.from({ length: cols }, (_, index) => index));
  const lastRowStart = (rows - 1) * cols;
  const backIndices = shuffle(Array.from({ length: cols }, (_, index) => lastRowStart + index));

  shuffle(frontPinned).forEach((student, index) => {
    seats[frontIndices[index]] = student;
  });
  shuffle(backPinned).forEach((student, index) => {
    seats[backIndices[index]] = student;
  });

  const constrained = [...frontPinned, ...backPinned];
  const remainingStudents = sortNames(withoutNames(students, constrained), mode);
  const remainingIndices = seats
    .map((seat, index) => (seat === null ? index : -1))
    .filter((index) => index >= 0);

  remainingStudents.forEach((student, index) => {
    seats[remainingIndices[index]] = student;
  });
  return seats;
}

function MiniClassroomArt() {
  return (
    <svg className="scs-illustration" viewBox="0 0 360 210" aria-hidden="true">
      <rect x="20" y="20" width="320" height="170" rx="30" fill="#f5f8ff" />
      <rect x="55" y="42" width="250" height="50" rx="14" fill="#173f69" />
      <rect x="70" y="55" width="98" height="7" rx="4" fill="#dcecff" />
      <rect x="70" y="70" width="152" height="7" rx="4" fill="#8cc5ff" />
      <g fill="#fff">
        <rect x="55" y="116" width="60" height="35" rx="12" />
        <rect x="124" y="116" width="60" height="35" rx="12" />
        <rect x="193" y="116" width="60" height="35" rx="12" />
        <rect x="262" y="116" width="43" height="35" rx="12" />
      </g>
      <g fill="#4d8df7">
        <circle cx="85" cy="126" r="6" />
        <circle cx="154" cy="126" r="6" />
        <circle cx="223" cy="126" r="6" />
        <circle cx="283" cy="126" r="6" />
      </g>
      <path d="M44 166h270" stroke="#d8e3f0" strokeWidth="5" strokeLinecap="round" />
      <circle cx="319" cy="45" r="16" fill="#ffe3a8" />
      <path d="M318 35v20M308 45h20" stroke="#f8a900" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function TabButton({ active, icon, children, onClick }) {
  return (
    <button type="button" className={`scs-tab${active ? ' is-active' : ''}`} onClick={onClick}>
      <span>{icon}</span><b>{children}</b>
    </button>
  );
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
  const [fontSize, setFontSize] = useState(12);
  const [activeTab, setActiveTab] = useState('roster');
  const [studentView, setStudentView] = useState(false);
  const [savedClasses, setSavedClasses] = useState(loadSavedClasses);
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [picker, setPicker] = useState(null);
  const [pickerDraft, setPickerDraft] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [dealKey, setDealKey] = useState(0);
  const [dragIndex, setDragIndex] = useState(null);
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
    if (frontPinned.length > cols) {
      notify(`Hàng đầu chỉ có ${cols} chỗ.`, 'error');
      return false;
    }
    if (backPinned.length > cols) {
      notify(`Hàng cuối chỉ có ${cols} chỗ.`, 'error');
      return false;
    }
    const overlapNames = frontPinned.filter((name) => containsName(backPinned, name));
    if (overlapNames.length) {
      notify('Một học sinh không thể vừa ở hàng đầu vừa ở hàng cuối.', 'error');
      return false;
    }
    return true;
  };

  const generateChart = (mode = orderMode, isShuffle = false) => {
    if (!validatePlan()) return;
    const next = makeSeatPlan({ students, rows, cols, frontPinned, backPinned, mode });
    setSeats(next);
    setDealKey((value) => value + 1);
    notify(isShuffle ? 'Đã xáo trộn sơ đồ.' : 'Đã tạo sơ đồ chỗ ngồi.');
  };

  const resetCurrentSession = () => {
    setClassName('');
    setRosterText('');
    setRows(DEFAULT_ROWS);
    setCols(DEFAULT_COLS);
    setOrderMode('random');
    setFrontPinned([]);
    setBackPinned([]);
    setSeats([]);
    setFontSize(12);
    setSelectedSavedId('');
    setActiveTab('roster');
    notify('Đã đặt lại phiên làm việc hiện tại.');
  };

  const clearRoster = () => {
    setRosterText('');
    setFrontPinned([]);
    setBackPinned([]);
    setSeats([]);
    notify('Đã xóa danh sách hiện tại.');
  };

  const saveClass = () => {
    const name = className.trim();
    if (!name) {
      notify('Hãy nhập tên lớp trước khi lưu.', 'error');
      return;
    }
    if (!students.length) {
      notify('Danh sách lớp đang trống.', 'error');
      return;
    }
    const id = name.toLocaleLowerCase('vi').replace(/\s+/g, '-');
    const item = { id, name, students, updatedAt: new Date().toISOString() };
    const next = [item, ...savedClasses.filter((entry) => entry.id !== id)].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    setSavedClasses(next);
    setSelectedSavedId(id);
    persistSavedClasses(next);
    notify(`Đã lưu lớp ${name}.`);
  };

  const loadClass = (id) => {
    setSelectedSavedId(id);
    const item = savedClasses.find((entry) => entry.id === id);
    if (!item) return;
    setClassName(item.name || '');
    setRosterText((item.students || []).join('\n'));
    setFrontPinned([]);
    setBackPinned([]);
    setSeats([]);
    notify(`Đã tải lớp ${item.name}.`);
  };

  const deleteSavedClass = () => {
    const item = savedClasses.find((entry) => entry.id === selectedSavedId);
    if (!item) {
      notify('Hãy chọn một lớp đã lưu.', 'error');
      return;
    }
    if (!window.confirm(`Xóa lớp ${item.name} khỏi bộ nhớ trình duyệt?`)) return;
    const next = savedClasses.filter((entry) => entry.id !== item.id);
    setSavedClasses(next);
    setSelectedSavedId('');
    persistSavedClasses(next);
    notify(`Đã xóa lớp ${item.name}.`);
  };

  const openPicker = (type) => {
    if (!students.length) {
      notify('Hãy nhập danh sách học sinh trước.', 'error');
      return;
    }
    setPicker(type);
    setPickerDraft(type === 'front' ? [...frontPinned] : [...backPinned]);
    setPickerSearch('');
  };

  const togglePickerStudent = (name) => {
    const opposite = picker === 'front' ? backPinned : frontPinned;
    if (containsName(opposite, name)) {
      notify('Học sinh này đã thuộc nhóm đối lập.', 'error');
      return;
    }
    const exists = containsName(pickerDraft, name);
    if (!exists && pickerDraft.length >= cols) {
      notify(`Mỗi hàng chỉ có tối đa ${cols} học sinh ưu tiên.`, 'error');
      return;
    }
    setPickerDraft((current) => exists ? current.filter((item) => !isSameName(item, name)) : [...current, name]);
  };

  const confirmPicker = () => {
    if (picker === 'front') setFrontPinned(pickerDraft);
    if (picker === 'back') setBackPinned(pickerDraft);
    setPicker(null);
    setPickerSearch('');
    notify('Đã cập nhật điều kiện bí mật.');
  };

  const studentCanSitAt = (student, targetIndex) => {
    if (!student) return true;
    const targetRow = rowOf(targetIndex, cols);
    if (containsName(frontPinned, student)) return targetRow === 0;
    if (containsName(backPinned, student)) return targetRow === rows - 1;
    return true;
  };

  const swapSeats = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const sourceStudent = seats[dragIndex];
    const targetStudent = seats[targetIndex];
    if (!studentCanSitAt(sourceStudent, targetIndex) || !studentCanSitAt(targetStudent, dragIndex)) {
      notify('Không thể đổi chỗ vì sẽ phá điều kiện hàng đầu/hàng cuối.', 'error');
      setDragIndex(null);
      return;
    }
    const next = [...seats];
    [next[dragIndex], next[targetIndex]] = [next[targetIndex], next[dragIndex]];
    setSeats(next);
    setDragIndex(null);
    notify('Đã đổi chỗ thủ công.');
  };

  const visiblePickerStudents = students.filter((name) => name.toLocaleLowerCase('vi').includes(pickerSearch.trim().toLocaleLowerCase('vi')));

  return (
    <div className={`scs${studentView ? ' is-student-view' : ''}`}>
      {!studentView ? (
        <header className="scs-app-header">
          <div className="scs-brand-lockup">
            <span className="scs-brand-icon">S</span>
            <div><b>Seating Chart Studio</b><small>V10 · Brian Classroom Utility</small></div>
          </div>
          <div className="scs-header-actions">
            <button type="button" onClick={() => setStudentView(true)} disabled={!chartReady}>◉ Chế độ học sinh</button>
            <button type="button" onClick={() => window.print()} disabled={!chartReady}>⎙ In sơ đồ</button>
            <button type="button" className="is-quiet" onClick={resetCurrentSession}>↺ Reset</button>
          </div>
        </header>
      ) : null}

      <section className="scs-summary" aria-label="Tổng quan sơ đồ">
        <div><span>LỚP HIỆN TẠI</span><strong>{className.trim() || 'Chưa đặt tên'}</strong></div>
        <div><span>BỐ CỤC</span><strong>{rows} × {cols}</strong></div>
        <div><span>SỨC CHỨA</span><strong className={overflow ? 'is-danger' : ''}>{students.length} / {capacity}</strong></div>
        <div className="scs-capacity-note"><span>{overflow ? 'Thiếu chỗ' : emptyCount ? 'Ghế trống' : 'Vừa đủ'}</span><strong>{overflow || emptyCount}</strong></div>
      </section>

      <section className="scs-stage" aria-label="Sơ đồ chỗ ngồi">
        <div className="scs-frontbar">
          <div className="scs-board"><span>◈</span><b>BẢNG / FRONT</b><small>Hàng đầu ở sát bảng</small></div>
          {!studentView ? (
            <div className="scs-stage-tools">
              <div className="scs-font-control" aria-label="Cỡ chữ tên học sinh">
                <button type="button" onClick={() => setFontSize((value) => Math.max(9, value - 1))}>A−</button>
                <b>{fontSize}px</b>
                <button type="button" onClick={() => setFontSize((value) => Math.min(16, value + 1))}>A+</button>
              </div>
              <button type="button" className="scs-shuffle" onClick={() => generateChart('random', true)} disabled={!students.length}>⤨ Xáo trộn</button>
            </div>
          ) : <div className="scs-student-hint">Nhấn Esc để thoát chế độ trình chiếu</div>}
        </div>

        {chartReady ? (
          <div className="scs-grid-wrap">
            <div className="scs-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(92px, 1fr))`, '--student-font-size': `${fontSize}px` }}>
              {seats.map((student, index) => (
                <button
                  type="button"
                  className={`scs-seat is-${PALETTE[index % PALETTE.length]}${student ? '' : ' is-empty'}`}
                  key={`${dealKey}-${index}-${student || 'empty'}`}
                  style={{ '--deal-delay': `${Math.min(index * 22, 520)}ms` }}
                  draggable={Boolean(student) && !studentView}
                  onDragStart={() => !studentView && setDragIndex(index)}
                  onDragOver={(event) => !studentView && event.preventDefault()}
                  onDrop={() => !studentView && swapSeats(index)}
                  onDragEnd={() => setDragIndex(null)}
                  aria-label={student || 'Ghế trống'}
                >
                  <span className="scs-seat-dot" />
                  <strong>{student || 'Trống'}</strong>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="scs-empty-stage">
            <MiniClassroomArt />
            <div><span>SƠ ĐỒ SẴN SÀNG</span><h2>Nhập lớp rồi tạo sơ đồ</h2><p>Điều kiện hàng đầu/hàng cuối được giữ kín. Khi random, học sinh ưu tiên vẫn đổi vị trí tự nhiên trong đúng hàng.</p></div>
          </div>
        )}
      </section>

      {!studentView ? (
        <section className="scs-control-panel">
          <nav className="scs-tabs" aria-label="Nhóm thiết lập">
            <TabButton active={activeTab === 'roster'} icon="👥" onClick={() => setActiveTab('roster')}>Danh sách</TabButton>
            <TabButton active={activeTab === 'classes'} icon="🏷️" onClick={() => setActiveTab('classes')}>Lớp học</TabButton>
            <TabButton active={activeTab === 'layout'} icon="🪑" onClick={() => setActiveTab('layout')}>Bố cục</TabButton>
            <TabButton active={activeTab === 'conditions'} icon="📍" onClick={() => setActiveTab('conditions')}>Điều kiện</TabButton>
            <TabButton active={activeTab === 'tips'} icon="✨" onClick={() => setActiveTab('tips')}>Gợi ý</TabButton>
          </nav>

          <div className="scs-tab-content">
            {activeTab === 'roster' ? (
              <div className="scs-panel-grid is-roster">
                <div className="scs-card">
                  <div className="scs-card-head"><div><span>01 · ROSTER</span><h3>Danh sách học sinh</h3></div><b className="scs-count">{students.length} học sinh</b></div>
                  <textarea value={rosterText} onChange={(event) => setRosterText(event.target.value)} rows={10} placeholder={'1. Nguyễn Văn A\n2. Trần Thị B\n3. Lê Minh C'} />
                  <div className="scs-inline-actions"><button type="button" className="is-danger-text" onClick={clearRoster}>Xóa danh sách</button><small>Tự bỏ số thứ tự, dòng trống và tên trùng.</small></div>
                </div>
                <div className="scs-card scs-explain-card"><MiniClassroomArt /><h3>Dán danh sách theo cách bạn quen dùng</h3><p>Mỗi học sinh một dòng hoặc phân cách bằng dấu phẩy. Dữ liệu được làm sạch ngay trên trình duyệt.</p><div className="scs-chip-row"><span>✓ Bỏ số đầu dòng</span><span>✓ Xóa tên trùng</span><span>✓ Đếm tự động</span></div></div>
              </div>
            ) : null}

            {activeTab === 'classes' ? (
              <div className="scs-panel-grid">
                <div className="scs-card">
                  <div className="scs-card-head"><div><span>02 · CLASS</span><h3>Tên lớp và lưu nhanh</h3></div></div>
                  <label>Tên lớp<input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Ví dụ: 12.6" /></label>
                  <button type="button" className="scs-primary-action" onClick={saveClass}>💾 Lưu lớp vào trình duyệt</button>
                </div>
                <div className="scs-card">
                  <div className="scs-card-head"><div><span>LOCAL STORAGE</span><h3>Mở lớp đã lưu</h3></div><b className="scs-count">{savedClasses.length} lớp</b></div>
                  <label>Chọn lớp<select value={selectedSavedId} onChange={(event) => loadClass(event.target.value)}><option value="">— Chọn lớp đã lưu —</option>{savedClasses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.students?.length || 0} HS</option>)}</select></label>
                  <button type="button" className="scs-danger-action" onClick={deleteSavedClass}>🗑 Xóa lớp đã chọn</button>
                  <p className="scs-note">Dữ liệu hiện lưu trên chính trình duyệt này; chưa đồng bộ cloud hoặc đa thiết bị.</p>
                </div>
              </div>
            ) : null}

            {activeTab === 'layout' ? (
              <div className="scs-panel-grid">
                <div className="scs-card">
                  <div className="scs-card-head"><div><span>03 · LAYOUT</span><h3>Cấu trúc phòng học</h3></div><b className={`scs-count${overflow ? ' is-danger' : ''}`}>{capacity} chỗ</b></div>
                  <div className="scs-two-fields"><label>Số cột<select value={cols} onChange={(event) => { setCols(Number(event.target.value)); setSeats([]); }}>{[4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value} cột</option>)}</select></label><label>Số hàng<select value={rows} onChange={(event) => { setRows(Number(event.target.value)); setSeats([]); }}>{[3,4,5,6,7,8].map((value) => <option key={value} value={value}>{value} hàng</option>)}</select></label></div>
                  <div className="scs-capacity-box"><div><span>Học sinh</span><b>{students.length}</b></div><div><span>Sức chứa</span><b>{capacity}</b></div><div><span>{overflow ? 'Thiếu' : 'Trống'}</span><b className={overflow ? 'is-danger' : ''}>{overflow || emptyCount}</b></div></div>
                </div>
                <div className="scs-card">
                  <div className="scs-card-head"><div><span>ORDER</span><h3>Chế độ sắp xếp</h3></div></div>
                  <div className="scs-segmented">
                    <button type="button" className={orderMode === 'random' ? 'is-active' : ''} onClick={() => setOrderMode('random')}>Ngẫu nhiên</button>
                    <button type="button" className={orderMode === 'az' ? 'is-active' : ''} onClick={() => setOrderMode('az')}>A → Z</button>
                    <button type="button" className={orderMode === 'za' ? 'is-active' : ''} onClick={() => setOrderMode('za')}>Z → A</button>
                  </div>
                  <p className="scs-note">Nút Xáo trộn trên BẢNG / FRONT luôn random lại toàn bộ vị trí, bất kể lựa chọn này.</p>
                </div>
              </div>
            ) : null}

            {activeTab === 'conditions' ? (
              <div className="scs-panel-grid">
                <div className="scs-card scs-condition-card">
                  <div className="scs-condition-icon is-front">F</div><div><span>ĐIỀU KIỆN BÍ MẬT</span><h3>Ưu tiên hàng đầu</h3><p>Luôn ở hàng sát BẢNG / FRONT nhưng mỗi lần random vẫn đổi ghế trong hàng.</p><div className="scs-selected-list">{frontPinned.length ? frontPinned.map((name) => <span key={name}>{name}</span>) : <i>Chưa chọn học sinh</i>}</div></div><button type="button" onClick={() => openPicker('front')}>Chọn · {frontPinned.length}/{cols}</button>
                </div>
                <div className="scs-card scs-condition-card">
                  <div className="scs-condition-icon is-back">B</div><div><span>ĐIỀU KIỆN BÍ MẬT</span><h3>Ưu tiên hàng cuối</h3><p>Luôn ở hàng xa bảng nhất; vị trí trái/phải vẫn được xáo trộn tự nhiên.</p><div className="scs-selected-list">{backPinned.length ? backPinned.map((name) => <span key={name}>{name}</span>) : <i>Chưa chọn học sinh</i>}</div></div><button type="button" onClick={() => openPicker('back')}>Chọn · {backPinned.length}/{cols}</button>
                </div>
              </div>
            ) : null}

            {activeTab === 'tips' ? (
              <div className="scs-tips-grid">
                <article><span>🎭</span><h3>Student View</h3><p>Không hiện điều kiện bí mật, setting hoặc ký hiệu phân biệt. Nhấn Esc để quay về chế độ giáo viên.</p></article>
                <article><span>🫳</span><h3>Kéo thả an toàn</h3><p>Có thể đổi chỗ thủ công. App chặn thao tác làm học sinh ưu tiên rời khỏi hàng đã quy định.</p></article>
                <article><span>🎲</span><h3>Random tự nhiên</h3><p>Học sinh ưu tiên chỉ bị giữ theo hàng, không bị khóa vào ghế cụ thể nên mỗi lần xáo vẫn tự nhiên.</p></article>
                <article><span>🖨️</span><h3>In sạch</h3><p>Chế độ in tự ẩn toàn bộ thiết lập và ưu tiên sơ đồ cùng BẢNG / FRONT.</p></article>
              </div>
            ) : null}
          </div>

          <div className="scs-create-bar">
            <div><span>READY TO DEAL</span><b>{students.length ? `${students.length} học sinh · ${capacity} vị trí` : 'Nhập danh sách để bắt đầu'}</b></div>
            <button type="button" onClick={() => generateChart(orderMode, false)} disabled={!students.length || overflow > 0}>✨ Tạo sơ đồ</button>
          </div>
        </section>
      ) : null}

      {picker ? (
        <div className="scs-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPicker(null); }}>
          <section className="scs-picker" role="dialog" aria-modal="true" aria-label={picker === 'front' ? 'Chọn học sinh hàng đầu' : 'Chọn học sinh hàng cuối'}>
            <header><div><span>ĐIỀU KIỆN BÍ MẬT</span><h2>{picker === 'front' ? 'Ưu tiên hàng đầu' : 'Ưu tiên hàng cuối'}</h2><p>Tối đa {cols} học sinh. Học sinh ở nhóm đối lập sẽ không thể chọn.</p></div><button type="button" onClick={() => setPicker(null)}>×</button></header>
            <div className="scs-picker-search"><span>⌕</span><input autoFocus value={pickerSearch} onChange={(event) => setPickerSearch(event.target.value)} placeholder="Tìm học sinh..." /><b>{pickerDraft.length}/{cols}</b></div>
            <div className="scs-picker-list">{visiblePickerStudents.map((name) => {
              const checked = containsName(pickerDraft, name);
              const blocked = containsName(picker === 'front' ? backPinned : frontPinned, name);
              return <label key={name} className={blocked ? 'is-blocked' : ''}><input type="checkbox" checked={checked} disabled={blocked} onChange={() => togglePickerStudent(name)} /><span>{name}</span>{blocked ? <small>Đã ở nhóm đối lập</small> : null}</label>;
            })}</div>
            <footer><button type="button" onClick={() => setPicker(null)}>Hủy</button><button type="button" className="is-primary" onClick={confirmPicker}>Xác nhận {pickerDraft.length} học sinh</button></footer>
          </section>
        </div>
      ) : null}

      {toast ? <div className={`scs-toast is-${toast.type}`} role="status"><span>{toast.type === 'error' ? '!' : '✓'}</span>{toast.message}</div> : null}
    </div>
  );
}
