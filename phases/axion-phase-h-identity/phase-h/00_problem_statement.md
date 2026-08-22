# H-1 · 00 — Planteamiento del problema

- **Fase:** H — identidad autenticada, principal canónico y replay global
- **Etapa:** H-1 (diseño). Sin implementación, sin parches, sin modificar el corpus.
- **Precedente:** `AX-NC-0001`, `AX-NC-0002`, `AX-NC-0003` (Fase G invalidada, 2026-08-06)

## La pregunta que define la fase

> ¿Qué hecho externo al payload demuestra quién está ejecutando realmente?

Fase G respondió implícitamente «lo que diga `runtimeContext.executorActorId`». Esa es una
respuesta vacía: el ejecutor es la parte no confiable y el campo lo escribe él. Toda la
arquitectura de H existe para sustituir esa respuesta por un hecho verificable.

## Por qué falló G, en una línea

G añadió comparaciones correctas sobre operandos incorrectos.

```text
firma válida  ≠  identidad válida  ≠  independencia válida
```

Las tres primitivas comparan cadenas. Nada en el sistema establece que dos cadenas distintas
correspondan a dos principals distintos, ni que una cadena concreta corresponda al proceso
que efectivamente ejecuta.

## Entradas normativas (hechos, no hipótesis)

| # | Hecho | Evidencia |
|---|-------|-----------|
| 1 | `executorActorId` no está autenticado | PoC-1 / PoC-11: `'x'`, `'no-existe-en-el-registro'`, `'alice '`, homoglifo U+0430 → `VERIFIED` |
| 2 | `principal.id` por sí solo no impide alta múltiple del mismo humano | PoC-4 / PoC-9: alias tipográfico supera las tres invariantes |
| 3 | El workflow relee campos del payload tras verificar el artefacto firmado | PoC-5: accessor sobre `envelope.approval`, 5 lecturas, 2 posteriores a la verificación |
| 4 | El ledger anti-replay no es confiable si el ejecutor elige su ruta o borra entradas | PoC-2: misma firma aceptada 3 veces cambiando `approvalConsumptionDir` |
| 5 | La suite anterior no probó el flujo end-to-end | `role_separation.test.js` sale 0 en ambas ramas; ningún caso invoca `executeHybridWorkflow` |
| 6 | LOW debe alcanzar `VERIFIED` sin exigir una aprobación inexistente | PoC-3 + 2 tests en rojo sobre el ZIP sellado |

## Objetivo de la fase

Garantizar, para `HIGH` y `CRITICAL`:

```text
executorPrincipal  != approverPrincipal
executorPrincipal  != auditorPrincipal
approverPrincipal  != auditorPrincipal
```

sobre **principals autenticados**, no sobre cadenas, roles declarados ni nombres visibles.

## Reformulación necesaria del enunciado

El enunciado anterior es incompleto y conviene decirlo antes de diseñar nada.

En el modelo real, quien ejecuta es un **agente de software**, no una persona. Si
`executorPrincipal` designa a la máquina, las invariantes 1 y 2 se vuelven ciertas por
construcción —una máquina nunca tendrá rol `HUMAN_AUTHORITY`— y el control que de verdad
importa queda sin implementar: **la persona que opera el agente no debe ser la persona que
aprobó**. Ese es el caso que G dejó abierto y el que un atacante usaría.

Por eso H distingue tres sujetos, no dos:

| Sujeto | Tipo | Qué representa |
|--------|------|----------------|
| `executor_principal` | `MACHINE` | El runtime que ejecuta el comando |
| `operator_principal` | `HUMAN` | La persona bajo cuya autoridad corre ese runtime |
| `approver` / `auditor` | `HUMAN` | Autoridad humana e auditor independiente |

Y el conjunto de invariantes exigible pasa a ser:

```text
I1  operator_principal != approver_principal        (4 ojos real)
I2  operator_principal != auditor_principal
I3  approver_principal != auditor_principal
I4  executor_principal.subject_type == MACHINE      (estructural)
I5  executor_principal proviene de una atestación firmada, nunca del payload
```

`I1` es la traducción honesta de la invariante 1 original. `I4`–`I5` son las que impiden que
`I1` se evalúe sobre un dato autodeclarado. **Esta reformulación es una decisión humana
pendiente** (`D-06` en `11_decision_record.md`); el resto del diseño la asume y señala qué
cambia si se rechaza.

## Fuera de alcance de H

- No se rediseña la criptografía de aprobación ni de CHECK: Ed25519 + `keyId = SHA-256(SPKI)`
  resistió la reauditoría y se conserva.
- No se rediseña la máquina de estados de siete fases: resistió y se conserva.
- No se introduce red, servidor remoto, base de datos ni dependencias externas.
- No se persigue compatibilidad multiplataforma en v1 (ver `01_trust_model.md`, alcance).
- No se implementa nada en H-1.

## Criterio de éxito de H-1

La especificación es suficiente cuando un implementador puede responder, sin consultar al
arquitecto: quién posee cada clave, quién puede leerla, qué autentica al solicitante, qué
ocurre ante cada fallo del ledger, y qué prueba demuestra cada invariante.
