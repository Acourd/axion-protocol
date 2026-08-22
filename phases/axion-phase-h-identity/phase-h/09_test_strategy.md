# H-1 · 09 — Estrategia de verificación (Decisión obligatoria 8)

## Defecto que corrige

`AX-NC-0002`. La suite de G no podía fallar: `role_separation.test.js` terminaba con
`process.exit(0)` tanto en la rama `RED_TESTS_VALID` como en `ALL_PASS`. Ningún caso invocaba
`executeHybridWorkflow`, y la regresión declarada como 13/13 se limitó a `tests/phase_e/`,
excluyendo los dos directorios que contenían los fallos reales.

> Un comprobador que no puede devolver FAIL no es un CHECK. **La reparación de la suite precede
> a cualquier cambio de lógica.**

## Contrato de ejecución

1. **Código de salida distinto de cero ante cualquier fallo.** Sin excepciones y sin ramas que
   conviertan un fallo en salida 0.
2. **Inventario previo.** `tests/INVENTORY.json` versionado enumera cada suite con su ruta y su
   hash. El corredor descubre las suites, las compara con el inventario y **bloquea si difieren**.
   Un fichero de test nuevo no inventariado bloquea; uno inventariado y ausente, también.
3. **Cero exclusiones silenciosas.** No existe mecanismo de omisión. Un test deshabilitado debe
   declararse en el inventario con motivo y caducidad, y su presencia degrada el gate a
   `REVIEW_REQUIRED`.
4. **Gate de recuento.** Al terminar:

```text
tests_discovered == tests_in_inventory
tests_executed   == tests_discovered
tests_passed + tests_failed == tests_executed
tests_failed     == 0
```

   Cualquier desigualdad → salida distinta de cero, con el desglose impreso. Esto detecta el
   patrón exacto de G: un subconjunto ejecutado y reportado como total.

5. **Meta-prueba del oráculo.** Cada suite se ejecuta una vez contra un *fixture* deliberadamente
   roto y **debe** salir con código distinto de cero. Una suite que pasa con entrada rota se
   reporta como `ORACLE_DEFECT` y bloquea. Es el control directo contra `AX-NC-0002`.

## Cobertura obligatoria

### Flujo real, extremo a extremo
Todos los casos de gobernanza se ejecutan a través del workflow completo con el servicio de
confianza activo. Las pruebas de primitivas se conservan como complemento, **nunca como
sustituto**.

| Caso | Nivel | Resultado esperado |
|---|---|---|
| Tres principals distintos | HIGH | `VERIFIED`, 7 fases |
| Tres principals distintos | CRITICAL | `VERIFIED` |
| Operador atestado + auditor independiente, sin aprobación | LOW | `VERIFIED`; `I1`/`I3` `VACUOUS` |
| MEDIUM `conditional` sin aprobación | MEDIUM | bloqueado por aprobación ausente |

### Separación de identidades
| Caso | Esperado |
|---|---|
| Operador == aprobador | `SEPARATION_VIOLATED` (I1) |
| Operador == auditor | `SEPARATION_VIOLATED` (I2) |
| Aprobador == auditor | `SEPARATION_VIOLATED` (I3) |
| Alias tipográfico (`alice` / `alice `) en el alta | rechazado en `RegisterPrincipal` (`TS_BINDING_DUPLICATE`) |
| Homoglifo Unicode (U+0430) en el alta | rechazado |
| Mismo principal, dos claves | permitido; separación sigue bloqueando |
| Misma clave, dos principals | registro completo rechazado |
| Principal con ambos roles humanos | rechazado en el alta (R3) |
| Ejecutor con rol humano | rechazado (I4) |

### Atestación
Ausente · firma inválida · firmante desconocido · expirada · `command_digest` alterado ·
`scope_digest` alterado · `policy_digest` alterado · `session_id` de otra sesión ·
`registry_snapshot_digest` obsoleto · principal `SUSPENDED` · principal `REVOKED` ·
atestación reutilizada en otra misión · TOCTOU (comando mutado entre emisión y `CONSTRUIR`).

### Ledger
Borrado · truncado · cadena rota · `head.json` sin firma válida · `head.count` decreciente ·
permisos retirados · servicio caído · reserva caducada · reserva viva reutilizada · commit
idempotente tras corte · rotación de segmento con cadena continua.

### Payload y ciclo de vida
*Accessor* mutante sobre cada sobre firmado (traducción de `PoC-5`) · payload congelado vs.
mutable con resultado idéntico · rotación de clave a mitad de misión · revocación entre emisión
y ejecución · clave `COMPROMISED` · artefacto firmado por clave `RETIRED`.

### Regresión de G
Los siete PoC de la reauditoría se incorporan como pruebas permanentes y **deben** bloquear:
`PoC-1`, `PoC-2`, `PoC-3` (invertido: ahora debe dar `VERIFIED`), `PoC-4`, `PoC-5`, `PoC-6`,
`PoC-9`, `PoC-11`.

## Integridad del propio corpus

`AX-NC-0002` incluyó que `sha256-manifest.txt` no cubría `tools/approval_ed25519.js` ni
`tools/check_ed25519.js`, y discrepaba en `tools/workflow_runner.js`. Requisitos:

- El manifiesto cubre **todos** los ficheros del corpus, sin lista de exclusión.
- Un test compara manifiesto ↔ árbol real y falla ante cualquier diferencia, ausencia o sobrante.
- La cobertura de los módulos de enforcement es condición de gate, no un aviso.

## Informe

El corredor emite un artefacto de resultados con: inventario, descubiertas, ejecutadas, pasadas,
fallidas, omitidas con motivo, resultado de la meta-prueba del oráculo, duración y digest del
corpus. **Un informe cuyo total no cuadre con el inventario es en sí mismo un fallo.**
