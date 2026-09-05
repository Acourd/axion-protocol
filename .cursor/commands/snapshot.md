---
description: Guarda y restaura puntos de control deterministas verificados con SHA-256 independientes de Git (absorbe /checkpoint y /rollback).
---

# /snapshot — Puntos de Control y Reversión Atómica (Axion Protocol)

> **PROPÓSITO**: Red de seguridad verificable. Guarda el contenido íntegro del árbol de archivos con manifiesto SHA-256 antes de operaciones críticas y permite restaurarlo al byte exacto si algo sale mal.

---

## 🛑 Cuándo se Activa

- Antes de refactorizaciones grandes, migraciones o ejecución autónoma con `/drive`.
- Cuando una serie de cambios falla y se desea volver al estado limpio anterior (`/snapshot restore`).
- Invocación explícita mediante `/snapshot create [etiqueta]` o `/snapshot restore [id]`.

---

## 📋 Modos de Uso

### 1. Crear un Snapshot de Resguardo
```bash
node tools/checkpoint.js create "pre-refactor-auth"
```
Guarda el contenido de cada archivo y emite un `checkpointId` SHA-256.

### 2. Listar Snapshots Existentes
```bash
node tools/checkpoint.js list
```

### 3. Restaurar al Último Snapshot Verificado (Rollback)
```bash
node tools/checkpoint.js restore latest
```
O especificando un ID concreto:
```bash
node tools/checkpoint.js restore <checkpointId>
```
*Garantía fail-closed:* Recalcula el SHA-256 de cada archivo guardado antes de escribir. Si un solo archivo no cuadra, no se restaura ninguno para evitar estados corruptos.
