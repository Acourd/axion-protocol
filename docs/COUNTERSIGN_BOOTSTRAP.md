# Bootstrap de contrafirma (AX-MEM-REG-0001 rev. 3)

Herramienta de gobernanza para verificar, consumir y disponer una contrafirma humana
sobre el registro de diseno `AX-MEM-REG-0001` revision 3.

Estado de esta entrega: `BOOTSTRAP_READY_NO_REAL_COUNTERSIGNATURE`. El flujo completo
esta probado con fixtures; no existe aun una contrafirma humana real firmada con clave
registrada. Nada de memoria adaptativa, journal de memoria ni Shadow queda habilitado
por este bootstrap.

## Vinculo canonico

- `registryId`: `AX-MEM-REG-0001`
- `registryRevision`: `3`
- `registrySha256`: `b8598241790c21f08f69035b69d7257c9a7c5b0e86776b1a5536e300f3142bf6`
- `scope` exacto e indivisible: `D1, D2, D2-a, D3, D4a, D5, D6, D11, D12, D13`
- Dominio de contrafirma: `application/vnd.axion.memory-design-countersignature+json`
- Dominio de disposicion: `application/vnd.axion.memory-disposition+json`

## Comandos

```
node tools/countersign_bootstrap.js verify   --envelope <f> --registry <f> --authorities <f> [--target <dir>]
node tools/countersign_bootstrap.js consume  --envelope <f> --registry <f> --authorities <f> [--target <dir>]
node tools/countersign_bootstrap.js dispose  --envelope <f> --registry <f> --authorities <f> [--target <dir>]

node tools/countersign_independent_verifier.js pre  --envelope <f> --registry <f> --authorities <f> [--target <dir>]
node tools/countersign_independent_verifier.js post --envelope <f> --registry <f> --authorities <f> [--target <dir>] [--pre-report <f>]
```

Flujo del gate independiente:

1. `V2-pre` toma el lock, lee el estado, calcula `authorizationDigest`, `stateDigest` y
   `baselineDigest`, y escribe su reporte durable.
2. `V1 consume` revalida el baseline completo antes de consumir y registra
   `operationId` y `baselineDigest` en marcador y `consumption.log`.
3. `V2-post` exige exactamente una transicion, un marcador, el HWM esperado y que la
   autorizacion no haya cambiado. Solo entonces reporta `INDEPENDENT_VERIFICATION_PASS`.

## Escrituras

Raiz unica permitida: `<target>/.axion/state/countersign-consumption/`.

- `consumption.lock` (lock de propietario con token y lease)
- `<hash>.used` (marcadores de contrafirma)
- `disp-<hash>.used` (marcadores de disposicion)
- `consumption.log` (cadena de consumo encadenada y fsync)
- `disposition.log` (cadena de disposicion encadenada)
- `reports/v2-pre-<operationId>.json` y `reports/v2-post-<operationId>.json`

V2 no escribe estado de consumo: su unica escritura es la creacion de sus reportes.
Ninguna otra ruta del proyecto se modifica.

## Estados

| Estado | Significado |
| --- | --- |
| `COUNTERSIGN_VALID` | Contrafirma verificada y consumida exactamente una vez |
| `COUNTERSIGN_MALFORMED` | Sobre, statement o dominio invalidos (incluye TTL y no canonicidad) |
| `COUNTERSIGN_INVALID_SIGNATURE` | Firma Ed25519 no valida |
| `COUNTERSIGN_UNKNOWN_AUTHORITY` | Clave o rol no registrados como `HUMAN_AUTHORITY` |
| `COUNTERSIGN_EXPIRED` | Ventana de la contrafirma o vigencia de la autoridad vencida |
| `COUNTERSIGN_SCOPE_MISMATCH` | Registro, hash o scope distintos del vinculo rev. 3 |
| `COUNTERSIGN_REPLAYED` | El nonce ya fue consumido |
| `COUNTERSIGN_REVOKED` | Clave revocada en el registro de autoridades o en la CRL |
| `COUNTERSIGN_HALTED` | `.axion/HALT` presente o ilegible |
| `COUNTERSIGN_REVISION_INVALIDATED` | La revision fue invalidada por disposicion |
| `COUNTERSIGN_AUTHORIZATION_CHANGED` | El baseline de autorizacion cambio desde V2-pre |
| `COUNTERSIGN_BASELINE_REQUIRED` | Falta el reporte V2-pre para la operacion |
| `COUNTERSIGN_BASELINE_MISMATCH` | El estado no coincide con el baseline del reporte |
| `BLOCKED_COUNTERSIGN_STATE_UNAVAILABLE` | Estado parcial, cadena rota, lock ocupado o HWM ilegible |
| `DISPOSITION_VALID` | `REPAIR` o `INVALIDATE` aplicada y registrada |
| `DISPOSITION_REPLAYED` | El nonce de la disposicion ya fue consumido |

Codigos de salida: `0` valido, `1` bloqueado o invalido, `2` uso incorrecto.

## Limites declarados

- Los escenarios T1-T6, M1-M6, D1-D3 y P1-P10 son criterios de aceptacion ejecutados
  contra fixtures; no constituyen evidencia de un despliegue real.
- Un rollback integro y consistente del estado local no es detectable sin ancla
  externa; el TTL acota la exposicion.
- La verificacion V2 protege contra error de implementacion y sesgo de un unico
  verificador, no contra un actor con acceso a la misma cuenta de SO. V2 comparte con
  V1 unicamente la primitiva generica `tools/file_lock.js` (protocolo de lock); no
  importa logica ni helpers del bootstrap.
- Este bootstrap no habilita memoria adaptativa v2, journal D11 ni Shadow: esos
  requieren contrafirma humana real verificada y decisiones posteriores separadas.
