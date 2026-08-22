# Claude Code & Antigravity Configuration for Axion Protocol

This project uses Axion Protocol deterministic governance. Refer to [.agents/AGENTS.md](file:///.agents/AGENTS.md) and [.agents/rules/axion-governance.md](file:///.agents/rules/axion-governance.md) for full details.

## Core Directives (Maximum Expression)

1. **Custody of Original Intent:** Prohibited from writing code or editing files on vague requests until `/clarify` (2 simple human questions with A/B/C options) produces an `IntentContract`.
2. **Discrete Risk in Planning:** Evaluate risk silently during Phase 2 (`PLANIFICAR`). Only insert explicit warnings when high-risk or destructive actions are detected.
3. **Semantic Rollback by Natural Language:** If the user asks to undo or revert in any language (*"deshazlo"*, *"undo changes"*, *"go back"*), immediately execute `node tools/rollback_plan.js` to restore the last SHA-256 verified snapshot.
4. **Preflight Guardrail:** All terminal commands must use structured execution `{ executable, args, cwd, shell: false }` and pass `node tools/preflight.js "<command>"` before execution.
5. **Polyglot Executive Reports:** Deliver final mission reports in the user's conversational language with: Intent summary ➔ Modified files ➔ Test suites (38/38 PASS) ➔ Evidence SHA-256 hash.
