# Brian English Studio V11.5.5 — Listening Lab Removal

## Scope

Listening Lab has been retired from the application while general listening support remains available inside Lesson Architect, Exam Studio, Resource Library and other teaching workflows.

## Removed

- App Directory / Launcher entry `listening-lab`
- Animated Home card and visual profile
- Direct app route resolution through the application registry
- Pronunciation Coach connected-workflow destination
- Listening Lab feature flag

## Migration

Old workspace tabs with id `tool:listening-lab` are automatically removed when the workspace is loaded. No database migration is required.

## Preserved

- Listening skill labels and question types in Exam Studio
- Listening lesson stages in Lesson Architect
- Audio / Listening category in the resource library
- Pronunciation and speaking audio features
