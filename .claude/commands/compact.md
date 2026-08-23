---
name: compact
description: Compacta el contexto y sella un ancla de estado que devuelve las reglas P0 al final de la ventana, contra el 'lost-in-the-middle'.
---

# /compact — Escudo de Contexto (Axion Protocol)

> **PROPÓSITO**: En conversaciones largas el modelo deja de atender al centro de su
> ventana. Lo primero que se difumina son las reglas P0, porque se dijeron al principio.

---

## 📋 Protocolo de Ejecución

1. **Sellar el ancla**:
   ```bash
   node tools/context_shield.js
   ```
   O bien: `axion compact`

   Produce `.axion/state/ANCHOR.md` — corto a propósito — con el perfil activo, el
   estado de gobernanza, el último punto de control y los invariantes P0 vigentes.
   El digest cubre el **contenido** de reglas, workflows, `CLAUDE.md` y perfil, así que
   cambia exactamente cuando cambia algo que altera el comportamiento del agente.

2. **Releer el ancla** después de compactar. Esa relectura es el mecanismo: devuelve las
   reglas al final de la ventana, que es donde el modelo sí las atiende.

3. **Descartar del hilo** salidas de terminal ya consumidas y diffs ya aplicados,
   conservando el `IntentContract` activo y las decisiones tomadas.

---

## ⚠️ Alcance honesto

Esta herramienta **no** borra el historial de la conversación: eso vive en el host, no
en el repositorio. Lo que hace es producir el ancla y purgar sus propios snapshots
antiguos (conserva los 10 últimos). Reportarlo como "contexto purgado" sería falso.
