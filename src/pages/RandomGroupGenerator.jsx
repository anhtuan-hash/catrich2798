import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  Expand,
  Eye,
  EyeOff,
  FileUp,
  GripVertical,
  Maximize2,
  Minimize2,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  UserRoundCheck,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';
import '../styles/random-group-generator.css';

const STORAGE_KEY = 'bes-random-group-classes-v1';
const DRAFT_KEY = 'bes-random-group-draft-v1';
const GROUP_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2', '#ca8a04', '#475569', '#9333ea', '#16a34a'];
const ROLE_SETS = {
  vi: ['Nhóm trưởng', 'Thư ký', 'Báo cáo viên', 'Quản lý thời gian'],
  en: ['Leader', 'Recorder', 'Reporter', 'Timekeeper'],
};

const COPY = {
  vi: {
    eyebrow: 'TIỆN ÍCH LỚP HỌC · OFFLINE',
    title: 'Brian Group Maker',
    subtitle: 'Tạo nhóm ngẫu nhiên công bằng, trực quan và sẵn sàng trình chiếu chỉ trong vài giây.',
    back: 'Quay lại',
    roster: 'Danh sách học sinh',
    onePerLine: 'Mỗi dòng một học sinh. Có thể dán trực tiếp từ Excel.',
    placeholder: 'Nguyễn Minh Anh\nTrần Gia Bảo\nLê Khánh Chi\nPhạm Đức Duy',
    import: 'Nhập tệp',
    sample: 'Dữ liệu mẫu',
    clear: 'Xóa hết',
    className: 'Tên lớp',
    saveClass: 'Lưu lớp',
    savedClasses: 'Lớp đã lưu',
    noSaved: 'Chưa có lớp nào được lưu.',
    students: 'học sinh',
    absent: 'Vắng',
    present: 'Có mặt',
    settings: 'Cách chia nhóm',
    bySize: 'Số người mỗi nhóm',
    byCount: 'Số nhóm cần tạo',
    groupSize: 'Người / nhóm',
    groupCount: 'Số nhóm',
    remainder: 'Khi chia không đều',
    balance: 'Phân bổ đều',
    smallLast: 'Giữ nhóm cuối nhỏ hơn',
    roles: 'Tự động gán vai trò',
    reveal: 'Mở nhóm lần lượt khi trình chiếu',
    generate: 'Tạo nhóm ngay',
    regenerate: 'Chia lại',
    result: 'Kết quả chia nhóm',
    resultHint: 'Có thể kéo học sinh sang nhóm khác để điều chỉnh.',
    groups: 'nhóm',
    activeStudents: 'học sinh có mặt',
    emptyResult: 'Nhập danh sách học sinh rồi nhấn “Tạo nhóm ngay”.',
    group: 'Nhóm',
    rename: 'Đổi tên nhóm',
    randomLeader: 'Chọn nhóm trưởng mới',
    show: 'Hiện nhóm',
    hide: 'Ẩn nhóm',
    revealNext: 'Hiện nhóm tiếp theo',
    revealAll: 'Hiện tất cả',
    hideAll: 'Ẩn tất cả',
    presentMode: 'Trình chiếu',
    exitPresent: 'Thoát trình chiếu',
    copy: 'Sao chép',
    print: 'In / PDF',
    exportTxt: 'Xuất TXT',
    copied: 'Đã sao chép kết quả.',
    saved: 'Đã lưu danh sách lớp.',
    deleted: 'Đã xóa lớp đã lưu.',
    needStudents: 'Cần ít nhất 2 học sinh có mặt.',
    loadError: 'Không thể đọc tệp này.',
    duplicateNotice: 'Tên trùng vẫn được giữ như các học sinh riêng biệt.',
    quickTip: 'Mẹo: dùng dấu “|” để thêm nhãn, ví dụ: Minh Anh | A. Nhãn chỉ hỗ trợ nhận diện và vẫn được giữ khi xuất.',
    members: 'thành viên',
  },
  en: {
    eyebrow: 'CLASSROOM UTILITY · OFFLINE',
    title: 'Brian Group Maker',
    subtitle: 'Create fair, visual, projector-ready random groups in seconds.',
    back: 'Back',
    roster: 'Student roster',
    onePerLine: 'One student per line. Paste directly from Excel if needed.',
    placeholder: 'Alex Nguyen\nBella Tran\nChris Le\nDaisy Pham',
    import: 'Import file',
    sample: 'Sample data',
    clear: 'Clear all',
    className: 'Class name',
    saveClass: 'Save class',
    savedClasses: 'Saved classes',
    noSaved: 'No saved classes yet.',
    students: 'students',
    absent: 'Absent',
    present: 'Present',
    settings: 'Grouping method',
    bySize: 'Students per group',
    byCount: 'Number of groups',
    groupSize: 'Students / group',
    groupCount: 'Groups',
    remainder: 'When groups are uneven',
    balance: 'Distribute evenly',
    smallLast: 'Keep a smaller final group',
    roles: 'Assign group roles automatically',
    reveal: 'Reveal groups one by one in presentation mode',
    generate: 'Generate groups',
    regenerate: 'Shuffle again',
    result: 'Generated groups',
    resultHint: 'Drag students between groups to make adjustments.',
    groups: 'groups',
    activeStudents: 'present students',
    emptyResult: 'Enter a roster and select “Generate groups”.',
    group: 'Group',
    rename: 'Rename group',
    randomLeader: 'Pick a new leader',
    show: 'Show group',
    hide: 'Hide group',
    revealNext: 'Reveal next group',
    revealAll: 'Reveal all',
    hideAll: 'Hide all',
    presentMode: 'Present',
    exitPresent: 'Exit presentation',
    copy: 'Copy',
    print: 'Print / PDF',
    exportTxt: 'Export TXT',
    copied: 'Results copied.',
    saved: 'Class roster saved.',
    deleted: 'Saved class deleted.',
    needStudents: 'At least two present students are required.',
    loadError: 'This file could not be read.',
    duplicateNotice: 'Duplicate names are kept as separate students.',
    quickTip: 'Tip: add a label with “|”, for example: Alex Nguyen | A. Labels stay attached when exporting.',
    members: 'members',
  },
};

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readStoredClasses() {
  if (typeof window === 'undefined') return [];
  const data = safeParse(window.localStorage.getItem(STORAGE_KEY) || '[]', []);
  return Array.isArray(data) ? data.slice(0, 24) : [];
}

