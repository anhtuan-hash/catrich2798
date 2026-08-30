import React, { useEffect, useRef } from 'react';
import './CatRichParticleLogo.css';

const DEFAULT_TEXT = 'catrich.mauxanh';
const TAU = Math.PI * 2;

const NAV_GRADIENT = [
  { stop: 0, color: '#8b5cf6' },
  { stop: 0.5, color: '#3b82f6' },
  { stop: 1, color: '#06b6d4' },
];

function seededNoise(x, y, salt = 0) {
  const value = Math.sin((x * 12.9898) + (y * 78.233) + (salt * 37.719)) * 43758.5453;
  return value - Math.floor(value);
}

function hexToRgb(hex) {
  const value = String(hex || '').replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((part) => `${part}${part}`).join('')
    : value.padEnd(6, '0').slice(0, 6);
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
  for (let index = 0; index < NAV_GRADIENT.length - 1; index += 1) {
    const left = NAV_GRADIENT[index];
    const right = NAV_GRADIENT[index + 1];
    if (t >= left.stop && t <= right.stop) {
      const local = (t - left.stop) / Math.max(0.0001, right.stop - left.stop);
      const mixed = mixRgb(hexToRgb(left.color), hexToRgb(right.color), local);
      return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
    }
  }
  return NAV_GRADIENT[NAV_GRADIENT.length - 1].color;
}

function getFontString(size, family, weight) {
  return `${weight} ${size}px ${family}`;
}

function measureSpacedText(ctx, text, spacing = 0) {
  let width = 0;
  const characters = [...text];
  characters.forEach((character, index) => {
    width += ctx.measureText(character).width;
    if (index < characters.length - 1) width += spacing;
  });
  return width;
}

function drawSpacedText(ctx, text, centerX, centerY, spacing = 0) {
  const characters = [...text];
  const width = measureSpacedText(ctx, text, spacing);
  let cursor = centerX - (width / 2);
  ctx.textAlign = 'left';
  characters.forEach((character, index) => {
    ctx.fillText(character, cursor, centerY);
    cursor += ctx.measureText(character).width;
    if (index < characters.length - 1) cursor += spacing;
  });
}

function resolveFontSize(ctx, text, width, height, family, navMode) {
  const weight = navMode ? 650 : 800;
  const spacing = navMode ? 0.08 : 0;
  const maxWidth = width * (navMode ? 0.972 : 0.9);
  const minimum = navMode ? 18 : 20;
  let size = navMode
    ? Math.max(22, Math.min(height * 0.64, width * 0.128))
    : Math.max(26, Math.min(height * 0.48, width * 0.108));

  while (size > minimum) {
    ctx.font = getFontString(size, family, weight);
    if (measureSpacedText(ctx, text, spacing) <= maxWidth) return size;
    size -= 0.5;
  }
  return minimum;
}

