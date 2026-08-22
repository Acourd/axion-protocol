---
name: unhalt
description: Retira la parada de emergencia mediante autorización humana deliberada y reanuda el sistema.
---

# /unhalt — Levantamiento de Parada de Emergencia (Axion Protocol)

Este comando desactiva la parada de emergencia, permitiendo que el sistema vuelva a operar de forma normal.

## Protocolo de Ejecución

1. **Requerir confirmación humana**:
   - Levantar una parada es un acto humano consciente fuera del runtime automático.
   - Ejecuta:
     ```bash
     node tools/killswitch.js resume
     ```

2. **Verificación de Estado**:
   - Confirma que el centinela `.axion/HALT` fue removido.
   - Informa al usuario que el entorno está listo para recibir nuevas misiones de forma segura.
