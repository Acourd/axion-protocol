# H-1 · 04 — Execution attestation (Decisión obligatoria 4)

## Contrato

```yaml
execution_attestation:
  version: "1.0.0"
  attestation_id: "urn:axion:attestation:<uuidv4>"
  mission_id: "AX-MISSION-0042"
  executor_principal_id: "urn:axion:principal:<machine>"   # subject_type MACHINE
  operator_principal_id: "urn:axion:principal:<human>"     # autenticado por el canal ACL
  session_id: "urn:axion:session:<uuidv4>"
  command_digest: "<sha256 canónico de {executable,args,cwd,shell}>"
  scope_digest: "<sha256 canónico del alcance ordenado>"
  policy_digest: "<sha256 del texto de policies/risk.yaml>"
  registry_snapshot_digest: "<sha256 del registro canónico vigente>"
  issued_at: "2026-08-10T09:31:00.000Z"
  expires_at: "2026-08-10T09:36:00.000Z"
  nonce: "<>=32 bytes base64url>"
  signer_key_id: "ed25519:<sha256(spki) de la clave del servicio>"
  signature: "<Ed25519 sobre la forma canónica sin `signature`>"
```

Dos campos son adiciones respecto al contrato propuesto, y son los que dan sentido al resto:

- **`operator_principal_id`** — sin él, la atestación sólo prueba «lo ejecutó una máquina», que
  es cierto siempre y no separa nada. Es el operando real de las invariantes `I1` e `I2`.
- **`registry_snapshot_digest`** — ancla la resolución de principals al estado del registro en
  el momento de emitir. Sin él, una rotación o un alta posterior cambiarían el significado de
  la atestación sin invalidar su firma.

## Vínculos obligatorios

| Vinculada a | Campo | Qué impide |
|---|---|---|
| Misión | `mission_id` | Reutilizar la atestación en otra misión |
| Comando y argumentos | `command_digest` | Sustituir el comando tras la emisión |
| Alcance | `scope_digest` | Ampliación silenciosa del alcance |
| Política | `policy_digest` | Ejecutar bajo una política distinta de la evaluada |
| Sesión | `session_id` | Reutilización entre sesiones del mismo operador |
| Ejecutor | `executor_principal_id` | Que otro proceso presente la atestación |
| Operador | `operator_principal_id` | Que la separación se evalúe sobre la máquina y no sobre la persona |
| Registro | `registry_snapshot_digest` | Que un alta posterior redefina las identidades |
| Tiempo | `issued_at` / `expires_at` | Uso diferido |
| Unicidad | `nonce` | Reproducción, vía ledger |

`expires_at - issued_at` no debe exceder **5 minutos**. La atestación cubre el arranque de la
ejecución, no su duración.

## Ciclo de vida

```text
1. El operador deposita la solicitud en channel\<principal_id>\in
       → el directorio autentica a operator_principal_id
2. El servicio calcula los digests y valida el estado de los principals
3. El servicio firma la atestación con la clave de ejecución
4. El servicio lanza el proceso ejecutor (spawn) y le entrega la atestación
       → executor_principal_id es la identidad del proceso que el servicio creó
5. El runner verifica firma, vigencia, digests y snapshot del registro
6. El runner deriva verified_executor EXCLUSIVAMENTE de la atestación
7. Antes de CONSTRUIR: revalidación de command_digest y scope_digest (anti-TOCTOU)
8. Commit en el ledger inmediatamente antes de ejecutar
```

## Orden de verificación en el runner

La atestación se verifica **antes que ningún otro artefacto**, porque las invariantes de los
demás dependen de la identidad que ella establece.

```text
ENTENDER → verificar attestation → PLANIFICAR → GATE(approval) → TEST(check) → CONSTRUIR → AUDITAR → PROMOVER
                   ▲
                   └── sin atestación válida no se avanza; no existe vía sin gate
```

Diferencia con G: allí la identidad del ejecutor entraba por `runtimeContext` en el momento de
usarla, sin punto de verificación propio. En H tiene fase, artefacto y fallo tipado.

## Estados

| Estado | Condición |
|---|---|
| `ATTESTATION_VALID` | Firma, vigencia, digests, snapshot y principals correctos |
| `ATTESTATION_MISSING` | No se entregó atestación |
| `ATTESTATION_INVALID_SIGNATURE` | Firma o codificación inválidas |
| `ATTESTATION_UNKNOWN_SIGNER` | `signer_key_id` no corresponde a la clave del servicio |
| `ATTESTATION_EXPIRED` | Fuera de `[issued_at, expires_at)` o clave firmante fuera de vigencia |
| `ATTESTATION_BINDING_MISMATCH` | Cualquier digest no coincide con la misión real |
| `ATTESTATION_REGISTRY_DRIFT` | `registry_snapshot_digest` distinto del registro vigente |
| `ATTESTATION_PRINCIPAL_NOT_ACTIVE` | Operador o ejecutor no `ACTIVE` |
| `ATTESTATION_REPLAYED` | El ledger ya consumió `attestation_id` + `nonce` |

Todos salvo el primero bloquean. `ATTESTATION_REGISTRY_DRIFT` bloquea deliberadamente: si el
registro cambió entre la emisión y la ejecución, la resolución de identidades ya no es la que
se atestó.

## Regla de derivación

> `verified_executor.principal_id` y `verified_operator.principal_id` provienen **únicamente**
> de una atestación en estado `ATTESTATION_VALID`. Ningún campo equivalente del payload, del
> contexto de ejecución ni de variables de entorno puede alimentar una decisión de seguridad.

Es el enunciado directo contra `AX-NC-0001`, y su cumplimiento es comprobable de forma
mecánica según `06_verified_objects.md`.
