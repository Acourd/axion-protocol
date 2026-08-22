# H-1 · 01 — Raíz de confianza del ejecutor (Decisión obligatoria 1)

## Restricción dura

> No se acepta ninguna solución en la que el ejecutor pueda firmar su propia atestación.

Esta restricción descarta por sí sola toda opción cuya clave privada sea legible o utilizable
por la cuenta bajo la que corre el agente. Se aplica antes de cualquier otro criterio.

## Hallazgo que reordena las opciones

Antes de comparar mecanismos hay que registrar un límite técnico que condiciona el diseño:

> **Node.js con módulos integrados no puede obtener las credenciales del par en una tubería
> con nombre de Windows.** No existe equivalente de `SO_PEERCRED`; `GetNamedPipeClientProcessId`
> requiere un addon nativo o un proceso auxiliar.

Consecuencia: un servicio local que espere autenticar al llamante *preguntándole quién es*
no puede hacerlo con Node built-ins. Hay dos salidas, y ambas evitan la pregunta:

1. **Atestación en el arranque (*attestation-at-spawn*).** El servicio no responde a
   solicitudes de procesos desconocidos: es él quien **crea** el proceso ejecutor. Sabe quién
   es porque lo lanzó. «¿Quién me llama?» (difícil) se convierte en «¿a quién arranqué?»
   (trivial), resoluble con `child_process.spawn`.
2. **Canal particionado por ACL.** El canal de solicitud no es una tubería única sino un
   directorio por principal, con ACL NTFS exclusiva fijada en la instalación privilegiada.
   **El directorio por el que llega la solicitud *es* la identidad autenticada**, garantizada
   por el kernel, sin API de credenciales.

El diseño recomendado usa las dos: (2) para autenticar al operador humano que pide la misión,
(1) para vincular la atestación al proceso que realmente ejecutará.

## Evaluación de opciones

| Criterio | A · Servicio local fuera de proceso | B · Cuenta de sistema separada | C · DPAPI | D · TPM | E · Identidad atestada por auditor | F1 · A + spawn + canal ACL **(recomendada)** | F2 · Enforcement alojado en la cuenta de confianza |
|---|---|---|---|---|---|---|---|
| Frontera de confianza | Proceso + cuenta | Cuenta | Ninguna nueva | Hardware | Ninguna técnica | Proceso + cuenta + ACL kernel | Proceso + cuenta |
| Propietario de la clave | Cuenta de servicio | — (no aporta clave) | Cuenta que cifró | TPM | Auditor | Cuenta de servicio | Cuenta de servicio |
| Quién puede leerla | Servicio + Administrador | — | **El ejecutor, si es user-scope** | Nadie (no extraíble) | Auditor | Servicio + Administrador | Servicio + Administrador |
| Quién puede firmar | Servicio | — | **El ejecutor** | Quien pueda invocar el TPM | Auditor | Servicio | Servicio |
| Autenticación del solicitante | **No resoluble con built-ins** | n/a | n/a | n/a | Ninguna | ACL de directorio + spawn | Implícita (mismo proceso) |
| Resistencia a exfiltración | Alta | Alta | **Nula frente al propio ejecutor** | Muy alta | n/a | Alta | Alta |
| Portabilidad | Media | Media | Nula (Windows) | Baja | Alta | Baja (NTFS/Windows) | Baja |
| Complejidad | Media | Baja | Baja | Alta | Nula | Media | **Baja-Media** |
| Node built-ins | Sí | Sí | **No** (requiere PowerShell/addon) | **No** (CNG/PCP) | Sí | Sí | Sí |
| Dependencia de SO | Media | Alta | Alta | Alta | Nula | Alta | Alta |
| Impacto en pruebas | Medio (doble del servicio) | Bajo | Alto | **Muy alto** (hardware en CI) | Nulo | Medio | Bajo |
| Riesgo residual | Admin local | No aporta control por sí solo | **Descartada** | Admin local + coste | **Reproduce G** | Admin local | Admin local |

### Por qué se descartan C, D y E como raíz

