import React, { useEffect, useRef, useState } from 'react';
import NovemberMotifArt, { NOVEMBER_MOTIFS } from './NovemberMotifArt.jsx';
import './NovemberAtmosphereOverlay.css';

// Intentionally limited to the margins, top and bottom so teaching forms stay readable.
const EDGE_ZONES = [
  [6, 20], [7, 39], [7, 58], [8, 77], [7, 92],
  [94, 19], [93, 38], [94, 57], [93, 76], [94, 92],
  [21, 7], [43, 7], [65, 7], [83, 7],
  [22, 95], [44, 95], [65, 95], [84, 95],
];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const random = (min, max) => min + Math.random() * (max - min);
const shuffled = (values) => {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};
let nextId = 0;

function tierNow() {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 680 ? 'mobile' : window.innerWidth < 1100 ? 'tablet' : 'desktop';
}
function reduceMotion() {
  return typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
function lowPerformance() {
  return typeof document !== 'undefined'
    && ['low', 'minimal'].includes(document.documentElement.dataset.performance);
}
function visibleCount(tier, density) {
  const requested = clamp(Math.round(Number(density) || 10), 3, 18);
  const limit = tier === 'mobile' ? 4 : tier === 'tablet' ? 8 : 12;
  return lowPerformance() ? Math.min(3, requested) : Math.min(requested, limit);
}
function motionFor(kind) {
  if (['rose', 'lotus', 'sunflower', 'carnation', 'bouquet', 'heart'].includes(kind)) return 'bloom';
  if (['petals', 'leaf', 'ribbon'].includes(kind)) return 'fall';
  if (['paper-plane', 'envelope', 'thank-you-letter'].includes(kind)) return 'glide';
  if (['golden-star', 'november-20'].includes(kind)) return 'shine';
  return 'float';
}
function createMotif(zoneIndex, kind, tier) {
  const [x, y] = EDGE_ZONES[zoneIndex];
  const mobile = tier === 'mobile';
  const dx = random(-29, 29);
  const dy = random(-27, 27);
  return {
    id: ++nextId,
    kind,
    zoneIndex,
    motion: motionFor(kind),
    x: clamp(x + random(mobile ? -2.3 : -4, mobile ? 2.3 : 4), 4, 96),
    y: clamp(y + random(mobile ? -2.5 : -4, mobile ? 2.5 : 4), 4, 96),
    size: Math.round((mobile ? 35 : tier === 'tablet' ? 48 : 57) + random(0, mobile ? 14 : 27)),
    alpha: random(.74, 1),
    duration: random(8.5, 17),
    dx,
    dy,
    angle: random(-8, 8),
    leaving: false,
  };
}
function newScene(tier, density) {
  const count = visibleCount(tier, density);
  const zones = shuffled(EDGE_ZONES.map((_, i) => i));
  const kinds = shuffled(NOVEMBER_MOTIFS);
  return Array.from({ length: count }, (_, i) => createMotif(zones[i], kinds[i], tier));
}
function replacement(current, leaving, tier) {
  const others = current.filter((item) => item.id !== leaving.id);
  const zones = shuffled(EDGE_ZONES.map((_, i) => i).filter((id) => !others.some((item) => item.zoneIndex === id)));
  const kinds = NOVEMBER_MOTIFS.filter((kind) => !others.some((item) => item.kind === kind));
  const otherZones = zones.filter((zone) => zone !== leaving.zoneIndex);
  return createMotif((otherZones[0] ?? zones[0]) ?? leaving.zoneIndex,
    kinds[Math.floor(Math.random() * kinds.length)] || leaving.kind, tier);
}

export default function NovemberAtmosphereOverlay({ settings }) {
  const [tier, setTier] = useState(tierNow);
  const [reduced, setReduced] = useState(reduceMotion);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  const density = settings?.density ?? 10;
  const [motifs, setMotifs] = useState(() => newScene(tierNow(), density));
  const motifsRef = useRef(motifs);
  const sceneKey = useRef(`${tierNow()}:${visibleCount(tierNow(), density)}`);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setTier((current) => {
        const next = tierNow();
        return next === current ? current : next;
      }));
    };
    const onVisibility = () => setVisible(document.visibilityState === 'visible');
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReduced(Boolean(media?.matches));
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    media?.addEventListener?.('change', onMotion);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      media?.removeEventListener?.('change', onMotion);
    };
  }, []);

  const count = visibleCount(tier, density);
  useEffect(() => {
    const key = `${tier}:${count}`;
    if (sceneKey.current === key) return;
    sceneKey.current = key;
    const next = newScene(tier, density);
    motifsRef.current = next;
    setMotifs(next);
  }, [tier, count, density]);

  const enabled = settings?.enabled !== false && settings?.showBuiltIns !== false;
  const animated = enabled && !reduced && !lowPerformance();
  useEffect(() => {
    if (!animated || !visible || typeof window === 'undefined') return undefined;
    let alive = true;
    let timer = 0;
    let replacementTimer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!alive || document.visibilityState !== 'visible') return;
        const old = motifsRef.current;
        const chosen = shuffled(old.map((item) => item.id)).slice(0, Math.min(old.length, Math.random() > .7 ? 2 : 1));
        const ids = new Set(chosen);
        const leaving = old.map((item) => ids.has(item.id) ? { ...item, leaving: true } : item);
        motifsRef.current = leaving;
        setMotifs(leaving);
        replacementTimer = window.setTimeout(() => {
          if (!alive) return;
          const updated = [...motifsRef.current];
          for (const id of chosen) {
            const index = updated.findIndex((item) => item.id === id && item.leaving);
            if (index >= 0) updated[index] = replacement(updated, updated[index], tier);
          }
          motifsRef.current = updated;
          setMotifs(updated);
          schedule();
        }, 1000);
      }, random(17000, 32000));
    };
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.clearTimeout(replacementTimer);
    };
  }, [animated, visible, tier, count]);

  if (!enabled || !motifs.length) return null;
  const opacity = clamp(Number(settings?.opacity) || .15, .03, .28);
  const speed = clamp(Number(settings?.speed) || 1, .4, 2.5);
  return <div className="bes-november-atmosphere" data-tier={tier} data-paused={!animated || !visible} aria-hidden="true">
    <div className="bes-november-atmosphere__wash" />
    {motifs.map((motif) => <span
      key={motif.id}
      className={`bes-november-motif ${motif.leaving ? 'is-leaving' : 'is-entering'}`}
      style={{
        '--n-left': `${motif.x}%`,
        '--n-top': `${motif.y}%`,
        '--n-size': `${motif.size}px`,
        '--n-opacity': Math.min(.28, opacity * motif.alpha),
        '--n-duration': `${(motif.duration / speed).toFixed(2)}s`,
        '--n-dx': `${motif.dx.toFixed(1)}px`,
        '--n-dy': `${motif.dy.toFixed(1)}px`,
        '--n-angle': `${motif.angle.toFixed(1)}deg`,
      }}>
      <span className={`bes-november-motif__art is-${motif.motion}`}><NovemberMotifArt kind={motif.kind}/></span>
    </span>)}
  </div>;
}
