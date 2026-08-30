import React, { useEffect, useRef } from 'react';
import './FishParticleLogo.css';

const TAU = Math.PI * 2;

const GRADIENT_STOPS = [
  { stop: 0, color: '#8b5cf6' },
  { stop: 0.48, color: '#3b82f6' },
  { stop: 1, color: '#06b6d4' },
];

function seededNoise(x, y, salt = 0) {
  const value = Math.sin((x * 12.9898) + (y * 78.233) + (salt * 37.719)) * 43758.5453;
  return value - Math.floor(value);
}

function hexToRgb(hex) {
  const raw = String(hex || '').replace('#', '');
  const normalized = raw.length === 3
    ? raw.split('').map((part) => `${part}${part}`).join('')
    : raw.padEnd(6, '0').slice(0, 6);
  const parsed = Number.parseInt(normalized, 16) || 0;
  return { r: (parsed >> 16) & 255, g: (parsed >> 8) & 255, b: parsed & 255 };
}

function mixRgb(left, right, amount) {
  return {
    r: Math.round(left.r + ((right.r - left.r) * amount)),
    g: Math.round(left.g + ((right.g - left.g) * amount)),
    b: Math.round(left.b + ((right.b - left.b) * amount)),
  };
}

function gradientColorAt(position) {
  const t = Math.max(0, Math.min(1, position));
  for (let index = 0; index < GRADIENT_STOPS.length - 1; index += 1) {
    const left = GRADIENT_STOPS[index];
    const right = GRADIENT_STOPS[index + 1];
    if (t >= left.stop && t <= right.stop) {
      const local = (t - left.stop) / Math.max(0.0001, right.stop - left.stop);
      const mixed = mixRgb(hexToRgb(left.color), hexToRgb(right.color), local);
      return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
    }
  }
  return GRADIENT_STOPS[GRADIENT_STOPS.length - 1].color;
}

function drawFishMask(ctx, width, height) {
  const cy = height * 0.5;

  // Forked tail.
  ctx.beginPath();
  ctx.moveTo(width * 0.30, cy);
  ctx.lineTo(width * 0.07, height * 0.14);
  ctx.lineTo(width * 0.14, height * 0.46);
  ctx.lineTo(width * 0.30, height * 0.43);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width * 0.30, cy);
  ctx.lineTo(width * 0.07, height * 0.86);
  ctx.lineTo(width * 0.14, height * 0.54);
  ctx.lineTo(width * 0.30, height * 0.57);
  ctx.closePath();
  ctx.fill();

  // Main herring body: broad shoulder, compact pointed head.
  ctx.beginPath();
  ctx.moveTo(width * 0.25, cy);
  ctx.bezierCurveTo(
    width * 0.34, height * 0.25,
    width * 0.57, height * 0.19,
    width * 0.79, height * 0.37,
  );
  ctx.bezierCurveTo(
    width * 0.86, height * 0.43,
    width * 0.90, height * 0.48,
    width * 0.92, cy,
  );
  ctx.bezierCurveTo(
    width * 0.90, height * 0.52,
    width * 0.86, height * 0.57,
    width * 0.79, height * 0.63,
  );
  ctx.bezierCurveTo(
    width * 0.57, height * 0.81,
    width * 0.34, height * 0.75,
    width * 0.25, cy,
  );
  ctx.closePath();
  ctx.fill();

  // Dorsal and ventral fins keep the silhouette recognisably fish-like.
  ctx.beginPath();
  ctx.moveTo(width * 0.45, height * 0.29);
  ctx.quadraticCurveTo(width * 0.55, height * 0.08, width * 0.64, height * 0.28);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width * 0.48, height * 0.70);
  ctx.quadraticCurveTo(width * 0.57, height * 0.91, width * 0.65, height * 0.71);
  ctx.closePath();
  ctx.fill();

  // Knock out a tiny eye so the fish remains readable even before interaction.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(width * 0.78, height * 0.43, Math.max(1.2, height * 0.045), 0, TAU);
  ctx.fill();
  ctx.restore();
}

