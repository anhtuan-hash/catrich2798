from pathlib import Path

path = Path('src/components/GlobalTtcmNavigationTab.jsx')
source = path.read_text()


def replace_once(old, new, label):
    global source
    if old not in source:
        raise SystemExit(f'Missing patch anchor: {label}')
    source = source.replace(old, new, 1)


replace_once(
    "import { isDepartmentLeaderRole, normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';\n",
    "import { isDepartmentLeaderRole, normalizeSystemRole, SYSTEM_ROLES } from '../utils/roles.js';\nimport { buildTeacherHistory } from '../utils/ttcmTeacherHistory.js';\n",
    'history utility import',
)
replace_once(
    "import './GlobalTtcmPersonnel.css';\n",
    "import './GlobalTtcmPersonnel.css';\nimport './GlobalTtcmTeacherHistory.css';\n",
    'history css import',
)
replace_once(
    "  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14h18V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11Z',\n};",
    "  calendar: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14h18V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11Z',\n  history: 'M13 3a9 9 0 1 1-8.2 5.3L2 11V4h7L6.3 6.7A7 7 0 1 0 13 5v4h-2V3h2Zm-1 7h2v4.2l3 1.8-1 1.7-4-2.4V10Z',\n};",
    'history icon',
)
replace_once(
    "  const [people, setPeople] = useState([]);\n  const [readIds, setReadIds] = useState(() => readReadIds(currentUser));",
    "  const [people, setPeople] = useState([]);\n  const [historyTeacherId, setHistoryTeacherId] = useState('');\n  const [historyQuery, setHistoryQuery] = useState('');\n  const [readIds, setReadIds] = useState(() => readReadIds(currentUser));",
    'history state',
)
replace_once(
    "      const nextView = ['schedule', 'personnel'].includes(requestedView) ? requestedView : 'feed';",
    "      const nextView = ['schedule', 'personnel', 'history'].includes(requestedView) ? requestedView : 'feed';",
    'external history view',
)
replace_once(
    "  const visibleRecipients = useMemo(() => {\n    const needle = recipientQuery.trim().toLowerCase(); if (!needle) return departmentRecipients;\n    return departmentRecipients.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(needle));\n  }, [departmentRecipients, recipientQuery]);\n\n  const unseenCount = useMemo(() => items.filter((item) => userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id))).length, [currentUser?.id, items, readIds]);",
    "  const visibleRecipients = useMemo(() => {\n    const needle = recipientQuery.trim().toLowerCase(); if (!needle) return departmentRecipients;\n    return departmentRecipients.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(needle));\n  }, [departmentRecipients, recipientQuery]);\n\n  useEffect(() => {\n    if (!manager) return;\n    if (!departmentTeachers.length) { if (historyTeacherId) setHistoryTeacherId(''); return; }\n    if (!departmentTeachers.some((person) => String(person.id) === String(historyTeacherId))) {\n      setHistoryTeacherId(String(departmentTeachers[0].id));\n    }\n  }, [departmentTeachers, historyTeacherId, manager]);\n\n  const historyTeacher = useMemo(() => departmentTeachers.find((person) => String(person.id) === String(historyTeacherId)) || null, [departmentTeachers, historyTeacherId]);\n  const teacherHistory = useMemo(() => buildTeacherHistory({ items, responses, teacherId: historyTeacherId }), [historyTeacherId, items, responses]);\n  const historyNeedle = historyQuery.trim().toLowerCase();\n  const visibleHistoryTimeline = useMemo(() => {\n    if (!historyNeedle) return teacherHistory.timeline;\n    return teacherHistory.timeline.filter((entry) => `${entry.label} ${entry.itemTitle} ${entry.itemType} ${entry.body}`.toLowerCase().includes(historyNeedle));\n  }, [historyNeedle, teacherHistory.timeline]);\n  const visibleHistoryFiles = useMemo(() => {\n    if (!historyNeedle) return teacherHistory.files;\n    return teacherHistory.files.filter((file) => `${file.name || ''} ${file.itemTitle || ''} ${file.itemType || ''}`.toLowerCase().includes(historyNeedle));\n  }, [historyNeedle, teacherHistory.files]);\n\n  const unseenCount = useMemo(() => items.filter((item) => userIsAssignee(item, currentUser?.id) && !readIds.has(String(item.id))).length, [currentUser?.id, items, readIds]);",
    'history derived data',
)
replace_once(
    "            <button type=\"button\" className=\"ttcm-m3-icon-button\" onClick={() => loadFeed()} title=\"Làm mới\" aria-label=\"Làm mới\"><Icon name=\"refresh\" /></button>",
    "            <button type=\"button\" className=\"ttcm-m3-icon-button\" onClick={() => { loadFeed(); if (manager && workspaceView === 'history') { loadPeople(); loadResponses(); } }} title=\"Làm mới\" aria-label=\"Làm mới\"><Icon name=\"refresh\" /></button>",
    'history refresh',
)
replace_once(
    "            <button type=\"button\" className={workspaceView === 'personnel' ? 'is-selected' : ''} onClick={() => setWorkspaceView('personnel')}><Icon name=\"people\" size={18} />Nhân sự</button>\n",
    "            <button type=\"button\" className={workspaceView === 'personnel' ? 'is-selected' : ''} onClick={() => setWorkspaceView('personnel')}><Icon name=\"people\" size={18} />Nhân sự</button>\n            {manager ? <button type=\"button\" className={workspaceView === 'history' ? 'is-selected' : ''} onClick={() => { setWorkspaceView('history'); loadPeople(); loadResponses(); }}><Icon name=\"history\" size={18} />Lịch sử & File GV</button> : null}\n",
    'history tab',
)

