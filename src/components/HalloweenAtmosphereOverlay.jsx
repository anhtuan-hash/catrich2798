import React, { useEffect, useRef, useState } from 'react';
import HalloweenMotifArt, { HALLOWEEN_SYMBOLS } from './HalloweenMotifArt.jsx';
import './HalloweenAtmosphereOverlay.css';

// Edge-only anchor areas prevent the atmosphere from taking over central app content.
// Every mount shuffles their order and jitters the exact position.
const EDGE_ZONES = [
  [7, 17], [7, 35], [7, 54], [7, 73], [8, 91],
  [94, 16], [94, 34], [94, 53], [94, 72], [93, 90],
  [21, 6], [41, 6], [62, 6], [80, 6],
  [22, 95], [42, 95], [64, 95], [81, 95],
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);
let nextMotifId = 0;

function getTier() {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth < 680 ? 'mobile' : window.innerWidth < 1100 ? 'tablet' : 'desktop';
}

function isLowPerformance() {
  if (typeof document === 'undefined') return false;
  return ['low', 'minimal'].includes(document.documentElement.dataset.performance);
}

function reducedMotion() {
  return typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getCount(tier, density) {
  const requested = clamp(Math.round(Number(density) || 10), 3, 18);
  const maxCount = tier === 'mobile' ? 5 : tier === 'tablet' ? 9 : 14;
  return isLowPerformance() ? Math.min(requested, 3) : Math.min(requested, maxCount);
}

function motionFor(kind) {
  if (['bat', 'crow'].includes(kind)) return 'fly';
  if (['ghost', 'vampire', 'mummy'].includes(kind)) return 'float';
  if (['spider', 'spider-web'].includes(kind)) return 'swing';
  if (['autumn-leaf', 'candy', 'candy-corn', 'broom'].includes(kind)) return 'fall';
  if (['candle', 'lantern', 'cauldron', 'potion', 'star'].includes(kind)) return 'glimmer';
  return 'hover';
}

function makeMotif(zoneIndex, kind, tier) {
  const [x, y] = EDGE_ZONES[zoneIndex];
  const mobile = tier === 'mobile';
  const spread = mobile ? 2.5 : 4;
  return {
    id: ++nextMotifId,
    zoneIndex,
    kind,
    motion: motionFor(kind),
    left: clamp(x + randomBetween(-spread, spread), mobile ? 4 : 3, 97),
    top: clamp(y + randomBetween(-spread, spread), mobile ? 5 : 3, 96),
    size: Math.round((mobile ? 38 : tier === 'tablet' ? 53 : 62) + randomBetween(0, mobile ? 15 : 32)),
    opacityScale: randomBetween(mobile ? 0.72 : 0.8, 1.04),
    duration: randomBetween(7, 15),
    delay: -randomBetween(0, 9),
    dx: randomBetween(20, mobile ? 33 : 70) * (Math.random() < 0.5 ? -1 : 1),
    dy: randomBetween(19, mobile ? 40 : 64) * (Math.random() < 0.5 ? -1 : 1),
    angle: randomBetween(5, 14) * (Math.random() < 0.5 ? -1 : 1),
    leaving: false,
  };
}

function newScene(tier, density) {
  const count = getCount(tier, density);
  const zones = shuffle(EDGE_ZONES.map((_, index) => index));
  const kinds = shuffle(HALLOWEEN_SYMBOLS);
  return Array.from({ length: count }, (_, index) => makeMotif(zones[index], kinds[index], tier));
}

function replacementFor(leaving, current, tier) {
  const usedZones = new Set(current.filter((item) => item.id !== leaving.id).map((item) => item.zoneIndex));
  const freeZones = shuffle(EDGE_ZONES.map((_, index) => index).filter((index) => !usedZones.has(index)));
  const usedKinds = new Set(current.filter((item) => item.id !== leaving.id).map((item) => item.kind));
  const availableKinds = HALLOWEEN_SYMBOLS.filter((kind) => !usedKinds.has(kind));
  const zoneIndex = freeZones.length ? freeZones[0] : leaving.zoneIndex;
  const kind = availableKinds[Math.floor(Math.random() * availableKinds.length)] || leaving.kind;
  return makeMotif(zoneIndex, kind, tier);
}

export default function HalloweenAtmosphereOverlay({ settings }) {
  const [tier, setTier] = useState(getTier);
  const [reduceMotion, setReduceMotion] = useState(reducedMotion);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  );
  const density = settings?.density ?? 10;
  const [motifs, setMotifs] = useState(() => newScene(getTier(), density));
  const sceneRef = useRef(motifs);
  const sceneKey = useRef(`${getTier()}:${getCount(getTier(), density)}`);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let frame = 0;
    const onResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setTier((current) => {
        const next = getTier();
        return current === next ? current : next;
      }));
    };
    const onVisibility = () => setPageVisible(document.visibilityState === 'visible');
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReduceMotion(Boolean(media?.matches));
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    media?.addEventListener?.('change', onMotion);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      media?.removeEventListener?.('change', onMotion);
    };
  }, []);

  // Recalculate positions only when the viewport tier or visible count changes.
  // Changing opacity or speed does not shuffle all existing symbols.
  const count = getCount(tier, density);
  useEffect(() => {
    const key = `${tier}:${count}`;
    if (sceneKey.current === key) return;
    sceneKey.current = key;
    const updated = newScene(tier, density);
    sceneRef.current = updated;
    setMotifs(updated);
  }, [tier, count, density]);

  const enabled = settings?.enabled !== false && settings?.showBuiltIns !== false;
  const animate = enabled && !reduceMotion && !isLowPerformance();

  // Change only 1–2 symbols per wave: first fade out, then spawn replacement
  // in a different randomly chosen edge zone. No wall-of-icons/full repaint.
  useEffect(() => {
    if (!animate || !pageVisible || typeof window === 'undefined') return undefined;
    let alive = true;
    let waveTimer = 0;
    let spawnTimer = 0;
    const schedule = () => {
      waveTimer = window.setTimeout(() => {
        if (!alive || document.visibilityState !== 'visible') return;
        const current = sceneRef.current;
        if (!current.length) return;
        const chosen = shuffle(current.map((item) => item.id)).slice(0, Math.min(current.length, Math.random() < 0.7 ? 1 : 2));
        const chosenIds = new Set(chosen);
        const fading = current.map((item) => chosenIds.has(item.id) ? { ...item, leaving: true } : item);
        sceneRef.current = fading;
        setMotifs(fading);
        spawnTimer = window.setTimeout(() => {
          if (!alive) return;
          let next = [...sceneRef.current];
          for (const id of chosen) {
            const index = next.findIndex((item) => item.id === id && item.leaving);
            if (index === -1) continue;
            next[index] = replacementFor(next[index], next, tier);
          }
          sceneRef.current = next;
          setMotifs(next);
          schedule();
        }, 850);
      }, randomBetween(14000, 26000));
    };
    schedule();
    return () => {
      alive = false;
      window.clearTimeout(waveTimer);
      window.clearTimeout(spawnTimer);
    };
  }, [animate, pageVisible, tier, count]);

  if (!enabled || !motifs.length) return null;

  const opacity = clamp(Number(settings?.opacity) || 0.18, 0.03, 0.28);
  const speed = clamp(Number(settings?.speed) || 1, 0.4, 2.5);

  return (
    <div className="bes-halloween-atmosphere" data-tier={tier} data-paused={!pageVisible || !animate} aria-hidden="true">
      <div className="bes-halloween-atmosphere__wash" />
      {motifs.map((motif) => (
        <span
          key={motif.id}
          className={`bes-halloween-motif ${motif.leaving ? 'is-leaving' : 'is-entering'}`}
          style={{
            '--h-left': `${motif.left}%`,
            '--h-top': `${motif.top}%`,
            '--h-size': `${motif.size}px`,
            '--h-opacity': Math.min(0.28, opacity * motif.opacityScale),
            '--h-duration': `${(motif.duration / speed).toFixed(2)}s`,
            '--h-delay': `${motif.delay.toFixed(2)}s`,
            '--h-dx': `${motif.dx.toFixed(1)}px`,
            '--h-dy': `${motif.dy.toFixed(1)}px`,
            '--h-angle': `${motif.angle.toFixed(1)}deg`,
          }}
        >
          <span className={`bes-halloween-motif__art is-${motif.motion}`}>
            <HalloweenMotifArt kind={motif.kind} />
          </span>
        </span>
      ))}
    </div>
  );
}
