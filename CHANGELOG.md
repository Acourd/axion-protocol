# Changelog

Todos los cambios relevantes de Axion Protocol se documentarán aquí.

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
