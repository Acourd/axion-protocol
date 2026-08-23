---
name: debug
description: Ciclo sistemático de depuración en 4 fases con análisis de causa raíz y verificación por evidencia.
---

# /debug — Depuración Sistemática con Evidencia (Axion Protocol)

> **PROPÓSITO**: Diagnosticar y reparar fallos complejos sin parches ciegos ni conjeturas, guiado por evidencia y reproducción determinista.

---

## 📋 Las 4 Fases de Depuración

1. **Reproducción**: Aislar el caso mínimo que detona el error con una prueba ejecutable.
2. **Causa Raíz**: Identificar el origen exacto del fallo en el código fuente (no el síntoma superficial).
3. **Corrección Atómica**: Aplicar el cambio mínimo que soluciona la causa raíz sin efectos secundarios.
4. **Verificación**: Ejecutar la prueba y comprobar que pasa en verde (PASS).
