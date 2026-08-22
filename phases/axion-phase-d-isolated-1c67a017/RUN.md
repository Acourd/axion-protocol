# Ejecución de pruebas

Requisito: Node.js. No se necesitan dependencias externas.

Desde la raíz del corpus, ejecute cada comando y compruebe que finalice con código `0`:

```text
node tests/tools.test.js
node tests/workflow.test.js
node tests/clarifier.test.js
node tests/learning_git.test.js
node tests/install.test.js
node tests/adversarial.test.js
node tests/vibeguard.test.js
node tests/human_anti_patterns.test.js
node tests/regression/installer_preserves_existing_configuration.test.js
node tests/regression/preflight_destructive_commands.test.js
node tests/regression/test_suite_integrity.test.js
node tests/regression/documentation_consistency.test.js
node tests/regression/risk_gate_normalization.test.js
node tests/regression/workflow_verification_requirements.test.js
node tests/regression/evidence_manifest_conformance.test.js
node tests/regression/learning_history_preservation.test.js
```
