---
name: debug
description: Ciclo sistemático de depuración en 4 fases con causa raíz y verificación por evidencia, sin parches ciegos.
---

# /debug — Depuración Sistemática con Evidencia (Axion Protocol)

> **PROPÓSITO**: Reparar la causa, no el síntoma. Un parche que hace desaparecer el
> mensaje de error sin explicar por qué aparecía no es una corrección: es un fallo
> silenciado que volverá con peor disfraz.

---

## 🛑 Cuándo se Activa

- Ante un test en rojo, una excepción en runtime o un comando con salida no-cero.
- Cuando `/verify` falla o una suite reporta un fallo cuyo origen no es evidente.
- Invocación explícita mediante `/debug` con la salida real del fallo pegada.

**No se activa** si el fallo ya tiene causa raíz identificada con evidencia: ir a
`/debug` a repetir el ciclo sería fricción. Solo aplica cuando no se sabe *por qué* falla.

---

## 📋 Las 4 Fases

1. **Reproducción**
   Aísla el caso mínimo que detona el fallo con una prueba ejecutable. Si no consigues
   reproducirlo, dilo y no sigas: sin reproducción no hay forma de saber si lo arreglaste.

2. **Causa Raíz**
   Localiza el origen exacto en el código fuente. Enúncialo en una frase que explique
   *por qué* falla, con `archivo:línea`. Si tu explicación no predice el síntoma
   observado, todavía no es la causa raíz.

3. **Corrección Atómica**
   El cambio mínimo que resuelve esa causa. Nada de refactors oportunistas en el mismo
   paso: si el fallo vuelve, hay que poder señalar qué línea lo causó.

4. **Verificación**

## 💻 Ejecución por Herramienta

```bash
node tools/verify_changes.js
```
La prueba de reproducción debe pasar de roja a verde, y el resto de la suite seguir
en verde. Sin exit code 0 no hay corrección, solo una hipótesis.

---

## ⚖️ Veredictos del Ciclo

- `ROOT_CAUSE_IDENTIFIED` — causa enunciada con `archivo:línea` y predicción del síntoma.
- `RESOLVED_WITH_EVIDENCE` — exit code 0 con la prueba de reproducción en verde.
- `UNREPRODUCIBLE` — no se pudo reproducir: se reporta y no se toca código.
- `HYPOTHESIS_EXHAUSTED` — dos hipótesis descartadas sin causa: `/checkpoint` + consulta humana.

---

## 🚫 Prohibiciones

- Cambiar la prueba para que pase en lugar de arreglar el código.
- Envolver en `try/catch` lo que no se entiende.
- Aplicar varias correcciones a la vez y declarar victoria sin saber cuál funcionó.
- Declarar el fallo resuelto sin haber ejecutado nada.

Si tras dos hipótesis descartadas sigues sin causa raíz, considera `/checkpoint` y
consulta con la persona antes de seguir tocando.