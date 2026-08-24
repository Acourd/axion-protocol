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
- **APPROVED_WITH_SAFEGUARDS** | **CONDITIONAL_TDD** | **PIVOT_REQUIRED** | **REJECTED_AS_BLOAT** | **REJECTED_AS_UNJUSTIFIED**
```

---

## ⚖️ Los 5 Veredictos y su Código de Salida

Son los únicos válidos. Úsalos literalmente: el motor rechaza cualquier otra cadena.
El código de salida sigue el mismo contrato que `/preflight` — **0 adelante · 2 decisión
humana · 1 no**.

| Veredicto | Exit | Significa |
|---|:--:|---|
| `APPROVED_WITH_SAFEGUARDS` | 0 | Adelante, con las salvaguardas comprometidas. |
| `CONDITIONAL_TDD` | 2 | Solo con prueba que falle primero: hay debilidad crítica en las mitigaciones. |
| `PIVOT_REQUIRED` | 2 | El enfoque no sobrevive a su propia autopsia; hay que replantearlo. |
| `REJECTED_AS_BLOAT` | 1 | La complejidad que añade supera al problema que resuelve. |
| `REJECTED_AS_UNJUSTIFIED` | 1 | No se sostiene la necesidad real de construirlo. |

**El veredicto lo deriva el motor, no lo declaras tú.** Puedes proponer uno *más severo*
en `payload.verdict` si sabes algo que el análisis no recoge; proponer uno más laxo se
rechaza con `VERDICT_DOWNGRADE_REFUSED`. Quien es evaluado no dicta su propio resultado:
es la misma asimetría del killswitch, donde parar es barato y levantar la parada es un
acto humano deliberado.

---

## 💻 Registro de Evaluación por Herramienta

El recorrido normal es de tres pasos, y **no requiere pelearse con las comillas del shell**:

```bash
node tools/premortem.js template --out premortem.json   # 1. esqueleto rellenable
node tools/premortem.js evaluate --file premortem.json  # 2. sella y dictamina
node tools/premortem.js report latest                   # 3. el informe en markdown
```

Un payload de siete campos en una sola línea de shell es una forma segura de perder media
hora escapando apóstrofos, sobre todo en Windows. Usa `--file`.

```bash
node tools/premortem.js list             # los pre-mortems sellados, con su veredicto
node tools/premortem.js show <id>        # el registro completo, con digest y payload
node tools/premortem.js verdicts         # el contrato de veredictos, en JSON
node tools/premortem.js evaluate '<json>'  # sigue valiendo, si el payload es corto
```

El informe de `report` se genera **desde el registro sellado**, no desde lo que alguien
recuerde haber escrito: el markdown y la evidencia cuentan la misma historia o no sirven.

### Lo que el motor exige, y por qué

- **≥ 40 caracteres por riesgo, escenario y mitigación.** Un riesgo de una palabra no es
  un riesgo, es una casilla marcada, y esta herramienta vale exactamente por la sustancia
  de lo que se escribe en ella.
- **Anclas ortogonales.** El mismo riesgo repetido en dos anclas se rechaza: cuatro
  dimensiones que dicen lo mismo son una sola repetida cuatro veces.
- **`competence_check.justified` booleano explícito.** No vale la ausencia.
- **El nivel se deriva del contenido, no se declara.** Puedes declarar menos del que
  alcanzas; declarar más se rechaza. El nivel 3 exige `mitigation_stress_test` con
  `has_critical_weakness` booleano y una auto-crítica escrita de verdad.
- **≥ 6 palabras distintas por frase**, además de los 40 caracteres. Cuarenta y cuatro
  letras iguales superaban el suelo de longitud: contar caracteres mide el esfuerzo de
  teclear, no el de pensar.
- **Nada de autopsias recicladas.** Si reutilizas literalmente el 70% o más de las frases
  de otro pre-mortem cambiando solo el título, se rechaza con `PREMORTEM_BOILERPLATE` y se
  te dice con cuál choca. Una plantilla pegada en cada misión hace que la puerta apruebe el
  cien por cien sin detectar nada, con luz verde certificando que hubo análisis.
  Parecerse **sí** vale: dos migraciones que de verdad se parecen se describen con frases
  distintas, porque los riesgos concretos difieren. Reevaluar la misma característica
  tampoco es calco: es corregirla.
- **Las salvaguardas aprobadas se persisten en `.axion/memory`** vía la API de memoria,
  así que sobreviven a la regeneración del índice y viajan al ancla de `/compact`. Un
  pre-mortem rechazado no deja convenciones: no hay nada que comprometer.


---

## 🔗 Puerta de la Fase 2 (PLANIFICAR), no recordatorio

`/premortem` dejó de depender de que alguien se acuerde de usarlo. La política
(`policies/risk.yaml`) declara `adversarial_premortem` y `tools/workflow_runner.js` lo
**exige en PLANIFICAR** para las misiones que lo requieren.

**Va delante del GATE a propósito.** La autopsia pregunta si la cosa *debería* existir, y
esa pregunta pierde el sentido una vez que un humano ya ha firmado que sí.

### Cómo se aporta a una misión

```jsonc
// (a) en línea: el runner lo evalúa al vuelo
{ "risk": "CRITICAL", "premortem": { /* payload completo */ } }

// (b) por referencia a un registro ya sellado en .axion/state/
{ "risk": "CRITICAL", "premortemId": "6b3b4387f258ea1b" }
```

Por referencia, el payload sellado debe llevar **`mission_id`** igual al de la misión. Sin
ese vínculo el runner devuelve `PREMORTEM_UNBOUND`: una autopsia aprobada para algo
inocuo no puede servir de salvoconducto para cualquier otra cosa, igual que una aprobación
Ed25519 va atada a su misión.

### Qué deja pasar y qué no

| Situación | Estado del runner |
|---|---|
| `APPROVED_WITH_SAFEGUARDS` | Pasa a GATE. |
| `CONDITIONAL_TDD` / `PIVOT_REQUIRED` | `BLOCKED_PREMORTEM_CONDITIONAL` |
| `REJECTED_*` | `BLOCKED_PREMORTEM_DENIED` |
| Falta y es obligatorio | `BLOCKED_PREMORTEM_MISSING` |
| Registro editado a mano | `BLOCKED_PREMORTEM_TAMPERED` |
| Registro de otra misión | `BLOCKED_PREMORTEM_BINDING_MISMATCH` |

Un `CONDITIONAL_TDD` **no** es vía libre: dice que hay una debilidad crítica en las
mitigaciones y que solo se sigue con una prueba que falle primero. El runner no puede
comprobar que esa prueba ataque *esa* debilidad, así que no puede declarar cumplida la
condición. Arregla la mitigación y vuelve a pasar la autopsia.

**El registro se re-verifica, no se cree.** Al citarlo por id se recalcula su digest
canónico y se vuelve a derivar el veredicto desde el contenido. Leer el veredicto guardado
devolvería por la puerta de atrás la autocertificación que se cerró por la de delante:
bastaría abrir el JSON y cambiar una palabra.

### Alcance actual

Obligatorio en **CRITICAL** — acciones destructivas, de seguridad, despliegues,
migraciones e irreversibles. Para exigirlo también en HIGH, mueve `adversarial_premortem`
de `required_for_critical_only` a `required_for_high_or_critical` en la política: el
runtime no necesita cambiar. En los niveles bajos no es obligatorio —exigir una autopsia
para cambiar una constante la convertiría en trámite, y un trámite se rellena sin leerlo—
pero **si se aporta una, se valida igual**: no hay vía por la que un pre-mortem
suministrado se ignore.
