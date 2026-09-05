# Gobernanza

## Estado

Axion Protocol v1.3.2 (GA) declara **enforcement activo** de esta gobernanza en los harnesses con puerta ejecutable: Antigravity, Claude Code y Codex (hooks PreToolUse), y OpenCode (comandos + permisos nativos). Limitaciones conocidas documentadas: el plugin de gate de OpenCode permanece deshabilitado por inestabilidad del plugin host 1.18.x; Cursor y Copilot reciben las directivas como reglas contextuales (no exponen hooks). El enforcement se verifica con la suite completa y el health check.

## Roles

- **Human Authority:** decide producto, arquitectura, seguridad, promoción, retención y acciones irreversibles.
- **Director:** interpreta el objetivo, propone alcance, recursos, riesgo y gates.
- **Executor:** realiza exclusivamente acciones aprobadas y no certifica su propio resultado.
- **Supervisor:** observa alcance, desviaciones, checkpoints y condiciones de detención.
- **Auditor:** contrasta afirmaciones y evidencia con independencia del ejecutor.
- **Evidence Layer:** conserva procedencia, logs, hashes, manifests y rollback.

## Autoridad

Una fuente solo es normativa cuando su identidad, versión, owner, alcance, aprobación, consumidor y mecanismo de enforcement están declarados. Los informes, ejemplos y documentos de linaje son informativos.

Ante conflicto, ambigüedad o ausencia de autoridad demostrable, prevalece el fallo cerrado y se solicita una decisión humana.

## Gates

1. **Entender:** confirmar objetivo, alcance y fuentes de verdad.
2. **Planificar:** identificar riesgos, rollback y decisiones humanas.
3. **Aprobar:** obtener autorización antes de acciones `HIGH` o `CRITICAL`.
4. **Ejecutar:** limitarse al alcance autorizado.
5. **Supervisar:** registrar cambios y detener desviaciones.
6. **Auditar:** verificar de forma independiente.
7. **Promover:** requerir una decisión humana separada.

## Promoción

La existencia, integración o ejecución de un componente no lo convierte en `APPROVED` o `STABLE`. La promoción exige evidencia, consumidor, runtime, pruebas, rollback, auditoría y aprobación explícita.

## Cambios a esta gobernanza

Todo cambio que altere autoridad, seguridad, arquitectura o retención requiere revisión independiente y aprobación de Human Authority.
