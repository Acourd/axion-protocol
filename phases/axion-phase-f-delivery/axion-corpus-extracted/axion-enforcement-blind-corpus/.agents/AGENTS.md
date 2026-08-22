# Reglas de Proyecto: Axion Protocol

## Principio Rector Absoluto: Custodia de la Intención Original

1. **El Humano Decide la Visión:** Todas las sugerencias, arquitecturas y módulos deben actuar estrictamente como multiplicadores de la visión del creador: *permitir a usuarios no técnicos operar IA agentiva sin errores y con la mínima cantidad de iteraciones*.
2. **Protección de Aportes Originales:** Está estrictamente prohibido desviar, desestimar, modificar arbitrariamente o reemplazar los aportes e intenciones del usuario por soluciones genéricas externas sin su autorización previa.
3. **Filtro de Relevancia:** Toda recomendación técnica o de diseño debe evaluarse bajo esta pregunta: *"¿Esto simplifica la experiencia del usuario no técnico y reduce los errores o iteraciones perdidas?"*. Si la respuesta es No, la propuesta se descarta.

## Flujo de Trabajo Híbrido Unificado (Axion + ZetProG + ECC)

Para todas las tareas y desarrollos de este proyecto, se adopta y aplica estrictamente el ciclo híbrido de 7 pasos:

1. **ENTENDER (Aclaración de Intención e Ideas):**
   - Confirmar objetivo, alcance exacto y fuentes de verdad normativas sin realizar suposiciones silenciosas.
   - Ante dictado ambiguo o de alto nivel de un usuario no técnico, ejecutar la clarificación por sub-pasos secuenciales (`tools/intent_clarifier.js`):
     - **Sub-paso 1.1: Dirección General de Producto:** Opciones claras de dirección (A/B/C + Opción Personalizada).
     - **Sub-paso 1.2: Clarificación de Diseño & UX (Design Intent):** Matriz de intención estética con filtrado dinámico + Opción Personalizada.
     - **Sub-paso 1.3: Cristalización de Alcance:** Emisión del Contrato de Entendimiento antes de avanzar a PLANIFICAR o CONSTRUIR.
   - Plantear máximo 2-3 preguntas sencillas en español neutro (sin jerga técnica ni detalles de implementación).

2. **PLANIFICAR & EVALUAR RIESGO:**
   - Descomponer la tarea y clasificar el nivel de riesgo (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - Definir plan de reversión (*rollback*) e indicadores de éxito.

3. **GATE (HUMAN APPROVAL):**
   - Para acciones afectando seguridad, persistencia, instalación de dependencias externas o clasificadas como `HIGH` o `CRITICAL`, se requiere autorización explícita de `Human Authority` antes de modificar el código.

4. **TEST (TDD PREVIO):**
   - Redactar o definir las pruebas unitarias/integración y los comandos de verificación (`CHECK`) antes de construir el código.

5. **CONSTRUIR & SUPERVISAR (OBSERVER, PREFLIGHT & VIBEGUARD):**
   - Realizar modificaciones de código atómicas activando el preflight léxico (`tools/preflight.js`) y el linter estático (`tools/vibeguard.js`).

6. **AUDITAR & VERIFICAR:**
   - Generar evidencias criptográficas SHA-256 (`tools/evidence_hasher.js`) e inspeccionar los cambios contra falsos positivos y seguridad.
   - Ejecutar las pruebas empíricas para obtener un veredicto `PASS/FAIL`.

7. **PROMOVER & RECORDAR:**
   - Actualizar el estado de la tarea a `VERIFIED`, registrar evidencias duraderas y promover lecciones aprendidas (`tools/learning_engine.js`).

## Estándares de Blindaje Anti-Vibecoding (VibeGuard)

1. **Cero Parches Sintomáticos:** Prohibido silenciar excepciones con `catch` vacíos, forzar CSS descontrolado con `!important` o dejar comentarios `TODO`/`FIXME` desatendidos.
2. **Zero-Bloat Gate:** Prohibido instalar paquetes o dependencias de `npm`/`pip` sin solicitar confirmación humana explícita (`GATE`).
3. **Acotamiento de Alcance Atómico:** Prohibido refactorizar archivos o módulos fuera del alcance del milestone autorizado.
4. **Verificación Empírica Obligatoria:** Jamás declarar éxito sin ejecutar la suite de pruebas y mostrar la salida `PASS`.
