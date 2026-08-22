# H-1 · 06 — Fuente única de verdad tras verificar (Decisión obligatoria 6)

## Regla

> Después de validar un artefacto firmado, ninguna decisión posterior puede depender otra vez de
> su representación original no confiable.

`AX-NC-0001` vía (3) y `PoC-5` son la consecuencia directa de incumplirla: `workflow_runner.js`
releía `taskPayload.approvalEnvelope.approval.actorId` después de verificar, y el resultado de
la verificación **ni siquiera exponía `actorId`**, de modo que no había alternativa correcta
disponible. En H, el resultado verificado es completo por contrato.

## Tipos conceptuales

Los cuatro comparten una cabecera común:

```yaml
<verified_object>:
  principal: { principal_id, subject_type, roles, status }
  key_id: "ed25519:<sha256(spki)>"
  digest: "<sha256 canónico del artefacto verificado>"
  issued_at / expires_at / verified_at
  state: VALID | <estado tipado de fallo>
  source_artifact_id: "<id del artefacto del que procede>"
  registry_snapshot_digest: "<estado del registro usado para resolver el principal>"
```

| Tipo | Procede de | Aporta además |
|---|---|---|
| `verified_executor` | Execution attestation | `operator_principal`, `session_id`, `mission_id`, digests de comando/alcance/política |
| `verified_approval` | Sobre de aprobación Ed25519 | `approval_id`, `risk`, `requirements_hash`, `policy_hash`, `rollback_hash` |
| `verified_check` | Atestación de CHECK Ed25519 | `check_id`, `result`, `exit_code`, `evidence_hash`, `approval_digest` |
| `verified_rollback` | Plan de rollback | `plan_id`, `strategy`, `snapshot_digest` |

`verified_executor` expone **dos** principals: el de la máquina y el del operador humano. Las
invariantes `I1` e `I2` se evalúan sobre `operator_principal`, nunca sobre el de la máquina.

## Propiedades exigidas

1. **Completitud.** Cada objeto contiene todo lo que cualquier fase posterior pueda necesitar.
   Si una fase necesita un dato ausente, el defecto está en el contrato del objeto verificado,
   no en el consumidor: se amplía el objeto, nunca se relee el payload.
2. **Inmutabilidad.** Objetos congelados (`Object.freeze` profundo) construidos por copia
   estructural, no por referencia al payload. Un *accessor* en el payload no puede influir
   después de la construcción.
3. **Principal canónico, no cadena.** Ninguna comparación de identidad opera sobre texto libre.
   La única comparación admitida es `principal_id === principal_id`.
4. **Trazabilidad.** `source_artifact_id` + `registry_snapshot_digest` permiten reconstruir la
   decisión a posteriori sin volver a los datos crudos.

## Evaluación de invariantes

Se centraliza en un único evaluador que recibe **sólo** objetos verificados:

```text
evaluateSeparation(verified_executor, verified_approval | null, verified_check) → SeparationVerdict
```

No recibe el payload. No recibe `runtimeContext`. Al no tener acceso a datos no verificados, la
clase de defecto de `PoC-5` deja de ser expresable en ese punto.

## Cómo se hace comprobable la regla

La regla es aspiracional si sólo vive en un documento. Tres controles la vuelven verificable:

| Control | Mecanismo | Detecta |
|---|---|---|
| **Estático** | Regla de análisis: tras la primera llamada `verify*`, el runner no puede volver a desreferenciar `taskPayload.*Envelope*` ni `runtimeContext.*ActorId*` | La regresión de `PoC-5` en el código |
| **Estructural** | El runner recibe los objetos verificados por parámetro; el payload crudo sale de alcance tras la fase de verificación | Impide el acceso, no sólo lo desaconseja |
| **Dinámico** | Test con *accessor* mutante: el payload devuelve un valor distinto tras la verificación; el resultado **debe** ser idéntico al del payload plano | La regresión en tiempo de ejecución |

El test dinámico es la traducción directa de `PoC-5` a la suite, y es obligatorio (`09_test_strategy.md`).

## Prohibiciones explícitas

```text
PROHIBIDO  taskPayload.approvalEnvelope.approval.actorId   tras verificar la aprobación
PROHIBIDO  taskPayload.checkEnvelope.check.actorId         tras verificar el CHECK
PROHIBIDO  runtimeContext.executorActorId                  en cualquier punto
PROHIBIDO  cualquier identidad tomada de variables de entorno o argumentos de proceso
PROHIBIDO  comparar display_name, actorId textual o cualquier atributo mutable
```
