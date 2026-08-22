---
name: clarify
description: Cristalliza la intención del usuario no técnico mediante 2 preguntas humanas estructuradas antes de proponer código o arquitectura.
---

# /clarify — Aclarador de Intención Humana (Axion Protocol)

Este comando se ejecuta **antes de `/plan`** para eliminar ambigüedades y evitar que la IA alucine o construya cosas innecesarias.

## Protocolo de Ejecución

1. **Analizar la solicitud del usuario**:
   - Identificar si la solicitud carece de detalles esenciales (alcance, diseño, flujo de usuario o límites).

2. **Formular exactamente 2 preguntas humanas**:
   - Sin jerga informática ni tecnicismos confusos.
   - Cada pregunta debe incluir 3 opciones concretas: **A)**, **B)** y **C)**.
   - Ejemplo de pregunta 1: *«¿Cómo prefieres que los usuarios accedan a la aplicación? A) Con correo y contraseña, B) Con Google/GitHub, C) Sin registro obligatorio.»*
   - Ejemplo de pregunta 2: *«¿Qué estilo visual buscas para este proyecto? A) Minimalista y limpio, B) Oscuro y moderno tipo SaaS, C) Colorido y dinámico.»*

3. **Emitir el `IntentContract`**:
   - Una vez que el usuario responda, redacta un resumen compacto de 3 líneas con el objetivo acordado, lo que está incluido y lo que queda estrictamente fuera de alcance.
   - Invoca internamente `node tools/intent_clarifier.js` para sellar la intención.

4. **Siguiente paso**:
   - Proceder al comando `/plan` para estructurar la implementación técnica con base en el contrato validado.
