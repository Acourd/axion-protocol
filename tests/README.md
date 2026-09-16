# Tests

Este directorio contiene una suite ejecutable con Node.js, sin dependencias externas ni
runner de terceros. Cada archivo se ejecuta con `node tests/<archivo>` y señala su
resultado mediante el código de salida. El runner de conjunto es `tests/run_all.js`
(`npm test`), que reparte las suites entre workers concurrentes.

## 5 dominios y 238 suites

| Dominio | Qué cubre |
| :--- | :--- |
| `01_governance_preflight` | Hooks `PreToolUse`, preflight léxico, killswitch, política de riesgo, ejecución estructurada y máquina de estados del workflow. |
| `02_cryptography_attestation` | Sobres DSSE/PAE, JSON canónico RFC 8785, in-toto Statement v1, firmas Ed25519, binding de evidencia y revocación. |
| `03_intent_socratic` | Aclarador socrático de 2 preguntas, contratos A/B/C, sellado SHA-256 de intención, calibración de perfil y razonamiento profundo. |
| `04_state_recovery` | Snapshots atómicos, validación de planes de rollback, límites del guardián de memoria, anclaje de contexto y manifiestos de evidencia. |
| `05_adversarial_resilience` | Vectores de mutación, derivación de veredictos del pre-mortem, puerta léxica VibeGuard y resiliencia del fuzzer. |

Las suites `ax_f_*` fijan hallazgos de regresión verificados primero en rojo y después en
verde. Las suites `c0*` cubren cadenas de gobernanza de extremo a extremo.

## Alcance y límites

Una suite en verde **no constituye promoción ni certificación**
(`policies/promotion.yaml`: `execution_implies_support: false`).

No hay instrumentación de cobertura: `lines_executed` y `branch_coverage` no se miden y
no deben declararse. Las pruebas cubren contratos, fallo cerrado y preservación de datos;
no cubren el renderizado de las interfaces web ni el comportamiento concurrente.
