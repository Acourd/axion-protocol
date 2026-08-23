---
name: unhalt
description: Retira la parada de emergencia mediante autorización humana deliberada y reanuda el sistema.
---

# /unhalt — Levantamiento de la Parada (Axion Protocol)

> **PROPÓSITO**: Reanudar es un acto humano consciente, nunca una decisión del runtime.

---

## 📋 Protocolo de Ejecución

1. **Confirmar con la persona** que la causa de la parada está resuelta. Si no hay
   confirmación explícita, no se levanta: el orquestador jamás se reanuda solo.

2. **Retirar el centinela**:
   ```bash
   node tools/killswitch.js resume
   ```
   O bien: `axion resume` (alias: `axion unhalt`)

3. **Verificar el estado**:
   ```bash
   node tools/killswitch.js status
   ```
   Debe reportar `RUNNING` y salir con **0**. Si sale con 1 sigue habiendo parada
   (`HALTED` o `HALT_STATE_UNREADABLE`): informa del problema y **no** continúes con la
   misión. Aquí el código de salida sí es directo, porque reanudar y "poder seguir"
   coinciden.
