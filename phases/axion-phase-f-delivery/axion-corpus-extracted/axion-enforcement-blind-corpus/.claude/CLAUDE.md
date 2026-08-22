# Claude Code Project Rules - Axion Protocol

Refer to [.agents/AGENTS.md](file:///.agents/AGENTS.md) and [CLAUDE.md](file:///CLAUDE.md).

1. **Intent Clarification:** Always clarify vague user requests without technical jargon (`tools/intent_clarifier.js`).
2. **Preflight Safety:** Run `node tools/preflight.js "<cmd>"` before running shell wrappers.
3. **SHA-256 Evidence:** Run `node tools/evidence_hasher.js` to create evidence manifests.
