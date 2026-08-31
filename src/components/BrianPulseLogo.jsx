import React, { useEffect, useRef } from 'react';
import './BrianPulseLogo.css';

const SAMPLE_GAP = 2;
const FIELD_RADIUS = 18;
const FIELD_FORCE = 3.2;
const SPRING = 0.076;
const FRICTION = 0.84;

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

function hexToRgb(color) {
  const raw = String(color || '').trim();
  const normalized = raw.startsWith('#') ? raw.slice(1) : raw;
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

function mixHexColors(a, b, amount) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  if (!left || !right) return amount < 0.5 ? a : b;
  const t = Math.max(0, Math.min(1, amount));
  const r = Math.round(left.r + (right.r - left.r) * t);
  const g = Math.round(left.g + (right.g - left.g) * t);
  const bb = Math.round(left.b + (right.b - left.b) * t);
  return `rgb(${r}, ${g}, ${bb})`;
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
      constructor({ x, y, size, alpha, kind, angle, mix, halo, phase }) {
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
        this.mix = mix;
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
            const strength = curve * (FIELD_FORCE + Math.min(pointer.speed * 0.048, 2.2));
            const nx = dx / distance;
            const ny = dy / distance;
            this.vx += nx * strength + -ny * strength * 0.16;
            this.vy += ny * strength + nx * strength * 0.16;
            this.rotationVelocity += (nx - ny) * strength * 0.024;
            pointerEnergy = proximity;
          }
        }

        this.pointerEnergy += (pointerEnergy - this.pointerEnergy) * 0.2;
        this.vx += (this.homeX - this.x) * SPRING;
        this.vy += (this.homeY - this.y) * SPRING;
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.rotationVelocity *= 0.86;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationVelocity;
        this.rotation += (this.angle - this.rotation) * 0.07;
      }

      draw(palette, elapsed) {
        const shimmer = reduceMotion ? 1 : 0.94 + Math.sin(elapsed * 0.0012 + this.phase) * 0.06;
        const lift = 1 + this.pointerEnergy * 0.34;
        const finalAlpha = Math.min(1, this.alpha * shimmer * lift);
        const tone = Math.min(1, this.mix + this.pointerEnergy * 0.22 + (this.halo ? 0.04 : 0));
        const fill = mixHexColors(palette.start, palette.end, tone);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = finalAlpha;
        ctx.fillStyle = fill;

        if (this.kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, this.size * (this.halo ? 0.36 : 0.48), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const width = this.kind === 1 ? this.size * 1.5 : this.size * 0.72;
          const height = this.kind === 1 ? this.size * 0.58 : this.size * 1.34;
          roundedRect(ctx, -width / 2, -height / 2, width, height, Math.min(width, height) / 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    function drawSquareSeal(maskCtx, width, height) {
      const side = Math.min(width, height) * 0.78;
      const left = (width - side) / 2;
      const top = (height - side) / 2;
      roundedRect(maskCtx, left, top, side, side, side * 0.24);
      maskCtx.fill();
    }

    function traceCustomT(targetCtx, width, height) {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) / 52;
      const topY = cy - 14.2 * scale;
      const crossWidth = 25.4 * scale;
      const crossHeight = 5.8 * scale;
      const stemTop = topY + 3.9 * scale;
      const stemBottom = cy + 14.0 * scale;
      const halfTop = 4.1 * scale;
      const halfBottom = 2.85 * scale;

      roundedRect(
        targetCtx,
        cx - crossWidth / 2,
        topY,
        crossWidth,
        crossHeight,
        2.5 * scale,
      );
      targetCtx.fill();

      targetCtx.beginPath();
      targetCtx.moveTo(cx - halfTop, stemTop);
      targetCtx.lineTo(cx + halfTop, stemTop);
      targetCtx.lineTo(cx + 3.35 * scale, cy + 3.6 * scale);
      targetCtx.lineTo(cx + halfBottom, stemBottom - 1.7 * scale);
      targetCtx.quadraticCurveTo(
        cx + halfBottom,
        stemBottom,
        cx + 0.2 * scale,
        stemBottom + 0.5 * scale,
      );
      targetCtx.quadraticCurveTo(
        cx - halfBottom,
        stemBottom,
        cx - halfBottom,
        stemBottom - 1.7 * scale,
      );
      targetCtx.lineTo(cx - 3.3 * scale, cy + 3.6 * scale);
      targetCtx.closePath();
      targetCtx.fill();

      // Small clipped shoulder keeps the monogram custom rather than font-like.
      targetCtx.beginPath();
      targetCtx.moveTo(cx + 7.0 * scale, topY + crossHeight - 0.1 * scale);
      targetCtx.lineTo(cx + 11.8 * scale, topY + crossHeight - 0.1 * scale);
      targetCtx.lineTo(cx + 10.0 * scale, topY + crossHeight + 1.95 * scale);
      targetCtx.lineTo(cx + 7.0 * scale, topY + crossHeight + 1.05 * scale);
      targetCtx.closePath();
      targetCtx.fill();
    }

    function punchCustomT(maskCtx, width, height) {
      traceCustomT(maskCtx, width, height);
    }

    function drawForegroundT(width, height) {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) / 52;
      const gradient = ctx.createLinearGradient(
        cx - 12 * scale,
        cy - 13 * scale,
        cx + 12 * scale,
        cy + 14 * scale,
      );
      gradient.addColorStop(0, '#6b4cff');
      gradient.addColorStop(0.48, '#4f69ff');
      gradient.addColorStop(1, '#27c7ef');

      ctx.save();
      ctx.globalAlpha = pointer.active ? 0.98 : 0.92;
      ctx.fillStyle = gradient;
      ctx.shadowColor = 'rgba(80, 84, 220, 0.28)';
      ctx.shadowBlur = pointer.active ? 7 * scale : 4.5 * scale;
      ctx.shadowOffsetY = 0.7 * scale;
      traceCustomT(ctx, width, height);

      // A hairline white highlight keeps the T crisp on the pale gradient badge.
      ctx.globalAlpha = pointer.active ? 0.34 : 0.24;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.55, 0.65 * scale);
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.moveTo(cx - 8.5 * scale, cy - 13.1 * scale);
      ctx.lineTo(cx + 7.8 * scale, cy - 13.1 * scale);
      ctx.stroke();
      ctx.restore();
    }

    function buildParticles(width, height) {
      const mask = document.createElement('canvas');
      mask.width = Math.max(1, Math.floor(width));
      mask.height = Math.max(1, Math.floor(height));
      const mctx = mask.getContext('2d', { willReadFrequently: true });
      if (!mctx) return;

      mctx.clearRect(0, 0, mask.width, mask.height);
      mctx.fillStyle = '#fff';
      drawSquareSeal(mctx, width, height);
      mctx.globalCompositeOperation = 'destination-out';
      punchCustomT(mctx, width, height);
      mctx.globalCompositeOperation = 'source-over';

      const data = mctx.getImageData(0, 0, mask.width, mask.height).data;
      const next = [];
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(width, height) * 0.42;

      for (let y = 1; y < mask.height - 1; y += SAMPLE_GAP) {
        for (let x = 1; x < mask.width - 1; x += SAMPLE_GAP) {
          const alpha = data[(y * mask.width + x) * 4 + 3];
          if (alpha < 105) continue;

          const seed = x * 131 + y * 977;
          const randomA = hash01(seed);
          const randomB = hash01(seed + 19);
          const randomC = hash01(seed + 73);
          const randomD = hash01(seed + 149);
          const dx = x - cx;
          const dy = y - cy;
          const distance = Math.hypot(dx, dy) / maxRadius;
          const edgeFade = Math.max(0.36, 1 - Math.max(0, distance - 0.72) * 1.8);
          const homeX = x + (randomA - 0.5) * 0.82;
          const homeY = y + (randomB - 0.5) * 0.82;
          const size = 0.78 + randomC * 0.62;
          const particleAlpha = (0.38 + randomD * 0.46) * edgeFade;
          const selector = Math.floor(randomA * 12);
          const kind = selector < 8 ? 0 : selector < 10 ? 1 : 2;
          const angle = kind === 0 ? 0 : (randomB - 0.5) * 1.08;
          const mix = Math.max(0, Math.min(1, ((dx + dy) / (maxRadius * 2)) + 0.5 + (randomD - 0.5) * 0.12));

          next.push(new Particle({
            x: homeX,
            y: homeY,
            size,
            alpha: particleAlpha,
            kind,
            angle,
            mix,
            halo: false,
            phase: randomA * Math.PI * 2,
          }));
        }
      }

      const haloCount = Math.max(12, Math.round(Math.min(width, height) * 0.28));
      const side = Math.min(width, height) * 0.78;
      const left = (width - side) / 2;
      const top = (height - side) / 2;
      for (let index = 0; index < haloCount; index += 1) {
        const randomA = hash01(index * 97 + 11);
        const randomB = hash01(index * 131 + 23);
        const randomC = hash01(index * 149 + 37);
        const edge = index % 4;
        let x;
        let y;
        if (edge === 0) {
          x = left + randomA * side;
          y = top - 0.6 + randomB * 1.6;
        } else if (edge === 1) {
          x = left + side - 0.6 + randomB * 1.6;
          y = top + randomA * side;
        } else if (edge === 2) {
          x = left + randomA * side;
          y = top + side - 0.6 + randomB * 1.6;
        } else {
          x = left - 0.6 + randomB * 1.6;
          y = top + randomA * side;
        }
        const mix = Math.max(0, Math.min(1, ((x - cx + y - cy) / (maxRadius * 2)) + 0.5));
        next.push(new Particle({
          x,
          y,
          size: 0.62 + randomC * 0.4,
          alpha: 0.16 + randomA * 0.18,
          kind: randomB > 0.82 ? 1 : 0,
          angle: (randomC - 0.5) * 0.8,
          mix,
          halo: true,
          phase: randomB * Math.PI * 2,
        }));
      }

      particles = next;
      startedAt = performance.now();
    }

    function getPalette() {
      return {
        start: readCssColor(host, '--particle-start', '#7a5cff'),
        end: readCssColor(host, '--particle-end', '#33d1ff'),
      };
    }

    function draw(update = true, now = performance.now()) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const palette = getPalette();
      const elapsed = now - startedAt;
      if (update) particles.forEach((particle) => particle.update());
      particles.forEach((particle) => particle.draw(palette, elapsed));
      drawForegroundT(rect.width, rect.height);
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
      aria-label="Gradient T particle badge"
      title="T"
    >
      <canvas ref={canvasRef} className="brian-pulse-logo__canvas" aria-hidden="true" />
      <span className="brian-pulse-logo__fallback">T</span>
    </div>
  );
}
