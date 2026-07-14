export const UI_LAYOUTS = Object.freeze({
  launch: 'launch',
  workbench: 'workbench',
  editor: 'editor',
  management: 'management',
  library: 'library',
  settings: 'settings',
  auth: 'auth',
  public: 'public',
});

const ROUTE_LAYOUTS = Object.freeze({
  home: UI_LAYOUTS.launch,
  apps: UI_LAYOUTS.launch,
  games: UI_LAYOUTS.launch,
  tools: UI_LAYOUTS.launch,
  resources: UI_LAYOUTS.launch,
  'app-vault': UI_LAYOUTS.launch,

  news: UI_LAYOUTS.editor,
  'ai-workspace': UI_LAYOUTS.workbench,
  'content-factory': UI_LAYOUTS.workbench,
  'content-ecosystem': UI_LAYOUTS.workbench,
  'lesson-pack': UI_LAYOUTS.workbench,
  'classroom-delivery': UI_LAYOUTS.workbench,
  'assessment-core': UI_LAYOUTS.workbench,
  practice: UI_LAYOUTS.workbench,

  department: UI_LAYOUTS.management,
  homeroom: UI_LAYOUTS.management,
  'homeroom-portal': UI_LAYOUTS.management,
  'work-hub': UI_LAYOUTS.management,
  'learning-intelligence': UI_LAYOUTS.management,
  'platform-readiness': UI_LAYOUTS.management,
  'automation-center': UI_LAYOUTS.management,
  'cloud-operations': UI_LAYOUTS.management,
  'collaboration-hub': UI_LAYOUTS.management,
  'data-governance': UI_LAYOUTS.management,
  'production-hardening': UI_LAYOUTS.management,
  'ai-governance': UI_LAYOUTS.management,
  admin: UI_LAYOUTS.management,
  qa: UI_LAYOUTS.management,

  library: UI_LAYOUTS.library,
  'resource-library': UI_LAYOUTS.library,
  'knowledge-hub': UI_LAYOUTS.library,
  trash: UI_LAYOUTS.library,

  settings: UI_LAYOUTS.settings,
  contact: UI_LAYOUTS.public,
  login: UI_LAYOUTS.auth,
  register: UI_LAYOUTS.auth,
  setup: UI_LAYOUTS.auth,
  'classroom-join': UI_LAYOUTS.public,
});

const TOOL_LAYOUTS = Object.freeze({
  'lesson-architect': UI_LAYOUTS.editor,
  'writing-studio': UI_LAYOUTS.editor,
  'textcare-fixer': UI_LAYOUTS.editor,
  'reading-studio': UI_LAYOUTS.editor,
  'grammar-builder': UI_LAYOUTS.workbench,
  'worksheet-factory': UI_LAYOUTS.workbench,
  'exam-studio': UI_LAYOUTS.workbench,
  'activity-studio': UI_LAYOUTS.workbench,
  'pronunciation-coach': UI_LAYOUTS.workbench,
  'speaking-studio': UI_LAYOUTS.workbench,
  'wordgraph-studio': UI_LAYOUTS.workbench,
  'english-lesson-integration': UI_LAYOUTS.workbench,
});

export function getUiLayout(route = 'home', selectedTool = null) {
  if (route === 'tool') {
    return TOOL_LAYOUTS[selectedTool?.slug] || UI_LAYOUTS.workbench;
  }
  return ROUTE_LAYOUTS[route] || UI_LAYOUTS.workbench;
}

export function getUiLayoutContract(layout) {
  const contracts = {
    [UI_LAYOUTS.launch]: ['page-header', 'filters', 'app-collection', 'context-actions'],
    [UI_LAYOUTS.workbench]: ['app-header', 'context-metrics', 'workflow', 'workspace', 'inspector'],
    [UI_LAYOUTS.editor]: ['editor-toolbar', 'document', 'inspector', 'version-export'],
    [UI_LAYOUTS.management]: ['command-header', 'summary-metrics', 'section-navigation', 'data-view', 'audit'],
    [UI_LAYOUTS.library]: ['category-navigation', 'search-filters', 'content-view', 'preview', 'metadata'],
    [UI_LAYOUTS.settings]: ['settings-navigation', 'groups', 'preview', 'save-status'],
    [UI_LAYOUTS.auth]: ['identity', 'authentication', 'recovery'],
    [UI_LAYOUTS.public]: ['page-header', 'content', 'actions'],
  };
  return contracts[layout] || contracts[UI_LAYOUTS.workbench];
}

export const ROUTE_LAYOUTS_AUDIT = ROUTE_LAYOUTS;
export const TOOL_LAYOUTS_AUDIT = TOOL_LAYOUTS;
