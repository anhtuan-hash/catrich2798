const WORKSPACE_DEFINITIONS = [
  {
    id: 'teaching', icon: 'TE', accent: '#EF7A42',
    label: 'Teaching', labelVi: 'Giảng dạy',
    description: 'Lesson planning, worksheets, grammar and classroom activities.',
    descriptionVi: 'Giáo án, worksheet, ngữ pháp và hoạt động lớp học.',
    landingTarget: '#/apps?workspace=teaching',
  },
  {
    id: 'assessment', icon: 'AS', accent: '#CC7621',
    label: 'Assessment', labelVi: 'Đánh giá',
    description: 'Question banks, tests and learner practice.',
    descriptionVi: 'Ngân hàng câu hỏi, đề thi và luyện tập.',
    landingTarget: '#/assessment-core',
  },
  {
    id: 'content', icon: 'CO', accent: '#167D78',
    label: 'Content & Skills', labelVi: 'Nội dung & Kĩ năng',
    description: 'Reading, writing, speaking, pronunciation, vocabulary and documents.',
    descriptionVi: 'Đọc, viết, nói, phát âm, từ vựng và xử lí văn bản.',
    landingTarget: '#/apps?workspace=content',
  },
  {
    id: 'management', icon: 'MG', accent: '#3B4CCA',
    label: 'Management', labelVi: 'Quản lí',
    description: 'Department, homeroom, tasks, collaboration and administration.',
    descriptionVi: 'Tổ chuyên môn, chủ nhiệm, công việc, cộng tác và quản trị.',
    landingTarget: '#/department',
  },
  {
    id: 'resources', icon: 'RE', accent: '#2878D0',
    label: 'Resources', labelVi: 'Học liệu',
    description: 'Libraries, shared resources, knowledge collections and news.',
    descriptionVi: 'Thư viện, học liệu dùng chung, bộ sưu tập và tin tức.',
    landingTarget: '#/library',
  },
  {
    id: 'ai', icon: 'AI', accent: '#6255D9',
    label: 'AI Studio', labelVi: 'Không gian AI',
    description: 'Provider governance, prompts and AI-assisted utilities.',
    descriptionVi: 'Quản trị nhà cung cấp, prompt và tiện ích AI.',
    landingTarget: '#/ai-governance',
  },
  {
    id: 'games', icon: 'GA', accent: '#5B2A86',
    label: 'Games & Classroom', labelVi: 'Trò chơi & Lớp học',
    description: 'Classroom games and learner participation.',
    descriptionVi: 'Trò chơi lớp học và hoạt động học sinh.',
    landingTarget: '#/games',
  },
  {
    id: 'system', icon: 'SY', accent: '#123C69',
    label: 'System', labelVi: 'Hệ thống',
    description: 'Settings, platform operations, governance, health and recovery.',
    descriptionVi: 'Cài đặt, vận hành nền tảng, quản trị, sức khỏe và khôi phục.',
    landingTarget: '#/settings',
  },
];

export const WORKSPACE_IDS = WORKSPACE_DEFINITIONS.map((item) => item.id);
export const WORKSPACE_MAP = new Map(WORKSPACE_DEFINITIONS.map((item) => [item.id, Object.freeze({ ...item })]));
export const WORKSPACES = Object.freeze(WORKSPACE_DEFINITIONS.map((item) => Object.freeze({ ...item })));

const ROUTE_WORKSPACE = {
  home: 'teaching', apps: 'teaching', 'content-ecosystem': 'teaching',
  'assessment-core': 'assessment', practice: 'assessment',
  news: 'resources', library: 'resources', 'resource-library': 'resources', 'knowledge-hub': 'resources', resources: 'resources',
  department: 'management', homeroom: 'management', 'homeroom-portal': 'management', 'work-hub': 'management', admin: 'management', 'collaboration-hub': 'management', 'ai-governance': 'ai',
  games: 'games',
  settings: 'system', qa: 'system', 'platform-readiness': 'system', 'automation-center': 'system', 'cloud-operations': 'system',
  'data-governance': 'system', 'production-hardening': 'system', trash: 'system', 'app-vault': 'system', setup: 'system', contact: 'system',
  login: 'system', register: 'system', tools: 'system',
};

