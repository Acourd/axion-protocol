---
name: review
description: Auditoría de cambios por 4 lentes (Técnica, Funcional, UX/Producto, Arquitectura) aplicando solo las pertinentes, con evidencia ejecutable.
---

# /review — Validación Selectiva por 4 Lentes (Axion Protocol)

> **PROPÓSITO**: Auditar sin ruido. Una revisión que comenta todo con el mismo énfasis
> entrena a que no se lea ninguna.

---

## 🛑 Cuándo se Activa

- Al cerrar una iteración o antes de promover un cambio a `VERIFIED`.
- Cuando se pide una auditoría de cambios con varias lentes de calidad.
- Invocación explícita mediante `/review` sobre el diff de la última iteración.

---

## 🔍 Las 4 Lentes

| Lente | Qué examina | Evidencia que exige |
|---|---|---|
| **Técnica** | Correctitud, tipos, manejo de errores, seguridad, cobertura. | `node tools/verify_changes.js` en verde. |
| **Funcional** | Cumplimiento del `IntentContract`, casos límite, qué pasa con entrada vacía o duplicada. | El comportamiento descrito, contrastado con el contrato. |
| **UX / Producto** | Claridad, accesibilidad, fricción, estados de carga y error. | Recorrido concreto del usuario, no una impresión general. |
| **Arquitectura** | Acoplamiento, límites modulares, dependencias nuevas, coste en rendimiento. | La consecuencia a 3 meses, no la elegancia de hoy. |

---

## 📋 Protocolo de Ejecución

1. **Inspeccionar el diff** de la última iteración: qué archivos cambiaron y por qué.

2. **Seleccionar lentes**. Aplica solo las pertinentes y **di cuáles descartaste y por
   qué** (un refactor de backend no necesita lente de UX; omitirla en silencio parece un
   olvido).

3. **Emitir veredicto**:

```markdown
### Veredicto: PASS | BRECHAS
- **Lentes aplicadas**: [...]  · **Descartadas**: [... y por qué]
- **Evidencia**: [salida real de verify, no una afirmación]
```

Si hay brechas, lista priorizada — nada de inventario plano:

| Severidad | Lente | Archivo:línea | Problema | Corrección mínima |
|---|---|---|---|---|
| `BLOQUEANTE` | | | rompe algo en uso o abre un riesgo real | |
| `IMPORTANTE` | | | funciona, pero fallará de forma previsible | |
| `MENOR` | | | mejora sin consecuencia si se pospone | |

---

## 💻 Ejecución por Herramienta

```bash
node tools/verify_changes.js
```
La evidencia de la lente Técnica es la salida real del verificador, no una afirmación.

---

## ⚖️ Veredictos del Motor

- `PASS` — sin brechas, con evidencia ejecutable verificada.
- `BRECHAS_BLOQUEANTES` — al menos una `BLOQUEANTE`: no promover hasta cerrarla.
- `BRECHAS_MENORES` — funciona; las `IMPORTANTE`/`MENOR` quedan priorizadas, no en silencio.

---

## 🚫 Prohibiciones

- Reportar `PASS` sin haber ejecutado la verificación cuando la lente Técnica aplica.
- Inflar la lista con observaciones de estilo para que la revisión "parezca completa".
- Señalar un problema sin proponer la corrección mínima que lo cierra.
