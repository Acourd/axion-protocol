'use strict';

const assert = require('assert');
const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');

const result = executeHybridWorkflow({
  taskId: 'AX-TASK-9003',
  title: 'Verificar una operación local mediante evidencia independiente',
  rawUserRequest: 'Verificar una operación local mediante evidencia independiente y con procedencia comprobable.',
  scope: ['tools/workflow_runner.js'],
  risk: 'LOW',
  humanApproval: true,
  testAssertions: ['El módulo carga correctamente'],
  checkResults: [true],
  commandToExecute: 'node -v',
});

assert.notStrictEqual(
  result.status,
  'VERIFIED',
  'attestation provenance: humanApproval/checkResults autorreportados no pueden producir VERIFIED',
);

console.log(`PASS attestation provenance — autoafirmaciones rechazadas con estado ${result.status}`);
