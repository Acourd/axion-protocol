# H-1 · 10 — Plan de migración

## Principio

G no se parchea. H sustituye la capa de identidad y conserva lo que resistió la reauditoría.

| Se conserva | Se sustituye | Se elimina |
|---|---|---|
| Ed25519 + `key_id = SHA-256(SPKI)` | Registro de autoridades → registro de principals | `runtimeContext.executorActorId` |
| Verificación de firma de aprobación y CHECK | `actorId` textual → `principal_id` canónico | `approvalActorId` derivado del payload |
| Máquina de estados de siete fases | Consumo en `GATE` → `Reserve` / `Commit` | `approvalConsumptionDir` como parámetro del request |
| Comando estructurado (`shell:false`) y clasificador | Manifiesto de evidencia → identidades ancladas | Cadena vacía como marcador de ausencia |
| Plan de rollback y su validación | Suite → inventario + gate de recuento | Doble rol humano en una entrada de registro |

## Orden de construcción

Cada etapa termina con un CHECK ejecutable propio. No se inicia una etapa sin `PASS` de la anterior.

| Etapa | Contenido | CHECK de cierre |
|---|---|---|
| **H-6a** | Reparar la suite: códigos de salida, inventario, gate de recuento, meta-prueba del oráculo | La suite actual falla de verdad ante fixtures rotos y reporta los 2 fallos conocidos de G |
| **H-1b** | Registro de principals + alta con quórum + unicidad de binding | Alias, homoglifos y claves duplicadas rechazados en el alta |
| **H-2** | Servicio de confianza: cuenta, ACL, canal, custodia de clave | Solicitud en canal ajeno denegada por el kernel; clave ilegible desde la cuenta del operador |
| **H-4** | Ledger encadenado + `Reserve`/`Commit` | Borrado, truncamiento y retroceso detectados y bloqueantes |
| **H-2b** | Execution attestation + spawn del ejecutor | `PoC-1` y `PoC-11` bloquean |
| **H-3** | Objetos verificados + evaluador de invariantes aislado | `PoC-5` bloquea con payload mutante |
| **H-6b** | Semántica LOW tipada | LOW alcanza `VERIFIED` con `I1`/`I3` `VACUOUS` |
| **H-5** | Identidades ancladas en evidencia | El manifiesto permite reverificar la separación sin datos externos |
| **H-7** | Reauditoría adversarial completa | Veredicto independiente |

**H-6a va primero.** Construir sobre la suite de G significaría no poder distinguir un avance
de una regresión.

## Orden inverso al propuesto: justificación

El orden original situaba la reparación de la suite en H-6, penúltima. Se adelanta su primera
mitad porque cada etapa intermedia necesita un comprobador fiable para cerrarse, y porque
`AX-NC-0002` demostró que una suite defectuosa produce certificaciones falsas. La segunda mitad
(cobertura LOW y casos nuevos) permanece en H-6b, ya que depende de tipos que aún no existen.

## Compatibilidad y datos existentes

- **Aprobaciones y CHECK de G:** no migran. Su `actorId` textual no resuelve a un principal
  canónico. Se conservan como evidencia histórica; no habilitan ejecuciones en H.
- **Registro de autoridades de G:** se usa como *entrada* del alta de H. Cada entrada exige acta
  con quórum, binding verificado y asignación de rol exclusivo. **No hay conversión automática:**
  importar el registro sin alta reproduciría `AX-NC-0001` vía (2).
- **Ledger:** no existe estado previo migrable. Se inicia vacío con registro génesis firmado.
- **Manifiestos de evidencia de G:** siguen verificándose; se anotan como emitidos bajo un modelo
  de identidad invalidado.

## Instalación privilegiada

Paso único, fuera de Node, ejecutado por un administrador y documentado como requisito de alcance:

```text
1. crear la cuenta de servicio axion-trust (sin privilegios de administrador)
2. crear el árbol %ProgramData%\Axion\{keys,ledger,registry,channel}
3. deshabilitar herencia y retirar Everyone
4. aplicar ACL: keys y ledger exclusivos del servicio; channel particionado por principal
5. generar el par Ed25519 de ejecución dentro de la cuenta de servicio
6. registrar el servicio de Windows con arranque automático
7. escribir el registro génesis del ledger
```

La instalación **no** entrega la clave privada a ningún proceso de usuario en ningún momento.
Un procedimiento que exporte la clave para «facilitar las pruebas» invalida toda la fase.

## Portabilidad (no soportada en v1)

La ruta POSIX equivalente sería: separación por `uid` dedicado, directorios `0700`, socket Unix
con `SO_PEERCRED` para credenciales del par, y ledger propiedad exclusiva del `uid` del servicio.
Es viable, pero **no está diseñada ni verificada** y no debe declararse soportada. Ver alcance
en `01_trust_model.md`.

## Reversión

Cada etapa se revierte de forma independiente: el corpus de G permanece intacto y sellado
(`b84462b5…`), y la custodia de línea base sigue verificada. Ninguna etapa de H modifica
artefactos de G. La reversión total consiste en detener el servicio y descartar el árbol de H;
no deja el sistema en un estado permisivo, sino sin capacidad de ejecutar misiones con gate.
