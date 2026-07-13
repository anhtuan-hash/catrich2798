# V11.3.4 Test Report

## Automated checks

- Bulk assignment contract: 15 checks.
- One work item per selected teacher.
- Whole-department selection.
- Realtime notification compatibility.
- Single-task deletion.
- Batch deletion.
- Submission-file cleanup helper.
- Leader-only DELETE policy.
- Notification sound and animated badge preserved.
- Student Practice option hotfix preserved.
- Public npm registry guard.

## Production validation required

After running the V11.3.4 migration, test with one Admin/TTCM account and at least two teacher accounts. Confirm each teacher receives an independent task and that deleting a task removes its notification and uploaded response file.
