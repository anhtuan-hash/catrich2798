import React, { useEffect, useMemo, useState } from 'react';
import {
  loadVietnamAtmosphereSettings,
  readVietnamAtmosphereLocal,
  subscribeVietnamAtmosphereSettings,
} from '../utils/vietnamAtmosphereSettings.js';
import sprite1 from '../data/vietnamCuratedSprite/sprite1.js';
import sprite2 from '../data/vietnamCuratedSprite/sprite2.js';
import sprite3 from '../data/vietnamCuratedSprite/sprite3.js';
import sprite4 from '../data/vietnamCuratedSprite/sprite4.js';
import './VietnamAtmosphereOverlay.css';

const SPRITES = {
  1: { url: sprite1, columns: 5 },
  2: { url: sprite2, columns: 5 },
  3: { url: sprite3, columns: 5 },
  4: { url: sprite4, columns: 4 },
};

const CURATED_ASSETS = [
  { id: 'cuu-dinh', title: 'Cửu Đỉnh', sprite: 1, column: 0 },
  { id: 'cho-ben-thanh', title: 'Chợ Bến Thành', sprite: 1, column: 1 },
  { id: 'co-do-sao-vang', title: 'Cờ đỏ sao vàng', sprite: 1, column: 2 },
  { id: 'banh-beo-hue', title: 'Bánh bèo Huế', sprite: 1, column: 3 },
  { id: 'non-la', title: 'Nón lá', sprite: 1, column: 4 },
  { id: 'tre-viet', title: 'Tre Việt', sprite: 2, column: 0 },
  { id: 'cau-ba-son', title: 'Cầu Ba Son', sprite: 2, column: 1 },
  { id: 'truong-quoc-hoc-hue', title: 'Trường Quốc Học Huế', sprite: 2, column: 2 },
  { id: 'ben-bach-dang', title: 'Bến Bạch Đằng', sprite: 2, column: 3 },
  { id: 'bao-tang-my-thuat', title: 'Bảo tàng Mỹ thuật', sprite: 2, column: 4 },
  { id: 'hoa-sen', title: 'Hoa sen', sprite: 3, column: 0 },
  { id: 'ho-con-rua', title: 'Hồ Con Rùa', sprite: 3, column: 1 },
  { id: 'trong-dong', title: 'Trống đồng', sprite: 3, column: 2 },
  { id: 'rong-cung-dinh-hue', title: 'Rồng cung đình Huế', sprite: 3, column: 3 },
  { id: 'nha-tho-tan-dinh', title: 'Nhà thờ Tân Định', sprite: 3, column: 4 },
  { id: 'biet-thu-phap', title: 'Biệt thự Pháp', sprite: 4, column: 0 },
  { id: 'cau-truong-tien', title: 'Cầu Trường Tiền', sprite: 4, column: 1 },
  { id: 'vinh-ha-long', title: 'Vịnh Hạ Long', sprite: 4, column: 2 },
  { id: 'cau-anh-sao', title: 'Cầu Ánh Sao', sprite: 4, column: 3 },
];

const EDGE_ANCHORS = [
  { left: 1, top: 10 },
  { left: 86, top: 8 },
  { left: 2, top: 72 },
  { left: 84, top: 68 },
  { left: 20, top: 86 },
  { left: 67, top: 84 },
  { left: 40, top: 1 },
  { left: 93, top: 35 },
];

function getViewportTier() {
  if (typeof window === 'undefined') return 'desktop';
  if (window.innerWidth < 680) return 'mobile';
  if (window.innerWidth < 1100) return 'tablet';
  return 'desktop';
}

