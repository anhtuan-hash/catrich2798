const ROUTE_LAYOUTS = new Map([
  ['home', 'launch'], ['apps', 'launch'], ['games', 'launch'], ['tools', 'launch'],
  ['settings', 'settings'], ['ai-governance', 'settings'], ['setup', 'settings'],
  ['department', 'management'], ['homeroom', 'management'], ['admin', 'management'], ['work-hub', 'management'], ['data-governance', 'management'],
  ['library', 'library'], ['resource-library', 'library'], ['knowledge-hub', 'library'], ['resources', 'library'],
  ['content-factory', 'workbench'], ['assessment-core', 'workbench'], ['lesson-pack', 'workbench'], ['classroom-delivery', 'workbench'], ['ai-workspace', 'workbench'],
  ['news', 'editor'], ['practice', 'editor'],
  ['login', 'auth'], ['register', 'auth'],
]);

export function getRouteLayout(route, selectedTool) {
  if (route === 'tool') {
    const slug = selectedTool?.slug || '';
    if (/lesson|writing|textcare|reading/.test(slug)) return 'editor';
    return 'workbench';
  }
  return ROUTE_LAYOUTS.get(route) || 'standard';
}
