# Hero Theme Studio V1 — Design

**Approved:** 2026-09-02

## Goal

Add a site-wide Hero Theme Studio without rewriting existing Hero content or logic. The theme engine is an optional background layer: when no published custom theme applies, every Hero must remain visually and behaviorally identical to the existing implementation.

## Core decisions

- Use a stable **Hero Registry** (`heroKey`) and a global **Theme Runtime**.
- Store image binaries in the existing connected Google Drive; store only metadata/configuration in Supabase.
- Keep Draft and Published state separate. Public/teacher/student clients only consume the active published revision.
- No implicit inheritance. `mode: original` means the runtime is a no-op for that Hero.
- Publish and restore are transactional database RPCs. Restore creates a new revision.
- Theme media is served through a read-only app endpoint that verifies the file is referenced by the active published revision before proxying Drive bytes.
- Only approved `admin` accounts can read Studio state or mutate/upload/publish/restore. Public manifest/media reads are intentionally anonymous and contain no draft/admin metadata.
- Reuse the existing Google Drive OAuth connection and server helpers; do not introduce a second credential system.

## Theme shape

Each Hero entry is either:

```json
{ "mode": "original" }
```

or:

```json
{
  "mode": "custom",
  "mediaId": "<hero_theme_media UUID>",
  "fit": "cover",
  "positionX": 50,
  "positionY": 50,
  "zoom": 1,
  "opacity": 1,
  "brightness": 1,
  "blur": 0,
  "overlayColor": "#000000",
  "overlayOpacity": 0.25
}
```

All values are normalized/clamped on both client and server.

## Data model

- `hero_theme_sets`: reusable named theme libraries.
- `hero_theme_drafts`: one mutable draft per theme set.
- `hero_theme_revisions`: immutable published snapshots.
- `hero_theme_active`: singleton pointer to the active revision.
- `hero_theme_media`: metadata for Drive-backed images.

SQL also defines:

- `hero_theme_publish_draft(theme_set_id)` — atomically inserts a revision and swaps the active pointer.
- `hero_theme_restore_revision(revision_id)` — atomically clones an old snapshot into a new revision and activates it.

## Runtime safety contract

1. No manifest, failed manifest, missing Hero key, `mode: original`, invalid config, missing media, or failed image load => original Hero.
2. Runtime must not change Hero text, buttons, layout logic, existing animations, or CMS data.
3. The themed layer is inserted behind Hero content and removed cleanly on route/theme changes.
4. Only the current route's registered Hero is resolved; unrelated Hero images are not prefetched.
5. Media responses use long-lived browser/CDN caching; manifest uses short stale-while-revalidate caching.

## Admin Studio

The Admin page adds a dedicated Hero Theme Studio section with:

- theme library/create/select,
- live Hero preview,
- Hero selector,
- image upload,
- fit/position/zoom/opacity/brightness/blur/overlay controls,
- Reset to original,
- Apply to selected / Apply to all,
- Save draft,
- Publish,
- revision history and Restore.

Image uploads accept JPG/JPEG/PNG/WebP up to 10 MB. The browser optimizes large uploads to WebP when supported; the server independently validates magic bytes, actual dimensions and a pixel ceiling before placing the image under the Drive `Hero Themes/Uploads` hierarchy.

## Registry

Registry entries contain a stable key, route, human label, and one or more conservative selectors for the existing Hero root. The registry validates uniqueness at module initialization. Selectors are only used to attach `data-hero-key`; no content is rewritten.

Initial V1 registry covers the principal route-level Hero surfaces in the current product and can be extended by adding a registry entry rather than modifying the Theme Studio engine.

## Rollout

The SQL file is idempotent and safe to apply repeatedly. Frontend/server code must remain fail-open until the database upgrade is present, so deploying code before/while applying the SQL cannot break public pages.
