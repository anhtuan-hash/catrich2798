# BRIAN FOCUS — INTERACTIVE WEB SCENES
Version 1.0 — 2026-10-27

## Objectives
Extend the existing global Focus Scene Studio to show and interact with multiple HTTPS websites inside the Focus overlay, not a separate app. Keep images, videos, isolated HTML, YouTube playlist, persistent YouTube playback, Focus dock, clock, role checks and Supabase sync.

## Roles and lifecycle
Only Admin / TTCM using authenticated Supabase accounts may publish shared scenes. All authorized viewers read the global singleton. The existing role guard, RLS policies, realtime and refresh mechanism remain unchanged. The prior scene persists until an admin publishes a new source. The existing YouTube media_path stays intact when switching to websites and can be selected again.

## UX and controls
- Paste up to 30 HTTPS URLs or iframe snippets with src into Scene Studio, one per line.
- Validate HTTPS and reject unsafe/local URLs, duplicates and active BRIAN origin.
- Edit labels, reorder, remove, launch website in a new tab.
- Choose default layout: single, split two, grid four.
- Preview the first site on demand (iframe, no unsolicited background load while editing).
- Publish by the existing Save & Sync action. Other accounts receive URLs, titles and default layout.
- Stage shows a toolbar: previous/next manually, layout choices, interaction toggle.
- Each visible panel supports reload and external launch. In passive mode the clock stays; in interactive mode the central clock/dock visuals stop intercepting the page; exit returns Focus.
- Only one, two or four iframes displayed at once (never all thirty).
- Layout changes by a viewer are local to that session. Embedded website state, login and clicks never sync to other accounts. Sites cannot be advanced automatically because general iframes do not expose reliable end events.

## Database
Add web_scenes JSONB array and web_layout TEXT to public.brian_focus_settings. Both default non-null. Change media_type and consistency constraints to allow website with media_path empty. JSON array is max 30 entries / 18KB. Retain media_path limit 512 and YouTube's validated ID schema. No new table, storage bucket, policies or external paid services.

## Security
Accept HTTPS only. Reject local/special domains, literal IP addresses, credentials in URL, self-origin, non-default HTTPS port, and URLs longer than 2000 chars. Frame sandbox allows scripts, forms, same-origin for cross-site compatibility and popups, but forbids top-navigation. No untrusted iframe HTML injection into host document. Use referrerPolicy no-referrer. Third-party websites may block iframe with X-Frame-Options or CSP frame-ancestors; provide external link. Cookies, microphone and sign-in behavior depend on each domain/browser. Never assume arbitrary sites will work.

## Acceptance tests
1. Existing image/video/html sources and YouTube 30-video playlist still work, without remounting the persistent YouTube player.
2. Admin saves 3 websites, titles, order, default layout. Reopen and verify another signed-in account sees same.
3. Toggle interaction, click/type/scroll in an embeddable page, exit and restore clock.
4. Next/previous, reload, split and quad without more than four iframe instances.
5. Invalid URLs, duplicate URLs and same-origin iframe attempts rejected; XFO/CSP blocks offer tab fallback.
6. Non-admin sees viewer only. Save failures show error notice.
7. Run npm build (with scripts/test-brian-focus-web-scenes.mjs) and verify Vercel production manually.

## Rollback
Set shared media_type back to previously selected image/video/html/youtube/default using Scene Studio. Schema additions are backwards-compatible and need not be reverted. Feature can be reverted by Git rollback without deleting website settings.
