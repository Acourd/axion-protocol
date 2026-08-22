# Roadmap — Axion Protocol

## Estado Actual — v1.1.0-alpha (Consolidado)

- [x] **Clarificación de Intención:** Aclarador secuencial en 3 sub-pasos sin tecnicismos (`tools/intent_clarifier.js`).
- [x] **Compilador de Políticas de Riesgo:** Motor de evaluación de riesgos `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` (`tools/risk_policy_compiler.js`).
- [x] **Seguridad y Atribución Ed25519:** Firma digital, atestación independiente y consumo único de *nonces* (`tools/approval_ed25519.js` y `tools/check_ed25519.js`).
- [x] **Ejecución Estructurada y Preflight:** Aislamiento con `shell: false` y validación léxica de sintaxis (`tools/structured_command.js` y `tools/preflight.js`).
- [x] **Evidencias Criptográficas SHA-256:** Manifiestos de auditoría inmutables vinculados a misión, riesgo, estado y rollback (`tools/evidence_hasher.js`).
- [x] **Workflow Runner Fail-Closed:** Orquestador de las 7 fases (`tools/workflow_runner.js`).
- [x] **Instalador Autónomo de 1 Paso:** Copia protegida e idempotente (`install.js`).
- [x] **Licencia Abierta:** Licencia MIT aprobada (`LICENSE`).
- [x] **CI/CD Automático:** Integración continua con GitHub Actions (`.github/workflows/ci.yml`).

---

## Próximo hito — v1.2.0-beta (Integración de Adaptadores Nativos)

- [ ] Adaptador directo para Hooks de Antigravity 2.0 (`.agents/hooks.json`).
- [ ] Adaptador directo para MCP (Model Context Protocol).
- [ ] Dashboard interactivo refinado (`tools/dashboard.html`) con métricas en tiempo real.
- [x] Empaquetado NPM para distribución CLI global (`npx axion-protocol`). Preparado y verificado
      con `npm pack --dry-run`; **sin publicar** todavía.

---

## Fuera del alcance (Límites Explícitos)

- No se planea un runtime universal desacoplado del usuario.
- No se busca reemplazar motores de capacidades técnicas (como `ag-kit` o `ECC`), sino actuar como su capa de gobernanza.
