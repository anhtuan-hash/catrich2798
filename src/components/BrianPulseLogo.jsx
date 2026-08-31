import React, { useEffect, useRef } from 'react';
import './BrianPulseLogo.css';

const SAMPLE_GAP = 2;
const FIELD_RADIUS = 21;
const FIELD_FORCE = 3.25;
const SPRING = 0.066;
const FRICTION = 0.845;

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function hash01(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function readCssColor(element, variable, fallback) {
  const styles = getComputedStyle(element);
  return String(styles.getPropertyValue(variable) || '').trim() || fallback;
}

export default function BrianPulseLogo({ className = '' }) {
  const canvasRef = useRef(null);
  const hostRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let particles = [];
    let frameId = 0;
    let resizeObserver = null;
    let disposed = false;
    let startedAt = performance.now();

    const pointer = {
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      speed: 0,
      active: false,
    };

    class Particle {
      constructor({ x, y, size, alpha, kind, angle, accent, halo, phase }) {
        this.x = x;
        this.y = y;
        this.homeX = x;
        this.homeY = y;
        this.vx = 0;
        this.vy = 0;
        this.size = size;
        this.alpha = alpha;
        this.kind = kind;
        this.angle = angle;
        this.accent = accent;
        this.halo = halo;
        this.phase = phase;
        this.rotation = angle;
        this.rotationVelocity = 0;
        this.pointerEnergy = 0;
      }

      update() {
        let pointerEnergy = 0;

        if (pointer.active) {
          const dx = this.x - pointer.x;
          const dy = this.y - pointer.y;
          const distanceSquared = dx * dx + dy * dy;
          const radiusSquared = FIELD_RADIUS * FIELD_RADIUS;

          if (distanceSquared > 0.001 && distanceSquared < radiusSquared) {
            const distance = Math.sqrt(distanceSquared);
            const proximity = 1 - distance / FIELD_RADIUS;
            const curve = proximity * proximity;
            const strength = curve * (FIELD_FORCE + Math.min(pointer.speed * 0.05, 2.2));
            const nx = dx / distance;
            const ny = dy / distance;

            this.vx += nx * strength + -ny * strength * 0.16;
            this.vy += ny * strength + nx * strength * 0.16;
            this.rotationVelocity += (nx - ny) * strength * 0.021;
            pointerEnergy = proximity;
          }
        }

        this.pointerEnergy += (pointerEnergy - this.pointerEnergy) * 0.18;
        this.vx += (this.homeX - this.x) * SPRING;
        this.vy += (this.homeY - this.y) * SPRING;
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.rotationVelocity *= 0.86;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationVelocity;
        this.rotation += (this.angle - this.rotation) * 0.065;
      }

      draw(ink, accentInk, time) {
        const shimmer = reduceMotion
          ? 1
          : 0.93 + Math.sin(time * 0.00135 + this.phase) * 0.07;
        const interactionLift = 1 + this.pointerEnergy * 0.35;
        const finalAlpha = Math.min(1, this.alpha * shimmer * interactionLift);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = finalAlpha;
        ctx.fillStyle = this.accent || this.pointerEnergy > 0.72 ? accentInk : ink;

        if (this.kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, this.size * (this.halo ? 0.40 : 0.48), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const width = this.kind === 1 ? this.size * 1.55 : this.size * 0.72;
          const height = this.kind === 1 ? this.size * 0.58 : this.size * 1.38;
          roundedRect(ctx, -width / 2, -height / 2, width, height, Math.min(width, height) / 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    function drawOrganicSeal(maskCtx, width, height) {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.412;
      const points = 34;

      maskCtx.beginPath();
      for (let index = 0; index < points; index += 1) {
        const angle = (index / points) * Math.PI * 2;
        const wobble =
          1
          + Math.sin(angle * 3 + 0.8) * 0.024
          + Math.sin(angle * 7 - 0.35) * 0.014
          + Math.sin(angle * 11 + 1.7) * 0.006;
        const rx = radius * wobble * 1.015;
        const ry = radius * wobble * 0.985;
        const x = cx + Math.cos(angle) * rx;
        const y = cy + Math.sin(angle) * ry;
        if (index === 0) maskCtx.moveTo(x, y);
        else maskCtx.lineTo(x, y);
      }
      maskCtx.closePath();
      maskCtx.fill();
    }

    function punchCustomT(maskCtx, width, height) {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) / 52;
      const topY = cy - 13.5 * scale;
      const crossWidth = 21.8 * scale;
      const crossHeight = 5.4 * scale;
      const stemTop = topY + 3.6 * scale;
      const stemBottom = cy + 13.4 * scale;
      const halfTop = 3.6 * scale;
      const halfBottom = 2.65 * scale;

      roundedRect(
        maskCtx,
        cx - crossWidth / 2,
        topY,
        crossWidth,
        crossHeight,
        2.2 * scale,
      );
      maskCtx.fill();

      // Slightly tapered stem: more emblem-like than a stock font glyph.
      maskCtx.beginPath();
      maskCtx.moveTo(cx - halfTop, stemTop);
      maskCtx.lineTo(cx + halfTop, stemTop);
      maskCtx.lineTo(cx + halfBottom, stemBottom - 1.8 * scale);
      maskCtx.quadraticCurveTo(cx + halfBottom, stemBottom, cx, stemBottom + 0.4 * scale);
      maskCtx.quadraticCurveTo(cx - halfBottom, stemBottom, cx - halfBottom, stemBottom - 1.8 * scale);
      maskCtx.closePath();
      maskCtx.fill();

      // A minute asymmetric notch gives the monogram a custom, editorial identity.
      maskCtx.beginPath();
      maskCtx.moveTo(cx + 3.2 * scale, topY + crossHeight);
      maskCtx.lineTo(cx + 6.0 * scale, topY + crossHeight);
      maskCtx.lineTo(cx + 4.7 * scale, topY + crossHeight + 2.1 * scale);
      maskCtx.closePath();
      maskCtx.fill();
    }

    function buildParticles(width, height) {
      const mask = document.createElement('canvas');
      mask.width = Math.max(1, Math.floor(width));
      mask.height = Math.max(1, Math.floor(height));
      const mctx = mask.getContext('2d', { willReadFrequently: true });
      if (!mctx) return;

      mctx.clearRect(0, 0, mask.width, mask.height);
      mctx.fillStyle = '#fff';
      drawOrganicSeal(mctx, width, height);

      mctx.globalCompositeOperation = 'destination-out';
      punchCustomT(mctx, width, height);
      mctx.globalCompositeOperation = 'source-over';

      const data = mctx.getImageData(0, 0, mask.width, mask.height).data;
      const next = [];
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(width, height) * 0.445;

      for (let y = 1; y < mask.height - 1; y += SAMPLE_GAP) {
        for (let x = 1; x < mask.width - 1; x += SAMPLE_GAP) {
          const alpha = data[(y * mask.width + x) * 4 + 3];
          if (alpha < 105) continue;

          const seed = x * 131 + y * 977;
          const randomA = hash01(seed);
          const randomB = hash01(seed + 19);
          const randomC = hash01(seed + 73);
          const randomD = hash01(seed + 149);
          const randomE = hash01(seed + 227);
          const dx = x - cx;
          const dy = y - cy;
          const distance = Math.hypot(dx, dy) / maxRadius;
          const angleFromCenter = Math.atan2(dy, dx);
          const edgeFade = Math.max(0.28, 1 - Math.max(0, distance - 0.69) * 1.7);

          const homeX = x + (randomA - 0.5) * 0.88;
          const homeY = y + (randomB - 0.5) * 0.88;
          const size = 0.74 + randomC * 0.64;
          const particleAlpha = (0.39 + randomD * 0.54) * edgeFade;

          const selector = Math.floor(randomA * 13);
          const kind = selector < 9 ? 0 : selector < 11 ? 1 : 2;
          const particleAngle = kind === 0 ? 0 : (randomB - 0.5) * 1.12;

          // Keep the mark mostly monochrome; a tiny lower-right constellation of
          // accent particles gives Brian a recognisable signature without turning
          // the seal into a multicolour badge.
          const accentSector = angleFromCenter > 0.18 && angleFromCenter < 1.55 && distance > 0.48;
          const accent = accentSector && randomE > 0.84;

          next.push(new Particle({
            x: homeX,
            y: homeY,
            size,
            alpha: particleAlpha,
            kind,
            angle: particleAngle,
            accent,
            halo: false,
            phase: randomE * Math.PI * 2,
          }));
        }
      }

      // Sparse outer dust softens the edge and recreates the airy stipple fringe
      // that makes the dqnotes mark feel printed rather than computer-perfect.
      const haloCount = Math.max(18, Math.round(Math.min(width, height) * 0.62));
      for (let index = 0; index < haloCount; index += 1) {
        const randomA = hash01(index * 71 + 11);
        const randomB = hash01(index * 97 + 23);
        const randomC = hash01(index * 149 + 37);
        const angle = (index / haloCount) * Math.PI * 2 + (randomA - 0.5) * 0.16;
        const radius = maxRadius * (0.91 + randomB * 0.11);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const accentSector = angle > 0.22 && angle < 1.5;

        next.push(new Particle({
          x,
          y,
          size: 0.68 + randomC * 0.46,
          alpha: 0.18 + randomA * 0.23,
          kind: randomB > 0.82 ? 1 : 0,
          angle: (randomC - 0.5) * 0.9,
          accent: accentSector && randomC > 0.9,
          halo: true,
          phase: randomB * Math.PI * 2,
        }));
      }

      particles = next;
      startedAt = performance.now();
    }

    function getPalette() {
      return {
        ink: readCssColor(host, '--particle-ink', getComputedStyle(host).color || '#44544d'),
        accentInk: readCssColor(host, '--particle-accent', '#356fe8'),
      };
    }

    function draw(update = true, now = performance.now()) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const { ink, accentInk } = getPalette();
      const elapsed = now - startedAt;

      if (update) particles.forEach((particle) => particle.update());
      particles.forEach((particle) => particle.draw(ink, accentInk, elapsed));
      ctx.globalAlpha = 1;
    }

    function resize() {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles(width, height);
      draw(false);
    }

    function animate(now) {
      if (disposed) return;
      pointer.speed *= 0.87;
      draw(true, now);
      frameId = window.requestAnimationFrame(animate);
    }

    function onPointerEnter(event) {
      if (reduceMotion) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.lastX = pointer.x;
      pointer.lastY = pointer.y;
      pointer.speed = 0;
      pointer.active = true;
    }

    function onPointerMove(event) {
      if (reduceMotion) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = x - pointer.lastX;
      const dy = y - pointer.lastY;

      pointer.x = x;
      pointer.y = y;
      pointer.speed = Math.sqrt(dx * dx + dy * dy);
      pointer.lastX = x;
      pointer.lastY = y;
      pointer.active = true;
    }

    function onPointerLeave() {
      pointer.active = false;
      pointer.speed = 0;
    }

    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();
    if (!reduceMotion) frameId = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`brian-pulse-logo ${className}`.trim()}
      role="img"
      aria-label="T particle seal"
      title="T"
    >
      <canvas ref={canvasRef} className="brian-pulse-logo__canvas" aria-hidden="true" />
      <span className="brian-pulse-logo__fallback">T</span>
    </div>
  );
}
