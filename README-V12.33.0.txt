Brian English Studio V12.33.0 — Unified AI Core Phase 2

Update-only package. No SQL migration required.

Main changes:
- Central Privacy Filter before every callAI provider request.
- Local restoration of masked placeholders after validation.
- Output Guard for JSON, required fields, counts, duplicates, MCQ and length.
- One automatic repair pass before provider fallback.
- Safety controls and metrics in AI Governance.
- Explicit output contracts in Worksheet Factory, Grammar Builder and Speaking Studio.

Run: npm ci && npm run verify:v12.33.0
