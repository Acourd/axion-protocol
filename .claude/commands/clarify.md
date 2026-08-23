---
name: clarify
description: Aclara peticiones ambiguas mediante exactamente 2 preguntas humanas con opciones A/B/C antes de tocar código.
---

# /clarify — Aclarador de Intención Humana (Axion Protocol)

> **PROPÓSITO**: Freno cognitivo obligatorio antes de planificar. Elimina la ambigüedad
> con dos preguntas, no con diez, porque un interrogatorio cansa más que una iteración perdida.

---

## 🛑 Cuándo se Activa

- Peticiones difusas: *"hazme una app de reservas"*, *"mejora la interfaz"*.
- Prompts de menos de 10 palabras o sin detalle de flujo, datos o estética.
- Invocación explícita de `/clarify`.

**No se activa** si la petición ya trae flujo y estética definidos: preguntar lo que ya
te han dicho es fricción, no gobernanza.

---

## 📋 Protocolo de Ejecución

### Paso 1: Freno Inmediato
**PROHIBIDO** escribir código, crear archivos o proponer arquitectura en este paso.

### Paso 2: Exactamente 2 Preguntas
Sin tecnicismos, cada una con 3 opciones concretas:

```markdown
### 🎯 Aclaración de Intención

1. **[Pregunta sobre el flujo o la funcionalidad principal]**
   - **A)** [Opción concreta 1]
   - **B)** [Opción concreta 2]
   - **C)** [Opción concreta 3]

2. **[Pregunta sobre estética o experiencia de uso]**
   - **A)** [ej: Minimalista y limpio]
   - **B)** [ej: Moderno y oscuro]
   - **C)** [ej: Colorido y dinámico]
```

Si el perfil activo es `VOICE_DICTATION`, acepta respuestas dictadas en cualquier forma
(*"la A y la B"*, *"1A 2B"*, *"uno a, dos be"*) sin pedir que se reformulen.

### Paso 3: Emitir el `IntentContract`

```markdown
### 📜 Contrato de Intención Acordado
- **Objetivo**: [1 frase]
- **Incluido**: [2-3 elementos que sí se construyen]
- **Excluido**: [lo que queda fuera de esta iteración]
```

### Paso 4: Registrar y Continuar
```bash
node tools/intent_clarifier.js "<la petición original del usuario>"
```
El argumento es obligatorio: sin él la herramienta solo imprime su modo de uso.
Después, procede a la fase de planificación.
