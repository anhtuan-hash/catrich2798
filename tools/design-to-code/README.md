# BRIAN DESIGN-TO-CODE ENGINE · v1

**Status:** working Visual QA pilot + real Paper Settings layer. The engine is not a paid autonomous AI image-to-code service. It is a repeatable development and acceptance pipeline for mockup-driven UI changes.

## What actually runs

1. Real **SettingsLauncherHome** React component, using the existing buttons, pinning, search, permissions and module handlers.
2. The **Layered Paper Scrapbook** theme is opt-in on the PR preview: `https://<preview>/?brianPaper=1#/settings` (you must log in normally).
3. A **synthetic isolated fixture**, served only by Vite dev and **excluded from the production build**, renders the real component for deterministic Playwright screenshots without exposing any school accounts or records.
4. Playwright verifies desktop and mobile layout, search, pinned settings and navigation events. CI uploads desktop/mobile screenshots as artifacts.
5. The standalone CLI optionally compares a captured screenshot with the original mockup, writing a heat map and JSON diagnostics. **Do not claim 100% visual fidelity from a successful build.**

## Quick commands

```bash
npm ci
npx playwright install chromium
npx playwright test -c tools/design-to-code/playwright.config.mjs
# In a second shell:
npx vite --host 127.0.0.1 --port 4173 --strictPort
# Visual capture and optional mockup comparison:
node tools/design-to-code/cli.mjs capture \
  --url http://127.0.0.1:4173/tools/design-to-code/fixtures/settings-paper.html \
  --width 1145 --height 1374 \
  --reference ./mockups/settings-paper.png \
  --out ./artifacts/design-to-code
```

Remove `--reference` to capture without computing an invalid similarity result. The reference must be an image you are authorized to use (PNG/JPEG/WebP). Because the original AI-generated mockup remains a conversation attachment, it is **not** automatically available to GitHub Actions. Place it in a working directory and pass its actual path to the CLI. Run the same viewport dimensions as the reference for pixel-level comparisons.

## Acceptance flow for each new mockup

- Build a **module manifest** from the approved image and specify the exact route, viewport, roles, interactive actions, layout constraints, assets and test fixtures.
- Implement a **real component or isolated themed layer**. Never use a screenshot as an interactive facade. Do not overwrite private RLS policies, auth, forms or database schemas to satisfy visual matching.
- Create a new branch. Test at **390px mobile, 768px tablet, 1145px reference and 1440px desktop**, including reduced motion.
- Run CI and download the **brian-design-to-code-visual-qa** artifact. Examine its screenshots and the local reference heat map. Correct issues and rerun. A pass means automated structural tests passed, not exact visual identity.
- Deploy the GitHub/Vercel **Preview only**; require authenticated real-role smoke tests before release to production.

## Configuration / files

- `src/features/design-to-code/paper-tokens.css`: reusable paper design tokens.
- `src/features/design-to-code/settings-paper-layer.css`: opt-in production React layout styles.
- `public/assets/design-to-code/`: safe SVG texture and botanical assets.
- `tools/design-to-code/fixtures/`: synthetic visual QA harness.
- `tools/design-to-code/tests/`: Playwright tests for layout and interactions.
- `tools/design-to-code/cli.mjs`: screenshot, clipping diagnostics, optional mockup diff.
- `tools/design-to-code/manifest.settings-paper.json`: design and acceptance contract.
- `.github/workflows/brian-design-to-code-visual-qa.yml`: isolated GitHub Actions checks.

## Limitations and safeguards

- No paid AI API or background agent is connected. Given a new mockup, ChatGPT can use this pipeline through GitHub/Vercel tools **while the chat is active**. Autonomously accepting an image, inventing code and committing indefinitely would require an explicit agent host and model budget.
- Reference comparisons report **raw image differences** rather than arbitrary “98% similar” numbers. Different font rasterization, browser engines, crops or sizes change the measured error.
- Never upload real `storageState`, cookies, credentials, student names, private school records or captured authenticated pages as public artifacts.
- The fixture uses mock names/role for component demonstration and is not a login bypass. Actual `#/settings` stays behind the original authentication checks.
- New components must retain the ability to disable the layer instantly by removing `?brianPaper=1`, then repeat the same checks before merging to production.
