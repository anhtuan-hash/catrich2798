# BRIAN Early Warning V6 — Evidence integrity and acceptance testing

**Registered innovation:** Xây dựng mô hình cảnh báo sớm và can thiệp học tập dựa trên dữ liệu nhằm hỗ trợ học sinh có nguy cơ hụt chuẩn năng lực môn Tiếng Anh ở trường THPT.

**Scope:** Additive V6 draft stacked on V5; no live database migration and cloud sync remains OFF.

## 1. What can be audited

The app exports (1) a pseudonym-free aggregate Markdown analysis and (2) its SHA-256 JSON manifest. The manifest records the exact filename, UTC export time, file size, SHA-256 digest and aggregate denominators; no learner IDs, names or free-text notes are included.

**Critical limitation:** The digest checks whether the downloaded Markdown changed since export. It does not prove that original student scores and classroom observations are authentic, that data-processing permission was obtained, that assessment Forms A/B are equivalent, or that a causal intervention effect occurred.

### Integrity check
1. With institutional approval, import coded scores and collect at least five complete pre/post paired learners.
2. Use Study evidence & data quality → Export aggregate dossier draft.
3. Use Export SHA-256 audit manifest.
4. Keep both files in an institution-approved storage area. The JSON reportFile field identifies the exact Markdown file.
5. On macOS/Linux, run a SHA-256 digest calculation (shasum -a 256 FILE.md) and compare the output with reportSha256 in the JSON file.

## 2. Operational readiness

Four in-app checks show baseline completeness, teacher review completion, eight documented weeks for confirmed learners and complete matched assessments. External requirements remain **unverified** by the app: school authorization and privacy notices, assessment-equivalence review, staging RLS cross-account security tests, and a research design enabling justified effect claims.

**Even if all in-app checks pass, the application NEVER declares the city-level innovation approved or ready to submit.**

## 3. Browser acceptance tests

File: tests/e2e/english-early-warning-v6.spec.js (Chromium and WebKit). Uses clearly artificial, coded test-only records in the Playwright test environment; no database seeding.

Scenarios: authorized Student Support route boots; cloud sync disabled; identifying headers rejected; coded CSV imported; teacher confirmation required for intervention logging; eight-week UI accepts a Week 1 entry; aggregate Markdown and JSON download; SHA-256 of actual downloaded Markdown matches manifest; refresh clears sensitive in-memory state; mobile viewport does not overflow horizontally.

Suggested commands:
- npm ci --ignore-scripts
- npx playwright install --with-deps chromium webkit
- npm run build
- node scripts/test-english-research-audit-v6.mjs
- npx playwright test tests/e2e/english-early-warning-v6.spec.js --project=chromium-desktop --project=webkit-desktop

CI: .github/workflows/english-early-warning-v6.yml.

## 4. Production release blockers

Do not merge to production before browser QA and visual accessibility review. Do not activate cloud saving without institutional privacy approval, approved SQL migration, independent staging RLS tests for teacher A, teacher B and anonymous users, and retention/deletion procedures. Do not use fictitious student outcomes as evidence.

## 5. Version map

- Screening rules v0.1 (V3)
- Eight-week intervention journal v1.0 (V4)
- Descriptive paired outcomes v1.0 (V5)
- SHA-256 report manifest and operational readiness v1.0 (V6)
