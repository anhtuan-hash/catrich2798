# Brian Teaching Board — Visual & Motion V5
October 25, 2026 · ESL Brian · Responsive design and animation refresh

## Intent
Upgrade the existing Brian Board portal in-place, keeping Ivory Studio, Midnight Slate, and Classroom Canvas intact. Make writing central, improve legibility and touch targets, and give classroom challenges visible but respectful motion. No AI, no subscriptions or external visual assets.

## What changed
1. **Unified design tokens**: theme-aware palette for canvas, chrome, panels, text, accents, focus indicators and shadows. Reusable radius and surface treatment across all 3 original themes.
2. **Studio command bar**: larger title field, save-state chip, refined B mark, touchable Undo/Redo, TV, Preview, Inspector and Close. Distinct active local-TV status.
3. **Tactile pen rail**: grouped tools with separators and larger pressed indicators; active tool exposes `aria-pressed`. Tool selection never modifies board content until an actual gesture is drawn.
4. **Canvas-first center workspace**: spacious drawing stage with subtle shadow, 16:9-friendly surface and a contextual breadcrumb showing current page and selected tool/activity.
5. **Smooth scene transitions**: the active page or activity stage is keyed to its identity and enters gently on page switching. Existing drawn strokes do *not* continually animate or re-render because stage identity is unchanged during pen input.
6. **Inspector overhaul**: flexible horizontally scrolling tabs (no compressed 5-column tab text), readable forms, larger input targets and better-separated lesson cards.
7. **Mobile inspector**: a sliding inspector drawer with dimmed scrim and an explicit Close control. Slide-out has a real exit animation, not just an instantaneous unmount. Inner inspector scrolls vertically on Android with touch-action pan-y and momentum scrolling.
8. **Mobile top controls**: on narrow phones, header reorganizes into a two-row toolbar so Manual Save, TV and other controls are not cropped. Scrollable horizontal pen rail stays above the footer.
9. **Learning stage refresh**: larger cards, consistent rounded layout, selected team rings, tactile buttons, and correct/wrong feedback indicators. Expressive mode permits a short confirmation animation with no external confetti/particle engine.
10. **Configurable motion**: Design → Interface motion → Off / Subtle / Expressive. The preference is stored only in browser localStorage as `bbd-motion-v1`, not in Supabase or across accounts. Native `prefers-reduced-motion` always disables animation irrespective of choice.

## Motion & safety rules
- **Off**: no CSS transitions, no animated page movement and no WAAPI portal transitions.
- **Subtle**: short one-off transitions on stages, panels and button feedback (default).
- **Expressive**: more evident one-off stage/inspector entry, selected tool halo and hover sheen, never continuous high-cost whole-page motion.
- `prefers-reduced-motion: reduce` overrides all effects.
- All new animation primarily uses compositor-friendly opacity/transform; none of the effects samples every pen point, fetches a font, or downloads animation assets.
- Interaction remains React state and existing input events; no overlay may intercept the actual drawing surface, except the explicitly opened mobile inspector scrim.

## Regression and rollout
- `scripts/test-brian-board-visual-v5.mjs` is a required production build gate and inspects responsive CSS, motion controls, privacy-preserving TV flows, keyboard accessibility and no remote asset dependencies.
- Existing board Foundation, PDF, owner-private activities, drawing, Focus and Sync Doctor tests remain build gates.
- Manual logged-in QA is still recommended on iPhone, iPad/Apple Pencil, Android Chrome, 16:9 projector/TV and Safari reduced-motion mode. Automated source/build checks are not a substitute for physical pen/palm-rejection testing.
- No Supabase migrations, no Brian Focus or background YouTube modifications, no alteration of teacher-only answer projection. Board TV remains same-machine BroadcastChannel; authenticated remote device pairing is a separate feature.
