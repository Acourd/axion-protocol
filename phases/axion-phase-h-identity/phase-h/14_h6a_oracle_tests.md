# H-6a · 14 — Meta-pruebas del oráculo

## Qué prueba

No que las suites pasen, sino que **puedan fallar**. Una suite que no distingue un sistema
correcto de uno roto no es un comprobador, y `AX-NC-0002` demostró que ese caso existía.

## Mecanismo

Mutación del módulo bajo prueba mediante precarga (`NODE_OPTIONS=--require <mutador>`). El
mutador se ejecuta antes que la suite, obtiene el módulo del caché de `require` y sustituye la
función de verificación por una versión que siempre aprueba. La suite, al requerir el módulo
después, recibe el objeto ya mutado.

```text
node --require <mutador> <suite>
   ├─ mutador: require(tools/X.js) → exports.verifyY = () => SIEMPRE_VALIDO
   └─ suite:   require(tools/X.js) → acierto de cache → recibe la version mutada
```

**Veredicto:** un oráculo sano DEBE salir con código distinto de cero bajo mutación.

| Veredicto | Significado |
|---|---|
| `ORACLE_SOUND` | Falló bajo mutación: sabe distinguir |
| `ORACLE_DEFECT` | Pasó bajo mutación: **bloquea la certificación** |
| `ORACLE_INCONCLUSIVE_BASELINE_RED` | La suite ya fallaba sin mutación; la prueba no discrimina |
| `ORACLE_MUTATOR_MISSING` | Mutador declarado pero ausente: bloquea |

`ORACLE_INCONCLUSIVE_BASELINE_RED` existe para evitar un falso positivo: si una suite ya está en
rojo, su fallo bajo mutación no demuestra nada. Contabilizarla como sana sería exactamente el
tipo de autoengaño que H-6a debe eliminar.

## Mutadores

| Mutador | Módulo | Qué anula |
|---|---|---|
| `mut_approval_always_valid.js` | `tools/approval_ed25519.js` | Firma, independencia y anti-replay de la aprobación |
| `mut_check_always_valid.js` | `tools/check_ed25519.js` | Firma, rol de auditor e independencia del CHECK |
| `mut_state_machine_always_verified.js` | `tools/workflow_state_machine.js` | Orden de las siete fases y fallo cerrado de `block` |

## Resultados sobre el candidato G

8 suites críticas con mutador declarado; **8 `ORACLE_SOUND`**, 0 `ORACLE_DEFECT`.

```text
OK  tests/phase_e/approval_ed25519.test.js             ORACLE_SOUND (exit 1)
OK  tests/phase_e/approval_forgery_baseline.test.js    ORACLE_SOUND (exit 1)
OK  tests/phase_e/c01_governance_chain.test.js         ORACLE_SOUND (exit 1)
OK  tests/phase_e/c03_independent_attestations.test.js ORACLE_SOUND (exit 1)
OK  tests/phase_e/check_ed25519.test.js                ORACLE_SOUND (exit 1)
OK  tests/phase_e/role_separation.test.js              ORACLE_SOUND (exit 1)
OK  tests/phase_e/workflow_enforcement_e2e.test.js     ORACLE_SOUND (exit 1)
OK  tests/phase_e/workflow_state_machine.test.js       ORACLE_SOUND (exit 1)
```

## Nota importante: la mutación NO detectó el defecto G6

`role_separation.test.js` obtuvo `ORACLE_SOUND` **pese a contener la vía de `exit 0` con
aserciones fallidas**. Conviene registrarlo con precisión en lugar de presentar el meta-oráculo
como suficiente.

Causa: el fichero tiene tres ramas de salida.

```javascript
if (invalidTests > 0) { … process.exit(2); }   // ← la mutación cae aquí
if (failed > 0)       { … process.exit(0); }   // ← la vía defectuosa, no alcanzada
                        … process.exit(0);
```

Al mutar `verifyIndependentCheck`, los casos que esperaban bloqueo pasan a `UNEXPECTED_FAIL`,
que incrementa `invalidTests` y sale con 2. La rama defectuosa —la que convierte una
vulnerabilidad persistente en `RED_TESTS_VALID` con `exit 0`— **no se ejerció**.

Quien la detectó fue el guardarraíl estático:

```text
[R7] EXIT_ZERO_ON_FAILURE_PATH  tests/phase_e/role_separation.test.js
     evidencia: if (failed > 0) { ... process.exit(0) }
```

### Conclusión operativa

Los dos mecanismos son **complementarios, no redundantes**:

| Mecanismo | Alcance | Limitación |
|---|---|---|
| Meta-oráculo (dinámico) | Prueba la capacidad real de fallar | Sólo ejercita la rama que la mutación alcanza |
| Guardarraíl (estático) | Ve todas las ramas del fichero | Basado en patrones; puede tener falsos positivos |

Exigir sólo uno de los dos dejaría un hueco. En H-6a ambos son bloqueantes, y la detección de
G6 depende hoy del estático. Un mutador que fuerce específicamente la rama `failed > 0` sin
tocar `invalidTests` es trabajo pendiente para H-6b.
