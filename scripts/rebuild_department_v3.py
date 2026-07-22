from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'Missing pattern: {label}')
    return text.replace(old, new, 1)

root = Path(__file__).resolve().parents[1]

# DepartmentWorkspace integration
path = root / 'src/pages/DepartmentWorkspace.jsx'
text = path.read_text(encoding='utf-8')
text = replace_once(text,
    "import DepartmentWorkCenter from './department/DepartmentWorkCenter.jsx';\n",
    "import DepartmentWorkCenter from './department/DepartmentWorkCenter.jsx';\nimport DepartmentTeacherDirectory from './department/DepartmentTeacherDirectory.jsx';\n",
    'teacher directory import')
text = replace_once(text,
    "const NAV_ITEMS = [\n  ['overview', 'Tổng quan', 'home'],\n  ['schedule', 'Lịch & hoạt động', 'calendar'],\n  ['records', 'Hồ sơ & văn bản', 'folder'],\n  ['work', 'Trung tâm công việc', 'tasks'],\n];",
    "const NAV_ITEMS = [\n  ['overview', 'Tổng quan', 'home'],\n  ['schedule', 'Lịch & hoạt động', 'calendar'],\n  ['work', 'Trung tâm công việc', 'tasks'],\n  ['records', 'Hồ sơ & văn bản', 'folder'],\n  ['teachers', 'Danh sách giáo viên', 'users'],\n];",
    'navigation items')
text = replace_once(text,
    "    studentActivities: [],\n    lastUpdated: new Date().toISOString(),",
    "    studentActivities: [],\n    teachers: [],\n    lastUpdated: new Date().toISOString(),",
    'default teachers')
text = replace_once(text,
    "    studentActivities: toArray(source.studentActivities),\n  };",
    "    studentActivities: toArray(source.studentActivities),\n    teachers: toArray(source.teachers),\n  };",
    'normalize teachers')
text = replace_once(text,
    "  const [workCreateSignal, setWorkCreateSignal] = useState(0);\n",
    "  const [workCreateSignal, setWorkCreateSignal] = useState(0);\n  const [teacherCreateSignal, setTeacherCreateSignal] = useState(0);\n",
    'teacher create signal')
text = replace_once(text,
    "    records: 'Hồ sơ & văn bản',\n    work: 'Trung tâm công việc',\n",
    "    records: 'Hồ sơ & văn bản',\n    work: 'Trung tâm công việc',\n    teachers: 'Danh sách giáo viên',\n",
    'teacher page title')
text = replace_once(text,
    "    work: ['Giao việc', () => setWorkCreateSignal((value) => value + 1)],\n  }[activeSection] : null;",
    "    work: ['Giao việc', () => setWorkCreateSignal((value) => value + 1)],\n    teachers: ['Thêm giáo viên', () => setTeacherCreateSignal((value) => value + 1)],\n  }[activeSection] : null;",
    'teacher primary action')
text = replace_once(text,
    "<MetricCard tone=\"green\" icon=\"calendar\" label=\"Hoạt động 14 ngày tới\" value={upcoming.length} note={`${data.documents.length} hồ sơ đang lưu`} onClick={() => setActiveSection('schedule')}/>",
    "<MetricCard tone=\"green\" icon=\"calendar\" label=\"Hoạt động 14 ngày tới\" value={upcoming.length} note={`${data.documents.length} hồ sơ · ${data.teachers.length} giáo viên`} onClick={() => setActiveSection('schedule')}/>",
    'overview teacher count')
text = replace_once(text,
    "          {activeSection === 'records' ? renderRecords() : null}\n          {activeSection === 'work' ? <DepartmentWorkCenter currentUser={currentUser} schoolYear={data.schoolYear} semester={data.semester} globalQuery={globalQuery} createSignal={workCreateSignal} onSummaryChange={setWorkSummary}/> : null}\n",
    "          {activeSection === 'records' ? renderRecords() : null}\n          {activeSection === 'work' ? <DepartmentWorkCenter currentUser={currentUser} schoolYear={data.schoolYear} semester={data.semester} globalQuery={globalQuery} createSignal={workCreateSignal} onSummaryChange={setWorkSummary}/> : null}\n          {activeSection === 'teachers' ? <DepartmentTeacherDirectory teachers={data.teachers} onChange={(next) => commitData((current) => ({ ...current, teachers: next }))} canManage={canManage} currentUser={currentUser} globalQuery={globalQuery} createSignal={teacherCreateSignal} activities={activities} records={data.documents} onNotify={notify}/> : null}\n",
    'teacher section render')
