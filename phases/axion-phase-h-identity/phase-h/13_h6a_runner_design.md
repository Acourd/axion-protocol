# H-6a · 13 — Diseño del corredor de verificación

- **Artefacto:** `h6a/runner.js` (sólo módulos integrados de Node)
- **Invocación:** `node h6a/runner.js --corpus <ruta> --inventory <ruta> [--out <ruta.json>]`
- **Alcance:** repara el instrumento de medición. **No corrige ningún defecto de G.**

## Principio rector

> Ninguna anotación del inventario puede convertir un `FAIL` en `exit 0`.

El campo `expectation` (`PASS` \| `RED_UNTIL_H_BUILD`) es **informativo para el informe**. Las
sondas rojas cuentan como fallo, aparecen en el recuento y contribuyen al código de salida. No
se construye la escotilla de escape que produjo `AX-NC-0002`; un estado «rojo esperado» que
saliera con 0 sería el mismo defecto con otro nombre.

## Corpus desechable

El corredor opera sobre una **extracción limpia del ZIP sellado**, no sobre el árbol de trabajo.
Las suites del corpus escriben en `.phase-e/test-runtime/` bajo la raíz del corpus; ejecutarlas
sobre `axion-corpus-isolated` lo contaminaría. Con esta separación, la copia de trabajo termina
con 99/99 ficheros intactos y **cero ficheros nuevos**.

## Gates

### Gate 1 · descubrimiento (requisitos 1, 2, 6)

Descubre `tests/**/*.test.js` bajo el corpus y `h6a/red/*.test.js` en el arnés. Contrasta con
`12_h6a_test_inventory.json` en tres dimensiones y emite `TEST_DISCOVERY_MISMATCH` ante cualquiera:

| Comprobación | Detecta |
|---|---|
| Inventariada pero no encontrada | Suite borrada o renombrada |
| Encontrada pero no inventariada | Suite nueva sin declarar |
| Deriva de `sha256` | Suite alterada sin actualizar el inventario |

### Gate 2 · aritmética (requisitos 3, 4)

```text
discovered == inventory
executed   == discovered
passed + failed == executed
failed     == 0
```

Cualquier desigualdad bloquea. Es el control directo contra el patrón de G: ejecutar un
subconjunto y declararlo como total.

### Gate 3 · guardarraíles estáticos (requisitos 7, 8, 9)

Análisis del código fuente de cada suite del corpus. Cada hallazgo cita su evidencia textual.

| Código | Requisito | Regla |
|---|---|---|
| `EXIT_ZERO_ON_FAILURE_PATH` | 7 | `if (<contador> > 0) { … process.exit(0) }` |
| `GLOBAL_CATCH_SWALLOW` | 8 | Bloque `catch` no vacío sin `throw`, sin `process.exit(≠0)` y sin `process.exitCode = ≠0` |
| `SIMULATED_SUITE` | 9 | Declara `PASS` por consola sin ninguna aserción ni propagación |

### Gate 4 · meta-oráculo (obligatorio para suites críticas)

Detallado en `14_h6a_oracle_tests.md`.

## Ejecución

Cada suite corre en su propio proceso (`spawnSync`), `cwd` = raíz del corpus, `AXION_CORPUS` en
el entorno, tiempo máximo 120 s. Un proceso que expire se contabiliza con código 124: **un
tiempo agotado es un fallo, nunca una omisión**.

## Condiciones bloqueantes

`TEST_DISCOVERY_MISMATCH` · `COUNT_GATE_MISMATCH` · `ORACLE_DEFECT` · `GUARDRAIL_VIOLATION` ·
`SUITE_FAILURES`. Cualquiera produce `exit 1`. No existe mecanismo de omisión ni de indulto.

## Sondas rojas

Siete suites en `h6a/red/` que ejercitan **`executeHybridWorkflow` real**, no primitivas
aisladas (requisito 10). Viven fuera del corpus: H-6a no modifica el artefacto auditado.

Cada sonda incluye un **control positivo o negativo** que debe comportarse correctamente; si el
control falla, la sonda aborta con `CONTROL INVALIDO` en lugar de reportar un falso positivo.
Sin ese control, una sonda siempre roja sería indistinguible de una sonda rota.

| Sonda | Defecto de G | Control interno |
|---|---|---|
| `r01` identidad de operador no autenticada | G1 | tres identidades distintas → `VERIFIED` |
| `r02` alias de principal | G2 | coincidencia textual exacta → bloqueada |
| `r03` relectura del payload | G3 | payload plano → bloqueado |
| `r04` ledger elegible por el ejecutor | G4 | primer uso legítimo → `VERIFIED` |
| `r05` regresión LOW | G5 | única sonda que espera `VERIFIED` |
| `r06` quema de nonce | G9 (adicional) | primer intento documenta los marcadores creados |
| `r07` matriz de invariantes D-06 | G8 | tres personas distintas → `VERIFIED` |

## Cobertura de los ocho defectos exigidos

| Defecto | Mecanismo de detección |
|---|---|
| G1 · ejecutor/operador no autenticado | sonda roja `r01` |
| G2 · alias de principal | sonda roja `r02` |
| G3 · relectura del payload | sonda roja `r03` |
| G4 · ledger elegible o borrable | sonda roja `r04` |
| G5 · regresión LOW | sonda roja `r05` |
| G6 · exit 0 pese a assert fallido | **guardarraíl estático** (ver nota en `14`) |
| G7 · suites omitidas | gate de descubrimiento |
| G8 · workflow real que viola invariantes | sonda roja `r07` |

## Salidas

Informe legible por consola y `h6a_results.json` con: gates, hallazgos de guardarraíles,
meta-oráculos, cobertura de defectos, resultado por suite y condiciones bloqueantes.
