import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';

const ROUTE_LABELS = {
  home: ['Trang chủ', 'Home'],
  apps: ['Ứng dụng', 'Applications'],
  news: ['Tin tức', 'News'],
  games: ['Trò chơi', 'Games'],
  tools: ['Công cụ đặc biệt', 'Special tools'],
  homeroom: ['Chủ nhiệm', 'Homeroom'],
  'homeroom-portal': ['Cổng chủ nhiệm', 'Homeroom portal'],
  resources: ['Tài nguyên', 'Resources'],
  library: ['Thư viện', 'Library'],
  'resource-library': ['Kho học liệu', 'Resource library'],
  'knowledge-hub': ['Knowledge Hub', 'Knowledge Hub'],
  dashboard: ['Không gian công việc', 'Work dashboard'],
  'platform-readiness': ['Sẵn sàng nền tảng', 'Platform readiness'],
  'cloud-operations': ['Vận hành đám mây', 'Cloud operations'],
  'data-governance': ['Quản trị dữ liệu', 'Data governance'],
  'production-hardening': ['Production hardening', 'Production hardening'],
  practice: ['Bài tập', 'Practice'],
  qa: ['Kiểm tra hệ thống', 'System health'],
  trash: ['Thùng rác', 'Trash'],
  contact: ['Liên hệ', 'Contact'],
  settings: ['Cài đặt', 'Settings'],
  admin: ['Quản trị', 'Admin'],
  'app-vault': ['Kho ứng dụng ẩn', 'Hidden apps vault'],
  setup: ['Thiết lập', 'Setup'],
};

const ROUTE_ORDER = Object.keys(ROUTE_LABELS);

function routeSelectors(route) {
  const safe = String(route).replace(/[^a-z0-9_-]/gi, '-');
  const specific = {
    home: ['.bha-hero.hero-cms'],
    admin: ['.admin-v41-hero'],
    dashboard: ['.work-dashboard-hero', '.ttcm-work-hero'],
    games: ['.games-hero', '.game-hub-hero'],
    apps: ['.apps-hero', '.web-apps-hero'],
    resources: ['.resources-hero'],
    'resource-library': ['.resource-library-hero'],
    library: ['.library-hero'],
    contact: ['.contact-hero'],
  }[route] || [];
  return [
    `[data-page-hero="${route}"]`,
    `[data-route-hero="${route}"]`,
    ...specific,
    `.page .${safe}-hero`,
    '.page [data-hero-root]:first-of-type',
    '.page [class*="hero" i]:first-of-type',
    '.page > section:first-of-type',
  ];
}

const routeEntries = ROUTE_ORDER.map((route) => ({
  heroKey: `${route}.main`,
  route,
  labelVi: ROUTE_LABELS[route][0],
  labelEn: ROUTE_LABELS[route][1],
  selectors: routeSelectors(route),
}));

const toolMap = new Map();
[...APPS, ...GAME_APPS, ...SPECIAL_TOOLS].forEach((tool) => {
  const slug = String(tool?.slug || '').trim();
  if (!slug || toolMap.has(slug)) return;
  toolMap.set(slug, {
    heroKey: `tool.${slug}`,
    route: 'tool',
    toolSlug: slug,
    labelVi: tool.titleVi || tool.title || slug,
    labelEn: tool.title || tool.titleEn || tool.titleVi || slug,
    selectors: [
      `[data-tool-hero="${slug}"]`,
      '.tool-page [data-hero-root]:first-of-type',
      '.tool-page [class*="hero" i]:first-of-type',
      '.page [class*="hero" i]:first-of-type',
      '.page > section:first-of-type',
    ],
  });
});

export const HERO_REGISTRY = Object.freeze([...routeEntries, ...toolMap.values()].map((entry) => Object.freeze(entry)));

export function validateHeroRegistry(entries = HERO_REGISTRY) {
  const seen = new Set();
  for (const entry of entries) {
    if (!entry?.heroKey || !entry?.route || !Array.isArray(entry?.selectors) || !entry.selectors.length) {
      throw new Error('Invalid Hero Registry entry.');
    }
    if (seen.has(entry.heroKey)) throw new Error(`Duplicate Hero Registry key: ${entry.heroKey}`);
    seen.add(entry.heroKey);
  }
  return true;
}

export const assertUniqueHeroKeys = validateHeroRegistry;
validateHeroRegistry();

export function getHeroRegistryForStudio() {
  return HERO_REGISTRY;
}

export function getHeroDescriptor(route, toolSlug = '') {
  const normalizedRoute = String(route || '').trim();
  if (normalizedRoute === 'tool') {
    const slug = String(toolSlug || '').trim();
    return HERO_REGISTRY.find((entry) => entry.route === 'tool' && entry.toolSlug === slug) || null;
  }
  return HERO_REGISTRY.find((entry) => entry.route === normalizedRoute && !entry.toolSlug) || null;
}

export function findHeroElement(descriptor, root = document) {
  if (!descriptor || !root?.querySelector) return null;
  for (const selector of descriptor.selectors) {
    try {
      const element = root.querySelector(selector);
      if (element) return element;
    } catch {
      // Ignore a selector that is unsupported by an older browser and try the next.
    }
  }
  return null;
}
