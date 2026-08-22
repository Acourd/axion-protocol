---
name: profile
description: Calibra de forma personalizada el entorno de trabajo, método de interacción (Voz vs Teclado) y conecta al usuario con las funciones clave de Axion Protocol.
---

# /profile — Sintonización Personalizada de Flujo de Trabajo (Axion Protocol)

> **PROPÓSITO**: Descubrir de manera natural cómo trabaja el usuario (entorno, voz, nivel de autonomía) para que la IA se adapte a su ritmo y le recomiende las mejores herramientas de Axion sin fricción.

---

## 📋 Diagnóstico Conversacional (2 Preguntas Prácticas)

Formula estas 2 preguntas contextuales al usuario:

```markdown
### 🎙️ Sintonización de Flujo de Trabajo

Para que nuestra dinámica sea lo más fluida y natural posible:

1. **¿Cómo sueles interactuar con la IA principalmente?**
   - **A) Dictado por voz / Mensajes hablados fluidos** *(filtro pausas y sintetizo tus ideas)*.
   - **B) Texto directo por teclado** *(instrucciones breves y al grano)*.

2. **¿Desde qué entorno operas habitualmente?**
   - **A) Interfaz visual / IDE (Antigravity IDE, Cursor, VS Code)** *(foco en código limpio y reversión visual sin terminal)*.
   - **B) Terminal pura / CLI (Antigravity agy, Claude Code)** *(foco en comandos rápidos y preflight automático)*.
```

---

## 🎯 Conexión Automática con Capacidades de Axion

Una vez recibida la respuesta:
1. **Si usa Voz (1A)**: La IA activa el *Modo Cristalización por Voz* (limpia muletillas, extrae la intención central y formula el contrato en 2 preguntas sencillas).
2. **Si usa IDE visual (2A)**: La IA activa el *Rollback Semántico en Lenguaje Natural* (*"deshazlo"*), evitando pedir comandos de Git o consola.
3. **Si usa CLI (2B)**: La IA activa el *Preflight en tiempo real* para supervisar cada comando de shell.
4. Guarda la configuración en `.axion/PROFILE.json` de forma transparente.
