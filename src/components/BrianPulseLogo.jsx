import React, { useEffect, useRef } from 'react';
import './BrianPulseLogo.css';

const SAMPLE_GAP = 2;
const FIELD_RADIUS = 22;
const FIELD_FORCE = 3.55;
const SPRING = 0.064;
const FRICTION = 0.846;

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

function cssVar(element, name, fallback) {
  const value = String(getComputedStyle(element).getPropertyValue(name) || '').trim();
  return value || fallback;
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
      constructor({ x, y, size, alpha, kind, angle, accent, halo, edge, phase }) {
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
        this.edge = edge;
        this.phase = phase;
        this.rotation = angle;
        this.rotationVelocity = 0;
        this.pointerEnergy = 0;
      }

      update(time) {
        let nextEnergy = 0;

        if (pointer.active) {
          const dx = this.x - pointer.x;
          const dy = this.y - pointer.y;
          const distanceSquared = dx * dx + dy * dy;
          const radiusSquared = FIELD_RADIUS * FIELD_RADIUS;

          if (distanceSquared > 0.001 && distanceSquared < radiusSquared) {
            const distance = Math.sqrt(distanceSquared);
            const proximity = 1 - distance / FIELD_RADIUS;
            const strength = proximity * proximity * (FIELD_FORCE + Math.min(pointer.speed * 0.052, 2.4));
            const nx = dx / distance;
            const ny = dy / distance;

            // Repulsion + a restrained tangential drift. The slight curl is what
            // makes the dots feel magnetised instead of merely pushed away.
            this.vx += nx * strength - ny * strength * 0.17;
            this.vy += ny * strength + nx * strength * 0.17;
            this.rotationVelocity += (nx - ny) * strength * 0.022;
            nextEnergy = proximity;
          }
        }

        // Only the sparse fringe receives a nearly imperceptible idle drift.
        // The core remains visually stable so the T stays crisp.
        if (this.halo && !pointer.active && !reduceMotion) {
          const idle = Math.sin(time * 0.0007 + this.phase) * 0.0045;
          this.vx += Math.cos(this.phase) * idle;
          this.vy += Math.sin(this.phase) * idle;
        }

        this.pointerEnergy += (nextEnergy - this.pointerEnergy) * 0.2;
        this.vx += (this.homeX - this.x) * SPRING;
        this.vy += (this.homeY - this.y) * SPRING;
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.rotationVelocity *= 0.855;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationVelocity;
        this.rotation += (this.angle - this.rotation) * 0.068;
      }

      draw(palette, time) {
        const shimmer = reduceMotion
          ? 1
          : 0.96 + Math.sin(time * 0.00115 + this.phase) * (this.halo ? 0.055 : 0.025);
        const interactionLift = 1 + this.pointerEnergy * 0.32;
        const finalAlpha = Math.min(1, this.alpha * shimmer * interactionLift);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = finalAlpha;

        if (this.accent || this.pointerEnergy > 0.82) ctx.fillStyle = palette.accent;
        else if (this.edge) ctx.fillStyle = palette.edge;
        else ctx.fillStyle = palette.ink;

        if (this.kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, this.size * (this.halo ? 0.38 : 0.49), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const width = this.kind === 1 ? this.size * 1.62 : this.size * 0.68;
          const height = this.kind === 1 ? this.size * 0.54 : this.size * 1.42;
          roundedRect(ctx, -width / 2, -height / 2, width, height, Math.min(width, height) / 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    function drawOrganicSeal(maskCtx, width, height) {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.414;
      const points = 42;

      maskCtx.beginPath();
      for (let index = 0; index < points; index += 1) {
        const angle = (index / points) * Math.PI * 2;
        const wobble =
          1
          + Math.sin(angle * 3 + 0.7) * 0.020
          + Math.sin(angle * 5 - 1.15) * 0.012
          + Math.sin(angle * 9 + 1.8) * 0.008
          + Math.sin(angle * 13 - 0.5) * 0.004;

        // Two tiny asymmetries keep the seal from reading as a generated circle.
        const editorialBias =
          1
          + Math.exp(-Math.pow(angle - 0.82, 2) / 0.18) * 0.016
          - Math.exp(-Math.pow(angle - 3.7, 2) / 0.22) * 0.012;

        const rx = radius * wobble * editorialBias * 1.018;
        const ry = radius * wobble * editorialBias * 0.982;
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

      // Wider shoulders and a slightly narrow, tapered stem make the monogram
      // feel like a designed mark rather than a font glyph.
      const topY = cy - 13.1 * scale;
      const barWidth = 22.8 * scale;
      const barHeight = 5.25 * scale;

      roundedRect(
        maskCtx,
        cx - barWidth / 2,
        topY,
        barWidth,
        barHeight,
        2.35 * scale,
      );
      maskCtx.fill();

      const stemTop = topY + 3.7 * scale;
      const stemBottom = cy + 13.3 * scale;
      const topHalf = 3.5 * scale;
      const bottomHalf = 2.42 * scale;

      maskCtx.beginPath();
      maskCtx.moveTo(cx - topHalf, stemTop);
      maskCtx.lineTo(cx + topHalf, stemTop);
      maskCtx.lineTo(cx + 3.0 * scale, cy + 3.4 * scale);
      maskCtx.lineTo(cx + bottomHalf, stemBottom - 1.7 * scale);
      maskCtx.quadraticCurveTo(cx + bottomHalf, stemBottom, cx + 0.2 * scale, stemBottom + 0.45 * scale);
      maskCtx.quadraticCurveTo(cx - bottomHalf, stemBottom, cx - bottomHalf, stemBottom - 1.7 * scale);
      maskCtx.lineTo(cx - 2.95 * scale, cy + 3.4 * scale);
      maskCtx.closePath();
      maskCtx.fill();

      // One clipped shoulder gives the T a memorable editorial signature.
      maskCtx.beginPath();
      maskCtx.moveTo(cx + 6.45 * scale, topY + barHeight - 0.15 * scale);
      maskCtx.lineTo(cx + 10.8 * scale, topY + barHeight - 0.15 * scale);
      maskCtx.lineTo(cx + 9.2 * scale, topY + barHeight + 1.65 * scale);
      maskCtx.lineTo(cx + 6.45 * scale, topY + barHeight + 0.95 * scale);
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
      const maxRadius = Math.min(width, height) * 0.447;

      const alphaAt = (x, y) => {
        if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return 0;
        return data[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3];
      };

      for (let y = 1; y < mask.height - 1; y += SAMPLE_GAP) {
        for (let x = 1; x < mask.width - 1; x += SAMPLE_GAP) {
          const alpha = alphaAt(x, y);
          if (alpha < 105) continue;

          const seed = x * 131 + y * 977;
          const rA = hash01(seed);
          const rB = hash01(seed + 19);
          const rC = hash01(seed + 73);
          const rD = hash01(seed + 149);
          const rE = hash01(seed + 227);
          const rF = hash01(seed + 311);

          const dx = x - cx;
          const dy = y - cy;
          const distance = Math.hypot(dx, dy) / maxRadius;
          const polar = Math.atan2(dy, dx);

          const neighbourMin = Math.min(
            alphaAt(x + 2, y),
            alphaAt(x - 2, y),
            alphaAt(x, y + 2),
            alphaAt(x, y - 2),
          );
          const edge = neighbourMin < 105;

          // Stronger edge particles make both the outer silhouette and the
          // negative T read crisply, while the interior stays dusty and airy.
          const edgeFade = Math.max(0.25, 1 - Math.max(0, distance - 0.70) * 1.62);
          const homeX = x + (rA - 0.5) * (edge ? 0.48 : 0.92);
          const homeY = y + (rB - 0.5) * (edge ? 0.48 : 0.92);
          const size = edge ? 0.94 + rC * 0.52 : 0.70 + rC * 0.62;
          const particleAlpha = (edge ? 0.60 + rD * 0.34 : 0.34 + rD * 0.52) * edgeFade;

          const selector = Math.floor(rA * 15);
          const kind = selector < 11 ? 0 : selector < 13 ? 1 : 2;
          const angle = kind === 0 ? 0 : (rB - 0.5) * 1.05;

          // A tiny constellation at roughly 4–5 o'clock is the only deliberate
          // colour point. It reads as a signature, not as a multicolour badge.
          const accentSector = polar > 0.50 && polar < 1.28 && distance > 0.55 && distance < 0.90;
          const accent = accentSector && rE > 0.91;

          next.push(new Particle({
            x: homeX,
            y: homeY,
            size,
            alpha: particleAlpha,
            kind,
            angle,
            accent,
            halo: false,
            edge,
            phase: rF * Math.PI * 2,
          }));
        }
      }

      // Airy fringe: slightly denser at upper-right / lower-left, echoing the
      // asymmetry of the reference mark without changing the main silhouette.
      const haloCount = Math.max(26, Math.round(Math.min(width, height) * 0.72));
      for (let index = 0; index < haloCount; index += 1) {
        const rA = hash01(index * 71 + 11);
        const rB = hash01(index * 97 + 23);
        const rC = hash01(index * 149 + 37);
        const rD = hash01(index * 181 + 53);
        const baseAngle = (index / haloCount) * Math.PI * 2;
        const angle = baseAngle + (rA - 0.5) * 0.18;
        const asymmetry = 1 + Math.sin(angle * 2 - 0.8) * 0.018;
        const radius = maxRadius * (0.92 + rB * 0.12) * asymmetry;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const accentSector = angle > 0.52 && angle < 1.25;

        next.push(new Particle({
          x,
          y,
          size: 0.62 + rC * 0.48,
          alpha: 0.13 + rA * 0.24,
          kind: rB > 0.86 ? 1 : 0,
          angle: (rC - 0.5) * 0.82,
          accent: accentSector && rD > 0.94,
          halo: true,
          edge: false,
          phase: rB * Math.PI * 2,
        }));
      }

      particles = next;
      startedAt = performance.now();
    }

    function palette() {
      return {
        ink: cssVar(host, '--particle-ink', '#4b5a53'),
        edge: cssVar(host, '--particle-edge', '#33473d'),
        accent: cssVar(host, '--particle-accent', '#3d72e8'),
      };
    }

    function draw(update = true, now = performance.now()) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const colors = palette();
      const elapsed = now - startedAt;

      if (update) particles.forEach((particle) => particle.update(elapsed));
      particles.forEach((particle) => particle.draw(colors, elapsed));
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
