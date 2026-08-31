import React, { useEffect, useRef } from 'react';
import './BrianPulseLogo.css';

const LETTER = 'T';
const SAMPLE_GAP = 2;
const FIELD_RADIUS = 25;
const FIELD_FORCE = 2.9;
const SPRING = 0.095;
const FRICTION = 0.80;

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
      constructor(x, y, radius, alpha) {
        this.x = x;
        this.y = y;
        this.homeX = x;
        this.homeY = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = radius;
        this.alpha = alpha;
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
            const strength =
              proximity * proximity *
              (FIELD_FORCE + Math.min(pointer.speed * 0.045, 2.2));

            this.vx += (dx / distance) * strength;
            this.vy += (dy / distance) * strength;
          }
        }

        this.vx += (this.homeX - this.x) * SPRING;
        this.vy += (this.homeY - this.y) * SPRING;
        this.vx *= FRICTION;
        this.vy *= FRICTION;
        this.x += this.vx;
        this.y += this.vy;
      }

      draw(ink) {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function buildParticles(width, height) {
      const buffer = document.createElement('canvas');
      buffer.width = Math.max(1, Math.floor(width));
      buffer.height = Math.max(1, Math.floor(height));
      const bctx = buffer.getContext('2d', { willReadFrequently: true });
      if (!bctx) return;

      const fontSize = Math.max(26, Math.min(34, height * 0.78));
      bctx.clearRect(0, 0, buffer.width, buffer.height);
      bctx.fillStyle = '#fff';
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.font = `900 ${fontSize}px Inter, "SF Pro Display", "Segoe UI", Arial, sans-serif`;
      bctx.fillText(LETTER, width / 2, height / 2 + 0.8);

      const data = bctx.getImageData(0, 0, buffer.width, buffer.height).data;
      const next = [];

      for (let y = 0; y < buffer.height; y += SAMPLE_GAP) {
        for (let x = 0; x < buffer.width; x += SAMPLE_GAP) {
          const alpha = data[(y * buffer.width + x) * 4 + 3];
          if (alpha < 120) continue;

          const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
          const radius = 0.72 + ((hash >> 5) % 4) * 0.08;
          const particleAlpha = 0.62 + ((hash >> 9) % 5) * 0.075;
          next.push(new Particle(x, y, radius, particleAlpha));
        }
      }

      particles = next;
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

    function getInk() {
      return getComputedStyle(host).color || '#173326';
    }

    function draw(update = true) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const ink = getInk();

      if (update) particles.forEach((particle) => particle.update());
      particles.forEach((particle) => particle.draw(ink));
      ctx.globalAlpha = 1;
    }

    function animate() {
      if (disposed) return;
      pointer.speed *= 0.86;
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
      aria-label="T"
      title="T"
    >
      <canvas ref={canvasRef} className="brian-pulse-logo__canvas" aria-hidden="true" />
      <span className="brian-pulse-logo__fallback">T</span>
    </div>
  );
}
