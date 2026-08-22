---
name: rollback
description: Revierte los cambios de código y archivos al último estado verificado mediante snapshots SHA-256 sin requerir comandos de Git.
---

# /rollback — Reversión Determinista de Código (Axion Protocol)

Este comando restaura los archivos modificados en el disco al último estado seguro y verificado, diferenciándose de `/rewind` (que solo borra el historial de chat).

## Protocolo de Ejecución

1. **Localizar el último plan de reversión**:
   - Inspecciona los registros de evidencia en `.axion/` o `tools/rollback_plan.js`.

2. **Ejecutar la restauración**:
   - Valida el hash SHA-256 del snapshot previo.
   - Restaura los archivos modificados a su contenido original antes de la misión actual.
   - Ejecuta:
     ```bash
     node tools/rollback_plan.js --execute
     ```

3. **Confirmación al Usuario**:
   - Informa en lenguaje claro qué archivos específicos fueron restaurados y confirma que el entorno volvió al estado íntegro y funcional.
