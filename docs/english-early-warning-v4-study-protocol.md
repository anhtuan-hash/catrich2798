# Pre-registered implementation protocol: English Early Warning & Intervention (8 weeks)

**Proposal for a city-level educational innovation dossier; no participants enrolled and no results asserted by this file.**

## 1. Purpose and scope

Maintain the registered Vietnamese title unchanged: **Xây dựng mô hình cảnh báo sớm và can thiệp học tập dựa trên dữ liệu nhằm hỗ trợ học sinh có nguy cơ hụt chuẩn năng lực môn Tiếng Anh ở trường THPT.**

Initial pilot population: approved Grade 11 English classes, extendable to Grades 10 and 12 after the same validation process. Unit of observation: pseudonymized learner per assessment occasion; unit of implementation: teacher-assigned class. Participation and data processing require documented institutional authorization and appropriate privacy notices.

## 2. Fixed baseline and rules

Before interventions, record four 0–100 diagnostic skill scores (Listening, Speaking, Reading, Writing), the two latest comparable assessments, and unfinished tasks during the previous 14 days. Preserve the approved code mapping only in a separate, access-controlled institutional location.

Rule version **0.1**:
- D: four-skill mean below 60 **or** minimum skill below 50.
- F: both latest assessments below 60.
- T: at least two uncompleted tasks in 14 days.
- 0/1/2+ triggered signals = no current signal/review suggested/priority teacher review. If any indicator lacks required input, flag **Insufficient data** rather than treating it as 0 or negative.
- Two or more signals do **not** establish an actual probability of future failure. The teacher reviews context and records a decision; no automatic negative student consequence is permitted.

The thresholds must remain frozen during the first eight-week cycle. Any post-hoc change must be labeled exploratory and recorded with a new rule version.

## 3. Implementation and evidence schedule

| Period | Classroom work | Evidence generated |
| --- | --- | --- |
| Before Week 1 | Permissions, privacy briefing, code assignment, pilot A/B test form review, baseline and data-quality check | Signed/approved process documents, instrument version and anonymized baseline |
| Week 1 | Teacher verification; agree learning objective based on weakest skill; assign tasks | Review decision code, intervention plan and session entry |
| Week 2 | Guided support; check task completion and first short checkpoint | Weekly task counts and checkpoint; teacher review |
| Week 3 | Scaffolded listening/speaking/reading/writing practice by skill | Dated session entry; work samples stored in school-approved location |
| Week 4 | Midpoint formative assessment and process review | Interim accuracy/completion metrics and change log |
| Week 5 | Adapt workload within the same skill targets without changing baseline rules | Dated intervention entry with reason for adjustment |
| Week 6 | Guided transfer tasks and feedback | Activity logs and optional checkpoint |
| Week 7 | Independent practice and preparation for post assessment | Activity logs; missingness audit |
| Week 8 | Apply approved form B and speaking/writing rubric; close intervention entries | Four post-skill scores, matched coded outcomes and report |

Record entry timestamps, teacher-reviewed decision codes, task counts, and checkpoint scores only when actually observed. **No synthetic surveys, fabricated improvement, or reconstructed historical interventions.**

## 4. Analysis plan

Primary descriptive outcome: mean change of four-skill average for learners with both complete pre/post scores. Include N paired, baseline and post means, absolute change, median/IQR if practical, and 95% confidence interval for matched mean difference (provided assumptions are stated). For skills, report paired changes individually and their distributions; adjust claims for multiple analyses or call secondary skill tests exploratory.

Secondary implementation outcomes: number of teacher-reviewed priority cases, confirmation rate, number of learners receiving documented support, proportion completing assigned tasks, weeks with documented activity, and missing post-test counts.

If a suitable comparison class exists, pre-specify matching, non-equivalence caveats and the comparison estimator; do not claim causality from uncontrolled pre/post changes. Report alternative explanations (regression to the mean, maturation, extra tuition, test-form difficulty and teacher effects).

## 5. Validity and limitations

- Form A/B are currently aligned to a blueprint **but not equated**. Complete pilot item-level review and document any revisions before interpreting gains.
- Speaking and writing rubric use should have examples, criteria and recorded assessor decisions. If there is no independent second rater, **do not report inter-rater reliability**.
- Inspect false positives and false negatives after the cycle without re-labelling the original screening results.
- Missing data are never imputed as zero. Record who withdrew, missed lessons or could not be assessed, in aggregate.
- Compare cohorts without exposing coded identities in published material.

## 6. Data governance

Study code mapping kept offline and separately authorized; only coded IDs in the app. Current V4 preview stores the journal in ephemeral browser memory. To enable cloud persistence, a separate school authorization, staging RLS security test and database migration approval are required. The cloud snapshot excludes free-text teacher notes by design.

Do not share actual student names or unique student identifiers in GitHub issues, screenshots, logs, URLs, public Vercel previews or the city-level dossier. Share aggregated counts and privacy-reviewed exhibits.

## 7. Deliverables for the city-level dossier

1. Version-locked protocol and rubrics with revision history.
2. Baseline quality-control report and frozen coded dataset.
3. Weekly teacher action logs and process evidence.
4. Matched (where available) pre/post statistics, uncertainty and missing-data accounting.
5. Security architecture/RLS tests, reproducible code and software QA screenshots.
6. Evidence for feasibility and potential replication at a second school/class; distinguish **potential** from demonstrated scaling.

**Not yet demonstrated:** diagnostic sensitivity/specificity, causal effect, proficiency certification, reliability of equated A/B forms, citywide effectiveness.
