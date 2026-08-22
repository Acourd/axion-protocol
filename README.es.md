# Axion Protocol (v1.1.0-alpha)

> 🇬🇧 [Read this in English](README.md)

> Gobernanza, claridad de intención y firma criptográfica para operaciones de IA agentiva.

**Experimental · Pre-alpha · Governance-first · Sin runtimes certificados**

Axion Protocol es un runtime experimental de gobernanza local para operaciones agentivas. Conserva
un workflow de siete fases y **falla cerrado** cuando no puede demostrar riesgo, autorización,
CHECK, alcance, rollback o evidencia. Usa exclusivamente módulos integrados de Node.js: sin
dependencias externas, sin red, sin instalación.

Su objetivo es que una persona entienda qué intenta hacer un sistema agentivo, por qué seleccionó
determinados recursos, qué cambió, qué evidencia produjo y cómo puede revertirse.

---

## Estado real

Esta sección existe para que nadie —incluido su autor— confunda un candidato con una versión
certificada.

| Pregunta | Respuesta |
| :--- | :--- |
| ¿Es el corpus de código más completo? | **Sí.** Capa Ed25519 completa, 38 suites ejecutables. |
| ¿Es una versión certificada? | **No.** Su certificación fue formalmente invalidada el 2026-08-06. |
| ¿Tiene defectos abiertos conocidos? | **Sí, dos**, uno de ellos parcialmente cerrado. |

### No-conformidades abiertas

- **`AX-NC-0001` (CRÍTICA, reducida)** — La separación de roles tenía tres vías independientes
  que alcanzaban `VERIFIED` con las invariantes violadas, sin romper criptografía ni forjar
  firmas. **Dos están cerradas y una sigue abierta**:

  | Vía | Estado | Sonda |
  | :--- | :--- | :--- |
  | Alias y homoglifos de principal | **Cerrada** | `r02` en verde |
  | Relectura del payload tras verificarlo | **Cerrada** | `r03` en verde |
  | Identidad de ejecutor autodeclarada | **Abierta** | `r01` en rojo |

  La vía abierta es la de fondo: `executorActorId` lo escribe el propio ejecutor, que es la
  parte no confiable. Cerrarla exige atar la identidad a un hecho externo al payload —la cuenta
  del sistema operativo— mediante el servicio de confianza que especifica la Fase H, que necesita
  un servicio Windows privilegiado y ACLs impuestas por el kernel. Hasta entonces, **la
  separación de roles no puede considerarse demostrada**.

  Lo que el runtime hace en lugar de callarse: todo veredicto `VERIFIED` lleva ahora un **bloque
  de garantía** que declara cómo consta cada identidad — `ATTESTED` para aprobador y auditor,
  cuyas identidades vienen de firmas Ed25519 verificadas, y `SELF_DECLARED` para el ejecutor.
  Cualquier separación que lo involucre se reporta como `UNDEMONSTRATED_SELF_DECLARED_IDENTITY`,
  y `AX-NC-0001` viaja dentro de la evidencia y de la atestación. Quien las reciba no necesita
  leer este README para enterarse.
- **`AX-NC-0002` (ALTA)** — La certificación se emitió sin un comprobador capaz de fallar. De las
  13 suites que declararon `13/13 PASS`, cuatro no distinguen un sistema correcto de uno roto.

### Cerradas en esta versión

- **`AX-NC-0003` (ALTA)** — Era una regresión funcional: el nivel `LOW` no alcanzaba
  `VERIFIED`. La comprobación de independencia exigía un aprobador incluso con riesgos que la
  política no somete a aprobación, así que «no hay aprobador» se trataba como «aprobador
  inválido». Ahora la exigencia se deriva de la política compilada, **nunca** de si el sobre de
  aprobación viene o no: inferirlo del sobre habría permitido eludir al aprobador con solo
  omitirlo. La suite `tests/phase_e/approval_required_bypass.test.js` vigila exactamente eso.

### Resultado de la suite

Última ejecución completa sobre Node v24.19.0 — **38/38 PASS**:

| Tanda | Resultado |
| :--- | :--- |
| Funcional | 8/8 |
| Regresión | 10/10 |
| Fase E | 20/20 |

Y de las siete sondas de Fase H, que existen para demostrar defectos y **deben** estar en rojo
mientras el defecto viva: **`r02`, `r03` y `r05` han pasado a verde**. Las otras cuatro siguen
rojas a propósito.

Ejecútalas con `node tests/run_all.js`. Que estén en verde **no constituye promoción ni
certificación** (`policies/promotion.yaml`: `execution_implies_support: false`): la vía abierta de
`AX-NC-0001` no la resuelve la criptografía, sino atar la identidad del ejecutor a un hecho que él
no controle.

---

## Qué hace

