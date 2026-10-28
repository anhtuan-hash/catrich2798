# BRIAN Halloween Full-Home V4 — approved mockup fidelity and release gates
Date: 2026-10-28 | Status: implementation specification | Owner: BRIAN Admin | URL: `https://esl-brian.vercel.app/#/home`

## 0. Non-negotiable goal
Create a **single coherent full-home Halloween mode**, including site navbar, Admin-editable Hero, published Photo Story slideshow, Weekly English Practice/Grade 10–12, page gutters, and canonical 3-card Footer. One approved-Admin switch in **Settings → Navigation → Halloween toàn trang** activates or *entirely reverses* this decorative presentation. The original CMS image, written copy, slideshow images/sequence, weekly lesson data, logos, academic credentials and app functionality are not modified or falsified.

Do not claim mockup fidelity just because CSS loads, a PR merges, or Vercel succeeds. Each of the seven sections has its own **question and release checkpoint**: **“Chỗ này đã bám sát mockup chưa? Nếu chưa, sửa tiếp.”** Any failed measurable check blocks deployment; subjective fidelity that cannot be verified in a screenshot must be reported as unverified, not called PASS.

## 1. System architecture
The authoritative server flag is a new column on existing RLS-protected public singleton `bes_navigation_theme_settings`:
- `halloween_home_enabled BOOLEAN NOT NULL DEFAULT false`: **staged OFF until approved QA and explicit production activation**. Do not accidentally change the current live site during migration.
- `bes_set_halloween_home_enabled(p_enabled boolean)` — security definer with fixed empty search_path, checks `auth.uid()` and active approved `admin/administrator` profile, and changes master, navbar and footer booleans *atomically* together to prevent a half-seasonal state. Existing individual Admin switches remain and may act as optional refinements when master is ON.
- `anon/authenticated`: SELECT only via existing RLS; no table UPDATE. RPC EXECUTE for authenticated only, but teachers/TTCM rejected server side.
- Frontend read hook: reuse current Supabase client, 30 s reconciliation + Realtime + window focus/storage and visibility, no optimistic writes; signed-out guests see same public flag.
- Global master OFF **wins over** old individual navbar/footer flags. Other parts: full-page overlay class is absent, Photo Story's Halloween skin attribute is false, global Halloween floating decals hidden, home presentation goes back to original CMS styling. The Admin toggle does not change Hero's stored background or overlays. This is **visual rollback**, not undoing separately published CMS media content.
- Switching master ON turns individual navbar/footer modes on too; a later individual setting can intentionally customize them while master remains on. Only the Admin's global switch can enable the full-page theme.

## 2. Visual tokens and grid
- Midnight plum `#171327`, gradient plum `#2b1c40`, warm parchment `#fff8f0`, peach `#fce7d4`, lavender `#f0e9fa`, muted copper `#c99168`, vivid pumpkin `#f2a158`, ink `#302638`, soft star `rgba(255,241,218,.34)`.
- Consistent radius 18–24px for cards (existing intrinsic dimensions respected), thin copper borders, modest 8–20px shadows, **no glass/white veil, gray glossy gradients or layered illustrations over text**.
- Desktop content max-width follows existing BRIAN app; gutters 16–28px, section gaps 20–28px. Maintain no horizontal scroll at 390px mobile and 768px tablet. Preserve full-height scrolling, fixed nav and active toolbar buttons.

## 3. Seven zone-by-zone fidelity questions (mandatory gates)
### G01 — Navbar: “Navbar đã bám sát mockup chưa?”
- Existing real BRIAN logo at left, readable uniform warm-ivory destination pills and a single orange selected tab; moon/bats/background dim and subordinate.
- Restore original navigation CSS when master OFF; login, notifications, TTCM, reports, and utility controls still work; unchanged pill dimensions. Mobile topbar uses matching palette and original touch targets.
- **Check:** computed nav background is Halloween only when master ON; WCAG label contrast >=4.5:1; no gray glossy gradient; no geometry shift on toggle. If not, refine selectors and rerun.

### G02 — Hero: “Hero có giữ đúng ảnh, vị trí, chữ và đủ rõ chưa?”
- Keep **current Admin-published Halloween illustration** pixel-identical, no blur and no second white veil. Apply only a restrained external border/shadow/frame and accent color on section metadata, never opacity/filter/backdrop-filter on image.
- Independent Hero CMS editor remains fully functional. When master OFF, remove added V4 Hero accents; preserve CMS image since that is separately Admin-selected.
- **Check:** identical image src/fit and heading+CTA text across ON/OFF; canvas media computed blur=0, no seasonal pseudo overlays covering media. Correct before proceeding.