export default function FishParticleLogo({
  className = '',
  interactionRadius = 38,
  magneticStrength = 1.28,
  spring = 0.115,
  damping = 0.79,
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

    let cssWidth = 1;
    let cssHeight = 1;
    let dpr = 1;
    let frame = 0;
    let running = false;
    let calmFrames = 0;
    let reducedMotion = reduceMotionQuery.matches;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;

    function drawParticle(particle) {
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    function renderStatic() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      particles.forEach((particle) => {
        particle.x = particle.homeX;
        particle.y = particle.homeY;
        particle.vx = 0;
        particle.vy = 0;
        drawParticle(particle);
      });
    }

    function buildParticles() {
      const rect = host.getBoundingClientRect();
      cssWidth = Math.max(1, Math.round(rect.width));
      cssHeight = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 3);

      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const sourceScale = 5;
      const mask = document.createElement('canvas');
      mask.width = Math.max(1, Math.round(cssWidth * sourceScale));
      mask.height = Math.max(1, Math.round(cssHeight * sourceScale));
      const maskCtx = mask.getContext('2d', { alpha: true, willReadFrequently: true });
      if (!maskCtx) return;

      maskCtx.setTransform(sourceScale, 0, 0, sourceScale, 0, 0);
      maskCtx.clearRect(0, 0, cssWidth, cssHeight);
      maskCtx.fillStyle = '#fff';
      drawFishMask(maskCtx, cssWidth, cssHeight);
      maskCtx.setTransform(1, 0, 0, 1, 0, 0);

      const pixels = maskCtx.getImageData(0, 0, mask.width, mask.height).data;
      particles.length = 0;

      const sampleAlpha = (x, y) => {
        const sx = Math.max(0, Math.min(mask.width - 1, Math.round(x * sourceScale)));
        const sy = Math.max(0, Math.min(mask.height - 1, Math.round(y * sourceScale)));
        return pixels[((sy * mask.width) + sx) * 4 + 3];
      };

      const gapX = 1.22;
      const gapY = 1.28;
      const probe = 0.86;
      const candidates = [];
      let row = 0;

      for (let y = 1.2; y < cssHeight - 1.2; y += gapY, row += 1) {
        const offset = (row % 2) * (gapX / 2);
        let col = 0;
        for (let x = 1.2 + offset; x < cssWidth - 1.2; x += gapX, col += 1) {
          const alpha = sampleAlpha(x, y);
          if (alpha < 18) continue;

          const density = alpha / 255;
          const left = sampleAlpha(x - probe, y);
          const right = sampleAlpha(x + probe, y);
          const up = sampleAlpha(x, y - probe);
          const down = sampleAlpha(x, y + probe);
          const edgeDelta = Math.max(
            Math.abs(alpha - left),
            Math.abs(alpha - right),
            Math.abs(alpha - up),
            Math.abs(alpha - down),
          );
          const edge = Math.min(1, edgeDelta / 150);
          const jitterX = (seededNoise(col, row, 7) - 0.5) * 0.22;
          const jitterY = (seededNoise(col, row, 13) - 0.5) * 0.22;

          candidates.push({
            x: x + jitterX,
            y: y + jitterY,
            density,
            edge,
          });
        }
      }

      const maxParticles = 4100;
      const stride = Math.max(1, Math.ceil(candidates.length / maxParticles));
      for (let index = 0; index < candidates.length; index += stride) {
        const point = candidates[index];
        const radius = 0.30 + (point.density * 0.18) + (point.edge * 0.055);
        particles.push({
          x: point.x,
          y: point.y,
          homeX: point.x,
          homeY: point.y,
          vx: 0,
          vy: 0,
          radius,
          opacity: 0.72 + (point.density * 0.22),
          color: gradientColorAt(point.x / Math.max(1, cssWidth)),
          forceScale: 0.78 + (point.edge * 0.5),
          springScale: 0.98 + ((1 - point.edge) * 0.12),
        });
      }

      // A fixed dark eye adds just enough identity without breaking the particle style.
      particles.push({
        x: cssWidth * 0.78,
        y: cssHeight * 0.43,
        homeX: cssWidth * 0.78,
        homeY: cssHeight * 0.43,
        vx: 0,
        vy: 0,
        radius: Math.max(0.95, cssHeight * 0.026),
        opacity: 0.92,
        color: '#0f2742',
        forceScale: 0.42,
        springScale: 1.35,
      });

      calmFrames = 0;
      renderStatic();
    }

    function animate() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      let energy = 0;

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distanceSquared = (dx * dx) + (dy * dy);
          const radiusSquared = interactionRadius * interactionRadius;

          if (distanceSquared > 0.001 && distanceSquared < radiusSquared) {
            const distance = Math.sqrt(distanceSquared);
            const nx = dx / distance;
            const ny = dy / distance;
            const innerRadius = interactionRadius * 0.44;
            const cursorEnergy = Math.min(
              1.25,
              Math.hypot(pointerVelocityX, pointerVelocityY) * 0.032,
            );

            let radialForce;
            if (distance < innerRadius) {
              const repel = 1 - (distance / innerRadius);
              radialForce = repel * repel * magneticStrength * 1.3;
            } else {
              const attract = 1 - ((distance - innerRadius) / Math.max(1, interactionRadius - innerRadius));
              radialForce = -attract * attract * magneticStrength * 0.30;
            }

            radialForce *= (particle.forceScale || 1) * (1 + cursorEnergy);
            particle.vx += nx * radialForce;
            particle.vy += ny * radialForce;

            const swirl = Math.abs(radialForce) * 0.09;
            particle.vx += -ny * swirl;
            particle.vy += nx * swirl;

            const proximity = 1 - (distance / interactionRadius);
            particle.vx += pointerVelocityX * proximity * 0.0032;
            particle.vy += pointerVelocityY * proximity * 0.0032;
          }
        }

        const localSpring = spring * (particle.springScale || 1);
        particle.vx += (particle.homeX - particle.x) * localSpring;
        particle.vy += (particle.homeY - particle.y) * localSpring;
        particle.vx *= damping;
        particle.vy *= damping;
        particle.x += particle.vx;
        particle.y += particle.vy;

        energy += Math.abs(particle.vx) + Math.abs(particle.vy)
          + (Math.abs(particle.homeX - particle.x) * 0.04)
          + (Math.abs(particle.homeY - particle.y) * 0.04);

        drawParticle(particle);
      }

      pointerVelocityX *= 0.73;
      pointerVelocityY *= 0.73;

      if (!pointer.active && energy < Math.max(0.05, particles.length * 0.00005)) calmFrames += 1;
      else calmFrames = 0;

      if (!pointer.active && calmFrames > 8) {
        renderStatic();
        running = false;
        frame = 0;
        return;
      }

      frame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (reducedMotion || running) return;
      running = true;
      calmFrames = 0;
      frame = window.requestAnimationFrame(animate);
    }

    function updatePointer(event) {
      if (reducedMotion) return;
      const rect = canvas.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;

      if (pointer.active) {
        pointerVelocityX = nextX - lastPointerX;
        pointerVelocityY = nextY - lastPointerY;
      } else {
        pointerVelocityX = 0;
        pointerVelocityY = 0;
      }

      lastPointerX = nextX;
      lastPointerY = nextY;
      pointer.x = nextX;
      pointer.y = nextY;
      pointer.active = true;
      startAnimation();
    }

    function leavePointer() {
      pointer.active = false;
      pointerVelocityX = 0;
      pointerVelocityY = 0;
      startAnimation();
    }

    function onReducedMotionChange(event) {
      reducedMotion = event.matches;
      pointer.active = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      running = false;
      renderStatic();
    }

    const resizeObserver = new ResizeObserver(buildParticles);
    resizeObserver.observe(host);
    buildParticles();

    canvas.addEventListener('pointermove', updatePointer, { passive: true });
    canvas.addEventListener('pointerenter', updatePointer, { passive: true });
    canvas.addEventListener('pointerleave', leavePointer, { passive: true });
    canvas.addEventListener('pointercancel', leavePointer, { passive: true });
    reduceMotionQuery.addEventListener?.('change', onReducedMotionChange);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', updatePointer);
      canvas.removeEventListener('pointerenter', updatePointer);
      canvas.removeEventListener('pointerleave', leavePointer);
      canvas.removeEventListener('pointercancel', leavePointer);
      reduceMotionQuery.removeEventListener?.('change', onReducedMotionChange);
    };
  }, [interactionRadius, magneticStrength, spring, damping]);

  return (
    <div
      ref={hostRef}
      className={`fish-particle-logo ${className}`.trim()}
      role="img"
      aria-label="Logo cá trích tương tác"
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="fish-particle-logo__fallback">Logo cá trích</span>
    </div>
  );
}
