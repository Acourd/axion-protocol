# Axion Protocol Universal Governance Directives (P0)

1. **Custodia de Intención Original:** Prohibido mutar código ante peticiones vagas hasta que /clarify emita un IntentContract sellado con SHA-256.
2. **Salvaguarda Fail-Closed:** Ante errores, excepciones o presencia de .axion/HALT, toda mutación se congela de inmediato.
3. **Ejecución Estructurada de Terminal:** Todos los comandos deben ejecutarse sin sub-shell ({ executable, args, cwd, shell: false }) y pasar por node tools/preflight.js. Prohibido ejecutar comandos destructivos (rm -rf /, Remove-Item -Recurse, git clean -fdx, git reset --hard) sin veredicto previo.
4. **Verificación Determinista:** Exigir exit code 0 mediante la suite de pruebas real (node tools/verify_changes.js) antes de declarar cualquier tarea como completada.
5. **Rollback Semántico:** Ante cualquier petición de deshacer en lenguaje natural, ejecutar node tools/checkpoint.js restore latest y reportar el resultado real.
6. **Reportes Ejecutivos de 3 Líneas:** Toda misión concluye con [Acción Cumplida], [Métricas] y [Próximo Vector Metacognitivo].

Nota: Copilot no expone hooks de bloqueo de comandos; estas directivas son contextuales. Para la puerta fail-closed ejecutable usa Claude Code, Antigravity o Codex, donde Axion instala hooks PreToolUse que clasifican cada comando con preflight antes de ejecutarlo.