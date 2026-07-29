import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Award, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2,
  ChevronDown, ClipboardCheck, Download, FileText, FolderCheck, GraduationCap,
  IdCard, LayoutGrid, List, MapPin, PencilLine, Phone, Plus, RefreshCw, Save,
  Search, Settings2, ShieldCheck, Sparkles, Trash2, UserPlus, UsersRound, X,
} from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import {
  createDepartment, createTeamId, createTeamMember, listTeamTeacherAccounts,
  loadTeamWorkspace, saveTeamWorkspace,
} from '../utils/personnelHub.js';
import './PersonnelHub.css';
import '../styles/BrianTeamContrast2026.css';

const TABS = [
  ['overview', 'Tổng quan', BarChart3],
  ['members', 'Thành viên', UsersRound],
  ['assignments', 'Phân công', BriefcaseBusiness],
  ['documents', 'Hồ sơ', FolderCheck],
  ['absences', 'Nghỉ – vắng', CalendarDays],
  ['evaluations', 'Đánh giá', ClipboardCheck],
  ['reports', 'Báo cáo', FileText],
];
const FONT_SCALES = [90, 100, 110, 120, 125];
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (value) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '—';
const roleLabel = (role) => role === 'head' ? 'Tổ trưởng' : role === 'deputy' ? 'Tổ phó' : 'Giáo viên';
const statusLabel = (status) => status === 'leave' ? 'Đang nghỉ' : status === 'inactive' ? 'Ngưng hoạt động' : 'Đang làm việc';
const taskLabel = (status) => status === 'done' ? 'Hoàn thành' : status === 'review' ? 'Chờ duyệt' : 'Đang thực hiện';
const accountRoleLabel = (role) => {
  const value = String(role || '').toLowerCase();
  if (value === 'admin') return 'Quản trị viên';
  if (['department_head', 'department-head', 'ttcm', 'to_truong', 'tổ trưởng', 'department_leader'].includes(value)) return 'TTCM';
  return 'Giáo viên';
};
const contractLabel = (value) => ({
  permanent: 'Không xác định thời hạn',
  fixed_term: 'Có thời hạn',
  visiting: 'Thỉnh giảng',
  probation: 'Thử việc',
  other: 'Khác',
}[value] || 'Chưa khai báo');

function Avatar({ account, tiny = false }) {
  return (
    <span className={`bt-avatar ${tiny ? 'is-tiny' : ''}`}>
      {account?.avatarUrl
        ? <img src={account.avatarUrl} alt="" />
        : String(account?.name || 'GV').slice(0, 1).toUpperCase()}
    </span>
  );
}

