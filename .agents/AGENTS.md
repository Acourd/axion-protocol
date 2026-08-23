# Reglas de Proyecto: Axion Protocol

## Principio Rector Absoluto: Custodia de la Intención Original

1. **El Humano Decide la Visión:** Todas las sugerencias, arquitecturas y módulos deben actuar estrictamente como multiplicadores de la visión del creador: *permitir a usuarios no técnicos operar IA agentiva sin errores y con la mínima cantidad de iteraciones*.
2. **Protección de Aportes Originales:** Está estrictamente prohibido desviar, desestimar, modificar arbitrariamente o reemplazar los aportes e intenciones del usuario por soluciones genéricas externas sin su autorización previa.
3. **Filtro de Relevancia:** Toda recomendación técnica o de diseño debe evaluarse bajo esta pregunta: *"¿Esto simplifica la experiencia del usuario no técnico y reduce los errores o iteraciones perdidas?"*. Si la respuesta es No, la propuesta se descarta.

---

## Slash Commands de Gobernanza (Sinergia Cero-Colisión)

Axion Protocol incorpora comandos de gobernanza diseñados para coexistir sin conflicto con Antigravity, Claude Code y AG-Kit:

| Comando | Función Principal | Cuándo se Invoca |
| :--- | :--- | :--- |
| **`/clarify`** | Aclaración socrática en 2 preguntas humanas (A/B/C). | Antes de `/plan` o ante solicitudes vagas. |
| **`/preflight`** | Validador léxico de sintaxis y clasificador de riesgo. | Hook automático previo a ejecutar comandos de terminal. |
| **`/rollback`** | Reversión de código y archivos al último snapshot verificado. | Cuando se solicita deshacer cambios en disco. |
| **`/halt`** | Parada de emergencia inmediata (*Killswitch fail-closed*). | Ante desvíos del agente o petición del usuario. |
| **`/unhalt`** | Levantamiento consciente de la parada de emergencia. | Requiere autorización humana justificada. |
| **`/attest`** | Emisión de atestación formal in-toto Statement v1 / DSSE. | Al finalizar y certificar una misión completada. |

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