history_branch = """          : workspaceView === 'history' && manager ? (
            <main className=\"ttcm-history-view\" role=\"tabpanel\" aria-label=\"Lịch sử và file giáo viên\">
              <section className=\"ttcm-history-toolbar\">
                <div className=\"ttcm-history-toolbar-copy\"><strong>Hồ sơ hoạt động giáo viên</strong><span>Theo dõi toàn bộ phản hồi, xác nhận và tệp giáo viên đã gửi cho TTCM.</span></div>
                <div className=\"ttcm-history-controls\">
                  <label className=\"ttcm-history-field\"><span>Giáo viên</span><select value={historyTeacherId} onChange={(event) => { setHistoryTeacherId(event.target.value); setHistoryQuery(''); }}><option value=\"\">Chọn giáo viên</option>{departmentTeachers.map((person) => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select></label>
                  {historyTeacher ? <div className=\"ttcm-history-teacher\"><span className=\"ttcm-history-avatar\">{String(historyTeacher.name || 'GV').trim().split(/\\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase()}</span><div><b>{historyTeacher.name}</b><small>{historyTeacher.email || 'Giáo viên tổ chuyên môn'}</small></div></div> : null}
                </div>
              </section>

              <section className=\"ttcm-history-stats\" aria-label=\"Tổng quan hoạt động\">
                <article className=\"ttcm-history-stat\"><span>Lượt hoạt động</span><strong>{teacherHistory.summary.activityCount}</strong><small>Phản hồi / xác nhận đã ghi nhận</small></article>
                <article className=\"ttcm-history-stat\"><span>Nội dung đã tham gia</span><strong>{teacherHistory.summary.itemCount}</strong><small>Yêu cầu TTCM có tương tác</small></article>
                <article className=\"ttcm-history-stat\"><span>File đã nộp</span><strong>{teacherHistory.summary.fileCount}</strong><small>Giữ đủ các lần nộp, không ghi đè lịch sử</small></article>
                <article className=\"ttcm-history-stat\"><span>Hoạt động gần nhất</span><strong>{teacherHistory.summary.latestAt ? formatDate(teacherHistory.summary.latestAt) : '—'}</strong><small>{teacherHistory.summary.latestAt ? formatFullDate(teacherHistory.summary.latestAt) : 'Chưa có dữ liệu'}</small></article>
              </section>

              <section className=\"ttcm-history-grid\">
                <article className=\"ttcm-history-panel\">
                  <header><div><strong>Lịch sử hoạt động</strong><small>{visibleHistoryTimeline.length} sự kiện</small></div></header>
                  {historyTeacherId && visibleHistoryTimeline.length ? <div className=\"ttcm-history-timeline\">{visibleHistoryTimeline.map((entry) => <div className=\"ttcm-history-event\" key={entry.id}><span className=\"ttcm-history-event-dot\" /><div className=\"ttcm-history-event-card\"><header><b>{entry.label}</b><time>{formatDate(entry.createdAt)}</time></header><h4>{entry.itemTitle}</h4>{entry.body ? <p>{entry.body}</p> : null}<div className=\"ttcm-history-event-meta\"><span className=\"ttcm-history-chip\">{entry.itemType}</span><span className=\"ttcm-history-chip\">Lần phản hồi {entry.submissionIndex}</span>{entry.attachmentCount ? <span className=\"ttcm-history-chip is-file\">{entry.attachmentCount} file</span> : null}</div></div></div>)}</div> : <div className=\"ttcm-history-empty\"><Icon name=\"history\" size={30} /><strong>{historyTeacherId ? 'Chưa có hoạt động phù hợp' : 'Chọn giáo viên để xem lịch sử'}</strong><span>{historyTeacherId ? 'Các phản hồi, xác nhận và lần nộp tệp mới sẽ tự động xuất hiện tại đây.' : 'TTCM có thể chọn từng giáo viên trong tổ để xem hồ sơ hoạt động.'}</span></div>}
                </article>

                <article className=\"ttcm-history-panel\">
                  <header><div><strong>Danh sách file đã nộp</strong><small>{visibleHistoryFiles.length}/{teacherHistory.summary.fileCount} file</small></div><input className=\"ttcm-history-search\" type=\"search\" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder=\"Tìm file hoặc nội dung TTCM…\" aria-label=\"Tìm file giáo viên đã nộp\" /></header>
                  {historyTeacherId && visibleHistoryFiles.length ? <div className=\"ttcm-history-files\"><table className=\"ttcm-history-table\"><thead><tr><th>File</th><th>Nội dung TTCM</th><th>Ngày nộp</th><th>Lần nộp</th><th>Thao tác</th></tr></thead><tbody>{visibleHistoryFiles.map((file) => { const ext = getWorkHubAttachmentExtension(file); const relatedItem = items.find((item) => String(item.id) === String(file.itemId)) || { id: file.itemId, title: file.itemTitle }; return <tr key={file.id}><td><div className=\"ttcm-history-file-name\"><span className=\"ttcm-history-file-badge\">{ext ? ext.slice(0, 4).toUpperCase() : 'FILE'}</span><div><b title={file.name}>{file.name || 'Tệp đính kèm'}</b><small>{[ext ? ext.toUpperCase() : '', formatFileSize(file.size)].filter(Boolean).join(' · ') || 'Tệp TTCM'}</small></div></div></td><td><b>{file.itemTitle}</b><br /><small>{file.itemType}</small></td><td>{formatFullDate(file.submittedAt) || '—'}</td><td><span className=\"ttcm-history-round\">Lần {file.submissionIndex}</span></td><td><div className=\"ttcm-history-actions\"><button type=\"button\" onClick={() => previewAttachment(relatedItem, file)} title=\"Xem trước\" aria-label={`Xem ${file.name || 'tệp'}`}><Icon name=\"eye\" size={17} /></button><button type=\"button\" onClick={() => downloadAttachment(relatedItem, file)} title=\"Tải về\" aria-label={`Tải ${file.name || 'tệp'}`}><Icon name=\"download\" size={17} /></button></div></td></tr>; })}</tbody></table></div> : <div className=\"ttcm-history-empty\"><Icon name=\"folder\" size={30} /><strong>{historyTeacherId ? (historyQuery ? 'Không tìm thấy file phù hợp' : 'Giáo viên chưa nộp file') : 'Chưa chọn giáo viên'}</strong><span>Toàn bộ tệp đính kèm trong các lần phản hồi TTCM sẽ được tập hợp ở đây và vẫn giữ riêng từng lần nộp.</span></div>}
                </article>
              </section>
            </main>
          )
"""
personnel_branch = '          : <main className="ttcm-m3-personnel-view" role="tabpanel" aria-label="Nhân sự tổ chuyên môn"><PersonnelLookup currentUser={currentUser} language={language} /></main>}'
if personnel_branch not in source:
    raise SystemExit('Missing patch anchor: personnel branch')
source = source.replace(personnel_branch, history_branch + personnel_branch, 1)

path.write_text(source)
