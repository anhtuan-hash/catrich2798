import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch anchor not found: ${label}`);
  return source.replace(from, to);
}

// 1) Permission model.
{
  const path = 'src/utils/permissions.js';
  let source = read(path);

  source = replaceOnce(source,
`};

const PUBLIC_ROUTES`,
`};

// Attendance is intentionally outside normal "full teacher" access.
// The legacy route:attendance id remains readable for backwards compatibility only.
export const ATTENDANCE_PERMISSION_IDS = {
  quick: 'attendance:quick',
  calendar: 'attendance:calendar',
  manage: 'attendance:manage',
  history: 'attendance:history',
  report: 'attendance:report',
};

export const ATTENDANCE_PERMISSION_ITEMS = [
  {
    id: ATTENDANCE_PERMISSION_IDS.quick,
    tab: 'quick',
    type: 'attendance',
    section: 'attendance',
    title: 'Quick attendance',
    titleVi: 'Điểm danh nhanh',
    desc: 'Take attendance, cancel a class session, and reopen a locked attendance day.',
    descVi: 'Điểm danh, hủy buổi học và xóa buổi điểm danh đã chốt để mở lại ngày.',
  },
  {
    id: ATTENDANCE_PERMISSION_IDS.calendar,
    tab: 'calendar',
    type: 'attendance',
    section: 'attendance',
    title: 'Monthly calendar',
    titleVi: 'Lịch tháng',
    desc: 'View the monthly attendance calendar.',
    descVi: 'Xem lịch điểm danh theo tháng.',
  },
  {
    id: ATTENDANCE_PERMISSION_IDS.manage,
    tab: 'manage',
    type: 'attendance',
    section: 'attendance',
    title: 'Class management',
    titleVi: 'Quản lý lớp',
    desc: 'Import, create, edit and remove extra classes, students and teachers.',
    descVi: 'Import, tạo, chỉnh sửa và xóa lớp, học sinh, giáo viên phụ đạo/bồi dưỡng.',
  },
  {
    id: ATTENDANCE_PERMISSION_IDS.history,
    tab: 'history',
    type: 'attendance',
    section: 'attendance',
    title: 'Attendance history',
    titleVi: 'Lịch sử',
    desc: 'View completed and cancelled attendance sessions and absence details.',
    descVi: 'Xem lịch sử buổi học đã điểm danh/đã hủy và chi tiết học sinh vắng.',
  },
  {
    id: ATTENDANCE_PERMISSION_IDS.report,
    tab: 'report',
    type: 'attendance',
    section: 'attendance',
    title: 'Attendance reports',
    titleVi: 'Báo cáo',
    desc: 'View and export attendance reports.',
    descVi: 'Xem và xuất báo cáo chuyên cần.',
  },
];

export const ATTENDANCE_PERMISSION_GROUP = {
  key: 'attendance',
  title: 'Attendance',
  titleVi: 'Điểm danh',
  ids: ATTENDANCE_PERMISSION_ITEMS.map((item) => item.id),
};

const PUBLIC_ROUTES`, 'attendance constants');

  source = replaceOnce(source,
`  {
    id: ROUTE_PERMISSION_IDS.attendance,
    type: 'system',
    section: 'content',
    title: 'Attendance',
    titleVi: 'Điểm danh',
    desc: 'Access remedial and enrichment attendance. This permission must be granted explicitly by an administrator.',
    descVi: 'Truy cập điểm danh lớp phụ đạo & bồi dưỡng. Quyền này phải được quản trị viên cấp riêng.',
  },
`, '', 'remove legacy visible attendance item');

  source = replaceOnce(source,
`export const PERMISSION_ITEMS = [...CORE_PERMISSION_ITEMS, ...TOOL_PERMISSION_ITEMS];
export const ALL_PERMISSION_IDS = PERMISSION_ITEMS.map((item) => item.id);
export const EXPLICIT_PERMISSION_IDS = [ROUTE_PERMISSION_IDS.attendance];`,
`export const PERMISSION_ITEMS = [...CORE_PERMISSION_ITEMS, ...ATTENDANCE_PERMISSION_ITEMS, ...TOOL_PERMISSION_ITEMS];
export const ALL_PERMISSION_IDS = PERMISSION_ITEMS.map((item) => item.id);
export const EXPLICIT_PERMISSION_IDS = [...ATTENDANCE_PERMISSION_GROUP.ids];`, 'permission item registry');

  source = replaceOnce(source,
`function cleanPermissionIds(allowed = []) {
  return [...new Set((allowed || []).filter((id) => ALL_PERMISSION_IDS.includes(id)))];
}

