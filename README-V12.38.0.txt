BRIAN ENGLISH STUDIO V12.38.0
UNIFIED AI TASK & PROMPT REGISTRY — PHASE 7

1. AI application calls now use runAITask(taskId, options).
2. 34 versioned Task IDs cover Worksheet, Grammar, Writing, Reading,
   Speaking, Pronunciation, Lesson Architect, Department, Homeroom,
   Resource Library, shared Copilot and provider diagnostics.
3. Each task centrally owns its app, prompt version, governance profile,
   routing hint, privacy profile, output type, token budget and validation contract.
4. callAI remains only in internal AI infrastructure for backward compatibility.
5. AI Governance includes the Task & Prompt Registry table with run count,
   success rate, repair count, average latency and last provider/model.
6. Provenance now includes registryTaskId, taskGroup, taskApp, promptVersion,
   promptRegistryVersion and taskContract.
7. No new SQL migration is required. The V12.37 cloud-governance migration
   remains required when cloud synchronization is enabled.

Verification:
- 34 registered tasks
- App-level direct callAI scan: 0
- Production build: passed
- 188 smoke checks: passed
- Department runtime admin / TTCM / teacher: passed
