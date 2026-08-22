# Plan del Parche (Fase G)

El objetivo es parchar la implementación para reforzar la separación de identidades, cumpliendo las reglas exigidas.

### `tools/approval_ed25519.js`
1. Modificar la firma de `verifyAndConsumeApproval` para recibir explícitamente `executorActorId`.
2. Añadir la comprobación de independencia:
   ```javascript
   if (approval.actorId === executorActorId) {
     return result(APPROVAL_STATUS.APPROVAL_NOT_INDEPENDENT);
   }
   ```
3. Esta comprobación DEBE ocurrir **antes** de consumir el nonce (antes de `consumeOnce`).

### `tools/check_ed25519.js`
1. Modificar la firma de `verifyIndependentCheck` para recibir:
   - `executorActorId`
   - `approvalActorId`
2. Añadir/Actualizar la comprobación de independencia:
   ```javascript
   if (check.actorId === executorActorId || check.actorId === approvalActorId) {
     return result(CHECK_STATUS.CHECK_NOT_INDEPENDENT);
   }
   ```

### `tools/workflow_runner.js`
1. Al invocar `verifyAndConsumeApproval`, propagar explícitamente `runtimeContext.executorActorId`.
2. Al invocar `verifyIndependentCheck`, propagar explícitamente `runtimeContext.executorActorId` y `approvalEnvelope.approval.actorId`.
3. Asegurar que estas propagaciones sean lecturas directas de los atributos esperados, sin reconstruir identidades desde roles, booleanos o strings libres.
