# H-1 · 07 — Semántica del flujo LOW (Decisión obligatoria 7)

## Defecto que corrige

`AX-NC-0003`. El runner codificaba «no hay aprobador» como cadena vacía:

```javascript
const approvalActorId = taskPayload.approvalEnvelope && taskPayload.approvalEnvelope.approval
  ? taskPayload.approvalEnvelope.approval.actorId
  : '';                                    // ausencia legítima → cadena vacía
```

y `verifyIndependentCheck` rechazaba toda cadena vacía con `CHECK_NOT_INDEPENDENT`. Resultado:
el tramo LOW —acción local, reversible, de bajo impacto— quedó inalcanzable. El fallo es
cerrado, pero la causa es de modelado: **la ausencia legítima no estaba tipada**.

## Estado tipado

```yaml
approval_requirement:
  required: false
  reason: POLICY_NO_HUMAN_GATE        # POLICY_NO_HUMAN_GATE | POLICY_CONDITIONAL_MET
  verified_approval: null
```

```yaml
approval_requirement:
  required: true
  reason: POLICY_HUMAN_GATE_REQUIRED
  verified_approval: <verified_approval>
```

El evaluador de invariantes recibe este objeto, no una cadena. La ausencia de aprobador es un
caso del dominio, no un valor de relleno.

### Prohibido

```text
approvalActorId: ""          cadena vacía como marcador de ausencia
actor ficticio               "system", "none", "n/a", "-"
aprobación sintética         sobre autofirmado por el runtime
principal_id nulo tratado como identidad comparable
```

## Aplicabilidad de invariantes por nivel

| Invariante | LOW | MEDIUM (`conditional`) | HIGH | CRITICAL |
|---|---|---|---|---|
| `I1` operador ≠ aprobador | vacua (`verified_approval == null`) | exigible si hay aprobación | **exigible** | **exigible** |
| `I2` operador ≠ auditor | **exigible** | **exigible** | **exigible** | **exigible** |
| `I3` aprobador ≠ auditor | vacua | exigible si hay aprobación | **exigible** | **exigible** |
| `I4` ejecutor es `MACHINE` | **exigible** | **exigible** | **exigible** | **exigible** |
| `I5` ejecutor desde atestación | **exigible** | **exigible** | **exigible** | **exigible** |

Una invariante **vacua** es la que carece de operando por ausencia legítima. No es una
invariante relajada ni omitida: el evaluador debe distinguir los tres resultados
`SATISFIED` / `VACUOUS` / `VIOLATED`, y registrar cuál se dio.

## Qué sigue exigiéndose en LOW

Que no haya gate humano no significa que no haya identidad:

1. **Ejecutor atestado.** `I5` se aplica sin excepción: sin atestación válida no hay ejecución,
   en ningún nivel de riesgo.
2. **CHECK independiente firmado.** El auditor sigue siendo obligatorio y sigue debiendo ser
   distinto del operador (`I2`).
3. **Consumo en el ledger.** La atestación se reserva y se confirma igual que en HIGH. En G, el
   `approvalDigest` de LOW era determinista (`hash({missionId, approvalRequired:false, risk})`)
   y ningún artefacto de LOW se consumía, por lo que un CHECK de LOW era reproducible dentro de
   su ventana de validez. En H el `nonce` de la atestación cierra esa vía.
4. **Evidencia con identidades ancladas** (`08`, `09` y `06_verified_objects.md`).

## Criterio de aceptación

> LOW vuelve a alcanzar `VERIFIED` **sin debilitar ninguna invariante**.

Reparaciones inadmisibles: relajar la comprobación de independencia, aceptar cadena vacía,
inyectar un principal ficticio o permitir que `verifyIndependentCheck` omita `I2` cuando falte
la aprobación. La reparación admisible es la única que modela el caso: `approval_requirement`
como estado tipado y un evaluador con resultado ternario.

Prueba obligatoria: misión LOW con atestación válida y CHECK independiente → `VERIFIED`, siete
fases, y `I2`, `I4`, `I5` reportadas `SATISFIED`, `I1` e `I3` reportadas `VACUOUS`.
