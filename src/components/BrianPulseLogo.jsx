import React, { useEffect, useRef } from 'react';
import './BrianPulseLogo.css';

const LETTER = 'T';
const SAMPLE_GAP = 2;
const FIELD_RADIUS = 19;
const FIELD_FORCE = 3.4;
const SPRING = 0.072;
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

    const pointer = {
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      speed: 0,
      active: false,
    };

    class Particle {
      constructor(x, y, size, alpha, kind, angle) {
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
        this.rotation = angle;
        this.rotationVelocity = 0;
      }

      update() {
        if (pointer.active) {
          const dx = this.x - pointer.x;
          const dy = this.y - pointer.y;
          const distanceSquared = dx * dx + dy * dy;
          const radiusSquared = FIELD_RADIUS * FIELD_RADIUS;

          if (distanceSquared > 0.001 && distanceSquared < radiusSquared) {
            const distance = Math.sqrt(distanceSquared);
            const proximity = 1 - distance / FIELD_RADIUS;
            const curve = proximity * proximity;
            const strength = curve * (FIELD_FORCE + Math.min(pointer.speed * 0.055, 2.4));
            const nx = dx / distance;
            const ny = dy / distance;

            // Radial push plus a tiny tangential drift makes the field feel less
            // mechanical and closer to the liquid/magnetic motion of dqnotes.
            this.vx += nx * strength + -ny * strength * 0.14;
            this.vy += ny * strength + nx * strength * 0.14;
            this.rotationVelocity += (nx - ny) * strength * 0.025;
          }
        }

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

      draw(ink) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = ink;

        if (this.kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, this.size * 0.48, 0, Math.PI * 2);
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
      const radius = Math.min(width, height) * 0.425;
      const points = 30;

      maskCtx.beginPath();
      for (let index = 0; index < points; index += 1) {
        const angle = (index / points) * Math.PI * 2;
        const wobble =
          1
          + Math.sin(angle * 3 + 0.8) * 0.026
          + Math.sin(angle * 7 - 0.35) * 0.017;
        const rx = radius * wobble * 1.02;
        const ry = radius * wobble * 0.98;
        const x = cx + Math.cos(angle) * rx;
        const y = cy + Math.sin(angle) * ry;
        if (index === 0) maskCtx.moveTo(x, y);
        else maskCtx.lineTo(x, y);
      }
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

      // Punch the T out of the particle field. The original dqnotes mark reads as
      // a dark/negative monogram inside a dense stippled seal rather than as a
      // dotted letter floating on its own.
      mctx.globalCompositeOperation = 'destination-out';
      const fontSize = Math.max(22, Math.min(31, height * 0.61));
      mctx.textAlign = 'center';
      mctx.textBaseline = 'middle';
      mctx.font = `900 ${fontSize}px Inter, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
      mctx.fillText(LETTER, width / 2, height / 2 + 1.1);
      mctx.globalCompositeOperation = 'source-over';

      const data = mctx.getImageData(0, 0, mask.width, mask.height).data;
      const next = [];
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(width, height) * 0.46;

      for (let y = 1; y < mask.height - 1; y += SAMPLE_GAP) {
        for (let x = 1; x < mask.width - 1; x += SAMPLE_GAP) {
          const alpha = data[(y * mask.width + x) * 4 + 3];
          if (alpha < 105) continue;

          const seed = x * 131 + y * 977;
          const randomA = hash01(seed);
          const randomB = hash01(seed + 19);
          const randomC = hash01(seed + 73);
          const randomD = hash01(seed + 149);
          const distance = Math.hypot(x - cx, y - cy) / maxRadius;
          const edgeFade = Math.max(0.34, 1 - Math.max(0, distance - 0.68) * 1.55);

          // Micro jitter breaks the visible square raster and produces the dusty,
          // print-like stipple texture of the reference mark.
          const homeX = x + (randomA - 0.5) * 0.85;
          const homeY = y + (randomB - 0.5) * 0.85;
          const size = 0.78 + randomC * 0.62;
          const particleAlpha = (0.42 + randomD * 0.5) * edgeFade;

          const selector = Math.floor(randomA * 12);
          const kind = selector < 8 ? 0 : selector < 10 ? 1 : 2;
          const angle = kind === 0 ? 0 : (randomB - 0.5) * 1.15;
          next.push(new Particle(homeX, homeY, size, particleAlpha, kind, angle));
        }
      }

      particles = next;
    }

    function getInk() {
      return getComputedStyle(host).color || '#3e4d46';
    }

    function draw(update = true) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const ink = getInk();

      if (update) particles.forEach((particle) => particle.update());
      particles.forEach((particle) => particle.draw(ink));
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

    function animate() {
      if (disposed) return;
      pointer.speed *= 0.87;
      draw(true);
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
