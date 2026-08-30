'use strict';

const assert = require('assert');
const { createWorkflowStateMachine, PHASES } = require('../../tools/workflow_state_machine.js');

console.log('=== AX-F-027 Rigor e Inmutabilidad de la Máquina de Estados (State Machine) ===\n');

// 1. Rechazo de missionId vacío
assert.throws(() => createWorkflowStateMachine(''), /missionId es obligatorio/);
assert.throws(() => createWorkflowStateMachine('   '), /missionId es obligatorio/);
assert.throws(() => createWorkflowStateMachine(null), /missionId es obligatorio/);
console.log('✓ Rechazo de missionId vacío o malformado verificado');

// 2. Avance secuencial de las 7 fases
const sm = createWorkflowStateMachine('mission-test-001');
let current = sm.snapshot();
assert.strictEqual(current.state, 'PLANNED');
assert.strictEqual(current.nextPhase, 'ENTENDER');

PHASES.forEach((phase, index) => {
  const next = sm.advance(phase, 'PASS', `digest-phase-${index}`);
  if (index === PHASES.length - 1) {
    assert.strictEqual(next, 'VERIFIED');
  } else {
    assert.strictEqual(next, `RUNNING_${PHASES[index + 1]}`);
  }
});

const finalSnap = sm.snapshot();
assert.strictEqual(finalSnap.state, 'VERIFIED');
assert.strictEqual(finalSnap.terminal, true);
assert.strictEqual(finalSnap.nextPhase, null);
assert.strictEqual(finalSnap.history.length, 7);
console.log('✓ Avance secuencial estricto de las 7 fases a VERIFIED verificado');

// 3. Bloqueo de avance en estado terminal
assert.throws(() => sm.advance('ENTENDER', 'PASS'), /La máquina está en estado terminal/);
assert.throws(() => sm.block('BLOCKED_TEST'), /La máquina está en estado terminal/);
console.log('✓ Bloqueo total tras estado terminal verificado');

// 4. Rechazo de avance fuera de secuencia
const smOut = createWorkflowStateMachine('mission-out-002');
assert.throws(() => smOut.advance('CONSTRUIR', 'PASS'), /Transición fuera de secuencia: se esperaba ENTENDER y llegó CONSTRUIR/);
assert.throws(() => smOut.advance('ENTENDER', 'FAIL'), /advance solo acepta PASS/);
console.log('✓ Rechazo de transiciones fuera de orden o con outcome no-PASS verificado');

// 5. Bloqueo fail-closed
const smBlock = createWorkflowStateMachine('mission-block-003');
smBlock.advance('ENTENDER', 'PASS');
const blockedState = smBlock.block('DENIED_PREMORTEM');
assert.strictEqual(blockedState, 'DENIED_PREMORTEM');
assert.strictEqual(smBlock.snapshot().terminal, true);
assert.throws(() => smBlock.block('INVALID_CODE'), /La máquina está en estado terminal/);
console.log('✓ Bloqueo fail-closed y transición terminal irreversible verificada');

// 6. Inmutabilidad de snapshot
const snap = smBlock.snapshot();
assert.throws(() => { snap.state = 'MUTATED'; }, /Cannot assign to read only property/);
assert.throws(() => { snap.history.push({ fake: true }); }, /Cannot add property/);
console.log('✓ Inmutabilidad criptográfica/estructural de snapshot verificada');

console.log('\nPASS AX-F-027 — Máquina de estados determinista, 7 fases e inmutabilidad verificadas al 100%.\n');
