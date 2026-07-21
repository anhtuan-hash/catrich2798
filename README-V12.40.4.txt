BRIAN ENGLISH STUDIO V12.40.4 — OPENROUTER FAST FREE MODE

PURPOSE
Keep AI text generation completely free while reducing the inconsistent delay of openrouter/free for JSON tasks such as TextLab.

WHAT CHANGED
1. The server queries OpenRouter's model catalog for free models supporting response_format, sorted by current latency.
2. Paid models, reasoning/thinking models, rerankers, embeddings, moderation models, guards and OCR-only models are rejected.
3. The selected model is cached for 15 minutes to avoid a catalog request on every generation.
4. The fast free primary model has a 40-second deadline.
5. On timeout, rate limit, route failure or provider failure, the request switches once to openrouter/free with a 45-second deadline.
6. An empty successful response also switches to openrouter/free once.
7. JSON provider endpoints are sorted by latency and must support all request parameters.
8. TextLab uses a compact 1800-token JSON contract at temperature 0.2.
9. AI receipts expose the selected fast model, selection source, catalog time and fallback state.
10. Paid routing remains locked unless it is explicitly enabled separately. Fast Free Mode never opts into paid models.

OPTIONAL VERCEL VARIABLES
No new variable is required. Defaults are production-ready.

OPENROUTER_FAST_FREE_MODE=true
OPENROUTER_FAST_FREE_TIMEOUT_MS=40000
OPENROUTER_FAST_FREE_FALLBACK_TIMEOUT_MS=45000

OPENROUTER_FREE_MODEL_JSON may be set to a specific :free model if you later want to pin one. A non-free model value is ignored by Fast Free Mode.

VERIFY
npm ci
npm run verify:v12.40.4

EXPECTED
- V12.40.4 Fast Free Mode test passes.
- Build succeeds.
- 188 application smoke checks pass.
- Department runtime passes for admin, department head and teacher.
