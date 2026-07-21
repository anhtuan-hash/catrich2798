# Brian English Studio V12.32.0 — Unified AI Core Phase 1

## What changed

V12.32.0 replaces the split provider/runtime behavior with one backward-compatible AI core:

- Provider Hub and legacy AI settings now resolve to the same active provider, model, API key, Base URL and fallback state.
- `callAI()` uses Smart Routing candidates and provider-health feedback.
- Existing app calls remain compatible and still receive plain text.
- New `callAIWithMeta()` returns text plus provider/model/fallback provenance.
- Historical AI profile names are normalized through a canonical AI Task Registry.
- Provider Hub configuration is scoped to the signed-in account and migrates existing browser settings.
- Local OpenAI-compatible providers can run without a fake API key.
- No SQL migration is required.

## One-command install

Download the Update Only ZIP to `~/Downloads`, open Terminal in the Brian Git/Vercel project, and run the command supplied in `INSTALL-V12.32.0-ONE-COMMAND.txt`.