- **C · DPAPI.** En ámbito de usuario, la cuenta del ejecutor descifra su propia clave: viola
  la restricción dura. En ámbito de máquina, cualquier proceso de la máquina la descifra: peor.
  DPAPI conserva valor como **protección en reposo de la clave del servicio**, nunca como
  frontera. La frontera es la cuenta, no el cifrado.
- **D · TPM.** Protege contra *robo* de clave, no contra *uso* por quien puede invocarla. Si la
  cuenta del ejecutor puede pedir la firma, el TPM no aporta nada frente a esta amenaza. Sólo
  tiene sentido como endurecimiento de F1, y a un coste que v1 no justifica.
- **E · Atestación por el auditor.** Es el modelo de G: el auditor firma `executorActorId` sin
  medio técnico para verificarlo, y además firma *después* de ejecutar, por lo que no puede
  actuar como gate. Reproduce exactamente `AX-NC-0001`.

**B no es una alternativa**, es un componente de A/F1/F2. Se registra así para evitar que se
seleccione como solución completa.

## Decisión

- **Principal: F1** — servicio local fuera de proceso bajo cuenta dedicada, canal de solicitud
  particionado por ACL, atestación emitida en el arranque del ejecutor, clave Ed25519 custodiada
  por el servicio, ledger de propiedad exclusiva del servicio.
- **Contingencia: F2** — el punto de enforcement (`workflow_runner`) se aloja dentro de la
  cuenta de confianza y el agente sólo deposita solicitudes. Menos componentes y misma frontera;
  se pierde la separación entre *emitir identidad* y *decidir VERIFIED*, que F1 mantiene limpia.
- **Endurecimiento diferido:** DPAPI (clave en reposo) y TPM (clave no extraíble) se registran
  como mejoras posteriores a H-7, no como requisitos de v1.

## Frontera de confianza resultante

```text
┌─ cuenta del operador (Alice) ───────────────────────────────┐
│  agente / ejecutor                                          │
│    · puede: escribir en channel\<principal_id>\in           │
│    · puede: leer  channel\<principal_id>\out                │
│    · NO puede: leer la clave de ejecución                   │
│    · NO puede: leer ni escribir el ledger                   │
│    · NO puede: escribir en el canal de otro principal       │
└──────────────────────────────┬──────────────────────────────┘
                               │  ACL NTFS (kernel)
┌──────────────────────────────┴──────────────────────────────┐
│  cuenta de servicio (axion-trust) — sin privilegios de admin │
│    · custodia la clave privada Ed25519 de ejecución          │
│    · mantiene el ledger append-only encadenado               │
│    · autentica al operador por el directorio de llegada      │
│    · lanza el proceso ejecutor y emite su atestación         │
└──────────────────────────────────────────────────────────────┘
```

## Qué protege y qué no

**Protege contra:** un agente comprometido que corre bajo una cuenta de usuario normal y que
puede leer y escribir cualquier fichero de esa cuenta, construir payloads arbitrarios en
memoria, elegir rutas y borrar sus propios ficheros.

**No protege contra:** un Administrador local malicioso, un controlador de kernel, un servicio
de confianza comprometido, acceso físico o una imagen de sistema manipulada. En Windows, un
administrador puede tomar posesión de cualquier fichero y depurar cualquier proceso; ninguna
construcción en espacio de usuario lo impide. Ver `08_threat_model.md`.

## Alcance declarado

```yaml
supported_runtime:
  operating_system: "Windows 10 / 11 / Server 2019+ (NTFS, Service Control Manager)"
  node_version: ">= 20 LTS, sólo módulos integrados"
  trust_service_required: true
  privileged_setup_required: true
  certified: false
```

No se declara compatibilidad multiplataforma: el control de autenticación depende de ACL NTFS
y de cuentas de servicio de Windows. La ruta POSIX equivalente (separación por `uid`,
directorios `0700`, `SO_PEERCRED` sobre socket Unix) se documenta en `10_migration_plan.md`
como trabajo futuro **no verificado**, y no debe anunciarse como soportada.
