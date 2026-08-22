# H-1 · 11 — Registro de decisiones

## Decisiones tomadas en el diseño

| ID | Decisión | Alternativas descartadas | Motivo |
|---|---|---|---|
| `A-01` | Raíz de confianza F1: servicio local fuera de proceso, canal particionado por ACL, atestación en el arranque | DPAPI (el ejecutor descifra), TPM (no impide el uso por la cuenta autorizada; coste alto), atestación por auditor (reproduce G) | Única opción compatible con Node built-ins que satisface la restricción dura |
| `A-02` | Autenticación del operador por el **directorio de llegada**, no por API de credenciales | Tubería con nombre + `GetNamedPipeClientProcessId` | Node built-ins no acceden a las credenciales del par en Windows |
| `A-03` | Atestación emitida en el **spawn**, no bajo demanda | Emisión a petición | Convierte «¿quién me llama?» en «¿a quién arranqué?» |
| `A-04` | Unicidad sobre `external_subject_binding` canónico | Unicidad sobre `display_name` o sobre `principal_id` | Dos UUID distintos son triviales de generar; el nombre es mutable |
| `A-05` | Exclusividad `HUMAN_AUTHORITY` xor `INDEPENDENT_AUDITOR` en el alta | Comprobación sólo en runtime (modelo de G) | Defensa estructural además de la de ejecución |
| `A-06` | Ledger sin acceso alguno del ejecutor; mediación por API | ACL de sólo-anexar sobre NTFS | «Append-only» pasa a ser propiedad de la API, verificable |
| `A-07` | Patrón `Reserve` / `Commit`, con consumo previo a `CONSTRUIR` | Consumo en `GATE` (modelo de G) | Corrige la quema de nonce por fallo posterior (`PoC-6`) |
| `A-08` | Objetos verificados completos y congelados como fuente única | Devolver sólo digests y releer el payload | Causa raíz de `PoC-5`; en G no existía valor verificado que usar |
| `A-09` | `approval_requirement` tipado con resultado ternario `SATISFIED`/`VACUOUS`/`VIOLATED` | Cadena vacía, actor ficticio, aprobación sintética | Corrige `AX-NC-0003` sin debilitar invariantes |
| `A-10` | H-6a (reparar la suite) se adelanta al primer puesto | Orden original con la suite en H-6 | `AX-NC-0002`: sin comprobador fiable no se puede cerrar ninguna etapa |
| `A-11` | Windows exclusivamente en v1; portabilidad documentada como no verificada | Declarar multiplataforma | El control depende de ACL NTFS y cuentas de servicio |

## Decisiones humanas pendientes

Ninguna se resuelve en H-1. Todas bloquean la autorización de construcción.

| ID | Pregunta | Opciones | Recomendación | Impacto si se decide lo contrario |
|---|---|---|---|---|
| `D-01` | **Runtime**: ¿sólo Windows o multiplataforma? | Windows v1 / multiplataforma desde el inicio | **Windows v1**. Multiplataforma duplica el modelo de autenticación sin cerrar ninguna amenaza adicional | Multiplataforma añade una ruta POSIX no verificada y retrasa H-7 |
| `D-02` | **Custodia**: ¿cuenta separada, DPAPI o TPM? | Cuenta / +DPAPI / +TPM | **Cuenta separada** como frontera; DPAPI y TPM como endurecimiento posterior a H-7 | DPAPI como frontera es una elección incorrecta: el ejecutor descifra su propia clave |
| `D-03` | **Alta**: ¿quién registra principals y con qué evidencia? | Quórum 1 / quórum 2 / IdP externo | **Quórum de 2 `HUMAN_AUTHORITY` + evidencia adjunta**. Es el único control frente al escenario X-05 | Con quórum 1, una sola persona puede crearse un segundo principal y anular las tres invariantes |
| `D-04` | **Servicio**: ¿persistente o invocación puntual? | Servicio Windows persistente / invocación puntual | **Persistente**. La invocación puntual exige que alguien arranque el proceso: si lo arranca el ejecutor, no hay frontera | La variante puntual sólo es válida con disparadores del SCM, no con arranque por el agente |
| `D-05` | **Administrador**: ¿confiable o fuera de alcance? | Confiable / dentro del alcance | **Fuera de alcance, declarado**. Contenerlo en espacio de usuario es imposible en Windows | Incluirlo obligaría a arranque medido y TPM, y aun así sería parcial |
| `D-06` | **Invariantes**: ¿se adopta `operator_principal` como sujeto de `I1`/`I2`? | Adoptar / mantener el enunciado original | **Adoptar**. Con el enunciado original, `I1` e `I2` son ciertas por construcción y no separan nada | Si se rechaza, hay que declarar que la separación 4-ojos no se implementa y documentarlo como riesgo aceptado |
| `D-07` | **Ledger**: ¿retención permanente o rotación controlada? | Permanente / rotación con archivado | **Permanente con rotación por segmentos encadenados**; archivado sólo con quórum | El borrado por espacio rompe la detección de retroceso de estado |
| `D-08` | **LOW**: ¿puede ejecutar sin aprobación pero con ejecutor atestado? | Sí / exigir aprobación en todos los niveles | **Sí**: atestación y auditor independiente obligatorios, aprobación no | Exigir aprobación en LOW contradice `policies/risk.yaml` y vuelve inoperante el tramo local |

`D-06` es la de mayor alcance: determina si H implementa separación de funciones real o
solamente una versión mejor comprobada de la de G.

## Riesgos residuales aceptados

| Riesgo | Severidad | Mitigación disponible |
|---|---|---|
| Administrador local malicioso | Alta | Ninguna en el alcance; auditoría externa del ledger |
| Una persona con dos cuentas de SO | Media | Quórum de alta (control humano), revisión periódica del registro |
| Colusión aprobador–auditor | Media | Rotación de auditores, auditoría posterior |
| Servicio de confianza comprometido | Alta | Es la raíz; superficie mínima y sin dependencias externas |
| Complejidad operativa de la instalación privilegiada | Media | Procedimiento documentado y verificable en `10_migration_plan.md` |
| Windows exclusivamente | Baja | Declarado; ruta POSIX documentada como no verificada |

## Cambios de alcance respecto al enunciado original de H-1

1. **Se añade `operator_principal`** al modelo y a las invariantes (`D-06`).
2. **Se añade `registry_snapshot_digest`** a la atestación, para anclar la resolución de identidades.
3. **Se adelanta la reparación de la suite** a la primera etapa de construcción (`A-10`).
4. **Se declara un límite técnico de Node** —imposibilidad de obtener credenciales del par en
   tuberías con nombre— que reorienta el diseño del IPC hacia el canal particionado por ACL.