function cleanExplicitPermissionIds(allowed = []) {
  return [...new Set((allowed || []).filter((id) => EXPLICIT_PERMISSION_SET.has(id)))];
}`,
`function expandLegacyAttendancePermissions(allowed = []) {
  const source = Array.isArray(allowed) ? allowed : [];
  if (!source.includes(ROUTE_PERMISSION_IDS.attendance)) return source;
  return [
    ...source.filter((id) => id !== ROUTE_PERMISSION_IDS.attendance),
    ...ATTENDANCE_PERMISSION_GROUP.ids,
  ];
}

function cleanPermissionIds(allowed = []) {
  return [...new Set(expandLegacyAttendancePermissions(allowed).filter((id) => ALL_PERMISSION_IDS.includes(id)))];
}

function cleanExplicitPermissionIds(allowed = []) {
  return [...new Set(expandLegacyAttendancePermissions(allowed).filter((id) => EXPLICIT_PERMISSION_SET.has(id)))];
}`, 'legacy permission expansion');

  source = replaceOnce(source,
`export function getPermissionItem(id) {
  return PERMISSION_ITEMS.find((item) => item.id === id) || null;
}`,
`export function getPermissionItem(id) {
  const item = PERMISSION_ITEMS.find((entry) => entry.id === id);
  if (item) return item;
  if (id === ROUTE_PERMISSION_IDS.attendance) {
    return {
      id,
      type: 'attendance',
      section: 'attendance',
      title: 'Attendance (legacy)',
      titleVi: 'Điểm danh (quyền cũ)',
      desc: 'Legacy attendance grant; migrated to all five attendance tabs.',
      descVi: 'Quyền Điểm danh cũ; hệ thống tự chuyển thành đủ 5 quyền thẻ Điểm danh.',
    };
  }
  return null;
}`, 'legacy permission item lookup');

  source = replaceOnce(source,
`export function hasExplicitPermissionId(user, permissionId) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  const permissions = normalizePermissions(user.permissions);
  return Array.isArray(permissions.allowed) && permissions.allowed.includes(permissionId);
}

export function hasPermissionId(user, permissionId) {`,
`export function hasExplicitPermissionId(user, permissionId) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  const permissions = normalizePermissions(user.permissions);
  return Array.isArray(permissions.allowed) && permissions.allowed.includes(permissionId);
}

export function hasAttendanceTabAccess(user, tab) {
  const permissionId = ATTENDANCE_PERMISSION_IDS[tab];
  return Boolean(permissionId && hasExplicitPermissionId(user, permissionId));
}

export function hasAnyAttendanceAccess(user) {
  return ATTENDANCE_PERMISSION_ITEMS.some((item) => hasAttendanceTabAccess(user, item.tab));
}

export function getFirstAllowedAttendanceTab(user) {
  return ATTENDANCE_PERMISSION_ITEMS.find((item) => hasAttendanceTabAccess(user, item.tab))?.tab || '';
}

