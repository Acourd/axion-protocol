# Axion Protocol — Guía de Integración con OpenCode y Codex

> **Arquitectura de Integración y Ejecución con Cero Dependencias para Agentes OpenCode y Codex.**

---

## 🏛️ Resumen Ejecutivo

Axion Protocol opera con **cero dependencias externas** (`dependencies: {}`) y corre directamente sobre el runtime estándar de Node.js ($\ge 22.13.0$). Los agentes en entornos como **OpenCode** y **OpenAI Codex** pueden ejecutar scripts CLI y bundles standalone sin sobrecarga de `npm install`. El enforcement no es una garantía universal en cualquier entorno arbitrario; está acotado estrictamente a espacios de trabajo donde las reglas, directivas o hooks del agente hayan sido configurados y cargados.

---

## ⚡ Integración con OpenCode

OpenCode puede operar con Axion Protocol a través de tres niveles de integración:

### 1. Integración Directa por CLI
Los agentes de OpenCode pueden invocar comandos de Axion directamente desde la terminal:
```bash
# Verificar todas las invariantes antes de aplicar cambios
node bin/axion.js verify

# Ejecutar el bucle autónomo drive con deliberación adaptativa
node bin/axion.js drive

# Comprobar bloqueos de colisión AST en flujos multi-agente
node bin/axion.js swarm

# Iniciar servidor de telemetría WebSocket en tiempo real
node bin/axion.js telemetry
```

### 2. Bundle Standalone en un Solo Archivo (`dist/axion.bundle.js`)
Para entornos aislados, micro-contenedores o sandboxes efímeros de OpenCode:
```bash
# Ejecutar la gobernanza desde un único archivo reproducible
# (el bundle se regenera por release; aquí no se declara un tamaño estático)
node dist/axion.bundle.js help
```

### 3. Reglas y Directivas Nativas (`.opencode/rules/`)
Axion Protocol exporta sus directivas P0 de gobernanza en directorios de configuración de OpenCode:
* `.opencode/rules/axion-protocol.md`
* `opencode.json` en la raíz del repositorio (registra los slash commands para OpenCode)

---

## 🧠 Integración con OpenAI Codex

Los agentes Codex operan bajo instrucciones de repositorio e interfaces de llamadas a herramientas. Axion Protocol provee:

1. **`.codex/AGENTS.md`**: Directivas esenciales de gobernanza (Custodia de la Intención, Killswitch Local, Cero Parches Ciegos).
2. **`.codex/config.toml`**: Perfiles de gobernanza determinista y atestaciones in-toto Statement v1.
3. **Optimización de Tokens AST (`sliceASTFocus`)**: Puede reducir el uso de contexto según el flujo de trabajo; no es un benchmark reproducible.

---

## 📊 Matriz de Compatibilidad

| Característica / Capa del Protocolo | Antigravity | Claude Code | OpenCode | OpenAI Codex | Cursor IDE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Intercepción por Hook PreToolUse** | ✅ (hook integrado) | ✅ (hook integrado) | ⚠️ (vía reglas, sin hook) | ⚠️ (vía directivas, sin hook) | ⚠️ (vía reglas, sin hook) |
| **Verificación por CLI y Standalone** | ✅ | ✅ | ✅ (ejecución CLI local) | ✅ (ejecución CLI local) | ✅ (ejecución CLI local) |
| **Bloqueos de Símbolos AST (`swarm`)** | ⚠️ (experimental local) | ⚠️ (experimental local) | ⚠️ (no verificado end-to-end) | ⚠️ (no verificado end-to-end) | ⚠️ (no verificado end-to-end) |
| **Atestación Ed25519 DSSE** | ✅ (herramienta CLI local) | ✅ (herramienta CLI local) | ⚠️ (no verificado end-to-end) | ⚠️ (no verificado end-to-end) | ⚠️ (no verificado end-to-end) |
| **Cero Dependencias (`package.json`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Telemetría WebSocket en Vivo** | ⚠️ (experimental local) | ⚠️ (experimental local) | ⚠️ (no verificado end-to-end) | ⚠️ (no verificado end-to-end) | ⚠️ (no verificado end-to-end) |
| **Ejecución Standalone Bundle** | ✅ | ✅ | ✅ (runtime Node.js) | ✅ (runtime Node.js) | ✅ (runtime Node.js) |

*Nota: El bloqueo activo de comandos mediante hooks PreToolUse requiere plataformas con soporte de hooks integrado (Claude Code, Google Antigravity). En OpenCode, Codex y Cursor, la gobernanza depende de la carga explícita de reglas (`.opencode/rules/`, `.codex/AGENTS.md`) y la invocación manual vía CLI. Las funciones marcadas con ⚠️ corresponden a herramientas locales experimentales o no han sido verificadas end-to-end en arneses de terceros.*

---

## 🛡️ Comando de Verificación

Para auditar y verificar la sincronización con OpenCode y Codex en cualquier máquina:
```bash
node tools/multi_harness_adapter.js --verify
```
