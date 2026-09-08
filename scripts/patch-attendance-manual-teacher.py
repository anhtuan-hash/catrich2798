from pathlib import Path

path = Path('src/components/GlobalAttendanceNavigationTab.jsx')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        "import './GlobalAttendanceDailyCalendar.css';\n",
        "import './GlobalAttendanceDailyCalendar.css';\nimport './GlobalAttendanceManualTeacher.css';\n",
    ),
    (
        "  const [showAddStudent, setShowAddStudent] = useState(false);\n  const fileRef = useRef(null);",
        "  const [showAddStudent, setShowAddStudent] = useState(false);\n  const [showAddTeacher, setShowAddTeacher] = useState(false);\n  const [newTeacherName, setNewTeacherName] = useState('');\n  const fileRef = useRef(null);",
    ),
    (
        """  function assignedTeachersForClass(classRow) {\n    const authoritative = teachersForGiftedAssignment({\n      sourceKey: classRow?.source_key,\n      subject: classRow?.subject,\n      gradeLevel: classRow?.grade_level,\n      className: classRow?.class_name,\n    });\n    if (authoritative.length) return authoritative;\n    const normalized = classTeacherNames.get(String(classRow?.id)) || [];\n    if (normalized.length) return normalized;\n    return String(classRow?.teacher_name || '').split(/\\s*,\\s*/).map((name) => name.trim()).filter(Boolean);\n  }""",
        """  function assignedTeachersForClass(classRow) {\n    const authoritative = teachersForGiftedAssignment({\n      sourceKey: classRow?.source_key,\n      subject: classRow?.subject,\n      gradeLevel: classRow?.grade_level,\n      className: classRow?.class_name,\n    });\n    const normalized = classTeacherNames.get(String(classRow?.id)) || [];\n    const fallback = String(classRow?.teacher_name || '').split(/\\s*,\\s*/).map((name) => name.trim()).filter(Boolean);\n    const merged = [];\n    [...authoritative, ...normalized, ...fallback].forEach((name) => {\n      const clean = String(name || '').trim();\n      if (clean && !merged.some((current) => fold(current) === fold(clean))) merged.push(clean);\n    });\n    return merged;\n  }""",
    ),
    (
        "  const selectedTeacherOptions = useMemo(() => assignedTeachersForClass(selectedClass), [selectedClass, classTeacherNames]);\n\n  async function loadDaySession",
        "  const selectedTeacherOptions = useMemo(() => assignedTeachersForClass(selectedClass), [selectedClass, classTeacherNames]);\n\n  useEffect(() => {\n    setShowAddTeacher(false);\n    setNewTeacherName('');\n  }, [selectedClassId]);\n\n  async function loadDaySession",
    ),
    (
        """  async function removeStudent(member) {""",
        """  async function addTeacher(event) {\n    event.preventDefault();\n    if (!selectedClass || busy || !client) return;\n    const teacherName = newTeacherName.trim();\n    if (!teacherName) {\n      setError('Vui lòng nhập họ tên giáo viên.');\n      return;\n    }\n    if (assignedTeachersForClass(selectedClass).some((name) => fold(name) === fold(teacherName))) {\n      setError(`${teacherName} đã có trong lớp ${selectedClass.class_name}.`);\n      return;\n    }\n    setBusy(true);\n    setError('');\n    setNotice('');\n    try {\n      const { error: teacherError } = await client.rpc('bes_add_extra_class_teacher', {\n        p_class_id: selectedClass.id,\n        p_teacher_name: teacherName,\n      });\n      if (teacherError) throw teacherError;\n      setNewTeacherName('');\n      setShowAddTeacher(false);\n      setNotice(`Đã thêm giáo viên ${teacherName} vào lớp ${selectedClass.class_name}.`);\n      await loadAll();\n    } catch (teacherError) {\n      setError(teacherError?.message || 'Không thể thêm giáo viên vào lớp.');\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function removeStudent(member) {""",
    ),
    (
        """<div className=\"attendance-teacher-field\"><label>Giáo viên theo phân công 2026–2027</label><strong>{teachersForClass(selectedClass)}</strong><small>Không lấy từ tài khoản đăng ký trên website.</small></div>""",
        """<div className=\"attendance-teacher-field\"><label>Giáo viên theo phân công 2026–2027</label><div className=\"attendance-teacher-summary\"><strong>{teachersForClass(selectedClass)}</strong><button type=\"button\" disabled={busy} onClick={() => setShowAddTeacher((value) => !value)}><Icon name=\"add\" size={15} />Thêm giáo viên</button></div>{showAddTeacher ? <form className=\"attendance-add-teacher\" onSubmit={addTeacher}><input value={newTeacherName} onChange={(event) => setNewTeacherName(event.target.value)} placeholder=\"Nhập họ tên giáo viên\" autoFocus /><button type=\"button\" disabled={busy} onClick={() => { setShowAddTeacher(false); setNewTeacherName(''); }}>Hủy</button><button type=\"submit\" disabled={busy || !newTeacherName.trim()}>{busy ? 'Đang lưu…' : 'Lưu'}</button></form> : null}</div>""",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one match, found {count}: {old[:100]!r}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Patched GlobalAttendanceNavigationTab.jsx')
