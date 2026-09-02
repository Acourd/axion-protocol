# Axion Protocol — OpenCode & Codex Universal Integration Guide

> **Official Integration and Zero-Dependency Execution Architecture for OpenCode and Codex Agents.**

---

## 🏛️ Executive Summary

Axion Protocol is built from the ground up to be **100% harness-agnostic**. It operates with **zero third-party dependencies** (`dependencies: {}`) and runs directly on the Node.js standard runtime ($\ge 18$). This guarantees that any agentic coding environment—specifically **OpenCode** and **OpenAI Codex**—can execute, orchestrate, and enforce deterministic governance without environment configuration or `npm install` overhead.

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
Axion Protocol automatically exports its P0 fail-closed rules into OpenCode configuration directories:
* `.opencode/rules/axion-protocol.md`
* `.opencode/opencode.json`

---

## 🧠 Integration with OpenAI Codex

Codex agents operate under standard repository instructions and tool calling interfaces. Axion Protocol provides:

1. **`.codex/AGENTS.md`**: Core sovereign directives (Custody of Intent, Fail-Closed Killswitch, Zero Blind Patches).
2. **`.codex/config.toml`**: Deterministic governance profiles and in-toto Statement v1 attestation settings.
3. **AST Token Optimization (`sliceASTFocus`)**: Reduces token consumption by up to 80% when Codex inspects large source files.

---

## 📊 Compatibility Matrix

| Feature / Protocol Layer | Antigravity | Claude Code | OpenCode | OpenAI Codex | Cursor IDE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Fail-Closed Execution** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AST Symbol Locks (`swarm`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ed25519 DSSE Attestation** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Zero Dependencies (`package.json`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Real-Time WebSocket Telemetry** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Standalone Bundle Execution** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🛡️ Verification Command

To verify OpenCode and Codex synchronization on any machine:
```bash
node tools/multi_harness_adapter.js --verify
```
