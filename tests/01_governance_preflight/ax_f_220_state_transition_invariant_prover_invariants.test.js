'use strict';

/**
 * AX-F-220: Invariantes del Verificador Formal de Transición de Estados (M_GOV_015)
 *
 * Valida de forma determinista:
 * 1. Demostración formal de invariante de corte obligatorio (cut-vertex): imposible alcanzar COMMIT sin pasar por VERIFY.
 * 2. Detección matemática de bypass con generación determinista de contraejemplo mínimo.
 * 3. Identificación exhaustiva de estados inalcanzables y deadlocks en el grafo de estados.
 * 4. Resiliencia y terminación acotada ante grafos con ciclos dirigidos (complejidad O(V + E)).
 * 5. Emisión de StateTransitionProofReport_v1 sellado con SHA-256 de 64 caracteres.
 * 6. Integración transparente con DriveEngine.proveStateTransitionInvariants().
 */

const assert = require('assert');
const path = require('path');
const StateTransitionInvariantProver = require('../../tools/state_transition_invariant_prover.js');
const DriveEngine = require('../../tools/drive_engine.js');

console.log('=== AX-F-220 Invariantes del Verificador Formal de Transición de Estados (M_GOV_015) ===\n');

const ROOT = path.resolve(__dirname, '..', '..');
const prover = new StateTransitionInvariantProver({ projectRoot: ROOT });

// 1. Definición canónica de máquina de estados segura (Axion Governance 7 Fases)
const canonicalMachine = {
  states: ['INIT', 'RECON', 'PLAN', 'RESGUARDO', 'TDD', 'VERIFY', 'COMMIT', 'HALT'],
  initial: 'INIT',
  terminals: ['COMMIT', 'HALT'],
  transitions: [
    { from: 'INIT', to: 'RECON' },
    { from: 'RECON', to: 'PLAN' },
    { from: 'PLAN', to: 'RESGUARDO' },
    { from: 'RESGUARDO', to: 'TDD' },
    { from: 'TDD', to: 'VERIFY' },
    { from: 'VERIFY', to: 'COMMIT' },
    { from: 'VERIFY', to: 'TDD' }, // Ciclo de corrección acotado
    { from: 'INIT', to: 'HALT' },
    { from: 'RECON', to: 'HALT' },
    { from: 'PLAN', to: 'HALT' },
    { from: 'RESGUARDO', to: 'HALT' },
    { from: 'TDD', to: 'HALT' },
    { from: 'VERIFY', to: 'HALT' }
  ]
};

// Invariante 1: Verificación formal de máquina segura (cut-vertex inquebrantable)
const safeProof = prover.proveInvariants(canonicalMachine, {
  cutVertex: 'VERIFY',
  target: 'COMMIT'
});

assert.strictEqual(safeProof.isSafe, true, 'La máquina canónica de Axion debe ser formalmente segura');
assert.strictEqual(safeProof.cutVertexEnforced, true, 'VERIFY debe ser un cut-vertex obligatorio para llegar a COMMIT');
assert.strictEqual(safeProof.deadlocksCount, 0, 'No deben existir deadlocks en la máquina canónica');
assert.strictEqual(safeProof.unreachableStates.length, 0, 'No deben existir estados inalcanzables');
console.log('✓ Invariante 1: Demostración matemática formal de cut-vertex obligatorio (imposible COMMIT sin VERIFY)');

// Invariante 2: Detección formal de bypass con traza de contraejemplo exacta
const bypassMachine = {
  ...canonicalMachine,
  transitions: [
    ...canonicalMachine.transitions,
    { from: 'PLAN', to: 'COMMIT' } // Salto clandestino directo que elude VERIFY
  ]
};

const bypassProof = prover.proveInvariants(bypassMachine, {
  cutVertex: 'VERIFY',
  target: 'COMMIT'
});

assert.strictEqual(bypassProof.isSafe, false, 'La máquina con bypass clandestino debe ser rechazada');
assert.strictEqual(bypassProof.violationType, 'CUT_VERTEX_BYPASS');
assert.ok(Array.isArray(bypassProof.counterexample), 'Debe proveer una traza de contraejemplo');
assert.deepStrictEqual(bypassProof.counterexample, ['INIT', 'RECON', 'PLAN', 'COMMIT']);
console.log('✓ Invariante 2: Detección formal de bypass y contraejemplo mínimo generado: ' + bypassProof.counterexample.join(' -> '));

// Invariante 3: Detección de deadlocks y estados inalcanzables
const flawedMachine = {
  states: ['INIT', 'STUCK', 'ORPHAN', 'DONE'],
  initial: 'INIT',
  terminals: ['DONE'],
  transitions: [
    { from: 'INIT', to: 'STUCK' }
    // STUCK no tiene transiciones salientes ni es terminal -> DEADLOCK
    // ORPHAN no tiene transiciones entrantes -> UNREACHABLE
  ]
};

const flawProof = prover.proveInvariants(flawedMachine, { target: 'DONE' });
assert.strictEqual(flawProof.isSafe, false);
assert.ok(flawProof.unreachableStates.includes('ORPHAN'), 'ORPHAN debe detectarse como inalcanzable');
assert.ok(flawProof.deadlocks.includes('STUCK'), 'STUCK debe detectarse como deadlock');
console.log('✓ Invariante 3: Detección exhaustiva de deadlocks y estados inalcanzables validada');

// Invariante 4: Terminación acotada ante ciclos dirigidos O(V + E)
const cyclicMachine = {
  states: ['A', 'B', 'C', 'D'],
  initial: 'A',
  terminals: ['D'],
  transitions: [
    { from: 'A', to: 'B' },
    { from: 'B', to: 'C' },
    { from: 'C', to: 'B' }, // Bucle directo B <-> C
    { from: 'C', to: 'D' }
  ]
};

const tStart = Date.now();
const cyclicProof = prover.proveInvariants(cyclicMachine, { cutVertex: 'C', target: 'D' });
const tElapsed = Date.now() - tStart;

assert.strictEqual(cyclicProof.isSafe, true);
assert.ok(tElapsed < 100, 'La exploración del grafo con ciclos debe resolverse en < 100ms');
console.log('✓ Invariante 4: Terminación determinista ante ciclos probada (' + tElapsed + 'ms)');

// Invariante 5: Emisión de StateTransitionProofReport_v1 sellado con SHA-256
const report = prover.generateProofReport(canonicalMachine, { cutVertex: 'VERIFY', target: 'COMMIT' });
assert.strictEqual(report.reportType, 'StateTransitionProofReport_v1');
assert.ok(typeof report.proofDigest === 'string' && report.proofDigest.length === 64);
assert.strictEqual(report.isFormallyVerified, true);
console.log('✓ Invariante 5: StateTransitionProofReport_v1 emitido y sellado con SHA-256 (' + report.proofDigest.slice(0, 16) + '...)');

// Invariante 6: Integración nativa con DriveEngine
const drive = new DriveEngine(ROOT);
assert.strictEqual(typeof drive.proveStateTransitionInvariants, 'function');
const driveRes = drive.proveStateTransitionInvariants(canonicalMachine, { cutVertex: 'VERIFY', target: 'COMMIT' });
assert.strictEqual(driveRes.isSafe, true);
console.log('✓ Invariante 6: Integración nativa con DriveEngine.proveStateTransitionInvariants() demostrada');

console.log('\nPASS: AX-F-220 — Invariantes de StateTransitionInvariantProver demostrados al 100%.');
