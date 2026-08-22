# H-1 · 03 — `axion_trust_service` (Decisión obligatoria 3)

## Responsabilidades

| Sí | No |
|----|----|
| Autenticar al operador | Ejecutar misiones |
| Emitir *execution attestations* | Aprobar misiones |
| Custodiar la clave privada de ejecución | Auditar resultados |
| Mantener el ledger anti-replay | Decidir el estado `VERIFIED` |
| Registrar principals (alta, rotación, revocación) | Leer el contenido de los ficheros de la misión |
| Emitir eventos de auditoría encadenados | Interpretar la política de riesgo |
| Denegar toda operación no autorizada | Almacenar secretos de la misión |

El servicio **emite identidad**; el `workflow_runner` **decide**. Mantener esa separación es lo
que permite auditar cada lado por separado; fundirlos es la contingencia F2, no el diseño base.

## Cuenta y permisos

```text
Cuenta de servicio:  axion-trust  (local, sin pertenencia a Administradores)
Privilegios:         SeServiceLogonRight únicamente
Arranque:            Windows Service, automático, reinicio ante fallo
```

| Ruta | `axion-trust` | Operador | Otros |
|---|---|---|---|
| `%ProgramData%\Axion\keys\` | Full | **Sin acceso** | Sin acceso |
| `%ProgramData%\Axion\ledger\` | Full | **Sin acceso** | Sin acceso |
| `%ProgramData%\Axion\registry\` | Full | Read | Sin acceso |
| `%ProgramData%\Axion\channel\<principal_id>\in\` | Full | **Write** (sólo su directorio) | Sin acceso |
| `%ProgramData%\Axion\channel\<principal_id>\out\` | Full | **Read** (sólo su directorio) | Sin acceso |

ACL fijadas por el instalador privilegiado, con herencia deshabilitada y `Everyone` retirado.
El ejecutor **no tiene acceso alguno** al ledger: «append-only desde su perspectiva» se logra
negando el acceso directo, no confiando en permisos NTFS de sólo-anexar.

## IPC — canal particionado por ACL

> **El directorio por el que llega la solicitud es la identidad autenticada del operador.**
> La garantía la impone el kernel mediante la ACL, no una API de credenciales.

Ciclo: el operador escribe `in\<request_id>.json`; el servicio lo consume con `fs.watch` y
respalda con sondeo periódico; responde en `out\<request_id>.json`; el operador lee y borra.
Toda respuesta va **firmada** con la clave del servicio para que la manipulación por cualquiera
con acceso de lectura sea detectable.

Escritura atómica en ambos sentidos: fichero temporal en el mismo volumen, `fsync`, `rename`.
Nunca se lee un fichero cuyo nombre no acabe en `.json` y nunca se procesa una solicitud sin
`request_id` único, `client_nonce` y `issued_at` dentro de una ventana de ±120 s.

**Descartado:** tubería con nombre única. Node built-ins no permiten fijar su descriptor de
seguridad ni obtener el PID del cliente, por lo que no autenticaría a nadie.

## Superficie de API

| Operación | Autorización | Entrada | Salida |
|---|---|---|---|
| `Health` | Cualquier principal registrado | — | estado, versión, `registry_snapshot_digest` |
| `GetRegistrySnapshot` | Cualquier principal registrado | — | registro canónico + digest |
| `IssueExecutionAttestation` | Operador `HUMAN` activo | `mission_id`, digests de comando/alcance/política, `session_id` | atestación firmada + PID del ejecutor lanzado |
| `ReserveConsumption` | Operador activo | `artifact_id`, `nonce`, `key_id` | `NOT_CONSUMED` \| `REPLAYED` \| error de ledger |
| `CommitConsumption` | Operador activo | token de reserva | `CONSUMED` \| `REPLAYED` \| error de ledger |
| `RegisterPrincipal` | Quórum de 2 `HUMAN_AUTHORITY` | acta de alta firmada | acta encadenada |
| `RevokePrincipal` / `RotateKey` | Quórum de 2 `HUMAN_AUTHORITY` | orden firmada | acta encadenada |

`IssueExecutionAttestation` **lanza** el proceso ejecutor (`child_process.spawn`) y le entrega
la atestación por descriptor heredado. El servicio conoce al ejecutor porque lo creó: no hay
que autenticarlo después. Este es el mecanismo que sustituye a `runtimeContext.executorActorId`.

## Códigos de error

| Código | Significado | Efecto |
|---|---|---|
| `TS_OK` | Operación completada | continúa |
| `TS_UNAUTHENTICATED_CHANNEL` | Solicitud en un directorio sin principal asociado | bloquea |
| `TS_PRINCIPAL_NOT_ACTIVE` | Principal `SUSPENDED` o `REVOKED` | bloquea |
| `TS_ROLE_DENIED` | El principal no puede pedir esa operación | bloquea |
| `TS_QUORUM_NOT_MET` | Alta/revocación sin quórum válido | bloquea |
| `TS_BINDING_DUPLICATE` | `external_subject_binding` ya registrado (R4) | bloquea |
| `TS_MALFORMED_REQUEST` | Contrato de mensaje inválido | bloquea |
| `TS_REQUEST_EXPIRED` | Fuera de la ventana temporal o `client_nonce` reutilizado | bloquea |
| `TS_LEDGER_UNAVAILABLE` / `_CORRUPTED` / `_PERMISSION_DENIED` | Ver `05_replay_ledger.md` | bloquea |
| `TS_KEYSTORE_UNAVAILABLE` | Clave de ejecución inaccesible | bloquea |
| `TS_SPAWN_FAILED` | No se pudo crear el proceso ejecutor | bloquea |

**Todo error bloquea.** No existe código que degrade a una vía permisiva.

## Amenazas propias del servicio

| Amenaza | Control |
|---|---|
| Solicitud depositada en el canal de otro principal | ACL NTFS; el kernel lo impide |
| Reproducción de una solicitud antigua | `request_id` + `client_nonce` + ventana temporal |
| Manipulación de la respuesta por un tercero con lectura | Respuesta firmada por el servicio |
| Agotamiento por inundación del canal | Cuota por principal y descarte con evento de auditoría |
| Enlace simbólico / *junction* apuntando fuera del canal | Rechazo de reparse points; resolución y validación de ruta real |
| Servicio detenido para forzar una vía alternativa | El runner exige atestación válida: sin servicio no hay ejecución |
| TOCTOU entre emitir y ejecutar | Digests de comando y alcance dentro de la atestación, revalidados antes de ejecutar |

## Recuperación

| Situación | Comportamiento |
|---|---|
| Servicio caído | Ninguna misión con gate puede ejecutarse. Fallo cerrado. |
| Ledger no disponible o corrupto | El servicio arranca en modo `DEGRADED_READ_ONLY`: responde `Health` y `GetRegistrySnapshot`, deniega toda emisión y consumo |
| Reinicio con reserva pendiente | Las reservas caducan (TTL 300 s) y no se convierten en consumo |
| Registro ilegible | `DEGRADED_READ_ONLY`; ninguna verificación puede resolver principals |

Ninguna condición de recuperación permite continuar sin atestación ni sin ledger.

## Pruebas exigidas al componente

Servicio caído · ledger borrado · ledger truncado · ledger con cadena rota · permisos
retirados · solicitud en canal ajeno · `client_nonce` repetido · solicitud expirada · reparse
point en el canal · quórum insuficiente · binding duplicado · rotación de clave a mitad de
misión · revocación entre emisión y ejecución · reinicio con reserva viva. Detalle en
`09_test_strategy.md`.
