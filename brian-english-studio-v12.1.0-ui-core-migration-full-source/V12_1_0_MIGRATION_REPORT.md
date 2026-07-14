# Brian English Studio V12.1.0 — UI Core Migration

## Implemented
- All historical visual styles are loaded through one explicit legacy quarantine entrypoint.
- New UI work must use UI Core semantic tokens and primitives.
- Added native text input, textarea, select, metric, tabs, dialog and stack primitives.
- The textarea primitive forces horizontal writing mode and full-width sizing, preventing the historical AI composer collapse class of bugs.
- Brian Unified, Material 3 and Apple adapters continue to map the same semantic component layer.

## Migration status
This release completes the architecture and quarantine stage. Existing pages remain functional through the compatibility bridge; they are not falsely declared fully rewritten. Subsequent releases can migrate page groups without adding new global CSS patches.
