---
name: premortem
description: Simulación de fracaso y autopsia prematura de ideas o características para detectar puntos débiles y blindar la arquitectura antes de programar.
---

# /premortem — Simulador de Fracaso y Resiliencia Conceptual (Axion Protocol)

> **PROPÓSITO**: Freno estratégico para nuevas ideas, refactors o propuestas.
> Asume de antemano que la propuesta fracasó rotundamente en 6 meses y exige
> identificar las causas raíz, los peores escenarios y las medidas mínimas de blindaje
> para no construir soluciones incompetentes ni crear deuda técnica innecesaria.

---

## 🛑 Cuándo se Activa

- Al proponer una nueva funcionalidad, módulo, refactor o integración.
- Cuando una idea suena atractiva en papel pero no se han medido sus efectos secundarios.
- Invocación explícita mediante `/premortem <nombre o descripción de la idea>`.

---

## 🧭 Los 3 Niveles de Profundidad de /premortem

### 🟢 Nivel 1: Las 4 Anclas Ortogonales (Obligatorio)
Expone los riesgos más graves en cada una de las 4 dimensiones cardinales:
1. **🛡️ Seguridad & Integridad**: Inyección, fuga de secretos, colisión con zonas protegidas, permisos excesivos.
2. **⚡ Rendimiento & Recursos**: Fugas de memoria en Node.js, bloqueos en el event loop, crecimiento descontrolado de disco o CPU.
3. **🧩 Arquitectura & Deuda Técnica**: Acoplamiento innecesario, ruptura de contratos previos, fragilidad al actualizar módulos.
4. **👥 Ergonomía & Experiencia (UX)**: Fricción humana, fatiga de alertas, mensajes crípticos, sobrecarga cognitiva.

### 🔵 Nivel 2: Estrés de Dominio y Casos Límite (Recomendado)
Analiza fallas específicas del entorno de ejecución (concurrencia, caídas de red, I/O bloqueante, estados corruptos).

### 🟣 Nivel 3: Auto-Crítica de la Solución (Pre-Mortem de las Mitigaciones)
Somete a prueba las *propias salvaguardas propuestas* para confirmar que "la cura no sea peor que la enfermedad" (evita sobreingeniería y bucles infinitos).

---

## 📋 Estructura de Respuesta del Pre-Mortem

```markdown
# 🌪️ Reporte Pre-Mortem Adversarial: [Nombre de la Característica]

### 🧭 1. Las 4 Anclas de Impacto
- 🛡️ **Seguridad**: [1-2 riesgos graves identificados]
- ⚡ **Rendimiento**: [1-2 riesgos graves identificados]
- 🧩 **Arquitectura**: [1-2 riesgos graves identificados]
- 👥 **Ergonomía / UX**: [1-2 riesgos graves identificados]

### 🌪️ 2. Peores Escenarios Catastróficos (Estrés de Dominio)
- 💥 **[Escenario 1]**: [Detalle de caída o caso límite]
- 💥 **[Escenario 2]**: [Detalle de caída o caso límite]

### 🛡️ 3. Medidas de Mitigación Obligatorias
- ✅ **[Salvaguarda 1]**: [Medida concreta]
- ✅ **[Salvaguarda 2]**: [Medida concreta]

### 🔍 4. Auto-Crítica de la Solución (Estrés de la Mitigación)
- ⚡ **[Punto Débil de la Salvaguarda]**: [¿Podría causar lentitud o sobrecomplejidad?]

### ⚖️ 5. Veredicto Final de Resiliencia
- **APROBADA CON BLINDAJE** | **CONDITIONAL_TDD** | **PIVOT_REQUIRED** | **DESCARTAR POR BLOAT**
```

---

## 💻 Registro de Evaluación por Herramienta

Para registrar formalmente el pre-mortem en el árbol de estados `.axion/state/`:
```bash
node tools/premortem.js evaluate '<json_payload>'
```
