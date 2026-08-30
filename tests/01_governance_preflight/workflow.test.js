'use strict';

const assert = require('assert');
const path = require('path');
const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');
const { createLowRiskFixture } = require('../trust_fixture.js');

console.log('=== Pruebas del Flujo de Trabajo Hibrido Unificado (Axion Protocol) ===\n');

console.log('--- Caso 1: Tarea de bajo riesgo con CHECK independiente ---');
const target = path.join(__dirname, '..', '..', 'tools', 'preflight.js');
const low = createLowRiskFixture({
  missionId: 'AX-TEST-001',
  assertions: ['Sintaxis valida'],
  modifiedFiles: [target],
});
const res1 = executeHybridWorkflow(low.payload, low.runtime);
assert.strictEqual(res1.status, 'VERIFIED');
assert.strictEqual(res1.workflow.history.length, 7);
assert.strictEqual(res1.check.status, 'CHECK_VALID');
console.log('PASS: tarea LOW completo las siete fases con CHECK firmado');

console.log('\n--- Caso 2: Tarea HIGH sin aprobacion firmada ---');
const missionId = 'AX-TEST-002';
const res2 = executeHybridWorkflow({
  missionId,
  title: 'Migracion masiva de persistencia',
  rawUserRequest: 'Ejecutar una migracion masiva verificable de la capa de persistencia.',
  scope: ['database/production'],
  risk: 'HIGH',
  command: { executable: 'node', args: ['--version'], cwd: path.resolve(__dirname, '..'), shell: false },
  rollbackPlan: {
    contractVersion: '1.0.0',
    planId: 'RB-AX-TEST-002',
    missionId,
    strategy: 'RESTORE_SNAPSHOT',
    snapshotDigest: 'b'.repeat(64),
    steps: ['restaurar snapshot autorizado'],
    verification: ['comparar manifest SHA-256'],
  },
  testAssertions: ['comprobacion independiente'],
  humanApproval: true,
});
assert.strictEqual(res2.status, 'BLOCKED_APPROVAL_MISSING');
console.log('PASS: humanApproval:true no sustituyo una firma');

console.log('\n--- Caso 3: Shell crudo destructivo ---');
const res3 = executeHybridWorkflow({
  missionId: 'AX-TEST-003',
  title: 'Ejecucion con sintaxis insegura',
  rawUserRequest: 'Evaluar una limpieza completa de temporales con alcance delimitado.',
  scope: ['scratch/test'],
  risk: 'LOW',
  testAssertions: ['clasificacion estatica'],
  commandToExecute: 'rm -rf /',
});
assert.strictEqual(res3.status, 'DENIED_COMMAND');
console.log('PASS: comando destructivo denegado sin ejecutarse');

console.log('\n=== TODAS LAS PRUEBAS DEL FLUJO HIBRIDO PASARON (PASS) ===');
