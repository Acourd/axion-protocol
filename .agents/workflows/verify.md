---
name: verify
description: Bucle de verificación determinista mediante ejecución real de pruebas con código de salida 0.
---

# /verify — Verificación Determinista por Ejecución (Axion Protocol)

> **PROPÓSITO**: Garantizar que el código realmente funciona ejecutando las suites de prueba reales antes de dar por concluida cualquier tarea.

---

## 📋 Protocolo de Ejecución

1. **Ejecución Real**:
   - Corre el verificador determinista:
     ```bash
     node tools/verify_changes.js
     ```

2. **Criterio Estricto**:
   - `PASS`: Exit code 0 verificado. La tarea se aprueba con evidencia.
   - `FAIL`: Exit code distinto de 0. La IA tiene estrictamente prohibido afirmar que el cambio funciona hasta resolver el fallo con `/debug`.
