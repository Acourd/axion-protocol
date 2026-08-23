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

## 🚀 Inicio Rápido (10 Segundos)

Requiere **Node.js 20**+. Ejecuta directamente mediante `npx` o inyecta el protocolo en cualquier proyecto existente:

```bash
# Ejecutar CLI directamente
npx axion-protocol

# Inyectar reglas de gobernanza en tu proyecto actual
npx axion-protocol init
```

---

## 🎮 Slash Commands Esenciales

Diseñados para coexistir **sin colisiones** con Antigravity, Claude Code y AG-Kit:

| Comando | Propósito | Cuándo usarlo |
| :--- | :--- | :--- |
| **`/clarify`** | Cristaliza la intención socrática en 2 preguntas sencillas (A/B/C). | Antes de `/plan` o ante peticiones difusas. |
| **`/profile`** | Calibra el tono, voz, entorno y nivel de tecnicismo a tu medida. | Al iniciar sesión o en cualquier momento. |
| **`/rollback`** | Restaura el árbol al último punto de control verificado con SHA-256. Verifica el manifiesto entero antes de escribir y sella antes una red de seguridad. | Cuando quieras deshacer cambios con 1 frase. |
| **`/preflight`** | Validador sintáctico léxico y clasificador de riesgo (`shell: false`). | Automáticamente antes de ejecutar comandos. |
| **`/halt`** | Parada de emergencia inmediata que congela toda acción (*fail-closed*). | Si la IA intenta tocar zonas críticas. |
| **`/unhalt`** | Desbloqueo humano deliberado de la parada de emergencia. | Para reanudar la ejecución segura. |
| **`/attest`** | Genera evidencia formal **in-toto Statement v1 / DSSE**. | Al completar una misión certificada. |

---

## 🌟 Características Clave para Creadores y Equipos

* 💬 **Freno Socrático de Intención**: La IA tiene prohibido modificar código ante peticiones ambiguas hasta que tú elijas entre opciones humanas (A/B/C).
* ⏪ **Rollback en Lenguaje Natural**: Di simplemente *"no me gustó, deshazlo"* o *"reviértelo"*, y Axion restaura el snapshot SHA-256 exacto sin tocar Git.
* 🛡️ **Riesgo Discreto en la Planificación**: Sin spam innecesario en tareas simples. Las advertencias de riesgo aparecen únicamente durante la planificación de acciones destructivas.
* 🔐 **Firmas Ed25519 y Atestaciones in-toto**: Nonces criptográficos de un solo uso y sobres DSSE compatibles con SLSA, Cosign y GitHub Attestations.
* 🌐 **Reportes Ejecutivos Políglotas**: Resúmenes finales de misión entregados en tu idioma con objetivos cumplidos, pruebas superadas y evidencia SHA-256.

---

## 🧪 Verificación y Suite de Pruebas

Axion Protocol incluye **41 suites de prueba deterministas** listas para ejecutarse sin dependencias externas:

```bash
# Ejecutar las 41 suites de prueba
node tests/run_all.js
```

---

## 📚 Documentación y Arquitectura

* 📖 **[Modelo de Amenazas y Arquitectura](docs/threat_model.md)** — Límites de seguridad y máquina de estados fail-closed.
* 📜 **[Historial de Cambios](CHANGELOG.md)** — Notas de la versión `v1.1.0-alpha`.
* 📄 **[Licencia Apache 2.0](LICENSE)** — Código abierto, 100% local y sin telemetría.
