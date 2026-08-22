# H-1 · 05 — Ledger anti-replay (Decisión obligatoria 5)

## Propiedad exigida

> Append-only **desde la perspectiva del ejecutor**.

En H se obtiene por una vía más fuerte que los permisos de sólo-anexar: **el ejecutor no tiene
ningún acceso al ledger**. No puede leerlo, escribirlo, moverlo ni enumerarlo. Toda interacción
pasa por la API del servicio de confianza. «Append-only» deja así de ser una propiedad del
sistema de ficheros y pasa a ser una propiedad de la superficie de API, que sí es verificable.

Esto cierra `PoC-2` en su raíz: la ruta ya no es un parámetro del request, y borrar marcadores
deja de ser una operación disponible.

## Ubicación, propiedad y permisos

```text
%ProgramData%\Axion\ledger\
├── segment-000001.jsonl      registros encadenados
├── segment-000002.jsonl
└── head.json                 { segment, count, head_hash, updated_at, signature }
```

| Sujeto | Permiso |
|---|---|
| `axion-trust` | Full |
| Operador / ejecutor | **Ninguno** |
| Administradores | Full (fuera de alcance, ver `08_threat_model.md`) |

Herencia deshabilitada; `Everyone` retirado; `head.json` firmado por la clave del servicio.

## Formato y encadenado

Un registro por línea, JSON canónico:

```json
{
  "seq": 128,
  "artifact_kind": "APPROVAL | CHECK | ATTESTATION",
  "artifact_id": "...",
  "key_id": "ed25519:...",
  "nonce_digest": "<sha256 del nonce; nunca el nonce en claro>",
  "mission_id": "AX-MISSION-0042",
  "operator_principal_id": "urn:axion:principal:...",
  "consumed_at": "2026-08-10T09:33:11.482Z",
  "prev_hash": "<sha256 del registro anterior>",
  "record_hash": "<sha256(prev_hash || canonical(registro sin record_hash))>"
}
```

`head.json` mantiene `count` y `head_hash` firmados. La integridad se comprueba al arrancar y
antes de cada `Commit`:

| Anomalía | Detección |
|---|---|
| Registro borrado en medio | Rotura de cadena `prev_hash` |
| Truncamiento final | `head.count > registros presentes` |
| Sustitución del fichero completo | Firma de `head.json` inválida |
| Reescritura de un registro | `record_hash` no reproducible |
| Retroceso de estado (*rollback*) | `head.count` decreciente respecto al último valor firmado |

## Reserve / Commit — corrección de `AX-NC-0001` (consumo prematuro)

G consumía el nonce en la fase `GATE`, antes de evaluar la independencia aprobador↔auditor;
`PoC-6` demostró que un CHECK deliberadamente inválido inutilizaba una aprobación legítima.

H separa reserva y consumo:

```text
ReserveConsumption(artifact_id, nonce, key_id)
    → NOT_CONSUMED  (reserva con TTL 300 s, no escribe registro definitivo)
    → REPLAYED      (ya consumido o reservado y vivo)

  ... verificación completa de las invariantes I1..I5 ...

CommitConsumption(reserve_token)
    → CONSUMED      (registro encadenado, fsync, head actualizado)
```

- La **reserva** detecta el replay sin gastar el artefacto.
- El **commit** ocurre en un único punto, **inmediatamente antes de `CONSTRUIR`**, cuando toda
  verificación ha pasado.
- Una reserva no confirmada caduca y **no** deja el artefacto inutilizable.
- El commit es idempotente respecto a su `reserve_token`: un reintento tras un corte no duplica.

## Estados

| Estado | Significado | Efecto |
|---|---|---|
| `NOT_CONSUMED` | Primer uso legítimo | continúa |
| `CONSUMED` | Commit registrado | continúa |
| `REPLAYED` | Ya consumido o reserva viva | **bloquea** |
| `LEDGER_UNAVAILABLE` | Inaccesible, bloqueado o servicio caído | **bloquea** |
| `LEDGER_CORRUPTED` | Cadena rota, `head` inválido o retroceso | **bloquea** + alerta |
| `LEDGER_PERMISSION_DENIED` | ACL alterada | **bloquea** + alerta |

> Cualquier estado distinto de `NOT_CONSUMED` (en reserva) o `CONSUMED` (en commit) bloquea.
> No existe modo degradado que permita ejecutar.

## Atomicidad

Escritor único: el servicio. Secuencia por commit: `open(append)` → `write` → `fsyncSync` →
actualizar `head.json` por temporal + `fsync` + `rename`. Un fichero de bloqueo con el PID del
servicio protege frente a instancias duplicadas; un bloqueo huérfano exige verificación de
integridad antes de continuar, nunca borrado automático.

## Rotación y retención

- Rotación por tamaño (`> 64 MB`) o por año natural. El primer registro de cada segmento lleva
  como `prev_hash` el `head_hash` del segmento anterior: **la cadena no se rompe al rotar**.
- **Retención permanente por defecto.** El archivado de segmentos antiguos exige quórum de 2
  `HUMAN_AUTHORITY` y conserva los `head_hash` de cierre para que la cadena siga verificándose.
- Nunca se borran registros. La depuración por espacio se resuelve archivando, no truncando.

Decisión humana pendiente `D-07` (retención permanente vs. rotación controlada).
