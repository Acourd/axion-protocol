'use strict';
/**
 * SONDA ROJA R-02 — defecto G #2: alias de principal.
 *
 * Invariantes bajo prueba:
 *     approver_principal != auditor_principal
 *     operator_principal != auditor_principal
 *
 * El mismo humano aparece en el registro con dos identidades textualmente
 * distintas. La separación se decide por igualdad exacta de cadenas, no por
 * principal canónico.
 */
const K = require('../lib/probe_kit.js');

console.log('R-02 · alias de identidad en el registro de autoridades');

// --- Control negativo: sin alias, la coincidencia exacta SI se detecta.
{
  const ws = K.workspace('r02-ctrl');
  const k1 = K.keypair();
  const k2 = K.keypair();
  const registryPath = K.writeRegistry(ws.dir, [
    K.authority('alice', k1, ['HUMAN_AUTHORITY']),
    K.authority('alice', k2, ['INDEPENDENT_AUDITOR']),
  ]);
  const m = K.mission('AX-R02-CONTROL');
  const ap = K.signApproval(m, 'alice', k1);
  const ck = K.signCheck(m, 'alice', k2, 'charlie', K.hashCanonical(ap.approval));
  const r = K.executeHybridWorkflow(K.payload(m, ap, ck), {
    registryPath, approvalConsumptionDir: ws.consumptionDir,
    executorActorId: 'charlie', executor: () => ({ status: 0 }),
  });
  console.log(`  [ctrl] aprobador y auditor "alice" identicos -> ${r.status}`);
  if (r.status === 'VERIFIED') {
    throw new Error('CONTROL INVALIDO: ni la coincidencia exacta se detecta; el defecto es mas amplio que el alias.');
  }
}

// --- Caso A: aprobador == auditor con alias por espacio final
{
  const ws = K.workspace('r02a');
  const k1 = K.keypair();
  const k2 = K.keypair();
  const registryPath = K.writeRegistry(ws.dir, [
    K.authority('alice', k1, ['HUMAN_AUTHORITY']),
    K.authority('alice ', k2, ['INDEPENDENT_AUDITOR']),
  ]);
  const m = K.mission('AX-R02A-001');
  const ap = K.signApproval(m, 'alice', k1);
  const ck = K.signCheck(m, 'alice ', k2, 'charlie', K.hashCanonical(ap.approval));
  const r = K.executeHybridWorkflow(K.payload(m, ap, ck), {
    registryPath, approvalConsumptionDir: ws.consumptionDir,
    executorActorId: 'charlie', executor: () => ({ status: 0 }),
  });
  K.expectBlocked('aprobador "alice" y auditor "alice " (mismo humano)', r,
    'El registro impone unicidad de keyId, no de principal.');
}

// --- Caso B: ejecutor == auditor con el mismo alias
{
  const ws = K.workspace('r02b');
  const approver = K.keypair();
  const auditor = K.keypair();
  const registryPath = K.writeRegistry(ws.dir, [
    K.authority('alice', approver, ['HUMAN_AUTHORITY']),
    K.authority('charlie ', auditor, ['INDEPENDENT_AUDITOR']),
  ]);
  const m = K.mission('AX-R02B-001');
  const ap = K.signApproval(m, 'alice', approver);
  const ck = K.signCheck(m, 'charlie ', auditor, 'charlie', K.hashCanonical(ap.approval));
  const r = K.executeHybridWorkflow(K.payload(m, ap, ck), {
    registryPath, approvalConsumptionDir: ws.consumptionDir,
    executorActorId: 'charlie', executor: () => ({ status: 0 }),
  });
  K.expectBlocked('ejecutor "charlie" y auditor "charlie " (mismo humano)', r,
    'La comparacion es textual exacta; no hay canonicalizacion NFKC ni deteccion de homoglifos.');
}

// --- Caso C: homoglifo cirilico
{
  const ws = K.workspace('r02c');
  const k1 = K.keypair();
  const k2 = K.keypair();
  const registryPath = K.writeRegistry(ws.dir, [
    K.authority('alice', k1, ['HUMAN_AUTHORITY']),
    K.authority('аlice', k2, ['INDEPENDENT_AUDITOR']),
  ]);
  const m = K.mission('AX-R02C-001');
  const ap = K.signApproval(m, 'alice', k1);
  const ck = K.signCheck(m, 'аlice', k2, 'charlie', K.hashCanonical(ap.approval));
  const r = K.executeHybridWorkflow(K.payload(m, ap, ck), {
    registryPath, approvalConsumptionDir: ws.consumptionDir,
    executorActorId: 'charlie', executor: () => ({ status: 0 }),
  });
  K.expectBlocked('aprobador "alice" y auditor U+0430 "alice"', r,
    'Homoglifo aceptado como identidad distinta.');
}

console.log('R-02 PASS');
