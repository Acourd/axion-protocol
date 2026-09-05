---
description: Aclara peticiones ambiguas mediante exactamente 2 preguntas humanas con opciones A/B/C antes de tocar código, con soporte de selector interactivo de UI (ask_question).
---

# /clarify — Aclarador de Intención Humana (Axion Protocol)

> **PROPÓSITO**: Freno cognitivo obligatorio antes de planificar. Elimina la ambigüedad con dos preguntas claras con opciones A/B/C seleccionables con un solo clic, sin tecnicismos ni cuestionarios interminables.

---

## 🛑 Cuándo se Activa

- Peticiones difusas o con bifurcación de diseño: *"hazme una app de reservas"*, *"mejora la interfaz"*, *"cambia la base de datos"*.
- Prompts de menos de 10 palabras o sin detalle de flujo, datos o estética.
- Invocación explícita de `/clarify` o activación adaptativa dentro de `/drive`.

**No se activa** si la petición ya trae flujo, arquitectura y estética claramente definidos: preguntar lo que ya te han dicho es fricción innecesaria.

---

## 📋 Protocolo de Ejecución Interactiva (UI & Voz)

### Paso 1: Freno Inmediato
**PROHIBIDO** escribir código, crear archivos o proponer arquitectura en este paso.

### Paso 2: Despliegue de Preguntas Interactivas
1. **En Antigravity / Interfaces con soporte de selector UI**:
   - Invoca la herramienta `ask_question` para renderizar el modal interactivo con botones seleccionables. El usuario solo debe hacer clic en la opción deseada (A, B o C).
2. **En Terminal / Voz / Fallback de Texto**:
   - Renderiza las 2 preguntas con opciones A/B/C claras y legibles:

```markdown
### 🎯 Aclaración de Intención

1. **[Pregunta sobre el flujo o funcionalidad principal]**
   - **A)** [Opción concreta 1 - Recomendada]
   - **B)** [Opción concreta 2]
   - **C)** [Opción concreta 3 / Personalizada]

2. **[Pregunta sobre estética o experiencia de uso]**
   - **A)** [ej: Minimalista y limpio]
   - **B)** [ej: Moderno y oscuro / Slate Dark]
   - **C)** [ej: Colorido y dinámico]
```

Si el perfil activo es `VOICE_DICTATION`, acepta respuestas dictadas en cualquier formato (*"la A"*, *"1A 2B"*, *"la primera"*) sin pedir reformulación.

### Paso 3: Emitir y Sellar el `IntentContract`
Una vez seleccionada la opción, sella inmediatamente el contrato con SHA-256:

```bash
node tools/intent_clarifier.js seal --request "<solicitud>" --selected "<opciones>"
```

### Paso 4: Contrato de Intención Acordado

```markdown
### 📜 Contrato de Intención Acordado (SHA-256 Sealed)
- **Objetivo**: [1 frase precisa]
- **Incluido**: [2-3 elementos que sí se construyen]
- **Excluido**: [lo que queda fuera de esta iteración]
- **Digest**: [hash SHA-256 del contrato]
```

Procede inmediatamente a la ejecución en bucle cerrado (`/drive`).
