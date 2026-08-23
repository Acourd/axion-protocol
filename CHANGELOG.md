# Changelog

Todos los cambios relevantes de Axion Protocol se documentarán aquí.

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
