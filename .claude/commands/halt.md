---
name: halt
description: Parada de emergencia inmediata (killswitch). Bloquea toda llamada a herramienta en modo fail-closed.
---

# /halt — Parada de Emergencia (Axion Protocol)

> **PROPÓSITO**: Poder decir *"para todo, ahora"* y que se pare, sin negociación.

---

## 📋 Protocolo de Ejecución

1. **Registrar el motivo y detener**:
   ```bash
   node tools/killswitch.js halt "<motivo de la parada>"
   ```
   O bien: `axion halt "<motivo>"`

2. **Leer bien el código de salida.** `halt` termina con **1**, y eso es el éxito: el
   código refleja el estado del sistema, no el del comando. `0` significa "adelante" y
   tras una parada no se puede seguir adelante. Reportarlo como fallo sería un error de
   lectura, no una avería.

   | Comando | Exit | Significado |
   |---|---|---|
   | `killswitch.js halt "<motivo>"` | 1 | Parada registrada y activa. |
   | `killswitch.js status` | 1 | Hay una parada activa (`HALTED`). |
   | `killswitch.js status` | 0 | Sistema operativo (`RUNNING`). |

3. **Confirmar al usuario** que el centinela `.axion/HALT` está activo y qué motivo quedó registrado.

---

## 🔒 Alcance real del bloqueo

Con `.axion/HALT` presente:

- El hook `PreToolUse` rechaza **toda** llamada a herramienta de terminal antes de clasificarla.
- `tools/workflow_runner.js` bloquea cualquier misión en la Fase 0, antes de `ENTENDER`.

**Asimetría deliberada**: parar es barato y no exige firma. Reanudar es un acto humano
explícito (`/unhalt`). Ante la duda, se considera detenido: un centinela ilegible o
corrupto se interpreta como parada, no como vía libre.

**Límite declarado**: esto detiene automatismos, no adversarios. Quien tenga permiso de
escritura sobre `.axion/` puede borrar el centinela. Protege del caso real y frecuente
—un agente que se desboca— no del ejecutor hostil.
