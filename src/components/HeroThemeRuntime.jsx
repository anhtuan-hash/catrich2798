import React, { useEffect } from 'react';
import { findHeroElement, getHeroDescriptor } from '../heroTheme/heroRegistry.js';
import { heroThemeMediaUrl, resolveHeroTheme } from '../heroTheme/heroThemeModel.js';
import {
  HERO_THEME_PUBLISHED_EVENT,
  loadPublicHeroManifest,
} from '../heroTheme/heroThemeClient.js';
import '../styles/HeroThemeRuntime.css';

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const preload = new Image();
    preload.decoding = 'async';
    preload.onload = () => resolve(url);
    preload.onerror = () => reject(new Error('Published Hero image could not be loaded.'));
    preload.src = url;
  });
}

function normalizeRouteTarget(route, explicitToolSlug = '') {
  const raw = String(route || '').trim();
  if (raw.startsWith('tool/')) {
    return { route: 'tool', toolSlug: raw.slice('tool/'.length).split(/[?&]/)[0].trim() };
  }
  return { route: raw || 'home', toolSlug: String(explicitToolSlug || '').trim() };
}

function nativeBackgroundChildren(hero) {
  return [...hero.children].filter((child) => {
    if (!(child instanceof HTMLElement)) return false;
    if (child.classList.contains('hero-theme-runtime__layer')) return false;
    const className = String(child.className || '').toLowerCase();
    return child.hasAttribute('data-hero-background') || className.includes('background') || className.includes('backdrop');
  });
}

function attachThemeLayer(hero, descriptor, theme, imageUrl) {
  if (!hero || !descriptor || theme.mode !== 'custom') return () => {};
  const layer = document.createElement('div');
  const image = document.createElement('div');
  const overlay = document.createElement('div');
  layer.className = 'hero-theme-runtime__layer';
  layer.setAttribute('aria-hidden', 'true');
  image.className = 'hero-theme-runtime__image';
  overlay.className = 'hero-theme-runtime__overlay';
  image.style.backgroundImage = `url(${JSON.stringify(imageUrl)})`;
  image.style.backgroundSize = theme.fit;
  image.style.backgroundPosition = `${theme.positionX}% ${theme.positionY}%`;
  image.style.opacity = String(theme.opacity);
  image.style.filter = `brightness(${theme.brightness}) blur(${theme.blur}px)`;
  image.style.transform = `scale(${theme.zoom})`;
  overlay.style.background = theme.overlayColor;
  overlay.style.opacity = String(theme.overlayOpacity);
  layer.append(image, overlay);

  const hiddenNative = nativeBackgroundChildren(hero);
  hiddenNative.forEach((node) => node.classList.add('hero-theme-runtime__native-background'));
  hero.classList.add('hero-theme-runtime--active');
  hero.dataset.heroKey = descriptor.heroKey;
  hero.prepend(layer);

  return () => {
    layer.remove();
    hiddenNative.forEach((node) => node.classList.remove('hero-theme-runtime__native-background'));
    hero.classList.remove('hero-theme-runtime--active');
    if (hero.dataset.heroKey === descriptor.heroKey) delete hero.dataset.heroKey;
  };
}

export default function HeroThemeRuntime({ route, toolSlug = '' }) {
  useEffect(() => {
    let cancelled = false;
    let detach = () => {};
    let observer = null;
    let retryTimer = null;
    let generation = 0;

    const stopWaiting = () => {
      observer?.disconnect();
      observer = null;
      if (retryTimer) window.clearTimeout(retryTimer);
      retryTimer = null;
    };

    const clear = () => {
      stopWaiting();
      detach();
      detach = () => {};
    };

    const waitForHero = (descriptor, theme, imageUrl, currentGeneration) => {
      const tryAttach = () => {
        if (cancelled || currentGeneration !== generation) return true;
        const hero = findHeroElement(descriptor, document);
        if (!hero) return false;
        detach();
        detach = attachThemeLayer(hero, descriptor, theme, imageUrl);
        stopWaiting();
        return true;
      };
      if (tryAttach()) return;
      observer = new MutationObserver(() => tryAttach());
      observer.observe(document.getElementById('bes-main-content') || document.body, { childList: true, subtree: true });
      retryTimer = window.setTimeout(() => stopWaiting(), 5000);
    };

    const apply = async ({ force = false } = {}) => {
      const currentGeneration = ++generation;
      clear();
      const target = normalizeRouteTarget(route, toolSlug);
      const descriptor = getHeroDescriptor(target.route, target.toolSlug);
      if (!descriptor) return;
      // Defer remote theming until after the existing route has had a frame to render.
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const manifest = await loadPublicHeroManifest({ force });
      if (cancelled || currentGeneration !== generation) return;
      const theme = resolveHeroTheme({ version: 1, heroes: manifest.heroes }, descriptor.heroKey);
      if (theme.mode !== 'custom') return;
      const imageUrl = heroThemeMediaUrl(theme.mediaId);
      if (!imageUrl) return;
      try {
        await preloadImage(imageUrl);
      } catch (error) {
        // Fail open: leave the original Hero untouched when Drive/media is unavailable.
        console.warn('[HeroTheme] original Hero preserved after media error:', error?.message || error);
        return;
      }
      if (cancelled || currentGeneration !== generation) return;
      waitForHero(descriptor, theme, imageUrl, currentGeneration);
    };

    const onPublished = () => apply({ force: true });
    window.addEventListener(HERO_THEME_PUBLISHED_EVENT, onPublished);
    apply();

    return () => {
      cancelled = true;
      generation += 1;
      window.removeEventListener(HERO_THEME_PUBLISHED_EVENT, onPublished);
      clear();
    };
  }, [route, toolSlug]);

  return null;
}
