# Student Support production empty-state root cause — 2026-09-15

Production investigation found two independent causes for the empty Student Support experience:

1. `bes_search_student_support_students` and Student 360 read normalized tables (`bes_homeroom_students`, `bes_homeroom_attendance`, `bes_homeroom_learning_records`) that are empty in production.
2. The canonical live data remains in workspace JSON: active Homeroom workspaces contain 1,242 embedded students and attendance payloads; Gradebook workspaces contain 1,241 matching students. 1,241/1,242 Homeroom students match Gradebook by workspace + student id/code.
3. The Student Support search UI exists in React but `public/bes-remove-visible-search-bars.js` hides it because the search section is not marked `data-bes-keep-search="true"`.

Fix direction: read the canonical workspace payloads through scoped server-side RPCs, preserve the existing authorization predicate, exempt the Student Support search from the global search-removal script, and prime the overview with a small authorized roster preview. No student data is copied into shadow tables.
