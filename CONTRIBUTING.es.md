# Guía de Contribución a Axion Protocol

Gracias por tu interés en contribuir a **Axion Protocol**. Nuestro principio rector absoluto es la **Custodia de la Intención Original**: permitir a usuarios no técnicos operar IA agentiva sin errores y con la mínima cantidad de iteraciones.

---

## 🏛️ Los 5 Invariantes para Colaboradores

Toda contribución debe satisfacer estos 5 principios soberanos antes de ser aprobada:

1. **Cero Dependencias Externas:**
   - Axion Protocol mantiene **`{}`** en `dependencies`. Está prohibido añadir paquetes de `npm`, `pip` o librerías externas. Todo el código, criptografía y herramientas emplean la biblioteca estándar pura de Node.js.
2. **TDD Determinista & 100% de Pruebas en Verde:**
   - Redacta las aserciones en `tests/` *antes* de modificar el código. Las 186+ suites deterministas en los 5 dominios de gobernanza deben superar la ejecución con `exit code 0`.
3. **Cumplimiento Estricto de VibeGuard:**
   - El código debe pasar `node bin/axion.js vibeguard` con cero hallazgos:
     - Sin excepciones silenciadas (`catch` mudos).
     - Sin comentarios `TODO` o `FIXME` desatendidos.
     - Sin ejecuciones de terminal opacas (`shell: false` es obligatorio).
4. **Preservación de las 12 Skills Canónicas:**
   - El kernel mantiene **exactamente 12 skills consolidadas** en `.agents/skills/` y 12 comandos en `.claude/commands/`. Las utilidades adicionales se exponen vía CLI (`bin/axion.js`) o en el ámbito global del usuario.
5. **Paridad Multi-SO:**
   - Todo el código debe ejecutarse de forma idéntica en **Linux, macOS y Windows** sin asumir separadores de ruta directos (usar siempre `path.join` y normalización POSIX).

---

## 🛠️ Flujo de Trabajo para el Desarrollo

### 1. Clonar y Verificar la Base
```bash
git clone https://github.com/Acourd/axion-protocol.git
cd axion-protocol
node bin/axion.js check
node tests/run_all.js
```

### 2. Implementar Cambios (Ciclo TDD)
1. Añade tu suite de prueba en el dominio correspondiente dentro de `tests/`:
   - `tests/01_governance_preflight/`
   - `tests/02_cryptography_attestation/`
   - `tests/03_intent_socratic/`
   - `tests/04_state_recovery/`
   - `tests/05_adversarial_resilience/`
2. Implementa tu lógica en `tools/` o en el módulo respectivo.
3. Comprueba el impacto con el ejecutor incremental:
   ```bash
   node bin/axion.js test-diff
   ```

### 3. Auditoría de Calidad Pre-Flight
Antes de enviar un Pull Request, ejecuta la cadena de verificación completa:
```bash
node bin/axion.js check
node bin/axion.js vibeguard
node tools/sync_doc_stats.js
node tests/run_all.js
```

---

## 📋 Lista de Verificación para Pull Requests

- [ ] Las 186+ suites de prueba superadas con Exit Code 0.
- [ ] VibeGuard reporta 0 antipatrones.
- [ ] Estadísticas de documentación sincronizadas (`node tools/sync_doc_stats.js`).
- [ ] Mensajes de commit descriptivos siguiendo Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`).
