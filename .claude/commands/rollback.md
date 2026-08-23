---
name: rollback
description: Restaura el árbol al último punto de control verificado con SHA-256, ante un comando explícito o una petición en lenguaje natural.
---

# /rollback — Reversión Determinista (Axion Protocol)

> **PROPÓSITO**: Deshacer sin que el usuario necesite saber Git. Verificado antes de
> escribir, y reversible a su vez.

---

## 🛑 Disparadores

- Comando explícito: `/rollback` o `axion rollback`.
- Lenguaje natural en cualquier idioma: *"deshaz lo que hiciste"*, *"reviértelo"*,
  *"no me gustó"*, *"undo changes"*, *"vuelve atrás"*.

---

## 📋 Protocolo de Ejecución

1. **PROHIBIDO** debatir, pedir confirmaciones complejas o exigir que el usuario escriba
   comandos. Si pidió deshacer, se deshace.

2. **Restaurar**:
   ```bash
   node tools/checkpoint.js restore latest
   ```
   O bien: `axion rollback latest` · a un punto concreto: `axion rollback <id-o-etiqueta>`

   Garantías del motor:
   - Verifica el manifiesto **entero** antes de escribir nada. Si un solo hash no cuadra,
     no restaura ninguno: una reversión a medias deja un estado que nadie ha revisado.
   - Crea automáticamente un punto de control previo, así que deshacer también se deshace.
   - Los archivos creados **después** del checkpoint se informan pero **no** se borran.
     Para eliminarlos hay que pedirlo: `--prune`.

3. **Confirmar en el idioma del usuario**:

```markdown
### ⏪ Reversión Completada
- **Punto restaurado**: [id del checkpoint]
- **Archivos recuperados**: [lista]
- **Creados después y conservados**: [lista, si los hay]
- **Red de seguridad previa**: [id, por si esta reversión tampoco convence]
```

---

## ⚠️ Si no hay punto de control

`restore` sale con código 1 y `CHECKPOINT_MISSING`. **No inventes** que se ha revertido:
informa de que no había red, y propón `/checkpoint` antes del siguiente paso delicado.
