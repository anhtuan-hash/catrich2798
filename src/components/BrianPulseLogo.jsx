import React, { useEffect, useRef } from 'react';
import './BrianPulseLogo.css';

const BG_GAP = 2;
const STAR_GAP = 1.55;
const FIELD_RADIUS = 20;
const FIELD_FORCE = 3.8;
const SPRING_BG = 0.062;
const SPRING_STAR = 0.09;
const FRICTION = 0.845;
const SETTLE_MS = 360;

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

function drawSparklePath(ctx, cx, cy, outerRadius, innerRadius) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  ctx.lineTo(cx + innerRadius, cy - innerRadius);
  ctx.lineTo(cx + outerRadius, cy);
  ctx.lineTo(cx + innerRadius, cy + innerRadius);
  ctx.lineTo(cx, cy + outerRadius);
  ctx.lineTo(cx - innerRadius, cy + innerRadius);
  ctx.lineTo(cx - outerRadius, cy);
  ctx.lineTo(cx - innerRadius, cy - innerRadius);
  ctx.closePath();
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
    let renderWidth = 1;
    let renderHeight = 1;
    let cachedPalette = null;
    let pointerRect = null;
    let settleUntil = 0;

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
            const roleBoost = this.role === 'star' ? 1.2 : 1;
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
        const spring = this.role === 'star' ? SPRING_STAR : SPRING_BG;
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

      reset() {
        this.x = this.homeX;
        this.y = this.homeY;
        this.vx = 0;
        this.vy = 0;
        this.rotation = this.angle;
        this.rotationVelocity = 0;
        this.pointerEnergy = 0;
      }

      draw(palette, elapsed) {
        const isStar = this.role === 'star';
        const shimmer = reduceMotion
          ? 1
          : 0.96 + Math.sin(elapsed * 0.00125 + this.phase) * (isStar ? 0.055 : 0.02);
        const hoverLift = 1 + this.pointerEnergy * (isStar ? 0.26 : 0.12);
        const alpha = Math.min(1, this.alpha * shimmer * hoverLift);
        const baseTone = isStar
          ? Math.min(1, 0.08 + this.tone * 0.72)
          : Math.min(1, 0.26 + this.tone * 0.66);
        const fill = isStar
          ? mixColor(palette.starStart, palette.starEnd, baseTone)
          : mixColor(palette.bgStart, palette.bgEnd, baseTone);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fill;

        if (isStar) {
          ctx.shadowColor = 'rgba(127, 218, 255, 0.72)';
          ctx.shadowBlur = 2.5 + this.pointerEnergy * 4;
        }

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

    function drawStarMask(maskCtx, width, height) {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) / 54;
      const outer = 14.8 * scale;
      const inner = 4.25 * scale;
      drawSparklePath(maskCtx, cx, cy, outer, inner);
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

          const isStar = role === 'star';
          const seed = Math.floor(x * 151 + y * 977 + (isStar ? 991 : 0));
          const a = hash01(seed);
          const b = hash01(seed + 29);
          const c = hash01(seed + 83);
          const d = hash01(seed + 173);
          if (role === 'bg' && a < 0.08) continue;

          const dx = x - cx;
          const dy = y - cy;
          const tone = Math.max(0, Math.min(1, (dx + dy) / (max * 1.55) + 0.5 + (d - 0.5) * 0.08));
          const jitter = isStar ? 0.28 : 0.72;
          const size = isStar ? 1.08 + c * 0.6 : 0.72 + c * 0.48;
          const particleAlpha = isStar ? 0.82 + d * 0.18 : 0.24 + d * 0.30;
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
      const starCanvas = document.createElement('canvas');
      starCanvas.width = w;
      starCanvas.height = h;
      const starCtx = starCanvas.getContext('2d', { willReadFrequently: true });
      if (!bgCtx || !starCtx) return;

      bgCtx.fillStyle = '#fff';
      drawSquareMask(bgCtx, w, h);
      starCtx.fillStyle = '#fff';
      drawStarMask(starCtx, w, h);

      const backgroundParticles = sampleMask(bgCtx, w, h, BG_GAP, 'bg');
      const starParticles = sampleMask(starCtx, w, h, STAR_GAP, 'star');
      particles = [...backgroundParticles, ...starParticles];
      startedAt = performance.now();
    }

    function getPalette() {
      return {
        bgStart: readCssColor(host, '--particle-bg-start', '#a79bf8'),
        bgEnd: readCssColor(host, '--particle-bg-end', '#87d9ed'),
        starStart: readCssColor(host, '--particle-star-start', '#ffffff'),
        starEnd: readCssColor(host, '--particle-star-end', '#79d9ff'),
      };
    }

    function drawStarAura(width, height, elapsed) {
      const cx = width / 2;
      const cy = height / 2;
      const breath = reduceMotion ? 0.55 : 0.55 + Math.sin(elapsed * 0.0019) * 0.16;
      const radius = Math.min(width, height) * (0.32 + breath * 0.035);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(210, 245, 255, ${0.18 + breath * 0.1})`);
      gradient.addColorStop(0.42, `rgba(104, 210, 255, ${0.09 + breath * 0.05})`);
      gradient.addColorStop(1, 'rgba(91, 174, 255, 0)');
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
    }

    function drawSatelliteSparkles(width, height, elapsed) {
      const cx = width / 2;
      const cy = height / 2;
      const base = Math.min(width, height) / 54;
      const sparkles = [
        { x: -13.2, y: -10.8, r: 2.2, phase: 0.2 },
        { x: 13.6, y: -7.2, r: 1.7, phase: 2.2 },
        { x: 11.7, y: 12.4, r: 1.35, phase: 4.1 },
      ];

      ctx.save();
      sparkles.forEach((spark) => {
        const twinkle = reduceMotion ? 0.7 : 0.62 + Math.sin(elapsed * 0.0026 + spark.phase) * 0.28;
        const outer = spark.r * base * (0.92 + twinkle * 0.12);
        const inner = outer * 0.28;
        ctx.globalAlpha = Math.max(0.18, twinkle);
        ctx.fillStyle = '#effcff';
        ctx.shadowColor = 'rgba(103, 215, 255, 0.92)';
        ctx.shadowBlur = 5 * base;
        drawSparklePath(ctx, cx + spark.x * base, cy + spark.y * base, outer, inner);
        ctx.fill();
      });
      ctx.restore();
    }

    function draw(update = true, now = performance.now()) {
      ctx.clearRect(0, 0, renderWidth, renderHeight);
      const palette = cachedPalette || getPalette();
      const elapsed = now - startedAt;
      drawStarAura(renderWidth, renderHeight, elapsed);
      if (update) particles.forEach((particle) => particle.update());
      particles.forEach((particle) => particle.draw(palette, elapsed));
      drawSatelliteSparkles(renderWidth, renderHeight, elapsed);
      ctx.globalAlpha = 1;
    }

    function resetParticles() {
      particles.forEach((particle) => particle.reset());
      pointer.speed = 0;
    }

    function stopAnimation() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    function startAnimation() {
      if (reduceMotion || disposed || document.hidden || frameId) return;
      frameId = window.requestAnimationFrame(animate);
    }

    function animate(now) {
      frameId = 0;
      if (disposed || document.hidden) return;

      pointer.speed *= 0.88;
      draw(true, now);

      if (pointer.active || now < settleUntil) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      resetParticles();
      draw(false, now);
    }

    function resize() {
      const rect = host.getBoundingClientRect();
      renderWidth = Math.max(1, rect.width);
      renderHeight = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(renderWidth * dpr);
      canvas.height = Math.round(renderHeight * dpr);
      canvas.style.width = `${renderWidth}px`;
      canvas.style.height = `${renderHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cachedPalette = getPalette();
      pointerRect = null;
      buildParticles(renderWidth, renderHeight);
      draw(false);
      if (pointer.active) startAnimation();
    }

    function updatePointer(event) {
      if (reduceMotion) return;
      const rect = pointerRect || canvas.getBoundingClientRect();
      pointerRect = rect;
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
      pointerRect = canvas.getBoundingClientRect();
      pointer.lastX = event.clientX - pointerRect.left;
      pointer.lastY = event.clientY - pointerRect.top;
      pointer.speed = 0;
      settleUntil = 0;
      updatePointer(event);
      startAnimation();
    }

    function onPointerMove(event) {
      updatePointer(event);
      startAnimation();
    }

    function onPointerLeave() {
      pointer.active = false;
      pointer.speed = 0;
      pointerRect = null;
      settleUntil = performance.now() + SETTLE_MS;
      startAnimation();
    }

    function onVisibilityChange() {
      if (document.hidden) {
        pointer.active = false;
        pointerRect = null;
        stopAnimation();
        return;
      }
      resetParticles();
      draw(false);
    }

    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();

    return () => {
      disposed = true;
      stopAnimation();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return React.createElement(
    'div',
    {
      ref: hostRef,
      className: `brian-pulse-logo ${className}`.trim(),
      role: 'img',
      'aria-label': 'Glowing particle star badge',
      title: 'Star',
    },
    React.createElement('canvas', {
      ref: canvasRef,
      className: 'brian-pulse-logo__canvas',
      'aria-hidden': 'true',
    }),
    React.createElement('span', { className: 'brian-pulse-logo__fallback' }, '✦'),
  );
}
