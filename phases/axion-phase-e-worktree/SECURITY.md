# Seguridad

## Estado

Axion incluye un runtime funcional experimental. No es un interceptor global ni un control certificado: el enforcement solo existe cuando un consumidor invoca `tools/workflow_runner.js` con un contexto confiable.

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
