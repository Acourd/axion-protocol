# Axion Protocol — Autoevaluación de Madurez Asintótica (v3.0)

> **Estado experimental.** Este documento es una autoevaluación cualitativa del propio
> proyecto. **No** es una certificación, una auditoría independiente ni una medición
> reproducible. Las puntuaciones numéricas publicadas en revisiones anteriores (v2.0)
> fueron retiradas por ser subjetivas y no reproducibles.

---

## Estado Actual Verificado

- 238 suites deterministas se ejecutan en CI (`node tests/run_all.js`) en los 5 dominios de gobernanza.
- La CI ejercita salud (`axion check`), la compuerta de calidad VibeGuard, el hook
  PreToolUse, la parada de emergencia, la reversión determinista y la cadena de atestación.
- El empaquetado multi-SO se prueba instalando el tarball real de `npm pack` en Ubuntu, macOS y Windows.
- El SBOM cubre la superficie publicada declarada en `package.json#files`; la procedencia
  es descriptiva y no reclama ningún nivel SLSA.
- La ejecución de código arbitrario permanece deshabilitada: este runtime no incluye un
  sandbox de seguridad.

---

## Las 7 Fronteras Soberanas (Estado Declarado, Sin Puntajes)

1. **Verificación Formal e Invariantes** — Parcial: existen contratos AST, validación de
   esquemas y suites de invariantes locales; no hay demostración formal con SMT/Z3.
2. **Aislamiento y Ejecución Segura Fail-Closed** — Parcial: existen preflight léxico,
   ejecución con `shell: false` y parada de emergencia; no hay aislamiento a nivel de SO
   ni micro-sandbox.
3. **Densidad Cognitiva y Economía de Tokens** — Parcial: hay herramientas locales de
   podado de contexto; el ahorro depende de la carga y no está garantizado.
4. **Memoria Fractal y Resistencia a la Deriva** — Parcial: existen grafo de memoria local
   y checkpoints; sin garantías distribuidas ni respaldo por hardware.
5. **Evolución Adaptativa y Auto-Recuperación** — Parcial: los bucles de convergencia y la
   síntesis de parches AST son experimentales; la revisión humana sigue siendo necesaria.
6. **Trazabilidad Inmutable DSSE** — Parcial: existen sobres in-toto Statement v1 con firmas
   Ed25519 y JSON canónico RFC 8785; la evidencia se ancla por ruta + hash de artefacto, y
   la firma acredita autoría del JSON, no la ejecución de la carga.
7. **Radar Anti-Vibecoding Semántico** — Parcial: la compuerta léxica VibeGuard corre en CI;
   la verificación semántica profunda de intención no está implementada.

---

## Escalera Evolutiva de 3 Peldaños

* **Peldaño 1 — Optimización Local Inmediata:** mantener la suite, la salud y las compuertas
  de calidad verdes y reproducibles en CI.
* **Peldaño 2 — Salto Estructural 10x:** coordinación multi-agente con mensajería
  autenticada y quórum de consenso (experimental).
* **Peldaño 3 — Horizonte Asintótico Soberano:** operación continua sin fallos con cero
  fricción cognitiva para usuarios no técnicos (no alcanzado; es una dirección, no un claim).