function Modal({ title, children, onClose, wide = false, extraWide = false }) {
  return (
    <div className="bt-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`bt-modal ${wide ? 'is-wide' : ''} ${extraWide ? 'is-extra-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div><span>BRIAN TEAM</span><h2>{title}</h2></div>
          <button type="button" onClick={onClose}><X /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Empty({ Icon = Sparkles, title, text, action }) {
  return <div className="bt-empty"><span><Icon /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function Stat({ Icon, title, value, note, tone = 'green' }) {
  return <article className={`bt-stat tone-${tone}`}><span><Icon /></span><div><small>{title}</small><strong>{value}</strong><p>{note}</p></div></article>;
}

function InfoValue({ icon: Icon, label, value }) {
  return (
    <div className="bt-profile-value">
      <Icon />
      <span><small>{label}</small><b>{value || '—'}</b></span>
    </div>
  );
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
  const [editingMemberId, setEditingMemberId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveText, setSaveText] = useState('');
  const [warning, setWarning] = useState('');
  const saveTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    if (!canManage) {
      setLoading(false);
      return () => {};
    }
    Promise.all([loadTeamWorkspace(currentUser), listTeamTeacherAccounts(currentUser)])
      .then(([result, users]) => {
        if (!alive) return;
        setWorkspace(result.workspace);
        setAccounts(users);
        setMemberView(result.workspace.preferences?.memberView || 'cards');
        setWarning(result.warning || '');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      clearTimeout(saveTimer.current);
    };
  }, [canManage, currentUser?.id]);

  useEffect(() => {
    if (!workspace || !canManage) return undefined;
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
  const department = useMemo(() => (
    workspace?.departments.find((item) => item.id === workspace.activeDepartmentId)
    || workspace?.departments[0]
  ), [workspace]);
  const members = useMemo(() => (department?.members || []).map((item) => ({
    ...item,
    account: accountMap.get(item.teacherAccountId) || {
      id: item.teacherAccountId,
      name: 'Tài khoản giáo viên',
      email: 'Không còn trong danh bạ',
    },
  })), [department?.members, accountMap]);
  const editingMember = useMemo(() => members.find((item) => item.id === editingMemberId) || null, [members, editingMemberId]);
  const visibleMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((item) => [
      item.account.name,
      item.account.email,
      item.staffCode,
      item.phone,
      item.homeroomClass,
      item.qualification,
      item.degreeMajor,
      item.professionalTitle,
      item.teachingGrades.join(' '),
      item.teachingClasses.join(' '),
    ].join(' ').toLowerCase().includes(needle));
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
    departments: current.departments.map((item) => (
      item.id === current.activeDepartmentId
        ? (typeof updater === 'function' ? updater(item) : { ...item, ...updater })
        : item
    )),
  }));
  const patchMember = (id, patch) => patchDepartment((item) => ({
    ...item,
    members: item.members.map((member) => member.id === id ? { ...member, ...patch } : member),
  }));
  const accountForMember = (memberId) => accountMap.get(
    department?.members.find((item) => item.id === memberId)?.teacherAccountId,
  ) || null;
  const openMemberProfile = (id) => {
    setEditingMemberId(id);
    setModal('profile');
  };
  const exportFile = (name, content, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const exportCsv = () => {
    const rows = [[
      'Họ và tên', 'Email', 'Vai trò tài khoản', 'Mã giáo viên', 'Điện thoại',
      'Vai trò trong tổ', 'Trình độ', 'Chuyên ngành', 'Khối dạy', 'Lớp dạy',
      'Số tiết', 'Chủ nhiệm', 'Loại hợp đồng', 'Ngày vào tổ', 'Trạng thái',
    ], ...members.map((item) => [
      item.account.name,
      item.account.email,
      accountRoleLabel(item.account.role),
      item.staffCode,
      item.phone,
      roleLabel(item.role),
      item.qualification,
      item.degreeMajor,
      item.teachingGrades.join(', '),
      item.teachingClasses.join(', '),
      item.weeklyPeriods,
      item.homeroomClass,
      contractLabel(item.contractType),
      item.joinedAt,
      statusLabel(item.status),
    ])];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')}`;
    exportFile(`danh-sach-${department.shortName}-${today()}.csv`, csv, 'text/csv;charset=utf-8');
  };
  const exportJson = () => exportFile(
    `brian-team-${department.shortName}-${today()}.json`,
    JSON.stringify({ exportedAt: new Date().toISOString(), workspace }, null, 2),
    'application/json;charset=utf-8',
  );

  if (!canManage) {
    return (
      <main className="bt-denied">
        <section><ShieldCheck /><span>BRIAN TEAM</span><h1>Dành riêng cho Tổ trưởng chuyên môn</h1><p>Chỉ tài khoản TTCM hoặc quản trị viên được ủy quyền mới mở được ứng dụng này.</p><button onClick={() => { window.location.hash = '#/apps'; }}>Về trang Ứng dụng</button></section>
      </main>
    );
  }
  if (loading || !workspace || !department) {
    return <main className="bt-loading"><RefreshCw /><h1>Đang mở Brian Team…</h1><p>Đang liên kết thành viên với tài khoản giáo viên.</p></main>;
  }

  return (
    <main className="bt-shell" style={{ '--bt-scale': fontScale / 100, '--bt-department-color': department.color || '#2F6F78' }}>
      <header className="bt-topbar">
        <div className="bt-brand"><span><UsersRound /></span><div><small>BRIAN TEAM</small><h1>Nhân sự tổ chuyên môn</h1></div></div>
        <div className="bt-actions">
          <div className="bt-department-picker">
            <button type="button" onClick={() => setDepartmentMenu((value) => !value)}><i style={{ background: department.color }} /><b>{department.name}</b><ChevronDown /></button>
            {departmentMenu && (
              <div className="bt-department-menu">
                <header><b>Chọn tổ chuyên môn</b><small>Dữ liệu của mỗi tổ được tách riêng.</small></header>
                {workspace.departments.map((item) => (
                  <button type="button" key={item.id} className={item.id === department.id ? 'is-active' : ''} onClick={() => { patchWorkspace((current) => ({ ...current, activeDepartmentId: item.id })); setDepartmentMenu(false); }}>
                    <i style={{ background: item.color }} />
                    <span><b>{item.name}</b><small>{item.schoolLevel} · {item.subject || 'Chưa khai báo môn'}</small></span>
                    {item.id === department.id && <CheckCircle2 />}
                  </button>
                ))}
                <button type="button" className="is-add" onClick={() => { setDepartmentMenu(false); setModal('department'); }}><Plus /> Thêm tổ</button>
              </div>
            )}
          </div>
          <div className="bt-save">{saving ? <RefreshCw className="spin" /> : <CheckCircle2 />}<span>{saving ? 'Đang lưu…' : saveText || 'Đã sẵn sàng'}</span></div>
          <div className="bt-font"><Settings2 />{FONT_SCALES.map((scale) => <button type="button" key={scale} className={scale === fontScale ? 'is-active' : ''} onClick={() => patchWorkspace((current) => ({ ...current, preferences: { ...current.preferences, fontScale: scale } }))}>{scale}%</button>)}</div>
        </div>
      </header>

      <section className="bt-hero">
        <div>
          <span><Sparkles /> Không gian điều hành của TTCM</span>
          <h2>{department.name}</h2>
          <p>{department.description || 'Quản lí thành viên, phân công, hồ sơ và đánh giá của tổ chuyên môn.'}</p>
          <div>
            <button className="is-primary" onClick={() => setModal('member')}><UserPlus /> Thêm giáo viên</button>
            <button onClick={() => setModal('assignment')}><Plus /> Giao nhiệm vụ</button>
            <button onClick={exportCsv}><Download /> Xuất danh sách</button>
          </div>
        </div>
        <aside><UsersRound /><strong>{members.length}</strong><span>thành viên</span></aside>
      </section>

      {warning && <div className="bt-warning"><AlertTriangle /><span>Dữ liệu đang lưu trên thiết bị. Chạy file <b>supabase/brian-team.sql</b> để bật đồng bộ Supabase.</span></div>}

      <nav className="bt-tabs">
        {TABS.map(([id, label, Icon]) => <button type="button" key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon /><span>{label}</span></button>)}
      </nav>

      <section className="bt-content">
        {tab === 'overview' && <Overview members={members} tasks={tasks} documents={documents} absences={department.absences} lateTasks={lateTasks} pendingDocuments={pendingDocuments} activeMembers={activeMembers} accountForMember={accountForMember} setTab={setTab} />}
        {tab === 'members' && <Members members={visibleMembers} query={query} setQuery={setQuery} view={memberView} setView={(value) => { setMemberView(value); patchWorkspace((current) => ({ ...current, preferences: { ...current.preferences, memberView: value } })); }} onAdd={() => setModal('member')} onEdit={openMemberProfile} onRemove={(id) => patchDepartment((item) => ({ ...item, members: item.members.filter((member) => member.id !== id), assignments: item.assignments.map((task) => ({ ...task, assigneeIds: (task.assigneeIds || []).filter((memberId) => memberId !== id) })) }))} />}
        {tab === 'assignments' && <Assignments items={tasks} accountForMember={accountForMember} onAdd={() => setModal('assignment')} onPatch={(id, patch) => patchDepartment((item) => ({ ...item, assignments: item.assignments.map((task) => task.id === id ? { ...task, ...patch } : task) }))} onDelete={(id) => patchDepartment((item) => ({ ...item, assignments: item.assignments.filter((task) => task.id !== id) }))} />}
        {tab === 'documents' && <Documents items={documents} accountForMember={accountForMember} onAdd={() => setModal('document')} onPatch={(id, patch) => patchDepartment((item) => ({ ...item, documentRequirements: item.documentRequirements.map((doc) => doc.id === id ? { ...doc, ...patch } : doc) }))} onDelete={(id) => patchDepartment((item) => ({ ...item, documentRequirements: item.documentRequirements.filter((doc) => doc.id !== id) }))} />}
        {tab === 'absences' && <Absences items={department.absences} accountForMember={accountForMember} onAdd={() => setModal('absence')} onDelete={(id) => patchDepartment((item) => ({ ...item, absences: item.absences.filter((entry) => entry.id !== id) }))} />}
        {tab === 'evaluations' && <Evaluations items={department.evaluations} accountForMember={accountForMember} onAdd={() => setModal('evaluation')} onDelete={(id) => patchDepartment((item) => ({ ...item, evaluations: item.evaluations.filter((entry) => entry.id !== id) }))} />}
        {tab === 'reports' && <Reports department={department} members={members} tasks={tasks} documents={documents} exportCsv={exportCsv} exportJson={exportJson} />}
      </section>

      {modal === 'department' && <DepartmentModal currentUser={currentUser} close={() => setModal('')} create={(item) => { patchWorkspace((current) => ({ ...current, activeDepartmentId: item.id, departments: [...current.departments, item] })); setModal(''); }} />}
      {modal === 'member' && <MemberModal accounts={accounts} existing={new Set(department.members.map((item) => item.teacherAccountId))} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, members: [...current.members, item] })); setModal(''); }} />}
      {modal === 'profile' && editingMember && <MemberProfileModal member={editingMember} close={() => { setModal(''); setEditingMemberId(''); }} save={(patch) => { patchMember(editingMember.id, patch); setModal(''); setEditingMemberId(''); }} />}
      {modal === 'assignment' && <AssignmentModal members={members} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, assignments: [item, ...current.assignments] })); setModal(''); }} />}
      {modal === 'document' && <DocumentModal members={members} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, documentRequirements: [item, ...current.documentRequirements] })); setModal(''); }} />}
      {modal === 'absence' && <AbsenceModal members={members} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, absences: [item, ...current.absences] })); setModal(''); }} />}
      {modal === 'evaluation' && <EvaluationModal members={members} close={() => setModal('')} create={(item) => { patchDepartment((current) => ({ ...current, evaluations: [item, ...current.evaluations] })); setModal(''); }} />}
    </main>
  );
}