1. **Cristalización de intención humana** (`tools/intent_clarifier.js`) — Aclara peticiones vagas
   sin jerga informática antes de tocar una línea de código.
2. **Clasificación y compilación de riesgo** (`tools/risk_policy_compiler.js`) — Evalúa el impacto
   de cada tarea (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). `HIGH` y `CRITICAL` exigen aprobación
   humana explícita y plan de rollback ligado a la misión.
3. **Verificación criptográfica Ed25519** (`tools/approval_ed25519.js`, `tools/check_ed25519.js`) —
   Verifica aprobaciones firmadas, con nonce, expiración y consumo único registrado de forma
   atómica. El CHECK debe firmarlo un auditor registrado distinto del ejecutor.
4. **Preflight y ejecución estructurada** (`tools/preflight.js`, `tools/structured_command.js`) —
   La única ruta `ALLOW` acepta `{ executable, args, cwd, shell: false }`. Shell crudo, wrappers o
   sintaxis ambigua producen `DENY` o `NEEDS_HUMAN_REVIEW`.
5. **Evidencia SHA-256** (`tools/evidence_hasher.js`) — Vincula misión, riesgo, comando y
   argumentos, alcance, aprobación, rollback, CHECK, estado y evidencia independiente.
6. **Atestaciones interoperables** (`tools/attestation.js`, `tools/dsse.js`) — Expresa una misión
   verificada como in-toto Statement v1 dentro de un sobre DSSE —el mismo formato de in-toto,
   SLSA, cosign y las atestaciones de GitHub— para que la evidencia pueda comprobarla una
   herramienta que no sepa nada de Axion.
7. **Parada de emergencia** (`tools/killswitch.js`) — Detiene toda misión antes de la fase 1.
   Parar es barato y no exige firma; reanudar es un acto humano deliberado, fuera del runtime.
   Un registro de parada ilegible cuenta como parada: si no se puede demostrar que nadie pidió
   detenerse, no se ejecuta nada.

## Qué no hace

- No es un modelo de IA ni un runtime autónomo.
- **No intercepta automáticamente los comandos.** El enforcement solo existe cuando un consumidor
  invoca `tools/workflow_runner.js` y respeta su veredicto. No hay interceptación global.
- El instalador copia ficheros; no activa enforcement por sí mismo.
- No garantiza exactitud ni ausencia de errores, y no debe usarse hoy como control de seguridad
  efectivo.
- El rollback exige un plan vinculado y un snapshot verificable; no existe restauración universal
  en un clic.
- **La parada de emergencia detiene automatismos, no adversarios.** Quien tenga permiso de
  escritura sobre el directorio de parada puede borrar el fichero. Protege del caso frecuente —un
  agente que se desboca y hay que frenar— no de un ejecutor hostil con acceso al disco.
- No convierte documentación en enforcement: `authority.yaml`, `promotion.yaml` y `retention.yaml`
  siguen en `DOCUMENT_ONLY`.
- No declara compatibilidad con runtimes no probados.

---

## El ciclo híbrido unificado (7 fases)

```text
[1. ENTENDER (Aclarador)] ──> [2. PLANIFICAR (Compilador Riesgo)] ──> [3. GATE (Aprobación Ed25519)]
                                                                               │
                                                                               ▼
[7. PROMOVER/RECORDAR] <── [6. AUDITAR (Evidencia SHA-256)] <── [5. CONSTRUIR (Preflight)] <── [4. TEST (TDD)]
```

Las transiciones son estrictamente ordenadas. Cualquier fallo deja la máquina en un estado terminal
bloqueado, y `VERIFIED` solo se emite tras completar las siete fases.

---

## Inicio rápido

Requiere **Node.js 20 o superior**. No hay dependencias que instalar: el paquete no declara
ninguna, y hay un test de regresión que se encarga de que siga siendo verdad.

Sin instalar nada:

```bash
npx axion-protocol --help
```

O desde un clon:

```bash
node install.js
```

```bash
node tools/intent_clarifier.js "haz un login"
```

Clasificar una cadena de shell. **Nunca obtiene `ALLOW`**: envuelta en un shell no se puede
determinar con certeza qué ejecutaría, así que el mejor resultado posible es
`NEEDS_HUMAN_REVIEW` (salida 2), y si parece destructiva, `DENY` (salida 1).

```bash
node tools/preflight.js "git commit -m mensaje"
```

Para alcanzar `ALLOW` hace falta un comando estructurado y que esté en la allowlist:

```bash
node tools/preflight.js --json '{"executable":"git","args":["status"],"cwd":".","shell":false}'
```

```bash
node tools/approval_ed25519.js --help
```

Parar todo, y consultar si algo está parado:

