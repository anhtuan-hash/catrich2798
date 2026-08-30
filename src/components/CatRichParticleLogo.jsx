import React, { useEffect, useRef } from 'react';
import './CatRichParticleLogo.css';

const DEFAULT_TEXT = 'catrich.mauxanh';
const TAU = Math.PI * 2;

function seededNoise(x, y, salt = 0) {
  const value = Math.sin((x * 12.9898) + (y * 78.233) + (salt * 37.719)) * 43758.5453;
  return value - Math.floor(value);
}

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

function drawParticle(ctx, particle, color) {
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.angle);
  ctx.fillStyle = color;

  if (particle.shape === 'capsule') {
    roundedRect(ctx, -particle.length / 2, -particle.thickness / 2, particle.length, particle.thickness, particle.thickness / 2);
    ctx.fill();
  } else if (particle.shape === 'dash') {
    roundedRect(ctx, -particle.length / 2, -particle.thickness / 2, particle.length, particle.thickness, Math.max(0.75, particle.thickness * 0.34));
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, particle.radius, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

function getParticleShape(x, y) {
  const value = seededNoise(x, y, 1);
  if (value < 0.64) return 'dot';
  if (value < 0.86) return 'capsule';
  return 'dash';
}

function getFontString(size, family) {
  return `800 ${size}px ${family}`;
}

function resolveFontSize(ctx, text, width, height, family) {
  let size = Math.min(height * 0.47, width * 0.105);
  size = Math.max(26, size);
  const maxWidth = width * 0.88;

  while (size > 20) {
    ctx.font = getFontString(size, family);
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  }
  return 20;
}

export default function CatRichParticleLogo({
  text = DEFAULT_TEXT,
  className = '',
  interactionRadius = 92,
  magneticStrength = 1.55,
  spring = 0.052,
  damping = 0.84,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const particles = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let frame = 0;
    let cssWidth = 0;
    let cssHeight = 0;
    let dpr = 1;
    let particleColor = '#155da9';
    let fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    let reducedMotion = reduceMotionQuery.matches;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;

    function renderStatic() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      particles.forEach((particle) => {
        particle.x = particle.homeX;
        particle.y = particle.homeY;
        particle.vx = 0;
        particle.vy = 0;
        drawParticle(ctx, particle, particleColor);
      });
    }

    function buildParticles() {
      const rect = host.getBoundingClientRect();
      cssWidth = Math.max(1, Math.round(rect.width));
      cssHeight = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const styles = window.getComputedStyle(host);
      particleColor = styles.color || '#155da9';
      fontFamily = styles.fontFamily || fontFamily;

      const source = document.createElement('canvas');
      source.width = cssWidth;
      source.height = cssHeight;
      const sourceCtx = source.getContext('2d', { willReadFrequently: true });
      if (!sourceCtx) return;

      sourceCtx.clearRect(0, 0, cssWidth, cssHeight);
      const fontSize = resolveFontSize(sourceCtx, text, cssWidth, cssHeight, fontFamily);
      sourceCtx.font = getFontString(fontSize, fontFamily);
      sourceCtx.textAlign = 'center';
      sourceCtx.textBaseline = 'middle';
      sourceCtx.fillStyle = '#fff';
      sourceCtx.fillText(text, cssWidth / 2, cssHeight / 2);

      const pixels = sourceCtx.getImageData(0, 0, cssWidth, cssHeight).data;
      particles.length = 0;

      const area = cssWidth * cssHeight;
      let gap = area > 250000 ? 5 : area > 130000 ? 4 : 3;
      const estimated = Math.ceil(cssWidth / gap) * Math.ceil(cssHeight / gap);
      if (estimated > 13500) gap += 1;

      const candidates = [];
      for (let y = gap; y < cssHeight - gap; y += gap) {
        for (let x = gap; x < cssWidth - gap; x += gap) {
          const alpha = pixels[((y * cssWidth) + x) * 4 + 3];
          if (alpha > 92) candidates.push([x, y, alpha]);
        }
      }

      const maxParticles = cssWidth < 600 ? 1500 : 2600;
      const stride = Math.max(1, Math.ceil(candidates.length / maxParticles));

      for (let index = 0; index < candidates.length; index += stride) {
        const [x, y, alpha] = candidates[index];
        const shape = getParticleShape(x, y);
        const n1 = seededNoise(x, y, 2);
        const n2 = seededNoise(x, y, 3);
        const angleBucket = Math.floor(seededNoise(x, y, 4) * 4);
        const angle = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4][angleBucket];
        const radius = 0.85 + (n1 * 0.9);
        const thickness = 1.5 + (n1 * 1.25);
        const length = shape === 'dash' ? 3.5 + (n2 * 3.6) : 4.5 + (n2 * 4.8);

        particles.push({
          x,
          y,
          homeX: x,
          homeY: y,
          vx: 0,
          vy: 0,
          radius,
          thickness,
          length,
          angle,
          shape,
          alpha: alpha / 255,
        });
      }

      if (reducedMotion) renderStatic();
    }

    function animate() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distanceSquared = (dx * dx) + (dy * dy);
          const radiusSquared = interactionRadius * interactionRadius;

          if (distanceSquared < radiusSquared && distanceSquared > 0.001) {
            const distance = Math.sqrt(distanceSquared);
            const nx = dx / distance;
            const ny = dy / distance;
            const normalized = 1 - (distance / interactionRadius);
            const force = normalized * normalized * magneticStrength;
            const cursorEnergy = Math.min(1.7, Math.hypot(pointerVelocityX, pointerVelocityY) * 0.045);

            particle.vx += nx * force * (1 + cursorEnergy);
            particle.vy += ny * force * (1 + cursorEnergy);
            particle.vx += (-ny * force * 0.14) + (pointerVelocityX * normalized * 0.0045);
            particle.vy += (nx * force * 0.14) + (pointerVelocityY * normalized * 0.0045);
          }
        }

        particle.vx += (particle.homeX - particle.x) * spring;
        particle.vy += (particle.homeY - particle.y) * spring;
        particle.vx *= damping;
        particle.vy *= damping;
        particle.x += particle.vx;
        particle.y += particle.vy;

        drawParticle(ctx, particle, particleColor);
      }

      pointerVelocityX *= 0.76;
      pointerVelocityY *= 0.76;
      frame = window.requestAnimationFrame(animate);
    }

    function updatePointer(event) {
      if (reducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      pointerVelocityX = nextX - lastPointerX;
      pointerVelocityY = nextY - lastPointerY;
      lastPointerX = nextX;
      lastPointerY = nextY;
      pointer.x = nextX;
      pointer.y = nextY;
      pointer.active = true;
    }

    function leavePointer() {
      pointer.active = false;
      pointerVelocityX = 0;
      pointerVelocityY = 0;
    }

    function onReducedMotionChange(event) {
      reducedMotion = event.matches;
      pointer.active = false;
      if (reducedMotion) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        renderStatic();
      } else if (!frame) {
        frame = window.requestAnimationFrame(animate);
      }
    }

    const resizeObserver = new ResizeObserver(() => buildParticles());
    resizeObserver.observe(host);
    buildParticles();

    canvas.addEventListener('pointermove', updatePointer, { passive: true });
    canvas.addEventListener('pointerenter', updatePointer, { passive: true });
    canvas.addEventListener('pointerleave', leavePointer, { passive: true });
    canvas.addEventListener('pointercancel', leavePointer, { passive: true });
    reduceMotionQuery.addEventListener?.('change', onReducedMotionChange);

    if (!reducedMotion) frame = window.requestAnimationFrame(animate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', updatePointer);
      canvas.removeEventListener('pointerenter', updatePointer);
      canvas.removeEventListener('pointerleave', leavePointer);
      canvas.removeEventListener('pointercancel', leavePointer);
      reduceMotionQuery.removeEventListener?.('change', onReducedMotionChange);
    };
  }, [text, interactionRadius, magneticStrength, spring, damping]);

  return (
    <div
      ref={hostRef}
      className={`catrich-particle-logo ${className}`.trim()}
      role="img"
      aria-label={text}
      title={text}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="catrich-particle-logo__fallback">{text}</span>
    </div>
  );
}
