# Tools

Modulos ejecutables Node.js sin dependencias externas.

| Archivo | Funcion |
| :--- | :--- |
| `intent_clarifier.js` | Clarificacion de intencion. |
| `risk_policy_compiler.js` | Compila los requisitos de `policies/risk.yaml`. |
| `approval_ed25519.js` | Verifica y consume aprobaciones Ed25519. No administra autoridades. |
| `check_ed25519.js` | Verifica CHECK firmado e independiente. |
| `workflow_state_machine.js` | Conserva y valida las siete fases. |
| `structured_command.js` | Clasifica y ejecuta comandos estructurados con `shell:false`. |
| `preflight.js` | Adaptador fail-closed del clasificador; shell crudo nunca recibe `ALLOW`. |
| `rollback_plan.js` | Valida el contrato minimo de rollback y su binding. |
| `evidence_hasher.js` | Genera evidencia SHA-256 canonica y vinculada. |
| `workflow_runner.js` | Integra todos los controles en orden. |

## Activacion

El enforcement del workflow es ejecutable pero no automatico: ningun hook intercepta procesos externos. El consumidor debe invocar el orquestador, proporcionar el registro publico y el estado de consumo desde un contexto separado del payload, y respetar sus resultados terminales.

Las claves privadas no son una entrada valida del ejecutor. Los helpers de firma existen para crear artefactos fuera del ejecutor y para pruebas con claves efimeras en memoria.
