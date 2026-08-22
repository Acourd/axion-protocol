# Schemas

Los esquemas usan JSON Schema Draft 2020-12 y modelan contratos iniciales. Todos incorporan metadatos comunes de identidad, versión, fecha, procedencia, estado, owner, riesgo, evidencia y aprobación.

## Catálogo de Esquemas

- `common.schema.json`: Metadatos comunes de identidad, versión y aprobación.
- `task.schema.json`: Modelo de tareas y asignación de riesgo.
- `action.schema.json`: Solicitud y ejecuciones de acciones.
- `decision.schema.json`: Registro de decisiones de la Autoridad Humana.
- `audit.schema.json`: Veredictos e inspección independiente.
- `evidence.schema.json`: Manifiestos de evidencia y trazabilidad.
- `rollback.schema.json`: Planes de restauración y reversión.
- `runtime.schema.json`: Contratos de compatibilidad de runtimes.
- `component.schema.json`: Estado y promoción de componentes.
- `non_conformance.schema.json`: Registro de No Conformidades (NC) e indeterminaciones normativas.
- `approval.schema.json`: Sobre de aprobacion Ed25519 y campos firmados.
- `authority_registry.schema.json`: Registro local de autoridades con claves exclusivamente publicas.
- `check_attestation.schema.json`: CHECK Ed25519 de auditor independiente.
- `rollback-plan.schema.json`: Plan minimo vinculado a mision, snapshot y verificacion.

Su estado es `EXPERIMENTAL`; los ejecutables correspondientes se ubican en `tools/`.
