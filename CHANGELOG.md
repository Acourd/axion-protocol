# Changelog

Todos los cambios relevantes de Axion Protocol se documentarán aquí.

## [1.4.0-beta.1] — 2026-09-12 · Preparación de Beta Pública

Versión preliminar de preparación para beta pública de Axion Protocol (GitHub source only; canal npm y releases públicas bloqueadas hasta autorización posterior). Consolida el estado basal del runtime, eleva el motor a Node `>=22.13.0` y resuelve fragilidades de estado y portabilidad multiplataforma.

### Fixed

- **Retención y Nomenclatura en Snapshots (`tools/context_shield.js` y `ax_f_063`)**: Eliminada sobreescritura silenciosa ante timestamps concurrentes idénticos mediante sufijo determinista secuencial (`_001`), con ordenación FIFO y límite estricto de retención de 10 snapshots.
- **Portabilidad de Rutas en CI Windows (`.github/workflows/ci.yml`)**: Sustitución de rutas POSIX fijas por `${{ runner.temp }}` y normalización multiplataforma.
- **Chequeo de Motor en Salud del Workspace (`tools/health_check.js`)**: Alineado el umbral de verificación del motor de ejecución a `Node.js >= 22.13.0` con la función determinista `evaluarMotorNode()`.

### Changed

- **Elevación de Requisito de Runtime (`package.json`, `README.md`, `README.es.md`)**: El motor mínimo soportado se eleva a Node `>=22.13.0` para garantizar disponibilidad de APIs nativas integradas (`node:sqlite`).
- **Alineación de Comandos y Comprobaciones**: Sincronizadas las 13 comprobaciones en verde devueltas por `health_check.js` en los ejemplos de ejecución de los READMEs; corrección de `/critic` por `/debug` en la tabla de comandos activos.
- **Matriz de CI Multiplataforma**: Actualizada la matriz de prueba a Node 22 y Node 24 sobre Ubuntu, macOS y Windows; retirado Node 20.

### Enhanced

- **Suite de Verificación Determinista**: 233 de 233 suites passing al 100% con cero dependencias externas y ejecución paralela bajo perfil aislado.
- **Prueba Unitaria de Umbral de Motor (`ax_f_050`)**: Verificación formal de que Node 20 y Node 22.12 fallan, mientras que Node 22.13 y Node 24 pasan.

---

## [1.3.1-rc.3] — 2026-09-02 · Candidato a Release (RC.3) & Pruebas de Gobernanza Local

Candidato a release de Axion Protocol v1.3.1-rc.3. Consolida la resolución verificada de 18 hallazgos de auditoría, herramientas locales de preflight para agentes, pruebas de laboratorio de consenso multi-agente y atestación Merkle experimental.

### Added

- **Sellado Criptográfico Merkle e in-toto Statement v1 (`tools/repo_attestation_generator.js` y `M_001_RELEASE_GA`)**: Atestación experimental DSSE Ed25519 con PAE (Pre-Authentication Encoding) sobre sujetos del repositorio.
- **Gestor de Revocación Criptográfica Formal (`tools/revocation_manager.js`)**: Emisión y validación de Listas de Revocación de Certificados (CRL) con firmas Ed25519 y protección anti-replay.
- **Acabado Obsidian Glass & Micro-Tipografía Suiza (`docs/site/style.css` y Misiones `M-VIS-001` a `M-VIS-003`)**: Sistema de tokens de diseño, curvas de resorte elástico (`--ease-spring`, `--ease-bounce`), contraste WCAG AAA en dark/light y soporte de reducción de movimiento con cero `!important`.
- **Generador Soberano Dual de SBOMs (`tools/sbom_sovereign_generator.js`)**: Cobertura exhaustiva de los 139 módulos en formatos SPDX 2.3 y CycloneDX sin dependencias externas.
- **Protocolo de Pensamiento Interno de Frontera (`.agents/rules/axion-governance.md` - Sección 7)**: Axiomas de falsacionismo previo y duda metódica para erradicar el sesgo de optimismo.

### Fixed

