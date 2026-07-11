# V10.68 — AI Token Budget Optimization

- Adds explicit output-token budgets to Gemini, OpenAI-compatible, OpenRouter and Claude requests.
- Global default maximum output is 1,600 tokens instead of allowing providers to assume very large limits such as 16,384.
- Homeroom file recognition uses a 1,200-token output budget and a compact JSON contract.
- File source text is capped at 60,000 characters to reduce input cost while retaining typical class lists and schedules.
- Homeroom comments, parent messages, weekly reports, class meetings and learning analytics use smaller task-specific budgets.
- OpenRouter automatically retries once with a lower token cap when its credit response reports a lower affordable maximum.
- No database migration is required.
