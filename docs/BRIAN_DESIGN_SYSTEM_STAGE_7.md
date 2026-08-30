# Brian Design System — Stage 7: Controlled Legacy Consolidation

Stage 7 begins reducing historical CSS payloads after Stages 1–6 established tokens, reusable UI, app migration and final visual authority.

## Principle: prove before delete

A versioned stylesheet is not retired merely because a later design-system layer visually overrides it. Removal requires evidence that the stylesheet itself is no longer carrying required structural, responsive, accessibility or runtime styling. Versioned DOM names or storage/event keys may remain as compatibility contracts even after their original stylesheet is retired.

## Audit findings

### v1093 — stylesheet retired, DOM compatibility names remain

`v1093.css` is already a compatibility tombstone. It contains comments only and no active selectors.

Stage 7 diagnostics confirmed that some production bridges still read `v1093-*` DOM class names, including the Work Hub hero bridge and Knowledge Hub. Those DOM names are therefore not declared dead. The important fact is narrower: the original `v1093.css` payload is already retired and must not silently gain selectors again.

### v1096 — stylesheet retired in Stage 7

`v1096.css` was the standalone Automation Center visual layer. The current router retains the historical `automation-center` token but does not render an Automation Center page, and Stage 7 found no active JSX/TSX UI consumer that requires the original `v1096-*` stylesheet.

`automationEngine.js` still intentionally uses version-tagged v1096 event, storage and source keys. These are data/runtime compatibility identifiers, not CSS consumers, and must not be renamed merely to remove a stylesheet.

Stage 7 removes the entire active v1096 selector payload and leaves a temporary comment-only tombstone because `main.jsx` still carries the historical import. A later bootstrap consolidation can remove tombstone imports together once the entry file is refactored safely.

### v1095 and v1097 — explicitly retained

These are not cleanup candidates in Stage 7:

- `v1095.css` remains associated with the active Knowledge Hub route.
- `v1097.css` remains structurally consumed by `CloudOperations.jsx`, including the `v1097-page` root contract.

### v1159 — explicitly retained

`v1159.css` is large, but size alone is not proof of obsolescence. It still carries global motion-retirement behavior and multiple active route/workspace selectors, including TTCM. It must be decomposed in a dedicated migration rather than deleted wholesale.

## Debt accounting

Stage 6 established a historical bootstrap ceiling of 15 `v####.css` imports.

Stage 7 introduces a more useful second metric:

- historical imports: maximum 15;
- active versioned CSS payloads: maximum 13;
- comment-only stylesheet tombstones: `v1093.css`, `v1096.css`.

This reduces active legacy style execution without making a risky full-file replacement of `main.jsx` while concurrent production changes are landing.

## CI contract

`Stage 7 Legacy Consolidation` fails if:

- `v1093.css` or `v1096.css` gains active selectors again;
- a JSX/TSX UI surface begins consuming a retired `v1096-*` class namespace;
- the standalone Automation Center renderer returns without a fresh audit;
- historical versioned imports exceed 15;
- active versioned CSS payloads exceed 13;
- verified active neighbor `v1095.css` or `v1097.css` disappears unexpectedly;
- `CloudOperations.jsx` loses its currently verified `v1097-page` contract without a new migration;
- Stage 5–6 final visual authority is removed.

The guard deliberately allows version-tagged runtime/storage keys and existing compatibility DOM names when they are not evidence that a retired stylesheet is required.

## Diagnostics

The Stage 7 workflow uploads its audit output as a short-lived artifact even when the audit fails. This makes future consolidation work explainable: a red check identifies the exact consumer or contract that blocked retirement instead of encouraging blind deletion or guard bypasses.

## Next consolidation targets

The next cleanup pass should inventory the remaining 13 active versioned payloads by production consumer and responsibility. Large mixed-responsibility files such as `v1159.css` should be split by contract first, then retired piece-by-piece only after equivalent token/component authority exists.
