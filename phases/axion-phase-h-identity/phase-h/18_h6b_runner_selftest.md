# H-6b · 18 — Autoprueba del corredor

- **Artefacto:** `h6b/self_test.js`
- **Método:** para cada escenario se construye un corpus sintético desechable en `%TEMP%`, se
  invoca el corredor como subproceso y se exige (a) código de salida ≠ 0 y (b) la condición
  bloqueante concreta en el informe.
- **No toca** el corpus de G ni el arnés real.

> Un gate que no rompe es un gate que no existe.

## Resultados: 9/9

| Escenario | Condición exigida | Exit | Obtenido |
|---|---|---|---|
| Suite descubierta pero no inventariada | `TEST_DISCOVERY_MISMATCH` | 1 | ✔ |
| Suite inventariada pero ausente del disco | `TEST_DISCOVERY_MISMATCH` | 1 | ✔ |
| Hash de una suite alterado | `TEST_INTEGRITY_MISMATCH` | 1 | ✔ |
| Una suite falla | `SUITE_FAILURES` | 1 | ✔ |
| Una suite no se ejecuta | `EXECUTION_COUNT_MISMATCH` | 1 | ✔ |
| `passed + failed != executed` | `ARITHMETIC_GATE_FAILURE` | 1 | ✔ |
| Inventario mutado durante la corrida | `TEST_INVENTORY_MUTATED` | 1 | ✔ |
| Integridad del arnés rota | `HARNESS_INTEGRITY_MISMATCH` | 1 | ✔ |
| **Control limpio** (sin perturbación) | sin bloqueos de infraestructura | — | ✔ |

El control limpio es imprescindible: sin él, un corredor que bloqueara siempre superaría los
ocho escenarios anteriores sin discriminar nada.

## Códigos separados

H-6a agrupaba presencia y hash bajo `TEST_DISCOVERY_MISMATCH`. H-6b los separa, porque son
amenazas distintas: una suite ausente es un error de gestión; una suite **alterada** conservando
su nombre es manipulación.

## Inyección de fallos que no puede abusarse

Dos escenarios (`skip:<id>` y `arith`) requieren provocar un estado que el corredor no alcanza
por sí solo. La variable `AXION_H6B_FAULT` lo permite, con una salvaguarda:

> Si `AXION_H6B_FAULT` está definida, el corredor añade `FAULT_INJECTION_ACTIVE` a las
> condiciones bloqueantes **incondicionalmente**.

El gancho puede probar los gates pero **jamás hacer pasar una corrida real**. Sin esa
salvaguarda habríamos construido exactamente la escotilla de escape que originó `AX-NC-0002`.

Se comprueba en la evidencia: ambos escenarios reportan `FAULT_INJECTION_ACTIVE` junto a la
condición esperada.

## Dos defectos del propio auto-test, corregidos

Ambos se detectaron ejecutándolo, no leyéndolo.

**1 · El temporizador que nunca disparaba.** El escenario de mutación del inventario usaba un
`setTimeout` local. `spawnSync` **bloquea el bucle de eventos**, así que el temporizador no
llegaba a ejecutarse: el escenario salía `[FAIL]` por un defecto del propio test, no del gate.
Corregido con un proceso realmente independiente (`spawn` + `detached`).

**2 · La carrera que seguía perdiendo.** Con el proceso independiente, la mutación sí ocurría en
disco (`mutated_during_run: true`) pero los digests seguían coincidiendo: la corrida completa
duraba 587 ms y la escritura llegaba a los 1500 ms. Corregido de forma determinista añadiendo al
corpus sintético una suite que bloquea 3 s (`Atomics.wait`) y adelantando la escritura a 400 ms.
La corrida está garantizadamente viva cuando llega la mutación.

Un escenario en verde por casualidad de temporización no es evidencia. La versión final no
depende de la carga de la máquina.
