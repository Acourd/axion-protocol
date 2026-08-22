'use strict';

const assert = require('assert');
const {
  PHASES,
  createWorkflowStateMachine,
} = require('../../tools/workflow_state_machine.js');

assert.deepStrictEqual(PHASES, [
  'ENTENDER',
  'PLANIFICAR',
  'GATE',
  'TEST',
  'CONSTRUIR',
  'AUDITAR',
  'PROMOVER',
]);

const machine = createWorkflowStateMachine('AX-MISSION-9300');
for (const phase of PHASES) machine.advance(phase, 'PASS');
assert.strictEqual(machine.snapshot().state, 'VERIFIED');
assert.strictEqual(machine.snapshot().history.length, 7);
assert.throws(() => machine.advance('PROMOVER', 'PASS'), /terminal/i);

const blocked = createWorkflowStateMachine('AX-MISSION-9301');
blocked.advance('ENTENDER', 'PASS');
assert.throws(() => blocked.advance('GATE', 'PASS'), /secuencia/i);
blocked.block('BLOCKED_POLICY_REQUIREMENTS');
assert.strictEqual(blocked.snapshot().state, 'BLOCKED_POLICY_REQUIREMENTS');
assert.throws(() => blocked.advance('PLANIFICAR', 'PASS'), /terminal/i);

console.log('PASS state machine — siete fases ordenadas y fallo cerrado terminal');
