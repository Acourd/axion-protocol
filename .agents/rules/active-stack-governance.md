# Axion Protocol — Reglas P0 Dinámicas Contextualizadas

**Stack Detectado:** JavaScript / Node.js
**Fecha de Tejido:** 2026-09-02T01:02:27.784Z
**Arquitectura:** Soberana Fail-Closed Zero-Dependency

## 🛡️ Invariantes Universales P0 (Aplicables a todo el proyecto)

1. **Custodia de Intención Original:**  Bloqueo de mutaciones ante peticiones vagas hasta emitir IntentContract SHA-256.
2. **Salvaguarda Fail-Closed:**  Ante cualquier error o presencia de .axion/HALT, toda mutación se congela.
3. **Ejecución Estructurada:**  Ejecutar comandos sin shell ({ executable, args, shell
4. **Verificación Determinista:**  Exigir exit code 0 mediante la suite real de pruebas antes de declarar éxito.
5. **Reporte Ejecutivo de 3 Líneas:**  Concluir misiones con [Acción Cumplida], [Métricas] y [Próximo Vector Metacognitivo].

## ⚡ Reglas Específicas del Ecosistema Activo

### 📦 JavaScript / Node.js
- **Regla 1:** Node.js Runtime: Uso de sintaxis nativa moderna (ES2022+ o CJS estructurado sin dependencias innecesarias).
- **Regla 2:** Safe Async Execution: Todo Promise o async/await debe tener manejo de errores determinista.
