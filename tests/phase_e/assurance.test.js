'use strict';

/**
 * Nivel de garantia de las identidades — divulgacion de AX-NC-0001 (vector r01).
 *
 * Un veredicto VERIFIED presentaba ejecutor, aprobador y auditor juntos, como si las tres
 * identidades constaran igual de bien. No es cierto: dos vienen de firmas Ed25519
 * verificadas contra el registro, y la del ejecutor es una cadena que el ejecutor escribio.
 *
 * Este modulo NO cierra ese vector —hacerlo exige el servicio de confianza de Fase H, que
 * ata la identidad a la cuenta del sistema operativo—. Lo que hace es impedir que el
 * sistema se calle: el nivel de garantia viaja en la evidencia y en la atestacion.
 *
 * La comprobacion mas importante es la ultima: mientras la identidad del ejecutor sea
 * autodeclarada, NINGUNA separacion que lo involucre puede declararse demostrada. Si
 * alguna vez esta suite deja pasar un DEMONSTRATED ahi, el sistema habra empezado a
 * afirmar mas de lo que puede sostener, que es exactamente como nacio AX-NC-0002.
 */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');

const {
  IDENTITY_ASSURANCE,
  SEPARATION,
  assessAssurance,
} = require('../../tools/assurance.js');
const { executeHybridWorkflow } = require('../../tools/workflow_runner.js');
const { createAttestation } = require('../../tools/attestation.js');
const { createLowRiskFixture } = require('../trust_fixture.js');

const ROOT = path.join(__dirname, '..', '..');
let n = 0;
const ok = (d) => console.log(`  [${++n}] PASS: ${d}`);

console.log('=== Nivel de garantia de las identidades ===\n');

// --- 1. La identidad del ejecutor nunca consta como atestada ---------------
{
  const casos = [
    { approvalVerified: false, checkVerified: false },
    { approvalVerified: true, checkVerified: false },
    { approvalVerified: false, checkVerified: true },
    { approvalVerified: true, checkVerified: true },
  ];
  for (const caso of casos) {
    const a = assessAssurance(caso);
    assert.strictEqual(a.identities.executor, IDENTITY_ASSURANCE.SELF_DECLARED,
      'mientras no exista el servicio de confianza, el ejecutor es siempre autodeclarado');
  }
  ok('la identidad del ejecutor consta como autodeclarada en todos los casos');
}

// --- 2. Firmar de verdad si cuenta como atestado ---------------------------
{
  const a = assessAssurance({ approvalVerified: true, checkVerified: true });
  assert.strictEqual(a.identities.approver, IDENTITY_ASSURANCE.ATTESTED);
  assert.strictEqual(a.identities.auditor, IDENTITY_ASSURANCE.ATTESTED);
  assert.strictEqual(a.separations.approverVsAuditor, SEPARATION.DEMONSTRATED,
    'aprobador y auditor constan ambos por firma: esa separacion si esta demostrada');
  ok('aprobador y auditor constan como atestados y su separacion se demuestra');
}

// --- 3. Lo que no participa no se declara demostrado ni incumplido ---------
{
  const a = assessAssurance({ approvalVerified: false, checkVerified: true });
  assert.strictEqual(a.identities.approver, IDENTITY_ASSURANCE.NOT_APPLICABLE,
    'si el riesgo no exige aprobacion, no hay aprobador que atestar');
  assert.strictEqual(a.separations.approverVsAuditor, SEPARATION.NOT_APPLICABLE,
    'una separacion sin ambas partes no es ni demostrada ni incumplida');
  ok('las separaciones que no aplican se marcan como tales, no como demostradas');
}

// --- 4. Una mision real declara su nivel de garantia -----------------------
{
  const f = createLowRiskFixture({
    missionId: 'AX-ASSUR-E2E',
    assertions: ['comprobacion de garantia'],
    modifiedFiles: [path.join(ROOT, 'tools', 'preflight.js')],
  });
  const r = executeHybridWorkflow(f.payload, f.runtime);
  assert.strictEqual(r.status, 'VERIFIED');

  assert.ok(r.assurance, 'un veredicto VERIFIED debe declarar su nivel de garantia');
  assert.strictEqual(r.assurance.identities.executor, IDENTITY_ASSURANCE.SELF_DECLARED);
  assert.strictEqual(r.assurance.identities.auditor, IDENTITY_ASSURANCE.ATTESTED);
  assert.deepStrictEqual(r.assurance.openNonConformities, ['AX-NC-0001'],
    'la no-conformidad abierta debe viajar con el veredicto, no solo en el README');
  ok('una mision VERIFIED declara su nivel de garantia y la no-conformidad abierta');

  // Y llega intacto a la atestacion, que es lo que sale del proyecto.
  const claves = crypto.generateKeyPairSync('ed25519');
  const att = createAttestation({ result: r, privateKey: claves.privateKey });
  assert.ok(att.statement.predicate.assurance, 'la atestacion debe llevar el nivel de garantia');
  assert.strictEqual(
    att.statement.predicate.assurance.identities.executor,
    IDENTITY_ASSURANCE.SELF_DECLARED,
    'quien reciba la atestacion tiene que poder ver que el ejecutor no esta autenticado',
  );
  ok('la atestacion transporta el nivel de garantia a quien la reciba');
}

// --- 5. La regla que no se puede relajar -----------------------------------
// Mientras el ejecutor sea autodeclarado, nada que lo involucre puede darse por
// demostrado. Es la unica comprobacion de esta suite cuyo incumplimiento seria grave:
// significaria que el sistema empezo a afirmar una separacion que no tiene.
{
  const combinaciones = [true, false].flatMap(
    (a) => [true, false].map((c) => ({ approvalVerified: a, checkVerified: c })),
  );
  for (const caso of combinaciones) {
    const { identities, separations } = assessAssurance(caso);
    if (identities.executor !== IDENTITY_ASSURANCE.SELF_DECLARED) continue;
    for (const clave of ['executorVsApprover', 'executorVsAuditor']) {
      assert.notStrictEqual(separations[clave], SEPARATION.DEMONSTRATED,
        `${clave} no puede declararse demostrada con un ejecutor autodeclarado`);
    }
  }
  ok('ninguna separacion que involucre al ejecutor se declara demostrada');
}

console.log(`\nPASS garantia de identidades - ${n} comprobaciones`);
