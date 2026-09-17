# Ruta Pública de Verificación (E2E)

> Un solo recorrido, comandos documentados, sin pasos ocultos. Todo se ejecuta desde
> la raíz del repositorio (o con `--target <dir>` sobre un proyecto gobernado).

---

## Recorrido canónico

### 1. Inicializar el keyring (una vez; nunca rota claves)

```bash
node bin/axion.js attest-keygen [--target <dir>]
```

| Campo | Valor |
| -- | -- |
| Implementación | `tools/drive_dsse_attester.js --init-keys` |
| Exit | `0` creado · `2` ya existe / corrupto / permisos inseguros |
| Artefacto | `.axion/keys/attestation_ed25519.key` (0600 POSIX) y `.pub` |
| Verificador | firma Ed25519 y par consistente (`loadKeyPair`) |

### 2. Ejecutar la suite dentro del firmante y atestar

```bash
node bin/axion.js attest-run [--target <dir>] [--timeout <ms>]
```

| Campo | Valor |
| -- | -- |
| Implementación | `tools/drive_dsse_attester.js --run-suite` → `runSuiteAndAttest` |
| Exit | `0` `VERIFIED` · `1` `UNVERIFIED` · `2` error de uso/claves/suite ausente |
| Artefacto | `.axion/attestations/drive-session-<digest>.dsse.json` + evidencia en `.axion/evidence/` |
| Verificador | ejecución observada (exit code + conteos), Merkle Root pre/post idéntico, ledger firmado válido antes/después |

`VERIFIED` exige las cuatro condiciones a la vez: la suite termina verde, el árbol
rastreado no mutó durante la corrida, el ledger encadenado está íntegro y la evidencia
quedó registrada y firmada. Cualquier otra combinación produce `UNVERIFIED` (fail-closed).

### 3. Verificar el sobre y contrastar el subject Merkle

```bash
node bin/axion.js attest-verify <sobre.dsse.json> [--target <dir>]
```

| Campo | Valor |
| -- | -- |
| Implementación | `tools/drive_dsse_attester.js --verify` |
| Exit | `0` firma válida y subject == Merkle del árbol · `1` no coincide · `2` sobre ausente/ilegible |
| Artefacto | JSON en stdout: `{ valid, keyId, subjectSha256, targetMerkleRoot, subjectMatches }` |
| Verificador | `crypto.verify` (Ed25519/DSSE) + Merkle del árbol actual |

### 4. Registrar evidencia externa (no acredita ejecución)

```bash
node tools/drive_dsse_attester.js --target <dir> --evidence <artefacto.json>
```

| Campo | Valor |
| -- | -- |
| Exit | `0` emitida con `EXTERNAL_EVIDENCE` o `UNVERIFIED` · `2` error explícito |
| Artefacto | atestación con `verification.externalEvidence` (marcada `REGISTERED_NOT_OBSERVED`) |
| Garantía | La evidencia externa **nunca** produce `VERIFIED`, aunque esté firmada y registrada en el ledger |

---

## Qué garantiza este recorrido (y qué no)

Garantiza, dentro de la frontera local: ejecución observada por el proceso firmante,
sellado del árbol antes/después, ledger encadenado y firmado, y rechazo explícito de
evidencia fabricada, hashes divergentes, ledger corrupto y timeout.

No garantiza: aislamiento de proceso, certificación externa, autoridad independiente,
ni resistencia frente a un actor con acceso al mismo usuario y a la clave privada.
Sustituir los archivos de la suite **antes** de la ejecución queda fuera del perímetro
de confianza.

---

## ES — Ruta pública de verificación

Un único recorrido: `attest-keygen` → `attest-run` → `attest-verify`. `VERIFIED` solo
tras ejecución observada, árbol estable y ledger íntegro; la evidencia externa queda
como `EXTERNAL_EVIDENCE` sin métricas. Los límites locales permanecen visibles y no se
presentan como certificación.
