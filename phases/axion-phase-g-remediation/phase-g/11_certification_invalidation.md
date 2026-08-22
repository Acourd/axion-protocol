# Invalidación formal de la certificación de Fase G

- **Fecha:** 2026-08-06
- **Autoridad:** Human Authority
- **Etapa:** H-0
- **Reemplaza a:** `10_readiness.md`, `phase_g_results.json` (conservados sin modificar como evidencia histórica)

## Decisión

```yaml
phase_g:
  implementation: PARTIAL
  certification: INVALIDATED
  targeted_reaudit: ROLE_SEPARATION_BROKEN
  promotion: BLOCKED
```

El candidato `axion-phase-g-candidate.zip`
(SHA-256 `b84462b565feafd2fd6e5dd21daf0577e18371cd71af708fa0952417c563b753`)
queda marcado como **candidato refutado**. No se promueve. Sus artefactos se conservan
únicamente como evidencia histórica.

## Fundamento

> Comparar tres cadenas no equivale a separar tres identidades.

El parche añade las comparaciones que faltaban en las primitivas y esas comparaciones son
correctas. Lo que no establece es que los valores comparados representen principals
distintos:

1. `executorActorId` es declarado por el propio ejecutor y nunca se autentica ni se
   contrasta con el registro de autoridades.
2. El registro impone unicidad de `keyId`, no de principal: alias tipográficos y
   homoglifos del mismo humano superan las tres invariantes.
3. `workflow_runner.js` vuelve a leer `approvalActorId` del payload original después de
   haberlo verificado, y el resultado verificado ni siquiera expone `actorId`.

```text
firma válida  ≠  identidad válida  ≠  independencia válida
```

## No conformidades abiertas

| NC | Título | Clasificación | Impacto |
|----|--------|---------------|---------|
| `AX-NC-0001` | Separación de roles no demostrada: identidades no autenticadas | ARTIFACT_DEFECT | CRITICAL |
| `AX-NC-0002` | La certificación se emitió sin un CHECK capaz de fallar | VERIFIER_DEFECT | HIGH |
| `AX-NC-0003` | Regresión funcional: el nivel LOW no puede alcanzar VERIFIED | ARTIFACT_DEFECT | HIGH |

Registro completo y conforme a `schemas/non_conformance.schema.json` en
[`11_non_conformances.json`](11_non_conformances.json).

## Estado por área

| Área | Estado |
|------|--------|
| Ed25519 | Sólido |
| Registro de claves | Parcialmente sólido (unicidad de clave, no de principal) |
| Autoaprobación textual exacta | Bloqueada |
| Autoaprobación por identidad falsa | **Abierta** |
| Aprobador como auditor | **Abierta** (alias / payload relegible) |
| Ejecutor como auditor | **Abierta** (identidad no autenticada) |
| Replay en el mismo almacén | Bloqueado |
| Replay cambiando de almacén | **Abierto** |
| Workflow de siete estados | Estructuralmente intacto |
| Flujo LOW | **Regresión funcional** |
| Evidencia de identidad | Insuficiente |
| Suite de Fase G | **No confiable** |
| Promoción | **Bloqueada** |

## Siguiente fase autorizada

**Fase H — identidad autenticada, principal canónico y replay global.**
No se admiten parches locales adicionales sobre G.

| Etapa | Acción |
|-------|--------|
| H-0 | Invalidar formalmente la certificación de G — **completada por este documento** |
| H-1 | Diseñar el modelo de principal canónico |
| H-2 | Autenticar la identidad del ejecutor |
| H-3 | Eliminar las relecturas del payload |
| H-4 | Fijar el ledger de replay fuera del request |
| H-5 | Anclar identidades en la evidencia |
| H-6 | Reparar la suite y la regresión LOW |
| H-7 | Reauditoría adversarial completa |
