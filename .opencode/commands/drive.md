---
name: drive
description: Orquestador disciplinado de ingeniería. Ejecuta tareas complejas integrando dinámicamente skills bajo gobernanza fail-closed en flujos mediados por Drive. Requiere confirmación humana en la conversación anfitriona antes de mutar código. Funciona en Antigravity, Claude Code y terminal.
---

# /drive — Orquestador de Ingeniería con Flujo Mediado y Verificación Real (Axion Protocol)

> **PROPÓSITO NUCLEAR**: Guiar la ejecución estructurada de tareas de ingeniería bajo bucle cerrado determinista dentro de flujos mediados por Drive, operando por defecto en modo de **planificación y solo lectura**. Requiere confirmación humana en la conversación o interfaz anfitriona antes de mutar archivos o ejecutar acciones de riesgo, aplica deliberación fail-closed y solo declara éxito ante verificación empírica con `exit code 0`. Drive no intercepta comandos ni acciones ejecutadas fuera de sus herramientas o flujos mediados.

---

## 🧭 Principios de Ejecución y Confirmación en la Conversación

Al recibir `/drive`, el agente aplica un arnés de gobernanza dentro de los flujos mediados por el motor:

1. **Modo Planificación por Defecto (Read-Only First)**: Toda sesión inicia en modo de solo lectura (inspección, diagnóstico y formulación de plan). No se muta ningún archivo del repositorio sin confirmación humana previa en la conversación o interfaz anfitriona.
2. **Confirmación Humana en la Conversación para Mutaciones**: Antes de crear, editar o borrar archivos, el agente presenta el plan con alcance acotado y solicita autorización explícita al usuario en el chat. En el runtime de Drive, los parámetros de autorización (`callerDeclaredAuthorization`) son señales cooperativas declaradas por el llamador y no constituyen prueba criptográfica de voluntad humana.
3. **Confirmaciones Separadas para Acciones de Alto Riesgo**: Se prohíbe asumir autorización tácita para operaciones remotas, Git o de empaquetado. Se exige confirmación humana separada en la conversación antes de:
   - `git commit`
   - `git push` o creación de PR
   - `git merge`
   - Creación de tags o releases
   - Modificación de configuración de remotos
   - Uso de credenciales o secretos
   Drive no intercepta llamadas directas a Git, shell u otras herramientas fuera de sus propios flujos mediados.
4. **Bifurcación Adaptativa Fail-Closed (Fast-Loop vs Deep-Loop)**:
   - **Fast-Loop**: Para tareas atómicas (1 a 2 archivos no críticos), elabora propuesta, solicita confirmación y verifica mediante suites impactadas. Si no hay pruebas mapeadas (`NO_TESTS_MAPPED`), no asume éxito y exige verificación explícita.
   - **Deep-Loop**: Para cambios arquitectónicos o estructurales (3+ archivos o módulos sensibles), exige deliberación previa obligatoria (`BLOCKED_DELIBERATION_REQUIRED` si falta). Crea checkpoint preventivo verificable antes de mutar.
5. **Sin Verificación no hay Éxito**: Queda estrictamente prohibido declarar éxito sin ejecución real de pruebas con exit code 0 (`skipVerification` nunca constituye éxito o certificación).

---

## 📋 Protocolo de Ejecución en 5 Pasos

### Paso 1: Reconocimiento, Diagnóstico y Planificación (Read-Only)
- Lee el proyecto, stack, estado Git y requerimiento activo sin modificar archivos, extrayendo hechos observables (rama, HEAD, diff, pruebas).
- Auto-equipa exclusivamente skills canónicas requeridas según el contexto (`clarify`, `premortem`, `debug`, `verify`, `review`, etc.).
- Si la intención es ambigua o difusa (<10 palabras sin objetivo claro) o no hay evidencia en el repositorio, devuelve estado bloqueado (`BLOCKED_CONTEXT_REQUIRED`) o activa `/clarify` para emitir 2 preguntas A/B/C y sellar un `IntentContract` antes de proponer cambios.

### Paso 2: Resguardo Preventivo y Solicitud de Confirmación
- Presenta el plan de cambios al usuario y solicita confirmación humana explícita en la conversación antes de editar código.
- Para cambios estructurales o multi-archivo autorizados, crea checkpoint preventivo:
  ```bash
  node tools/checkpoint.js create
  ```
- Si la operación involucra módulos sensibles (`killswitch`, `attestation`, `preflight`, `dsse`, `bin/`), exige deliberación profunda evaluando blast radius.

### Paso 3: Implementación Controlada en Flujos Mediados
- Construir, reparar o refactorizar aplicando código limpio, conciso y modular.
- Todo comando de terminal invocado mediante las herramientas del proyecto debe usar ejecución estructurada (`shell: false`) y pasar por preflight con JSON estructurado:
  ```bash
  node tools/preflight.js --json '{"executable":"node","args":["tests/run_all.js"],"cwd":".","shell":false}'
  ```
