# 🛡️ Axion Protocol

> **El Arnés de Gobernanza Zero-Bloat para Agentes Autónomos de IA.**  
> *Ejecución Fail-Closed, cristalización de intención, rollback instantáneo y atestaciones de seguridad.*

[![CI Passing](https://img.shields.io/badge/CI-Passing-brightgreen.svg)](https://github.com/Acourd/axion-protocol/actions)
[![Licencia: Apache 2.0](https://img.shields.io/badge/Licencia-Apache%202.0-blue.svg)](LICENSE)
[![Cero Dependencias](https://img.shields.io/badge/Dependencias-0-success.svg)](package.json)
[![Tamaño Ligero](https://img.shields.io/badge/Tama%C3%B1o-118_kB-informational.svg)](package.json)

---

## ⚡ ¿Qué es Axion Protocol?

Los agentes de programación con IA (Antigravity, Claude Code, Cursor) son potentes, pero propensos al **"vibecoding" descontrolado**: suponer requisitos, ejecutar comandos destructivos en la terminal o inventar arquitecturas innecesarias.

**Axion Protocol** es un arnés de gobernanza local ultra-ligero (118 kB, 0 dependencias externas) que impone un **ciclo determinista de 7 fases fail-closed** antes de tocar una sola línea de código:

```text
ENTENDER ──► PLANIFICAR ──► GATE ──► TEST ──► CONSTRUIR ──► AUDITAR ──► PROMOVER
(Intención)   (Riesgo)      (Firma)  (TDD)    (Preflight)   (Evidencia) (Reporte)
```

---

## 🚀 Inicio Rápido (10 Segundos)

Ejecútalo directamente con `npx` o inyéctalo en cualquier proyecto existente:

```bash
# Ejecutar la CLI directamente
npx axion-protocol

# Inyectar las reglas de gobernanza en tu proyecto actual
npx axion-protocol init
```

---

## 🎮 Slash Commands Principales

Diseñados para una **sinergia sin colisiones** con Antigravity, Claude Code y AG-Kit:

| Comando | Propósito | Cuándo usarlo |
| :--- | :--- | :--- |
| **`/clarify`** | Cristaliza la intención socrática en 2 preguntas humanas (A/B/C). | Antes de `/plan` o ante órdenes vagas. |
| **`/profile`** | Adapta el tono, profundidad y concisión de la IA a tu perfil. | Al inicio de sesión o cuando lo desees. |
| **`/rollback`** | Restaura el código al último snapshot SHA-256 verificado. | Cuando quieras deshacer cambios en disco. |
| **`/preflight`** | Validador léxico de sintaxis y clasificador de riesgo (`shell: false`). | Automático antes de correr comandos. |
| **`/halt`** | Parada de emergencia inmediata que congela al agente (*fail-closed*). | Si el agente se desvía o comete errores. |
| **`/unhalt`** | Levantamiento humano justificado de la parada de emergencia. | Para reanudar el trabajo seguro. |
| **`/attest`** | Genera evidencias formales **in-toto Statement v1 / DSSE**. | Al finalizar y certificar una misión. |

---

## 🌟 Características Clave para Creadores y Equipos

* 💬 **Puerta Socrática Infranqueable**: La IA tiene prohibido modificar código ante peticiones ambiguas hasta que el usuario aclare su intención en 2 preguntas sencillas.
* ⏪ **Rollback Semántico en Lenguaje Natural**: Di *"deshaz lo que hiciste"* o *"reviértelo"*, y Axion restaura el estado exacto sin pedir comandos de Git.
* 🛡️ **Riesgo Discreto en Planificación**: Cero spam en tareas cotidianas. Las advertencias solo aparecen en la planificación de tareas de alto riesgo o destructivas.
* 🔐 **Criptografía Ed25519 y Sobres DSSE**: Nonces atómicos de un solo uso y atestaciones in-toto compatibles con SLSA, Cosign y GitHub.
* 🌐 **Reportes Ejecutivos Políglotas**: Resúmenes finales en tu idioma nativo con objetivo, archivos modificados, pruebas superadas y hash SHA-256.

---

## 🧪 Verificación y Suite de Pruebas

Axion Protocol incluye **38 suites de prueba deterministas** ejecutables al instante sin dependencias:

```bash
# Ejecutar las 38 pruebas
node tests/run_all.js
```

---

## 📚 Documentación y Arquitectura

* 📖 **[Arquitectura y Modelo de Amenazas](docs/threat_model.md)** — Límites de seguridad y máquina de estados.
* 📜 **[Changelog e Historial](CHANGELOG.md)** — Notas de la versión `v1.1.0-alpha`.

---

## 📄 Licencia

Publicado bajo la **[Licencia Apache 2.0](LICENSE)**. Cero telemetría, cero dependencias, ejecución 100% local.
