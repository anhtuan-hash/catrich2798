import React, { useEffect, useRef } from 'react';
import './BrianPulseLogo.css';

const TEXT = 'CATRICHMAUXANH';
const PARTICLE_GAP = 2;
const FIELD_RADIUS = 42;
const FIELD_FORCE = 3.8;
const SPRING = 0.085;
const FRICTION = 0.82;

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

export default function BrianPulseLogo({ className = '' }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    let particles = [];
    let frameId = 0;
    let resizeObserver = null;
    let disposed = false;
    let ink = getComputedStyle(wrap).color || '#ffffff';
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const pointer = {
      x: 0,
      y: 0,
      previousX: 0,
      previousY: 0,
      speed: 0,
      active: false,
    };

    class Particle {
      constructor(x, y, size, kind, angle, alpha) {
        this.x = x;
        this.y = y;
        this.homeX = x;
        this.homeY = y;
        this.vx = 0;
        this.vy = 0;
        this.size = size;
        this.kind = kind;
        this.angle = angle;
        this.alpha = alpha;
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
            const magneticStrength =
              proximity * proximity * (FIELD_FORCE + Math.min(pointer.speed * 0.035, 2.6));
            const normalX = dx / distance;
            const normalY = dy / distance;

            this.vx += normalX * magneticStrength;
            this.vy += normalY * magneticStrength;
            this.rotationVelocity += (normalX - normalY) * magneticStrength * 0.015;
          }
        }

        this.vx += (this.homeX - this.x) * SPRING;
        this.vy += (this.homeY - this.y) * SPRING;
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.rotationVelocity *= 0.84;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationVelocity;
        this.rotation += (this.angle - this.rotation) * 0.075;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = ink;

        if (this.kind === 0) {
          ctx.beginPath();
          ctx.arc(0, 0, this.size * 0.52, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.kind === 1) {
          const width = this.size * 1.55;
          const height = this.size * 0.56;
          roundedRect(ctx, -width / 2, -height / 2, width, height, height / 2);
          ctx.fill();
        } else {
          const width = this.size * 0.54;
          const height = this.size * 1.42;
          roundedRect(ctx, -width / 2, -height / 2, width, height, width / 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    function buildParticles(width, height) {
      const buffer = document.createElement('canvas');
      buffer.width = Math.max(1, Math.floor(width));
      buffer.height = Math.max(1, Math.floor(height));
      const bufferCtx = buffer.getContext('2d', { willReadFrequently: true });
      if (!bufferCtx) return;

      const fontSize = Math.max(15, Math.min(22, height * 0.52));
      const fontFamily = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif';
      bufferCtx.font = `900 ${fontSize}px ${fontFamily}`;
      bufferCtx.textAlign = 'center';
      bufferCtx.textBaseline = 'middle';
      bufferCtx.fillStyle = '#ffffff';

      const measuredWidth = Math.max(1, bufferCtx.measureText(TEXT).width);
      const horizontalScale = Math.min(1, (width * 0.94) / measuredWidth);

      bufferCtx.save();
      bufferCtx.translate(width / 2, height / 2 + 0.5);
      bufferCtx.scale(horizontalScale, 1);
      bufferCtx.fillText(TEXT, 0, 0);
      bufferCtx.restore();

      const pixels = bufferCtx.getImageData(0, 0, buffer.width, buffer.height).data;
      const next = [];

      for (let y = 0; y < buffer.height; y += PARTICLE_GAP) {
        for (let x = 0; x < buffer.width; x += PARTICLE_GAP) {
          const alpha = pixels[(y * buffer.width + x) * 4 + 3];
          if (alpha < 105) continue;

          const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
          const selector = hash % 10;
          const kind = selector < 7 ? 0 : selector < 9 ? 1 : 2;
          const size = 1.18 + ((hash >> 7) % 4) * 0.13;
          const angle = kind === 0 ? 0 : ((((hash >> 4) % 7) - 3) * Math.PI) / 24;
          const particleAlpha = 0.58 + ((hash >> 11) % 5) * 0.085;

          next.push(new Particle(x, y, size, kind, angle, particleAlpha));
        }
      }

      particles = next;
    }

    function drawFrame(updateParticles = true) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (updateParticles) {
        for (const particle of particles) particle.update();
      }
      for (const particle of particles) particle.draw();
    }

    function resize() {
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ink = getComputedStyle(wrap).color || '#ffffff';
      buildParticles(width, height);
      drawFrame(false);
    }

    function animate() {
      if (disposed) return;
      ink = getComputedStyle(wrap).color || ink;
      pointer.speed *= 0.88;
      drawFrame(true);
      frameId = window.requestAnimationFrame(animate);
    }

    function onPointerMove(event) {
      if (reduceMotion) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = x - pointer.previousX;
      const dy = y - pointer.previousY;

      pointer.x = x;
      pointer.y = y;
      pointer.speed = Math.sqrt(dx * dx + dy * dy);
      pointer.previousX = x;
      pointer.previousY = y;
      pointer.active = true;
    }

    function onPointerEnter(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.previousX = event.clientX - rect.left;
      pointer.previousY = event.clientY - rect.top;
      onPointerMove(event);
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
      resizeObserver.observe(wrap);
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
      ref={wrapRef}
      className={`brian-pulse-logo ${className}`.trim()}
      role="img"
      aria-label={TEXT}
      title="CATRICHMAUXANH"
    >
      <canvas ref={canvasRef} className="brian-pulse-logo__canvas" aria-hidden="true" />
      <span className="brian-pulse-logo__fallback">{TEXT}</span>
    </div>
  );
}
