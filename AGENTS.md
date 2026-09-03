# Axion Protocol

<!-- axion-protocol:gobernanza -->

# Axion Protocol — Gobernanza Determinista (P0)

1. **Custodia de Intención Original:** Prohibido mutar código ante peticiones vagas hasta que /clarify emita un IntentContract sellado con SHA-256.
2. **Salvaguarda Fail-Closed:** Ante errores, excepciones o presencia de .axion/HALT, toda mutación se congela de inmediato.
3. **Ejecución Estructurada de Terminal:** Todos los comandos deben ejecutarse sin sub-shell ({ executable, args, cwd, shell: false }) y pasar por node tools/preflight.js.
4. **Verificación Determinista:** Exigir exit code 0 mediante la suite de pruebas real antes de declarar cualquier tarea como completada.
5. **Rollback Semántico:** Ante cualquier petición de deshacer en lenguaje natural, ejecutar node tools/checkpoint.js restore latest y reportar el resultado real.
6. **Reportes Ejecutivos de 3 Líneas:** Toda misión concluye con [Acción Cumplida], [Métricas] y [Próximo Vector Metacognitivo].
7. **Anclaje Empírico en Tiempo Real:** Prohibido aseverar datos sobre el ecosistema vivo, modelos o versiones basándose en memoria estática de entrenamiento. Consulta obligatoria con herramientas de búsqueda activa (`search_web`).

Comandos disponibles: /attest /clarify /debug /drive /halt /memory /preflight /premortem /profile /review /snapshot /verify.
Herramientas: tools/preflight.js, tools/checkpoint.js, tools/attestation.js, tools/evidence_hasher.js, tools/killswitch.js.

<!-- axion-protocol:gobernanza -->