# Roadmap — Axion Protocol

## Estado Actual — v1.4.0-beta.1 (Preparación de beta pública)

- [x] **Clarificación de Intención:** Aclarador socrático de 2 preguntas A/B/C sin tecnicismos (`tools/intent_clarifier.js`).
- [x] **Compilador de Políticas de Riesgo:** Motor de evaluación de riesgos `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` (`tools/risk_policy_compiler.js`).
- [x] **Aprobación y Atribución Ed25519:** Firma digital, atestación independiente y consumo único de *nonces* (`tools/approval_ed25519.js` y `tools/check_ed25519.js`).
- [x] **Ejecución Estructurada y Preflight:** Aislamiento con `shell: false` y validación léxica de comandos (`tools/structured_command.js` y `tools/preflight.js`).
- [x] **Evidencias Criptográficas SHA-256:** Manifiestos de auditoría inmutables vinculados a misión, riesgo, estado y rollback (`tools/evidence_hasher.js`).
- [x] **Workflow Runner:** Orquestador local de las 7 fases (`tools/workflow_runner.js`).
- [x] **Instalador Autónomo de 1 Paso:** Copia protegida e idempotente (`install.js`).
- [x] **Licencia Abierta:** Licencia Apache-2.0 aprobada (`LICENSE`).
- [x] **CI/CD Multiplataforma:** Integración continua en Node 22/24 sobre Ubuntu, macOS y Windows (`.github/workflows/ci.yml`).
- [x] **Integraciones Incluidas:** Hooks de Antigravity (`.agents/hooks/`) y Claude Code bridge (`CLAUDE.md`, `.claude/commands/`).
- [x] **Resiliencia de Estado y Retención:** Mitigación de colisiones de marcas temporales y retención FIFO en snapshots (`tools/context_shield.js`).
- [x] **Suite de Verificación Determinista:** 244 suites deterministas (resultado verificado en CI) con cero dependencias externas (`tests/run_all.js`).

---

## Próximo hito — v1.4.0-beta.2 / Release Pública (Tras autorización humana)

- [ ] Creación de Tag y GitHub Release (`v1.4.0-beta.1`) formal tras aprobación del PR.
- [ ] Evaluación de empaquetado para distribución en registro público (NPM bloqueado en fase preparatoria).
- [ ] Adaptador directo para MCP (Model Context Protocol).
- [ ] Dashboard interactivo refinado (`tools/dashboard.html`) con métricas en tiempo real.

---

## Fuera del alcance (Límites Explícitos)

- No se planea un runtime universal desacoplado del usuario.
- No se busca reemplazar motores de capacidades técnicas (como `ag-kit` o `ECC`), sino actuar como su capa de gobernanza.
- No se realizan publicaciones automáticas a registros de paquetes externos sin aprobación humana expresa.
