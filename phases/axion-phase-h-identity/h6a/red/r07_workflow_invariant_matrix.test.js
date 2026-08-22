'use strict';
/**
 * SONDA ROJA R-07 — defecto G #8: el workflow real no satisface las invariantes.
 *
 * Requisito 10 de la autorización H-6a: ejecutar el workflow real, no primitivas
 * aisladas. La suite de G evaluaba `verifyAndConsumeApproval` y
 * `verifyIndependentCheck` por separado, pasando `approvalActorId` a mano, de modo
 * que la derivación de identidades dentro del runner quedaba sin cobertura.
 *
 * Esta es la sonda de integración: evalúa las invariantes de D-06 sobre PRINCIPALS
 * (personas), no sobre cadenas. Cada escenario declara qué persona ocupa cada rol y
 * bajo qué representación textual aparece. Un sistema que sólo compara cadenas
 * satisface la matriz cuando las cadenas coinciden y la viola cuando no.
 */
const K = require('../lib/probe_kit.js');

console.log('R-07 · matriz de invariantes D-06 sobre el workflow real');

/**
 * @param {object} spec
 *   people:   { <persona>: { asOperator?, asApprover?, asAuditor? } } representaciones textuales
 */
function scenario({ label, invariant, operatorStr, approver, auditor, note }) {
  const ws = K.workspace('r07');
  const approverKeys = K.keypair();
  const auditorKeys = K.keypair();
  const registryPath = K.writeRegistry(ws.dir, [
    K.authority(approver, approverKeys, ['HUMAN_AUTHORITY']),
    K.authority(auditor, auditorKeys, ['INDEPENDENT_AUDITOR']),
  ]);
  const m = K.mission(`AX-R07-${K.crypto.randomBytes(3).toString('hex')}`);
  const ap = K.signApproval(m, approver, approverKeys);
  const ck = K.signCheck(m, auditor, auditorKeys, operatorStr, K.hashCanonical(ap.approval));
  const r = K.executeHybridWorkflow(K.payload(m, ap, ck), {
    registryPath, approvalConsumptionDir: ws.consumptionDir,
    executorActorId: operatorStr, executor: () => ({ status: 0 }),
  });
  const ok = r.status !== 'VERIFIED';
  console.log(`  [${ok ? 'OK  ' : 'ROJO'}] ${invariant} · ${label} -> ${r.status}`);
  if (!ok) return { invariant, label, note };
  return null;
}

// La misma persona bajo dos representaciones textuales admitidas por el registro.
const violations = [
  // I1 — operator_principal != approver_principal
  scenario({
    invariant: 'I1', label: 'Alice aprueba y opera; declara "axion-runtime-01"',
    operatorStr: 'axion-runtime-01', approver: 'alice', auditor: 'bob',
    note: 'La identidad del operador es autodeclarada; no procede de una atestacion firmada.',
  }),
  // I2 — operator_principal != auditor_principal
  scenario({
    invariant: 'I2', label: 'Charlie opera y audita; audita como "charlie "',
    operatorStr: 'charlie', approver: 'alice', auditor: 'charlie ',
    note: 'Alias por espacio final: dos cadenas, un solo principal.',
  }),
  // I3 — approver_principal != auditor_principal
  scenario({
    invariant: 'I3', label: 'Alice aprueba y audita; audita como "аlice" (U+0430)',
    operatorStr: 'charlie', approver: 'alice', auditor: 'аlice',
    note: 'Homoglifo cirilico: dos cadenas, un solo principal.',
  }),
].filter(Boolean);

// Control positivo: tres personas distintas deben completar el flujo.
{
  const ws = K.workspace('r07-ctrl');
  const approverKeys = K.keypair();
  const auditorKeys = K.keypair();
  const registryPath = K.writeRegistry(ws.dir, [
    K.authority('alice', approverKeys, ['HUMAN_AUTHORITY']),
    K.authority('bob', auditorKeys, ['INDEPENDENT_AUDITOR']),
  ]);
  const m = K.mission('AX-R07-CONTROL');
  const ap = K.signApproval(m, 'alice', approverKeys);
  const ck = K.signCheck(m, 'bob', auditorKeys, 'charlie', K.hashCanonical(ap.approval));
  const r = K.executeHybridWorkflow(K.payload(m, ap, ck), {
    registryPath, approvalConsumptionDir: ws.consumptionDir,
    executorActorId: 'charlie', executor: () => ({ status: 0 }),
  });
  console.log(`  [ctrl] tres personas distintas -> ${r.status}`);
  if (r.status !== 'VERIFIED') {
    throw new Error(`CONTROL INVALIDO: el caso legitimo dio ${r.status}; la sonda no discrimina.`);
  }
}

if (violations.length > 0) {
  console.log(`\n  ${violations.length} de 3 invariantes D-06 violadas por el workflow real:`);
  for (const v of violations) console.log(`   - ${v.invariant} · ${v.label}\n     ${v.note}`);
  throw new Error(`R-07: ${violations.length}/3 invariantes D-06 no se sostienen sobre principals.`);
}

console.log('R-07 PASS');
