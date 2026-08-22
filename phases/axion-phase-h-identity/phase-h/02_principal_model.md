# H-1 · 02 — Modelo de principal canónico (Decisión obligatoria 2)

## Contrato

```yaml
principal:
  principal_id: "urn:axion:principal:5f2c1a90-3b47-4d1e-9c88-0a7f6e2b4d11"
  subject_type: HUMAN | MACHINE | SERVICE
  display_name: "Alice Rivera"          # informativo; PROHIBIDO en decisiones de seguridad
  external_subject_binding:
    kind: WINDOWS_SID | HARDWARE_ID | EXTERNAL_IDP_SUBJECT
    value: "S-1-5-21-3204..-1103"
    verified_by: "urn:axion:principal:<admisor>"
    verified_at: "2026-08-10T09:12:00.000Z"
  keys:
    - key_id: "ed25519:<sha256(spki)>"
      algorithm: Ed25519
      status: ACTIVE | RETIRED | COMPROMISED
      not_before: "2026-08-10T00:00:00.000Z"
      not_after:  "2027-08-10T00:00:00.000Z"
      superseded_by: null
  roles: [HUMAN_AUTHORITY] | [INDEPENDENT_AUDITOR] | [EXECUTOR]
  status: ACTIVE | SUSPENDED | REVOKED
  created_at: "2026-08-10T09:12:00.000Z"
  revoked_at: null
  admission_record:
    record_id: "AX-ADM-0007"
    admitted_by: ["urn:axion:principal:<a>", "urn:axion:principal:<b>"]
    evidence: ["acta de alta firmada", "captura de la cuenta de SO"]
    quorum: 2
    supersedes: null
    signature: "<Ed25519 sobre el acta canónica>"
```

## Reglas normativas

### R1 · Formato e inmutabilidad de `principal_id`
UUIDv4 opaco bajo el URN `urn:axion:principal:`. **Nunca derivado del nombre, del correo, del
SID ni de ningún atributo mutable.** Inmutable de por vida y **nunca reutilizado**, ni siquiera
tras revocación. Todas las decisiones de seguridad comparan `principal_id`; `display_name` no
participa en ninguna comparación y no debe aparecer en ninguna condición.

### R2 · Relación principal ↔ claves
Un principal posee **N claves**; una clave pertenece a **exactamente un principal**. La unicidad
global de `key_id` ya la garantizaba G (`key_id = SHA-256(SPKI)` recomputado y verificado) y se
conserva: **la misma clave pública no puede registrarse bajo dos principals**, y el intento hace
fallar la carga completa del registro.

### R3 · Exclusividad de roles
Un principal **no puede** tener simultáneamente `HUMAN_AUTHORITY` e `INDEPENDENT_AUDITOR`.
Se rechaza en el alta, no sólo en tiempo de ejecución. G lo permitía y dependía por completo de
la comparación de cadenas en `verifyIndependentCheck`; H lo hace estructuralmente imposible.

| `subject_type` | Roles admisibles |
|---|---|
| `HUMAN` | `HUMAN_AUTHORITY` **xor** `INDEPENDENT_AUDITOR` |
| `MACHINE` | `EXECUTOR` |
| `SERVICE` | *(ninguno de gobierno; sólo emite atestaciones)* |

`EXECUTOR` es incompatible con cualquier rol humano. Esta es la base estructural de `I4`.

### R4 · Unicidad de sujeto (mecanismo anti-duplicado)
La unicidad **no** se impone sobre `display_name` ni sobre `principal_id` —dos UUID distintos
son triviales de generar— sino sobre `external_subject_binding.value`:

> El registro rechaza el alta de un principal cuyo `external_subject_binding.value` coincida
> con el de cualquier principal en estado `ACTIVE` o `SUSPENDED`.

Comparación sobre forma canónica: normalización Unicode NFKC, recorte de espacios, plegado a
minúsculas para tipos insensibles a mayúsculas, y rechazo de valores con caracteres de control
o mezcla de escrituras (detección de homoglifos). Esto cierra la clase `PoC-4` / `PoC-9`.

### R5 · Alta (`admission`)
El alta es una operación privilegiada del servicio de confianza, nunca un fichero editable a
mano. Requiere:

1. quórum de **2** principals `HUMAN_AUTHORITY` `ACTIVE` distintos entre sí y distintos del alta;
2. evidencia adjunta y hash de la misma;
3. atestación explícita de que el sujeto **no está ya registrado bajo otro binding**;
4. acta firmada, encadenada en el ledger de auditoría.

### R6 · Rotación de claves
Se añade una clave nueva con `not_before` futuro; la anterior pasa a `RETIRED` con
`superseded_by`. La verificación de firma exige `key.not_before <= artifact.issued_at < key.not_after`
**además** de la vigencia del principal. G sólo comprobaba `authority.expiresAt`, lo que permitía
que una clave retirada siguiera validando artefactos dentro de la vigencia del actor.

### R7 · Revocación
`REVOKED` es terminal. Semántica adoptada:

- **Prospectiva para gating:** un artefacto firmado por un principal o clave revocados **no puede
  habilitar una ejecución nueva**, aunque se firmara antes de la revocación.
- **Retrospectiva para evidencia:** los manifiestos históricos siguen siendo verificables y se
  anotan con el estado de revocación vigente en el momento de la consulta.

`COMPROMISED` en una clave invalida además los artefactos ya emitidos con ella a efectos de
gating, y obliga a revisión manual de las misiones afectadas.

### R8 · Re-alta
Un principal revocado **no se reactiva**. Se emite un `principal_id` nuevo cuya acta de alta
declara `supersedes: <principal_id anterior>`. Impide blanquear historial reciclando identidad.

### R9 · Relación con la identidad del sistema operativo
Para `subject_type: HUMAN`, `external_subject_binding.kind` es `WINDOWS_SID` y su valor es el SID
de la cuenta local o de dominio del operador. Es lo que permite al servicio de confianza
autenticar al operador por el directorio de llegada (`03_trust_service.md`), y es lo que ata el
modelo lógico a un hecho que el ejecutor no puede falsificar.

## Límite de confianza declarado

La propiedad deseada es:

```text
una persona real → múltiples principal_id → evasión de separación de funciones   [IMPEDIDO]
```

**No puede garantizarse íntegramente en local, y así se declara.** Precisión del límite:

| Escenario | ¿Impedido? | Por qué mecanismo |
|---|---|---|
| Mismo humano, dos alias textuales (`alice` / `alice `) | Sí | R4 (binding canónico, no nombre) |
| Mismo humano, dos claves | Sí | R4 + R2 |
| Misma clave, dos principals | Sí | R2 (unicidad de `key_id`) |
| Mismo humano, un principal con ambos roles | Sí | R3 |
| Mismo humano, **dos cuentas de SO distintas** | **No técnicamente** | Sólo el quórum de alta (R5) — control humano |
| Mismo humano en un dominio con SID reciclado | No | Fuera de alcance; el SID se asume estable |

> **Declaración:** el control técnico reduce el problema a *«una cuenta de sistema operativo =
> un principal»*. El salto de *cuenta* a *persona* es un control **humano**, ejercido por el
> quórum de alta, no una garantía criptográfica. Cualquier documento que afirme lo contrario es
> incorrecto.

Elevar esa garantía requeriría un proveedor de identidad externo con verificación de identidad
real, lo que contradice el alcance Zero-Bloat de v1. Queda registrado como decisión humana
pendiente `D-03`.
