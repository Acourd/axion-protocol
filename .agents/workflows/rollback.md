---
name: rollback
description: Restaura los archivos al último estado íntegro y verificado mediante snapshots SHA-256 ante comandos explícitos o peticiones en lenguaje natural.
---

# /rollback — Reversión Determinista de Código (Axion Protocol)

> **PROPÓSITO**: Reversión garantizada del código en disco ante anomalías o insatisfacción del usuario, sin requerir conocimientos de Git.

---

## 🛑 Disparadores

- Comando explícito: `/rollback` o `axion rollback`.
- Expresiones en lenguaje natural en cualquier idioma:
  - *"Deshaz lo que hiciste"* / *"Reviértelo"* / *"No me gustó"*
  - *"Undo changes"* / *"Rollback to previous state"* / *"Revert last step"*

---

## 📋 Protocolo de Ejecución

1. **PROHIBICIÓN**: Prohibido debatir, pedir confirmaciones complejas o solicitar comandos de terminal al usuario.
2. **Ejecutar la restauración**:
   - Invoca internamente el script de reversión:
     ```bash
     node tools/rollback_plan.js
     ```
3. **Respuesta al Usuario**:
   - Emite una confirmación clara en el idioma del usuario indicando qué archivos fueron recuperados:

```markdown
### ⏪ Reversión Completada con Éxito
- **Estado**: Restaurado al último snapshot verificado.
- **Archivos Restaurados**:
  - `[archivo_1]`
  - `[archivo_2]`
- **Resultado**: El entorno ha vuelto a su estado funcional previo.
```