export function hasPermissionId(user, permissionId) {`, 'attendance permission helpers');

  source = replaceOnce(source,
`export function hasPermissionId(user, permissionId) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  const permissions = normalizePermissions(user.permissions);
  if (EXPLICIT_PERMISSION_SET.has(permissionId)) return permissions.allowed.includes(permissionId);`,
`export function hasPermissionId(user, permissionId) {
  if (!user) return false;
  if (isAdminRole(user.role)) return true;
  if (permissionId === ROUTE_PERMISSION_IDS.attendance) return hasAnyAttendanceAccess(user);
  const permissions = normalizePermissions(user.permissions);
  if (EXPLICIT_PERMISSION_SET.has(permissionId)) return permissions.allowed.includes(permissionId);`, 'legacy route permission semantics');

  source = replaceOnce(source,
`  if (route === 'homeroom') return HOMEROOM_PERMISSION_ID;
  if (route === 'dashboard'`,
`  if (route === 'homeroom') return HOMEROOM_PERMISSION_ID;
  if (route === 'attendance') return ATTENDANCE_PERMISSION_IDS.quick;
  if (route === 'dashboard'`, 'route permission id');

  source = replaceOnce(source,
`  if (route === 'homeroom') return hasPermissionId(user, HOMEROOM_PERMISSION_ID);
  if (route === 'apps'`,
`  if (route === 'homeroom') return hasPermissionId(user, HOMEROOM_PERMISSION_ID);
  if (route === 'attendance') return hasAnyAttendanceAccess(user);
  if (route === 'apps'`, 'attendance route access');

  source = replaceOnce(source,
`  if (permissions.mode === PERMISSION_MODE_ALL) return language === 'vi' ? 'Toàn quyền giáo viên' : 'Full teacher access';`,
`  if (permissions.mode === PERMISSION_MODE_ALL) {
    const attendanceCount = ATTENDANCE_PERMISSION_GROUP.ids.filter((id) => permissions.allowed.includes(id)).length;
    if (!attendanceCount) return language === 'vi' ? 'Toàn quyền giáo viên · chưa cấp Điểm danh' : 'Full teacher access · no Attendance grant';
    return language === 'vi'
      ? \`Toàn quyền giáo viên · \${attendanceCount}/\${ATTENDANCE_PERMISSION_GROUP.ids.length} quyền Điểm danh\`
      : \`Full teacher access · \${attendanceCount}/\${ATTENDANCE_PERMISSION_GROUP.ids.length} Attendance permissions\`;
  }`, 'permission summary');

  write(path, source);
}

// 2) Attendance UI: render only allowed tabs and safely choose the first allowed tab.
{
  const path = 'src/components/GlobalAttendanceNavigationTab.jsx';
  let source = read(path);

  source = replaceOnce(source,
`import { hasExplicitPermissionId, ROUTE_PERMISSION_IDS } from '../utils/permissions.js';`,
`import {
  ATTENDANCE_PERMISSION_ITEMS,
  getFirstAllowedAttendanceTab,
  hasAnyAttendanceAccess,
  hasAttendanceTabAccess,
} from '../utils/permissions.js';`, 'attendance permission imports');

  source = replaceOnce(source,
`function Icon({ name, size = 20 }) {`,
`const ATTENDANCE_TAB_ICONS = {
  quick: 'check',
  calendar: 'calendar',
  manage: 'people',
  history: 'history',
  report: 'history',
};

function Icon({ name, size = 20 }) {`, 'tab icon map');

  source = replaceOnce(source,
`  const systemRole = normalizeSystemRole(runtime.role || currentUser?.role, SYSTEM_ROLES.GUEST);
  const allowed = Boolean(
    currentUser?.id
      && (systemRole === SYSTEM_ROLES.ADMIN
        || hasExplicitPermissionId(currentUser, ROUTE_PERMISSION_IDS.attendance))
  );`,
`  const systemRole = normalizeSystemRole(runtime.role || currentUser?.role, SYSTEM_ROLES.GUEST);
  const isAttendanceAdmin = systemRole === SYSTEM_ROLES.ADMIN;
  const canAccessAttendanceView = (tabId) => isAttendanceAdmin || hasAttendanceTabAccess(currentUser, tabId);
  const availableAttendanceTabs = ATTENDANCE_PERMISSION_ITEMS.filter((item) => canAccessAttendanceView(item.tab));
  const firstAllowedView = isAttendanceAdmin ? 'quick' : getFirstAllowedAttendanceTab(currentUser);
  const allowed = Boolean(currentUser?.id && (isAttendanceAdmin || hasAnyAttendanceAccess(currentUser)));`, 'attendance access block');

  source = replaceOnce(source,
`  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-attendance-open');
    return () => document.documentElement.classList.remove('bes-attendance-open');
  }, [open]);`,
`  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-attendance-open');
    return () => document.documentElement.classList.remove('bes-attendance-open');
  }, [open]);

  useEffect(() => {
    if (!open || !allowed || !firstAllowedView) return;
    if (!canAccessAttendanceView(view)) setView(firstAllowedView);
  }, [open, allowed, firstAllowedView, view, currentUser?.permissions, systemRole]);`, 'view fallback effect');

  source = replaceOnce(source,
`  async function openSessionFromCalendar(session) {
    if (!session) return;
    await loadSessionRecords(session.id);
    setView('history');
  }`,
`  async function openSessionFromCalendar(session) {
    if (!session) return;
    if (!canAccessAttendanceView('history')) {
      setNotice('Bạn có quyền xem Lịch tháng. Cần thêm quyền Lịch sử để mở chi tiết buổi học.');
      return;
    }
    await loadSessionRecords(session.id);
    setView('history');
  }`, 'calendar history drilldown guard');

  source = replaceOnce(source,
`    <button type="button" className={\`brian-nav__attendance-tab \${open ? 'is-active' : ''}\`} aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((value) => !value); setError(''); if (!open) setView('quick'); }}>`,
`    <button type="button" className={\`brian-nav__attendance-tab \${open ? 'is-active' : ''}\`} aria-expanded={open} aria-haspopup="dialog" onClick={() => { setOpen((value) => !value); setError(''); if (!open) setView(firstAllowedView || 'quick'); }}>`, 'nav open default');

  source = replaceOnce(source,
`        <nav className="attendance-tabs" aria-label="Phân hệ điểm danh">
          <button type="button" className={view === 'quick' ? 'is-active' : ''} onClick={() => setView('quick')}><Icon name="check" size={18} />Điểm danh nhanh</button>
          <button type="button" className={view === 'calendar' ? 'is-active' : ''} onClick={() => setView('calendar')}><Icon name="calendar" size={18} />Lịch tháng</button>
          <button type="button" className={view === 'manage' ? 'is-active' : ''} onClick={() => setView('manage')}><Icon name="people" size={18} />Quản lý lớp</button>
          <button type="button" className={view === 'history' ? 'is-active' : ''} onClick={() => setView('history')}><Icon name="history" size={18} />Lịch sử</button>
          <button type="button" className={view === 'report' ? 'is-active' : ''} onClick={() => setView('report')}><Icon name="history" size={18} />Báo cáo</button>
        </nav>`,
`        <nav className="attendance-tabs" aria-label="Phân hệ điểm danh">
          {availableAttendanceTabs.map((item) => (
            <button key={item.id} type="button" className={view === item.tab ? 'is-active' : ''} onClick={() => setView(item.tab)}>
              <Icon name={ATTENDANCE_TAB_ICONS[item.tab] || 'attendance'} size={18} />{item.titleVi}
            </button>
          ))}
        </nav>`, 'granular tab navigation');

  for (const tab of ['quick', 'calendar', 'manage', 'report', 'history']) {
    source = replaceOnce(source,
      `!loading && view === '${tab}'`,
      `!loading && canAccessAttendanceView('${tab}') && view === '${tab}'`,
      `content guard ${tab}`);
  }

  source = replaceOnce(source,
`<span className="att-m3-period-chip">{selectedSession.session_status === 'cancelled' ? '0 tiết' : \`${'${String(selectedSession.lesson_periods || 1).replace(\'.\', \',\')}'} tiết\`}</span><button type="button" disabled={busy} onClick={() => deleteAttendanceSession(selectedSession)}><Icon name="trash" size={17} />Xóa buổi điểm danh</button></header>`,
`<span className="att-m3-period-chip">{selectedSession.session_status === 'cancelled' ? '0 tiết' : \`${'${String(selectedSession.lesson_periods || 1).replace(\'.\', \',\')}'} tiết\`}</span>{canAccessAttendanceView('quick') ? <button type="button" disabled={busy} onClick={() => deleteAttendanceSession(selectedSession)}><Icon name="trash" size={17} />Xóa buổi điểm danh</button> : null}</header>`, 'history delete action guard');

  write(path, source);
}

// 3) Admin editor: a dedicated Attendance group remains editable in both full and custom modes.
{
  const path = 'src/pages/AdminPage.jsx';
  let source = read(path);

  source = replaceOnce(source,
`  ALL_PERMISSION_IDS,
  PERMISSION_GROUPS,`,
`  ALL_PERMISSION_IDS,
  ATTENDANCE_PERMISSION_GROUP,
  PERMISSION_GROUPS,`, 'admin attendance group import');

  source = replaceOnce(source,
`  const setFull = () => onChange(createAllAccessPermissions());`,
`  const setFull = () => onChange(createAllAccessPermissions(allowedIds));`, 'preserve explicit grants in full mode');

  source = replaceOnce(source,
`  const toggleId = (id) => {
    const next = new Set(allowedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(createCustomPermissions([...next]));
  };`,
`  const toggleId = (id) => {
    const next = new Set(allowedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(createCustomPermissions([...next]));
  };
  const saveExplicitIds = (ids) => onChange(
    permissions.mode === 'all' ? createAllAccessPermissions(ids) : createCustomPermissions(ids)
  );
  const setExplicitGroup = (ids, checked) => {
    const next = new Set(allowedIds);
    ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
    saveExplicitIds([...next]);
  };
  const toggleExplicitId = (id) => {
    const next = new Set(allowedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveExplicitIds([...next]);
  };`, 'admin explicit permission handlers');

  source = replaceOnce(source,
`          {permissions.mode === 'all' ? (
            <div className="permission-all-note">`,
`          <div className="permission-groups permission-explicit-groups">
            <div className="permission-group">
              <div className="permission-group-title">
                <label>
                  <input
                    type="checkbox"
                    checked={ATTENDANCE_PERMISSION_GROUP.ids.every((id) => allowedIds.includes(id))}
                    disabled={disabled}
                    onChange={(event) => setExplicitGroup(ATTENDANCE_PERMISSION_GROUP.ids, event.target.checked)}
                  />
                  <span>{language === 'vi' ? ATTENDANCE_PERMISSION_GROUP.titleVi : ATTENDANCE_PERMISSION_GROUP.title}</span>
                </label>
                <small>{ATTENDANCE_PERMISSION_GROUP.ids.filter((id) => allowedIds.includes(id)).length}/{ATTENDANCE_PERMISSION_GROUP.ids.length}</small>
              </div>
              <p className="permission-explicit-note">
                {language === 'vi'
                  ? '5 quyền Điểm danh được cấp riêng, kể cả khi tài khoản đang ở chế độ Toàn quyền.'
                  : 'The five Attendance permissions are granted explicitly, even in Full access mode.'}
              </p>
              <div className="permission-chip-grid">
                {ATTENDANCE_PERMISSION_GROUP.ids.map((id) => {
                  const item = byId.get(id);
                  const checked = allowedIds.includes(id);
                  return (
                    <label key={id} className={checked ? 'permission-chip checked' : 'permission-chip'}>
                      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleExplicitId(id)} />
                      <span>
                        <b>{language === 'vi' ? item?.titleVi || item?.title : item?.title}</b>
                        <small>{language === 'vi' ? item?.descVi || item?.desc : item?.desc}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {permissions.mode === 'all' ? (
            <div className="permission-all-note">`, 'dedicated attendance permission group');

  source = replaceOnce(source,
`              {language === 'vi' ? 'Tài khoản này được dùng toàn bộ hoạt động, trò chơi, công cụ và nội dung giáo viên.' : 'This account can use all teacher activities, games, tools and content modules.'}`,
`              {language === 'vi' ? 'Tài khoản này được dùng toàn bộ hoạt động, trò chơi, công cụ và nội dung giáo viên. Quyền Điểm danh vẫn theo 5 lựa chọn riêng ở trên.' : 'This account can use all teacher activities, games, tools and content modules. Attendance still follows the five explicit choices above.'}`, 'full mode attendance note');

  write(path, source);
}

// 4) Update the earlier attendance integration contract to the new backwards-compatible model.
{
  const path = 'scripts/test-attendance-hub-absence-ui.mjs';
  let source = read(path);
  source = replaceOnce(source,
`  ROUTE_PERMISSION_IDS,
  createAllAccessPermissions,`,
`  ATTENDANCE_PERMISSION_IDS,
  ROUTE_PERMISSION_IDS,
  createAllAccessPermissions,`, 'legacy test imports 1');
  source = replaceOnce(source,
`  hasExplicitPermissionId,
  hasPermissionId,`,
`  hasAnyAttendanceAccess,
  hasAttendanceTabAccess,
  hasExplicitPermissionId,
  hasPermissionId,`, 'legacy test imports 2');

  const start = source.indexOf("assert.equal(ROUTE_PERMISSION_IDS.attendance, 'route:attendance'");
  const end = source.indexOf("assert.match(attendance, /Tìm nhanh lớp/i");
  if (start < 0 || end < 0 || end <= start) throw new Error('Patch anchor not found: legacy attendance test block');
  const replacement = `assert.equal(ROUTE_PERMISSION_IDS.attendance, 'route:attendance', 'Legacy Attendance route id must remain available during migration');\n\nconst teacherWithFullNormalAccess = {\n  id: 'teacher-all',\n  role: 'teacher',\n  permissions: createAllAccessPermissions(),\n};\nassert.equal(hasAnyAttendanceAccess(teacherWithFullNormalAccess), false,\n  'Full teacher access must not implicitly grant attendance');\nassert.equal(hasRouteAccess(teacherWithFullNormalAccess, 'attendance'), false,\n  'Teacher without an explicit attendance tab grant must not pass the attendance route guard');\n\nconst legacyPermissions = normalizePermissions({ mode: 'all', allowed: [ROUTE_PERMISSION_IDS.attendance] });\nfor (const permissionId of Object.values(ATTENDANCE_PERMISSION_IDS)) {\n  assert.equal(legacyPermissions.allowed.includes(permissionId), true, 'Legacy Attendance grant must expand to each granular tab permission');\n}\nconst legacyTeacher = { ...teacherWithFullNormalAccess, permissions: legacyPermissions };\nassert.equal(hasAnyAttendanceAccess(legacyTeacher), true);\nassert.equal(hasAttendanceTabAccess(legacyTeacher, 'quick'), true);\nassert.equal(hasRouteAccess(legacyTeacher, 'attendance'), true);\n\nconst admin = { id: 'admin', role: 'admin', permissions: createAllAccessPermissions() };\nassert.equal(hasRouteAccess(admin, 'attendance'), true, 'Admin must always retain attendance access');\nassert.match(attendance, /hasAttendanceTabAccess/, 'Attendance navigation must enforce granular tab permissions');\nassert.match(permissionMigration, /can_manage_extra_class_attendance/, 'Earlier database migration must retain the compatibility gate');\nassert.match(permissionMigration, /route:attendance/, 'Earlier database migration must still document the legacy Attendance permission');\n\n`;
  source = source.slice(0, start) + replacement + source.slice(end);
  write(path, source);
}

// 5) Supabase migration: data backfill, read/write gates, RLS and SECURITY DEFINER RPC guards.
{
  const path = 'supabase/migrations/20260908_granular_attendance_tab_permissions.sql';
  const sql = `-- 2026-09-08: split Attendance into five explicit per-tab permissions.\n-- Admins always keep all access. Legacy route:attendance grants are expanded to all five tabs.\n\n-- Backfill the previous coarse Attendance grant without changing unrelated permissions.\nupdate public.profiles p\nset permissions = jsonb_set(\n  coalesce(p.permissions, '{"mode":"all","allowed":[]}'::jsonb),\n  '{allowed}',\n  (\n    select coalesce(jsonb_agg(value order by value), '[]'::jsonb)\n    from (\n      select distinct value\n      from jsonb_array_elements_text(\n        (coalesce(p.permissions -> 'allowed', '[]'::jsonb) - 'route:attendance')\n        || '["attendance:quick","attendance:calendar","attendance:manage","attendance:history","attendance:report"]'::jsonb\n      ) as expanded(value)\n    ) deduped\n  ),\n  true\n)\nwhere coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance';\n\ncreate or replace function public.can_read_extra_class_attendance()\nreturns boolean\nlanguage sql\nstable\nsecurity definer\nset search_path = public\nas $$\n  select exists (\n    select 1\n    from public.profiles p\n    where p.id = auth.uid()\n      and p.approved = true\n      and (\n        lower(coalesce(p.role, '')) in ('admin', 'administrator')\n        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'\n        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ?| array[\n          'attendance:quick', 'attendance:calendar', 'attendance:manage', 'attendance:history', 'attendance:report'\n        ]\n      )\n  );\n$$;\n\ncreate or replace function public.can_take_extra_class_attendance()\nreturns boolean\nlanguage sql\nstable\nsecurity definer\nset search_path = public\nas $$\n  select exists (\n    select 1\n    from public.profiles p\n    where p.id = auth.uid()\n      and p.approved = true\n      and (\n        lower(coalesce(p.role, '')) in ('admin', 'administrator')\n        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'\n        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:quick'\n      )\n  );\n$$;\n\ncreate or replace function public.can_manage_extra_class_roster()\nreturns boolean\nlanguage sql\nstable\nsecurity definer\nset search_path = public\nas $$\n  select exists (\n    select 1\n    from public.profiles p\n    where p.id = auth.uid()\n      and p.approved = true\n      and (\n        lower(coalesce(p.role, '')) in ('admin', 'administrator')\n        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'\n        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:manage'\n      )\n  );\n$$;\n\n-- Compatibility helper used by existing read policies/callers.\ncreate or replace function public.can_manage_extra_class_attendance()\nreturns boolean\nlanguage sql\nstable\nsecurity definer\nset search_path = public\nas $$\n  select public.can_read_extra_class_attendance();\n$$;\n\nrevoke all on function public.can_read_extra_class_attendance() from public;\nrevoke all on function public.can_take_extra_class_attendance() from public;\nrevoke all on function public.can_manage_extra_class_roster() from public;\nrevoke all on function public.can_manage_extra_class_attendance() from public;\ngrant execute on function public.can_read_extra_class_attendance() to authenticated;\ngrant execute on function public.can_take_extra_class_attendance() to authenticated;\ngrant execute on function public.can_manage_extra_class_roster() to authenticated;\ngrant execute on function public.can_manage_extra_class_attendance() to authenticated;\n\n-- Read access is shared by the five Attendance surfaces because they consume the same class/session tables.\ndrop policy if exists "Extra attendance Admins read classes" on public.bes_extra_classes;\ncreate policy "Extra attendance Admins read classes" on public.bes_extra_classes for select using (public.can_read_extra_class_attendance());\ndrop policy if exists "Extra attendance Admins read members" on public.bes_extra_class_members;\ncreate policy "Extra attendance Admins read members" on public.bes_extra_class_members for select using (public.can_read_extra_class_attendance());\ndrop policy if exists "Extra attendance Admins read class teachers" on public.bes_extra_class_teachers;\ncreate policy "Extra attendance Admins read class teachers" on public.bes_extra_class_teachers for select using (public.can_read_extra_class_attendance());\ndrop policy if exists "Extra attendance Admins read sessions" on public.bes_extra_attendance_sessions;\ncreate policy "Extra attendance Admins read sessions" on public.bes_extra_attendance_sessions for select using (public.can_read_extra_class_attendance());\ndrop policy if exists "Extra attendance Admins read records" on public.bes_extra_attendance_records;\ncreate policy "Extra attendance Admins read records" on public.bes_extra_attendance_records for select using (public.can_read_extra_class_attendance());\n\n-- Direct roster writes belong only to the Quản lý lớp permission.\ndrop policy if exists "Extra attendance Admins insert classes" on public.bes_extra_classes;\ncreate policy "Extra attendance Admins insert classes" on public.bes_extra_classes for insert\n  with check (public.can_manage_extra_class_roster() and created_by = auth.uid() and updated_by = auth.uid());\ndrop policy if exists "Extra attendance Admins update classes" on public.bes_extra_classes;\ncreate policy "Extra attendance Admins update classes" on public.bes_extra_classes for update\n  using (public.can_manage_extra_class_roster())\n  with check (public.can_manage_extra_class_roster() and updated_by = auth.uid());\ndrop policy if exists "Extra attendance Admins insert members" on public.bes_extra_class_members;\ncreate policy "Extra attendance Admins insert members" on public.bes_extra_class_members for insert\n  with check (public.can_manage_extra_class_roster() and created_by = auth.uid() and updated_by = auth.uid());\ndrop policy if exists "Extra attendance Admins update members" on public.bes_extra_class_members;\ncreate policy "Extra attendance Admins update members" on public.bes_extra_class_members for update\n  using (public.can_manage_extra_class_roster())\n  with check (\n    public.can_manage_extra_class_roster()\n    and updated_by = auth.uid()\n    and (active = true or (left_at is not null and removed_by = auth.uid()))\n  );\n\n-- Preserve the existing RPC bodies exactly, replacing only their authorization gate.\ndo $granular$\ndeclare\n  v_definition text;\nbegin\n  -- bes_confirm_extra_class_attendance -> can_take_extra_class_attendance\n  select pg_get_functiondef('public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text)'::regprocedure) into v_definition;\n  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected confirm attendance function body'; end if;\n  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_take_extra_class_attendance()');\n\n  -- bes_cancel_extra_class_session -> can_take_extra_class_attendance\n  select pg_get_functiondef('public.bes_cancel_extra_class_session(uuid,date,text,text,text)'::regprocedure) into v_definition;\n  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected cancel attendance function body'; end if;\n  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_take_extra_class_attendance()');\n\n  -- bes_delete_extra_attendance_session -> can_take_extra_class_attendance\n  select pg_get_functiondef('public.bes_delete_extra_attendance_session(uuid)'::regprocedure) into v_definition;\n  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected delete attendance function body'; end if;\n  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_take_extra_class_attendance()');\n\n  -- bes_add_extra_class_teacher -> can_manage_extra_class_roster\n  select pg_get_functiondef('public.bes_add_extra_class_teacher(uuid,text)'::regprocedure) into v_definition;\n  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected add teacher function body'; end if;\n  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_manage_extra_class_roster()');\n\n  -- bes_create_extra_class_with_teachers -> can_manage_extra_class_roster\n  select pg_get_functiondef('public.bes_create_extra_class_with_teachers(text,text,text,text,text,text,text[])'::regprocedure) into v_definition;\n  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected create class function body'; end if;\n  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_manage_extra_class_roster()');\n\n  -- bes_delete_extra_class -> can_manage_extra_class_roster\n  select pg_get_functiondef('public.bes_delete_extra_class(uuid)'::regprocedure) into v_definition;\n  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected delete class function body'; end if;\n  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_manage_extra_class_roster()');\n\n  -- Teacher directory is read-only and can be used by any granted Attendance surface.\n  select pg_get_functiondef('public.bes_extra_attendance_list_teachers()'::regprocedure) into v_definition;\n  if position('public.can_manage_extra_class_attendance()' in v_definition) = 0 then raise exception 'Unexpected attendance teacher list function body'; end if;\n  execute replace(v_definition, 'public.can_manage_extra_class_attendance()', 'public.can_read_extra_class_attendance()');\nend\n$granular$;\n\n-- Keep SECURITY DEFINER Attendance RPCs unavailable to anonymous callers.\nrevoke all on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) from public;\nrevoke all on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) from public;\nrevoke all on function public.bes_delete_extra_attendance_session(uuid) from public;\nrevoke all on function public.bes_add_extra_class_teacher(uuid,text) from public;\nrevoke all on function public.bes_create_extra_class_with_teachers(text,text,text,text,text,text,text[]) from public;\nrevoke all on function public.bes_delete_extra_class(uuid) from public;\nrevoke all on function public.bes_extra_attendance_list_teachers() from public;\ngrant execute on function public.bes_confirm_extra_class_attendance(uuid,date,text,numeric,jsonb,text,text,text) to authenticated;\ngrant execute on function public.bes_cancel_extra_class_session(uuid,date,text,text,text) to authenticated;\ngrant execute on function public.bes_delete_extra_attendance_session(uuid) to authenticated;\ngrant execute on function public.bes_add_extra_class_teacher(uuid,text) to authenticated;\ngrant execute on function public.bes_create_extra_class_with_teachers(text,text,text,text,text,text,text[]) to authenticated;\ngrant execute on function public.bes_delete_extra_class(uuid) to authenticated;\ngrant execute on function public.bes_extra_attendance_list_teachers() to authenticated;\n`;
  write(path, sql);
}

// Remove this one-shot patch machinery from the resulting commit.
for (const path of [
  'scripts/apply-granular-attendance-permissions.mjs',
  '.github/workflows/apply-granular-attendance-permissions.yml',
]) {
  if (fs.existsSync(path)) fs.unlinkSync(path);
}

console.log('Applied granular Attendance permission implementation.');
