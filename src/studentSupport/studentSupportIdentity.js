const VALID_TABS = new Set(['overview','alerts','student','cases','observations','rules','reports']);

function clean(value) {
  return String(value || '').trim();
}

export function normalizeStudentRef(student = {}) {
  const direct = clean(student.studentRef || student.student_ref || student.ref);
  if (direct) return direct;
  const code = clean(student.code || student.studentCode || student.student_code);
  return code ? `code:${code}` : '';
}

export function buildStudentSupportHash({ studentRef = '', workspaceId = '', tab = 'overview' } = {}) {
  const params = new URLSearchParams();
  const ref = clean(studentRef);
  const workspace = clean(workspaceId);
  const normalizedTab = VALID_TABS.has(clean(tab)) ? clean(tab) : 'overview';
  if (ref) params.set('student', ref);
  if (workspace) params.set('workspace', workspace);
  if (normalizedTab !== 'overview') params.set('tab', normalizedTab);
  const query = params.toString();
  return `#/student-support${query ? `?${query}` : ''}`;
}

export function parseStudentSupportHash(hash = '') {
  const raw = clean(hash);
  const [pathPart, queryPart = ''] = raw.replace(/^#/, '').split('?');
  if (pathPart !== '/student-support') return { studentRef: '', workspaceId: '', tab: 'overview' };
  const params = new URLSearchParams(queryPart);
  const tabValue = clean(params.get('tab'));
  return {
    studentRef: clean(params.get('student')),
    workspaceId: clean(params.get('workspace')),
    tab: VALID_TABS.has(tabValue) ? tabValue : 'overview',
  };
}
