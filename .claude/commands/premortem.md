---
name: premortem
description: Simulación de fracaso y autopsia prematura de ideas o características para detectar puntos débiles y blindar la arquitectura antes de programar.
---

# /premortem — Simulador de Fracaso y Resiliencia Conceptual (Axion Protocol)

> **PROPÓSITO**: Freno estratégico para nuevas ideas o características.
> Asume de antemano que la propuesta fracasó rotundamente en 6 meses y exige
> identificar las causas raíz, los peores escenarios y las medidas mínimas de blindaje
> para no construir soluciones incompetentes ni crear deuda técnica innecesaria.

---

## 🛑 Cuándo se Activa

- Al proponer una nueva funcionalidad, módulo, refactor o integración.
- Cuando una idea suena atractiva en papel pero no se han medido sus efectos secundarios.
- Invocación explícita mediante `/premortem <nombre o descripción de la idea>`.

---

## 📋 Los 5 Pasos del Análisis Pre-Mortem

Ante la idea propuesta, el agente **DEBE** evaluar de forma crítica y responder con este informe estructurado:

### 💀 1. Autopsia Prematura (¿Por qué fracasó?)
Imagina que pasaron 6 meses y la idea fue un desastre. Expón al menos **3 causas concretas**:
1. **Adopción / UX**: ¿Por qué el usuario la ignoró o le causó fricción?
2. **Deuda Técnica**: ¿Qué complejidad o fragilidad oculta introdujo?
3. **Puntos de Quiebre**: ¿Qué falló cuando el volumen o la concurrencia crecieron?

### ⚖️ 2. Auditoría de Competencia (Anti-Bloat)
- ¿Resuelve un problema real o es complejidad cosmética (*slop*)?
- ¿Podría lograrse el 80% del beneficio con el 20% del esfuerzo usando lo que ya existe?

### 🌪️ 3. Peores Escenarios Catastróficos
- **Escenario Límite 1**: Entradas corruptas, caídas de red o estados inconsistentes.
- **Escenario Límite 2**: Impacto en el rendimiento, memoria o límites de cuota.

### 🛡️ 4. Blindaje Técnico Obligatorio
Medidas mínimas indispensables que deben existir **antes** de dar por aprobada la idea:
- Invariantes que no pueden romperse.
- Pruebas deterministas de regresión requeridas.

### ⚖️ 5. Veredicto Final de Resiliencia
- **APROBADA CON BLINDAJE**: La idea es sólida si se implementan las salvaguardas descritas.
- **REPLANTEAR DISEÑO**: La idea tiene valor pero el enfoque actual tiene demasiados puntos ciegos.
- **DESCARTAR POR BLOAT**: La idea introduce más problemas que beneficios.

---

## 💻 Registro de Evaluación por Herramienta

Para registrar formalmente el pre-mortem en el árbol de estados:
```bash
node tools/premortem.js evaluate '<json_payload>'
```
