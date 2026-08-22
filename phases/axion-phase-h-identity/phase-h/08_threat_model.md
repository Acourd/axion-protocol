# H-1 · 08 — Modelo de amenazas

## Frontera

```text
DENTRO DEL ALCANCE    todo lo que puede hacer un agente comprometido que corre
                      bajo una cuenta de usuario normal

FUERA DEL ALCANCE     todo lo que requiere privilegios de administrador local,
                      kernel, hardware o acceso físico
```

Esta frontera es la decisión de seguridad más consecuente de la fase y debe aprobarse
explícitamente (`D-05`). En Windows, un administrador local puede tomar posesión de cualquier
fichero, depurar cualquier proceso e instalar un controlador: **ninguna construcción en espacio
de usuario lo impide**. Declararlo fuera de alcance es honesto; afirmar lo contrario sería
repetir el error de G en otra capa.

## Amenazas dentro del alcance

| # | Amenaza | Control | Documento |
|---|---|---|---|
| T-01 | Ejecutor malicioso que declara su identidad | La identidad procede de una atestación firmada por el servicio; `runtimeContext.executorActorId` deja de existir | `04` |
| T-02 | Ejecutor con acceso al sistema de ficheros de su usuario | Clave y ledger fuera de su alcance por ACL; sin acceso de lectura ni escritura | `01`, `03`, `05` |
| T-03 | Principal duplicado (alias, homoglifo, doble clave) | Unicidad sobre `external_subject_binding` canónico; unicidad de `key_id`; exclusividad de roles | `02` R2–R4 |
| T-04 | Payload mutado tras la firma (*accessor*) | Objetos verificados congelados; payload fuera de alcance tras verificar; test dinámico obligatorio | `06`, `09` |
| T-05 | Ledger eliminado | Sin acceso del ejecutor; rotura de cadena detectada → `LEDGER_CORRUPTED` → bloquea | `05` |
| T-06 | Ledger reemplazado íntegro | `head.json` firmado por el servicio; firma inválida → bloquea | `05` |
| T-07 | Retroceso de estado del ledger | `head.count` monotónico firmado; decremento → `LEDGER_CORRUPTED` | `05` |
| T-08 | Replay entre misiones | `mission_id` + digests en la atestación; `nonce` consumido | `04`, `05` |
| T-09 | Replay entre sesiones | `session_id` vinculado y consumido | `04`, `05` |
| T-10 | IPC falsificado (solicitud en canal ajeno) | ACL NTFS por principal; el kernel lo impide | `03` |
| T-11 | Respuesta del servicio manipulada por un tercero con lectura | Respuestas firmadas por la clave del servicio | `03` |
| T-12 | Reproducción de una solicitud al servicio | `request_id` + `client_nonce` + ventana ±120 s | `03` |
| T-13 | Clave de principal comprometida | Estado `COMPROMISED`; invalidación prospectiva para gating; revisión manual de misiones afectadas | `02` R7 |
| T-14 | Clave retirada usada para firmar tarde | Verificación contra `key.not_before/not_after`, no sólo contra la vigencia del principal | `02` R6 |
| T-15 | Alta o revocación unilateral | Quórum de 2 `HUMAN_AUTHORITY`; acta firmada y encadenada | `02` R5 |
| T-16 | TOCTOU entre emitir la atestación y ejecutar | Revalidación de `command_digest` y `scope_digest` inmediatamente antes de `CONSTRUIR` | `04` |
| T-17 | Deriva del registro entre emisión y ejecución | `registry_snapshot_digest` → `ATTESTATION_REGISTRY_DRIFT` bloquea | `04` |
| T-18 | Servicio detenido para forzar una vía sin gate | El runner exige atestación válida; sin servicio no hay ejecución | `03` |
| T-19 | Enlace simbólico / *junction* en el canal | Rechazo de reparse points y validación de ruta real | `03` |
| T-20 | Inundación del canal | Cuota por principal, descarte con evento de auditoría | `03` |
| T-21 | Quema de una aprobación legítima por fallo posterior | Patrón `Reserve` / `Commit`; el consumo ocurre tras verificar todo | `05` |

## Amenazas fuera del alcance

| # | Amenaza | Motivo |
|---|---|---|
| X-01 | Administrador local malicioso | Puede tomar posesión de la clave y del ledger; imposible de contener en espacio de usuario |
| X-02 | Controlador de kernel o *rootkit* | Fuera del modelo |
| X-03 | Servicio de confianza comprometido | Es la raíz de confianza; su compromiso invalida todas las garantías por definición |
| X-04 | Acceso físico o imagen de sistema manipulada | Requiere arranque medido / TPM, diferido tras H-7 |
| X-05 | Una persona real que controla **dos cuentas de sistema operativo** | Sólo mitigado por el quórum de alta (control humano). Ver límite declarado en `02` |
| X-06 | Canales laterales y análisis temporal | No aplicable al modelo de amenazas de gobernanza |
| X-07 | Colusión entre aprobador y auditor | Ninguna arquitectura de 4 ojos resuelve la colusión; se mitiga con rotación y auditoría posterior |

## Límites de seguridad del modelo local

1. La cadena de confianza termina en la cuenta `axion-trust` y en la ACL que la protege. Todo lo
   que pueda alterar esa ACL está fuera del modelo.
2. La identidad humana se ancla en la cuenta de sistema operativo. El salto de *cuenta* a
   *persona* es un control humano, no criptográfico (`02`, límite declarado).
3. La independencia del auditor es una propiedad del **proceso de alta**, no del runtime. El
   sistema puede probar que dos principals son distintos; no puede probar que dos personas lo son.
4. Ningún control de H impide que una autoridad humana apruebe una acción incorrecta. H protege
   la **separación**, no el **criterio**.

## Comparación con G

| Amenaza | G | H |
|---|---|---|
| Autoaprobación por identidad declarada | **Abierta** (`PoC-1`) | T-01, cerrada |
| Aprobador == auditor por alias | **Abierta** (`PoC-4`) | T-03, cerrada |
| Ejecutor == auditor por alias | **Abierta** (`PoC-9`) | T-03, cerrada |
| Relectura del payload | **Abierta** (`PoC-5`) | T-04, cerrada |
| Replay cambiando de almacén | **Abierta** (`PoC-2`) | T-02/T-05, cerrada |
| Quema de nonce por fallo posterior | **Abierta** (`PoC-6`) | T-21, cerrada |
| Administrador local malicioso | Fuera de alcance | Fuera de alcance (**declarado**) |
