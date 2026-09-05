---
description: Meta-orquestador autónomo universal. Ejecuta tareas complejas integrando dinámicamente skills principales y sub-skills bajo gobernanza fail-closed. Funciona en Antigravity, Claude Code y cualquier terminal.
---

# /drive — Meta-Orquestador Autónomo Universal (Axion Protocol)

> **PROPÓSITO NUCLEAL**: Avanzar y completar tareas complejas de forma **100% autónoma y continua**, eliminando la fricción de micro-preguntas y pausas innecesarias. Asume la propiedad del problema, invierte todo el cómputo necesario en bucle cerrado, auto-corrige en caliente y no se detiene hasta que el objetivo esté completamente construido, probado y verificado con `exit code 0`.

---

## 🧭 Principio de Autonomía Continua

Al recibir `/drive`, el agente activa el **Arnés de Ejecución Continua**:

1. **Cero Micro-Interrupciones**: La IA no devuelve el turno para pedir confirmaciones obvias o mostrar pasos a medias. Asume la propiedad del problema de principio a fin.
2. **Dedicación Continua de Recursos**: Encadena secuencialmente todas las herramientas necesarias (inspección de código, edición, suites de dominio, verificación).
3. **Auto-Corrección en Caliente**: Si una prueba o comando falla durante el ciclo, analiza la causa raíz, corrige el código inmediatamente y vuelve a verificar hasta alcanzar el éxito determinista.
4. **Bifurcación Adaptativa (Fast-Loop vs Deep-Loop)**:
   - **Fast-Loop**: Para tareas atómicas (1 a 2 archivos), implementa y verifica directamente.
   - **Deep-Loop**: Para cambios arquitectónicos o estructurales (3+ archivos o módulos críticos), autoevalúa el *blast radius*, genera checkpoint preventivo y valida invariantes antes de mutar.

---

## 📋 Protocolo de Ejecución en 5 Pasos

### Paso 1: Reconocimiento y Mapeo de Impacto
- Lee el proyecto, stack y requerimiento activo.
- Auto-equipa las skills requeridas según el contexto (`premortem`, `clean-code`, `systematic-debugging`, `verify`, etc.).
- Si la intención es ambigua o difusa (<10 palabras sin objetivo claro), activa `/clarify` para emitir 2 preguntas A/B/C y sellar un `IntentContract` antes de continuar.

### Paso 2: Resguardo Seguro Preventivo
- Para cambios estructurales o multi-archivo:
  ```bash
  node tools/checkpoint.js create
  ```
- Si la operación involucra módulos sensibles (`killswitch`, `attestation`, `preflight`, `dsse`, `bin/`), realiza deliberación profunda evaluando blast radius.

### Paso 3: Implementación Completa
- Construir, reparar o refactorizar aplicando código limpio, conciso y modular.
- Todos los comandos de terminal deben usar ejecución estructurada (`shell: false`) y pasar por preflight:
  ```bash
  node tools/preflight.js "<comando>"
  ```
- Reglas estrictas:
  - Cero `git push` no autorizado.
  - Cero dependencias externas innecesarias (0 dependencies runtime).
  - Código autofuncional sin parches ciegos.

### Paso 4: Verificación Determinista Exit Code 0
Ejecutar la suite completa y exigir exit code 0:
```bash
node tests/run_all.js
```
O bien:
```bash
node tools/verify_changes.js
```
- **PASS** (exit 0): Proceder al cierre.
- **FAIL** (exit distinto de 0): **PROHIBIDO** afirmar que el cambio funciona. Analizar la salida real del fallo, corregir el código y volver a ejecutar. Repetir hasta exit code 0.

### Paso 5: Reporte Ejecutivo Obligatorio (3 Líneas)

Toda ejecución autónoma concluye con este formato exacto:

```
✓ [Acción Cumplida]: <qué se construyó o corrigió>
📊 [Métricas]: <suites pasadas y resultado de verificación real> · Modo Autónomo Local
🧠 [Próximo Vector Metacognitivo]: <estado del sistema y siguiente paso sugerido>
```

**Reglas del reporte**:
- Nunca citar cifras de suites de memoria o de documentación — solo lo que la ejecución acaba de imprimir en la terminal.
- Responder en el idioma conversacional del usuario.

---

## 🎯 Selector Proactivo de Misiones (Si no se especifica tarea)

Cuando `/drive` se invoca sin tarea específica o de forma exploratoria:

1. **En Antigravity / Interfaces con selector interactivo**:
   - Invoca la herramienta `ask_question` para renderizar el modal interactivo con opciones seleccionables de 1 clic.
2. **En Claude Code / Terminal / Voz**:
   - Presenta inmediatamente 3 misiones estructuradas en texto claro:
     - ⚡ **[INGENIERÍA]** <Título> — <Descripción concisa>
     - 📜 **[GOBERNANZA]** <Título> — <Descripción concisa>
     - ✨ **[NUEVA FUNCIÓN]** <Título> — <Descripción concisa>

---

## 🧰 Herramientas del Ciclo de Gobernanza

| Herramienta | Cuándo usarla |
| :--- | :--- |
| `node tools/checkpoint.js create` | Antes de cambios estructurales |
| `node tools/checkpoint.js restore latest` | Si el usuario solicita revertir (*"deshazlo"*, *"undo"*) |
| `node tools/preflight.js "<cmd>"` | Antes de cualquier comando de terminal |
| `node tools/verify_changes.js` | Al final de cada ciclo de implementación |
| `node tests/run_all.js` | Suite completa de pruebas en 5 dominios |
| `node bin/axion.js check` | Health check de integridad de gobernanza |
| `node tools/vibeguard_gate.js --strict` | Escaneo estricto de antipatrones |
| `node tools/intent_clarifier.js seal` | Sellar IntentContract tras clarificar |
| `node tools/premortem.js` | Autopsia adversarial antes de cambios críticos |

---

## ⚖️ Veredictos del Ciclo

- `MISION_ENTREGADA` — objetivo cumplido con verificación exit code 0 y reporte de 3 líneas.
- `PENDIENTE_VERIFICACION` — se implementó pero la suite aún no da 0: no es entrega.
- `HALTED` — `.axion/HALT` activo: se detuvo la ejecución y se reporta.
- `BLOQUEADO_PREFLIGHT` — un comando recibió DENY: no se ejecutó y se informa el motivo.

---

## ⚠️ Salvaguardas Fail-Closed

1. Si `node tools/killswitch.js` indica parada activa (`HALT`), **detener toda ejecución inmediatamente**.
2. Si `preflight` rechaza un comando (`DENY` / exit 1), **no ejecutarlo bajo ninguna circunstancia**.
3. Si `verify` falla, **no declarar éxito**. Depurar la causa raíz y re-ejecutar.
4. Si no hay suite de tests, **no asumir que el cambio funciona**. Proponer crear una prueba mínima.
