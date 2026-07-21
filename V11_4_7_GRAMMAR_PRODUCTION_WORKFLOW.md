# Brian English Studio V11.4.7

## Grammar Production Workflow V2

V11.4.7 rebuilds Grammar Builder as a specialist workflow for high-school English grammar materials rather than a general prompt box.

## Seven-step workflow

1. Choose build purpose.
2. Select grammar focus and contrast.
3. Define learners and context.
4. Approve an output blueprint.
5. Generate controlled AI batches.
6. Audit and teacher-review every item.
7. Publish, export or transfer approved content.

## Nine functional cards

1. Build Mode
2. Grammar Focus
3. Learner & Context
4. Source & Input
5. Output Blueprint
6. AI Copilot
7. Content Editor
8. Quality Audit
9. Publish & Connected Workflow

## Build modes

- Mini Lesson
- Practice Set
- THPT Exam Practice
- Diagnostic Test
- Revision Pack
- Interactive Activity

## Production controls

Teachers can control grade, CEFR, book, unit, context, usage purpose, output formats, number of sections, number of items, difficulty distribution, answer placement and quality constraints.

Each item is stored with format-aware metadata such as grammar point, CEFR, cognitive demand, context, production status, rule/pattern, explanation and common learner error.

## AI workflow

Grammar Builder uses the existing Brian AI Gateway and provider settings. No new API function is added.

AI tasks include:

- blueprint generation;
- controlled draft generation in batches;
- answer and ambiguity audit;
- difficulty transformation;
- differentiation;
- variant generation;
- diagnostic analysis and remediation;
- item-level rewrite;
- custom teacher instruction.

The app does not silently simulate a successful AI request. When no real provider key is configured, it displays a configuration error and keeps the deterministic sample workflow separate.

## Quality Audit

The local audit checks:

- exact duplicate stems;
- invalid or missing answers;
- ambiguity risks;
- missing explanations and metadata;
- repeated content words;
- CEFR, grammar and format distribution;
- teacher-approval readiness.

AI validation can add item-level findings, but final approval remains a teacher action.

## Teacher Vault and connected publishing

Projects are autosaved and account-scoped in the browser. Teachers can save snapshots, restore versions, reuse projects from Teacher Vault, add detected MCQs to Item Bank and transfer approved packs to:

- Lesson Architect
- Exam Studio
- Worksheet Factory
- Activity Studio
- Reading Studio
- Writing Studio
- Speaking Studio
- AI Lesson Integration Studio

Transfer schema: `bes-grammar-pack/1.0`.

## File and export support

Input: DOCX, PDF, TXT, Markdown and JSON.

Output: student Word document, teacher Word document, HTML, JSON, Teacher Library entry and Item Bank entries.

## Data and deployment

- Route: `#/tool/grammar-builder`
- Version: `11.4.7`
- Runtime core: `2.4.7`
- Vercel functions: `12/12`
- No new SQL migration is required for this release.
