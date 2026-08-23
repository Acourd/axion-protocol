---
name: review
description: Auditoría de código selectiva por 4 Lentes (Técnica, Funcional, UX/Producto, Arquitectónica) con evidencia ejecutable.
---

# /review — Validación Selectiva por 4 Lentes (Axion Protocol)

> **PROPÓSITO**: Auditar cambios de código sin ruido superficial, aplicando únicamente las lentes relevantes al tipo de cambio.

---

## 🔍 Las 4 Lentes de Validación

1. **Lente Técnica**: Correctitud sintáctica, tipado, manejo de errores, seguridad y suites de prueba.
2. **Lente Funcional**: Cumplimiento del `IntentContract`, comportamiento esperado y casos límite (*edge cases*).
3. **Lente UX / Producto**: Claridad, accesibilidad (a11y), fricción del usuario y experiencia visual.
4. **Lente Arquitectónica**: Acoplamiento, límites modulares, dependencias y consecuencias en el rendimiento.

---

## 📋 Protocolo de Ejecución

1. **Inspección del Diff**: Analiza los archivos modificados en la última iteración.
2. **Selección de Lentes**: Aplica solo las lentes pertinentes (ej: un refactor de backend no requiere lente de UX).
3. **Veredicto**:
   - `PASS`: Emite resumen conciso con las pruebas superadas.
   - `BRECHAS`: Lista priorizada indicando Lente, Severidad, Archivo/Línea y Corrección mínima recomendada.
