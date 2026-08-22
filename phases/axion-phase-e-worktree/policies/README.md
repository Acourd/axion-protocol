# Policies

Las politicas siguen en estado `EXPERIMENTAL`.

`risk.yaml` tiene enforcement local en `tools/risk_policy_compiler.js` y `tools/workflow_runner.js`: el runtime compila su dominio y los requisitos de HIGH/CRITICAL y falla cerrado ante valores o requisitos desconocidos.

`authority.yaml`, `promotion.yaml` y `retention.yaml` conservan `DOCUMENT_ONLY`. La verificacion Ed25519 implementa una frontera concreta de autoridad para el workflow, pero no convierte automaticamente toda la politica documental en control ejecutable ni promociona el componente.
