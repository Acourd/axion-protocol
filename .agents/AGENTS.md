# Reglas de Proyecto: Axion Protocol

## Principio Rector Absoluto: Custodia de la Intención Original

1. **El Humano Decide la Visión:** Todas las sugerencias, arquitecturas y módulos deben actuar estrictamente como multiplicadores de la visión del creador: *permitir a usuarios no técnicos operar IA agentiva sin errores y con la mínima cantidad de iteraciones*.
2. **Protección de Aportes Originales:** Está estrictamente prohibido desviar, desestimar, modificar arbitrariamente o reemplazar los aportes e intenciones del usuario por soluciones genéricas externas sin su autorización previa.
3. **Filtro de Relevancia:** Toda recomendación técnica o de diseño debe evaluarse bajo esta pregunta: *"¿Esto simplifica la experiencia del usuario no técnico y reduce los errores o iteraciones perdidas?"*. Si la respuesta es No, la propuesta se descarta.

---

## Slash Commands de Gobernanza (Sinergia Cero-Colisión)

Axion Protocol incorpora 12 comandos de gobernanza diseñados para coexistir sin conflicto con Antigravity, Claude Code y AG-Kit. En Antigravity se montan como skills desde `.agents/skills/<nombre>/SKILL.md`; en Claude Code desde `.claude/commands/<nombre>.md`:

| Comando | Qué hace |
| :--- | :--- |
| **`/attest`** | Emite y verifica atestaciones in-toto Statement v1 en sobre DSSE con firma Ed25519, compatibles con SLSA y cosign. |
| **`/clarify`** | Aclara peticiones ambiguas mediante exactamente 2 preguntas humanas con opciones A/B/C antes de tocar código. |
| **`/debug`** | Ciclo sistemático de depuración en 4 fases con causa raíz y verificación por evidencia, sin parches ciegos. |
| **`/drive`** | Meta-orquestador autónomo universal de alta densidad cognitiva en bucle cerrado. |
| **`/halt`** | Parada de emergencia inmediata (killswitch) y reanudación deliberada en modo fail-closed (absorbe /unhalt). |
| **`/memory`** | Memoria persistente del proyecto y anclaje de contexto anti-deriva entre sesiones (absorbe /remember y /compact). |
| **`/preflight`** | Clasifica el riesgo de un comando de terminal antes de ejecutarlo. Veredictos ALLOW / NEEDS_HUMAN_REVIEW / DENY. |
| **`/premortem`** | Simulación de fracaso, autopsia adversarial a 6 meses y cálculo de blast radius antes de programar (absorbe /deep). |
| **`/profile`** | Calibra y persiste el perfil del usuario en 5 dimensiones (profundidad técnica, entrada, entorno, cadencia y autonomía). |
| **`/review`** | Auditoría de cambios por 4 lentes (Técnica, Funcional, UX/Producto, Arquitectura) aplicando solo las pertinentes. |
| **`/snapshot`** | Guarda y restaura puntos de control deterministas verificados con SHA-256 independientes de Git (absorbe /checkpoint y /rollback). |
| **`/verify`** | Verificación determinista por ejecución real de la suite, con exigencia de exit code 0. |

---

## Flujo de Trabajo Híbrido Unificado (7 Pasos)

1. **ENTENDER (Aclaración de Intención e Ideas — `/clarify`):**
   - Confirmar objetivo y límites antes de escribir código.
   - Formular máximo **2 preguntas humanas** con opciones concretas (A/B/C) sin jerga técnica.
   - Emitir el `IntentContract` con el alcance acordado.

2. **PLANIFICAR & EVALUACIÓN DISCRETA DE RIESGO:**
   - Descomponer la tarea en pasos lógicos.
   - **Regla de No-Intrusión**: Cero avisos molestos en tareas seguras. Solo si la tarea es destructiva o clasificada como `HIGH`/`CRITICAL`, insertar una advertencia discreta en el plan solicitando confirmación.

3. **GATE (HUMAN APPROVAL):**
   - Para acciones que afecten persistencia, borrado masivo o dependencias externas, se exige aprobación explícita de `Human Authority`.

4. **TEST (TDD PREVIO):**
   - Redactar las aserciones de prueba antes de construir el código.

5. **CONSTRUIR & SUPERVISAR (PREFLIGHT & VIBEGUARD):**
   - Modificaciones de código atómicas con preflight léxico (`tools/preflight.js`) y `shell: false`.

6. **AUDITAR & VERIFICAR:**
   - Ejecución empírica de la suite: reporta el número real de suites en verde que imprimió la salida, no una cifra memorizada.
   - Generación de evidencia criptográfica SHA-256 (`tools/evidence_hasher.js`).

7. **PROMOVER & REPORTE POLÍGLOTA:**
   - Emitir el reporte ejecutivo en el idioma nativo de la conversación del usuario (español, inglés, etc.) con: Objetivo ➔ Archivos modificados ➔ Pruebas superadas ➔ Hash SHA-256.

---

## Regla de Rollback Semántico en Lenguaje Natural

Si el usuario expresa en cualquier idioma la intención de revertir o deshacer cambios (*"deshaz lo que hiciste"*, *"reviértelo"*, *"undo changes"*, *"go back to previous state"*), la IA tiene **estrictamente prohibido debatir o pedir comandos de Git**. Debe ejecutar de inmediato `node tools/checkpoint.js restore latest` para restaurar el árbol al último punto de control verificado con SHA-256 e informar qué archivos fueron recuperados. El motor verifica el manifiesto entero antes de escribir nada y crea una red de seguridad previa, así que la propia reversión es reversible. Si no existe ningún punto de control, sale con `CHECKPOINT_MISSING`: informa de que no había red en lugar de dar la reversión por hecha.

---

## Estándares de Blindaje Anti-Vibecoding (VibeGuard)

1. **Cero Parches Sintomáticos:** Prohibido silenciar excepciones con `catch` vacíos, forzar CSS descontrolado con `!important` o dejar comentarios `TODO`/`FIXME` desatendidos.
2. **Zero-Bloat Gate:** Prohibido instalar paquetes o dependencias de `npm`/`pip` sin solicitar confirmación humana explícita (`GATE`).
3. **Acotamiento de Alcance Atómico:** Prohibido refactorizar archivos o módulos fuera del alcance del milestone autorizado.
4. **Verificación Empírica Obligatoria:** Jamás declarar éxito sin ejecutar la suite de pruebas y mostrar la salida `PASS`.
5. **Anclaje Empírico en Tiempo Real:** Prohibido aseverar datos sobre el ecosistema vivo, modelos o versiones basándose en memoria estática de entrenamiento. Consulta obligatoria con herramientas de búsqueda activa (`search_web`).
