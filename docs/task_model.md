# Modelo de control de recursos

Una tarea puede representarse mediante el esquema conceptual siguiente:

```yaml
task_id: AX-TASK-0001
objective: ""
priority: normal
risk: LOW

resources:
  models: []
  tools: []
  skills: []
  time_budget: null
  context_budget: null

routing:
  selected_executor: ""
  reason: ""
  alternatives_rejected: []

gates:
  human_approval_required: false
  rollback_required: false
  independent_audit_required: false

evidence:
  inputs: []
  outputs: []
  logs: []
  hashes: []

status: PLANNED
```

El ejemplo es informativo. El contrato validable está en [task.schema.json](../schemas/task.schema.json). Ningún campo activa por sí mismo una herramienta o concede autoridad.
