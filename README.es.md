# Axion Protocol

> **El Arnés de Gobernanza Soberana y Motor de Seguridad Determinista para IA Agentiva.**  
> *Convierte el desarrollo errático e impredecible con IA en ingeniería de software determinista, verificable y lista para producción.*
>
> **Estado**: Runtime EXPERIMENTAL. El enforcement no intercepta comandos de shell del sistema operativo automáticamente sin el hook de agente integrado. Requiere **Node.js 20** o superior. Cero dependencias externas de npm.

[![Estado de CI](https://img.shields.io/badge/CI-182%20En%20Verde-2ea44f.svg?style=flat-square)](https://github.com/Acourd/axion-protocol/actions)
[![Versión](https://img.shields.io/badge/Versi%C3%B3n-v1.3.1--rc.1-0969da.svg?style=flat-square)](package.json)
[![Licencia](https://img.shields.io/badge/Licencia-Apache%202.0-blue.svg?style=flat-square)](LICENSE)
[![Cero Dependencias](https://img.shields.io/badge/Dependencias-0-success.svg?style=flat-square)](package.json)
[![Velocidad](https://img.shields.io/badge/Velocidad-12s%20(8%20workers)-informational.svg?style=flat-square)](tests/run_all.js)
[![Tamaño](https://img.shields.io/badge/Tama%C3%B1o-535_kB-informational.svg?style=flat-square)](package.json)

---

## El Problema Fundamental en el Desarrollo con IA Agentiva

Los asistentes de código autónomos (**Claude Code, Google Antigravity, Cursor, Codex**) están transformando la industria. Sin embargo, al operar con total autonomía, tanto creadores no técnicos como equipos de ingeniería se enfrentan a cuatro riesgos sistémicos:

1. **Alucinaciones y Vibecoding Descontrolado**: Modelos que asumen intenciones ambiguas a ciegas, inventan APIs y refactorizan subsistemas críticos sin alineación humana previa.
2. **Operaciones Destructivas en Terminal**: Modificaciones accidentales del sistema de archivos, conflictos de puertos, filtración involuntaria de credenciales y operaciones de base de datos no autorizadas.
3. **Degradación de Contexto y Quema de Tokens**: Cientos de dólares desperdiciados en bucles de razonamiento infinitos, micro-interrupciones repetitivas y pérdida de memoria en sesiones largas.
4. **Cero Auditabilidad Criptográfica**: Imposibilidad de demostrar matemáticamente qué pruebas se ejecutaron realmente, quién autorizó un cambio y si la cadena de suministro fue alterada.

**Axion Protocol mitiga estos riesgos de forma determinista.** Proporciona un arnés local y ultra-ligero (535 kB, **cero dependencias externas**) que encapsula a tu agente en una **máquina de estados determinista de modo fail-closed**.

---

## Propuesta de Valor

- **Freno Socrático de Intención (`/clarify`)**: Obliga al agente a formular exactamente 2 preguntas humanas estructuradas (A/B/C) antes de tocar código, erradicando el parcheo a ciegas.
- **Escudo Fail-Closed de Terminal (`/preflight`)**: Intercepta y clasifica cada comando (`ALLOW` / `NEEDS_HUMAN_REVIEW` / `DENY`) con ejecución segura (`shell: false`).
- **Rollback Determinista Instantáneo (`/snapshot`)**: Restaura instantáneas del árbol verificadas con SHA-256 en `< 5ms` ante peticiones en lenguaje natural (*"deshaz lo que hiciste"*), independiente de Git.
- **Verificador Incremental de Alta Velocidad (`tools/smart_incremental_runner.js`)**: Analiza grafos de dependencias inversas para ejecutar únicamente las pruebas impactadas en `< 300ms`.
- **Sintetizador Pre-Flight TDD (`tools/preflight_tdd_synthesizer.js`)**: Deriva aserciones formales antes de modificar el disco, garantizando *First-Shot Success*.
- **Atestaciones Criptográficas Enterprise (`/attest`)**: Genera sobres DSSE in-toto Statement v1 firmados con Ed25519 (compatibles con SLSA Nivel 3 y Cosign).
- **Paridad Multi-Plataforma al 100%**: Gobernanza unificada disponible de forma idéntica en **Google Antigravity**, **Anthropic Claude Code** y terminal CLI.

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

### 1. Demo Interactiva en Sandbox (Sin Instalación)

Prueba la intercepción de comandos y la reversión instantánea en un entorno efímero aislado:

```bash
# Ejecutar demo interactiva en terminal
node bin/axion.js demo

# Ejecutar benchmark comparativo
node bin/axion.js benchmark
```

### 2. Inicializar en un Proyecto Existente

```bash
# Inyectar gobernanza fail-closed en tu espacio de trabajo
npx axion-protocol init
```

*Configura automáticamente `.agents/skills/` (Antigravity), `.claude/commands/` (Claude Code), `tools/`, `policies/` y `schemas/` con respaldo seguro SHA-256.*

### 3. Verificar Salud del Sistema

```bash
npx axion check
```

Salida:
```text
[Axion Health Check] Auditando proyecto...
  ✓ PASS   Motor Node.js: v24.x (requiere >= 20)
  ✓ PASS   Hook PreToolUse: ejercitado en vivo (bloquea destructivos)
  ✓ PASS   Slash Commands: 12/12 en .agents/skills · 12/12 en .claude/commands
  ✓ PASS   Killswitch: RUNNING — sin parada activa

[Axion Protocol v1.3.1-rc.1] 12/12 comprobaciones en verde. Gobernanza operativa.
```

---

## Comandos de Gobernanza y Recetas

Axion Protocol incorpora 12 slash commands diseñados para operar en sinergia. Para consultar la especificación completa, disparadores y combinaciones recomendadas (p. ej. `/drive /premortem /critic`), visita el manual dedicado:

**[Explorar el Manual Completo de Comandos y Recetas ->](docs/COMMANDS.es.md)**

| Comando | Categoría | Objetivo Principal |
| :--- | :--- | :--- |
| `/drive` | Ejecución Autónoma | Meta-orquestador en bucle cerrado con bifurcación *Fast-Loop* vs. *Deep-Loop*. |
| `/clarify` | Freno Socrático | 2 preguntas humanas estructuradas A/B/C sin tecnicismos. |
| `/critic` | Excelencia Asintótica | Auditor polimórfico universal evaluando las 7 Fronteras de Madurez Soberana. |
| `/premortem` | Simulación de Fallos | Autopsia adversarial a 6 meses y cálculo de radio de impacto (*blast radius*). |
| `/preflight` | Seguridad en Terminal | Clasificador léxico de comandos estructurados (`shell: false`). |
| `/snapshot` | Recuperación de Estado | Puntos de control deterministas SHA-256 y rollback en lenguaje natural. |
| `/verify` | Verdad Determinista | Ejecución real de tests exigiendo exit code 0; soporta `--fast`. |
| `/review` | Auditoría Multi-Lente | Inspección selectiva mediante 4 lentes (Técnica, Funcional, UX, Arquitectura). |
| `/memory` | Memoria Fractal | Memoria persistente en 4 niveles (< 150 tokens de anclaje) anti-deriva. |
| `/profile` | Calibración Humana | Calibra el perfil del usuario en 5 dimensiones (Voz, IDE, Cadencia). |
| `/halt` | Parada de Emergencia | Congelación inmediata en modo fail-closed (`.axion/HALT`). |
| `/attest` | Criptografía | Sobres DSSE in-toto Statement v1 firmados con Ed25519. |

---

## Verificación Determinista e Invariantes

Axion Protocol incluye **225 suites de prueba deterministas** que se ejecutan concurrentemente sin dependencias externas:

```bash
# Ejecutar las 225 suites de prueba
npm test
```

---

## Licencia y Autor

Distribuido bajo la Licencia **Apache-2.0**. Consulta [LICENSE](LICENSE) para más detalles.  
Creado y mantenido por **Adria** ([@Acourd](https://github.com/Acourd)).