function Overview({ members, tasks, documents, absences, lateTasks, pendingDocuments, activeMembers, accountForMember, setTab }) {
  return (
    <div>
      <div className="bt-stats">
        <Stat Icon={UsersRound} title="Thành viên" value={members.length} note={`${activeMembers} đang làm việc`} />
        <Stat Icon={BriefcaseBusiness} title="Nhiệm vụ" value={tasks.length} note={`${lateTasks} việc trễ hạn`} tone="blue" />
        <Stat Icon={FolderCheck} title="Hồ sơ" value={documents.length} note={`${pendingDocuments} hồ sơ chưa nộp`} tone="orange" />
        <Stat Icon={CalendarDays} title="Nghỉ – vắng" value={absences.length} note="Trong dữ liệu hiện tại" tone="purple" />
      </div>
      <div className="bt-dashboard-grid">
        <article className="bt-panel">
          <header><div><span>THÀNH VIÊN</span><h2>Tổ Tiếng Anh</h2></div><button onClick={() => setTab('members')}>Xem tất cả</button></header>
          <div className="bt-person-list">
            {members.slice(0, 5).map((item) => <div key={item.id}><Avatar account={item.account} /><span><b>{item.account.name}</b><small>{roleLabel(item.role)} · {item.weeklyPeriods} tiết/tuần</small></span><em className={`status-${item.status}`}>{statusLabel(item.status)}</em></div>)}
          </div>
        </article>
        <article className="bt-panel">
          <header><div><span>CẦN XỬ LÍ</span><h2>Công việc gần nhất</h2></div><button onClick={() => setTab('assignments')}>Mở phân công</button></header>
          {tasks.length ? (
            <div className="bt-task-list">
              {tasks.slice(0, 5).map((item) => <div key={item.id}><i className={`priority-${item.priority}`} /><span><b>{item.title}</b><small>{(item.assigneeIds || []).map((id) => accountForMember(id)?.name).filter(Boolean).join(', ') || 'Chưa giao'} · {item.dueDate ? dateLabel(item.dueDate) : 'Không hạn'}</small></span><em>{taskLabel(item.status)}</em></div>)}
            </div>
          ) : <Empty Icon={BriefcaseBusiness} title="Chưa có nhiệm vụ" text="Tạo nhiệm vụ đầu tiên cho thành viên trong tổ." />}
        </article>
      </div>
    </div>
  );
}

