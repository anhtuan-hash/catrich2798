import React, { useEffect, useRef } from 'react';
import './FishParticleLogo.css';

const TAU = Math.PI * 2;

const GRADIENT_STOPS = [
  { stop: 0, color: '#6d5ce7' },
  { stop: 0.52, color: '#3478e5' },
  { stop: 1, color: '#18a7c7' },
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
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
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

function drawElegantHerringMask(ctx, width, height) {
  const x = (value) => width * value;
  const y = (value) => height * value;
  const cy = y(0.5);

  // Slender fusiform body: long, low and slightly fuller through the shoulder.
  ctx.beginPath();
  ctx.moveTo(x(0.205), cy);
  ctx.bezierCurveTo(x(0.285), y(0.31), x(0.49), y(0.23), x(0.705), y(0.29));
  ctx.bezierCurveTo(x(0.825), y(0.32), x(0.905), y(0.39), x(0.965), cy);
  ctx.bezierCurveTo(x(0.905), y(0.61), x(0.825), y(0.68), x(0.705), y(0.71));
  ctx.bezierCurveTo(x(0.49), y(0.77), x(0.285), y(0.69), x(0.205), cy);
  ctx.closePath();
  ctx.fill();

  // Deep forked tail, swept backwards instead of the previous bow-tie shape.
  ctx.beginPath();
  ctx.moveTo(x(0.215), y(0.445));
  ctx.bezierCurveTo(x(0.155), y(0.39), x(0.09), y(0.255), x(0.025), y(0.12));
  ctx.bezierCurveTo(x(0.105), y(0.18), x(0.17), y(0.30), x(0.225), y(0.405));
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x(0.215), y(0.555));
  ctx.bezierCurveTo(x(0.155), y(0.61), x(0.09), y(0.745), x(0.025), y(0.88));
  ctx.bezierCurveTo(x(0.105), y(0.82), x(0.17), y(0.70), x(0.225), y(0.595));
  ctx.closePath();
  ctx.fill();

  // Small swept dorsal fin: enough to read as a herring without becoming cartoonish.
  ctx.beginPath();
  ctx.moveTo(x(0.43), y(0.305));
  ctx.bezierCurveTo(x(0.49), y(0.20), x(0.555), y(0.145), x(0.605), y(0.29));
  ctx.bezierCurveTo(x(0.545), y(0.27), x(0.49), y(0.275), x(0.43), y(0.305));
  ctx.closePath();
  ctx.fill();

  // Subtle anal fin, swept back and much smaller than the dorsal fin.
  ctx.beginPath();
  ctx.moveTo(x(0.53), y(0.695));
  ctx.bezierCurveTo(x(0.585), y(0.79), x(0.635), y(0.80), x(0.675), y(0.69));
  ctx.bezierCurveTo(x(0.625), y(0.71), x(0.58), y(0.715), x(0.53), y(0.695));
  ctx.closePath();
  ctx.fill();

  // A tiny gill cut gives the silhouette a more authored, logo-like identity.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.8, height * 0.025);
  ctx.beginPath();
  ctx.moveTo(x(0.805), y(0.37));
  ctx.quadraticCurveTo(x(0.775), y(0.50), x(0.805), y(0.63));
  ctx.stroke();
  ctx.restore();
}

