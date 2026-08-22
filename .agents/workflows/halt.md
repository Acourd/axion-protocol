---
name: halt
description: Activa la parada de emergencia inmediata (Killswitch) bloqueando cualquier acción fail-closed.
---

# /halt — Parada de Emergencia (Axion Protocol)

Este comando detiene inmediatamente la ejecución de cualquier tarea o agente de IA en curso, bloqueando el sistema en modo *fail-closed*.

## Protocolo de Ejecución

1. **Registrar el motivo de la parada**:
   - Solicita o toma el motivo explícito de la detención.
   - Ejecuta:
     ```bash
     node tools/killswitch.js halt "<motivo_de_parada>"
     ```

2. **Efecto de Seguridad**:
   - Se crea el centinela inmutable `.axion/HALT`.
   - Cualquier intento posterior de ejecutar herramientas o comandos será rechazado con código de salida no-cero antes de la Fase 1.
