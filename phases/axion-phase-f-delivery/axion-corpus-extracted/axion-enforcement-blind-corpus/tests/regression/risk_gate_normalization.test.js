'use strict';

const assert = require('assert');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { executeHybridWorkflow } = require(path.join(ROOT, 'tools', 'workflow_runner.js'));

const missionId = 'AX-TASK-0001';
const base = {
  missionId,
  title: 'Migracion',
  rawUserRequest: 'Ejecutar una migracion masiva verificable de la capa de persistencia.',
  scope: ['database/production'],
  command: { executable: 'node', args: ['--version'], cwd: ROOT, shell: false },
  rollbackPlan: {
    contractVersion: '1.0.0',
    planId: 'RB-AX-TASK-0001',
    missionId,
    strategy: 'RESTORE_SNAPSHOT',
    snapshotDigest: 'c'.repeat(64),
    steps: ['restaurar snapshot autorizado'],
    verification: ['comparar manifest SHA-256'],
  },
  testAssertions: ['comprobacion'],
};

const EXIGEN_GATE = ['HIGH', 'CRITICAL', 'high', 'critical', 'Critical', 'HIGH ', ' high', 'High'];
const FUERA_DE_DOMINIO = ['SEVERE', 'CATASTROPHIC', 'ALTO', '', 999, undefined, null, {}];
const fallos = [];

for (const risk of EXIGEN_GATE) {
  const result = executeHybridWorkflow({ ...base, risk });
  if (result.status !== 'BLOCKED_APPROVAL_MISSING') {
    fallos.push(`risk=${JSON.stringify(risk)} debia exigir firma y devolvio ${result.status}`);
  }
}

for (const risk of FUERA_DE_DOMINIO) {
  const result = executeHybridWorkflow({ ...base, risk });
  if (result.status !== 'BLOCKED_INVALID_RISK') {
    fallos.push(`risk=${JSON.stringify(risk)} debia bloquear identidad y devolvio ${result.status}`);
  }
}

const fabricated = executeHybridWorkflow({ ...base, risk: 'HIGH', humanApproval: true });
if (fabricated.status !== 'BLOCKED_APPROVAL_MISSING') {
  fallos.push(`humanApproval:true no puede sustituir una firma: ${fabricated.status}`);
}

const low = executeHybridWorkflow({ ...base, risk: 'low', rollbackPlan: undefined });
if (low.status === 'BLOCKED_INVALID_RISK' || low.status === 'BLOCKED_APPROVAL_MISSING') {
  fallos.push(`risk='low' no debe exigir gate HIGH/CRITICAL: ${low.status}`);
}

assert.deepStrictEqual(fallos, [], `el gate no falla cerrado:\n  - ${fallos.join('\n  - ')}`);
console.log(`PASS risk gate normalization — ${EXIGEN_GATE.length} grafias exigen firma, ${FUERA_DE_DOMINIO.length} valores bloquean`);