export default function FishParticleLogo({
  className = '',
  interactionRadius = 46,
  magneticStrength = 1.65,
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

      const sourceScale = 6;
      const mask = document.createElement('canvas');
      mask.width = Math.max(1, Math.round(cssWidth * sourceScale));
      mask.height = Math.max(1, Math.round(cssHeight * sourceScale));
      const maskCtx = mask.getContext('2d', { alpha: true, willReadFrequently: true });
      if (!maskCtx) return;

      maskCtx.setTransform(sourceScale, 0, 0, sourceScale, 0, 0);
      maskCtx.clearRect(0, 0, cssWidth, cssHeight);
      maskCtx.fillStyle = '#fff';
      drawElegantHerringMask(maskCtx, cssWidth, cssHeight);
      maskCtx.setTransform(1, 0, 0, 1, 0, 0);

      const pixels = maskCtx.getImageData(0, 0, mask.width, mask.height).data;
      particles.length = 0;

      const sampleAlpha = (px, py) => {
        const sx = Math.max(0, Math.min(mask.width - 1, Math.round(px * sourceScale)));
        const sy = Math.max(0, Math.min(mask.height - 1, Math.round(py * sourceScale)));
        return pixels[((sy * mask.width) + sx) * 4 + 3];
      };

      const gapX = 1.08;
      const gapY = 1.13;
      const probe = 0.82;
      const candidates = [];
      let row = 0;

      for (let py = 1.1; py < cssHeight - 1.1; py += gapY, row += 1) {
        const offset = (row % 2) * (gapX / 2);
        let col = 0;
        for (let px = 1.1 + offset; px < cssWidth - 1.1; px += gapX, col += 1) {
          const alpha = sampleAlpha(px, py);
          if (alpha < 18) continue;

          const density = alpha / 255;
          const edgeDelta = Math.max(
            Math.abs(alpha - sampleAlpha(px - probe, py)),
            Math.abs(alpha - sampleAlpha(px + probe, py)),
            Math.abs(alpha - sampleAlpha(px, py - probe)),
            Math.abs(alpha - sampleAlpha(px, py + probe)),
          );
          const edge = Math.min(1, edgeDelta / 150);
          const jitterX = (seededNoise(col, row, 7) - 0.5) * 0.12;
          const jitterY = (seededNoise(col, row, 13) - 0.5) * 0.12;

          candidates.push({
            x: px + jitterX,
            y: py + jitterY,
            density,
            edge,
          });
        }
      }

      const maxParticles = 5600;
      const stride = Math.max(1, Math.ceil(candidates.length / maxParticles));

      for (let index = 0; index < candidates.length; index += stride) {
        const point = candidates[index];
        particles.push({
          x: point.x,
          y: point.y,
          homeX: point.x,
          homeY: point.y,
          vx: 0,
          vy: 0,
          radius: 0.29 + (point.density * 0.11) + (point.edge * 0.06),
          opacity: 0.78 + (point.density * 0.18),
          color: gradientColorAt(point.x / Math.max(1, cssWidth)),
          forceScale: 0.80 + (point.edge * 0.50),
          springScale: 1.02 + ((1 - point.edge) * 0.08),
        });
      }

      // Dark eye stays visually anchored while the surrounding field reacts.
      particles.push({
        x: cssWidth * 0.845,
        y: cssHeight * 0.435,
        homeX: cssWidth * 0.845,
        homeY: cssHeight * 0.435,
        vx: 0,
        vy: 0,
        radius: Math.max(0.9, cssHeight * 0.024),
        opacity: 0.94,
        color: '#112a46',
        forceScale: 0.35,
        springScale: 1.45,
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
            const innerRadius = interactionRadius * 0.46;
            const cursorEnergy = Math.min(1.45, Math.hypot(pointerVelocityX, pointerVelocityY) * 0.036);

            let radialForce;
            if (distance < innerRadius) {
              const repel = 1 - (distance / innerRadius);
              radialForce = repel * repel * magneticStrength * 1.55;
            } else {
              const attract = 1 - ((distance - innerRadius) / Math.max(1, interactionRadius - innerRadius));
              radialForce = -attract * attract * magneticStrength * 0.42;
            }

            radialForce *= (particle.forceScale || 1) * (1 + cursorEnergy);
            particle.vx += nx * radialForce;
            particle.vy += ny * radialForce;

            const swirl = Math.abs(radialForce) * 0.075;
            particle.vx += -ny * swirl;
            particle.vy += nx * swirl;

            const proximity = 1 - (distance / interactionRadius);
            particle.vx += pointerVelocityX * proximity * 0.0038;
            particle.vy += pointerVelocityY * proximity * 0.0038;
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
      aria-label="Cá trích particle logo"
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="fish-particle-logo__fallback">Cá trích</span>
    </div>
  );
}
