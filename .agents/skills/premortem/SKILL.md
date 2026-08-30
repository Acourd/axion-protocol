---
name: premortem
description: Simulación de fracaso, autopsia adversarial a 6 meses y cálculo de blast radius antes de programar (absorbe /deep).
---

# /premortem — Simulador de Fracaso y Deliberación Profunda (Axion Protocol)

> **PROPÓSITO**: Freno deliberativo y adversarial obligatorio para nuevas ideas, refactors o propuestas complejas. Asume de antemano que la propuesta fracasó en 6 meses, analiza el radio de impacto (*blast radius*) y exige 3 modos de falla concretos con sus medidas de blindaje antes de tocar código.

---

## 🛑 Cuándo se Activa

- Al proponer una nueva funcionalidad, módulo, refactor estructural o integración.
- Cuando una tarea exige máxima rigurosidad y cálculo de blast radius (modo `/deep`).
- Invocación explícita mediante `/premortem [nombre o payload]`.

---

## 🧭 Los 3 Niveles de Profundidad de /premortem

### 🟢 Nivel 1: Las 4 Anclas Ortogonales (Obligatorio)
1. **🛡️ Seguridad & Integridad**: Inyecciones, fuga de secretos, permisos excesivos, fail-closed.
2. **⚡ Rendimiento & Recursos**: Fugas de memoria, bloqueos de event loop, consumo de disco/CPU.
3. **🧩 Arquitectura & Deuda Técnica**: Acoplamiento innecesario, blast radius, contratos de tests.
4. **👥 Ergonomía & UX**: Fricción humana, fatiga de alertas, sobrecarga cognitiva.

### 🔵 Nivel 2: Estrés de Dominio y Casos Límite (Recomendado)
Analiza fallas de concurrencia, caídas de red, I/O bloqueante y estados corruptos.

### 🟣 Nivel 3: Auto-Crítica de la Solución (Pre-Mortem de las Mitigaciones)
Somete a prueba las *propias salvaguardas propuestas* para confirmar que la cura no sea peor que la enfermedad.

---

## ⚖️ Veredictos Emitidos por el Motor

El motor deriva de forma determinista uno de los siguientes veredictos:
- `APPROVED_WITH_SAFEGUARDS`: Adelante, con las salvaguardas comprometidas (exit code 0).
- `CONDITIONAL_TDD`: Solo con prueba que falle primero (exit code 2).
- `PIVOT_REQUIRED`: El enfoque no sobrevive a su autopsia; replantear (exit code 2).
- `REJECTED_AS_BLOAT`: Complejidad injustificada (exit code 1).
- `REJECTED_AS_UNJUSTIFIED`: Sin necesidad real demostrada (exit code 1).

---

## 💻 Ejecución por Herramienta

```bash
node tools/premortem.js evaluate --file <ruta_json>
```
O para deliberaciones rápidas de blast radius:
```bash
node tools/deep_reasoning.js evaluate --file <ruta_json>
```
El reporte legible se consulta con:
```bash
node tools/premortem.js report <premortem_id>
```
