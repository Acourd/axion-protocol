# Tools

Este directorio contiene módulos ejecutables en Node.js (exclusivamente built-ins: `fs`,
`path`, `crypto`, `process`, `child_process`) y dos superficies HTML de demostración.

| Archivo | Función |
| :--- | :--- |
| `intent_clarifier.js` | Clarificación de intención por sub-pasos. |
| `preflight.js` | Verificación léxica y barrera de comandos destructivos. |
| `evidence_hasher.js` | Manifiestos de evidencia SHA-256 conformes a `schemas/evidence.schema.json`. |
| `workflow_runner.js` | Orquestador de las 7 fases. |
| `learning_engine.js` | Captura y clasificación de retroalimentación humana. |
| `git_assistant.js` | Diagnóstico de estado Git en lenguaje no técnico. |
| `vibeguard.js` | Inspector estático de antipatrones. |
| `dashboard.html` | Maqueta visual. No ejecuta ninguna herramienta. |
| `presentation.html` | Redirección a la landing page. |

## Estado y enforcement

`EXPERIMENTAL`. El enforcement es `DOCUMENT_ONLY`: **ningún hook, envoltorio ni proceso
invoca estos módulos automáticamente**. Se ejecutan porque un operador humano o un agente
que sigue `CLAUDE.md` decide invocarlos, y su veredicto sólo surte efecto si quien lo
recibe lo honra.

Que estos módulos existan y se ejecuten no los promociona: `policies/promotion.yaml` fija
`implementation_implies_approval: false` y `execution_implies_support: false`. La
promoción a `CANDIDATE` o superior exige consumidor real, runtime declarado, pruebas,
rollback, auditoría independiente y aprobación humana.
