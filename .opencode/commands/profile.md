---
name: profile
description: Calibra y persiste el perfil del usuario en 5 dimensiones (profundidad técnica, entrada, entorno, cadencia y autonomía creativa).
---

# /profile — Sintonización del Flujo de Trabajo (Axion Protocol)

> **PROPÓSITO**: Ajustar en menos de un minuto el ritmo, el tono y la autonomía del
> agente. Se persiste, así que se responde una vez y no en cada sesión.

---

## 🛑 Cuándo se Activa

- Primera sesión con un usuario nuevo o sin perfil en `.axion/PROFILE.json`.
- Cuando el usuario expresa fricción: demasiada jerga, demasiada autonomía, formato equivocado.
- Cambio de entorno de trabajo (voz ↔ teclado, IDE ↔ terminal).
- Invocación explícita mediante `/profile` o `/profile set 1A 2B ...`.

---

## 📋 Diagnóstico Conversacional (5 preguntas)

```markdown
### 👤 Sintonización de Perfil

Responde con tus opciones (ej: `1A 2A 3B 4C 5B`):

1. **Nivel de Enfoque Técnico**
   - **A) Visionario / Creador No Técnico** — producto, negocio y experiencia; cero jerga.
   - **B) Constructor Intermedio** — balance entre arquitectura y producto.
   - **C) Ingeniero Senior** — contratos de bajo nivel y análisis de seguridad.

2. **Método de Interacción**
   - **A) Dictado por voz** — el agente filtra pausas y sintetiza ideas habladas.
   - **B) Texto por teclado** — instrucciones breves y al grano.

3. **Entorno de Trabajo**
   - **A) IDE visual** (Antigravity, Cursor, VS Code) — cero terminal, foco en diffs.
   - **B) Terminal pura** (agy, Claude Code) — velocidad de comandos y preflight directo.

4. **Cadencia de Entrega**
   - **A) Bloque Completo** — la función entera de un tirón, para probarla de golpe.
   - **B) Micro-Pasos** — componente a componente, con feedback tras cada paso.
   - **C) Híbrida Adaptable** — micro-pasos en lo delicado, bloque completo en lo claro.

5. **Autonomía Creativa y de Diseño**
   - **A) Autonomía Alta (Anti-Slop)** — el agente propone paleta, tipografía y estética.
   - **B) Dirección Guiada** — consulta y sigue tu dirección visual antes de aplicar estilos.
```

---

## 💻 Ejecución por Herramienta

```bash
node tools/profile_adapter.js set 1A 2A 3B 4C 5B
```
Acepta también el formato pegado `1A2A3B4C5B`, porque quien dicta rara vez separa las
respuestas igual dos veces. Consultar el perfil activo: `node tools/profile_adapter.js`

La escritura es **fusión, no reemplazo**: responder unas preguntas no borra los matices
del perfil que el cuestionario no sabe expresar. Puedes calibrar una sola dimensión
(`set 4B`) sin tocar las otras cuatro.

---

## ⚖️ Veredictos del Motor

- `PERFIL_CALIBRADO` — el perfil activo se ajusta al usuario y se persiste.
- `PERFIL_PARCIAL` — solo una o algunas dimensiones definidas; el resto con el valor de fábrica.
- `PERFIL_INVALIDO` — opción fuera del rango (ej. `1Z`): rechazada, se indica la corrección.
- `SIN_PERFIL` — no existe `.axion/PROFILE.json`: rige el de fábrica hasta calibrar.

---

## 📤 Confirmación

Emite una ficha con el perfil activo y **qué cambia en la práctica**: si es `VISIONARY`,
cero jerga; si es `VOICE_DICTATION`, tolerancia a respuestas habladas; si es
`GUIDED_DIRECTION`, consultar antes de aplicar estilos. Un perfil que no cambia el
comportamiento observable es un fichero de configuración decorativo.