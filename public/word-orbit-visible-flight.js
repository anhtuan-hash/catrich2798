(() => {
  if (window.__BES_WORD_ORBIT_VISIBLE_FLIGHT__) return;
  window.__BES_WORD_ORBIT_VISIBLE_FLIGHT__ = true;

  const nativeAnimate = Element.prototype.animate;
  if (typeof nativeAnimate !== 'function') return;

  const NUMBER = '(-?\\d+(?:\\.\\d+)?)';
  const TRANSFORM_PATTERN = new RegExp(
    `translate3d\\(\\s*${NUMBER}(?:px)?\\s*,\\s*${NUMBER}(?:px)?\\s*,\\s*${NUMBER}(?:px)?\\s*\\)\\s*scale\\(\\s*${NUMBER}\\s*\\)\\s*rotate\\(\\s*${NUMBER}deg\\s*\\)`,
    'i',
  );

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function parseTransform(value) {
    const match = String(value || '').match(TRANSFORM_PATTERN);
    if (!match) return null;
    return {
      x: Number(match[1]) || 0,
      y: Number(match[2]) || 0,
      z: Number(match[3]) || 0,
      scale: Number(match[4]) || 1,
      rotate: Number(match[5]) || 0,
    };
  }

  function visibleScale(original, offset, isCorrect) {
    if (!isCorrect) {
      if (offset < 0.7) return Math.max(original, 0.88);
      return Math.max(original, 0.96);
    }
    if (offset < 0.58) return Math.max(original, 0.92);
    if (offset < 0.84) return Math.max(original, 0.74);
    return Math.max(original, 0.48);
  }

  Element.prototype.animate = function patchedAnimate(keyframes, options) {
    const isWordOrbitFlight = this?.classList?.contains('wog-flight-capsule');
    if (!isWordOrbitFlight || !Array.isArray(keyframes) || keyframes.length < 2) {
      return nativeAnimate.call(this, keyframes, options);
    }

    const parsedFrames = keyframes.map((frame) => parseTransform(frame?.transform));
    if (parsedFrames.some((frame) => !frame)) {
      return nativeAnimate.call(this, keyframes, options);
    }

    const last = parsedFrames[parsedFrames.length - 1];
    const isCorrect = Math.hypot(last.x, last.y) > 8 && last.scale < 0.7;

    const convertedFrames = keyframes.map((frame, index) => {
      const parsed = parsedFrames[index];
      const offset = Number.isFinite(frame.offset)
        ? frame.offset
        : index / Math.max(1, keyframes.length - 1);
      return {
        translate: `${parsed.x}px ${parsed.y}px`,
        scale: String(visibleScale(parsed.scale, offset, isCorrect)),
        rotate: `${clamp(parsed.rotate, -2, 2)}deg`,
        opacity: 1,
        offset,
      };
    });

    const supplied = typeof options === 'number' ? { duration: options } : { ...(options || {}) };
    const minimumDuration = isCorrect ? 1450 : 1120;
    const requestedDuration = Number(supplied.duration) || 0;

    return nativeAnimate.call(this, convertedFrames, {
      ...supplied,
      duration: Math.max(minimumDuration, requestedDuration),
      delay: Math.max(48, Number(supplied.delay) || 0),
      easing: isCorrect
        ? 'cubic-bezier(0.22, 0.72, 0.18, 1)'
        : 'cubic-bezier(0.28, 0.68, 0.24, 1)',
      fill: 'both',
      composite: 'replace',
    });
  };
})();
