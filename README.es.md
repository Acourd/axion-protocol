# Axion Protocol

> **Herramientas Locales Experimentales de Gobernanza para Flujos de Agentes.**
> *Herramientas de gobernanza local para estructurar y acotar flujos de trabajo de agentes de IA autónomos.*
>
> **Estado**: Runtime EXPERIMENTAL. El enforcement no intercepta comandos de shell del sistema operativo automáticamente sin el hook de agente integrado. Requiere **Node.js 22.13** o superior. Cero dependencias externas de npm.

[![Estado de CI](https://img.shields.io/badge/CI-246%20Suites-informational.svg?style=flat-square)](https://github.com/Acourd/axion-protocol/actions)
[![Versión](https://img.shields.io/badge/Versi%C3%B3n-v1.4.0--beta.1-0969da.svg?style=flat-square)](package.json)
[![Licencia](https://img.shields.io/badge/Licencia-Apache%202.0-blue.svg?style=flat-square)](LICENSE)
[![Cero Dependencias](https://img.shields.io/badge/Dependencias-0-success.svg?style=flat-square)](package.json)

---

## El Problema Fundamental en el Desarrollo con IA Agentiva

Los asistentes de código autónomos (**Claude Code, Google Antigravity, Cursor, Codex**) están transformando la industria. Sin embargo, al operar con total autonomía, tanto creadores no técnicos como equipos de ingeniería se enfrentan a cuatro riesgos sistémicos:

1. **Alucinaciones y Vibecoding Descontrolado**: Modelos que asumen intenciones ambiguas a ciegas, inventan APIs y refactorizan subsistemas críticos sin alineación humana previa.
2. **Operaciones Destructivas en Terminal**: Modificaciones accidentales del sistema de archivos, conflictos de puertos, filtración involuntaria de credenciales y operaciones de base de datos no autorizadas.
3. **Degradación de Contexto y Quema de Tokens**: Cientos de dólares desperdiciados en bucles de razonamiento infinitos, micro-interrupciones repetitivas y pérdida de memoria en sesiones largas.
4. **Cero Auditabilidad Criptográfica**: Imposibilidad de demostrar matemáticamente qué pruebas se ejecutaron realmente, quién autorizó un cambio y si la cadena de suministro fue alterada.

**Axion Protocol ayuda a estructurar estos flujos a nivel local.** Proporciona herramientas ligeras de gobernanza (**cero dependencias externas**) para introducir puntos de control deliberados y límites en entornos de agentes soportados.

---

## Propuesta de Valor

- **Freno Socrático de Intención (`/clarify`)**: Obliga al agente a formular exactamente 2 preguntas humanas estructuradas (A/B/C) antes de tocar código, orientado a mitigar el parcheo a ciegas.
- **Inspección Preflight de Terminal (`/preflight`)**: Inspecciona y clasifica comandos de terminal (`ALLOW` / `NEEDS_HUMAN_REVIEW` / `DENY`) mediante análisis léxico y ejecución estructurada (`shell: false`).
- **Rollback Determinista (`/snapshot`)**: Restaura instantáneas del árbol verificadas con SHA-256 ante peticiones en lenguaje natural (*"deshaz lo que hiciste"*), independiente de Git.
- **Verificador Incremental (`tools/smart_incremental_runner.js`)**: Analiza grafos de dependencias inversas para ejecutar las pruebas impactadas.
- **Sintetizador Pre-Flight TDD (`tools/preflight_tdd_synthesizer.js`)**: Deriva aserciones formales antes de modificar el disco para reducir iteraciones de ensayo y error.
- **Atestaciones Locales de Procedencia (`/attest`)**: Genera sobres locales DSSE/in-toto Statement v1 firmados con Ed25519.
- **Consistencia Multi-Plataforma**: Gobernanza diseñada para operar de forma coherente en integraciones incluidas (**Google Antigravity**, **Anthropic Claude Code**) y terminal CLI.

---

## Arquitectura Unificada de 7 Fases

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. INTENT   │ ──► │ 2. PREMORTEM │ ──► │  3. PREFLIGHT│ ──► │ 4. EXECUTION │
│  (/clarify)  │     │  (/premortem)│     │ (/preflight) │     │   (/drive)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐            ▼
│ 7. ATTEST    │ ◄── │  6. AUDIT    │ ◄── │  5. VERIFY   │ ◄──────────┘
│  (/attest)   │     │  (/review)   │     │  (/verify)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Guía Rápida de Inicio (Menos de 30 Segundos)

### 1. Demo Interactiva (Sin Instalación)

Prueba la clasificación de comandos y la reversión de estado en una demostración en memoria (sin escrituras a disco):

```bash
# Ejecutar demo interactiva en terminal
node bin/axion.js demo

# Ejecutar benchmark comparativo
node bin/axion.js benchmark
```

### 2. Instalación de la Beta desde Código Fuente (GitHub)

Durante la fase de preparación para la beta pública, Axion Protocol se consume directamente desde el código fuente (la publicación en registro NPM está bloqueada deliberadamente):

```bash
# Clonar el repositorio
git clone https://github.com/Acourd/axion-protocol.git
cd axion-protocol

# Inicializar gobernanza en un espacio de trabajo destino
node bin/axion.js init --target /ruta/a/proyecto-destino

# O registrar los slash commands de usuario para tu entorno de agente
node bin/axion.js init --user
```

*(El instalador compara hashes SHA-256 para preservar y respaldar de forma segura cualquier archivo preexistente que difiera antes de sobrescribirlo).*

### 3. Verificar Salud del Sistema

```bash
# Auditar el espacio de trabajo del proyecto desde el CLI clonado
node bin/axion.js check --target /ruta/a/proyecto-destino
```

Salida:
```text
[Axion Health Check] Auditando proyecto...
  ✓ PASS   Motor Node.js: v24.x (requiere >= 22.13.0)
  ✓ PASS   Hook PreToolUse: ejercitado en vivo (bloquea destructivos)
  ✓ PASS   Slash Commands: 12/12 en .agents/skills · 12/12 en .claude/commands
  ✓ PASS   Killswitch: RUNNING — sin parada activa

[Axion Protocol v1.4.0-beta.1] 13/13 comprobaciones en verde. Gobernanza operativa.
```

---

## Comandos de Gobernanza y Recetas

Axion Protocol incorpora 12 slash commands diseñados para operar en sinergia. Para consultar la especificación completa, disparadores y combinaciones recomendadas (p. ej. `/drive /premortem /debug`), visita el manual dedicado:

**[Explorar el Manual Completo de Comandos y Recetas ->](docs/COMMANDS.es.md)**

| Comando | Categoría | Objetivo Principal |
| :--- | :--- | :--- |
| `/drive` | Ejecución Autónoma | Meta-orquestador en bucle cerrado con bifurcación *Fast-Loop* vs. *Deep-Loop*. |
| `/clarify` | Freno Socrático | 2 preguntas humanas estructuradas A/B/C sin tecnicismos. |
| `/debug` | Depuración Sistemática | Ciclo de depuración en 4 fases con causa raíz y verificación por evidencia. |
| `/premortem` | Simulación de Fallos | Autopsia adversarial a 6 meses y cálculo de radio de impacto (*blast radius*). |
| `/preflight` | Seguridad en Terminal | Clasificador léxico de comandos estructurados (`shell: false`). |
| `/snapshot` | Recuperación de Estado | Puntos de control deterministas SHA-256 y rollback en lenguaje natural. |
| `/verify` | Verdad Determinista | Ejecución real de tests exigiendo exit code 0; soporta `--fast`. |
| `/review` | Auditoría Multi-Lente | Inspección selectiva mediante 4 lentes (Técnica, Funcional, UX, Arquitectura). |
| `/memory` | Memoria Fractal | Memoria persistente en 4 niveles (< 150 tokens de anclaje) anti-deriva. |
| `/profile` | Calibración Humana | Calibra el perfil del usuario en 5 dimensiones (Voz, IDE, Cadencia). |
| `/halt` | Parada de Emergencia | Bloqueo operativo mediante archivo de parada local (`.axion/HALT`). |
| `/attest` | Criptografía | Sobres DSSE in-toto Statement v1 firmados con Ed25519. |

---

## Verificación Determinista e Invariantes

Axion Protocol incluye **246 suites de prueba deterministas** que se ejecutan concurrentemente sin dependencias externas:

```bash
# Ejecutar las 246 suites de prueba
npm test
```

---

## Licencia y Autor

Distribuido bajo la Licencia **Apache-2.0**. Consulta [LICENSE](LICENSE) para más detalles.  
Creado y mantenido por **Adria** ([@Acourd](https://github.com/Acourd)).
