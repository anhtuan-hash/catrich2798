# BRIAN REPORTS — AI Proofreading Studio v1.0
Date: 27 October 2026

## Scope and goal
Adds a leader-only AI proofreading assistant to Brian Team / Tổng hợp tổ / Bản tổng hợp. Existing teacher report records, assessment modules and manual Word/PDF actions must be preserved.

## Source map
- src/pages/MonthlyReportsWorkspace.jsx: AI button, original snapshot, approval, restore, existing exports.
- src/components/ReportProofreadingStudio.jsx and .css: consent, four modes, original vs. revised, editable suggestions, progress/errors and confirmation.
- src/utils/reportProofreading.js: safe HTML narrative extraction, chunking, numeric invariant and textContent replacement.
- api/report-proofread.js: guarded Cloudflare Workers AI Free endpoint and server-side authorization.

## Flow
1. TTCM clicks Tạo báo cáo tổ; the generated HTML is snapshotted as originalHtml.
2. TTCM clicks AI hiệu đính and chooses one of four modes: formal, grammar, concise, full.
3. The user must explicitly consent to sending narrative bullets to Cloudflare before pressing Bắt đầu hiệu đính.
4. Only list-item narrative text goes to the AI. Personnel totals, names in headers, headings, professional-statistics table, signatures and embedded document HTML do NOT go to the provider.
5. Requests are split into sequential UI chunks of 4 blocks and 1,800 characters each (server validates maximum 12 blocks and 4,900 characters); maximum 1,600 characters per bullet. Invalid JSON triggers automatic binary splitting and retry. If a single block still cannot be structured, the server attempts plain-text proofreading. If the single-block AI result remains invalid, the original block is retained and the user is warned. Auth, quota, and network errors stop the attempt; partial suggestions are not applied.
6. The backend validates Supabase Auth Bearer token, approved role, and matching department in the caller-owned Brian Team workspace. The Supabase row-level policy still restricts workspace access.
7. AI is instructed to keep facts unchanged, returning JSON revisions with the same IDs and order. Backend checks count, IDs, nonempty text and ordered numeric tokens. Browser re-checks numeric tokens when applied.
8. Text replacements use DOM textContent, never HTML injection. The TTCM can edit suggestions, approve, export Word/PDF, or restore the original version.
9. No database write occurs when AI returns results. Final approved HTML is held in this browser view for Word/PDF. Teacher submissions remain unchanged.

## Provider, security and fee controls
- Provider: Cloudflare Workers AI REST; pinned JSON-Mode-capable model @cf/meta/llama-3.1-8b-instruct, with schema-constrained responses. The fallback switches output mode (to plain-text single paragraph), NOT AI provider. There is no paid-model fallback.
- Vercel secret env required: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN.
- Existing server env required: SUPABASE_URL or VITE_SUPABASE_URL and SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY.
- No secret is placed in VITE-prefixed Cloudflare variables or browser JavaScript.
- Endpoint is POST-only with no-store headers; 28 s upstream timeout and per-instance best-effort throttling of 50 requests per five minutes. Each client operation caps retries at 60 requests. Rate limiting is best-effort and not globally distributed.
- Rate limiting is NOT distributed/global; run the AI provider account on a Cloudflare Free plan to guarantee no overage billing. On Paid accounts, usage above the free allocation could incur charges.
- No personal-data sharing with the provider before explicit consent. School data-processing policies still apply.
- Numeric preservation does NOT prove all facts unchanged; TTCM review is mandatory.

## Setup (remaining outside GitHub)
1. In a Cloudflare Free account, open Workers AI / Use REST API, copy Account ID and create a restricted Workers AI API token.
2. In Vercel project Settings / Environment Variables, set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN for Production. Never publish these values in GitHub or this document.
3. Confirm server-side Supabase URL and anon key exist, then redeploy after adding secrets.
4. Log into a leader-owned Brian Team department workspace and test a short report.
5. Monitor Cloudflare Workers AI Free daily allowance of 10,000 neurons; Free operations are rejected when exhausted.

## Acceptance checklist
- Signed-out and teacher-only users cannot use the API.
- Mismatched department is rejected.
- Missing API secrets reports configuration error instead of charging or using paid AI.
- Header, counts, professional stats and signature are unchanged.
- AI changing digits is rejected at the API level; malformed JSON or missing blocks triggers smaller-batch recovery. Any single-block result that remains invalid is left unchanged and clearly flagged.
- Cancel/discard leaves the original untouched; Duyệt & áp dụng updates only the preview; Bản gốc restores it.
- Approved content is reflected in Word/PDF export.
- Failure returns a human-readable message without logging full confidential report or secret.
- Public build and runtime checks must succeed before asserting Production readiness.

## Deployment status
Files have been committed to the repository. Running on the live site requires deployment and provision of provider secrets. No live authenticated AI request is claimed yet.
