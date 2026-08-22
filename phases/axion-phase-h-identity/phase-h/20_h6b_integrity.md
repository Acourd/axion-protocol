# H-6b · 20 — Integridad del inventario y del arnés

## Qué se incorpora al mecanismo de integridad

El inventario `12_h6a_test_inventory.json` sube a **v1.1.0** y gana `harness_integrity`: el
`sha256` de los 13 ficheros del arnés que deciden si algo pasa o falla.

| Componente | Ficheros |
|---|---|
| Corredor | `runner.js` |
| Kit de sondas | `lib/probe_kit.js` |
| Mutadores | `oracle/mut_approval_always_valid.js`, `mut_check_always_valid.js`, `mut_reintroduce_f01.js`, `mut_state_machine_always_verified.js` |
| Sondas críticas | `red/r01` … `red/r07` |

El corredor verifica los 13 **antes de ejecutar nada**. Una discrepancia produce
`HARNESS_INTEGRITY_MISMATCH` y bloquea.

Motivo: hasta H-6a el inventario sellaba las suites pero no al juez. Alterar `runner.js` bastaba
para cambiar cualquier veredicto sin dejar rastro.

## Inmutabilidad durante la corrida

El corredor calcula el `sha256` del inventario al inicio y lo recompara al final. Diferencia →
`TEST_INVENTORY_MUTATED` → bloqueo.

Cierra la ventana entre descubrimiento y veredicto: sin ella, un proceso concurrente podría
reescribir expectativas o hashes con las suites ya en ejecución. Verificado dinámicamente
(escenario 7 del auto-test), no sólo implementado.

Estado en la corrida de regresión:

```text
ficheros verificados     13
discrepancias            0
inventario inmutable     si
```

## Autorreferencia

`harness_integrity` no contiene el hash del propio inventario —sería imposible—. La protección
del inventario es distinta y complementaria:

| Elemento | Mecanismo |
|---|---|
| Ficheros del arnés | Hash en `harness_integrity`, verificado al arrancar |
| Suites | Hash por entrada, verificado en el gate de descubrimiento |
| El inventario mismo | Sellado al inicio y recomparado al final de cada corrida |

Un atacante que modifique el arnés **y** actualice `harness_integrity` en el inventario pasaría
el gate. Esa es la frontera declarada: la integridad del arnés protege contra alteración
accidental o parcial, no contra un adversario con permiso de escritura sobre el propio
inventario. Cerrar eso exige firmar el inventario con una clave fuera del alcance del ejecutor
— es decir, la raíz de confianza que diseña H-1 y que aún no existe.

## Integridad del corpus de G

```text
axion-phase-g-candidate.zip
SHA-256  B84462B565FEAFD2FD6E5DD21DAF0577E18371CD71AF708FA0952417C563B753   (sin cambios)
```

| Árbol | Íntegros | Alterados | Nuevos |
|---|---|---|---|
| `axion-corpus-isolated/` | **99 / 99** | 0 | **0** |

La regresión de H-6b se ejecutó sobre una **extracción nueva y limpia** del ZIP sellado, no
sobre la copia de trabajo.

## Cambios de H-6b sobre el arnés de H-6a

| Fichero | Cambio |
|---|---|
| `h6a/runner.js` | Reescrito: `--require` como argumento directo, centinela de mutación, oráculo multi-rama con `ORACLE_GAP`, códigos separados, integridad del arnés, inmutabilidad del inventario, inyección de fallos autobloqueante |
| `h6a/oracle/*.js` (4) | Centinela `AXION_MUTATION_APPLIED` |
| `h6a/oracle/mut_reintroduce_f01.js` | **Nuevo** — mutador dirigido |
| `h6b/self_test.js` | **Nuevo** — autoprueba |
| `phase-h/12_h6a_test_inventory.json` | v1.0.0 → v1.1.0 |

Ningún fichero del corpus de G tocado. Ningún defecto de G corregido.
