# Terminología

## Roles

- **Human Authority:** persona u órgano con autoridad explícita para decidir.
- **Director:** planifica, enruta y solicita gates.
- **Executor:** realiza acciones autorizadas.
- **Supervisor:** observa ejecución y límites.
- **Auditor:** verifica independientemente.
- **Evidence Layer:** conserva evidencia y recuperación.

## Estados de tarea

`PLANNED`, `WAITING_FOR_INPUT`, `WAITING_FOR_APPROVAL`, `APPROVED`, `RUNNING`, `PAUSED`, `BLOCKED`, `FAILED`, `COMPLETED`, `VERIFIED`, `REJECTED`, `ROLLED_BACK`, `ARCHIVED`.

`COMPLETED` expresa que la ejecución terminó; `VERIFIED` requiere una comprobación independiente.

## Estados de componente

`EXPERIMENTAL`, `CANDIDATE`, `APPROVED`, `STABLE`, `DEPRECATED`, `ARCHIVED`, `REJECTED`, `EXTERNAL`.

Ningún componente asciende automáticamente.

## Compatibilidad

`OBSERVED`, `TESTED`, `EXPERIMENTAL`, `SUPPORTED`, `UNSUPPORTED`, `UNKNOWN`.

Solo `SUPPORTED` declara un compromiso de soporte, y requiere aprobación humana y evidencia vigente.

## Riesgo

`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Las acciones `HIGH` y `CRITICAL` requieren gate humano.
