---
name: clarify
description: Aclara peticiones ambiguas de usuarios no técnicos mediante exactamente 2 preguntas humanas estructuradas con opciones A/B/C antes de tocar código.
---

# /clarify — Aclarador de Intención Humana (Axion Protocol)

> **PROPÓSITO**: Freno cognitivo obligatorio antes de `/plan` para eliminar ambigüedades y evitar iteraciones perdidas.

---

## 🛑 Cuándo se Activa (Trigger)

- Solicitudes de alto nivel o difusas (*"hazme una app de reservas"*, *"crea un formulario de contacto"*, *"mejora la interfaz"*).
- Prompts con menos de 10 palabras o sin detalles de UX/datos.
- Solicitudes directas con el comando `/clarify`.

---

## 📋 Protocolo de Ejecución (Paso a Paso)

### Paso 1: Freno Inmediato
- **PROHIBIDO**: Escribir código, crear archivos o proponer arquitecturas técnicas complejas en este paso.

### Paso 2: Las 2 Preguntas Humanas
Formula **exactamente 2 preguntas** sin tecnicismos ni jerga de programación, cada una con **3 opciones concretas**:

```markdown
### 🎯 Aclaración de Intención (Paso 1 de 2)

Para asegurarme de construir exactamente lo que necesitas sin rodeos:

1. **[Pregunta sobre flujo o funcionalidad principal]**
   - **A)** [Opción común 1]
   - **B)** [Opción común 2]
   - **C)** [Opción común 3]

2. **[Pregunta sobre estética o experiencia de usuario]**
   - **A)** [Estilo visual 1, ej: Minimalista y limpio]
   - **B)** [Estilo visual 2, ej: Moderno y oscuro]
   - **C)** [Estilo visual 3, ej: Colorido y dinámico]
```

### Paso 3: Emisión del `IntentContract`
Una vez que el usuario responde (ej. *"1A y 2B"*), genera el contrato de entendimiento:

```markdown
### 📜 Contrato de Intención Acordado
- **Objetivo**: [Descripción en 1 frase clara]
- **Incluido**: [Lista de 2-3 elementos que sí se construirán]
- **Excluido**: [Lo que queda fuera de esta iteración para no sobre-complejizar]
```

### Paso 4: Siguiente Paso
Invoca internamente `node tools/intent_clarifier.js` y procede de inmediato a la fase de planificación (`/plan`).
