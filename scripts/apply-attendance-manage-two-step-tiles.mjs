import fs from 'node:fs';

const fileUrl = new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url);
let source = fs.readFileSync(fileUrl, 'utf8');

const oldImport = "import AttendanceClassEditor from './attendance/AttendanceClassEditor.jsx';";
const newImport = "import AttendanceClassManagementWorkspace from './attendance/AttendanceClassManagementWorkspace.jsx';";
if (source.includes(oldImport)) source = source.replace(oldImport, newImport);

const startMarker = "          {!loading && canAccessAttendanceView('manage') && view === 'manage' ? (";
const endMarker = "\n\n          {!loading && canAccessAttendanceView('report') && view === 'report' ?";
const startIndex = source.indexOf(startMarker);
const endIndex = source.indexOf(endMarker, startIndex);

if (startIndex < 0) {
  if (source.includes('<AttendanceClassManagementWorkspace')) {
    console.log('Attendance class management workspace already wired.');
    process.exit(0);
  }
  throw new Error('Could not locate the existing manage-view block.');
}
if (endIndex < 0) throw new Error('Could not locate the report-view marker after manage view.');

const replacement = `          {!loading && canAccessAttendanceView('manage') && view === 'manage' ? (\n            <AttendanceClassManagementWorkspace\n              activeClasses={activeClasses}\n              selectedClass={selectedClass}\n              selectedClassId={selectedClassId}\n              allSelectedMembers={allSelectedMembers}\n              filteredManagementMembers={filteredManagementMembers}\n              memberCounts={memberCounts}\n              teachersForClass={teachersForClass}\n              busy={busy}\n              fileRef={fileRef}\n              importExcel={importExcel}\n              importReport={importReport}\n              memberQuery={memberQuery}\n              setMemberQuery={setMemberQuery}\n              showAddStudent={showAddStudent}\n              setShowAddStudent={setShowAddStudent}\n              addForm={addForm}\n              setAddForm={setAddForm}\n              addStudent={addStudent}\n              showAddTeacher={showAddTeacher}\n              setShowAddTeacher={setShowAddTeacher}\n              newTeacherName={newTeacherName}\n              setNewTeacherName={setNewTeacherName}\n              addTeacher={addTeacher}\n              deleteClass={deleteClass}\n              client={client}\n              isAdmin={isAttendanceAdmin}\n              canManageMembers={canAccessAttendanceView('manage')}\n              removeStudent={removeStudent}\n              loadAll={loadAll}\n              setError={setError}\n              setNotice={setNotice}\n              onSelectClass={setSelectedClassId}\n            />\n          ) : null}`;

source = `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`;
fs.writeFileSync(fileUrl, source);
console.log('Wired direct React two-step Attendance class management workspace.');
