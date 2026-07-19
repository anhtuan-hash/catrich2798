#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path.cwd()

def read(rel):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f"❌ Thiếu file bắt buộc: {rel}")
    return path.read_text(encoding="utf-8")

def write(rel, text):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

def insert_after(text, anchor, insertion, label):
    if insertion.strip() in text:
        return text
    if anchor not in text:
        raise SystemExit(f"❌ Không tìm thấy vị trí chèn {label}.")
    return text.replace(anchor, anchor + insertion, 1)

# main.jsx
main = read("src/main.jsx")
if "const WorkDashboard = lazy" not in main:
    anchors = [
        "const WorkHub = lazy(() => import('./pages/WorkHub.jsx'));",
        "const KnowledgeHub = lazy(() => import('./pages/KnowledgeHub.jsx'));",
    ]
    anchor = next((item for item in anchors if item in main), None)
    if not anchor:
        raise SystemExit("❌ Không tìm thấy vùng lazy route trong src/main.jsx.")
    main = main.replace(anchor, anchor + "\nconst WorkDashboard = lazy(() => import('./pages/WorkDashboard.jsx'));", 1)

if "'dashboard'" not in main.split("const PUBLIC_ROUTES", 1)[0]:
    route_anchor = "const ROUTES = ["
    start = main.find(route_anchor)
    end = main.find("];", start)
    if start < 0 or end < 0:
        raise SystemExit("❌ Không tìm thấy ROUTES trong src/main.jsx.")
    route_block = main[start:end]
    preferred = "'knowledge-hub',"
    if preferred in route_block:
        route_block = route_block.replace(preferred, preferred + " 'dashboard',", 1)
    else:
        route_block = route_block.replace("'apps',", "'apps', 'dashboard',", 1)
    main = main[:start] + route_block + main[end:]

if "dashboard: { accent: '#315FC4'" not in main:
    anchor = "  'knowledge-hub': { accent: '#315FC4', soft: '#EAF0FF', ink: '#10264A' },"
    if anchor in main:
        main = main.replace(anchor, anchor + "\n  dashboard: { accent: '#315FC4', soft: '#EAF3FF', ink: '#10264A' },", 1)
    else:
        marker = "const ROUTE_DESIGN_PROFILES = {"
        main = main.replace(marker, marker + "\n  dashboard: { accent: '#315FC4', soft: '#EAF3FF', ink: '#10264A' },", 1)

if "dashboard: ['Work Dashboard', 'Bảng điều hành']" not in main:
    route_title_anchor = "'work-hub': ['Unified Work Hub', 'Trung tâm công việc']"
    if route_title_anchor in main:
        main = main.replace(route_title_anchor, "dashboard: ['Work Dashboard', 'Bảng điều hành'],\n      " + route_title_anchor, 1)
    else:
        main = main.replace("const routeTitles = {", "const routeTitles = {\n      dashboard: ['Work Dashboard', 'Bảng điều hành'],", 1)

if "currentRoute === 'dashboard'" not in main:
    render_anchors = [
        "          {canAccessRoute && currentRoute === 'work-hub' && currentUser && <WorkHub {...context} />}",
        "          {canAccessRoute && currentRoute === 'knowledge-hub' && currentUser && <KnowledgeHub {...context} />}",
    ]
    anchor = next((item for item in render_anchors if item in main), None)
    if not anchor:
        raise SystemExit("❌ Không tìm thấy vùng render route trong src/main.jsx.")
    block = "          {canAccessRoute && currentRoute === 'dashboard' && currentUser && <WorkDashboard {...context} />}\n"
    main = main.replace(anchor, block + anchor, 1)

write("src/main.jsx", main)

