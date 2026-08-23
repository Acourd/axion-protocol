---
name: compact
description: Compacta el contexto de la sesión, purga logs redundantes y sella un snapshot de estado persistente.
---

# /compact — Escudo de Compactación de Contexto (Axion Protocol)

> **PROPÓSITO**: Prevenir la degradación cognitiva y el 'lost-in-the-middle' en conversaciones largas, anclando el estado a un snapshot SHA-256 limpio.

---

## 📋 Protocolo de Ejecución

1. **Purga de Salidas Redundantes**:
   - Descarta salidas intermedias de terminales pasadas y diferencias ya aplicadas.

2. **Sellado de Estado**:
   - Ejecuta:
     ```bash
     node tools/context_shield.js
     ```
   - Registra el hash del estado actual en `.axion/state/`.

3. **Reanudación Limpia**:
   - La IA reanuda con el contrato activo y las reglas P0 al 100% de atención sin consumir tokens innecesarios.
