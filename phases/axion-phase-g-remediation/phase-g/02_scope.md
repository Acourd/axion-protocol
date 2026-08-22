# Alcance Autorizado (Fase G)

La Fase G corregirá **únicamente** estas invariantes de separación de roles para tareas HIGH y CRITICAL:
1. `executorActorId != approvalActorId`
2. `executorActorId != auditorActorId` (ya parcialmente cubierto, pero se reforzará)
3. `approvalActorId != auditorActorId`

**Archivos que probablemente podrán modificarse (Scope of Patch):**
- `tools/approval_ed25519.js`
- `tools/check_ed25519.js`
- `tools/workflow_runner.js`
- Tests relacionados:
  - `tests/runtime_security/approval_ed25519.test.js`
  - `tests/runtime_security/check_ed25519.test.js`
  - `tests/runtime_security/workflow_enforcement_e2e.test.js`

**Archivos estrictamente excluidos (No tocar):**
- `tools/structured_command.js`
- `tools/preflight.js`
- `tools/risk_policy_compiler.js`
- `tools/canonical_json.js`
- `tools/evidence_hasher.js`
- `tools/rollback_plan.js`
- Políticas no relacionadas (`policies/*`)

Cualquier otra modificación no está autorizada.
