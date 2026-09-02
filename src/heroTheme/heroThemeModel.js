export const HERO_THEME_VERSION = 1;

export const ORIGINAL_HERO_THEME = Object.freeze({ mode: 'original' });

const clamp = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};

const safeColor = (value, fallback = '#000000') => {
  const raw = String(value || '').trim();
  return /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i.test(raw) ? raw : fallback;
};

export function normalizeHeroTheme(input) {
  if (!input || input.mode !== 'custom') return { mode: 'original' };
  const mediaId = String(input.mediaId || '').trim();
  if (!mediaId) return { mode: 'original' };
  return {
    mode: 'custom',
    mediaId,
    fit: input.fit === 'contain' ? 'contain' : 'cover',
    positionX: clamp(input.positionX, 50, 0, 100),
    positionY: clamp(input.positionY, 50, 0, 100),
    zoom: clamp(input.zoom, 1, 0.5, 2),
    opacity: clamp(input.opacity, 1, 0, 1),
    brightness: clamp(input.brightness, 1, 0.2, 1.8),
    blur: clamp(input.blur, 0, 0, 30),
    overlayColor: safeColor(input.overlayColor, '#000000'),
    overlayOpacity: clamp(input.overlayOpacity, 0, 0, 1),
  };
}

export function normalizeThemeDocument(input) {
  const source = input && typeof input === 'object' ? input : {};
  const heroes = source.heroes && typeof source.heroes === 'object' ? source.heroes : {};
  const normalizedHeroes = {};
  Object.entries(heroes).forEach(([heroKey, theme]) => {
    const key = String(heroKey || '').trim();
    if (!key) return;
    normalizedHeroes[key] = normalizeHeroTheme(theme);
  });
  return { version: HERO_THEME_VERSION, heroes: normalizedHeroes };
}

export function resolveHeroTheme(document, heroKey) {
  const key = String(heroKey || '').trim();
  if (!key) return ORIGINAL_HERO_THEME;
  const normalized = normalizeThemeDocument(document);
  return normalized.heroes[key] || ORIGINAL_HERO_THEME;
}

export function setHeroTheme(document, heroKey, theme) {
  const normalized = normalizeThemeDocument(document);
  const key = String(heroKey || '').trim();
  if (!key) return normalized;
  return {
    ...normalized,
    heroes: { ...normalized.heroes, [key]: normalizeHeroTheme(theme) },
  };
}

export function resetHeroTheme(document, heroKey) {
  return setHeroTheme(document, heroKey, ORIGINAL_HERO_THEME);
}

export function applyThemeToSelected(document, sourceTheme, selectedHeroKeys = []) {
  const normalized = normalizeThemeDocument(document);
  const copied = normalizeHeroTheme(sourceTheme);
  const heroes = { ...normalized.heroes };
  [...new Set(selectedHeroKeys.map((key) => String(key || '').trim()).filter(Boolean))]
    .forEach((key) => { heroes[key] = { ...copied }; });
  return { ...normalized, heroes };
}

export function applyThemeToAll(document, sourceTheme, allHeroKeys = []) {
  return applyThemeToSelected(document, sourceTheme, allHeroKeys);
}

export function heroThemeMediaUrl(mediaId) {
  const id = String(mediaId || '').trim();
  return id ? `/api/hero-theme-media?id=${encodeURIComponent(id)}` : '';
}
