---
name: profile
description: Calibra la experiencia comunicativa y el nivel de tecnicismo de la IA según el perfil del usuario.
---

# /profile — Adaptador de Perfil y Comunicación (Axion Protocol)

> **PROPÓSITO**: Ajustar dinámicamente la verbosidad, el tono y el nivel técnico de las respuestas de la IA para que la experiencia sea cómoda y sin saturación.

---

## 📋 Protocolo de Diagnóstico Rápido (30 Segundos)

Formula al usuario una única pregunta sencilla con 3 perfiles claros:

```markdown
### 👤 ¿Qué perfil de comunicación prefieres para esta sesión?

Elige una opción para calibrar mis explicaciones:

- **A) Visionario / Creador No Técnico**: Respuestas directas al grano, opciones simples, cero tecnicismos aburridos.
- **B) Constructor Intermedio**: Enfoque práctico, diseño de producto, explicaciones equilibradas.
- **C) Ingeniero Senior**: Profundidad técnica, detalles de bajo nivel y contratos formales.
```

---

## ⚙️ Registro y Persistencia

Una vez que el usuario responde (ej. *"A"*):
1. Ejecuta:
   ```bash
   node tools/profile_adapter.js visionary
   ```
   *(o `builder` / `engineer` según la elección).*
2. Guarda la preferencia en `.axion/PROFILE.json` para que todas las futuras respuestas adopten automáticamente ese nivel de concisión y lenguaje.
