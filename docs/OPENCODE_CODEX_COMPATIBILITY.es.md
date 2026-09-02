# Axion Protocol — Guía de Integración Universal con OpenCode y Codex

> **Arquitectura Oficial de Integración y Ejecución con Cero Dependencias para Agentes OpenCode y Codex.**

---

## 🏛️ Resumen Ejecutivo

Axion Protocol está diseñado para ser **100% independiente del entorno de ejecución (harness-agnostic)**. Opera con **cero dependencias externas** (`dependencies: {}`) y corre directamente sobre el runtime estándar de Node.js ($\ge 18$). Esto garantiza que cualquier entorno agentivo—específicamente **OpenCode** y **OpenAI Codex**—pueda ejecutar, orquestar y aplicar gobernanza determinista sin configuración previa ni sobrecarga de `npm install`.

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
# Ejecutar la gobernanza completa en un único archivo de 95.7 KB
node dist/axion.bundle.js verify
```

### 3. Reglas y Directivas Nativas (`.opencode/rules/`)
Axion Protocol exporta automáticamente sus directivas P0 fail-closed en directorios de configuración de OpenCode:
* `.opencode/rules/axion-protocol.md`
* `.opencode/opencode.json`

---

## 🧠 Integración con OpenAI Codex

Los agentes Codex operan bajo instrucciones de repositorio e interfaces de llamadas a herramientas. Axion Protocol provee:

1. **`.codex/AGENTS.md`**: Directivas soberanas esenciales (Custodia de la Intención, Killswitch Fail-Closed, Cero Parches Ciegos).
2. **`.codex/config.toml`**: Perfiles de gobernanza determinista y atestaciones in-toto Statement v1.
3. **Optimización de Tokens AST (`sliceASTFocus`)**: Reduce el consumo de tokens hasta en un 80% cuando Codex inspecciona archivos grandes.

---

## 📊 Matriz de Compatibilidad

| Característica / Capa del Protocolo | Antigravity | Claude Code | OpenCode | OpenAI Codex | Cursor IDE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Ejecución Fail-Closed** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bloqueos de Símbolos AST (`swarm`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Atestación Ed25519 DSSE** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Cero Dependencias (`package.json`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Telemetría WebSocket en Vivo** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ejecución Standalone Bundle** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🛡️ Comando de Verificación

Para auditar y verificar la sincronización con OpenCode y Codex en cualquier máquina:
```bash
node tools/multi_harness_adapter.js --verify
```
