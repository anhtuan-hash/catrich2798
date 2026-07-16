BRIAN ENGLISH STUDIO V12.40.3 — OPENROUTER FREE JSON RESILIENCE

This release fixes the TextLab AI failures observed after OpenRouter privacy routing was enabled:
- AI request timeout
- OpenRouter returned no output text
- Unterminated string in JSON

WHAT CHANGED
1. Unset environment values now preserve real defaults. Previously, an empty value became zero, reducing JSON timeout from 130 seconds to 5 seconds and output from the intended token budget to only 64 tokens.
2. JSON requests now require an OpenRouter endpoint that supports response_format.
3. The free JSON token cap is 2400; TextLab requests up to 2200 tokens.
4. One HTTP 200 empty response is retried once with a fresh session id.
5. One transient network/timeout failure is retried once.
6. TextLab now has a registered JSON contract requiring templateId and content.
7. TextLab prompts explicitly escape line breaks and embedded double quotes.
8. Free-first routing remains active. Paid models still require OPENROUTER_ALLOW_PAID_MODE=true.

DEPLOY
Replace the repository source with this package, commit to main, and wait for Vercel to deploy.
Keep OPENROUTER_API_KEY in Vercel. Do not put the key in GitHub or frontend environment variables.
No further OpenRouter Privacy or Guardrail changes are required for the settings shown in the supplied screenshots.

VERIFY
npm ci
npm run verify:v12.40.3

EXPECTED
- Build succeeds.
- V12.40.3 free JSON resilience test passes.
- Main smoke suite passes.
- Department runtime suite passes for admin, department head, and teacher.