```bash
node tools/killswitch.js halt "el agente está tocando producción"
node tools/killswitch.js status
node tools/killswitch.js resume
```

Para la página de presentación, abre [`index.html`](index.html) en tu navegador — sin servidor ni
dependencias.

---

## Herramientas ejecutables (`tools/`)

| Herramienta | Función |
| :--- | :--- |
| `workflow_runner.js` | Orquestación fail-closed de las siete fases. |
| `intent_clarifier.js` | Entrevista sin tecnicismos para cristalizar requerimientos. |
| `risk_policy_compiler.js` | Compila y evalúa `policies/risk.yaml`. |
| `approval_ed25519.js` | Firma de fixtures y verificación/consumo de aprobaciones. |
| `check_ed25519.js` | Verificación de CHECK independiente firmado. |
| `identity_canonical.js` | Identidad canónica de actores: alias, homoglifos y mezcla de escrituras. |
| `assurance.js` | Cómo consta cada identidad y qué separaciones deja sin demostrar. |
| `killswitch.js` | Parada de emergencia: detiene toda misión antes de la fase 1. |
| `dsse.js` | Sobres DSSE con Pre-Authentication Encoding exacto. |
| `attestation.js` | Atestaciones in-toto Statement v1 de una misión verificada. |
| `structured_command.js` | Clasificación y ejecución con `shell: false`. |
| `preflight.js` | Clasifica comandos: `ALLOW`, `DENY` o `NEEDS_HUMAN_REVIEW`. |
| `evidence_hasher.js` | Manifiestos SHA-256 con binding canónico. |
| `rollback_plan.js` | Valida y hashea el plan mínimo de restauración. |
| `vibeguard.js` | Linter estático contra parches sintomáticos. |
| `learning_engine.js` | Registra lecciones aprendidas duraderas. |
| `install.js` | Instalador de un paso con respaldos idempotentes. |

### CLI unificada

Todas las herramientas cuelgan de un único punto de entrada. Los subcomandos delegan en los
módulos de `tools/`, así que no hay una segunda implementación que pueda divergir de la primera,
y los códigos de salida se propagan tal cual:

```bash
axion init --target ./mi-proyecto     # inyecta las reglas de gobernanza
axion preflight "git commit -m msg"   # clasifica un comando
axion halt "el agente se desboco"     # parada de emergencia
axion status                          # ¿hay algo parado?
axion attest verify att.json key.pem  # verifica una atestación
axion test                            # ejecuta la suite completa
```

El paquete publicado pesa **118 kB** y no arrastra dependencias. Lleva dentro la suite de
pruebas a propósito: puedes ejecutar el conjunto que intenta refutar este proyecto en lugar de
creerte el README. `phases/` —la evidencia de auditoría— se queda en el repositorio, no en el
paquete.

### Evidencia interoperable

Una misión verificada puede expresarse como **in-toto Statement v1** en un sobre **DSSE**,
firmado con las mismas claves Ed25519:

```bash
node tools/attestation.js verify atestacion.json auditor-publica.pem
```

| Campo | Valor |
| :--- | :--- |
| `payloadType` | `application/vnd.in-toto+json` |
| `predicateType` | `https://axion-protocol.org/attestation/workflow/v1` |
| Subject | La huella del manifiesto de evidencia de la misión |

Es una **capa de exportación, no un reemplazo**. El sobre interno sigue gobernando el gating, y
la capa Ed25519 no se rediseña a propósito: resistió la reauditoría de Fase G y la Fase H la deja
fuera de alcance. Lo que cambia es que la evidencia deja de ser un dialecto privado.

DSSE no firma el payload sino su *Pre-Authentication Encoding*, que ata el tipo de documento a la
firma. Sin eso, una firma emitida para un tipo podría reutilizarse haciéndola pasar por otro; la
suite intenta esa reutilización y exige que falle.

### Límites de confianza

La clave privada humana no pertenece al corpus ni al ejecutor. El registro de autoridades contiene
solo claves públicas y se recibe por contexto confiable, nunca desde el payload de la tarea. Axion
no ofrece operaciones para registrar, revocar o eliminar autoridades: eso exige un procedimiento
humano separado. Los fixtures de prueba generan claves privadas efímeras solo en memoria.

---

## Pruebas

Sin runner de terceros ni dependencias. Las 38 suites de una vez:

```bash
node tests/run_all.js
```

O una a una — cada fichero señala su resultado por código de salida:

```bash
node tests/adversarial.test.js
node tests/clarifier.test.js
node tests/human_anti_patterns.test.js
node tests/install.test.js
node tests/learning_git.test.js
node tests/tools.test.js
node tests/vibeguard.test.js
node tests/workflow.test.js
```

