# Axion Protocol

Axion Protocol es un runtime experimental de gobernanza local para operaciones agentivas. Conserva un workflow de siete fases y falla cerrado cuando no puede demostrar riesgo, autorizacion, CHECK, alcance, rollback o evidencia.

## Estado real

- Los modulos de `tools/` son ejecutables Node.js y usan exclusivamente APIs built-in.
- No existe un hook que intercepte automaticamente todos los comandos. Un consumidor debe invocar explicitamente `tools/workflow_runner.js` y respetar su veredicto.
- El instalador copia archivos; no activa enforcement por si mismo.
- No se comprueba ni se garantiza un `push` remoto a GitHub.
- El rollback exige un plan vinculado y un snapshot verificable; no existe una restauracion universal en un clic.

## Workflow de siete fases

`ENTENDER -> PLANIFICAR -> GATE -> TEST -> CONSTRUIR -> AUDITAR -> PROMOVER`

Las transiciones son ordenadas. Cualquier fallo deja la maquina en un estado terminal bloqueado. `VERIFIED` solo se emite despues de completar las siete fases.

## Enforcement de Fase E

- `policies/risk.yaml` se compila en runtime. Riesgos desconocidos o requisitos no soportados bloquean.
- `HIGH` y `CRITICAL` requieren una aprobacion Ed25519 de una autoridad humana registrada y un plan de rollback ligado a la mision.
- `MEDIUM`, al estar declarado como gate condicional, se trata de forma conservadora como sujeto a aprobacion hasta que la politica defina una condicion ejecutable.
- El registro de autoridades contiene solo claves publicas y se recibe por contexto confiable, nunca desde el payload de la tarea.
- Las aprobaciones expiran, tienen nonce y uso unico. El consumo se registra de forma atomica.
- El CHECK debe estar firmado por un auditor registrado distinto del ejecutor y vinculado a mision, riesgo, comando, aprobacion y aserciones.
- La unica ruta `ALLOW` acepta `{ executable, args, cwd, shell: false }`. Shell crudo, wrappers o sintaxis ambigua producen `DENY` o `NEEDS_HUMAN_REVIEW`.
- La evidencia SHA-256 vincula mision, riesgo, comando y argumentos, alcance, aprobacion, rollback, CHECK, estado y evidencia independiente.

## Componentes principales

| Archivo | Responsabilidad |
| :--- | :--- |
| `tools/workflow_runner.js` | Orquestacion fail-closed de las siete fases. |
| `tools/risk_policy_compiler.js` | Compilacion y evaluacion de requisitos de riesgo. |
| `tools/approval_ed25519.js` | Firma de fixtures y verificacion/consumo de aprobaciones. |
| `tools/check_ed25519.js` | Verificacion de CHECK independiente firmado. |
| `tools/structured_command.js` | Clasificacion y ejecucion estructurada con `shell:false`. |
| `tools/evidence_hasher.js` | Manifiestos SHA-256 con binding canonico. |
| `tools/rollback_plan.js` | Validacion y hash del plan minimo de restauracion. |

## Limites de confianza

La clave privada humana no pertenece al corpus ni al ejecutor. Axion no ofrece operaciones para registrar, revocar o eliminar autoridades: esos cambios requieren un procedimiento humano separado. Los fixtures de prueba generan claves privadas efimeras solo en memoria y persisten unicamente claves publicas.

El runtime sigue siendo experimental. Su enforcement solo protege invocaciones que atraviesan el orquestador; no controla procesos externos ni afirma soporte automatico para otros agentes o runtimes.

## Pruebas

Las pruebas heredadas viven en `tests/` y `tests/regression/`. Las pruebas de seguridad de Fase E viven en `tests/phase_e/` y no ejecutan comandos destructivos reales.

Suite heredada principal: `tools.test.js`, `workflow.test.js`, `clarifier.test.js`, `learning_git.test.js`, `install.test.js`, `adversarial.test.js`, `vibeguard.test.js` y `human_anti_patterns.test.js`.

Consulta tambien `SECURITY.md`, `docs/threat_model.md` y `tools/README.md`.
