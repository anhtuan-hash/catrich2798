import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2,
  ChevronDown, ClipboardCheck, Download, FileText, FolderCheck, LayoutGrid,
  List, Plus, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, Trash2,
  UserPlus, UsersRound, X,
} from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import {
  createDepartment, createTeamId, listTeamTeacherAccounts,
  loadTeamWorkspace, saveTeamWorkspace,
} from '../utils/personnelHub.js';
import './PersonnelHub.css';

const TABS = [
  ['overview', 'Tổng quan', BarChart3], ['members', 'Thành viên', UsersRound],
  ['assignments', 'Phân công', BriefcaseBusiness], ['documents', 'Hồ sơ', FolderCheck],
  ['absences', 'Nghỉ – vắng', CalendarDays], ['evaluations', 'Đánh giá', ClipboardCheck],
  ['reports', 'Báo cáo', FileText],
];
const FONT_SCALES = [90, 100, 110, 120, 125];
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (value) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '—';
const roleLabel = (role) => role === 'head' ? 'Tổ trưởng' : role === 'deputy' ? 'Tổ phó' : 'Giáo viên';
const statusLabel = (status) => status === 'leave' ? 'Đang nghỉ' : status === 'inactive' ? 'Ngưng hoạt động' : 'Đang làm việc';
const taskLabel = (status) => status === 'done' ? 'Hoàn thành' : status === 'review' ? 'Chờ duyệt' : 'Đang thực hiện';

function Avatar({ account, tiny = false }) {
  return <span className={`bt-avatar ${tiny ? 'is-tiny' : ''}`}>{account?.avatarUrl ? <img src={account.avatarUrl} alt="" /> : String(account?.name || 'GV').slice(0, 1).toUpperCase()}</span>;
}

function Modal({ title, children, onClose, wide = false }) {
  return <div className="bt-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`bt-modal ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><div><span>BRIAN TEAM</span><h2>{title}</h2></div><button type="button" onClick={onClose}><X /></button></header>
      {children}
    </section>
  </div>;
}

