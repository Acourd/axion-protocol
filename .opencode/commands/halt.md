---
name: halt
description: Parada de emergencia inmediata (killswitch) y reanudación deliberada en modo fail-closed (absorbe /unhalt).
---

# /halt — Killswitch de Emergencia y Control de Ejecución (Axion Protocol)

> **PROPÓSITO**: Parada de emergencia verificable en frío a nivel de sistema (`.axion/HALT`). Congela de inmediato toda llamada a herramientas destructivas y permite reanudar deliberadamente el trabajo cuando el entorno sea seguro.

---

## 🛑 Cuándo se Activa

- Cuando el agente entra en un bucle erróneo o toca archivos protegidos.
- Invocación explícita mediante `/halt [motivo]` para congelar el sistema.
- Invocación explícita mediante `/halt resume` (o `axion resume`) para reanudar el sistema tras la parada.

---

## 📋 Modos de Uso

### 1. Activar Parada de Emergencia
```bash
node tools/killswitch.js halt "Razón de la detención"
```
Crea el archivo `.axion/HALT`. A partir de este momento, el hook `PreToolUse` bloquea en modo fail-closed cualquier herramienta de terminal o escritura.

### 2. Consultar Estado de Parada
```bash
node tools/killswitch.js status
```

### 3. Reanudar el Sistema (Unhalt)
```bash
node tools/killswitch.js resume
```
Elimina `.axion/HALT` previa autorización explícita y devuelve el sistema a estado `RUNNING`.
