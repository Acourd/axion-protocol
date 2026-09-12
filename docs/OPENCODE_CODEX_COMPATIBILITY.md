# Axion Protocol — OpenCode & Codex Integration Guide

> **Integration and Zero-Dependency Execution Architecture for OpenCode and Codex Agents.**

---

## 🏛️ Executive Summary

Axion Protocol operates with **zero external dependencies** (`dependencies: {}`) and runs directly on the Node.js standard runtime ($\ge 22.13.0$). Agents in environments like **OpenCode** and **OpenAI Codex** can execute CLI scripts and standalone bundles without `npm install` overhead. Enforcement is not an inherent guarantee in arbitrary environments; it is strictly scoped to workspaces where integrated agent rules, hooks, or directives have been configured and loaded.

---

## ⚡ Integration with OpenCode

OpenCode can operate with Axion Protocol through three distinct integration tiers:

### 1. Direct CLI Integration
OpenCode agents can invoke Axion Protocol commands directly in any terminal:
```bash
# Verify all invariants before pushing changes
node bin/axion.js verify

# Run autonomous drive loop with adaptive deliberation
node bin/axion.js drive

# Check AST collision locks in multi-agent workflows
node bin/axion.js swarm

# Launch real-time telemetry server for HUD dashboards
node bin/axion.js telemetry
```

### 2. Standalone Single-File Bundle (`dist/axion.bundle.js`)
For air-gapped, containerized, or micro-sandboxed OpenCode workspaces:
```bash
# Execute full governance pipeline in a single 95.7 KB standalone file
node dist/axion.bundle.js verify
```

### 3. Native Rules & Directives (`.opencode/rules/`)
Axion Protocol exports its P0 governance rules into OpenCode configuration directories:
* `.opencode/rules/axion-protocol.md`
* `.opencode/opencode.json`

---

## 🧠 Integration with OpenAI Codex

Codex agents operate under standard repository instructions and tool calling interfaces. Axion Protocol provides:

1. **`.codex/AGENTS.md`**: Core governance directives (Custody of Intent, Local Killswitch, Zero Blind Patches).
2. **`.codex/config.toml`**: Deterministic governance profiles and in-toto Statement v1 attestation settings.
3. **AST Token Optimization (`sliceASTFocus`)**: Reduces token consumption by up to 80% when Codex inspects large source files.

---

## 📊 Compatibility Matrix

| Feature / Protocol Layer | Antigravity | Claude Code | OpenCode | OpenAI Codex | Cursor IDE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **PreToolUse Hook Interception** | ✅ (integrated hook) | ✅ (integrated hook) | ⚠️ (via rules, no hook) | ⚠️ (via directives, no hook) | ⚠️ (via rules, no hook) |
| **CLI & Standalone Verification** | ✅ | ✅ | ✅ (local CLI execution) | ✅ (local CLI execution) | ✅ (local CLI execution) |
| **AST Symbol Locks (`swarm`)** | ⚠️ (experimental local) | ⚠️ (experimental local) | ⚠️ (unverified end-to-end) | ⚠️ (unverified end-to-end) | ⚠️ (unverified end-to-end) |
| **Ed25519 DSSE Attestation** | ✅ (local CLI tool) | ✅ (local CLI tool) | ⚠️ (unverified end-to-end) | ⚠️ (unverified end-to-end) | ⚠️ (unverified end-to-end) |
| **Zero Dependencies (`package.json`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Real-Time WebSocket Telemetry** | ⚠️ (experimental local) | ⚠️ (experimental local) | ⚠️ (unverified end-to-end) | ⚠️ (unverified end-to-end) | ⚠️ (unverified end-to-end) |
| **Standalone Bundle Execution** | ✅ | ✅ | ✅ (Node.js runtime) | ✅ (Node.js runtime) | ✅ (Node.js runtime) |

*Note: Active PreToolUse command interception requires platforms with integrated hook mechanisms (Claude Code, Google Antigravity). In OpenCode, Codex, and Cursor environments, governance depends on explicit prompt/rule loading (`.opencode/rules/`, `.codex/AGENTS.md`) and direct CLI execution. Features marked with ⚠️ represent experimental local tools or capabilities not verified end-to-end in third-party harnesses.*

---

## 🛡️ Verification Command

To verify OpenCode and Codex synchronization on any machine:
```bash
node tools/multi_harness_adapter.js --verify
```