```bash
node tests/regression/ax_f_001_installer_backup.test.js
node tests/regression/ax_f_002_risk_gate.test.js
node tests/regression/ax_f_003_verified_requires_checks.test.js
node tests/regression/ax_f_004_evidence_manifest.test.js
node tests/regression/ax_f_005_preflight_destructive.test.js
node tests/regression/ax_f_006_learnings_preservation.test.js
node tests/regression/ax_f_008_doc_consistency.test.js
node tests/regression/ax_f_012_suite_integrity.test.js
node tests/regression/ax_f_013_documented_examples.test.js
node tests/regression/ax_f_014_package_contract.test.js
```

```bash
node tests/phase_e/approval_ed25519.test.js
node tests/phase_e/approval_forgery_baseline.test.js
node tests/phase_e/approval_required_bypass.test.js
node tests/phase_e/assurance.test.js
node tests/phase_e/attestation.test.js
node tests/phase_e/c01_governance_chain.test.js
node tests/phase_e/c02_destructive_classifier.test.js
node tests/phase_e/c03_independent_attestations.test.js
node tests/phase_e/check_ed25519.test.js
node tests/phase_e/evidence_binding.test.js
node tests/phase_e/killswitch.test.js
node tests/phase_e/payload_reread.test.js
node tests/phase_e/principal_alias.test.js
node tests/phase_e/revocation.test.js
node tests/phase_e/risk_policy_compiler.test.js
node tests/phase_e/role_separation.test.js
node tests/phase_e/rollback_plan.test.js
node tests/phase_e/structured_command.test.js
node tests/phase_e/workflow_enforcement_e2e.test.js
node tests/phase_e/workflow_state_machine.test.js
```

Una suite en verde **no constituye promoción ni certificación**
(`policies/promotion.yaml`: `execution_implies_support: false`). No hay instrumentación de
cobertura, y las pruebas no cubren el renderizado de las interfaces web ni el comportamiento
concurrente.

### Integridad del corpus

Hay **dos manifiestos con propósitos distintos**, y conviene no confundirlos:

| Fichero | Qué es | Debe coincidir con el árbol actual |
| :--- | :--- | :--- |
| `09_candidate_manifest.json` | Sello **vivo** del corpus y su suite: 116 ficheros. | **Sí** |
| `sha256-manifest.txt` | Registro **histórico** del arranque de Fase E: 70 ficheros. | **No** |

El segundo congela el estado del corpus al empezar la Fase E. El corpus siguió evolucionando en las
fases F y G, así que varios de sus hashes ya no coinciden — y eso es lo correcto. Si coincidieran,
significaría que alguien reescribió el registro para que luciera limpio. `phase-e-integrity.yaml`
documenta ese alcance y sella a su vez el manifiesto histórico.

Un manifiesto no puede contener su propio hash, porque el valor cambia al escribirlo. La integridad
de `09_candidate_manifest.json` la aporta el historial de git.

El repositorio incluye `.gitattributes` con `* -text` precisamente para que un `git clone` no
reescriba finales de línea y rompa todos estos hashes en la máquina de quien lo descargue.

---

## Este repositorio y Axkern

El proyecto se desarrolla en dos árboles con roles distintos:

| | **Axion Protocol** (este repo) | **Axkern** |
| :--- | :--- | :--- |
| Rol | Versión **canónica** | Campo **experimental** (rolling) |
| Contenido | Corpus sellado, evidencia de fases A→H | Corpus + entorno de agentes + material rescatado |
| Estado | Público, sellado por manifiesto y CI | Local, archivo verificado |

Nada llega aquí por existir en Axkern. La promoción exige evidencia, pruebas, rollback, auditoría y
aprobación explícita, según `policies/promotion.yaml` y la sección *Promoción* de
[`GOVERNANCE.md`](GOVERNANCE.md).

**Caso en curso:** `tools/principal_registry.js` **vive solo en Axkern** y sigue sin promoverse.
Su objetivo —cerrar el vector de alias de `AX-NC-0001`— acabó cumpliéndose por otra vía: la regla
R4 se implementó aquí como `tools/identity_canonical.js`. El borrador de Axkern normalizaba con
NFKC, y NFKC no convierte la `а` cirílica en la latina, así que no cerraba el vector. Se conserva
como registro de la primera aproximación.

---

## Documentación

- [Visión del proyecto](docs/vision.md)
- [Arquitectura](docs/architecture.md)
- [Modelo de amenazas](docs/threat_model.md)
- [Gobernanza formal](GOVERNANCE.md)
- [Política de seguridad](SECURITY.md)
- [Hoja de ruta](ROADMAP.md)

---

## Licencia

Distribuido bajo la [Licencia Apache 2.0](LICENSE). Consulta [`NOTICE`](NOTICE) para el material
histórico bajo `phases/`, que conserva el aviso de licencia previo a esta decisión.
