# Brian English Studio V11.4.8

## Grammar Builder — Large Card Workspace

### Approved interface changes

- The six setup cards are arranged in a strict two-card desktop grid:
  1. Build Mode + Grammar Focus
  2. Learner & Context + Source & Input
  3. Output Blueprint + AI Copilot
- All primary card headings, field labels, inputs, buttons, icons and descriptions use the larger Brian application scale.
- Build Mode and AI Copilot use two-column internal grids with larger selectable cards.
- At 1050 px and below, the setup switches to one card per row.

### Grammar Focus redesign

The Grammar Focus card now contains only:

1. **Grammar domain** — a grouped catalogue of 100 options.
2. **Yêu cầu cụ thể khác** — a free-form instruction field for contrasts, exclusions, required patterns or any topic not represented by a domain.

Removed from the visible workflow:

- Grammar contrast selector
- Required structures field
- Excluded structures field

Legacy projects remain compatible. Their former `contrast` value is migrated into `focusRequest` when loaded.

### Domain catalogue

The catalogue is organised into:

- Tenses, aspects and time
- Common grammar contrasts
- Verb forms and verb patterns
- Modal verbs and stance
- Voice, clauses and complex sentences
- Nouns, determiners and comparison
- Sentence structure and accuracy
- Exam and integrated grammar

### Dimensional hero

The hero now contains a CSS-rendered dimensional illustration with:

- Grammar Builder book
- Checklist card
- Quality chart
- AI block
- Approval block
- Pencil and perspective grid

No external image dependency was added.

### AI behaviour

All AI prompts use the consolidated `grammarFocus(project)` value. This combines the selected domain and optional specific request. Existing Brian AI Gateway, provider inheritance, batch generation, audit and connected workflow remain unchanged.
