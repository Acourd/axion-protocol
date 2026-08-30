'use strict';

const assert = require('assert');
const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');

// Sonda puramente estática: workflow_runner nunca ejecuta commandToExecute;
// únicamente lo entrega al preflight léxico.
const result = executeHybridWorkflow({
  taskId: 'AX-TASK-9001',
  title: 'Eliminar datos persistentes dentro de un alcance crítico autorizado',
  rawUserRequest: 'Eliminar datos persistentes dentro de un alcance crítico autorizado y verificable.',
  scope: ['/var/data'],
  risk: 'CRITICAL',
  humanApproval: true,
  testAssertions: ['La operación fue comprobada'],
  checkResults: [true],
  commandToExecute: 'sudo rm -rf /var/data',
});

assert.notStrictEqual(
  result.status,
  'VERIFIED',
  'C-01: un payload CRITICAL autoafirmado y destructivo nunca debe alcanzar VERIFIED',
);

console.log(`PASS C-01 — cadena bloqueada con estado ${result.status}`);
