---
name: verify
description: Verificación determinista por ejecución real de la suite, con exigencia de exit code 0.
---

# /verify — Verificación Determinista (Axion Protocol)

> **PROPÓSITO**: El código no se declara funcional por inspección visual. Lo demuestra
> ejecutándose.

---

## 🛑 Cuándo se Activa

- Al cerrar cualquier ciclo de implementación, antes de promover o atestar.
- Cuando se sospecha que un cambio "funciona" sin haberse ejecutado.
- Invocación explícita mediante `/verify`.

---

## 📋 Protocolo de Ejecución

1. **Ejecutar el verificador**:
   ```bash
   node tools/verify_changes.js
   ```
   O bien: `axion verify`

   Usa `tests/run_all.js` si existe; si no, el script `test` de `package.json`. La
   invocación es estructurada (`shell: false`), la misma regla que el protocolo impone
   al agente en la directiva P4.

2. **Criterio estricto**:
   - **PASS** — exit code 0. Reporta el número real de suites en verde que imprimió la
     salida. No cites cifras de memoria ni de la documentación: solo lo que acabas de ver.
   - **FAIL** — exit code distinto de 0. Queda **prohibido** afirmar que el cambio
     funciona. Pasa a `/debug` con la salida real del fallo.
   - **`NO_TEST_RUNNER_FOUND`** — no hay suite. No es un PASS silencioso: dilo, y propón
     crear una prueba mínima que cubra el cambio antes de seguir.

3. **Antes de promover**: `/verify` en verde es requisito previo de `/attest`. Una
   atestación sobre código no verificado documenta una afirmación, no un hecho.

---

## ⚖️ Veredictos del Motor

- `PASS` — exit code 0 con el número real de suites en verde impreso por la salida.
- `FAIL` — exit code distinto de 0: prohibido declarar éxito; pasa a `/debug`.
- `NO_TEST_RUNNER_FOUND` — no hay suite: no es PASS silencioso, se propone una prueba mínima.
