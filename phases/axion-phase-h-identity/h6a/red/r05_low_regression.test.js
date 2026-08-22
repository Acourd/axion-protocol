'use strict';
/**
 * SONDA ROJA R-05 — defecto G #5: regresión funcional del nivel LOW.
 *
 * Criterio de aceptación (H-1 · 07, decisión D-08):
 *   LOW no requiere aprobación; sí requiere ejecutor atestado, auditor
 *   independiente y ledger confiable. Debe alcanzar VERIFIED.
 *
 * Esta sonda es la única del conjunto que espera VERIFIED. Su fallo indica
 * regresión, no bypass: el fallo de G es cerrado pero rompe el workflow.
 */
const K = require('../lib/probe_kit.js');

console.log('R-05 · el nivel LOW debe alcanzar VERIFIED sin aprobacion humana');

const ws = K.workspace('r05');
const auditor = K.keypair();
const registryPath = K.writeRegistry(ws.dir, [
  K.authority('bob', auditor, ['INDEPENDENT_AUDITOR']),
]);

const m = K.mission('AX-R05-001', 'LOW');
m.scope = ['tools/preflight.js'];

// En ausencia de aprobacion, el runner sintetiza este digest determinista.
const approvalDigest = K.hashCanonical({
  missionId: m.missionId,
  approvalRequired: false,
  risk: 'LOW',
});
const ck = K.signCheck(m, 'bob', auditor, 'charlie', approvalDigest);

const r = K.executeHybridWorkflow(K.payload(m, undefined, ck), {
  registryPath,
  executorActorId: 'charlie',
  executor: () => ({ status: 0 }),
});

console.log(`  check: ${r.check && r.check.status}`);
K.expectVerified('mision LOW con CHECK independiente firmado', r,
  'La ausencia legitima de aprobador se codifica como cadena vacia y '
  + 'verifyIndependentCheck la rechaza con CHECK_NOT_INDEPENDENT.');

if (r.workflow.history.length !== 7) {
  throw new Error(`Se esperaban 7 fases, hubo ${r.workflow.history.length}.`);
}

console.log('R-05 PASS');