- **Gating Fail-Closed en Hooks (`.agents/hooks/validate-tool-call.mjs`)**: Corregido escape silencioso de comandos; `NEEDS_HUMAN_REVIEW` ahora emite bloqueo determinista con `BLOCK_EXIT = 2`.
- **Evasión Léxica y Metacaracteres (`tools/structured_command.js`)**: Tokenización posicional completa inmune a expansiones `$IFS`, concatenaciones encadenadas (`;|&`) y evaluadores de intérpretes (`-c`, `-e`, `-enc`).
- **Inyecciones Shell en Asistentes Git (`tools/git_assistant.js` y `tools/pipeline_fast_gate.js`)**: Migración absoluta a `spawnSync` con `{ shell: false }`.
- **Fusión AST Concurrente & Canales P2P (`tools/swarm_ast_arbiter.js` y `tools/swarm_p2p_channel.js`)**: Aislamiento a nivel de kernel mediante lockfiles OS atómicos (`wx`) y corte posicional determinista.
- **Consenso Multi-Agente BFT (`tools/swarm_consensus_arbiter.js`)**: Pruebas de laboratorio de supermayoría Bizantina ($\ge 2/3$), deduplicación de 1 voto por `voterId` y cómputo de quórum con abstenciones en el denominador.
- **Restauración Atómica de Checkpoints (`tools/checkpoint.js`)**: Escritura transaccional en `.tmp` y promoción atómica vía `renameSync`.
- **Serialización Canónica en Sobres PAE DSSE (`tools/attestation.js`)**: Adhesión matemática a la norma internacional RFC 8785 (`canonicalize`).

### Enhanced

- **Suite Determinista Unificada**: 201 de 201 suites de prueba en verde (100% PASS) ejecutadas en 14.49 segundos con 8 workers paralelos.
- **Blindaje Anti-Vibecoding (VibeGuard)**: 131 archivos de código fuente escaneados con 0 antipatrones.
- **Bundle Autónomo Standalone (`dist/axion.bundle.js`)**: 23 módulos de runtime empaquetados en un solo archivo de 180.7 KB con cero dependencias externas.

---

## [1.3.1-rc.2] — 2026-09-01 · Versión Oficial de Gobernanza Integral y Experiencia de Vuelo

Lanzamiento de Axion Protocol v1.3.1-rc.2 blindando los 5 bloques de arquitectura soberana con 188 suites deterministas y cero dependencias externas.

### Added

