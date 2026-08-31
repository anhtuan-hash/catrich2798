import React, { useEffect, useRef } from 'react';
import './BrianPulseLogo.css';

const BG_GAP = 2;
const T_GAP = 1.7;
const FIELD_RADIUS = 20;
const FIELD_FORCE = 3.8;
const SPRING_BG = 0.062;
const SPRING_T = 0.082;
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
  const value = String(getComputedStyle(element).getPropertyValue(variable) || '').trim();
  return value || fallback;
}

function parseHex(hex) {
  const raw = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function mixColor(a, b, t) {
  const left = parseHex(a);
  const right = parseHex(b);
  if (!left || !right) return t < 0.5 ? a : b;
  const p = Math.max(0, Math.min(1, t));
  const r = Math.round(left.r + (right.r - left.r) * p);
  const g = Math.round(left.g + (right.g - left.g) * p);
  const bl = Math.round(left.b + (right.b - left.b) * p);
  return `rgb(${r}, ${g}, ${bl})`;
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

    const pointer = { x: 0, y: 0, lastX: 0, lastY: 0, speed: 0, active: false };

    class Particle {
      constructor({ x, y, size, alpha, kind, angle, tone, role, phase }) {
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
        this.tone = tone;
        this.role = role;
        this.phase = phase;
        this.rotation = angle;
        this.rotationVelocity = 0;
        this.pointerEnergy = 0;
      }

      update() {
        let energy = 0;
        if (pointer.active) {
          const dx = this.x - pointer.x;
          const dy = this.y - pointer.y;
          const distanceSq = dx * dx + dy * dy;
          const radiusSq = FIELD_RADIUS * FIELD_RADIUS;
          if (distanceSq > 0.001 && distanceSq < radiusSq) {
            const distance = Math.sqrt(distanceSq);
            const proximity = 1 - distance / FIELD_RADIUS;
            const curve = proximity * proximity;
            const roleBoost = this.role === 't' ? 1.18 : 1;
            const strength = curve * (FIELD_FORCE + Math.min(pointer.speed * 0.055, 2.5)) * roleBoost;
            const nx = dx / distance;
            const ny = dy / distance;
            this.vx += nx * strength - ny * strength * 0.15;
            this.vy += ny * strength + nx * strength * 0.15;
            this.rotationVelocity += (nx - ny) * strength * 0.02;
            energy = proximity;
          }
        }

        this.pointerEnergy += (energy - this.pointerEnergy) * 0.22;
        const spring = this.role === 't' ? SPRING_T : SPRING_BG;
        this.vx += (this.homeX - this.x) * spring;
        this.vy += (this.homeY - this.y) * spring;
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.rotationVelocity *= 0.86;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationVelocity;
        this.rotation += (this.angle - this.rotation) * 0.075;
      }

      draw(palette, elapsed) {
        const shimmer = reduceMotion
          ? 1
          : 0.965 + Math.sin(elapsed * 0.00115 + this.phase) * (this.role === 't' ? 0.035 : 0.02);
        const hoverLift = 1 + this.pointerEnergy * (this.role === 't' ? 0.22 : 0.12);
        const alpha = Math.min(1, this.alpha * shimmer * hoverLift);
        const baseTone = this.role === 't'
          ? Math.min(1, 0.12 + this.tone * 0.72)
          : Math.min(1, 0.26 + this.tone * 0.66);
        const fill = this.role === 't'
          ? mixColor(palette.tStart, palette.tEnd, baseTone)
          : mixColor(palette.bgStart, palette.bgEnd, baseTone);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;

        if (this.kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.kind === 1) {
          const width = this.size * 1.55;
          const height = this.size * 0.56;
          roundedRect(ctx, -width / 2, -height / 2, width, height, height / 2);
          ctx.fill();
        } else {
          const width = this.size * 0.58;
          const height = this.size * 1.38;
          roundedRect(ctx, -width / 2, -height / 2, width, height, width / 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawSquareMask(maskCtx, width, height) {
      const side = Math.min(width, height) * 0.78;
      const left = (width - side) / 2;
      const top = (height - side) / 2;
      roundedRect(maskCtx, left, top, side, side, side * 0.24);
      maskCtx.fill();
    }

    function drawTMask(maskCtx, width, height) {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) / 52;
      const topY = cy - 14.1 * scale;
      const barWidth = 25.0 * scale;
      const barHeight = 5.65 * scale;
      roundedRect(maskCtx, cx - barWidth / 2, topY, barWidth, barHeight, 2.5 * scale);
      maskCtx.fill();

      const stemTop = topY + 3.8 * scale;
      const stemBottom = cy + 14.0 * scale;
      const topHalf = 4.0 * scale;
      const bottomHalf = 2.75 * scale;
      maskCtx.beginPath();
      maskCtx.moveTo(cx - topHalf, stemTop);
      maskCtx.lineTo(cx + topHalf, stemTop);
      maskCtx.lineTo(cx + 3.25 * scale, cy + 3.6 * scale);
      maskCtx.lineTo(cx + bottomHalf, stemBottom - 1.7 * scale);
      maskCtx.quadraticCurveTo(cx + bottomHalf, stemBottom, cx + 0.15 * scale, stemBottom + 0.5 * scale);
      maskCtx.quadraticCurveTo(cx - bottomHalf, stemBottom, cx - bottomHalf, stemBottom - 1.7 * scale);
      maskCtx.lineTo(cx - 3.2 * scale, cy + 3.6 * scale);
      maskCtx.closePath();
      maskCtx.fill();

      maskCtx.beginPath();
      maskCtx.moveTo(cx + 7.0 * scale, topY + barHeight - 0.1 * scale);
      maskCtx.lineTo(cx + 11.6 * scale, topY + barHeight - 0.1 * scale);
      maskCtx.lineTo(cx + 9.9 * scale, topY + barHeight + 1.9 * scale);
      maskCtx.lineTo(cx + 7.0 * scale, topY + barHeight + 1.0 * scale);
      maskCtx.closePath();
      maskCtx.fill();
    }

    function sampleMask(maskCtx, width, height, gap, role) {
      const data = maskCtx.getImageData(0, 0, width, height).data;
      const result = [];
      const cx = width / 2;
      const cy = height / 2;
      const max = Math.max(1, Math.min(width, height) * 0.5);

      for (let y = 1; y < height - 1; y += gap) {
        for (let x = 1; x < width - 1; x += gap) {
          const alpha = data[(Math.floor(y) * width + Math.floor(x)) * 4 + 3];
          if (alpha < 100) continue;

          const seed = Math.floor(x * 151 + y * 977 + (role === 't' ? 991 : 0));
          const a = hash01(seed);
          const b = hash01(seed + 29);
          const c = hash01(seed + 83);
          const d = hash01(seed + 173);
          if (role === 'bg' && a < 0.08) continue;

          const dx = x - cx;
          const dy = y - cy;
          const tone = Math.max(0, Math.min(1, (dx + dy) / (max * 1.55) + 0.5 + (d - 0.5) * 0.08));
          const jitter = role === 't' ? 0.34 : 0.72;
          const size = role === 't' ? 1.02 + c * 0.56 : 0.72 + c * 0.48;
          const particleAlpha = role === 't' ? 0.76 + d * 0.22 : 0.24 + d * 0.30;
          const selector = Math.floor(a * 12);
          const kind = selector < 8 ? 0 : selector < 10 ? 1 : 2;
          const angle = kind === 0 ? 0 : (b - 0.5) * 0.96;

          result.push(new Particle({
            x: x + (a - 0.5) * jitter,
            y: y + (b - 0.5) * jitter,
            size,
            alpha: particleAlpha,
            kind,
            angle,
            tone,
            role,
            phase: a * Math.PI * 2,
          }));
        }
      }
      return result;
    }

    function buildParticles(width, height) {
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = w;
      bgCanvas.height = h;
      const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
      const tCanvas = document.createElement('canvas');
      tCanvas.width = w;
      tCanvas.height = h;
      const tCtx = tCanvas.getContext('2d', { willReadFrequently: true });
      if (!bgCtx || !tCtx) return;

      bgCtx.fillStyle = '#fff';
      drawSquareMask(bgCtx, w, h);
      tCtx.fillStyle = '#fff';
      drawTMask(tCtx, w, h);

      const backgroundParticles = sampleMask(bgCtx, w, h, BG_GAP, 'bg');
      const tParticles = sampleMask(tCtx, w, h, T_GAP, 't');
      particles = [...backgroundParticles, ...tParticles];
      startedAt = performance.now();
    }

    function getPalette() {
      return {
        bgStart: readCssColor(host, '--particle-bg-start', '#a79bf8'),
        bgEnd: readCssColor(host, '--particle-bg-end', '#87d9ed'),
        tStart: readCssColor(host, '--particle-t-start', '#6654ff'),
        tEnd: readCssColor(host, '--particle-t-end', '#32c7f4'),
      };
    }

    function draw(update = true, now = performance.now()) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const palette = getPalette();
      const elapsed = now - startedAt;
      if (update) particles.forEach((particle) => particle.update());
      particles.forEach((particle) => particle.draw(palette, elapsed));
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
      pointer.speed *= 0.88;
      draw(true, now);
      frameId = window.requestAnimationFrame(animate);
    }

    function updatePointer(event) {
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

    function onPointerEnter(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.lastX = event.clientX - rect.left;
      pointer.lastY = event.clientY - rect.top;
      pointer.speed = 0;
      updatePointer(event);
    }

    function onPointerLeave() {
      pointer.active = false;
      pointer.speed = 0;
    }

    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointermove', updatePointer);
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
      canvas.removeEventListener('pointermove', updatePointer);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`brian-pulse-logo ${className}`.trim()}
      role="img"
      aria-label="Magnetic particle T badge"
      title="T"
    >
      <canvas ref={canvasRef} className="brian-pulse-logo__canvas" aria-hidden="true" />
      <span className="brian-pulse-logo__fallback">T</span>
    </div>
  );
}