- Reglas estrictas:
  - Cero `git push`, commit o PR sin confirmación separada en la conversación.
  - Cero dependencias externas (0 runtime dependencies).
  - Preflight y killswitch son comprobados activamente dentro de las herramientas y flujos orquestados por Axion. Drive no ejerce interceptación universal a nivel de sistema operativo ni restringe herramientas invocadas independientemente por el agente o el usuario.

### Paso 4: Verificación Determinista Exit Code 0
Ejecutar la suite completa y exigir exit code 0:
```bash
node tests/run_all.js
```
O bien el verificador incremental/focalizado:
```bash
node tools/verify_changes.js
```
- **PASS** (exit 0): Proceder al cierre.
- **FAIL** (exit distinto de 0): **PROHIBIDO** afirmar que el cambio funciona. Analizar la salida real del fallo, corregir el código y volver a ejecutar. Repetir hasta exit code 0.
- Si no hay pruebas mapeadas o se omite verificación, emitir estado no verificable (`NO_TESTS_MAPPED` / `UNVERIFIED`).

### Paso 5: Reporte Ejecutivo Obligatorio (3 Líneas)

Toda ejecución concluye con este formato exacto:

```
✓ [Acción Cumplida]: <qué se construyó o corrigió>
📊 [Métricas]: <suites pasadas y resultado de verificación real> · Modo Local
🧠 [Próximo Vector Metacognitivo]: <estado del sistema y siguiente paso sugerido previa confirmación>
```

**Reglas del reporte**:
- Nunca citar cifras de suites de memoria o de documentación — solo lo que la ejecución acaba de imprimir en la terminal.
- Responder en el idioma conversacional del usuario.

---

## 🎯 Selector Proactivo de Misiones (Si no se especifica tarea)

Cuando `/drive` se invoca sin tarea específica o de forma exploratoria:

1. **En Antigravity / Interfaces con selector interactivo**:
   - Invoca la herramienta `ask_question` para renderizar el modal interactivo con opciones seleccionables de 1 clic sintetizadas a partir de hechos observables (cambios en árbol de trabajo, estado de pruebas, journal persistido o backlog verificado).
2. **En Claude Code / Terminal / Voz**:
   - Presenta inmediatamente entre 3 y 5 propuestas estructuradas basadas en evidencia observable:
     - ⚡ **[INGENIERÍA]** <Título> — <Descripción concisa>
     - 📜 **[GOBERNANZA]** <Título> — <Descripción concisa>
     - ✨ **[NUEVA FUNCIÓN]** <Título> — <Descripción concisa>
   - Si no existe evidencia observable en el repositorio ni intención explícita del usuario, devuelve estado bloqueado (`BLOCKED_CONTEXT_REQUIRED`) y no auto-ejecuta ninguna misión estática inventada.

---

## 🧰 Herramientas del Ciclo de Gobernanza

| Herramienta | Cuándo usarla |
| :--- | :--- |
| `node tools/checkpoint.js create` | Antes de cambios estructurales |
| `node tools/checkpoint.js restore latest` | Si el usuario solicita revertir (*"deshazlo"*, *"undo"*) |
| `node tools/preflight.js --json '{"executable":"...","args":[...],"shell":false}'` | Clasificación estructurada antes de ejecutar comandos |
| `node tools/verify_changes.js` | Al final de cada ciclo de implementación |
| `node tests/run_all.js` | Suite completa de pruebas en 5 dominios |
| `node bin/axion.js check` | Health check de integridad de gobernanza |
| `node tools/vibeguard_gate.js --strict` | Escaneo estricto de antipatrones |
| `node tools/intent_clarifier.js seal` | Sellar IntentContract tras clarificar |
| `node tools/premortem.js` | Autopsia adversarial antes de cambios críticos |

---

## ⚠️ Salvaguardas Fail-Closed

1. Si `node tools/killswitch.js` indica parada activa (`HALT`), **detener toda ejecución inmediatamente antes de cualquier acción mutacional**.
2. Si `preflight` rechaza un comando (`DENY` / exit 1) o requiere revisión (`NEEDS_HUMAN_REVIEW`), **no ejecutarlo sin resolución previa**.
3. Si `verify` falla o no mapea pruebas, **no declarar éxito**.
4. Si la creación o restauración de un checkpoint falla, **detener inmediatamente con fallo bloqueante**. No reportar éxito de rollback si la restauración falló.
5. **Delimitación del Alcance**: La supervisión y salvaguardas operan estrictamente sobre las herramientas, flujos y procesos mediados por Axion. Drive no intercepta llamadas directas a Git, shell ni comandos ejecutados fuera de su motor, ni garantiza enforcement universal a nivel de sistema operativo.
