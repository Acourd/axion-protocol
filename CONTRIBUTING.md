# Contributing to Axion Protocol

Thank you for your interest in contributing to **Axion Protocol**. Our absolute guiding principle is **Custody of Original Intent**: enabling non-technical users to operate agentic AI without errors and with zero wasted iterations.

---

## 🏛️ The 5 Invariants for Contributors

Every contribution must satisfy these 5 sovereign rules before being merged:

1. **Zero External Dependencies:**
   - Axion Protocol has **`{}`** in its `dependencies`. No `npm`, `pip`, or external packages may be added. All algorithms, cryptography, and tooling use pure Node.js standard library.
2. **Deterministic TDD & 100% Green Suite:**
   - Redact test assertions in `tests/` *before* modifying code. All 241 deterministic suites across all 5 governance domains must pass with `exit code 0`.
3. **VibeGuard Shield Compliance:**
   - Code must pass `node bin/axion.js vibeguard` with zero findings:
     - No silent exceptions (`catch` blocks must not silently discard errors).
     - No unhandled `TODO` or `FIXME` comments.
     - No untyped or loose shell executions (`shell: false` is strictly required).
4. **Preservation of the 12 Canonical Skills:**
   - The kernel maintains **the consolidated skills** in `.agents/skills/` and the matching slash commands in `.claude/commands/`. Modular additions must be registered via the CLI dispatcher or global user scope.
5. **Multi-OS Parity:**
   - All code must run identically on **Linux, macOS, and Windows** without path separator assumptions (always use `path.join` and normalized POSIX separators).

---

## 🛠️ Development Workflow

### 1. Clone & Verify Baseline
```bash
git clone https://github.com/Acourd/axion-protocol.git
cd axion-protocol
node bin/axion.js check
node tests/run_all.js
```

### 2. Implement Changes (TDD Cycle)
1. Add a test in the appropriate domain folder under `tests/`:
   - `tests/01_governance_preflight/`
   - `tests/02_cryptography_attestation/`
   - `tests/03_intent_socratic/`
   - `tests/04_state_recovery/`
   - `tests/05_adversarial_resilience/`
2. Implement your logic in `tools/` or relevant module.
3. Verify impact with fast incremental runner:
   ```bash
   node bin/axion.js test-diff
   ```

### 3. Pre-Flight Quality Audit
Before submitting a Pull Request, run the full verification chain:
```bash
node bin/axion.js check
node bin/axion.js vibeguard
node tools/sync_doc_stats.js
node tests/run_all.js
```

---

## 📋 Pull Request Requirements

- [ ] All 241 test suites pass with Exit Code 0.
- [ ] VibeGuard reports 0 anti-patterns.
- [ ] Documentation statistics synchronized (`node tools/sync_doc_stats.js`).
- [ ] Descriptive commit message following Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`).