function getVisibleCount(tier, density) {
  const requested = Math.max(3, Math.min(18, Number(density) || 10));
  const performance = typeof document === 'undefined' ? 'balanced' : document.documentElement.dataset.performance;
  if (performance === 'low') return tier === 'desktop' ? 3 : 2;
  if (tier === 'mobile') return Math.max(2, Math.min(3, Math.round(requested * 0.24)));
  if (tier === 'tablet') return Math.max(3, Math.min(5, Math.round(requested * 0.38)));
  return Math.max(4, Math.min(7, Math.round(requested * 0.58)));
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMotifs(tier, settings, rotation) {
  const count = getVisibleCount(tier, settings.density);
  const random = seededRandom(4073 + rotation * 97 + count * 31 + (tier === 'mobile' ? 13 : tier === 'tablet' ? 29 : 47));
  const curated = settings.showBuiltIns === false ? [] : [...CURATED_ASSETS];

  for (let index = curated.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [curated[index], curated[swapIndex]] = [curated[swapIndex], curated[index]];
  }

  const custom = (settings.images || [])
    .filter((image) => image?.enabled !== false && image?.url)
    .map((image) => ({
      id: `custom-${image.id || image.path || image.url}`,
      title: image.name || 'Vietnam symbol',
      kind: 'custom',
      url: image.url,
    }));

  const assets = [];
  const length = Math.max(custom.length, curated.length);
  for (let index = 0; index < length; index += 1) {
    if (custom[index]) assets.push(custom[index]);
    if (curated[index]) assets.push({ ...curated[index], kind: 'curated' });
  }
  if (!assets.length) return [];

  const globalOpacity = Math.max(0.03, Math.min(0.28, Number(settings.opacity) || 0.11));
  const speed = Math.max(0.4, Math.min(2.5, Number(settings.speed) || 1));
  const tierScale = tier === 'mobile' ? 0.7 : tier === 'tablet' ? 0.84 : 1;

  return assets.slice(0, count).map((asset, index) => {
    const anchor = EDGE_ANCHORS[(index + rotation) % EDGE_ANCHORS.length];
    const baseSize = tier === 'mobile' ? 54 : tier === 'tablet' ? 66 : 78;
    const sizeRange = tier === 'mobile' ? 24 : tier === 'tablet' ? 32 : 42;
    return {
      ...asset,
      left: Math.max(0, Math.min(94, anchor.left + (random() - 0.5) * 5)),
      top: Math.max(0, Math.min(90, anchor.top + (random() - 0.5) * 5)),
      size: Math.round(baseSize + random() * sizeRange),
      opacity: Number((globalOpacity * tierScale * (0.5 + random() * 0.24)).toFixed(3)),
      driftX: Math.round((random() - 0.5) * (tier === 'mobile' ? 28 : 58)),
      driftY: Math.round((random() - 0.5) * (tier === 'mobile' ? 34 : 70)),
      rotate: Math.round((random() - 0.5) * 12),
      duration: Number(((30 + random() * 24) / speed).toFixed(2)),
      delay: Math.round(random() * -28),
    };
  });
}

function spriteStyle(asset) {
  const sprite = SPRITES[asset.sprite];
  const x = sprite.columns === 1 ? 0 : (asset.column / (sprite.columns - 1)) * 100;
  return {
    display: 'block',
    width: '100%',
    height: '100%',
    backgroundImage: `url(${sprite.url})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${sprite.columns * 100}% 100%`,
    backgroundPosition: `${x}% 50%`,
  };
}

export default function VietnamCuratedAtmosphereOverlay() {
  const [viewportTier, setViewportTier] = useState(getViewportTier);
  const [settings, setSettings] = useState(readVietnamAtmosphereLocal);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let active = true;
    let frame = 0;
    loadVietnamAtmosphereSettings().then((next) => {
      if (active) setSettings(next);
    }).catch(() => null);
    const unsubscribe = subscribeVietnamAtmosphereSettings((next) => {
      if (active) setSettings(next);
    });
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextTier = getViewportTier();
        setViewportTier((current) => current === nextTier ? current : nextTier);
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      unsubscribe?.();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') setRotation((value) => value + 1);
    }, 42000);
    return () => window.clearInterval(interval);
  }, []);

  const motifs = useMemo(
    () => buildMotifs(viewportTier, settings, rotation),
    [viewportTier, settings, rotation],
  );

  if (!settings.enabled || !motifs.length) return null;

  return (
    <div className="bes-vn-atmosphere bes-vn-atmosphere--curated" data-tier={viewportTier} aria-hidden="true">
      {motifs.map((motif) => (
        <span
          key={motif.id}
          className={`bes-vn-motif bes-vn-motif--curated ${motif.kind === 'custom' ? 'bes-vn-motif--custom' : ''}`}
          style={{
            '--vn-left': `${motif.left}%`,
            '--vn-top': `${motif.top}%`,
            '--vn-size': `${motif.size}px`,
            '--vn-opacity': motif.opacity,
            '--vn-drift-x': `${motif.driftX}px`,
            '--vn-drift-y': `${motif.driftY}px`,
            '--vn-rotate': `${motif.rotate}deg`,
            '--vn-duration': `${motif.duration}s`,
            '--vn-delay': `${motif.delay}s`,
            '--vn-blur': '0px',
          }}
        >
          <span className="bes-vn-motif__art">
            {motif.kind === 'custom'
              ? <img src={motif.url} alt="" loading="lazy" decoding="async" draggable="false" />
              : <span style={spriteStyle(motif)} />}
          </span>
        </span>
      ))}
    </div>
  );
}