const TOOL_WORKSPACE = {
  'lesson-plan-ai': 'teaching', 'worksheet-factory': 'teaching', 'textlab-activities': 'teaching',
  'english-lesson-integration': 'teaching', 'grammar-builder': 'teaching',
  'exam-studio': 'assessment', 'student-practice': 'assessment',
  'reading-studio': 'content', 'writing-studio': 'content', 'speaking-studio': 'content',
  'pronunciation-coach': 'content', word2graph: 'content', textcare: 'content',
  'department-workspace': 'management', 'work-hub': 'management',
  'resource-library-hub': 'resources', 'knowledge-hub': 'resources', 'news-reader': 'resources', 'smart-id': 'ai',
  'game-hub': 'games',
  'vietnam-tax': 'system', 'platform-readiness': 'system', 'automation-center': 'system',
  'cloud-operations': 'system', 'data-governance': 'system', 'production-hardening': 'system',
};

function cleanRoute(value = '') {
  return String(value || '').replace(/^#\//, '').split(/[?&]/)[0].trim();
}

export function getWorkspaceById(id) {
  return WORKSPACE_MAP.get(String(id || '').trim()) || WORKSPACE_MAP.get('teaching');
}

export function getWorkspaceLabel(id, language = 'vi') {
  const workspace = getWorkspaceById(id);
  return language === 'vi' ? workspace.labelVi : workspace.label;
}

export function getWorkspaceDescription(id, language = 'vi') {
  const workspace = getWorkspaceById(id);
  return language === 'vi' ? workspace.descriptionVi : workspace.description;
}

export function getWorkspaceLandingTarget(id) {
  return getWorkspaceById(id).landingTarget;
}

export function getWorkspaceFilterFromHash(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  const query = String(hash || '').split('?')[1] || '';
  const params = new URLSearchParams(query);
  const value = params.get('workspace') || '';
  return WORKSPACE_MAP.has(value) ? value : '';
}

export function resolveRouteWorkspaceId(route) {
  const clean = cleanRoute(route);
  if (clean === 'apps') return getWorkspaceFilterFromHash() || 'teaching';
  return ROUTE_WORKSPACE[clean] || 'teaching';
}

export function resolveToolWorkspaceId(tool) {
  const slug = typeof tool === 'string' ? tool : tool?.slug;
  if (!slug) return 'teaching';
  if (TOOL_WORKSPACE[slug]) return TOOL_WORKSPACE[slug];
  const group = String(typeof tool === 'object' ? tool?.group || tool?.groupVi || '' : '').toLowerCase();
  if (/assessment|đánh giá|analytics|phân tích/.test(group)) return 'assessment';
  if (/skill|language|vocabulary|document|kĩ năng|ngôn ngữ|từ vựng|văn bản/.test(group)) return 'content';
  if (/resource|library|học liệu|reading & news/.test(group)) return 'resources';
  if (/department|workflow|collaboration|management|quản lí|tổ chuyên môn|công việc|cộng tác/.test(group)) return 'management';
  if (/creative ai|không gian ai/.test(group)) return 'ai';
  if (/game|trò chơi/.test(group)) return 'games';
  if (/platform|operation|governance|utility|nền tảng|vận hành|quản trị|tiện ích/.test(group)) return 'system';
  return 'teaching';
}

export function resolveWorkspaceId({ route = '', selectedTool = null, target = '' } = {}) {
  const clean = cleanRoute(route || target);
  if (clean.startsWith('tool/')) return resolveToolWorkspaceId(selectedTool || clean.replace(/^tool\//, ''));
  if (selectedTool?.slug) return resolveToolWorkspaceId(selectedTool);
  return resolveRouteWorkspaceId(clean);
}

export function workspaceMatchesItem(workspaceId, item) {
  if (!workspaceId || !item) return true;
  return resolveToolWorkspaceId(item) === workspaceId;
}

export function getWorkspaceCatalog(language = 'vi') {
  return WORKSPACES.map((workspace) => ({
    ...workspace,
    displayLabel: language === 'vi' ? workspace.labelVi : workspace.label,
    displayDescription: language === 'vi' ? workspace.descriptionVi : workspace.description,
  }));
}
