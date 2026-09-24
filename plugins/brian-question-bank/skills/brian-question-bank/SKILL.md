---
name: brian-question-bank
description: Create, search, verify and save English assessment content in Brian Question Bank, especially Vietnamese TN THPT 2025–2026 Cloze Text and Reading Comprehension workflows.
---

# Brian Question Bank

Use the Brian MCP tools when the user asks to work with their Brian question bank.

## Core workflow

1. Before generating content that should avoid duplication, call `search_brian_questions` with useful topic/type/grammar filters.
2. Create the complete content before writing it to Brian.
3. Audit every MCQ for exactly one defensible answer.
4. Preserve any shared passage, notice, dialogue, cloze text, or other common stimulus as one bundle.
5. Save the bundle and all its child questions together with `save_brian_questions`.
6. When the user asks for a complete exam, use `save_brian_exam` so Brian stores the exam and its question links.
7. When reopening a stored exam by ID, use `get_brian_exam`.
8. After a write, report the number of new items, reused duplicates, and the exam ID when applicable.

## TN THPT 2025–2026 bank conventions

Use these canonical bundle/type tags when they fit the user's request:
- `functional_cloze_6`: one shared functional text, exactly 6 MCQs.
- `discourse_cloze_5`: one shared discourse text, exactly 5 MCQs.
- `reading_8`: one reading passage, exactly 8 MCQs.
- `reading_10`: one reading passage, exactly 10 MCQs.
- `arrangement_5`: arrangement items are standalone questions; a standard TN THPT set uses 5.

A standard Brian TN THPT 40-question blueprint uses:
- 5 Arrangement questions
- 1 Discourse Cloze bundle × 5
- 1 Reading 10 bundle × 10
- 1 Reading 8 bundle × 8
- 2 Functional Cloze bundles × 6
Total: 40 questions.

Do not copy an official exam passage verbatim. Create new source text that follows the assessed form, question operations and difficulty.

## Metadata

Populate metadata whenever it is known:
- grade
- schoolYear
- CEFR
- skill
- topic
- cognitiveLevel: recognition | comprehension | application
- difficulty: 1–5
- grammarPoint
- tags

For TN THPT material, include `TNTHPT2025-2026` plus the canonical block tag.

## Quality rules

- Exactly four options for normal TN THPT MCQs.
- Exactly one best answer.
- Distractors must be grammatically and semantically plausible enough to discriminate.
- The explanation must justify the correct answer rather than merely repeat it.
- Reading answers must be supported by the passage.
- For insertion/reference/inference/summary items, verify cohesion and scope carefully.
- Avoid near-duplicate topic/content wording when the user asks for new bank material.
- Do not save partial or unverified content merely to reach a requested quantity.

## Safety and authorization

Only write to Brian when the user has asked to save/store/import the content or when saving is an explicit part of the task they requested. Never ask for the user's Brian password, Supabase secret key, service-role key, or legacy Brian API key. Authentication is handled by the connected Brian OAuth flow.