export default function CatRichParticleLogo({
  text = DEFAULT_TEXT,
  className = '',
  variant = 'default',
  interactionRadius = 34,
  magneticStrength = 0.62,
  spring = 0.1,
  damping = 0.82,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const navMode = variant === 'nav' || className.includes('catrich-particle-logo--nav');
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const particles = [];
    const pointer = { x: -9999, y: -9999, active: false };

    let cssWidth = 1;
    let cssHeight = 1;
    let dpr = 1;
    let frame = 0;
    let running = false;
    let reducedMotion = reduceMotionQuery.matches;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;
    let calmFrames = 0;

    const navFamily = '"Helvetica Neue", Helvetica, Arial, ui-sans-serif, system-ui, sans-serif';
    const defaultFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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
      dpr = Math.min(window.devicePixelRatio || 1, navMode ? 3 : 2.5);

      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const family = navMode ? navFamily : (window.getComputedStyle(host).fontFamily || defaultFamily);
      const measureCanvas = document.createElement('canvas');
      const measureCtx = measureCanvas.getContext('2d');
      if (!measureCtx) return;

      const fontSize = resolveFontSize(measureCtx, text, cssWidth, cssHeight, family, navMode);
      const weight = navMode ? 650 : 800;
      const spacing = navMode ? 0.08 : 0;
      const sourceScale = navMode ? 5 : 2;

      const mask = document.createElement('canvas');
      mask.width = Math.max(1, Math.round(cssWidth * sourceScale));
      mask.height = Math.max(1, Math.round(cssHeight * sourceScale));
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;

      maskCtx.setTransform(sourceScale, 0, 0, sourceScale, 0, 0);
      maskCtx.clearRect(0, 0, cssWidth, cssHeight);
      maskCtx.font = getFontString(fontSize, family, weight);
      maskCtx.textBaseline = 'middle';
      maskCtx.fillStyle = '#fff';
      drawSpacedText(maskCtx, text, cssWidth / 2, (cssHeight / 2) + (navMode ? 0.2 : 0), spacing);
      maskCtx.setTransform(1, 0, 0, 1, 0, 0);

      const pixels = maskCtx.getImageData(0, 0, mask.width, mask.height).data;
      particles.length = 0;

      const gapX = navMode ? 1.52 : 2.8;
      const gapY = navMode ? 1.68 : 2.8;
      const threshold = navMode ? 6 : 48;
      const candidates = [];
      let row = 0;

      for (let y = 2; y < cssHeight - 2; y += gapY, row += 1) {
        const rowOffset = (row % 2) * (gapX / 2);
        for (let x = 2 + rowOffset; x < cssWidth - 2; x += gapX) {
          const sampleX = Math.max(0, Math.min(mask.width - 1, Math.round(x * sourceScale)));
          const sampleY = Math.max(0, Math.min(mask.height - 1, Math.round(y * sourceScale)));
          const alpha = pixels[((sampleY * mask.width) + sampleX) * 4 + 3];
          if (alpha > threshold) candidates.push([x, y, alpha]);
        }
      }

      const maxParticles = navMode ? 6400 : 3000;
      const stride = Math.max(1, Math.ceil(candidates.length / maxParticles));

      for (let index = 0; index < candidates.length; index += stride) {
        const [baseX, baseY, alpha] = candidates[index];
        const density = alpha / 255;
        const n1 = seededNoise(baseX, baseY, 2);
        const n2 = seededNoise(baseX, baseY, 3);
        const jitter = navMode ? 0.26 : 0.18;
        const x = baseX + ((n1 - 0.5) * jitter);
        const y = baseY + ((n2 - 0.5) * jitter);
        const radius = navMode
          ? 0.24 + (density * 0.46) + (n1 * 0.035)
          : 0.48 + (density * 0.4) + (n1 * 0.08);

        particles.push({
          x,
          y,
          homeX: x,
          homeY: y,
          vx: 0,
          vy: 0,
          radius,
          opacity: navMode ? 0.48 + (density * 0.5) : 0.62 + (density * 0.35),
          color: navMode
            ? gradientColorAt(x / Math.max(1, cssWidth))
            : (window.getComputedStyle(host).color || '#155da9'),
        });
      }

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
            const proximity = 1 - (distance / interactionRadius);
            const eased = proximity * proximity;
            const cursorEnergy = Math.min(
              navMode ? 0.72 : 1.35,
              Math.hypot(pointerVelocityX, pointerVelocityY) * (navMode ? 0.02 : 0.04),
            );
            const force = eased * magneticStrength * (1 + cursorEnergy);

            particle.vx += nx * force;
            particle.vy += ny * force;
            particle.vx += (-ny * force * (navMode ? 0.035 : 0.08));
            particle.vy += (nx * force * (navMode ? 0.035 : 0.08));
          }
        }

        particle.vx += (particle.homeX - particle.x) * spring;
        particle.vy += (particle.homeY - particle.y) * spring;
        particle.vx *= damping;
        particle.vy *= damping;
        particle.x += particle.vx;
        particle.y += particle.vy;

        energy += Math.abs(particle.vx) + Math.abs(particle.vy)
          + (Math.abs(particle.homeX - particle.x) * 0.06)
          + (Math.abs(particle.homeY - particle.y) * 0.06);

        drawParticle(particle);
      }

      pointerVelocityX *= 0.74;
      pointerVelocityY *= 0.74;

      if (!pointer.active && energy < Math.max(0.08, particles.length * 0.00008)) calmFrames += 1;
      else calmFrames = 0;

      if (!pointer.active && calmFrames > 10) {
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
  }, [text, className, variant, interactionRadius, magneticStrength, spring, damping]);

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
