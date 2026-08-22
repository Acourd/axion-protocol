# H-6a · 15 — Resultados en rojo sobre el candidato G

- **Corpus:** extracción limpia de `axion-phase-g-candidate.zip` (`b84462b5…c563b753`)
- **Ejecución:** `node h6a/runner.js --corpus <extracción> --inventory phase-h/12_h6a_test_inventory.json`
- **Código de salida:** `1` — **es el resultado esperado y correcto de esta etapa**

## Recuento

| Métrica | Valor |
|---|---|
| Inventariadas | 36 |
| Descubiertas | 36 |
| Ejecutadas | 36 |
| PASS | 27 |
| FAIL | 9 |
| `discovered == inventory` | ✔ |
| `executed == discovered` | ✔ |
| `passed + failed == executed` | ✔ |
| Condiciones bloqueantes | `GUARDRAIL_VIOLATION`, `SUITE_FAILURES` |

Composición: 29 suites del corpus + 7 sondas rojas. De las 9 en rojo, **7 son sondas** (que
deben fallar hasta que H esté construida) y **2 son suites del propio corpus** que G declaró
verdes por haberlas dejado fuera de su alcance de regresión.

## Los ocho defectos exigidos, en rojo

| # | Defecto | Mecanismo | Evidencia |
|---|---|---|---|
| 1 | Ejecutor/operador no autenticado | sonda `r01` | `alice` aprueba y ejecuta declarándose `axion-runtime-01` → `VERIFIED` |
| 2 | Alias de principal | sonda `r02` | `alice` / `alice ` / `аlice` (U+0430) aceptados como identidades distintas |
| 3 | Relectura del payload tras verificar | sonda `r03` | 5 lecturas de `envelope.approval`; accessor → `VERIFIED`, payload plano → bloqueado |
| 4 | Ledger elegible o borrable | sonda `r04` | misma firma aceptada tras cambiar de directorio y tras borrar el marcador |
| 5 | Regresión LOW | sonda `r05` | `BLOCKED_CHECK_NOT_INDEPENDENT` donde se esperaba `VERIFIED` |
| 6 | `exit 0` pese a assert fallido | **guardarraíl estático** | `if (failed > 0) { … process.exit(0) }` en `role_separation.test.js` |
| 7 | Suites omitidas por descubrimiento incompleto | gate de descubrimiento | **16 de 29** suites del corpus fuera del alcance declarado por G |
| 8 | Workflow real que viola las invariantes | sonda `r07` | **3 de 3** invariantes D-06 violadas, con control positivo válido |

Sonda adicional fuera de la lista de ocho, procedente de la evidencia de `AX-NC-0001`:

| # | Defecto | Mecanismo | Evidencia |
|---|---|---|---|
| 9 | Quema de nonce antes de evaluar la separación | sonda `r06` | un CHECK inválido consume el nonce; la aprobación legítima queda inutilizable |

## Evidencia literal de las sondas clave

### R-01 · identidad de operador autodeclarada

```text
[ctrl] tres identidades distintas -> VERIFIED
[ROJO] aprobador alice ejecuta declarandose "axion-runtime-01" -> VERIFIED
       executorActorId procede de runtimeContext y no de una atestacion firmada.
```

El control positivo demuestra que la sonda discrimina: no es una sonda que falle siempre.

### R-03 · relectura del payload

```text
[ctrl] payload plano -> BLOCKED_CHECK_NOT_INDEPENDENT
[sonda] lecturas de envelope.approval = 5
[ROJO] aprobador == auditor con accessor mutante -> VERIFIED
```

El mismo escenario produce dos resultados según la representación del payload. Es la
demostración directa de que la decisión de seguridad depende de datos no verificados.

### R-05 · regresión LOW

```text
check: CHECK_NOT_INDEPENDENT
[ROJO] mision LOW con CHECK independiente firmado -> BLOCKED_CHECK_NOT_INDEPENDENT
```

Única sonda que espera `VERIFIED`. Su fallo es regresión funcional, no bypass.

### R-07 · matriz de invariantes D-06 sobre el workflow real

```text
[ROJO] I1 · Alice aprueba y opera; declara "axion-runtime-01"   -> VERIFIED
[ROJO] I2 · Charlie opera y audita; audita como "charlie "      -> VERIFIED
[ROJO] I3 · Alice aprueba y audita; audita como "аlice" (U+0430) -> VERIFIED
[ctrl] tres personas distintas                                  -> VERIFIED

3 de 3 invariantes D-06 violadas por el workflow real
```

Con el control positivo en verde, el resultado no admite lectura alternativa: sobre principals
—personas— el workflow real no sostiene **ninguna** de las tres invariantes.

## Suites del corpus en rojo

| Suite | Salida | Lectura |
|---|---|---|
| `tests/workflow.test.js` | `BLOCKED_CHECK_NOT_INDEPENDENT` / esperado `VERIFIED` | Regresión LOW, corrobora `r05` |
| `tests/regression/ax_f_003_verified_requires_checks.test.js` | ídem | Regresión LOW, corrobora `r05` |

Ambas estaban fuera del alcance de regresión declarado por G. El corpus contenía la prueba de
su propio defecto; sólo faltaba ejecutarla.

## Nota sobre el alcance declarado por G

`phase-g/06_regression_results.md` declaró **13/13 PASS**. Las 13 suites son reales y pasan.
El defecto no fue mentir sobre los resultados, sino **acotar el universo**: 16 de las 29 suites
del corpus quedaron fuera, y entre las excluidas estaban las dos que fallan. El gate de
descubrimiento convierte esa clase de error en imposible: un universo distinto del inventario
bloquea antes de ejecutar nada.

## Interpretación del código de salida 1

El `exit 1` de esta ejecución **no indica que H-6a haya fracasado**. Indica que el instrumento
reparado mide correctamente un corpus que sigue defectuoso. La línea base roja queda establecida:
cuando H esté construida, estas nueve suites deben pasar sin que ninguna otra retroceda.