# apps.js
apps = read("src/data/apps.js")
if "slug: 'work-dashboard'" not in apps:
    card = """
  {
    slug: 'work-dashboard', route: 'dashboard', icon: 'DB', tone: 'blue', group: 'Management', groupVi: 'Quản lý',
    title: 'Work Dashboard', titleVi: 'Bảng điều hành',
    desc: 'Combine schedules, action items, professional activities, approvals and department health in one role-aware dashboard.',
    descVi: 'Tổng hợp lịch làm việc, việc cần xử lý, hoạt động chuyên môn, phê duyệt và tình hình tổ theo đúng vai trò.',
    status: 'Realtime · Role-aware · 14-day view', statusVi: 'Realtime · Theo vai trò · 14 ngày', api: true, featured: true,
  },
"""
    anchor = "export const APPS = ["
    if anchor not in apps:
        raise SystemExit("❌ Không tìm thấy APPS trong src/data/apps.js.")
    department_anchor = "  DEPARTMENT_APP,"
    if department_anchor in apps:
        apps = apps.replace(department_anchor, department_anchor + "\n" + card, 1)
    else:
        apps = apps.replace(anchor, anchor + "\n" + card, 1)
write("src/data/apps.js", apps)

# permissions.js
permissions = read("src/utils/permissions.js")
if "dashboard: 'route:dashboard'" not in permissions:
    anchor = "  'work-hub': 'route:work-hub',"
    if anchor not in permissions:
        raise SystemExit("❌ Không tìm thấy ROUTE_PERMISSION_IDS work-hub.")
    permissions = permissions.replace(anchor, "  dashboard: 'route:dashboard',\n" + anchor, 1)

if "title: 'Work Dashboard'" not in permissions:
    anchor = """  {
    id: ROUTE_PERMISSION_IDS['work-hub'],
"""
    item = """  {
    id: ROUTE_PERMISSION_IDS.dashboard,
    type: 'content',
    section: 'content',
    title: 'Work Dashboard',
    titleVi: 'Bảng điều hành',
    desc: 'View role-aware schedules, action items, approvals and department summaries.',
    descVi: 'Xem lịch, việc cần xử lý, phê duyệt và tổng hợp tổ chuyên môn theo vai trò.',
  },
"""
    if anchor not in permissions:
        raise SystemExit("❌ Không tìm thấy permission Work Hub.")
    permissions = permissions.replace(anchor, item + anchor, 1)

if "if (route === 'dashboard') return Boolean(user);" not in permissions:
    anchor = "  if (route === 'news') return Boolean(user);"
    if anchor not in permissions:
        raise SystemExit("❌ Không tìm thấy hasRouteAccess news.")
    permissions = permissions.replace(anchor, anchor + "\n  if (route === 'dashboard') return Boolean(user);", 1)

# Add dashboard to getRoutePermissionId without touching unrelated logic.
get_route_start = permissions.find("export function getRoutePermissionId")
get_route_end = permissions.find("export function hasRouteAccess", get_route_start)
if get_route_start >= 0 and get_route_end >= 0:
    block = permissions[get_route_start:get_route_end]
    if "route === 'dashboard'" not in block:
        needle = "if (route === 'library'"
        if needle in block:
            block = block.replace(needle, "if (route === 'dashboard' || route === 'library'", 1)
        else:
            block = block.replace("{\n", "{\n  if (route === 'dashboard') return ROUTE_PERMISSION_IDS.dashboard;\n", 1)
        permissions = permissions[:get_route_start] + block + permissions[get_route_end:]
write("src/utils/permissions.js", permissions)

# Command Palette
palette = read("src/components/GlobalCommandPalette.jsx")
if "{ route: 'dashboard'" not in palette:
    anchor = "  { route: 'department', vi: 'Tổ chuyên môn', en: 'Department', icon: '▦', color: '#3B4CCA' },"
    item = "  { route: 'dashboard', vi: 'Bảng điều hành', en: 'Work Dashboard', icon: 'DB', color: '#315FC4' },\n"
    if anchor in palette:
        palette = palette.replace(anchor, item + anchor, 1)
    else:
        palette = palette.replace("const ROUTES = [", "const ROUTES = [\n" + item, 1)
write("src/components/GlobalCommandPalette.jsx", palette)

# Global navigation registry
navigation = read("src/components/GlobalFlatNavigation.jsx")
if "dashboard: 'Bảng điều hành'" not in navigation:
    navigation = navigation.replace("games: 'Trò chơi', department:", "games: 'Trò chơi', dashboard: 'Bảng điều hành', department:", 1)
