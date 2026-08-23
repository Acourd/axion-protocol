---
name: onboard
description: Comprensión, reconocimiento de dependencias e indexación inicial del contexto de un proyecto.
---

# /onboard — Reconocimiento y Comprensión del Proyecto (Axion Protocol)

> **PROPÓSITO**: Analizar un repositorio nuevo o existente, extraer su arquitectura, stack y puntos de entrada, y registrar la memoria base sin sobreescribir configuraciones previas.

---

## 📋 Protocolo de Ejecución

1. **Escaneo de Fuentes de Verdad**:
   - Detecta stack (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.).
   - Identifica puntos de entrada (`main`, `index`, `src/`).
   - Revisa si existen reglas preexistentes (`.agents/`, `CLAUDE.md`, `.cursorrules`).

2. **Informe de Síntesis de Contexto**:
   - **Propósito**: Qué hace el proyecto en 1 frase.
   - **Arquitectura**: Componentes clave y flujo de datos.
   - **Límites / NO TOCAR**: Zonas críticas protegidas.
   - **Siguiente Acción**: Tarea inmediata recomendada para el usuario.
