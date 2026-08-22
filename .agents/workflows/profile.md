---
name: profile
description: Calibra la experiencia personalizada del usuario en 5 dimensiones (Perfil técnico, Voz vs Teclado, Entorno, Cadencia y Autonomía visual).
---

# /profile — Sintonización Personalizada del Flujo de Trabajo (Axion Protocol)

> **PROPÓSITO**: Configurar en menos de 1 minuto cómo interactúas con la IA para que el ritmo, el tono y la autonomía se adapten exactamente a tu estilo de trabajo.

---

## 📋 Diagnóstico Conversacional (5 Preguntas Rápidas)

Presenta estas 5 preguntas directas al usuario:

```markdown
### 👤 Sintonización de Perfil y Estilo de Trabajo

Para calibrar nuestra dinámica exactamente a tu medida, responde con tus opciones (ej: `1A, 2A, 3A, 4A, 5A`):

1. **Nivel de Enfoque Técnico**:
   - **A) Visionario / Creador No Técnico**: Foco en producto, negocio y experiencia de usuario; cero jerga técnica.
   - **B) Constructor Intermedio**: Balance práctico entre arquitectura y producto.
   - **C) Ingeniero Senior**: Detalles técnicos profundos, contratos de bajo nivel y análisis de seguridad.

2. **Método de Interacción Principal**:
   - **A) Dictado por voz / Mensajes hablados fluidos**: La IA filtra pausas y sintetiza tus ideas habladas.
   - **B) Texto directo por teclado**: Instrucciones escritas breves y al grano.

3. **Entorno de Trabajo**:
   - **A) Interfaz visual / IDE (Antigravity IDE, Cursor, VS Code)**: Cero terminal, foco en vistas y diffs visuales.
   - **B) Terminal pura / CLI (Antigravity agy, Claude Code)**: Velocidad de comandos y preflight directo.

4. **Cadencia de Entrega**:
   - **A) Bloque Completo**: Construye la pantalla o función entera de un tirón para probarla de golpe.
   - **B) Micro-Pasos**: Avanza componente por componente pidiendo feedback tras cada paso.

5. **Autonomía Creativa y de Diseño**:
   - **A) Autonomía Alta (Anti-Slop)**: La IA propone paletas modernas, tipografías y estética cuidada por su cuenta.
   - **B) Dirección Guiada**: La IA te consulta y sigue tu dirección visual exacta antes de aplicar estilos.
```

---

## ⚙️ Registro y Activación Automática

Una vez que el usuario responde:
1. Registra las 5 preferencias en `.axion/PROFILE.json` invocando `tools/profile_adapter.js`.
2. Emite una ficha de sintonización confirmando el perfil activo y las reglas que gobernará en adelante.