function Members({ members, query, setQuery, view, setView, onAdd, onEdit, onRemove }) {
  return (
    <div>
      <PageHead eyebrow="THÀNH VIÊN" title="Danh bạ Tổ Tiếng Anh" text="Hồ sơ được liên kết với tài khoản Brian; Admin đã duyệt cũng có thể được thêm như một giáo viên hoặc TTCM." action={<button className="is-primary" onClick={onAdd}><UserPlus /> Thêm giáo viên</button>} />
      <div className="bt-toolbar">
        <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, mã GV, điện thoại, trình độ, lớp dạy…" /></label>
        <div><button className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')}><LayoutGrid /></button><button className={view === 'table' ? 'is-active' : ''} onClick={() => setView('table')}><List /></button></div>
      </div>
      {members.length ? view === 'cards' ? (
        <div className="bt-member-grid bt-member-grid-v2">
          {members.map((item) => (
            <article key={item.id} className="bt-member-card bt-member-card-v2">
              <header>
                <Avatar account={item.account} />
                <div><h3>{item.account.name}</h3><p>{item.account.email}</p><span className={`bt-account-role is-${String(item.account.role || 'teacher').toLowerCase()}`}>{accountRoleLabel(item.account.role)}</span></div>
                <em className={`bt-member-status status-${item.status}`}>{statusLabel(item.status)}</em>
              </header>
              <div className="bt-member-summary-grid">
                <InfoValue icon={IdCard} label="Mã giáo viên" value={item.staffCode} />
                <InfoValue icon={Phone} label="Điện thoại" value={item.phone} />
                <InfoValue icon={GraduationCap} label="Trình độ" value={item.qualification || item.degreeMajor} />
                <InfoValue icon={BriefcaseBusiness} label="Vai trò trong tổ" value={roleLabel(item.role)} />
                <InfoValue icon={UsersRound} label="Khối / lớp dạy" value={[item.teachingGrades.join(', '), item.teachingClasses.join(', ')].filter(Boolean).join(' · ')} />
                <InfoValue icon={CalendarDays} label="Phân công" value={`${item.weeklyPeriods || 0} tiết${item.homeroomClass ? ` · CN ${item.homeroomClass}` : ''}`} />
              </div>
              <footer className="bt-member-card-actions">
                <span><b>{contractLabel(item.contractType)}</b><small>Vào tổ: {dateLabel(item.joinedAt)}</small></span>
                <div>
                  <button className="is-edit" onClick={() => onEdit(item.id)}><PencilLine /> Chỉnh sửa hồ sơ</button>
                  <button className="is-delete" title="Xóa khỏi tổ" onClick={() => onRemove(item.id)}><Trash2 /></button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="bt-table-wrap">
          <table className="bt-member-table-v2">
            <thead><tr><th>Giáo viên</th><th>Mã GV</th><th>Vai trò</th><th>Trình độ</th><th>Khối / lớp dạy</th><th>Số tiết</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {members.map((item) => (
                <tr key={item.id}>
                  <td><div className="bt-table-person"><Avatar account={item.account} tiny /><span><b>{item.account.name}</b><small>{item.account.email} · {accountRoleLabel(item.account.role)}</small></span></div></td>
                  <td>{item.staffCode || '—'}</td>
                  <td>{roleLabel(item.role)}</td>
                  <td>{item.qualification || item.degreeMajor || '—'}</td>
                  <td>{[item.teachingGrades.join(', '), item.teachingClasses.join(', ')].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{item.weeklyPeriods}</td>
                  <td>{statusLabel(item.status)}</td>
                  <td><div className="bt-table-actions"><button className="is-edit" onClick={() => onEdit(item.id)}><PencilLine /></button><button className="is-delete" onClick={() => onRemove(item.id)}><Trash2 /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty Icon={UsersRound} title="Chưa có thành viên phù hợp" text="Thêm giáo viên hoặc tài khoản Admin đã được duyệt vào tổ." action={<button className="is-primary" onClick={onAdd}><UserPlus /> Thêm giáo viên</button>} />}
    </div>
  );
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
  const cards = [
    { Icon: UsersRound, title: 'Danh sách nhân sự tổ', text: `${members.length} thành viên với hồ sơ mở rộng.`, action: exportCsv, label: 'Xuất CSV' },
    { Icon: BriefcaseBusiness, title: 'Tình hình phân công', text: `${tasks.length} nhiệm vụ trong tổ đang chọn.`, action: exportJson, label: 'Xuất dữ liệu' },
    { Icon: FolderCheck, title: 'Tình hình hồ sơ', text: `${documents.length} yêu cầu hồ sơ chuyên môn.`, action: exportJson, label: 'Xuất dữ liệu' },
    { Icon: ShieldCheck, title: 'Bản sao lưu Brian Team', text: `Sao lưu toàn bộ dữ liệu của ${department.name}.`, action: exportJson, label: 'Tải JSON' },
  ];
  return <div><PageHead eyebrow="BÁO CÁO" title="Xuất dữ liệu tổ chuyên môn" text={`Dữ liệu được đóng gói theo tổ đang chọn: ${department.name}.`} /><div className="bt-report-grid">{cards.map(({ Icon, title, text, action, label }) => <article key={title}><span><Icon /></span><h3>{title}</h3><p>{text}</p><button onClick={action}><Download /> {label}</button></article>)}</div></div>;
}

function PageHead({ eyebrow, title, text, action }) {
  return <div className="bt-page-head"><div><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>{action}</div>;
}

function FormActions({ close, label, save = false }) {
  return <footer className="bt-form-actions"><button type="button" onClick={close}>Hủy</button><button className="is-primary" type="submit">{save ? <Save /> : <Plus />} {label}</button></footer>;
}

function DepartmentModal({ currentUser, close, create }) {
  const [form, setForm] = useState({ name: '', shortName: '', schoolLevel: 'THPT', subject: '', color: '#2F6F78', description: '' });
  return <Modal title="Thêm tổ chuyên môn" onClose={close}><form onSubmit={(event) => { event.preventDefault(); if (form.name.trim()) create(createDepartment(form, currentUser)); }}><div className="bt-form-grid"><label className="span-2">Tên tổ<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tổ Toán – Tin" /></label><label>Tên ngắn<input value={form.shortName} onChange={(event) => setForm({ ...form, shortName: event.target.value })} /></label><label>Cấp học<select value={form.schoolLevel} onChange={(event) => setForm({ ...form, schoolLevel: event.target.value })}><option>THPT</option><option>THCS</option><option>Tiểu học</option></select></label><label>Môn chuyên môn<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label><label>Màu nhận diện<input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label><label className="span-2">Mô tả<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div><FormActions close={close} label="Tạo tổ" /></form></Modal>;
}

function MemberModal({ accounts, existing, close, create }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState({
    role: 'teacher', staffCode: '', phone: '', qualification: '', joinedAt: today(),
    weeklyPeriods: 0, teachingGrades: '', teachingClasses: '', homeroomClass: '',
  });
  const available = accounts.filter((item) => !existing.has(item.id) && `${item.name} ${item.email} ${accountRoleLabel(item.role)}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Modal title="Thêm giáo viên từ tài khoản Brian" onClose={close} wide>
      <div className="bt-account-picker">
        <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm giáo viên, TTCM hoặc tài khoản Admin đã duyệt…" /></label>
        <div>
          {available.length ? available.map((item) => (
            <button type="button" key={item.id} className={selected === item.id ? 'is-active' : ''} onClick={() => setSelected(item.id)}>
              <Avatar account={item} />
              <span><b>{item.name}</b><small>{item.email}</small></span>
              <em className={`is-${String(item.role || 'teacher').toLowerCase()}`}>{accountRoleLabel(item.role)}</em>
              {selected === item.id && <CheckCircle2 />}
            </button>
          )) : <Empty Icon={UsersRound} title="Không còn tài khoản phù hợp" text="Tài khoản giáo viên, TTCM và Admin đã duyệt nhưng chưa thuộc tổ sẽ xuất hiện tại đây." />}
        </div>
      </div>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!selected) return;
        create(createTeamMember({
          teacherAccountId: selected,
          role: form.role,
          staffCode: form.staffCode,
          phone: form.phone,
          qualification: form.qualification,
          joinedAt: form.joinedAt,
          teachingGrades: form.teachingGrades,
          teachingClasses: form.teachingClasses,
          weeklyPeriods: Number(form.weeklyPeriods || 0),
          homeroomClass: form.homeroomClass,
          teachingSubject: 'Tiếng Anh',
          employmentType: 'core',
          contractType: 'permanent',
          status: 'active',
        }));
      }}>
        <div className="bt-form-grid">
          <label>Vai trò trong tổ<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="teacher">Giáo viên</option><option value="deputy">Tổ phó</option><option value="head">Tổ trưởng</option></select></label>
          <label>Mã giáo viên<input value={form.staffCode} onChange={(event) => setForm({ ...form, staffCode: event.target.value })} /></label>
          <label>Điện thoại<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Trình độ<input value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })} placeholder="Cử nhân, Thạc sĩ…" /></label>
          <label>Ngày vào tổ<input type="date" value={form.joinedAt} onChange={(event) => setForm({ ...form, joinedAt: event.target.value })} /></label>
          <label>Số tiết/tuần<input type="number" min="0" value={form.weeklyPeriods} onChange={(event) => setForm({ ...form, weeklyPeriods: event.target.value })} /></label>
          <label>Khối dạy<input value={form.teachingGrades} onChange={(event) => setForm({ ...form, teachingGrades: event.target.value })} placeholder="10, 11, 12" /></label>
          <label>Lớp dạy<input value={form.teachingClasses} onChange={(event) => setForm({ ...form, teachingClasses: event.target.value })} placeholder="10.1, 11.2, 12.6" /></label>
          <label className="span-2">Lớp chủ nhiệm<input value={form.homeroomClass} onChange={(event) => setForm({ ...form, homeroomClass: event.target.value })} /></label>
        </div>
        <FormActions close={close} label="Thêm vào tổ" />
      </form>
    </Modal>
  );
}

function MemberProfileModal({ member, close, save }) {
  const [form, setForm] = useState({
    role: member.role || 'teacher',
    status: member.status || 'active',
    staffCode: member.staffCode || '',
    joinedAt: member.joinedAt || '',
    appointmentDate: member.appointmentDate || '',
    dateOfBirth: member.dateOfBirth || '',
    gender: member.gender || '',
    phone: member.phone || '',
    address: member.address || '',
    emergencyContactName: member.emergencyContactName || '',
    emergencyContactPhone: member.emergencyContactPhone || '',
    employmentType: member.employmentType || 'core',
    contractType: member.contractType || 'permanent',
    professionalTitle: member.professionalTitle || '',
    teacherRank: member.teacherRank || '',
    qualification: member.qualification || '',
    degreeMajor: member.degreeMajor || '',
    trainingInstitution: member.trainingInstitution || '',
    graduationYear: member.graduationYear || '',
    yearsOfExperience: member.yearsOfExperience || 0,
    teachingSubject: member.teachingSubject || 'Tiếng Anh',
    teachingGrades: member.teachingGrades.join(', '),
    teachingClasses: member.teachingClasses.join(', '),
    weeklyPeriods: member.weeklyPeriods || 0,
    homeroomClass: member.homeroomClass || '',
    additionalDuties: member.additionalDuties || '',
    certifications: member.certifications || '',
    strengths: member.strengths || '',
    achievements: member.achievements || '',
    note: member.note || '',
  });
  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <Modal title={`Hồ sơ giáo viên · ${member.account.name}`} onClose={close} extraWide>
      <form className="bt-profile-form" onSubmit={(event) => {
        event.preventDefault();
        save({
          ...form,
          weeklyPeriods: Number(form.weeklyPeriods || 0),
          yearsOfExperience: Number(form.yearsOfExperience || 0),
          teachingGrades: form.teachingGrades.split(',').map((value) => value.trim()).filter(Boolean),
          teachingClasses: form.teachingClasses.split(',').map((value) => value.trim()).filter(Boolean),
        });
      }}>
        <section className="bt-profile-account">
          <Avatar account={member.account} />
          <div><h3>{member.account.name}</h3><p>{member.account.email}</p><span>{accountRoleLabel(member.account.role)} · {member.account.school || 'Chưa khai báo trường'}</span></div>
          <b>Đã liên kết tài khoản Brian</b>
        </section>

        <ProfileSection icon={IdCard} title="Thông tin cá nhân và liên hệ" text="Thông tin phục vụ quản lí nội bộ của tổ chuyên môn.">
          <label>Mã giáo viên<input value={form.staffCode} onChange={(event) => patch('staffCode', event.target.value)} /></label>
          <label>Ngày sinh<input type="date" value={form.dateOfBirth} onChange={(event) => patch('dateOfBirth', event.target.value)} /></label>
          <label>Giới tính<select value={form.gender} onChange={(event) => patch('gender', event.target.value)}><option value="">Chưa khai báo</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label>
          <label>Điện thoại<input value={form.phone} onChange={(event) => patch('phone', event.target.value)} /></label>
          <label className="span-2">Địa chỉ liên hệ<input value={form.address} onChange={(event) => patch('address', event.target.value)} /></label>
          <label>Người liên hệ khẩn cấp<input value={form.emergencyContactName} onChange={(event) => patch('emergencyContactName', event.target.value)} /></label>
          <label>Điện thoại khẩn cấp<input value={form.emergencyContactPhone} onChange={(event) => patch('emergencyContactPhone', event.target.value)} /></label>
        </ProfileSection>

        <ProfileSection icon={BriefcaseBusiness} title="Thông tin công tác" text="Vai trò, hợp đồng và quá trình tham gia tổ chuyên môn.">
          <label>Vai trò trong tổ<select value={form.role} onChange={(event) => patch('role', event.target.value)}><option value="teacher">Giáo viên</option><option value="deputy">Tổ phó</option><option value="head">Tổ trưởng</option></select></label>
          <label>Trạng thái<select value={form.status} onChange={(event) => patch('status', event.target.value)}><option value="active">Đang làm việc</option><option value="leave">Đang nghỉ</option><option value="inactive">Ngưng hoạt động</option></select></label>
          <label>Ngày vào tổ<input type="date" value={form.joinedAt} onChange={(event) => patch('joinedAt', event.target.value)} /></label>
          <label>Ngày bổ nhiệm / tuyển dụng<input type="date" value={form.appointmentDate} onChange={(event) => patch('appointmentDate', event.target.value)} /></label>
          <label>Hình thức làm việc<select value={form.employmentType} onChange={(event) => patch('employmentType', event.target.value)}><option value="core">Cơ hữu</option><option value="visiting">Thỉnh giảng</option></select></label>
          <label>Loại hợp đồng<select value={form.contractType} onChange={(event) => patch('contractType', event.target.value)}><option value="permanent">Không xác định thời hạn</option><option value="fixed_term">Có thời hạn</option><option value="visiting">Thỉnh giảng</option><option value="probation">Thử việc</option><option value="other">Khác</option></select></label>
          <label>Chức danh nghề nghiệp<input value={form.professionalTitle} onChange={(event) => patch('professionalTitle', event.target.value)} placeholder="Giáo viên THPT…" /></label>
          <label>Hạng giáo viên<input value={form.teacherRank} onChange={(event) => patch('teacherRank', event.target.value)} placeholder="Hạng I, II, III…" /></label>
          <label>Số năm kinh nghiệm<input type="number" min="0" value={form.yearsOfExperience} onChange={(event) => patch('yearsOfExperience', event.target.value)} /></label>
          <label className="span-2">Nhiệm vụ kiêm nhiệm<input value={form.additionalDuties} onChange={(event) => patch('additionalDuties', event.target.value)} placeholder="GVCN, công đoàn, khảo thí, CLB…" /></label>
        </ProfileSection>

        <ProfileSection icon={GraduationCap} title="Trình độ và chuyên môn" text="Thông tin đào tạo, phân công giảng dạy và thế mạnh chuyên môn.">
          <label>Trình độ cao nhất<input value={form.qualification} onChange={(event) => patch('qualification', event.target.value)} placeholder="Cử nhân, Thạc sĩ, Tiến sĩ…" /></label>
          <label>Chuyên ngành đào tạo<input value={form.degreeMajor} onChange={(event) => patch('degreeMajor', event.target.value)} /></label>
          <label>Cơ sở đào tạo<input value={form.trainingInstitution} onChange={(event) => patch('trainingInstitution', event.target.value)} /></label>
          <label>Năm tốt nghiệp<input inputMode="numeric" value={form.graduationYear} onChange={(event) => patch('graduationYear', event.target.value)} /></label>
          <label>Môn giảng dạy<input value={form.teachingSubject} onChange={(event) => patch('teachingSubject', event.target.value)} /></label>
          <label>Số tiết/tuần<input type="number" min="0" value={form.weeklyPeriods} onChange={(event) => patch('weeklyPeriods', event.target.value)} /></label>
          <label>Khối dạy<input value={form.teachingGrades} onChange={(event) => patch('teachingGrades', event.target.value)} placeholder="10, 11, 12" /></label>
          <label>Lớp dạy<input value={form.teachingClasses} onChange={(event) => patch('teachingClasses', event.target.value)} placeholder="10.1, 11.2, 12.6" /></label>
          <label>Lớp chủ nhiệm<input value={form.homeroomClass} onChange={(event) => patch('homeroomClass', event.target.value)} /></label>
          <label>Chứng chỉ chuyên môn<input value={form.certifications} onChange={(event) => patch('certifications', event.target.value)} placeholder="IELTS, Cambridge, CNTT, ngoại ngữ…" /></label>
          <label className="span-2">Thế mạnh chuyên môn<textarea rows="3" value={form.strengths} onChange={(event) => patch('strengths', event.target.value)} placeholder="Bồi dưỡng HSG, luyện thi THPT, công nghệ giáo dục…" /></label>
          <label className="span-2">Thành tích / khen thưởng<textarea rows="3" value={form.achievements} onChange={(event) => patch('achievements', event.target.value)} /></label>
        </ProfileSection>

        <ProfileSection icon={Award} title="Ghi chú quản lí" text="Nội dung nội bộ chỉ dành cho TTCM và Admin được ủy quyền.">
          <label className="span-2">Ghi chú<textarea rows="4" value={form.note} onChange={(event) => patch('note', event.target.value)} /></label>
        </ProfileSection>
        <FormActions close={close} label="Lưu hồ sơ" save />
      </form>
    </Modal>
  );
}

function ProfileSection({ icon: Icon, title, text, children }) {
  return (
    <section className="bt-profile-section">
      <header><span><Icon /></span><div><h3>{title}</h3><p>{text}</p></div></header>
      <div className="bt-form-grid">{children}</div>
    </section>
  );
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