function parseRoster(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [namePart, ...tagParts] = line.split('|');
      const name = String(namePart || '').trim();
      const tag = tagParts.join('|').trim();
      return {
        id: `student-${index}-${name.toLowerCase().replace(/[^a-z0-9\u00C0-\u024f\u1E00-\u1EFF]+/gi, '-')}`,
        name,
        tag,
      };
    })
    .filter((item) => item.name);
}

function shuffleArray(items) {
  const next = [...items];
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const random = new Uint32Array(Math.max(1, next.length));
    crypto.getRandomValues(random);
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = random[index] % (index + 1);
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

function assignRoles(members, language) {
  const roles = ROLE_SETS[language] || ROLE_SETS.vi;
  return members.reduce((result, member, index) => {
    result[member.id] = index < roles.length ? roles[index] : '';
    return result;
  }, {});
}

function createGroups(students, options, language) {
  const shuffled = shuffleArray(students);
  const groups = [];
  const requested = clamp(options.value, 2, Math.max(2, students.length));

  if (options.mode === 'count') {
    const groupCount = clamp(requested, 2, Math.min(12, students.length));
    for (let index = 0; index < groupCount; index += 1) groups.push([]);
    shuffled.forEach((student, index) => groups[index % groupCount].push(student));
  } else if (options.remainder === 'small-last') {
    for (let index = 0; index < shuffled.length; index += requested) groups.push(shuffled.slice(index, index + requested));
  } else {
    const groupCount = Math.max(1, Math.ceil(shuffled.length / requested));
    for (let index = 0; index < groupCount; index += 1) groups.push([]);
    shuffled.forEach((student, index) => groups[index % groupCount].push(student));
  }

  return groups
    .filter((members) => members.length)
    .map((members, index) => ({
      id: `group-${Date.now()}-${index}`,
      name: `${language === 'vi' ? 'Nhóm' : 'Group'} ${index + 1}`,
      color: GROUP_COLORS[index % GROUP_COLORS.length],
      members,
      roles: options.assignRoles ? assignRoles(members, language) : {},
      visible: !options.revealOneByOne || index === 0,
    }));
}

function resultToText(groups, language) {
  const roleLabel = language === 'vi' ? 'Vai trò' : 'Role';
  return groups.map((group) => {
    const students = group.members.map((member, index) => {
      const role = group.roles?.[member.id];
      return `${index + 1}. ${member.name}${member.tag ? ` (${member.tag})` : ''}${role ? ` — ${roleLabel}: ${role}` : ''}`;
    });
    return `${group.name}\n${students.join('\n')}`;
  }).join('\n\n');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function RandomGroupGenerator({ language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const fileInputRef = useRef(null);
  const stageRef = useRef(null);
  const [rosterText, setRosterText] = useState(() => {
    if (typeof window === 'undefined') return '';
    return safeParse(window.localStorage.getItem(DRAFT_KEY) || '{}', {}).rosterText || '';
  });
  const [className, setClassName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return safeParse(window.localStorage.getItem(DRAFT_KEY) || '{}', {}).className || '';
  });
  const [mode, setMode] = useState('size');
  const [groupValue, setGroupValue] = useState(4);
  const [remainder, setRemainder] = useState('balanced');
  const [assignRoleMode, setAssignRoleMode] = useState(true);
  const [revealOneByOne, setRevealOneByOne] = useState(false);
  const [absentIds, setAbsentIds] = useState(() => new Set());
  const [groups, setGroups] = useState([]);
  const [savedClasses, setSavedClasses] = useState(readStoredClasses);
  const [notice, setNotice] = useState('');
  const [presenting, setPresenting] = useState(false);
  const [draggedMember, setDraggedMember] = useState(null);

  const roster = useMemo(() => parseRoster(rosterText), [rosterText]);
  const presentStudents = useMemo(() => roster.filter((student) => !absentIds.has(student.id)), [roster, absentIds]);
  const duplicateCount = useMemo(() => {
    const counts = new Map();
    roster.forEach((item) => counts.set(item.name.toLowerCase(), (counts.get(item.name.toLowerCase()) || 0) + 1));
    return [...counts.values()].filter((count) => count > 1).length;
  }, [roster]);

  useEffect(() => {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ rosterText, className })); } catch { /* optional */ }
  }, [rosterText, className]);

  useEffect(() => {
    const onFullscreen = () => setPresenting(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  useEffect(() => {
    const validIds = new Set(roster.map((student) => student.id));
    setAbsentIds((current) => new Set([...current].filter((id) => validIds.has(id))));
  }, [rosterText]);

  const flash = (message) => {
    setNotice(message);
    window.clearTimeout(window.__besGroupNoticeTimer);
    window.__besGroupNoticeTimer = window.setTimeout(() => setNotice(''), 2600);
  };

  const generate = () => {
    if (presentStudents.length < 2) {
      flash(t.needStudents);
      return;
    }
    const nextGroups = createGroups(presentStudents, {
      mode,
      value: groupValue,
      remainder,
      assignRoles: assignRoleMode,
      revealOneByOne,
    }, language);
    setGroups(nextGroups);
    window.setTimeout(() => document.getElementById('brian-group-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const toggleAbsent = (id) => {
    setAbsentIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveClass = () => {
    if (!roster.length) return;
    const item = {
      id: `class-${Date.now()}`,
      name: className.trim() || `${language === 'vi' ? 'Lớp' : 'Class'} ${savedClasses.length + 1}`,
      rosterText,
      count: roster.length,
      updatedAt: new Date().toISOString(),
    };
    const next = [item, ...savedClasses.filter((entry) => entry.name.toLowerCase() !== item.name.toLowerCase())].slice(0, 24);
    setSavedClasses(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* optional */ }
    flash(t.saved);
  };

  const deleteSavedClass = (id) => {
    const next = savedClasses.filter((item) => item.id !== id);
    setSavedClasses(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* optional */ }
    flash(t.deleted);
  };

  const loadSavedClass = (item) => {
    setClassName(item.name);
    setRosterText(item.rosterText);
    setAbsentIds(new Set());
    setGroups([]);
  };

  const loadSample = () => {
    const names = language === 'vi'
      ? ['Nguyễn Minh Anh', 'Trần Gia Bảo', 'Lê Khánh Chi', 'Phạm Đức Duy', 'Võ Hoàng Em', 'Bùi Thảo Giang', 'Đặng Quốc Huy', 'Hồ Ngọc Khánh', 'Đỗ Phương Linh', 'Lý Tuấn Minh', 'Mai Bảo Ngân', 'Ngô Hải Nam', 'Phan Nhật Quang', 'Trương Mỹ Tâm', 'Dương Thanh Trúc', 'Huỳnh Anh Vũ']
      : ['Alex Nguyen', 'Bella Tran', 'Chris Le', 'Daisy Pham', 'Ethan Vo', 'Grace Bui', 'Henry Dang', 'Ivy Ho', 'Jack Do', 'Lily Ly', 'Mia Mai', 'Noah Ngo', 'Oliver Phan', 'Sophie Truong', 'Tina Duong', 'William Huynh'];
    setClassName(language === 'vi' ? 'Lớp mẫu 12.1' : 'Sample Class 12.1');
    setRosterText(names.join('\n'));
    setAbsentIds(new Set());
    setGroups([]);
  };

  const importFile = async (file) => {
    if (!file) return;
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls'].includes(extension)) {
        const readXlsxFile = (await import('read-excel-file')).default;
        const rows = await readXlsxFile(file);
        const names = rows.map((row) => {
          const cells = row.map((cell) => String(cell || '').trim()).filter(Boolean);
          return cells.length > 1 ? `${cells[0]} | ${cells[1]}` : cells[0] || '';
        }).filter(Boolean);
        setRosterText(names.join('\n'));
      } else {
        const text = await file.text();
        const normalized = extension === 'csv'
          ? text.split(/\r?\n/).map((line) => line.split(',')[0].replace(/^"|"$/g, '').trim()).filter(Boolean).join('\n')
          : text;
        setRosterText(normalized);
      }
      setClassName(file.name.replace(/\.[^.]+$/, ''));
      setAbsentIds(new Set());
      setGroups([]);
    } catch {
      flash(t.loadError);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renameGroup = (id) => {
    const current = groups.find((group) => group.id === id);
    if (!current) return;
    const nextName = window.prompt(t.rename, current.name)?.trim();
    if (!nextName) return;
    setGroups((items) => items.map((group) => group.id === id ? { ...group, name: nextName.slice(0, 40) } : group));
  };

  const randomLeader = (id) => {
    setGroups((items) => items.map((group) => {
      if (group.id !== id || !group.members.length) return group;
      const roles = { ...(group.roles || {}) };
      Object.keys(roles).forEach((memberId) => {
        if (roles[memberId] === ROLE_SETS[language][0]) roles[memberId] = '';
      });
      const leader = group.members[Math.floor(Math.random() * group.members.length)];
      roles[leader.id] = ROLE_SETS[language][0];
      return { ...group, roles };
    }));
  };

  const dropMember = (targetGroupId) => {
    if (!draggedMember || draggedMember.groupId === targetGroupId) return;
    setGroups((items) => {
      const source = items.find((group) => group.id === draggedMember.groupId);
      const member = source?.members.find((item) => item.id === draggedMember.memberId);
      if (!member) return items;
      return items.map((group) => {
        if (group.id === draggedMember.groupId) {
          const members = group.members.filter((item) => item.id !== member.id);
          const roles = assignRoleMode ? assignRoles(members, language) : { ...(group.roles || {}) };
          delete roles[member.id];
          return { ...group, members, roles };
        }
        if (group.id === targetGroupId) {
          const members = [...group.members, member];
          const roles = assignRoleMode ? assignRoles(members, language) : { ...(group.roles || {}) };
          return { ...group, members, roles };
        }
        return group;
      }).filter((group) => group.members.length);
    });
    setDraggedMember(null);
  };

  const revealNext = () => {
    setGroups((items) => {
      const nextHidden = items.findIndex((group) => !group.visible);
      if (nextHidden < 0) return items;
      return items.map((group, index) => index === nextHidden ? { ...group, visible: true } : group);
    });
  };

  const setAllVisibility = (visible) => setGroups((items) => items.map((group) => ({ ...group, visible })));

  const togglePresentation = async () => {
    const target = stageRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      setPresenting(false);
      return;
    }
    try {
      await target.requestFullscreen?.();
      setPresenting(true);
    } catch {
      setPresenting((value) => !value);
    }
  };

  const copyResults = async () => {
    const text = resultToText(groups, language);
    try { await navigator.clipboard.writeText(text); } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    flash(t.copied);
  };

  const stats = {
    total: roster.length,
    present: presentStudents.length,
    groups: groups.length,
  };

  return (
    <div className={`brian-group-app ${presenting ? 'is-presenting' : ''}`} ref={stageRef}>
      <header className="brian-group-topbar">
        <button type="button" className="brian-group-back" onClick={() => window.history.back()}>
          <ArrowLeft size={18} /> {t.back}
        </button>
        <div className="brian-group-top-actions">
          {groups.length > 0 && <>
            <button type="button" onClick={copyResults}><Clipboard size={18} /> {t.copy}</button>
            <button type="button" onClick={() => { setAllVisibility(true); window.setTimeout(() => window.print(), 60); }}><Printer size={18} /> {t.print}</button>
            <button type="button" onClick={() => downloadText(`${className || 'brian-groups'}.txt`, resultToText(groups, language))}><Download size={18} /> {t.exportTxt}</button>
          </>}
          <button type="button" className="brian-group-present-button" onClick={togglePresentation}>
            {presenting ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            {presenting ? t.exitPresent : t.presentMode}
          </button>
        </div>
      </header>

      <section className="brian-group-hero">
        <div className="brian-group-hero-copy">
          <span className="brian-group-eyebrow"><Sparkles size={16} /> {t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className="brian-group-stats">
            <span><Users size={18} /><b>{stats.total}</b>{t.students}</span>
            <span><UserRoundCheck size={18} /><b>{stats.present}</b>{t.activeStudents}</span>
            <span><WandSparkles size={18} /><b>{stats.groups}</b>{t.groups}</span>
          </div>
        </div>
        <div className="brian-group-hero-visual" aria-hidden="true">
          <div className="group-orbit orbit-a"><span>A</span><span>B</span><span>C</span></div>
          <div className="group-orbit orbit-b"><span>1</span><span>2</span><span>3</span><span>4</span></div>
          <div className="group-orbit-core"><Shuffle size={38} /><b>GROUP</b></div>
        </div>
      </section>

      {!presenting && <main className="brian-group-workspace">
        <section className="brian-group-panel brian-group-roster-panel">
          <div className="brian-group-panel-heading">
            <div><span>01</span><h2>{t.roster}</h2><p>{t.onePerLine}</p></div>
            <strong>{roster.length} {t.students}</strong>
          </div>

          <div className="brian-group-roster-actions">
            <input ref={fileInputRef} type="file" accept=".txt,.csv,.xlsx,.xls" hidden onChange={(event) => importFile(event.target.files?.[0])} />
            <button type="button" onClick={() => fileInputRef.current?.click()}><FileUp size={17} /> {t.import}</button>
            <button type="button" onClick={loadSample}><Plus size={17} /> {t.sample}</button>
            <button type="button" className="danger" onClick={() => { setRosterText(''); setGroups([]); setAbsentIds(new Set()); }}><Trash2 size={17} /> {t.clear}</button>
          </div>

          <textarea value={rosterText} onChange={(event) => setRosterText(event.target.value)} placeholder={t.placeholder} rows={12} spellCheck="false" />
          <p className="brian-group-tip">{t.quickTip}</p>
          {duplicateCount > 0 && <p className="brian-group-duplicate"><Check size={15} /> {t.duplicateNotice}</p>}

          {roster.length > 0 && <div className="brian-group-attendance-list">
            {roster.map((student, index) => {
              const absent = absentIds.has(student.id);
              return <button type="button" key={student.id} className={absent ? 'is-absent' : ''} onClick={() => toggleAbsent(student.id)}>
                <span className="student-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="student-name"><b>{student.name}</b>{student.tag && <small>{student.tag}</small>}</span>
                <span className="attendance-state">{absent ? <EyeOff size={16} /> : <Eye size={16} />}{absent ? t.absent : t.present}</span>
              </button>;
            })}
          </div>}

          <div className="brian-group-save-row">
            <label><span>{t.className}</span><input value={className} onChange={(event) => setClassName(event.target.value)} placeholder={language === 'vi' ? 'Ví dụ: 12.1' : 'Example: 12.1'} /></label>
            <button type="button" className="primary" onClick={saveClass} disabled={!roster.length}><Save size={17} /> {t.saveClass}</button>
          </div>

          <div className="brian-group-saved-classes">
            <h3>{t.savedClasses}</h3>
            {!savedClasses.length ? <p>{t.noSaved}</p> : <div>{savedClasses.map((item) => <article key={item.id}>
              <button type="button" className="saved-class-main" onClick={() => loadSavedClass(item)}>
                <b>{item.name}</b><small>{item.count} {t.students}</small>
              </button>
              <button type="button" className="saved-class-delete" onClick={() => deleteSavedClass(item.id)} aria-label={t.deleted}><X size={16} /></button>
            </article>)}</div>}
          </div>
        </section>

        <section className="brian-group-panel brian-group-settings-panel">
          <div className="brian-group-panel-heading">
            <div><span>02</span><h2>{t.settings}</h2></div>
          </div>

          <div className="brian-group-segmented">
            <button type="button" className={mode === 'size' ? 'active' : ''} onClick={() => { setMode('size'); setGroupValue(4); }}><Users size={19} /><b>{t.bySize}</b></button>
            <button type="button" className={mode === 'count' ? 'active' : ''} onClick={() => { setMode('count'); setGroupValue(4); }}><Shuffle size={19} /><b>{t.byCount}</b></button>
          </div>

          <div className="brian-group-number-control">
            <label>{mode === 'size' ? t.groupSize : t.groupCount}</label>
            <div>
              <button type="button" onClick={() => setGroupValue((value) => Math.max(2, value - 1))}>−</button>
              <strong>{groupValue}</strong>
              <button type="button" onClick={() => setGroupValue((value) => Math.min(mode === 'size' ? 10 : 12, value + 1))}>＋</button>
            </div>
          </div>

          {mode === 'size' && <fieldset className="brian-group-radio-set">
            <legend>{t.remainder}</legend>
            <label><input type="radio" name="remainder" checked={remainder === 'balanced'} onChange={() => setRemainder('balanced')} /><span><b>{t.balance}</b><small>4–4–3–3</small></span></label>
            <label><input type="radio" name="remainder" checked={remainder === 'small-last'} onChange={() => setRemainder('small-last')} /><span><b>{t.smallLast}</b><small>4–4–4–2</small></span></label>
          </fieldset>}

          <div className="brian-group-switches">
            <label><span><b>{t.roles}</b><small>{ROLE_SETS[language].join(' · ')}</small></span><input type="checkbox" checked={assignRoleMode} onChange={(event) => setAssignRoleMode(event.target.checked)} /></label>
            <label><span><b>{t.reveal}</b><small>{language === 'vi' ? 'Phù hợp khi gọi từng nhóm lên màn hình.' : 'Useful when revealing teams one at a time.'}</small></span><input type="checkbox" checked={revealOneByOne} onChange={(event) => setRevealOneByOne(event.target.checked)} /></label>
          </div>

          <button type="button" className="brian-group-generate" onClick={generate} disabled={presentStudents.length < 2}>
            <Shuffle size={22} />
            <span><b>{groups.length ? t.regenerate : t.generate}</b><small>{presentStudents.length} {t.activeStudents}</small></span>
          </button>
        </section>
      </main>}

      <section id="brian-group-results" className={`brian-group-results ${presenting ? 'presentation-layout' : ''}`}>
        <div className="brian-group-results-head">
          <div><span>03</span><h2>{t.result}</h2><p>{t.resultHint}</p></div>
          {groups.length > 0 && <div>
            <button type="button" onClick={() => setAllVisibility(false)}><EyeOff size={17} /> {t.hideAll}</button>
            <button type="button" onClick={revealNext}><Eye size={17} /> {t.revealNext}</button>
            <button type="button" onClick={() => setAllVisibility(true)}><Expand size={17} /> {t.revealAll}</button>
            <button type="button" className="primary" onClick={generate}><RefreshCw size={17} /> {t.regenerate}</button>
          </div>}
        </div>

        {!groups.length ? <div className="brian-group-empty"><div><Shuffle size={42} /></div><h3>{t.emptyResult}</h3></div> : <div className="brian-group-grid">
          {groups.map((group, groupIndex) => <article
            key={group.id}
            className={`brian-group-card ${group.visible ? 'is-visible' : 'is-hidden'}`}
            style={{ '--group-color': group.color }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropMember(group.id)}
          >
            <header>
              <button type="button" className="group-title" onClick={() => renameGroup(group.id)} title={t.rename}>
                <span>{String(groupIndex + 1).padStart(2, '0')}</span><b>{group.name}</b>
              </button>
              <div>
                <button type="button" onClick={() => randomLeader(group.id)} title={t.randomLeader}><WandSparkles size={17} /></button>
                <button type="button" onClick={() => setGroups((items) => items.map((item) => item.id === group.id ? { ...item, visible: !item.visible } : item))} title={group.visible ? t.hide : t.show}>{group.visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </header>
            <div className="group-count"><Users size={16} /> {group.members.length} {t.members}</div>
            {group.visible ? <ol>
              {group.members.map((member) => <li
                key={member.id}
                draggable
                onDragStart={() => setDraggedMember({ groupId: group.id, memberId: member.id })}
                onDragEnd={() => setDraggedMember(null)}
              >
                <GripVertical size={16} />
                <span><b>{member.name}</b>{member.tag && <small>{member.tag}</small>}</span>
                {group.roles?.[member.id] && <em>{group.roles[member.id]}</em>}
              </li>)}
            </ol> : <button type="button" className="group-reveal-cover" onClick={() => setGroups((items) => items.map((item) => item.id === group.id ? { ...item, visible: true } : item))}>
              <Eye size={28} /><b>{t.show}</b><small>{group.members.length} {t.members}</small>
            </button>}
          </article>)}
        </div>}
      </section>

      {notice && <div className="brian-group-toast"><Check size={18} /> {notice}</div>}
    </div>
  );
}