function Empty({ Icon = Sparkles, title, text, action }) {
  return <div className="bt-empty"><span><Icon /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function Stat({ Icon, title, value, note, tone = 'green' }) {
  return <article className={`bt-stat tone-${tone}`}><span><Icon /></span><div><small>{title}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

export default function PersonnelHub({ currentUser }) {
  const canManage = isDepartmentLeaderRole(currentUser?.role);
  const [workspace, setWorkspace] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [memberView, setMemberView] = useState('cards');
  const [departmentMenu, setDepartmentMenu] = useState(false);
  const [modal, setModal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveText, setSaveText] = useState('');
  const [warning, setWarning] = useState('');
  const saveTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    if (!canManage) { setLoading(false); return () => {}; }
    Promise.all([loadTeamWorkspace(currentUser), listTeamTeacherAccounts(currentUser)])
      .then(([result, users]) => {
        if (!alive) return;
        setWorkspace(result.workspace);
        setAccounts(users);
        setMemberView(result.workspace.preferences?.memberView || 'cards');
        setWarning(result.warning || '');
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; clearTimeout(saveTimer.current); };
  }, [canManage, currentUser?.id]);

  useEffect(() => {
    if (!workspace || !canManage) return;
    clearTimeout(saveTimer.current);
    setSaveText('Đang chờ lưu');
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      const result = await saveTeamWorkspace(currentUser, workspace);
      setSaving(false);
      setSaveText(result.source === 'cloud' ? 'Đã đồng bộ' : 'Đã lưu trên thiết bị');
      setWarning(result.warning || '');
    }, 450);
    return () => clearTimeout(saveTimer.current);
  }, [workspace, canManage, currentUser?.id]);

  const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts]);
  const department = useMemo(() => workspace?.departments.find((item) => item.id === workspace.activeDepartmentId) || workspace?.departments[0], [workspace]);
  const members = useMemo(() => (department?.members || []).map((item) => ({
    ...item,
    account: accountMap.get(item.teacherAccountId) || { id: item.teacherAccountId, name: 'Tài khoản giáo viên', email: 'Không còn trong danh bạ' },
  })), [department?.members, accountMap]);
  const visibleMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? members.filter((item) => `${item.account.name} ${item.account.email} ${item.homeroomClass} ${item.teachingGrades.join(' ')}`.toLowerCase().includes(needle)) : members;
  }, [members, query]);
  const tasks = department?.assignments || [];
  const documents = department?.documentRequirements || [];
  const lateTasks = tasks.filter((item) => item.status !== 'done' && item.dueDate && item.dueDate < today()).length;
  const pendingDocuments = documents.filter((item) => item.status === 'pending').length;
  const activeMembers = members.filter((item) => item.status === 'active').length;
  const fontScale = workspace?.preferences?.fontScale || 100;

  const patchWorkspace = (updater) => setWorkspace((current) => {
    if (!current) return current;
    const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    return { ...next, updatedAt: new Date().toISOString() };
  });
  const patchDepartment = (updater) => patchWorkspace((current) => ({
    ...current,
    departments: current.departments.map((item) => item.id === current.activeDepartmentId ? (typeof updater === 'function' ? updater(item) : { ...item, ...updater }) : item),
  }));
  const accountForMember = (memberId) => accountMap.get(department?.members.find((item) => item.id === memberId)?.teacherAccountId) || null;
  const exportFile = (name, content, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
  };
  const exportCsv = () => {
    const rows = [['Họ và tên', 'Email', 'Vai trò', 'Khối dạy', 'Số tiết', 'Chủ nhiệm', 'Trạng thái'], ...members.map((item) => [item.account.name, item.account.email, roleLabel(item.role), item.teachingGrades.join(', '), item.weeklyPeriods, item.homeroomClass, statusLabel(item.status)])];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')}`;
    exportFile(`danh-sach-${department.shortName}-${today()}.csv`, csv, 'text/csv;charset=utf-8');
  };
  const exportJson = () => exportFile(`brian-team-${department.shortName}-${today()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), workspace }, null, 2), 'application/json;charset=utf-8');

  if (!canManage) return <main className="bt-denied"><section><ShieldCheck /><span>BRIAN TEAM</span><h1>Dành riêng cho Tổ trưởng chuyên môn</h1><p>Chỉ tài khoản TTCM hoặc quản trị viên được ủy quyền mới mở được ứng dụng này.</p><button onClick={() => { window.location.hash = '#/apps'; }}>Về trang Ứng dụng</button></section></main>;
  if (loading || !workspace || !department) return <main className="bt-loading"><RefreshCw /><h1>Đang mở Brian Team…</h1><p>Đang liên kết thành viên với tài khoản giáo viên.</p></main>;

  return <main className="bt-shell" style={{ '--bt-scale': fontScale / 100, '--bt-accent': department.color || '#B2C248' }}>
    <header className="bt-topbar">
      <div className="bt-brand"><span><UsersRound /></span><div><small>BRIAN TEAM</small><h1>Nhân sự tổ chuyên môn</h1></div></div>
      <div className="bt-actions">
        <div className="bt-department-picker">
          <button type="button" onClick={() => setDepartmentMenu((value) => !value)}><i style={{ background: department.color }} /><b>{department.name}</b><ChevronDown /></button>
          {departmentMenu && <div className="bt-department-menu"><header><b>Chọn tổ chuyên môn</b><small>Dữ liệu của mỗi tổ được tách riêng.</small></header>{workspace.departments.map((item) => <button type="button" key={item.id} className={item.id === department.id ? 'is-active' : ''} onClick={() => { patchWorkspace((current) => ({ ...current, activeDepartmentId: item.id })); setDepartmentMenu(false); }}><i style={{ background: item.color }} /><span><b>{item.name}</b><small>{item.schoolLevel} · {item.subject || 'Chưa khai báo môn'}</small></span>{item.id === department.id && <CheckCircle2 />}</button>)}<button type="button" className="is-add" onClick={() => { setDepartmentMenu(false); setModal('department'); }}><Plus /> Thêm tổ</button></div>}
        </div>
        <div className="bt-save">{saving ? <RefreshCw className="spin" /> : <CheckCircle2 />}<span>{saving ? 'Đang lưu…' : saveText || 'Đã sẵn sàng'}</span></div>
        <div className="bt-font"><Settings2 />{FONT_SCALES.map((scale) => <button type="button" key={scale} className={scale === fontScale ? 'is-active' : ''} onClick={() => patchWorkspace((current) => ({ ...current, preferences: { ...current.preferences, fontScale: scale } }))}>{scale}%</button>)}</div>
      </div>
    </header>

    <section className="bt-hero">
      <div><span><Sparkles /> Không gian điều hành của TTCM</span><h2>{department.name}</h2><p>{department.description || 'Quản lí thành viên, phân công, hồ sơ và đánh giá của tổ chuyên môn.'}</p><div><button className="is-primary" onClick={() => setModal('member')}><UserPlus /> Thêm giáo viên</button><button onClick={() => setModal('assignment')}><Plus /> Giao nhiệm vụ</button><button onClick={exportCsv}><Download /> Xuất danh sách</button></div></div>
      <aside><UsersRound /><strong>{members.length}</strong><span>thành viên</span></aside>
    </section>

    {warning && <div className="bt-warning"><AlertTriangle /><span>Dữ liệu đang lưu trên thiết bị. Chạy file <b>supabase/brian-team.sql</b> để bật đồng bộ Supabase.</span></div>}

    <nav className="bt-tabs">{TABS.map(([id, label, Icon]) => <button type="button" key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon /><span>{label}</span></button>)}</nav>

    <section className="bt-content">
      {tab === 'overview' && <Overview members={members} tasks={tasks} documents={documents} absences={department.absences} lateTasks={lateTasks} pendingDocuments={pendingDocuments} activeMembers={activeMembers} accountForMember={accountForMember} setTab={setTab} />}
      {tab === 'members' && <Members members={visibleMembers} query={query} setQuery={setQuery} view={memberView} setView={(value) => { setMemberView(value); patchWorkspace((current) => ({ ...current, preferences: { ...current.preferences, memberView: value } })); }} onAdd={() => setModal('member')} onPatch={(id, patch) => patchDepartment((item) => ({ ...item, members: item.members.map((member) => member.id === id ? { ...member, ...patch } : member) }))} onRemove={(id) => patchDepartment((item) => ({ ...item, members: item.members.filter((member) => member.id !== id), assignments: item.assignments.map((task) => ({ ...task, assigneeIds: (task.assigneeIds || []).filter((memberId) => memberId !== id) })) }))} />}
      {tab === 'assignments' && <Assignments items={tasks} accountForMember={accountForMember} onAdd={() => setModal('assignment')} onPatch={(id, patch) => patchDepartment((item) => ({ ...item, assignments: item.assignments.map((task) => task.id === id ? { ...task, ...patch } : task) }))} onDelete={(id) => patchDepartment((item) => ({ ...item, assignments: item.assignments.filter((task) => task.id !== id) }))} />}
      {tab === 'documents' && <Documents items={documents} accountForMember={accountForMember} onAdd={() => setModal('document')} onPatch={(id, patch) => patchDepartment((item) => ({ ...item, documentRequirements: item.documentRequirements.map((doc) => doc.id === id ? { ...doc, ...patch } : doc) }))} onDelete={(id) => patchDepartment((item) => ({ ...item, documentRequirements: item.documentRequirements.filter((doc) => doc.id !== id) }))} />}
      {tab === 'absences' && <Absences items={department.absences} accountForMember={accountForMember} onAdd={() => setModal('absence')} onDelete={(id) => patchDepartment((item) => ({ ...item, absences: item.absences.filter((entry) => entry.id !== id) }))} />}
      {tab === 'evaluations' && <Evaluations items={department.evaluations} accountForMember={accountForMember} onAdd={() => setModal('evaluation')} onDelete={(id) => patchDepartment((item) => ({ ...item, evaluations: item.evaluations.filter((entry) => entry.id !== id) }))} />}
      {tab === 'reports' && <Reports department={department} members={members} tasks={tasks} documents={documents} exportCsv={exportCsv} exportJson={exportJson} />}
    </section>

    {modal === 'department' && <DepartmentModal currentUser={currentUser} close={() => setModal('')} create={(item) => { patchWorkspace((current) => ({ ...current, activeDepartmentId: item.id, departments: [...current.departments, item] })); setModal(''); }} />}
    {modal === 'member' && <MemberModal accounts={accounts} existing={new Set(department.members.map((item) => item.teacherAccountId))} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, members: [...current.members, item] })); setModal(''); }} />}
    {modal === 'assignment' && <AssignmentModal members={members} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, assignments: [item, ...current.assignments] })); setModal(''); }} />}
    {modal === 'document' && <DocumentModal members={members} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, documentRequirements: [item, ...current.documentRequirements] })); setModal(''); }} />}
    {modal === 'absence' && <AbsenceModal members={members} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, absences: [item, ...current.absences] })); setModal(''); }} />}
    {modal === 'evaluation' && <EvaluationModal members={members} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, evaluations: [item, ...current.evaluations] })); setModal(''); }} />}
  </main>;
}

function Overview({ members, tasks, documents, absences, lateTasks, pendingDocuments, activeMembers, accountForMember, setTab }) {
  return <div><div className="bt-stats"><Stat Icon={UsersRound} title="Thành viên" value={members.length} note={`${activeMembers} đang làm việc`} /><Stat Icon={BriefcaseBusiness} title="Nhiệm vụ" value={tasks.length} note={`${lateTasks} việc trễ hạn`} tone="blue" /><Stat Icon={FolderCheck} title="Hồ sơ" value={documents.length} note={`${pendingDocuments} hồ sơ chưa nộp`} tone="orange" /><Stat Icon={CalendarDays} title="Nghỉ – vắng" value={absences.length} note="Trong dữ liệu hiện tại" tone="purple" /></div><div className="bt-dashboard-grid"><article className="bt-panel"><header><div><span>THÀNH VIÊN</span><h2>Tổ Tiếng Anh</h2></div><button onClick={() => setTab('members')}>Xem tất cả</button></header><div className="bt-person-list">{members.slice(0, 5).map((item) => <div key={item.id}><Avatar account={item.account} /><span><b>{item.account.name}</b><small>{roleLabel(item.role)} · {item.weeklyPeriods} tiết/tuần</small></span><em className={`status-${item.status}`}>{statusLabel(item.status)}</em></div>)}</div></article><article className="bt-panel"><header><div><span>CẦN XỬ LÍ</span><h2>Công việc gần nhất</h2></div><button onClick={() => setTab('assignments')}>Mở phân công</button></header>{tasks.length ? <div className="bt-task-list">{tasks.slice(0, 5).map((item) => <div key={item.id}><i className={`priority-${item.priority}`} /><span><b>{item.title}</b><small>{(item.assigneeIds || []).map((id) => accountForMember(id)?.name).filter(Boolean).join(', ') || 'Chưa giao'} · {item.dueDate ? dateLabel(item.dueDate) : 'Không hạn'}</small></span><em>{taskLabel(item.status)}</em></div>)}</div> : <Empty Icon={BriefcaseBusiness} title="Chưa có nhiệm vụ" text="Tạo nhiệm vụ đầu tiên cho thành viên trong tổ." />}</article></div></div>;
}

function Members({ members, query, setQuery, view, setView, onAdd, onPatch, onRemove }) {
  return <div><PageHead eyebrow="THÀNH VIÊN" title="Danh bạ Tổ Tiếng Anh" text="Tên và email luôn lấy từ tài khoản giáo viên đã được duyệt." action={<button className="is-primary" onClick={onAdd}><UserPlus /> Thêm giáo viên</button>} /><div className="bt-toolbar"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, email, khối dạy…" /></label><div><button className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')}><LayoutGrid /></button><button className={view === 'table' ? 'is-active' : ''} onClick={() => setView('table')}><List /></button></div></div>{members.length ? view === 'cards' ? <div className="bt-member-grid">{members.map((item) => <article key={item.id} className="bt-member-card"><header><Avatar account={item.account} /><div><h3>{item.account.name}</h3><p>{item.account.email}</p></div><button onClick={() => onRemove(item.id)}><Trash2 /></button></header><div className="bt-member-fields"><label>Vai trò<select value={item.role} onChange={(event) => onPatch(item.id, { role: event.target.value })}><option value="head">Tổ trưởng</option><option value="deputy">Tổ phó</option><option value="teacher">Giáo viên</option></select></label><label>Số tiết<input type="number" min="0" value={item.weeklyPeriods} onChange={(event) => onPatch(item.id, { weeklyPeriods: Number(event.target.value || 0) })} /></label><label>Khối dạy<input value={item.teachingGrades.join(', ')} onChange={(event) => onPatch(item.id, { teachingGrades: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} /></label><label>Chủ nhiệm<input value={item.homeroomClass} onChange={(event) => onPatch(item.id, { homeroomClass: event.target.value })} /></label><label className="span-2">Trạng thái<select value={item.status} onChange={(event) => onPatch(item.id, { status: event.target.value })}><option value="active">Đang làm việc</option><option value="leave">Đang nghỉ</option><option value="inactive">Ngưng hoạt động</option></select></label></div><footer><span>Tài khoản Brian</span><b>{item.account.approved === false ? 'Không còn hoạt động' : 'Đã liên kết'}</b></footer></article>)}</div> : <div className="bt-table-wrap"><table><thead><tr><th>Giáo viên</th><th>Vai trò</th><th>Khối dạy</th><th>Số tiết</th><th>Chủ nhiệm</th><th>Trạng thái</th><th /></tr></thead><tbody>{members.map((item) => <tr key={item.id}><td><div className="bt-table-person"><Avatar account={item.account} tiny /><span><b>{item.account.name}</b><small>{item.account.email}</small></span></div></td><td>{roleLabel(item.role)}</td><td>{item.teachingGrades.join(', ') || '—'}</td><td>{item.weeklyPeriods}</td><td>{item.homeroomClass || '—'}</td><td>{statusLabel(item.status)}</td><td><button onClick={() => onRemove(item.id)}><Trash2 /></button></td></tr>)}</tbody></table></div> : <Empty Icon={UsersRound} title="Chưa có thành viên phù hợp" text="Thêm giáo viên bằng cách chọn tài khoản Brian đã được duyệt." action={<button className="is-primary" onClick={onAdd}><UserPlus /> Thêm giáo viên</button>} />}</div>;
}

function Assignments({ items, accountForMember, onAdd, onPatch, onDelete }) {
  return <div><PageHead eyebrow="PHÂN CÔNG" title="Nhiệm vụ chuyên môn" text="Theo dõi người phụ trách, thời hạn và trạng thái thực hiện." action={<button className="is-primary" onClick={onAdd}><Plus /> Giao nhiệm vụ</button>} />{items.length ? <div className="bt-list">{items.map((item) => <article key={item.id}><i className={`priority-${item.priority}`} /><div><h3>{item.title}</h3><p>{item.description || 'Không có mô tả'}</p><small>{(item.assigneeIds || []).map((id) => accountForMember(id)?.name).filter(Boolean).join(', ') || 'Chưa giao người phụ trách'} · Hạn {item.dueDate ? dateLabel(item.dueDate) : 'không xác định'}</small></div><select value={item.status} onChange={(event) => onPatch(item.id, { status: event.target.value })}><option value="progress">Đang thực hiện</option><option value="review">Chờ duyệt</option><option value="done">Hoàn thành</option></select><button onClick={() => onDelete(item.id)}><Trash2 /></button></article>)}</div> : <Empty Icon={BriefcaseBusiness} title="Chưa có nhiệm vụ" text="Giao nhiệm vụ soạn đề, chuyên đề, báo cáo hoặc dự giờ." action={<button className="is-primary" onClick={onAdd}><Plus /> Tạo nhiệm vụ</button>} />}</div>;
}

function Documents({ items, accountForMember, onAdd, onPatch, onDelete }) {
  return <div><PageHead eyebrow="HỒ SƠ CHUYÊN MÔN" title="Theo dõi tài liệu cần nộp" text="Tạo yêu cầu theo từng giáo viên và cập nhật trạng thái duyệt." action={<button className="is-primary" onClick={onAdd}><Plus /> Tạo yêu cầu</button>} />{items.length ? <div className="bt-list">{items.map((item) => <article key={item.id}><FolderCheck /><div><h3>{item.title}</h3><small>{accountForMember(item.memberId)?.name || 'Chưa chọn giáo viên'} · Hạn {item.dueDate ? dateLabel(item.dueDate) : 'không xác định'}</small></div><select value={item.status} onChange={(event) => onPatch(item.id, { status: event.target.value })}><option value="pending">Chưa nộp</option><option value="submitted">Đã nộp</option><option value="revision">Cần chỉnh sửa</option><option value="approved">Đã duyệt</option></select><button onClick={() => onDelete(item.id)}><Trash2 /></button></article>)}</div> : <Empty Icon={FolderCheck} title="Chưa có yêu cầu hồ sơ" text="Theo dõi kế hoạch cá nhân, báo cáo, chuyên đề và minh chứng." action={<button className="is-primary" onClick={onAdd}><Plus /> Tạo yêu cầu</button>} />}</div>;
}

function Absences({ items, accountForMember, onAdd, onDelete }) {
  return <div><PageHead eyebrow="NGHỈ – VẮNG" title="Theo dõi vắng mặt trong tổ" text="Phục vụ điều hành chuyên môn, không thay thế quy trình nghỉ phép cấp trường." action={<button className="is-primary" onClick={onAdd}><Plus /> Ghi nhận</button>} />{items.length ? <div className="bt-list">{items.map((item) => <article key={item.id}><CalendarDays /><div><h3>{accountForMember(item.memberId)?.name || 'Tài khoản giáo viên'}</h3><p>{item.type} · {item.reason || 'Không ghi chú lí do'}</p><small>{dateLabel(item.date)} · {item.replacementTeacher || 'Chưa bố trí dạy thay'}</small></div><button onClick={() => onDelete(item.id)}><Trash2 /></button></article>)}</div> : <Empty Icon={CalendarDays} title="Chưa có dữ liệu vắng mặt" text="Ghi nhận nghỉ, công tác, tập huấn, đổi tiết hoặc vắng họp tổ." action={<button className="is-primary" onClick={onAdd}><Plus /> Ghi nhận</button>} />}</div>;
}

function Evaluations({ items, accountForMember, onAdd, onDelete }) {
  return <div><PageHead eyebrow="ĐÁNH GIÁ NỘI BỘ" title="Ghi nhận kết quả và tiến bộ" text="Nhận xét chỉ hiển thị cho TTCM và quản trị viên được ủy quyền." action={<button className="is-primary" onClick={onAdd}><Plus /> Thêm đánh giá</button>} />{items.length ? <div className="bt-evaluation-grid">{items.map((item) => <article key={item.id}><header><Avatar account={accountForMember(item.memberId)} /><div><h3>{accountForMember(item.memberId)?.name || 'Tài khoản giáo viên'}</h3><small>{item.period}</small></div><strong>{item.score}/100</strong></header><p>{item.comment || 'Không có nhận xét.'}</p><footer><span>{item.level}</span><button onClick={() => onDelete(item.id)}><Trash2 /></button></footer></article>)}</div> : <Empty Icon={ClipboardCheck} title="Chưa có đánh giá" text="Thêm đánh giá theo tháng, học kì hoặc năm học." action={<button className="is-primary" onClick={onAdd}><Plus /> Thêm đánh giá</button>} />}</div>;
}

function Reports({ department, members, tasks, documents, exportCsv, exportJson }) {
  const cards = [{ Icon: UsersRound, title: 'Danh sách nhân sự tổ', text: `${members.length} thành viên liên kết với tài khoản Brian.`, action: exportCsv, label: 'Xuất CSV' }, { Icon: BriefcaseBusiness, title: 'Tình hình phân công', text: `${tasks.length} nhiệm vụ trong tổ đang chọn.`, action: exportJson, label: 'Xuất dữ liệu' }, { Icon: FolderCheck, title: 'Tình hình hồ sơ', text: `${documents.length} yêu cầu hồ sơ chuyên môn.`, action: exportJson, label: 'Xuất dữ liệu' }, { Icon: ShieldCheck, title: 'Bản sao lưu Brian Team', text: `Sao lưu toàn bộ dữ liệu của ${department.name}.`, action: exportJson, label: 'Tải JSON' }];
  return <div><PageHead eyebrow="BÁO CÁO" title="Xuất dữ liệu tổ chuyên môn" text={`Dữ liệu được đóng gói theo tổ đang chọn: ${department.name}.`} /><div className="bt-report-grid">{cards.map(({ Icon, title, text, action, label }) => <article key={title}><span><Icon /></span><h3>{title}</h3><p>{text}</p><button onClick={action}><Download /> {label}</button></article>)}</div></div>;
}

function PageHead({ eyebrow, title, text, action }) { return <div className="bt-page-head"><div><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>{action}</div>; }
function FormActions({ close, label }) { return <footer className="bt-form-actions"><button type="button" onClick={close}>Hủy</button><button className="is-primary" type="submit"><Plus /> {label}</button></footer>; }

function DepartmentModal({ currentUser, close, create }) {
  const [form, setForm] = useState({ name: '', shortName: '', schoolLevel: 'THPT', subject: '', color: '#B2C248', description: '' });
  return <Modal title="Thêm tổ chuyên môn" onClose={close}><form onSubmit={(event) => { event.preventDefault(); if (form.name.trim()) create(createDepartment(form, currentUser)); }}><div className="bt-form-grid"><label className="span-2">Tên tổ<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tổ Toán – Tin" /></label><label>Tên ngắn<input value={form.shortName} onChange={(event) => setForm({ ...form, shortName: event.target.value })} /></label><label>Cấp học<select value={form.schoolLevel} onChange={(event) => setForm({ ...form, schoolLevel: event.target.value })}><option>THPT</option><option>THCS</option><option>Tiểu học</option></select></label><label>Môn chuyên môn<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label><label>Màu nhận diện<input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label><label className="span-2">Mô tả<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div><FormActions close={close} label="Tạo tổ" /></form></Modal>;
}

function MemberModal({ accounts, existing, close, create }) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState(''); const [role, setRole] = useState('teacher'); const [periods, setPeriods] = useState(0); const [grades, setGrades] = useState(''); const [homeroom, setHomeroom] = useState('');
  const available = accounts.filter((item) => !existing.has(item.id) && `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase()));
  return <Modal title="Thêm giáo viên từ tài khoản Brian" onClose={close} wide><div className="bt-account-picker"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tài khoản giáo viên đã được duyệt…" /></label><div>{available.length ? available.map((item) => <button type="button" key={item.id} className={selected === item.id ? 'is-active' : ''} onClick={() => setSelected(item.id)}><Avatar account={item} /><span><b>{item.name}</b><small>{item.email}</small></span><em>{item.role === 'department_head' ? 'TTCM' : 'Giáo viên'}</em>{selected === item.id && <CheckCircle2 />}</button>) : <Empty Icon={UsersRound} title="Không còn tài khoản phù hợp" text="Chỉ tài khoản đã duyệt và chưa thuộc tổ mới xuất hiện." />}</div></div><form onSubmit={(event) => { event.preventDefault(); if (selected) create({ id: createTeamId('member'), teacherAccountId: selected, role, joinedAt: today(), teachingGrades: grades.split(',').map((value) => value.trim()).filter(Boolean), weeklyPeriods: Number(periods || 0), homeroomClass: homeroom, employmentType: 'core', status: 'active', note: '' }); }}><div className="bt-form-grid"><label>Vai trò<select value={role} onChange={(event) => setRole(event.target.value)}><option value="teacher">Giáo viên</option><option value="deputy">Tổ phó</option><option value="head">Tổ trưởng</option></select></label><label>Số tiết/tuần<input type="number" min="0" value={periods} onChange={(event) => setPeriods(event.target.value)} /></label><label>Khối dạy<input value={grades} onChange={(event) => setGrades(event.target.value)} placeholder="10, 11, 12" /></label><label>Lớp chủ nhiệm<input value={homeroom} onChange={(event) => setHomeroom(event.target.value)} /></label></div><FormActions close={close} label="Thêm vào tổ" /></form></Modal>;
}

