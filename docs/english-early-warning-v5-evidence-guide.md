# V5 — Aggregated research evidence and reporting

**Sáng kiến cấp Thành phố:** Xây dựng mô hình cảnh báo sớm và can thiệp học tập dựa trên dữ liệu nhằm hỗ trợ học sinh có nguy cơ hụt chuẩn năng lực môn Tiếng Anh ở trường THPT.

## Research evidence features

- Shows **the count of learners with complete paired baseline and post four-skill assessments**. Incomplete post tests are counted as missing, not as zero.
- Calculates paired changes per learner first, then a descriptive mean and median of the within-student differences.
- Displays a 95% paired-t confidence interval when at least **two** valid pairs are available. For one or zero pairs, interval is unavailable; with identical changes, its width can be zero.
- Lists separate paired estimates for listening, speaking, reading and writing. Skill sample sizes can differ.
- Shows teacher-confirmed cases, the number of actual intervention events, weeks documented, and recorded task completion.
- Includes a **committee-oriented, code-free Markdown export** with study denominators, missingness, intervention implementation and limitations.
- This aggregate export requires **at least five coded learners** to reduce accidental disclosure from very small cohorts. It never contains individual student codes, their narrative notes or original student identifiers.

## What the analysis does NOT establish

- A causal effect of intervention without an appropriate design.
- Equivalence of Forms A/B or agreement between raters.
- Sensitivity/specificity of the rule-based screening thresholds.
- Probability of dropping below a standard.
- Official B1 attainment or graduation eligibility.

The 95% interval only describes sampling uncertainty of paired-score differences under parametric assumptions. Report the actual pairing denominator and inspect its distribution, selection and missingness before inference. A complete pre/post pair is **not** evidence that support caused the change.

## Privacy / release constraints

No dummy student results appear in the UI or report. Do not export pseudonymized row-level data into public contest documents. Store row-level evidence in access-controlled school systems. SQL for optional cloud storage remains **review-only** and cloud sync is OFF.

## Tests

```sh
node scripts/test-english-early-warning.mjs
node scripts/test-english-intervention-v4.mjs
node scripts/test-english-cloud-snapshot-v4.mjs
node scripts/test-english-cloud-schema-static-v4.mjs
node scripts/test-english-research-evidence-v5.mjs
npm run build
```

## Release checklist

- PR checks green, including Critical E2E.
- Manual screen QA on responsive widths, keyboard/screenreader focus, CSV download review.
- School authorization and privacy workflow for student data.
- Staging, cross-account RLS tests before cloud storage is enabled.
- V2 assessment instrument calibration and equivalence plan documented.
- Only after approved real pilot data have been collected should results and effect interpretations be drafted.
