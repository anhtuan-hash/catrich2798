# V10.64 — Department AI File-to-Weekly-Schedule

## New workflow

Inside **Tổ chuyên môn → Lịch làm việc**, TTCM/Admin can:

1. Select a target week.
2. Upload PDF, DOCX, TXT, MD, CSV or HTML.
3. Let the configured AI provider extract every actionable schedule item.
4. Review and edit title, date, time, type, owner, location and notes.
5. Select all or individual entries.
6. Add all selected entries to the shared department work schedule.

## Reliability

- Explicit dates from the source are preserved.
- Weekday-only references are mapped to the selected week.
- AI confidence and warnings are shown before import.
- Duplicate entries are skipped using title + date + start time + owner.
- Bulk import publishes to the shared department snapshot and teacher schedule when cloud sync is available.
- Global full-screen AI indicator remains active during file analysis.