function AssignmentModal({ members, close, create }) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'normal', assigneeIds: [] });
  return <Modal title="Giao nhiệm vụ chuyên môn" onClose={close} wide><form onSubmit={(event) => { event.preventDefault(); if (form.title.trim()) create({ id: createTeamId('task'), ...form, status: 'progress', createdAt: new Date().toISOString() }); }}><div className="bt-form-grid"><label className="span-2">Tên nhiệm vụ<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className="span-2">Mô tả<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Hạn hoàn thành<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label><label>Mức độ<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="urgent">Khẩn</option></select></label><fieldset className="span-2"><legend>Người phụ trách</legend><div className="bt-check-grid">{members.map((member) => <label key={member.id}><input type="checkbox" checked={form.assigneeIds.includes(member.id)} onChange={(event) => setForm({ ...form, assigneeIds: event.target.checked ? [...form.assigneeIds, member.id] : form.assigneeIds.filter((id) => id !== member.id) })} /><Avatar account={member.account} tiny /><span>{member.account.name}</span></label>)}</div></fieldset></div><FormActions close={close} label="Tạo nhiệm vụ" /></form></Modal>;
}

function DocumentModal({ members, close, create }) {
  const [form, setForm] = useState({ title: '', memberId: members[0]?.id || '', dueDate: '', status: 'pending' });
  return <Modal title="Tạo yêu cầu hồ sơ" onClose={close}><form onSubmit={(event) => { event.preventDefault(); if (form.title.trim() && form.memberId) create({ id: createTeamId('document'), ...form, createdAt: new Date().toISOString() }); }}><div className="bt-form-grid"><label className="span-2">Tên hồ sơ<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Giáo viên<select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })}>{members.map((member) => <option key={member.id} value={member.id}>{member.account.name}</option>)}</select></label><label>Hạn nộp<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label></div><FormActions close={close} label="Tạo yêu cầu" /></form></Modal>;
}

