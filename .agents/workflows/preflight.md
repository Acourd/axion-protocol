---
name: preflight
description: Inspecciona léxicamente y clasifica el nivel de riesgo de comandos de terminal antes de su ejecución.
---

# /preflight — Guardarraíl Léxico y Clasificador de Riesgo (Axion Protocol)

Este comando inspecciona cualquier comando o script antes de que toque la terminal, bloqueando comandos destructivos o de sintaxis ambigua.

## Protocolo de Ejecución

1. **Inspección de Sintaxis y Clasificación**:
   - Analiza el comando propuesto contra las políticas de seguridad (`policies/risk.yaml`).
   - Bloquea construcciones peligrosas: `rm -rf /`, `mkfs`, pipes a `sh`/`bash`, redirecciones destructivas o variables no sanitizadas.
   - Requiere obligatoriamente comandos estructurados con `{ executable, args, shell: false }`.

2. **Ejecución del Validador**:
   - Ejecuta:
     ```bash
     node tools/preflight.js "<comando_o_payload_json>"
     ```

3. **Veredictos**:
   - **`PASS`**: El comando es seguro y puede ejecutarse directamente.
   - **`NEEDS_HUMAN_REVIEW`**: El comando tiene riesgo medio/alto y requiere confirmación explícita del usuario.
   - **`BLOCKED`**: El comando está prohibido por violar los límites de seguridad. Se detiene la ejecución inmediatamente.
