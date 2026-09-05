---
description: Memoria persistente del proyecto y anclaje de contexto anti-deriva entre sesiones (absorbe /remember y /compact).
---

# /memory — Memoria Persistente y Anclaje de Contexto (Axion Protocol)

> **PROPÓSITO**: Preservar decisiones clave, convenciones, límites y correcciones entre sesiones en `.agents/memory/` y `.axion/memory/`, evitando que el usuario tenga que repetir instrucciones y anclando el contexto contra el fenómeno "lost-in-the-middle".

---

## 🛑 Cuándo se Activa

- Cuando el usuario establece una preferencia, regla o límite duradero.
- Cuando una sesión se alarga y el contexto necesita anclarse contra degradación (`/memory anchor` o `/memory compact`).
- Invocación explícita mediante `/memory add [tipo] [texto]` o `/memory list`.

---

## 📋 Modos de Uso

### 1. Guardar una Decisión o Regla Persistente
Los 4 tipos válidos son: `decision`, `convencion`, `limite`, `correccion`.
```bash
node tools/memory.js add decision "Usamos Tailwind CSS v4 para estilos globales"
node tools/memory.js add limite "Nunca modificar los manifiestos criptográficos históricos"
```

### 2. Consultar la Memoria Activa
```bash
node tools/memory.js list
```

### 3. Anclar Contexto contra Deriva de Gobernanza
```bash
node tools/context_shield.js anchor
```
Reinyecta las reglas P0 al final de la ventana de contexto para mantener la gobernanza activa y fail-closed.

---

## ⚖️ Veredictos del Motor

- `MEMORIA_GUARDADA` — la entrada se persistió y será recuperable en sesiones futuras.
- `MEMORIA_CONSULTADA` — lista de entradas activas devuelta sin ambigüedad.
- `TIPO_INVALIDO` — el tipo no es `decision|convencion|limite|correccion`: rechazado.
- `ANCLA_APLICADA` — las reglas P0 se reinyectaron al final del contexto (anti lost-in-the-middle).