path.write_text(text, encoding='utf-8')

# App metadata and permissions
path = root / 'src/data/department.js'
text = path.read_text(encoding='utf-8')
text = replace_once(text,
    "  desc: 'Manage department schedules, records, shared work, submissions and approvals without AI.',\n  descVi: 'Quản lý lịch hoạt động, hồ sơ, công việc dùng chung, sản phẩm nộp và phê duyệt của tổ mà không sử dụng AI.',\n  status: 'Subject leader',\n  statusVi: 'TTCM',\n  api: false,\n  featured: false,\n  hideFromLauncher: true,",
    "  desc: 'Run the English department through schedules, shared work, records, approvals and detailed teacher profiles.',\n  descVi: 'Điều hành lịch hoạt động, công việc, hồ sơ, phê duyệt và thông tin chi tiết giáo viên trong Tổ Tiếng Anh.',\n  status: '5 modules · Role-aware · No AI',\n  statusVi: '5 phân hệ · Theo vai trò · Không AI',\n  api: false,\n  featured: true,\n  hideFromLauncher: false,",
    'department app metadata')
text = replace_once(text,
    "  { id: 'department:work-hub', key: 'workHub', icon: 'WK', title: 'Department Work Center', titleVi: 'Trung tâm công việc', shortVi: 'Trung tâm công việc', short: 'Work center', desc: 'Use the shared Work Hub for assignment, submission, feedback, revision, approval and archiving.', descVi: 'Dùng chung Trung tâm công việc để giao việc, nộp sản phẩm, phản hồi, yêu cầu sửa, phê duyệt và lưu trữ.' },\n];",
    "  { id: 'department:work-hub', key: 'workHub', icon: 'WK', title: 'Department Work Center', titleVi: 'Trung tâm công việc', shortVi: 'Trung tâm công việc', short: 'Work center', desc: 'Use the shared Work Hub for assignment, submission, feedback, revision, approval and archiving.', descVi: 'Dùng chung Trung tâm công việc để giao việc, nộp sản phẩm, phản hồi, yêu cầu sửa, phê duyệt và lưu trữ.' },\n  { id: 'department:teachers', key: 'teachers', icon: 'GV', title: 'Teacher Directory', titleVi: 'Danh sách giáo viên', shortVi: 'Giáo viên', short: 'Teachers', desc: 'Manage teacher profiles, employment details, qualifications, assignments, evidence and privacy levels.', descVi: 'Quản lý hồ sơ giáo viên, thông tin công tác, trình độ, phân công, minh chứng và mức độ riêng tư.' },\n];",
    'teacher permission module')
path.write_text(text, encoding='utf-8')

# Retire only truly removed launcher IDs; make Department card visible again.
path = root / 'src/utils/launcherPreferences.js'
text = path.read_text(encoding='utf-8')
text = text.replace("  'department-workspace',\n  'tool:department-workspace',\n  'route:department',\n", '')
path.write_text(text, encoding='utf-8')

# Add icons used by the new module.
path = root / 'src/pages/department/DepartmentIcons.jsx'
text = path.read_text(encoding='utf-8')
text = replace_once(text,
    "  user: <><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/></>,\n",
    "  user: <><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/></>,\n  users: <><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 20a6 6 0 0 1 12 0\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M15 15a5 5 0 0 1 6 5\"/></>,\n  badge: <><path d=\"M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z\"/><path d=\"m9 12 2 2 4-5\"/></>,\n  award: <><circle cx=\"12\" cy=\"8\" r=\"5\"/><path d=\"m8.5 12-2 9 5.5-3 5.5 3-2-9\"/></>,\n",
    'teacher icons')
path.write_text(text, encoding='utf-8')

# Remove the temporary migration assets from the final branch.
for relative in ['scripts/rebuild_department_v3.py', '.github/workflows/department-v3-rebuild.yml']:
    target = root / relative
    if target.exists():
        target.unlink()

print('Department Workspace v3 integration complete.')
