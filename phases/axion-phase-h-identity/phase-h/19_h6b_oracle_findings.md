# H-6b · 19 — Hallazgos del meta-oráculo

Con la mutación **realmente aplicada y confirmada por centinela**, el veredicto cambia
sustancialmente respecto a H-6a: no hay un oráculo defectuoso, hay **cuatro**.

| Suite | Rama | Mutador | Resultado | Veredicto |
|---|---|---|---|---|
| `approval_ed25519.test.js` | assert-throw | approval siempre válida | DETECTED (exit 1) | `ORACLE_SOUND` |
| `check_ed25519.test.js` | assert-throw | check siempre válido | DETECTED (exit 1) | `ORACLE_SOUND` |
| `workflow_enforcement_e2e.test.js` | assert-throw | approval siempre válida | DETECTED (exit 1) | `ORACLE_SOUND` |
| `workflow_state_machine.test.js` | assert-throw | máquina siempre VERIFIED | DETECTED (exit 1) | `ORACLE_SOUND` |
| `approval_forgery_baseline.test.js` | assert-throw | approval siempre válida | **NOT_DETECTED (exit 0)** | **`ORACLE_DEFECT`** |
| `c01_governance_chain.test.js` | assert-throw | approval siempre válida | **NOT_DETECTED (exit 0)** | **`ORACLE_DEFECT`** |
| `c03_independent_attestations.test.js` | assert-throw | check siempre válido | **NOT_DETECTED (exit 0)** | **`ORACLE_DEFECT`** |
| `role_separation.test.js` | `invalidTests>0` | check siempre válido | DETECTED (exit 2) | **`ORACLE_DEFECT`** |
| » | `failed>0` | reintroduce F-01 | **NOT_DETECTED (exit 0)** | (por la rama anterior) |

**4 `ORACLE_SOUND` · 4 `ORACLE_DEFECT` · 0 `ORACLE_GAP` · 0 `MUTATION_NOT_APPLIED`.**

## Causa de los tres defectos nuevos

Las tres suites afirman una propiedad de seguridad y sólo comprueban una **propiedad negativa**:

```javascript
assert.notStrictEqual(fabricated.status, 'VERIFIED',
  'Una aprobación fabricada por el payload no puede habilitar VERIFIED');
```

Pasan mientras el workflow bloquee **por cualquier motivo**. Y bloquean por un motivo que no
tiene nada que ver con lo que dicen probar:

| Suite | Estado real de bloqueo | Fase donde ocurre |
|---|---|---|
| `approval_forgery_baseline` | `NEEDS_HUMAN_REVIEW` | 2 · PLANIFICAR |
| `c01_governance_chain` | `DENIED_COMMAND` | 2 · PLANIFICAR |
| `c03_independent_attestations` | `NEEDS_HUMAN_REVIEW` | 2 · PLANIFICAR |

Las tres pasan `commandToExecute: 'node -v'` como cadena cruda. `classifyCommand` la rechaza en
la fase 2, **mucho antes del GATE**. El código de verificación de aprobación y de CHECK
—precisamente el que dicen auditar— nunca se ejecuta.

Comprobación directa, con y sin mutación total de la aprobación y del CHECK:

```text
approval_forgery_baseline   sin mutacion: NEEDS_HUMAN_REVIEW   con mutacion: NEEDS_HUMAN_REVIEW
c01_governance_chain        sin mutacion: DENIED_COMMAND       con mutacion: DENIED_COMMAND
c03_independent_attestations sin mutacion: NEEDS_HUMAN_REVIEW  con mutacion: NEEDS_HUMAN_REVIEW
```

Idénticos. **Estas tres suites pasarían con la criptografía de aprobación y CHECK íntegramente
eliminada.**

## Alcance del hallazgo

Las cuatro suites defectuosas pertenecen a las **13 que Fase G declaró `13/13 PASS`**. Es decir:
de la evidencia que sostuvo la certificación de G, casi un tercio no puede distinguir un sistema
correcto de uno completamente roto.

Esto amplía materialmente `AX-NC-0002`, cuya evidencia registraba un único oráculo defectuoso.
La causa raíz declarada (`VERIFIER_DEFECT`) no cambia; sí su extensión.

> **Recomendación de registro:** ampliar la evidencia de `AX-NC-0002` con estas tres suites. No
> se ha hecho en H-6b porque la autorización acota los artefactos y prohíbe tocar el corpus; es
> una decisión de la autoridad humana.

## Consecuencia para H-1b

Cuando H-1b empiece a llevar `r02` de rojo a verde, **estas cuatro suites no sirven como
evidencia de no-regresión**: seguirán en verde pase lo que pase. La no-regresión debe apoyarse
en las 4 `ORACLE_SOUND`, en las sondas rojas y en las dos suites del corpus que hoy fallan.

Reparar sus aserciones —anclarlas al estado de bloqueo esperado, no a «cualquier cosa distinta
de VERIFIED»— es trabajo de una etapa posterior: exige modificar el corpus de G, hoy prohibido.

## Cobertura de ramas

`role_separation.test.js` es la única suite con más de una rama de salida declarada. Ambas se
ejercitaron: `invalidTests>0` (DETECTED, exit 2) y `failed>0` (NOT_DETECTED, exit 0). Sin la
segunda, el corredor habría emitido `ORACLE_GAP` en lugar de `ORACLE_SOUND` — que es la regla
que H-6b incorpora: **una rama crítica no ejercitada nunca produce un veredicto de solidez.**
