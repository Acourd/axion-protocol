'use strict';

const assert = require('assert');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { executeHybridWorkflow } = require(path.join(ROOT, 'tools', 'workflow_runner.js'));
const { createLowRiskFixture } = require(path.join(ROOT, 'tests', 'trust_fixture.js'));

const base = {
  missionId: 'AX-TASK-0002',
  title: 'Cambio',
  rawUserRequest: 'Comprobar de forma independiente un cambio local delimitado y verificable.',
  scope: ['tools/preflight.js'],
  risk: 'LOW',
  command: { executable: 'node', args: ['--version'], cwd: ROOT, shell: false },
};

const sinAserciones = executeHybridWorkflow({ ...base, testAssertions: [] });
assert.strictEqual(sinAserciones.status, 'BLOCKED_NO_CHECKS');

const sinEjecutar = executeHybridWorkflow({ ...base, testAssertions: ['a', 'b'] });
assert.strictEqual(sinEjecutar.status, 'BLOCKED_CHECK_MISSING');

const incompleto = executeHybridWorkflow({ ...base, testAssertions: ['a', 'b'], checkResults: [true] });
assert.strictEqual(incompleto.status, 'BLOCKED_CHECK_MISSING');

const autoafirmado = executeHybridWorkflow({ ...base, testAssertions: ['a', 'b'], checkResults: [true, true] });
assert.strictEqual(autoafirmado.status, 'BLOCKED_CHECK_MISSING');

const valid = createLowRiskFixture({ missionId: 'AX-TASK-0002-VALID', assertions: ['a', 'b'] });
const verificado = executeHybridWorkflow(valid.payload, valid.runtime);
assert.strictEqual(verificado.status, 'VERIFIED');
assert.strictEqual(verificado.check.status, 'CHECK_VALID');

console.log('PASS independent CHECK requirement — VERIFIED exige CHECK Ed25519 independiente y vinculado');
