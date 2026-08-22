# H-6a · 16 — Integridad y no destructividad

## Candidato G sellado

```text
axion-phase-g-candidate.zip
SHA-256  B84462B565FEAFD2FD6E5DD21DAF0577E18371CD71AF708FA0952417C563B753
```

Idéntico al valor declarado en `axion-phase-g-candidate.zip.sha256` y al registrado en
`phase-g/11_certification_invalidation.md`. **Sin cambios.**

## Copia de trabajo del corpus

| Árbol | Ficheros íntegros | Alterados | Nuevos |
|---|---|---|---|
| `axion-corpus-isolated/` | **99 / 99** | 0 | **0** |
| Extracción desechable (scratch) | 99 / 99 | 0 | 74 (`.phase-e/test-runtime/**`) |

Verificación contra `09_candidate_manifest.json`.

Los 74 ficheros nuevos de la extracción desechable los crean **las propias suites del corpus**
al ejecutarse (`.phase-e/test-runtime/`), no el arnés. Por eso el corredor opera sobre una
extracción limpia y no sobre la copia de trabajo: así la copia de trabajo termina con cero
ficheros nuevos y sigue siendo comparable byte a byte con el ZIP sellado.

## Naturaleza del cambio

`h6a_patch.diff` — **13 ficheros nuevos, 0 modificados, 0 eliminados, 0 líneas suprimidas.**

```text
phases/axion-phase-h-identity/
├── h6a/
│   ├── runner.js
│   ├── lib/probe_kit.js
│   ├── oracle/mut_approval_always_valid.js
│   ├── oracle/mut_check_always_valid.js
│   ├── oracle/mut_state_machine_always_verified.js
│   └── red/r01 … r07  (7 sondas)
└── phase-h/12_h6a_test_inventory.json
```

Ningún fichero del corpus de G ha sido tocado. Ningún defecto de G ha sido corregido: la
autorización lo prohíbe expresamente y el verificador debe reportarlos en rojo, que es lo que
hace.

## Cambios fuera de alcance

Ninguno. En concreto, **no** se ha hecho:

| Prohibido por la autorización | Estado |
|---|---|
| Servicio de confianza | no implementado |
| Principals | no implementados |
| Execution attestations | no implementadas |
| IPC | no implementado |
| Ledger nuevo | no implementado |
| Migración del workflow | no realizada |
| Cambios criptográficos | ninguno |
| Resto de la construcción de H | no iniciada |
| Commit | no realizado |
| Promoción del candidato G | no realizada |

## Reversión

Reversión total: eliminar `phases/axion-phase-h-identity/h6a/` y los artefactos `12`–`16`,
`h6a_results.json` y `h6a_patch.diff`. No hay estado externo, ni servicios registrados, ni
ficheros de configuración modificados, ni dependencias instaladas.

El corredor no escribe fuera de: su propio `--out`, y el directorio temporal del sistema
(`%TEMP%/axion-h6a/`) que usan las sondas para sus registros y almacenes de consumo efímeros.

La reversión **no deja el sistema en un estado permisivo**: elimina la capacidad de medir, no
un control de seguridad.

## Reproducibilidad

```bash
node h6a/runner.js --corpus <extracción-limpia-del-zip> --inventory phase-h/12_h6a_test_inventory.json --out phase-h/h6a_results.json
```

El inventario fija el `sha256` de las 36 suites. Cualquier alteración de una suite —del corpus o
del arnés— produce `TEST_DISCOVERY_MISMATCH` antes de ejecutar nada.
