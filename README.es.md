# 🛡️ Axion Protocol

> **El arnés de gobernanza Zero-Bloat para agentes de Inteligencia Artificial.**  
> *Ejecución Fail-Closed, cristalización de intención, reversión instantánea y atestaciones criptográficas.*
> 
> **Estado**: Runtime EXPERIMENTAL. El enforcement no intercepta automáticamente los comandos de shell del sistema operativo sin el hook integrado del agente. Requiere **Node.js 20** o superior.

[![CI Passing](https://img.shields.io/badge/CI-Passing-brightgreen.svg)](https://github.com/Acourd/axion-protocol/actions)
[![Licencia: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Cero Dependencias](https://img.shields.io/badge/Dependencias-0-success.svg)](package.json)
[![Peso del Paquete](https://img.shields.io/badge/Tama%C3%B1o-118_kB-informational.svg)](package.json)

---

## ⚡ ¿Qué es Axion Protocol?

Los agentes de programación (Antigravity, Claude Code, Cursor) son potentes, pero propensos al **"vibecoding" descontrolado**: asumir requisitos sin preguntar, ejecutar comandos destructivos en la terminal y alucinar cambios arquitectónicos.

**Axion Protocol** es un arnés de gobernanza local y transparente (118 kB, 0 dependencias externas) que impone un ciclo de vida determinista de **7 fases fail-closed** antes de tocar el código fuente:

```text
ENTENDER ──► PLANIFICAR ──► GATE ──► TEST ──► CONSTRUIR ──► AUDITAR ──► PROMOVER
(Intención)   (Riesgo)      (Firma)  (TDD)    (Preflight)   (Evidencia) (Reporte)
```

---

## 🚀 Inicio Rápido

Requiere **Node.js 20+**. Cero dependencias: solo módulos integrados de Node.

### Como plugin de Claude Code

```bash
/plugin marketplace add Acourd/axion-protocol
/plugin install axion-protocol
```

Los 14 comandos y la puerta `PreToolUse` quedan disponibles al instante.

### Como paquete npm (Antigravity, Cursor, VS Code, Codex, CI)

```bash
# Inyecta la gobernanza en el proyecto actual
npx axion-protocol init

# Comprueba que llegó de verdad
npx axion check
```

`init` escribe en `.agents/` (Antigravity), `.claude/` (Claude Code), `tools/`,
`policies/` y `schemas/`. Nunca sobrescribe sin respaldo SHA-256, se niega a anunciar
éxito sobre un paquete incompleto, y si ya tienes un `.claude/settings.json` no lo toca:
te dice qué añadirle.

---

## 🎮 Slash Commands Esenciales

Diseñados para coexistir **sin colisiones** con Antigravity, Claude Code y AG-Kit:

| Comando | Propósito | Cuándo usarlo |
| :--- | :--- | :--- |
| **`/clarify`** | Freno socrático: exactamente 2 preguntas humanas con opciones A/B/C. | Antes de planificar, ante peticiones difusas. |
| **`/profile`** | Calibra 5 dimensiones (profundidad, entrada, entorno, cadencia, autonomía) y las persiste. | Una vez por proyecto; ajústalo cuando quieras. |
| **`/onboard`** | Indexa un repositorio: stack, puntos de entrada, cómo se prueba, qué no tocar. | Primer contacto con un código ajeno. |
| **`/checkpoint`** | Sella un snapshot del árbol verificable con SHA-256. | Antes de refactors, migraciones o borrados masivos. |
| **`/rollback`** | Restaura el último punto de control. Verifica el manifiesto entero antes de escribir y sella antes una red. | «Deshaz eso» — en cualquier idioma. |
| **`/preflight`** | Clasificador léxico de riesgo. `ALLOW` / `NEEDS_HUMAN_REVIEW` / `DENY`. | Automáticamente, antes de cada comando. |
| **`/verify`** | Verificación determinista por ejecución. Exit code 0 o no funcionaba. | Antes de afirmar que algo funciona. |
| **`/debug`** | Cuatro fases: reproducir, causa raíz, corrección atómica, verificar. Sin parches ciegos. | Cuando algo falla. |
| **`/review`** | Cuatro lentes (técnica, funcional, UX, arquitectura) con escala de severidad. | Antes de fusionar o promover. |
| **`/compact`** | Sella un ancla corta que devuelve las reglas P0 al final de la ventana. | Sesiones largas, contra el 'lost-in-the-middle'. |
| **`/remember`** | Memoria persistente: decisiones, convenciones, límites y correcciones. | Para no tener que repetirte nunca. |
| **`/halt`** | Parada de emergencia. Bloquea toda llamada a herramienta, fail-closed. | Para congelar un agente desbocado, ya. |
| **`/unhalt`** | Levantamiento humano y deliberado de la parada. | Para reanudar la ejecución segura. |
| **`/attest`** | in-toto Statement v1 en sobre DSSE, verificable con cosign. | Al completar una misión certificada. |

---

## 🌟 Características Clave para Creadores y Equipos

* 💬 **Freno Socrático de Intención**: La IA tiene prohibido modificar código ante peticiones ambiguas hasta que tú elijas entre opciones humanas (A/B/C).
* ⏪ **Rollback en Lenguaje Natural**: Di simplemente *"no me gustó, deshazlo"* o *"reviértelo"*, y Axion restaura el snapshot SHA-256 exacto sin tocar Git.
* 🛡️ **Riesgo Discreto en la Planificación**: Sin spam innecesario en tareas simples. Las advertencias de riesgo aparecen únicamente durante la planificación de acciones destructivas.
* 🔐 **Firmas Ed25519 y Atestaciones in-toto**: Nonces criptográficos de un solo uso y sobres DSSE compatibles con SLSA, Cosign y GitHub Attestations.
* 🌐 **Reportes Ejecutivos Políglotas**: Resúmenes finales de misión entregados en tu idioma con objetivos cumplidos, pruebas superadas y evidencia SHA-256.

---

## 🧪 Verificación y Suite de Pruebas

Axion Protocol incluye **42 suites de prueba deterministas** listas para ejecutarse sin dependencias externas:

```bash
# Ejecutar las 42 suites de prueba
node tests/run_all.js
```

---

## 📚 Documentación y Arquitectura

* 📖 **[Modelo de Amenazas y Arquitectura](docs/threat_model.md)** — Límites de seguridad y máquina de estados fail-closed.
* 📜 **[Historial de Cambios](CHANGELOG.md)** — Notas de la versión `v1.1.0-alpha`.
* 📄 **[Licencia Apache 2.0](LICENSE)** — Código abierto, 100% local y sin telemetría.
