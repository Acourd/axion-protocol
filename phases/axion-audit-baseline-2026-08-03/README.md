# Línea base metodológica — Auditoría independiente de Axion Protocol

**Corpus auditado:** `Project/Axion Protocol` @ `ef229b4` · 67 archivos en alcance
**Fecha:** 2026-08-03 · **Mission Compiler:** V0.5
**Veredicto final:** `REQUEST_CHANGES` · **Convergencia:** `false` (`SINGLE_AUDITOR`)

Este directorio está **fuera** del corpus auditado, por exigencia de
`policies/retention.yaml` (`evidence_outside_active_runtime: true`) del propio proyecto.
El corpus no fue modificado por la auditoría.

## Contenido

| Archivo | Qué es |
|---|---|
| `AXION_PHASE_A_REPORT.md` | Informe de auditoría ciega. **Inmutable.** 16 hallazgos, 5 hipótesis abiertas, 4 refutaciones internas. |
| `AXION_PHASE_A_LOCK.yaml` | Firma del informe y hashes de los 12 archivos de código auditados. |
| `AXION_MISSION_CLOSURE.yaml` | Registro de cierre: por qué no hubo Fase B, qué candidatos se descartaron y con qué motivo. |
| `AX-EVD-0001.evidence.json` | Registro de evidencia conforme a `schemas/evidence.schema.json` del corpus. |
| `harness/` | Los cuatro arneses de experimento. Es lo que convierte esto en línea base reproducible. |

## Verificar integridad antes de usar

```bash
sha256sum AXION_PHASE_A_REPORT.md
# debe dar: 47E8880E6C5AB446FCA64FF427806E9E5185165E6A9CC619D36BF56798E51072
```

Si no coincide, el informe fue alterado tras el bloqueo y **no debe usarse como línea base**.

## Reejecutar los experimentos

Los arneses esperan una copia del corpus en `./axion` relativa a su propia ubicación.
Nunca se ejecutan contra el corpus original: los experimentos E7, E8 y E9 escriben y
borran archivos.

```bash
mkdir lab && cp -r "<ruta>/Axion Protocol" lab/axion && cp harness/*.js lab/
node lab/exp_controls.js      # E2-E6  · preflight, gate de riesgo, VERIFIED, aclarador, evidencia
node lab/exp_data.js          # E7,E10,E11 · LEARNINGS.md, vibeguard, demo del workflow
node lab/exp_install_git.js   # E8,E9  · instalador y asistente Git
node lab/exp_robust.js        # E12    · unicode, ReDoS, benchmark, rutas
```

`exp_data.js` inyecta un fallo en `fs.appendFileSync` para reproducir AX-F-006. Es
inyección deliberada, declarada en el informe: por eso el impacto de ese hallazgo es
`LIKELY` y no `DEMONSTRATED`.

## Cómo usar esta línea base

**Sirve para:**
- comparar contra una segunda auditoría independiente sobre `ef229b4` y evaluar convergencia real;
- verificar, en un corpus posterior, si cada `AX-F-*` fue corregido, y con qué evidencia;
- reutilizar los arneses como pruebas de regresión de los controles.

**No sirve para:**
- afirmar convergencia — hubo un solo auditor;
- afirmar cobertura de ejecución — `lines_executed` y `branch_coverage` son `NOT_MEASURED`;
- concluir sobre un corpus distinto de `ef229b4` sin declarar antes la equivalencia
  (`EXACT` / `PARTIAL` / `DIFFERENT` / `UNKNOWN`).

## Advertencia de lectura

Los 16 hallazgos separan cuatro dimensiones que no deben colapsarse entre sí:

- **severidad** describe el impacto actual;
- **integridad del control** describe el estado del control;
- **exposición** describe si existe una ruta de ejecución activa;
- **prioridad** describe cuándo corregir.

Cuatro hallazgos son **portantes latentes** (`AX-F-002`, `AX-F-003`, `AX-F-010`,
`AX-F-006`): controles rotos sin consumidor de producción hoy. No son teóricos — se
activan en cuanto exista un consumidor.
