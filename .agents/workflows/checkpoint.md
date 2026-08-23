---
name: checkpoint
description: Crea un punto de control / snapshot SHA-256 explícito con etiqueta antes de una operación delicada.
---

# /checkpoint — Punto de Control Explícito (Axion Protocol)

> **PROPÓSITO**: Congelar y sellar el estado actual del disco con un hash SHA-256 verificable antes de realizar cambios de alto riesgo.

---

## 📋 Protocolo de Ejecución

1. **Captura de Snapshot**:
   - Registra el estado de todos los archivos del espacio de trabajo.
   - Emite el hash de verificación y lo asocia a una etiqueta descriptiva (ej. `checkpoint-pre-refactor-auth`).

2. **Garantía de Reversión**:
   - Si la siguiente operación falla o no convence, `/rollback` restaurará el proyecto exactamente a este punto de control.
