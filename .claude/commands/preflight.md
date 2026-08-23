---
name: preflight
description: Clasifica el riesgo de un comando de terminal antes de ejecutarlo. Veredictos ALLOW / NEEDS_HUMAN_REVIEW / DENY.
---

# /preflight — Clasificador Léxico de Riesgo (Axion Protocol)

> **PROPÓSITO**: Ningún comando toca la terminal sin clasificarse antes. La clasificación nunca ejecuta la entrada.

---

## 📋 Protocolo de Ejecución

1. **Clasificar el comando**:
   ```bash
   node tools/preflight.js "<comando>"
   ```
   Para un comando estructurado (la única vía que puede alcanzar `ALLOW`):
   ```bash
   node tools/preflight.js --json "{\"executable\":\"git\",\"args\":[\"status\"],\"cwd\":\".\",\"shell\":false}"
   ```

2. **Leer el veredicto tal cual lo emite la herramienta**. Son exactamente estos tres,
   y hay que reportarlos con su nombre real, sin traducirlos a `PASS`/`BLOCKED`:

   | Veredicto | Exit code | Qué significa | Qué hacer |
   |---|---|---|---|
   | `ALLOW` | 0 | Comando estructurado, `shell:false`, en la allowlist. | Ejecutar. |
   | `NEEDS_HUMAN_REVIEW` | 2 | Cadena de shell cruda: no se puede probar qué ejecutaría. | Pedir confirmación humana explícita. |
   | `DENY` | 1 | Destructivo o sintaxis prohibida (`rm -rf /`, `mkfs`, `dd of=/dev/…`, pipe a `sh`). | Detenerse. No reintentar con variantes. |

3. **Regla que no se negocia**: una cadena de shell cruda **nunca** obtiene `ALLOW`.
   Lo máximo a lo que aspira es `NEEDS_HUMAN_REVIEW`. Si necesitas `ALLOW`, reformula
   el comando como `{ executable, args, cwd, shell: false }`.

---

## 🔗 Dónde se aplica realmente

- **Automáticamente**, en cada llamada a herramienta de terminal, vía el hook
  `PreToolUse` (`.agents/hooks/validate-tool-call.mjs`), que además bloquea todo si
  existe `.axion/HALT`.
- **Manualmente**, con este comando, cuando quieras clasificar antes de proponer.

La clasificación es léxica: analiza la forma del comando, no su intención. No sustituye
al juicio humano ni a los permisos del entorno.
