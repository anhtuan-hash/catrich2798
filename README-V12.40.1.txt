BRIAN ENGLISH STUDIO V12.40.1 — OPENROUTER CREDIT-AWARE RUNTIME

This patch fixes the OpenRouter 402 error shown as:
"This request requires more credits, or fewer max_tokens..."

Changes:
- Paid OpenRouter auto-routing remains the first choice for speed.
- When OpenRouter reports insufficient credit, the server automatically retries through openrouter/free.
- The free fallback remains inside OpenRouter; no other AI provider is added.
- TextLab generation budget is reduced from 3,800 to 1,400 output tokens.
- The server returns fallback, token-budget, and affordability metadata.
- AI availability across all apps is now based on the Vercel server gateway, not an old browser API-key flag.
- TextLab no longer asks users to enter an API key inside the website.

No new SQL is required.
No new Vercel variable is required. Keep OPENROUTER_API_KEY configured.
Optional: OPENROUTER_BILLING_MODE=auto (default), free, or paid.
