# Brian English Studio V12.36.0

## Unified AI Control Plane & Observability

This release adds the fifth phase of the Unified AI Core:

- Per-account daily request and token budgets.
- Admin exemption and configurable warning threshold.
- Telemetry by AI task, provider, model, transport and account.
- Provider-call amplification, fallback rate, average latency and repair metrics.
- Detailed request traces with operation ID, attempts, privacy, validation and runtime metadata.
- Global AI result receipt after each completed or failed task.
- Governance report schema `bes-ai-governance-report/2.0`.
- AI gateway contract `bes-ai-core/1.2`.

No SQL migration is required. Usage and audit data remain stored on the current browser/device in this phase.
