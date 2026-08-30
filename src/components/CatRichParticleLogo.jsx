import React, { useEffect, useRef } from 'react';
import './CatRichParticleLogo.css';

const DEFAULT_TEXT = 'catrich.mauxanh';
const TAU = Math.PI * 2;

const NAV_GRADIENT = [
  { stop: 0, color: '#7c3aed' },
  { stop: 0.5, color: '#2563eb' },
  { stop: 1, color: '#06b6d4' },
];

function seededNoise(x, y, salt = 0) {
  const value = Math.sin((x * 12.9898) + (y * 78.233) + (salt * 37.719)) * 43758.5453;
  return value - Math.floor(value);
}

function hexToRgb(hex) {
  const normalized = String(hex || '').replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((character) => `${character}${character}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const value = Number.parseInt(full, 16) || 0;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
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
  [...text].forEach((character, index) => {
    width += ctx.measureText(character).width;
    if (index < text.length - 1) width += spacing;
  });
  return width;
}

function drawSpacedText(ctx, text, centerX, centerY, spacing = 0) {
  if (!spacing) {
    ctx.textAlign = 'center';
    ctx.fillText(text, centerX, centerY);
    return;
  }

  const width = measureSpacedText(ctx, text, spacing);
  let cursor = centerX - (width / 2);
  ctx.textAlign = 'left';
  [...text].forEach((character, index) => {
    ctx.fillText(character, cursor, centerY);
    cursor += ctx.measureText(character).width;
    if (index < text.length - 1) cursor += spacing;
  });
}

function resolveFontSize(ctx, text, width, height, family, navMode) {
  const weight = navMode ? 650 : 800;
  const spacing = navMode ? 0.12 : 0;
  const minimum = navMode ? 18 : 20;
  const maxWidth = width * (navMode ? 0.968 : 0.88);
  let size = navMode
    ? Math.max(22, Math.min(height * 0.62, width * 0.13))
    : Math.max(26, Math.min(height * 0.47, width * 0.105));

  while (size > minimum) {
    ctx.font = getFontString(size, family, weight);
    if (measureSpacedText(ctx, text, spacing) <= maxWidth) return size;
    size -= 0.5;
  }
  return minimum;
}

function drawRoundParticle(ctx, particle, opacity) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export default function CatRichParticleLogo({
  text = DEFAULT_TEXT,
  className = '',
  variant = 'default',
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

    const navMode = variant === 'nav' || className.includes('catrich-particle-logo--nav');
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: -9999, y: -9999, active: false };
    const particles = [];

    let cssWidth = 1;
    let cssHeight = 1;
    let dpr = 1;
    let frame = 0;
    let baseSurface = null;
    let reducedMotion = reduceMotionQuery.matches;
    let hoverAmount = 0;
    let hoverTarget = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pointerVelocityX = 0;
    let pointerVelocityY = 0;

    const navFamily = '"Helvetica Neue", Helvetica, Arial, ui-sans-serif, system-ui, sans-serif';
    const defaultFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    function buildTextMask(width, height, scale, family, fontSize, weight, spacing) {
      const surface = document.createElement('canvas');
      surface.width = Math.max(1, Math.round(width * scale));
      surface.height = Math.max(1, Math.round(height * scale));
      const surfaceCtx = surface.getContext('2d', { willReadFrequently: true });
      if (!surfaceCtx) return null;

      surfaceCtx.setTransform(scale, 0, 0, scale, 0, 0);
      surfaceCtx.clearRect(0, 0, width, height);
      surfaceCtx.font = getFontString(fontSize, family, weight);
      surfaceCtx.textBaseline = 'middle';
      surfaceCtx.fillStyle = '#fff';
      drawSpacedText(surfaceCtx, text, width / 2, (height / 2) + (navMode ? 0.2 : 0), spacing);
      surfaceCtx.setTransform(1, 0, 0, 1, 0, 0);
      return surface;
    }

    function buildBaseSurface(width, height, family, fontSize, weight, spacing) {
      const surface = document.createElement('canvas');
      surface.width = Math.max(1, Math.round(width * dpr));
      surface.height = Math.max(1, Math.round(height * dpr));
      const surfaceCtx = surface.getContext('2d', { alpha: true });
      if (!surfaceCtx) return null;

      surfaceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      surfaceCtx.clearRect(0, 0, width, height);
      surfaceCtx.font = getFontString(fontSize, family, weight);
      surfaceCtx.textBaseline = 'middle';

      if (navMode) {
        const gradient = surfaceCtx.createLinearGradient(width * 0.08, 0, width * 0.92, 0);
        NAV_GRADIENT.forEach(({ stop, color }) => gradient.addColorStop(stop, color));
        surfaceCtx.fillStyle = gradient;
      } else {
        surfaceCtx.fillStyle = window.getComputedStyle(host).color || '#155da9';
      }

      drawSpacedText(surfaceCtx, text, width / 2, (height / 2) + (navMode ? 0.2 : 0), spacing);
      return surface;
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
      const spacing = navMode ? 0.12 : 0;
      const sourceScale = navMode ? 4 : 1;
      const mask = buildTextMask(cssWidth, cssHeight, sourceScale, family, fontSize, weight, spacing);
      if (!mask) return;

      baseSurface = buildBaseSurface(cssWidth, cssHeight, family, fontSize, weight, spacing);
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (!maskCtx) return;
      const pixels = maskCtx.getImageData(0, 0, mask.width, mask.height).data;
      particles.length = 0;

      if (navMode) {
        const gapX = 1.72;
        const gapY = 1.86;
        const threshold = 9;
        const candidates = [];
        let row = 0;

        for (let y = 2; y < cssHeight - 2; y += gapY, row += 1) {
          const offset = (row % 2) * (gapX / 2);
          for (let x = 2 + offset; x < cssWidth - 2; x += gapX) {
            const sampleX = Math.max(0, Math.min(mask.width - 1, Math.round(x * sourceScale)));
            const sampleY = Math.max(0, Math.min(mask.height - 1, Math.round(y * sourceScale)));
            const alpha = pixels[((sampleY * mask.width) + sampleX) * 4 + 3];
            if (alpha > threshold) candidates.push([x, y, alpha]);
          }
        }

        const maxParticles = 5600;
        const stride = Math.max(1, Math.ceil(candidates.length / maxParticles));
        for (let index = 0; index < candidates.length; index += stride) {
          const [baseX, baseY, alpha] = candidates[index];
          const density = alpha / 255;
          const n1 = seededNoise(baseX, baseY, 2);
          const n2 = seededNoise(baseX, baseY, 3);
          const x = baseX + ((n1 - 0.5) * 0.3);
          const y = baseY + ((n2 - 0.5) * 0.3);
          const radius = 0.22 + (density * 0.31) + (n1 * 0.04);
          particles.push({
            x,
            y,
            homeX: x,
            homeY: y,
            vx: 0,
            vy: 0,
            radius,
            density,
            color: gradientColorAt(x / cssWidth),
          });
        }
      } else {
        const gap = cssWidth * cssHeight > 180000 ? 4 : 3;
        for (let y = gap; y < cssHeight - gap; y += gap) {
          for (let x = gap; x < cssWidth - gap; x += gap) {
            const alpha = pixels[((y * mask.width) + x) * 4 + 3];
            if (alpha <= 92) continue;
            const density = alpha / 255;
            particles.push({
              x,
              y,
              homeX: x,
              homeY: y,
              vx: 0,
              vy: 0,
              radius: 0.65 + (seededNoise(x, y, 4) * 0.55),
              density,
              color: window.getComputedStyle(host).color || '#155da9',
            });
          }
        }
      }
    }

    function drawBase() {
      if (!baseSurface) return;
      ctx.save();
      ctx.globalAlpha = navMode ? 0.96 : 0.9;
      ctx.drawImage(baseSurface, 0, 0, cssWidth, cssHeight);

      if (navMode && hoverAmount > 0.004) {
        const holeRadius = interactionRadius * (0.82 + (hoverAmount * 0.28));
        const gradient = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          Math.max(2, holeRadius * 0.10),
          pointer.x,
          pointer.y,
          holeRadius,
        );
        gradient.addColorStop(0, `rgba(0,0,0,${0.95 * hoverAmount})`);
        gradient.addColorStop(0.42, `rgba(0,0,0,${0.68 * hoverAmount})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.fillRect(pointer.x - holeRadius, pointer.y - holeRadius, holeRadius * 2, holeRadius * 2);
      }
      ctx.restore();
    }

    function drawParticles() {
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        let proximity = 0;

        if (pointer.active || hoverAmount > 0.01) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.sqrt((dx * dx) + (dy * dy));
          proximity = Math.max(0, 1 - (distance / interactionRadius));

          if (pointer.active && distance > 0.001 && distance < interactionRadius) {
            const nx = dx / distance;
            const ny = dy / distance;
            const eased = proximity * proximity;
            const cursorEnergy = Math.min(
              navMode ? 0.78 : 1.5,
              Math.hypot(pointerVelocityX, pointerVelocityY) * (navMode ? 0.021 : 0.042),
            );
            const force = eased * magneticStrength * (1 + cursorEnergy);
            particle.vx += nx * force;
            particle.vy += ny * force;
            if (!navMode) {
              particle.vx += -ny * force * 0.08;
              particle.vy += nx * force * 0.08;
            }
          }
        }

        particle.vx += (particle.homeX - particle.x) * spring;
        particle.vy += (particle.homeY - particle.y) * spring;
        particle.vx *= damping;
        particle.vy *= damping;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const quietOpacity = navMode ? (0.07 + (particle.density * 0.09)) : 0.78;
        const activeOpacity = navMode
          ? quietOpacity + (Math.pow(proximity, 0.7) * hoverAmount * 0.86)
          : quietOpacity;
        drawRoundParticle(ctx, particle, activeOpacity);
      }
    }

    function drawFrame() {
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      hoverAmount += (hoverTarget - hoverAmount) * (navMode ? 0.14 : 0.1);
      if (Math.abs(hoverTarget - hoverAmount) < 0.001) hoverAmount = hoverTarget;

      drawBase();
      drawParticles();

      pointerVelocityX *= 0.72;
      pointerVelocityY *= 0.72;
      frame = window.requestAnimationFrame(drawFrame);
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
      hoverTarget = 1;
    }

    function leavePointer() {
      pointer.active = false;
      hoverTarget = 0;
      pointerVelocityX = 0;
      pointerVelocityY = 0;
    }

    function onReducedMotionChange(event) {
      reducedMotion = event.matches;
      pointer.active = false;
      hoverTarget = 0;
      hoverAmount = 0;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (reducedMotion) {
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        drawBase();
        drawParticles();
      } else {
        frame = window.requestAnimationFrame(drawFrame);
      }
    }

    const resizeObserver = new ResizeObserver(buildParticles);
    resizeObserver.observe(host);
    buildParticles();

    canvas.addEventListener('pointermove', updatePointer, { passive: true });
    canvas.addEventListener('pointerenter', updatePointer, { passive: true });
    canvas.addEventListener('pointerleave', leavePointer, { passive: true });
    canvas.addEventListener('pointercancel', leavePointer, { passive: true });
    reduceMotionQuery.addEventListener?.('change', onReducedMotionChange);

    if (reducedMotion) {
      drawBase();
      drawParticles();
    } else {
      frame = window.requestAnimationFrame(drawFrame);
    }

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
