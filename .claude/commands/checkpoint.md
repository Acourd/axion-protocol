---
name: checkpoint
description: Sella un punto de control verificable con SHA-256 antes de una operación delicada, para que /rollback pueda deshacerla.
---

# /checkpoint — Punto de Control Explícito (Axion Protocol)

> **PROPÓSITO**: Crear la red antes del salto. Sin checkpoint previo, `/rollback` no
> tiene a dónde volver.

---

## 📋 Protocolo de Ejecución

1. **Sellar el estado actual**:
   ```bash
   node tools/checkpoint.js create <etiqueta-descriptiva>
   ```
   O bien: `axion checkpoint create pre-refactor-auth`

   El snapshot guarda **el contenido** de cada archivo, no solo su huella, junto a su
   `sha256`. Se excluyen `.git`, `node_modules`, `.axion`, `scratch` y directorios de
   build; se omiten archivos de más de 5 MB y se informa de cuáles.

2. **Reportar al usuario**: id del checkpoint, digest y número de archivos sellados.

3. **Auditar la red cuando haga falta** (no restaura nada):
   ```bash
   node tools/checkpoint.js verify latest
   node tools/checkpoint.js list
   ```

---

## 🕐 Cuándo sellar

Antes de: refactors amplios, migraciones, cambios de esquema, borrados masivos,
actualizaciones de dependencias, o cualquier paso que el usuario califique de arriesgado.

Los puntos marcados `[red]` en `list` son redes de seguridad automáticas que crea
`/rollback`. Quedan fuera de `latest` a propósito: si contaran, un segundo `/rollback`
devolvería justo el estado que se acababa de deshacer.