if "dashboard: 'Dashboard'" not in navigation:
    navigation = navigation.replace("games: 'Games', department:", "games: 'Games', dashboard: 'Dashboard', department:", 1)
if "dashboard: '#315fc4'" not in navigation:
    navigation = navigation.replace("games: '#5b2a86', department:", "games: '#5b2a86', dashboard: '#315fc4', department:", 1)
if "dashboard: 'DB'" not in navigation:
    navigation = navigation.replace("games: '◈', department:", "games: '◈', dashboard: 'DB', department:", 1)
route_keys_start = navigation.find("const ROUTE_KEYS = [")
route_keys_end = navigation.find("];", route_keys_start)
if route_keys_start >= 0 and route_keys_end >= 0:
    block = navigation[route_keys_start:route_keys_end]
    if "'dashboard'" not in block:
        block = block.replace("'games',", "'games', 'dashboard',", 1)
        navigation = navigation[:route_keys_start] + block + navigation[route_keys_end:]
write("src/components/GlobalFlatNavigation.jsx", navigation)

# Workspace tabs label — optional because some V11.6.7 installations
# intentionally removed the recent/open-app tabs component.
workspace_tabs_path = ROOT / "src/components/WorkspaceTabs.jsx"
if workspace_tabs_path.exists():
    tabs = workspace_tabs_path.read_text(encoding="utf-8")
    if "dashboard: ['Dashboard', 'Bảng điều hành']" not in tabs:
        anchor = "home: ['Home', 'Trang chủ'], apps: ['Apps', 'Ứng dụng'],"
        if anchor in tabs:
            tabs = tabs.replace(anchor, anchor + " dashboard: ['Dashboard', 'Bảng điều hành'],", 1)
        else:
            tabs = tabs.replace("const labels = {", "const labels = {\n    dashboard: ['Dashboard', 'Bảng điều hành'],", 1)
    workspace_tabs_path.write_text(tabs, encoding="utf-8")
    print("✓ Đã bổ sung nhãn Dashboard vào Workspace Tabs.")
else:
    print("ℹ️ WorkspaceTabs.jsx không tồn tại — bỏ qua vì thanh ứng dụng gần đây đã được xoá.")

# Department deep link
department = read("src/pages/DepartmentWorkspace.jsx")
if "bes-dashboard-department-tab" not in department:
    anchor = "  const [activeTab, setActiveTab] = useState('dashboard');"
    block = """  const [activeTab, setActiveTab] = useState('dashboard');
  useEffect(() => {
    try {
      const requestedTab = sessionStorage.getItem('bes-dashboard-department-tab') || '';
      if (!requestedTab) return;
      sessionStorage.removeItem('bes-dashboard-department-tab');
      setActiveTab(requestedTab);
    } catch {
      // Dashboard deep-link hints are optional.
    }
  }, []);"""
    if anchor not in department:
        raise SystemExit("❌ Không tìm thấy activeTab trong DepartmentWorkspace.jsx.")
    department = department.replace(anchor, block, 1)
write("src/pages/DepartmentWorkspace.jsx", department)

# Design profile
profiles = read("src/data/designProfiles.js")
if "'work-dashboard':" not in profiles:
    marker = "export const APP_DESIGN_PROFILES = {"
    item = """
  'work-dashboard': {
    accent: '#315FC4',
    soft: '#EAF3FF',
    ink: '#10264A',
    icon: 'dashboard',
    style: 'Role-aware operations dashboard',
    styleVi: 'Bảng điều hành theo vai trò',
  },
"""
    if marker not in profiles:
        raise SystemExit("❌ Không tìm thấy APP_DESIGN_PROFILES.")
    profiles = profiles.replace(marker, marker + item, 1)
write("src/data/designProfiles.js", profiles)

# Package audit command
package_path = ROOT / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
package.setdefault("scripts", {})["audit:work-dashboard"] = "node scripts/audit-work-dashboard-v11.6.7.mjs"
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("✅ Đã nối Bảng điều hành vào route, Apps, Launcher, Command Palette và phân quyền.")