### G03 — Photo Story: “Slideshow đã bám sát mockup và giữ nguyên tranh chưa?”
- Existing Halloween Photo Story already has its own orange/navy treatment and **left description + right full artwork**; V4 only coordinates its section borders, title colors, backgrounds, button styles and spacing.
- Unpublished albums remain hidden; public voting URL and full gallery link stay clickable; slideshow controls/transition/autoplay/QR remain.
- **Check:** image object-fit:contain, 0 cropped images, text never overlays painting; ON section accent consistent with footer; OFF original slideshow skin, not an orphan seasonal skin.

### G04 — Weekly English Practice: “Bài tập theo tuần đã cùng ngôn ngữ thiết kế chưa?”
- Warm ivory container, thin muted copper separator and 3 cards in coordinated parchment/lavender/apricot accents; maintain Grade 10 blue, Grade 11 warm orange, Grade 12 teal as **functional color indicators only** (not whole unrelated pastel surfaces).
- Real lesson rows, counts, status badges, managers, statistic controls, scrolling, click targets and per-grade data unmodified. Avoid Halloween stickers over 65 published practices.
- **Check:** all 3 cards readable, clicks still work, no rows clipped or scrollbars blocked; OFF uses source CSS.

### G05 — Footer: “Đã thực sự vẽ bên trong ba khung và hài hòa chưa?”
- Keep three original transparent Halloween SVGs **inside** brand/profile/credentials backgrounds. Use subdued colors so logos and text have no overlap; outer midnight frame must be compact, with Portfolio and Teach Better Together signature visible. Avoid ghost/pumpkin overlays above cards.
- Rightside dock may overlay content: reserve a small safe inset on wide screens while preserving enough width for long credentials; at narrower viewports use natural line wrap.
- **Check:** actual 3 computed backgrounds contain their respective SVG URL when ON, content box readable, logo images untouched; OFF contains none and restores baseline background properties. Verify viewport overlap and exact footer geometry.

### G06 — Whole-page atmosphere: “Các vùng nối nhau có giống một thiết kế không?”
- No giant random stickers floating across Hero or text. Reuse at most subtle static corner webs, stars, gentle autumn highlights in **gutter background only**, pointer-events none; collapse or hide the current high-z global Halloween floating-motif layer in Full-Home mode.
- Space between cards receives a premium midnight-to-parchment page canvas; important that Hero and weekly practice remain bright enough to read. Avoid a dark unbroken vertical slab.
- **Check:** visual blocks use consistent tokens; no fixed overlay at z=45 covering nav, links or Footer; no decoration boxes intercept clicks.

### G07 — Mobile and restore: “Tắt công tắc đã quay về giao diện gốc chưa?”
- At 390/768/1440/1536 widths, no horizontal overflow; mobile order: Hero → Slideshow → Weekly Practice → Footer (existing route flow).
- Master OFF must remove seasonal Home V4 class, seasonal navbar/footer flags and Halloween Photo Story skin; also hide fixed Halloween overlay. **Important:** original Admin-selected Hero picture may still be Halloween, because this is *content*, not a removable theme.
- **Check:** ON/OFF computed CSS snapshots, zero network/media/data mutation, restored tab/hero/practice/footer CSS. Recheck every zone after any CSS adjustment.

## 4. QA loop — enforce “Mockup bám sát chưa?”
For every zone G01–G07: (a) capture desktop (1440×900) and mobile (390×844) screenshots on branch/test fixture and/or genuine public preview; (b) verify theme ON vs OFF and interactive controls; (c) compare to approved screenshot reference at section level — palette hierarchy, text legibility, placement, illustration containment, density, motion and gaps; (d) report PASS/FIX/UNVERIFIED; (e) if FIX, change code, repeat screenshots and checks until PASS. **Never equate component/regression test with visual comparison of live site**. Only merge to Production once all reproducible gates PASS. If live authenticated rendering cannot be visually examined, record that as UNVERIFIED and prefer a PR/preview, not an unfounded 9/10 claim.

## 5. Engineering / release safety
- Prefer locally bundled SVG/linear gradients, no new libraries, no AI integration, no additional expense, no third-party remote assets.
- Separate `src/styles/HalloweenFullHomeV4.css` loaded from Home route only; no global `:root` palette overwrite. Navbar/footer master gating in their existing components. The site shell may gain a **data attribute**, not new wrappers that disrupt fixed overlay/scroll/portals.
- Keep reduced-motion behavior; no autoplay for decorative animation; honor guest access and Admin role gates.
- Security: migrate single column + function with restricted RPC and existing RLS; test anon SELECT/nonwrite and unauthorized RPC rejection. Verify existing nav/footer toggles persisted.
- CI gates: static architecture/security regression; Playwright screenshot/artifact + DOM layout/contrast/ON/OFF, core e2e for slideshow and weekly card links; actual Vercel production build. Prefer preview first. Do not merge if targeted QA fails. Screenshot artifacts are **evidence** for a human visual check, not automatic proof of fidelity.
