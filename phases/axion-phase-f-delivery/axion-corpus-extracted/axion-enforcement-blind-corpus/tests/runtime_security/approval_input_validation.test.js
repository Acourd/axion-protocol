'use strict';

const assert = require('assert');
const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');

const fabricated = executeHybridWorkflow({
  taskId: 'AX-TASK-9100',
  title: 'Aplicar una operación de riesgo alto con aprobación verificable',
  rawUserRequest: 'Aplicar una operación de riesgo alto con aprobación verificable y alcance exacto.',
  scope: ['workspace'],
  risk: 'HIGH',
  humanApproval: true,
  approvalActor: 'fabricated-human-name',
  testAssertions: ['fixture estático'],
  checkResults: [true],
  commandToExecute: 'node -v',
});

assert.notStrictEqual(
  fabricated.status,
  'VERIFIED',
  'Una aprobación fabricada por el payload no puede habilitar VERIFIED',
);

console.log(`PASS approval input validation — payload bloqueado con ${fabricated.status}`);