- **Onboarding Universal de 1 Clic & Semáforo de Vuelo HUD (`tools/onboarding_wizard.js` y `ax_f_168`)**: Inicialización en < 150 ms con detección ambiental automática y cuadro de mando visual con recetas de tareas rápidas.
- **Sensor Predictivo de Tokens y Entropía Léxica (`tools/context_budget_guard.js` y `ax_f_171`)**: Proyección matemática de agotamiento de ventana de contexto y alerta de picos acelerados (`CRITICAL_SPIKE`).
- **Gobernanza de Ecosistema Bilingüe (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/` y `ax_f_170`)**: Directrices formales de colaboración abierta, plantillas de issues/PRs y verificación estricta de los 5 Invariantes Soberanos.
- **Matriz Multi-SO de Integración Continua (`.github/workflows/ci.yml` y `ax_f_169`)**: Pipeline en GitHub Actions que audita las 188 suites en Ubuntu, Windows y macOS con Node.js 20, 22 y 24.
- **Motor Clean-Room de Humanización Anti-AI Slop (`tools/humanizer_engine.js` y `ax_f_166`)**: Auditoría y purificación de tono robótico de IA en textos y READMEs.

### Enhanced

- **Fast-Loop Short-Circuit (`tools/drive_engine.js` y `ax_f_167`)**: Ejecución de cambios atómicos en sub-300 ms sin micro-turnos innecesarios.
- **Podado Topológico de Contexto (`sliceASTFocus` y `pruneContextPayload`)**: Ahorro del 40% al 60% de tokens en cada turno de lectura de código.
- **Paridad Espejo 100%**: Sincronización inmutable verificada entre `Axion Protocol`, `Axkern` y `Hashgraph`.

---

## [1.3.0-rc.1] — 2026-09-01 · Versión Soberana & Ecosistema en Vivo

Lanzamiento oficial de la arquitectura de gobernanza soberana. Cierre completo de los 5 Dominios Fundamentales con 182 suites deterministas, sincronización espejo determinista y arnés de síntesis TDD.

### Added

- **Puerta de Sincronización Espejo (`tools/sync_mirror_gate.js` y `ax_f_164`)**: Garantiza paridad determinista e inmutable (100%) entre `Axion Protocol`, `Axkern` y entornos experimentales sin fugas de temporales.
- **Sintetizador Pre-Flight TDD (`tools/preflight_tdd_synthesizer.js` y `ax_f_165`)**: Análisis estático de contratos AST y síntesis formal de aserciones deterministas antes de mutar código en disco, asegurando *First-Shot Success*.
- **Motor de Crítica Asintótica v2.0 Polimórfico (`tools/asymptotic_critic.js` y `/critic`)**: Lente universal de evaluación sobre las 7 Fronteras de Madurez Soberana con Escalera de 3 Peldaños (Tier 1 Optimización -> Tier 2 Salto 10x -> Tier 3 Horizonte Día 1).
- **Verificación Incremental Ultra-Rápida (`tools/verify_changes.js --fast`)**: Ejecución de suites impactadas en < 300 ms mediante grafo de dependencias inverso.

### Enhanced

- **Bifurcación Fast-Loop / Deep-Loop en `/drive`**: Resolución en un solo turno para tareas atómicas y deliberación estricta con pre-mortem y cálculo de blast radius para refactorizaciones estructurales.
- **Memoria Fractal y Anclaje Contextual (`/memory`)**: Indexación en 4 categorías jerárquicas con inyección de ancla en < 150 tokens.
- **Paridad de Plataformas**: Coexistencia sin fricción entre Antigravity 2.0 (`.agents/skills/`), Claude Code (`.claude/commands/`) y terminal CLI unificada (`bin/axion.js`).

---

## [1.2.0-beta.1] — 2026-08-23 · revisión posterior a la purga

Verificación de la purga de `phases/` y de la reubicación de la portada a `docs/site/`, más los efectos de segundo orden que ninguna de las dos cosas dejaba a la vista.

### Verificado

- La purga eliminó **605 archivos, todos dentro de `phases/`** y ninguno fuera. Ningún documento, herramienta, prueba ni manifiesto dependía de ese directorio. La propia revisión de componentes del repositorio (`archive_manifest/zetprog_component_review.csv`) ya había decidido `historical_evidence → keep_outside_active_repository`: la purga ejecutó una decisión registrada y sin aplicar.
- La reubicación de la portada actualizó `ax_f_008` y `ax_f_013` en lugar de debilitarlas. Falsificado: escondiendo `docs/site/index.html` ambas suites se ponen en rojo, y vuelven a verde al restaurarla.

### Fixed

- **`sha256-manifest.txt` no declaraba su alcance.** 70 entradas, 32 sin cuadrar, y ni una línea que explicara si eso era deriva normal o corrupción. Un desajuste que nadie sabe interpretar se acaba ignorando, y entonces el manifiesto deja de ser evidencia. Ahora declara qué congela y a qué herramienta acudir para sellar el árbol actual.
- **`phase-e-integrity.yaml` señalaba a `09_candidate_manifest.json` como «la forma de verificar el corpus ACTUAL»**, cuando 29 de sus entradas ya no coincidían y 3 apuntaban a los archivos movidos. Remite ahora a `tools/evidence_hasher.js`, que calcula sobre lo que hay en disco.
- **`evidence_hasher.js` emitía los digests en MAYÚSCULAS**, contra `sha256sum`, git, in-toto y el resto del propio repositorio. `workflow_runner.js` llevaba dos `.toLowerCase()` tapándolo. Un operador que comparase ambas salidas veía un desajuste inexistente, que es el peor defecto posible en una herramienta cuyo único trabajo es permitir comparaciones.
- **La portada viajaba en el paquete publicado.** Al mudarse a `docs/site/` quedó dentro de `docs/`, que sí se publica: cada consumidor se descargaba una página web que no va a abrir. Excluida con `!docs/site/`; los 8 documentos `.md` siguen viajando.
- Dos prompts ilustraban con `phases/`, que ya no existe. Un ejemplo que cita una ruta fantasma enseña al agente a inventar rutas.

### Added

- `tests/regression/ax_f_018_evidence_scope.test.js` — la regla que impide que esto vuelva: **o el artefacto de integridad se declara histórico, o cuadra con el árbol**. No hay tercera opción, y menos la de callarse. Comprueba además que el verificador vivo funcione, que la portada quede fuera del tarball y que ningún workflow cite rutas inexistentes.
- `ax_f_014` valida también los patrones de negación de `files[]`: excluir una ruta que ya no existe es una exclusión que no protege de nada.

---

## [1.2.0-beta.1] — 2026-08-23

Auditoría de arnés completa. La versión anterior pasaba sus 38 suites en verde mientras varias de sus salvaguardas más visibles no se ejecutaban nunca. Esta versión cierra esa brecha y añade las pruebas que la habrían impedido.

### Fixed

- **El hook `PreToolUse` estaba muerto.** `.agents/hooks/validate-tool-call.mjs` hacía `import fileURLToPath from 'url'` (importación por defecto de un módulo que no la expone). Reventaba con `TypeError` en la primera línea, fuera de todo `try`, así que la puerta léxica no clasificó un solo comando en toda la vida de la versión. Reescrito: import correcto, comprobación de `.axion/HALT` antes que nada, veredicto JSON legible por el host y bloqueo ante cualquier error interno.
- **Ningún slash command existía en Claude Code.** No había directorio `.claude/commands/`; los 13 comandos vivían solo en `.agents/workflows/` (formato Antigravity). El chequeo de salud reportaba «13/13 instalados» mirando únicamente esa carpeta.
- **El paquete publicado no llevaba gobernanza.** `package.json` → `files` omitía `.agents/`, `.claude/` y `CLAUDE.md`: `npx axion-protocol init` habría instalado las herramientas y cero reglas, cero hooks y cero comandos. El instalador, además, anunciaba éxito porque copiar un origen inexistente devolvía `null` en silencio.
- **`/rollback` no revertía nada.** `tools/rollback_plan.js` es una librería de validación sin CLI: `node tools/rollback_plan.js` salía con 0 sin tocar un archivo. La directiva P3 de `CLAUDE.md` y la regla de gobernanza prometían restaurar «el último snapshot SHA-256», imposible por diseño: de un manifiesto de hashes no se reconstruye un archivo.
- **`/profile` no podía persistir.** `tools/profile_adapter.js` exportaba `saveCustomProfile()` pero su CLI solo imprimía; no había ruta para escribir las 5 dimensiones que el workflow decía guardar.
- **`/compact` y `/verify` apuntaban al vacío fuera del repositorio.** `install.js` nunca copiaba `context_shield.js` ni `verify_changes.js`.
- **La atestación de demostración era indemostrable.** `emit_attestation.js` firmaba con un par de claves que descartaba acto seguido y anunciaba «atestación generada con éxito» sin declararse demostración: un sobre imposible de verificar, indistinguible de evidencia real.
- **El killswitch no llegaba al hook.** `.axion/HALT` solo lo consultaba `workflow_runner.js`, no la ruta que usan los agentes en el IDE.
- **`health_check.js` reventaba en proyectos instalados** al leer `package.json` con `require()` desde una raíz que no tiene por qué tenerlo.
- Precisión de prompts: `/preflight` documentaba veredictos `PASS`/`BLOCKED` inexistentes (son `ALLOW`/`NEEDS_HUMAN_REVIEW`/`DENY`) y atribuía la clasificación a `policies/risk.yaml`, que no interviene; `/clarify` invocaba `intent_clarifier.js` sin el argumento obligatorio; `/attest` mandaba emitir con el script que solo verifica; `/checkpoint` no citaba herramienta alguna; el recuento «38/38» estaba grabado a fuego en cinco superficies.

### Added

- `tools/checkpoint.js` (`axion checkpoint` / `axion rollback`) — motor real de puntos de control y reversión. Guarda contenido, no solo huellas; verifica el manifiesto **entero** antes de escribir y aborta sin tocar nada si un solo hash no cuadra; sella una red de seguridad previa, de modo que deshacer también se deshace; conserva lo creado después salvo `--prune`. Las redes automáticas quedan fuera de `latest` para que un segundo `restore` no reaplique el estado deshecho. Retención acotada a 10 puntos por tipo: un snapshot de este repositorio pesa 17 MiB, y sin techo `.axion/` acabaría siendo lo más pesado del proyecto.
- `tools/profile_adapter.js set 1A 2A 3B 4C 5B` — persistencia real del perfil, por fusión y no por reemplazo, tolerante al formato pegado del dictado por voz.
- `.axion/state/ANCHOR.md` — ancla corta que `/compact` sella para devolver los invariantes P0 al final de la ventana de contexto. El digest cubre el contenido de reglas, workflows, `CLAUDE.md` y perfil, así que cambia solo cuando cambia algo que altera el comportamiento.
- `.claude/settings.json` — registro del hook `PreToolUse` para Claude Code. El instalador lo crea si falta y **no** lo sobrescribe si ya existe: indica qué añadir.
- `tests/regression/ax_f_015_workflow_contract.test.js` — el invariante que faltaba: cada `node tools/X.js` citado en un prompt existe, el instalador lo copia, el tarball lo publica, las dos superficies de comandos no divergen, y el hook se dispara de verdad contra `rm -rf /`.
- `tests/phase_e/checkpoint_restore.test.js` — 20 comprobaciones sobre el motor de reversión, centradas en que se **niegue** a restaurar mal.

### Added (tercera pasada: paridad de distribución y memoria)

- **Distribución como plugin de Claude Code.** `.claude-plugin/plugin.json`, `marketplace.json` y `hooks.json` (resueltos contra `CLAUDE_PLUGIN_ROOT`, no contra el directorio del proyecto: dentro de un plugin instalado no son el mismo sitio). Instalación en dos líneas: `/plugin marketplace add Acourd/axion-protocol` y `/plugin install axion-protocol`. Era la vía que ECC y SuperClaude ya ofrecían y Axion no.
- **`/remember` y `tools/memory.js` — memoria persistente del proyecto**, la única brecha real que quedaba frente a AG-Kit. Cuatro tipos y ninguno es «notas»: `decision` (exige `--porque`: una decisión sin razón no se puede revisar), `convencion`, `limite` y `correccion`. El identificador sale del contenido, así que el mismo hecho guardado dos veces se actualiza en vez de duplicarse. Las entradas más consecuentes viajan al ancla de `/compact` ordenadas por el coste de ignorarlas —primero los límites, luego las correcciones—, así que la memoria sobrevive justo a la compactación, que es cuando más falta hace.
- **CI en cuatro trabajos, no en uno.** Pasar las suites nunca demostró que el producto funcionara: la beta.0 tenía 38/38 en verde con el hook muerto y un tarball sin gobernanza. Ahora, además de las suites en Node 20/22/24: las puertas (salud, vibeguard, el hook disparado contra `rm -rf /`, la parada de emergencia bloqueando, la reversión restaurando y la cadena de atestación cerrando), el producto instalado desde el tarball real en Linux **y Windows**, y la coherencia de los manifiestos de distribución.
- `tests/regression/ax_f_017_memory.test.js` — 29 comprobaciones, más sobre lo que la memoria **rechaza** que sobre lo que acepta: una memoria que admite todo se vuelve un vertedero que deja de caber en el ancla, y entonces el agente la ignora entera.

### Fixed (tercera pasada)

- El README documentaba 7 de los 14 comandos. Ahora están los 14, con propósito y momento de uso.
- `package.json` no publicaba `.claude-plugin/`: el manifiesto no habría viajado en el tarball.

---

### Fixed (segunda pasada: barrido de las 31 herramientas)

- **`npx axion init` instalaba gobernanza pero `axion test` fallaba 2/40 en todo proyecto consumidor.** Dos suites de regresión leían `index.html` y `script.js`, que —correctamente— no viajan en el paquete. Ahora detectan el contexto por la presencia de `.git` y se saltan solo esa mitad; dentro del repositorio siguen siendo obligatorias, así que borrar la portada las rompe igual.
- **`wizard.js` fingía trabajar.** Sin terminal interactiva imprimía la primera pregunta, no esperaba a nadie, no instalaba nada, no guardaba perfil y salía con **0**. Además preguntaba 3 de las 5 dimensiones y no comprobaba si la instalación había quedado incompleta. Ahora se niega con exit 2 explicando la alternativa no interactiva, pregunta las 5 leyéndolas de `DIMENSIONES` (una sola fuente con `/profile`), y propaga el estado del instalador.
- **`vibeguard.js` no era una puerta, era un informe.** Emitía hallazgos y salía con **0**: en cualquier CI habría pasado siempre. Con un directorio por argumento reventaba con `EISDIR` y también salía 0. Ahora: 0 limpio, 1 hallazgos o error de lectura, 2 uso incorrecto.
- **El CLI corría el escáner peor de los dos.** `axion vibeguard` usaba `vibeguard_gate.js`, con su propia tabla de cuatro expresiones, que se perdía los `catch` mudos —el hallazgo de mayor severidad— y marcaba como TODO cualquier mención dentro de una cadena. La detección vive ahora en un único módulo: la puerta recorre el árbol y decide el código de salida, el inspector analiza.
- **Cuatro clases de falso positivo en el detector**, todas medidas contra el propio repositorio: la palabra española «Todo» al inicio de un comentario (decenas de casos en un corpus escrito en español) contaba como marcador `TODO`; el cuerpo de una expresión regular se auditaba como texto, así que el escáner se acusaba de contener `!important` por llevarlo escrito en una de sus reglas; un `catch` con un comentario que explica por qué se ignora el error contaba como catch mudo, penalizando justo la práctica correcta (criterio de ESLint `no-empty`); y `!important` se detectaba en cualquier frase que lo mencionara en vez de exigir que cerrase la declaración.
- **`updater.js`** cargaba `package.json` con `require()` —el mismo fallo que reventaba `health_check.js` en proyectos instalados— y daba por actualizado un proyecto aunque el instalador hubiera devuelto `INCOMPLETE`.
- **El contrato de códigos de salida del killswitch no estaba documentado.** `halt` termina con 1 y eso es el éxito: el código refleja el estado del sistema, no el del comando. Sin decirlo, un agente lo reporta como avería. Documentado en `/halt` y `/unhalt` con tabla.

### Changed (segunda pasada)

- La puerta de calidad gradúa por severidad: `HIGH` y `MEDIUM` bloquean, `LOW` se reporta como aviso y no tumba la promoción. Un aviso de especificidad CSS bloqueando una release es exactamente lo que lleva a desactivar la puerta. `--strict` recupera la política estricta para quien la quiera en CI.
- El escáner cubre también `.css`, `.scss`, `.mjs` y `.cjs`, y ordena los hallazgos por severidad. Un archivo ilegible ya no cuenta como archivo limpio.
- `tests/regression/ax_f_016_tool_contracts.test.js` — 29 comprobaciones sobre los códigos de salida y la precisión del detector, incluidos los cuatro falsos positivos como casos negativos explícitos.

### Verificado extremo a extremo

`npm pack` → `npm install <tarball>` → `npx axion init` en un proyecto virgen: 10/10 salud, 41/41 suites, vibeguard limpio, y `checkpoint`/`rollback`/`profile` operativos sobre archivos reales.

---

### Changed

- `health_check.js` verifica capacidad en vez de presencia: dispara el hook en vivo contra un destructivo, comprueba el registro en ambos runtimes, detecta deriva entre `.agents/workflows` y `.claude/commands`, y valida que toda herramienta citada exista. Un perfil sin calibrar ya no sale en rojo — una instalación nueva no es una avería.
- `verify_changes.js` ejecuta con `spawnSync` y `shell:false`, la misma regla P4 que el protocolo impone al agente. Antes usaba `execSync` con una cadena de shell.
- Los 13 workflows reescritos: veredictos literales, comandos que existen, alcance declarado con honestidad y prohibiciones explícitas. `/review` incorpora escala de severidad; `/debug` prohíbe el parche ciego; `/profile` añade la cadencia híbrida que el perfil real ya usaba y el cuestionario no sabía expresar.

---

## [1.2.0-beta.0] — 2026-08-22

Promoción oficial a fase Beta pública. Introduce capacidades universales de ingeniería de contexto, suite de salud en tiempo real, puente híbrido Antigravity + Claude Code, y herramientas de calidad automatizadas.

### Added

- `tools/health_check.js` (`axion check`) — auditoría instantánea de sincronización de reglas P0, hooks nativos `PreToolUse`, perfiles y claves criptográficas.
- `tools/context_shield.js` (`/compact` y `axion compact`) — compactación determinista de estado en `.axion/state/` para prevenir el *context rot* y la degradación *lost-in-the-middle* en sesiones largas.
- `tools/verify_changes.js` (`/verify` y `axion verify`) — bucle de verificación determinista por ejecución real con código de salida 0.
- `tools/vibeguard_gate.js` (`axion vibeguard`) — detector automático de anti-patrones (TODOs, mocks y stubs no funcionales) para la Fase 6 (AUDITAR).
- `tools/wizard.js` (`axion wizard`) — asistente interactivo paso a paso para onboarding rápido de creadores en terminal.
- `tools/profile_adapter.js` (`/profile` y `axion profile`) — calibración de 5 dimensiones del usuario (Voz, GUI, Visionario, cadencia híbrida y dirección guiada) persistida en `.axion/PROFILE.json`.
- `tools/updater.js` (`axion update`) — actualizador universal no destructivo con respaldo seguro SHA-256.
- 4 nuevos workflows de interacción portados del linaje de AgentProtocol: `/review` (4 lentes selectivas), `/onboard` (reconocimiento de repositorios), `/checkpoint` (snapshots manuales con etiqueta) y `/debug` (diagnóstico de causa raíz en 4 fases).
- Landing page renovada con paleta Esmeralda / Obsidiana, switcher de modo claro/oscuro persistente, sidebar vertical retráctil y circuito interactivo de las 7 fases.

---

## [1.1.0-alpha] — 2026-08-15

Primera publicación del repositorio. Consolida el trabajo de las fases D a H.

### Added

- `tools/assurance.js` — nivel de garantía de las identidades. Un `VERIFIED` presentaba ejecutor,
  aprobador y auditor juntos, como si constaran igual de bien; dos vienen de firmas verificadas y
  la del ejecutor la escribe el propio ejecutor. Ahora el veredicto y la atestación declaran
  `ATTESTED` o `SELF_DECLARED` por identidad, marcan como no demostrada toda separación que
  involucre al ejecutor, y transportan `AX-NC-0001` dentro de la evidencia. **No cierra el vector
  `r01`**: lo hace visible, que es distinto y es lo que se puede sostener sin el servicio de
  confianza de Fase H.
- `package.json` y `bin/axion.js` — empaquetado npm y punto de entrada único de la CLI
  (`npx axion-protocol`). Cero dependencias declaradas, 118 kB, y la suite viaja dentro para que
  quien lo instale pueda ejecutarla en vez de creerse la documentación. `phases/` queda fuera.
  `AX-F-014` vigila el contrato del paquete: sin dependencias, ejecutables que existen,
  subcomandos que apuntan a ficheros que viajan y motor de Node coherente con el README.
- `tools/dsse.js` y `tools/attestation.js` — la evidencia de una misión verificada puede
  expresarse como in-toto Statement v1 en un sobre DSSE, el formato de in-toto, SLSA, cosign y
  las atestaciones de GitHub. Capa de exportación: el formato interno y la capa Ed25519 no se
  tocan. El PAE se implementa al byte y la suite comprueba que una firma no puede reutilizarse
  bajo otro `payloadType`.
- `tools/killswitch.js` — parada de emergencia. Bloquea toda misión antes de la fase 1, exige un
  motivo escrito, y trata un registro ilegible como parada en lugar de como permiso. Reanudar es
  un acto humano fuera del runtime. Es el cuarto control de gobernanza, junto a permiso,
  aprobación y evidencia.
- Estado `COMPROMISED` en el registro de autoridades (regla R7): distingue una baja ordenada de
  una clave que se fue de las manos. Ambas bloquean, pero solo la segunda obliga a revisar lo ya
  firmado.
- `tools/identity_canonical.js` — identidad canónica de actores: normalización NFKC, rechazo de
  caracteres invisibles, detección de mezcla de escrituras y plegado de homoglifos cirílicos y
  griegos. Implementa la regla R4 de Fase H y cierra el vector de alias de `AX-NC-0001`.
- Capa criptográfica Ed25519 completa: aprobaciones firmadas con nonce, expiración y consumo
  único registrado de forma atómica (`tools/approval_ed25519.js`), y verificación de CHECK
  independiente firmado por un auditor distinto del ejecutor (`tools/check_ed25519.js`).
- Orquestador ejecutable fail-closed de las siete fases (`tools/workflow_runner.js`) y su máquina
  de estados (`tools/workflow_state_machine.js`).
- Compilación y evaluación en runtime de la política de riesgo (`tools/risk_policy_compiler.js`).
- Ejecución estructurada con `shell: false` y clasificación de comandos
  (`tools/structured_command.js`), más el validador léxico `tools/preflight.js`.
- Manifiestos de evidencia SHA-256 con binding canónico (`tools/evidence_hasher.js`,
  `tools/canonical_json.js`) y validación de planes de rollback (`tools/rollback_plan.js`).
- Suite de 29 pruebas ejecutables sin dependencias externas: 8 funcionales, 8 de regresión
  `AX-F-*` y 13 de Fase E.
- Integración continua sobre Node 20, 22 y 24 (`.github/workflows/ci.yml`).
- Evidencia completa de las fases A→H bajo `phases/`.

### Changed

- **Licencia seleccionada: Apache-2.0.** Sustituye al aviso `UNDECIDED` que no concedía ningún
  permiso de copia ni distribución. Ver `NOTICE` para el material histórico bajo `phases/`.
- `policies/risk.yaml` pasa a declarar `enforcement: RUNTIME_ENFORCED_BY_WORKFLOW_RUNNER`.
  `authority.yaml`, `promotion.yaml` y `retention.yaml` siguen en `DOCUMENT_ONLY`.
- `SECURITY.md` y `docs/threat_model.md` describen ya un runtime funcional experimental, acotando
  que el enforcement solo existe cuando el consumidor invoca `tools/workflow_runner.js`.
- `AX-F-008` amplía su auditoría de consistencia documental al `README.md` de la raíz.
- `.gitattributes` desactiva la conversión de finales de línea para preservar los SHA-256.

### Known issues

La certificación de Fase G fue invalidada el 2026-08-06 por tres no-conformidades. Una está
cerrada, otra reducida a la mitad y una sigue intacta:

- `AX-NC-0001` (CRÍTICA, **reducida**) — Tenía tres vías; quedan una. Cerradas: alias y
  homoglifos de principal (sonda `r02`) y relectura del payload tras verificarlo (sonda `r03`).
  Abierta: la identidad del ejecutor sigue siendo autodeclarada (sonda `r01`), y cerrarla exige
  el servicio de confianza de Fase H que la ata a la cuenta del sistema operativo.
- `AX-NC-0002` (ALTA) — Cuatro de las 13 suites que declararon `13/13 PASS` no distinguen un
  sistema correcto de uno roto.
- `AX-NC-0003` (ALTA) — **Cerrada.** El nivel `LOW` ya alcanza `VERIFIED`; ver la sección
  Changed. La sonda `r05` de Fase H lo confirma de forma independiente.

### Limitations

- No hay runtimes certificados y esto **no es una versión certificada**.
- No existe interceptación global: el enforcement solo cubre lo que atraviesa el orquestador.
- El instalador copia ficheros; no activa enforcement por sí mismo.
- No debe usarse hoy como control de seguridad efectivo.

## [0.1.0] — 2026-08-02

### Added

- Base documental de gobernanza y seguridad.
- Arquitectura conceptual de Director, Supervisor, Auditor y Evidence Layer.
- Políticas experimentales de autoridad, riesgo, promoción y retención.
- Esquemas iniciales para tareas, decisiones, acciones, evidencia, rollback, componentes, runtimes
  y auditorías.
- Manifiestos de linaje y revisión conceptual de ZetProG.
