# Claude Code Configuration for Axion Protocol

This project uses Axion Protocol governance rules. Refer to [.agents/AGENTS.md](file:///.agents/AGENTS.md) for full details.

## Core Directives
1. **Custody of Original Intent:** Prioritize non-technical user experience, zero hallucinated assumptions, and zero lost iteration loops.
2. **Phase 1 (ENTENDER):** Invoke `tools/intent_clarifier.js` if user request is vague or high-level.
3. **Phase 5 (CONSTRUIR):** All generated shell/powershell wrapper commands MUST pass `node tools/preflight.js "<command>"` before execution.
4. **Phase 6 (AUDITAR):** Generate SHA-256 evidence via `node tools/evidence_hasher.js` and verify PASS/FAIL.