function AbsenceModal({ members, close, create }) {
  const [form, setForm] = useState({ memberId: members[0]?.id || '', date: today(), type: 'Nghỉ có phép', reason: '', replacementTeacher: '' });
  return <Modal title="Ghi nhận nghỉ – vắng" onClose={close}><form onSubmit={(event) => { event.preventDefault(); if (form.memberId && form.date) create({ id: createTeamId('absence'), ...form, createdAt: new Date().toISOString() }); }}><div className="bt-form-grid"><label>Giáo viên<select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })}>{members.map((member) => <option key={member.id} value={member.id}>{member.account.name}</option>)}</select></label><label>Ngày<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Loại vắng<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Nghỉ có phép</option><option>Nghỉ không phép</option><option>Đi công tác</option><option>Tham gia tập huấn</option><option>Đổi tiết</option><option>Vắng họp tổ</option></select></label><label>Giáo viên dạy thay<input value={form.replacementTeacher} onChange={(event) => setForm({ ...form, replacementTeacher: event.target.value })} /></label><label className="span-2">Lí do<textarea rows="3" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label></div><FormActions close={close} label="Lưu ghi nhận" /></form></Modal>;
}

function EvaluationModal({ members, close, create }) {
  const [form, setForm] = useState({ memberId: members[0]?.id || '', period: 'Tháng 7/2026', score: 85, level: 'Hoàn thành tốt', comment: '' });
  return <Modal title="Thêm đánh giá nội bộ" onClose={close}><form onSubmit={(event) => { event.preventDefault(); if (form.memberId) create({ id: createTeamId('evaluation'), ...form, score: Number(form.score || 0), createdAt: new Date().toISOString() }); }}><div className="bt-form-grid"><label>Giáo viên<select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })}>{members.map((member) => <option key={member.id} value={member.id}>{member.account.name}</option>)}</select></label><label>Kì đánh giá<input value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} /></label><label>Điểm<input type="number" min="0" max="100" value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} /></label><label>Mức đánh giá<select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Hoàn thành xuất sắc</option><option>Hoàn thành tốt</option><option>Hoàn thành</option><option>Cần cải thiện</option></select></label><label className="span-2">Nhận xét<textarea rows="4" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></label></div><FormActions close={close} label="Lưu đánh giá" /></form></Modal>;
}
