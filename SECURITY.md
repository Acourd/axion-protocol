# Seguridad

## Estado

Axion Protocol v1.3.2 (GA). El enforcement fail-closed opera donde existe puerta ejecutable: hooks PreToolUse en Antigravity, Claude Code y Codex, y comandos/permisos nativos en OpenCode. **Limitaciones conocidas:** no es un interceptor global certificado — Cursor y Copilot reciben directivas contextuales (no exponen hooks), el plugin de gate de OpenCode está deshabilitado (inestabilidad del plugin host 1.18.x), y Codex requiere el CLI de Codex instalado. Revisa la sección Frontera de confianza antes de asumir cobertura en un harness.

## Frontera de confianza

- El payload de la tarea es no confiable.
- Las rutas del registro publico, del estado de consumo y el actor ejecutor llegan por contexto de runtime separado.
- El registro contiene exclusivamente claves publicas Ed25519.
- La clave privada humana permanece fuera del repositorio, snapshots, manifests, logs y proceso ejecutor.
- El runtime verifica autoridades, pero no incluye APIs para darlas de alta, revocarlas o eliminarlas.

## Controles implementados

- compilacion fail-closed de `policies/risk.yaml`;
- aprobacion Ed25519 con binding exacto, expiracion, nonce, uso unico y consumo atomico;
- CHECK Ed25519 por auditor independiente del ejecutor;
- comandos estructurados con `shell:false` y clasificacion destructiva;
- maquina de estados de siete fases sin saltos;
- evidencia canonica SHA-256 ligada a aprobacion, rollback, CHECK y estado;
- plan minimo de rollback ligado a mision y snapshot.

Un estado de autoridad ausente, desconocido, revocado, expirado o malformado bloquea. Si el estado de replay no puede persistirse atomicamente, el resultado es `BLOCKED_APPROVAL_STATE_UNAVAILABLE`.

## Limites

El clasificador no convierte shell arbitrario en seguro: lo deniega o lo remite a revision. El plan de rollback acredita preparacion y binding; la restauracion concreta depende del consumidor y debe verificarse contra el snapshot autorizado.

No incluyas secretos o datos sensibles en reportes. Conserva evidencia sensible fuera del repositorio y registra solo hashes o identificadores no secretos.
