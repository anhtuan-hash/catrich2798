# Welcome Ambient Autoplay Motion Spec

## Goal
Extend the existing Living Twilight first-visit welcome with subtle, continuously running ambient motion so the entire scene feels alive even when the pointer is idle.

## Approved visual direction
Keep the existing lighthouse, interactive beam, Living Twilight palette, typography, layout, first-visit behavior, and accessibility model. Add ambient motion only; do not introduce WebGL, canvas, external media, or new dependencies.

## Required effects
- Twilight veil drift: a faint atmospheric light veil moves across the sky independently from the lighthouse beam.
- Ocean glints: soft moonlit sparkles travel across the water at staggered timings.
- Horizon mist: a low, blurred mist bank drifts slowly near the horizon.
- Moon orbit halo: a subtle asymmetric halo ring rotates/pulses around the moon.
- Glass-card sheen: feature cards receive a slow low-contrast background sheen while retaining their existing float and hover behavior.

## Motion hierarchy
The lighthouse beam must remain readable but not dominate. Ambient effects should be independently timed and visibly moving within 2–4 seconds without looking like a game or screensaver.

## Performance and accessibility
Use CSS-only pseudo-elements/gradients/keyframes and existing DOM. Avoid new pointer listeners. Use transform/opacity/background-position where practical. On <=600px reduce or hide the most decorative layers. `prefers-reduced-motion: reduce` disables the new ambient animations. The existing `?welcome=preview&motion=full` diagnostic mode must explicitly re-enable the new ambient animations.

## Scope
Modify only the welcome subsystem bootstrap/style contracts and add a dedicated ambient stylesheet. Do not change routing, authentication, persistence, app pages, or backend behavior.
