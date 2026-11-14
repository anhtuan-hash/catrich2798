# BRIAN ENGLISH — Workspace guardrails for Antigravity

- This is an EXISTING functional production application. Refactor UI only when the current task is an approved visual redesign. Do not rewrite the app architecture casually.
- Use `design/reference/swiss-editorial-approved.png` as the canonical Swiss Editorial Premium visual reference. The image is a design guide, not an image to paste as the UI.
- The global application navigation must remain present and functional; do not remove routes or features that the mockup happens not to show.
- The contest banner must appear at the top of competition app content (directly after the global navigation) and use real official image assets and accurate texts already approved in the app. Do not manufacture or alter official logos.
- Preserve all actual footer information and links, including the branding/partner information and teacher credentials, in readable form; do not turn it into a single decorative image. The footer follows all page content.
- Existing role permissions, admin controls, student submission and moderation, approval/publish state, secure storage, Supabase persistence, teacher live classroom, data exports, QR invitation flows, and Three.js/React Three Fiber 3D features must keep working.
- No fabricated data, claims, counts, statuses, school photos, certificates, or project images. Only display source-backed data or already approved real assets. Do not replace real data with placeholders or demo content.
- Respect existing design tokens and components when practical, extend with scoped `swiss-editorial-*` tokens rather than force global CSS regressions.
- Do not overlay a screenshot, convert the interface into one full-page SVG or use absolute-positioned labels as a substitute for responsive, interactive HTML.
- Maintain accessibility: keyboard use, focus visibility, semantic headings, contrast, labels, motion preferences, no text clipping.
- Keep the route conventions, auth behavior, API contracts and data schemas unchanged unless independently approved.
- Protect secrets: never print, commit, or paste environment values, bearer tokens, or service-role keys. Use existing `.env.example` contracts only.
- All code changes go to a separate branch/worktree; do not force push, change Vercel production settings, or merge automatically. Explicit user approval is required for production deployment.
- Every phase requires: screenshot comparison, responsive checks, functional smoke tests, build/lint/tests, change summary, and accurate known limitations. Never claim visual fidelity or passing tests without evidence.
