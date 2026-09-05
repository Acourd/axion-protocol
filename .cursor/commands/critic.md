---
description: Evaluación asintótica de madurez soberana y auto-crítica metacognitiva contra las 7 Fronteras de Excelencia Sistémica. Destruye la complacencia de los checklists al 100%.
---

# /critic — Crítico Asintótico y Motor de Excelencia Metacognitiva (Axion Protocol)

> **PROPÓSITO**: Auditar cualquier artefacto o el propio sistema frente a las 7 Fronteras Asintóticas de Excelencia Sistémica. Ningún "todo en verde" se da por conquistado: se mide la madurez real contra el horizonte absoluto y se reporta la brecha pendiente.

---

## 🛑 Cuándo se Activa

- Al terminar un milestone, release o ciclo de `/drive`, para verificar que la madurez no es solo declarada.
- Cuando se sospecha complacencia: "checklist al 100%" sin verificación empírica.
- Invocación explícita mediante `/critic` o `/critic --markdown`.

---

## 🧭 Las 7 Fronteras Asintóticas

1. **FORMAL_INVARIANTS**: Verificación formal y consistencia de invariantes de estado.
2. **ISOLATION_AND_SAFETY**: Aislamiento y ejecución segura fail-closed.
3. **COGNITIVE_EFFICIENCY**: Eficiencia cognitiva, densidad de contexto y token economy.
4. **CHRONIC_ENDURANCE**: Resistencia crónica y memoria fractal anti-deriva.
5. **ADAPTIVE_EVOLUTION**: Evolución adaptativa y auto-recuperación determinista.
6. **PROVENANCE_AND_INTEGRITY**: Trazabilidad inmutable e integridad de cambios.
7. **SEMANTIC_DRIFT_RADAR**: Radar de deriva semántica y erradicación de vibecoding.

---

## 💻 Ejecución por Herramienta

```bash
node tools/asymptotic_critic.js
```
Para reporte legible en Markdown:
```bash
node tools/asymptotic_critic.js --markdown
```

El motor escanea el workspace, calcula el % de madurez conquistada (AMR) y el horizonte pendiente por frontera, y guarda el reporte en `.axion/state/`.

---

## 📋 Protocolo de Reporte

1. Ejecutar el motor y citar el **AMR real** que imprima la salida (no una cifra memorizada).
2. Listar las 7 fronteras con su % actual y su brecha.
3. Extraer la escalera de 3 peldaños hacia la excelencia y comprometer al menos el primero.
4. Si el AMR < objetivo declarado, no declarar el milestone cerrado: marcar `CONDITIONAL_TDD` o `PIVOT_REQUIRED`.

**Regla anti-complacencia:** el % de una frontera solo cuenta si la evidencia fue verificada empíricamente (suite real, hashes, atestaciones). Una frontera "verde" sin evidencia se reporta como brecha.
