# Axion Protocol — Manual de Comandos y Recetas Operativas

> **El Manual de Gobernanza Local**: Especificación exhaustiva de los 12 Comandos de Gobernanza, disparadores y combinaciones calibradas para flujos de agentes.

---

## Recetas Operativas (Combinaciones Recomendadas)

Para maximizar la densidad cognitiva, reducir el gasto innecesario de tokens y mitigar derivas cognitivas del agente, utiliza estas recetas calibradas:

| Objetivo | Receta Recomendada | Comportamiento Operativo |
| :--- | :--- | :--- |
| **Decisiones Arquitectónicas & Estrategia** | `/drive /premortem` | Ejecuta una simulación adversarial a 6 meses (`/premortem`) y construye cambios con verificación (`/drive`). |
| **Corrección Atómica Ágil (1–2 archivos)** | `/drive` | Modo *Fast-Loop*: resuelve en un solo turno con cero micro-interrupciones y ejecuta pruebas de forma ágil y focalizada. |
| **Depuración Sistemática de Errores** | `/debug /verify` | Diagnóstico de causa raíz en 4 fases sin parches ciegos, validado con salida real de terminal (código 0). |
| **Aclaración de Peticiones Ambiguas** | `/clarify` | Freno socrático: formula exactamente 2 preguntas humanas A/B/C sin jerga técnica antes de tocar código. |
| **Recuperación ante Desastres & Rollback** | `/snapshot` | Restaura árboles verificados con SHA-256 de forma inmediata y atómica ante peticiones en lenguaje natural (*"deshaz lo que hiciste"*). |
| **Auditoría de Calidad Multi-Lente** | `/review` | Revisión contextual por 4 lentes (Técnica, Funcional, UX/Producto, Arquitectura) eliminando ruido superfluo. |
| **Atestación Criptográfica de Release** | `/attest` | Emite atestaciones in-toto Statement v1 en sobre DSSE con firma Ed25519 para auditoría local. |

---

## Los 12 Comandos de Gobernanza Canónicos

### 1. `/drive` — Meta-Orquestador Autónomo
- **Propósito**: Ejecución autónoma en bucle cerrado. Calibra automáticamente deliberación ágil (*Fast-Loop*) vs. deliberación profunda (*Deep-Loop*).
- **Verificación**: Encadena herramientas hasta que `tests/run_all.js` finalice con código de salida 0.
- **Reporte**: Emite un resumen ejecutivo estricto de 3 líneas (`[Acción Cumplida]`, `[Métricas]`, `[Próximo Vector]`).

### 2. `/clarify` — Freno Socrático de Intención
- **Propósito**: Previene la implementación prematura ante requisitos ambiguos o incompletos.
- **Reglas**: Máximo 2 preguntas humanas con opciones A/B/C. Cero tecnicismos. Tolerancia total a respuestas habladas o dictado por voz.

### 3. `/debug` — Depurador Sistemático en 4 Fases
- **Propósito**: Depuración metódica de causa raíz sin conjeturas a ciegas.
- **Fases**: 1) Formulación de hipótesis, 2) Reproducción observable mínima, 3) Corrección focalizada, 4) Verificación por ejecución real.

### 4. `/premortem` — Simulación Adversarial de Fallos
- **Propósito**: Autopsia adversarial a 6 meses y cálculo de *blast radius* antes de modificar módulos críticos.
- **Veredictos**: `ALLOW`, `NEEDS_HUMAN_REVIEW` o `DENY`.

### 5. `/preflight` — Clasificador Léxico de Terminal
- **Propósito**: Clasifica y filtra cada comando de terminal antes de su ejecución mediante análisis léxico estructurado (`shell: false`).
- **Seguridad**: Bloquea comandos destructivos o de riesgo no autorizado.

### 6. `/snapshot` — Checkpoints y Rollback Determinista
- **Propósito**: Puntos de control atómicos verificados con SHA-256 y reversión semántica independiente de Git.
- **Poda**: Gestión automática de retención (máximo 3 checkpoints) para evitar inflación de disco.

### 7. `/verify` — Verificador Determinista por Ejecución
- **Propósito**: Prohíbe declarar código funcional por inspección visual. Exige ejecución real con exit code 0.
- **Modo Rápido**: `node tools/verify_changes.js --fast` ejecuta únicamente las suites impactadas de forma ágil y focalizada.

### 8. `/review` — Auditoría Selectiva por 4 Lentes
- **Propósito**: Audita diffs mediante 4 lentes: Técnica, Funcional, UX/Producto y Arquitectura.
- **Eficiencia**: Descarta activamente lentes no pertinentes para evitar fatiga de lectura.

### 9. `/memory` — Memoria Fractal Persistente
- **Propósito**: Anclaje de contexto anti-amnesia persistido en disco en 4 categorías (`limite`, `correccion`, `decision`, `convencion`).
- **Anclaje**: Inyecta un resumen compacto de < 150 tokens al final de la ventana de contexto.

### 10. `/profile` — Calibrador de Perfil Humano
- **Propósito**: Calibra y persiste las 5 dimensiones del usuario (Profundidad Técnica, Entrada, Entorno, Cadencia, Autonomía Creativa).

### 11. `/halt` — Parada de Emergencia (Killswitch)
- **Propósito**: Congelación inmediata en modo *fail-closed* (`.axion/HALT`). Intercepta el uso de herramientas hasta su reanudación deliberada.

### 12. `/attest` — Emisor de Atestaciones DSSE
- **Propósito**: Genera y verifica atestaciones in-toto v1 en sobres DSSE con firma Ed25519.

---

## Paridad de Plataformas

Los 12 comandos operan de manera idéntica en:
1. **Google Antigravity**: Skills nativas en `.agents/skills/<comando>/SKILL.md`.
2. **Anthropic Claude Code**: Comandos slash en `.claude/commands/<comando>.md`.
3. **CLI Unificada**: Invocables mediante `node bin/axion.js <comando>` (con flag opcional `--target <directorio>`).

---

## Comandos Canónicos vs. Herramientas Internas

Los **12 Comandos Canónicos** anteriores representan el contrato público de cara al usuario en los diversos entornos de agentes. Las utilidades adicionales alojadas en `tools/` (clasificadores preflight, indexador SQLite de snapshots, compilador de bundle, chequeos de salud, etc.) operan como motores internos de soporte orquestados por `/drive`, `/verify` o las suites de pruebas automatizadas.
